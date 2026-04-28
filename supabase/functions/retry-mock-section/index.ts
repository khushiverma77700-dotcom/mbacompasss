// Resume / retry a single mock_section_jobs row that got stuck or failed.
// Marks the job as pending → re-invokes the generation worker for just that section.
//
// Invoked from the admin progress panel "Retry section" button.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_TIMEOUT_MS = 90_000;
const SECTION_WALL_CLOCK_MS = 8 * 60_000;
const BATCH_SIZE = 8;

const PERSONALIZED_SECTION_MAP: Record<string, Record<string, string>> = {
  CAT:  { VARC: "VARC", DILR: "DILR", QA: "QA" },
  NMAT: { LS: "Language Skills", QS: "Quantitative Skills", LR: "Logical Reasoning" },
  XAT:  { VALR: "Verbal & Logical Ability", DM: "Decision Making", QADI: "Quantitative Ability", GK: "GK" },
  SNAP: { GE: "General English", QADS: "Quantitative & Data Interpretation", AR: "Analytical & Logical Reasoning" },
  IIFT: { VARC: "Verbal Ability & RC", QA: "Quantitative Analysis", DILR: "Data Interpretation & LR", GK: "GK" },
  CMAT: { QADI: "Quantitative Techniques", LR: "Logical Reasoning", LC: "Language Comprehension", GA: "GK", IE: "Innovation & Entrepreneurship" },
  MAT:  { LC: "Language Comprehension", MS: "Mathematical Skills", DA: "Data Analysis", ICR: "Intelligence & Critical Reasoning", IGE: "Indian & Global Environment" },
};

function mapPersonalizedDifficulty(d: string): "easy" | "moderate" | "difficult" {
  if (d === "easy") return "easy";
  if (d === "hard") return "difficult";
  return "moderate";
}

function normalizeDifficulty(value: unknown, requestedLevel: string): "easy" | "medium" | "hard" {
  const raw = String(value || requestedLevel || "medium").toLowerCase();
  if (["easy", "easier", "low"].includes(raw)) return "easy";
  if (["hard", "difficult", "advanced", "high"].includes(raw)) return "hard";
  return "medium";
}

function normalizeForHash(s: string): string {
  return (s || "").toLowerCase().replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callOpenAIBatch(opts: {
  exam_code: string; section_name: string; section_code: string;
  count: number; mcq: number; tita: number; level: string;
  positive: number; negative: number; topic?: string | null;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const sys = `You are an elite ${opts.exam_code} question setter writing 100% original questions for the ${opts.section_name} (${opts.section_code}) section. Difficulty target: ${opts.level}. ${opts.topic ? `Topic lock: ${opts.topic}.` : ""} Use fresh numbers, fresh names, fresh contexts. Each MCQ has 4 options A-D with one correct; each TITA has numeric answer(s). Include detailed 200-400 word explanations. Output ONLY valid JSON.`;
  const user = `Generate exactly ${opts.count} questions: ${opts.mcq} MCQ + ${opts.tita} TITA. Marking +${opts.positive}/-${opts.negative}. JSON shape: {"questions":[{"question_type":"mcq"|"tita","question_html":"...","topic":"...","subtopic":"...","difficulty":"easy|medium|hard","options":[{"label":"A","text":"...","is_correct":true|false},...],"tita_answers":["..."],"tita_tolerance":0.01,"explanation_html":"..."}]}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OPENAI_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 16000,
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  return Array.isArray(parsed?.questions) ? parsed.questions : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return jsonResp(401, { error: "Missing auth" });
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return jsonResp(401, { error: "Invalid auth" });

    const admin = createClient(url, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return jsonResp(403, { error: "Admin role required" });

    const { job_id } = await req.json();
    if (!job_id) return jsonResp(400, { error: "job_id required" });

    const { data: job, error: jobErr } = await admin.from("mock_section_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) return jsonResp(404, { error: "Job not found" });

    // Re-arm the job
    await admin.from("mock_section_jobs").update({
      status: "processing",
      current_step: "Restart requested — re-calling AI…",
      error_message: null,
      attempts: (job.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", job_id);

    const runRetry = async () => {
      try {
        // How many do we still need?
        const { count: existingCount } = await admin
          .from("mock_questions")
          .select("id", { count: "exact", head: true })
          .eq("section_id", job.section_id);
        let produced = existingCount || 0;
        const target = job.total_questions || 0;

        const { data: existingHashes } = await admin.from("mock_questions").select("content_hash").not("content_hash", "is", null);
        const seen = new Set<string>((existingHashes || []).map((r: any) => r.content_hash).filter(Boolean));

        const startedAt = Date.now();
        let attempts = 0;
        const maxAttempts = Math.ceil((target - produced) / BATCH_SIZE) + 4;

        const hubSection = (PERSONALIZED_SECTION_MAP[job.exam_code] || {})[job.section_code];

        while (produced < target && attempts < maxAttempts) {
          if (Date.now() - startedAt > SECTION_WALL_CLOCK_MS) {
            await admin.from("mock_section_jobs").update({
              status: "failed",
              error_message: "Retry exceeded 8-min wall clock",
              current_step: "Timed out",
              updated_at: new Date().toISOString(),
            }).eq("id", job_id);
            return;
          }
          attempts++;
          const remain = target - produced;
          const batch = Math.min(BATCH_SIZE, remain);
          const remainTita = Math.max(0, (job.tita_count || 0) - 0);
          const batchTita = Math.min(remainTita, Math.round(batch * (remainTita / Math.max(1, remain))));
          const batchMcq = batch - batchTita;

          await admin.from("mock_section_jobs").update({
            current_step: `Retry batch ${attempts}: requesting ${batch} questions…`,
            updated_at: new Date().toISOString(),
          }).eq("id", job_id);

          let qs: any[] = [];
          try {
            qs = await callOpenAIBatch({
              exam_code: job.exam_code, section_code: job.section_code, section_name: job.section_name,
              count: batch, mcq: batchMcq, tita: batchTita, level: job.level || "mixed",
              positive: job.positive_marks || 1, negative: job.negative_marks || 0,
              topic: job.strict_topic || job.topic || null,
            });
          } catch (e) {
            await admin.from("mock_section_jobs").update({
              current_step: `Retry batch ${attempts} failed, retrying again…`,
              error_message: String((e as Error)?.message || e).slice(0, 400),
              updated_at: new Date().toISOString(),
            }).eq("id", job_id);
            continue;
          }

          const hubRows: any[] = [];
          for (const q of qs) {
            if (produced >= target) break;
            if (!q?.question_html) continue;
            const hash = await sha256(normalizeForHash(q.question_html));
            if (seen.has(hash)) continue;
            seen.add(hash);

            const isTita = q.question_type === "tita";
            const { data: qRow } = await admin.from("mock_questions").insert({
              section_id: job.section_id,
              question_number: produced + 1,
              question_type: isTita ? "tita" : "mcq",
              question_html: q.question_html,
              tita_correct_answers: isTita ? (q.tita_answers || []).map(String) : [],
              tita_numeric_tolerance: isTita ? Number(q.tita_tolerance ?? 0) : null,
              positive_marks: job.positive_marks || 1,
              negative_marks: isTita ? 0 : (job.negative_marks || 0),
              difficulty: normalizeDifficulty(q.difficulty, job.level),
              topic: q.topic || job.topic || null,
              subtopic: q.subtopic || null,
              explanation_html: q.explanation_html || "",
              content_hash: hash,
            }).select("id").single();
            if (!qRow) continue;

            if (!isTita && Array.isArray(q.options)) {
              const opts = q.options.slice(0, 4).map((o: any, idx: number) => ({
                question_id: qRow.id,
                option_label: o.label || ["A","B","C","D"][idx],
                option_html: o.text || "",
                is_correct: !!o.is_correct,
                sort_order: idx,
              }));
              if (opts.length === 4 && opts.some((o) => o.is_correct)) {
                await admin.from("mock_question_options").insert(opts);
                if (hubSection) {
                  const correctIdx = opts.findIndex((o) => o.is_correct);
                  hubRows.push({
                    exam_code: job.exam_code, section: hubSection,
                    difficulty: mapPersonalizedDifficulty(normalizeDifficulty(q.difficulty, job.level)),
                    question_text: q.question_html,
                    options: opts.map((o) => ({ label: o.option_label, text: o.option_html })),
                    correct_index: correctIdx >= 0 ? correctIdx : 0,
                    explanation: q.explanation_html || null,
                    topic: q.topic || job.topic || null,
                    source: "mock-mirror-retry",
                    created_by: user.id,
                  });
                }
              } else {
                await admin.from("mock_questions").delete().eq("id", qRow.id);
                continue;
              }
            }
            produced++;
          }

          if (hubRows.length > 0) {
            await admin.from("personalized_questions").insert(hubRows);
          }

          await admin.from("mock_section_jobs").update({
            questions_done: produced,
            current_step: `Generated ${produced}/${target}`,
            updated_at: new Date().toISOString(),
          }).eq("id", job_id);
        }

        const success = produced >= Math.ceil(target * 0.8);
        await admin.from("mock_section_jobs").update({
          status: success ? "completed" : "failed",
          questions_done: produced,
          current_step: success ? `Done — ${produced} questions saved` : `Incomplete — ${produced}/${target}`,
          error_message: success ? null : `Only ${produced} of ${target} after retry`,
          updated_at: new Date().toISOString(),
        }).eq("id", job_id);
      } catch (e) {
        await admin.from("mock_section_jobs").update({
          status: "failed",
          error_message: String((e as Error)?.message || e).slice(0, 500),
          current_step: "Retry failed",
          updated_at: new Date().toISOString(),
        }).eq("id", job_id);
      }
    };

    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runRetry());
    } else {
      runRetry();
    }

    return jsonResp(202, { ok: true, message: "Retry started" });
  } catch (e) {
    return jsonResp(500, { error: (e as Error)?.message || String(e) });
  }
});

function jsonResp(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
