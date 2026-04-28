// AI Mock Question Generator
// - Calls Gemini via shared aiGateway with structured JSON output
// - De-duplicates against existing mock_questions via SHA-256 content_hash
// - Optionally verifies uniqueness via Firecrawl web search
// - Persists sections + questions + options into the target mock_test
//
// Auth: admin only (verifies JWT in code; verify_jwt = false in config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --------- Constants ---------

const EXAM_PROFILES: Record<string, {
  full_name: string;
  default_total: number;
  sections: Array<{ code: string; name: string; duration: number; questions: number }>;
  default_positive: number;
  default_negative: number;
}> = {
  CAT: {
    full_name: "Common Admission Test (IIM)",
    default_total: 66,
    sections: [
      { code: "VARC", name: "Verbal Ability & Reading Comprehension", duration: 40, questions: 24 },
      { code: "DILR", name: "Data Interpretation & Logical Reasoning", duration: 40, questions: 22 },
      { code: "QA", name: "Quantitative Aptitude", duration: 40, questions: 22 },
    ],
    default_positive: 3, default_negative: 1,
  },
  XAT: {
    full_name: "Xavier Aptitude Test (XLRI)",
    default_total: 100,
    sections: [
      { code: "VARC", name: "Verbal & Logical Ability", duration: 50, questions: 26 },
      { code: "DILR", name: "Decision Making", duration: 50, questions: 22 },
      { code: "QA", name: "Quantitative Ability & DI", duration: 50, questions: 28 },
      { code: "GK", name: "General Knowledge", duration: 15, questions: 24 },
    ],
    default_positive: 1, default_negative: 0.25,
  },
  SNAP: {
    full_name: "Symbiosis National Aptitude Test",
    default_total: 60,
    sections: [
      { code: "VARC", name: "General English", duration: 20, questions: 15 },
      { code: "DILR", name: "Analytical & Logical Reasoning", duration: 30, questions: 25 },
      { code: "QA", name: "Quantitative, Data Interpretation & Sufficiency", duration: 10, questions: 20 },
    ],
    default_positive: 1, default_negative: 0.25,
  },
  NMAT: {
    full_name: "NMAT by GMAC",
    default_total: 108,
    sections: [
      { code: "VARC", name: "Language Skills", duration: 28, questions: 36 },
      { code: "DILR", name: "Logical Reasoning", duration: 40, questions: 36 },
      { code: "QA", name: "Quantitative Skills", duration: 52, questions: 36 },
    ],
    default_positive: 1, default_negative: 0,
  },
  CMAT: {
    full_name: "Common Management Admission Test",
    default_total: 100,
    sections: [
      { code: "QA", name: "Quantitative Techniques & DI", duration: 45, questions: 20 },
      { code: "DILR", name: "Logical Reasoning", duration: 45, questions: 20 },
      { code: "VARC", name: "Language Comprehension", duration: 45, questions: 20 },
      { code: "GK", name: "General Awareness", duration: 30, questions: 20 },
      { code: "QA", name: "Innovation & Entrepreneurship", duration: 15, questions: 20 },
    ],
    default_positive: 4, default_negative: 1,
  },
};

const BATCH_SIZE = 8; // questions per AI call

// --------- Helpers ---------

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeForHash(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSystemPrompt(opts: {
  exam: string; exam_full: string; category: string; level: string;
  section_code: string; section_name: string;
  strict_topic?: string | null;
  sets?: number | null;
  total_section_questions?: number | null;
}) {
  const levelGuidance = opts.level === "mixed"
    ? "Mix Easy (~30%), Moderate (~40%), Hard (~30%)."
    : `Strictly target ${opts.level.toUpperCase()} difficulty.`;

  const topicLock = opts.strict_topic
    ? `

STRICT TOPIC LOCK (Topic-wise Test):
- EVERY single question MUST be exclusively from the topic: "${opts.strict_topic}".
- Do NOT generate questions from any other topic, sub-area, or concept outside "${opts.strict_topic}".
- The "topic" field on every question MUST be "${opts.strict_topic}".
- Vary the sub-concepts and difficulty within "${opts.strict_topic}" only.`
    : "";

  // Sets guidance — passages (VARC) / caselets (DILR). Group questions under shared contexts.
  const setsBlock = (opts.sets && opts.sets > 0)
    ? `

SETS / SHARED-CONTEXT GROUPING (mandatory for this section):
- This section MUST be organised into exactly ${opts.sets} "sets" (${opts.section_code === "VARC" ? "Reading Comprehension passages" : opts.section_code === "DILR" ? "DI/LR caselets" : "shared-context sets"}).
- Distribute the ${opts.total_section_questions ?? opts.sets * 4} questions across these ${opts.sets} sets as evenly as possible (e.g. 4 questions per set is standard for CAT).
- Each question that belongs to a set MUST begin its "question_html" with the FULL shared context (passage / caselet text / data table) wrapped in <div class="passage">…</div>, followed by the actual question.
- Repeat the SAME context verbatim for every question in the same set (so each row is self-contained when reviewed individually).
- Each set's context must be a fresh original ${opts.section_code === "VARC" ? "passage of 350–550 words on a unique theme (history / science / philosophy / business / arts)" : "caselet with original numbers, names and a unique scenario"}.
- Tag each question with a "set_index" field (1..${opts.sets}) so we can group them on display.
- Standalone (non-set) questions are NOT allowed in this batch — every question must belong to one of the ${opts.sets} sets.`
    : (opts.section_code === "VARC" || opts.section_code === "DILR")
      ? `

NO SETS REQUESTED:
- Generate standalone questions only (no shared passages / caselets) for this batch.`
      : "";

  return `You are an elite ${opts.exam_full} (${opts.exam}) question setter with 15+ years of experience writing original mock questions for top MBA coaching institutes in India.

GENERATE 100% ORIGINAL questions for:
- Exam: ${opts.exam} (${opts.exam_full})
- Section: ${opts.section_name} (${opts.section_code})
- Category: ${opts.category}
- Difficulty: ${levelGuidance}${topicLock}${setsBlock}

CRITICAL RULES:
1. EVERY question must be ORIGINAL — never copy from past papers, NCERT, RS Aggarwal, Arun Sharma, Nishit Sinha, Time, IMS, CL, study material, blogs, or anything published.
2. Use FRESH numbers, fresh names, fresh contexts. Never reuse classic problems verbatim.
3. Every question must include a DETAILED step-by-step explanation (200-400 words) showing the full solving approach, key concept, common traps, shortcut tricks if any, and final answer derivation. Use clear math notation in plain text or LaTeX-style.
4. Each question must test a different sub-concept — no repetition of the same trick.
5. For MCQ: exactly 4 options labelled A, B, C, D, with exactly ONE correct.
6. For TITA (Type In The Answer / numerical): provide the numeric answer (and tolerance if applicable).
7. Tag each question with topic and subtopic accurately.
8. Match the official ${opts.exam} pattern, length, and style precisely.
9. Output ONLY valid JSON matching the schema. No prose before/after.`;
}

function buildUserPrompt(opts: {
  count: number; mcq_count: number; tita_count: number;
  positive: number; negative: number;
}) {
  return `Generate exactly ${opts.count} questions: ${opts.mcq_count} MCQ + ${opts.tita_count} TITA.

Marking: +${opts.positive} for correct, -${opts.negative} for wrong (TITA usually no negative).

Return JSON of shape:
{
  "questions": [
    {
      "question_type": "mcq" | "tita",
      "question_html": "<p>The full question text in clean HTML…</p>",
      "topic": "string (e.g. Arithmetic, Reading Comprehension, Syllogism)",
      "subtopic": "string (e.g. Time Speed Distance, Inference, Permutations)",
      "difficulty": "easy" | "medium" | "hard",
      "options": [          // ONLY for mcq, exactly 4
        {"label":"A","text":"option HTML","is_correct":true|false},
        {"label":"B","text":"option HTML","is_correct":true|false},
        {"label":"C","text":"option HTML","is_correct":true|false},
        {"label":"D","text":"option HTML","is_correct":true|false}
      ],
      "tita_answers": ["123", "123.5"],  // ONLY for tita; one or more accepted answers
      "tita_tolerance": 0.01,            // optional
      "explanation_html": "<p>Detailed 200-400 word step-by-step solution…</p>"
    }
  ]
}`;
}

async function callGeminiBatch(args: {
  exam: string; exam_full: string; category: string; level: string;
  section_code: string; section_name: string;
  count: number; mcq: number; tita: number;
  positive: number; negative: number;
  userId: string | null;
  strict_topic?: string | null;
  sets?: number | null;
  total_section_questions?: number | null;
}) {
  const sys = buildSystemPrompt({
    exam: args.exam, exam_full: args.exam_full, category: args.category, level: args.level,
    section_code: args.section_code, section_name: args.section_name,
    strict_topic: args.strict_topic ?? null,
    sets: args.sets ?? null,
    total_section_questions: args.total_section_questions ?? null,
  });
  const user = buildUserPrompt({
    count: args.count, mcq_count: args.mcq, tita_count: args.tita,
    positive: args.positive, negative: args.negative,
  });

  const resp = await callAIGateway({
    model: "gpt-5",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.95,
    max_tokens: 8000,
  }, { feature: "generate-mock-questions", userId: args.userId, maxRetries: 1, provider: "openai-mini" });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI call failed (${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty content");
  let parsed: any;
  try { parsed = typeof content === "string" ? JSON.parse(content) : content; }
  catch { throw new Error("AI returned non-JSON content"); }
  return Array.isArray(parsed?.questions) ? parsed.questions : [];
}

async function firecrawlIsOnInternet(questionText: string): Promise<boolean> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return false; // skip if not configured
  // Trim to a sentence-ish probe
  const probe = normalizeForHash(questionText).slice(0, 220);
  if (probe.length < 60) return false;
  try {
    const resp = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: `"${probe.slice(0, 140)}"`, limit: 3 }),
    });
    if (!resp.ok) return false;
    const json = await resp.json();
    const hits = json?.data || json?.web?.results || [];
    return Array.isArray(hits) && hits.length > 0;
  } catch {
    return false;
  }
}

// --------- Handler ---------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResp(401, { error: "Missing auth" });
    }
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return jsonResp(401, { error: "Invalid auth" });

    const admin = createClient(url, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return jsonResp(403, { error: "Admin role required" });

    const body = await req.json().catch(() => ({}));
    const {
      exam_code = "CAT",
      category = "full_length",   // sectional | topic | full_length | daily | practice
      level = "mixed",            // easy | moderate | hard | mixed
      total_questions,            // optional override
      total_mcq,
      total_tita,
      sets = 1,
      questions_per_set,
      launch_date = null,         // YYYY-MM-DD
      test_name_prefix = null,
      topic = null,               // for topic category
      section_code = null,        // for sectional category (single section)
      section_plan: rawSectionPlan = null, // NEW: per-section overrides for full_length
      verify_internet = true,
    } = body || {};

    const profile = EXAM_PROFILES[exam_code];
    if (!profile) return jsonResp(400, { error: `Unknown exam_code: ${exam_code}` });

    // Sanitise the user-supplied section plan (only honoured for full_length)
    const customSectionPlan: Array<{
      code: string; name: string; duration: number; questions: number; mcq: number; tita: number; sets: number; sort: number;
    }> | null = (category === "full_length" && Array.isArray(rawSectionPlan) && rawSectionPlan.length > 0)
      ? rawSectionPlan.map((r: any, idx: number) => {
          const q = Math.max(0, Number(r?.questions) || 0);
          let m = Math.max(0, Math.min(q, Number(r?.mcq) || 0));
          let t = Math.max(0, Math.min(q, Number(r?.tita) || 0));
          if (m + t !== q) {
            // Preserve user intent on MCQ; fix TITA to satisfy total.
            t = Math.max(0, q - m);
          }
          return {
            code: String(r?.code || `S${idx + 1}`).toUpperCase(),
            name: String(r?.name || r?.code || `Section ${idx + 1}`),
            duration: Math.max(1, Number(r?.duration) || 40),
            questions: q,
            mcq: m,
            tita: t,
            sets: Math.max(0, Number(r?.sets) || 0),
            sort: Number(r?.sort ?? idx),
          };
        }).filter((r) => r.questions > 0)
      : null;

    const setsCount = Math.max(1, Math.min(10, Number(sets) || 1));
    const planTotalQuestions = customSectionPlan
      ? customSectionPlan.reduce((s, r) => s + r.questions, 0)
      : 0;
    const planTotalMcq = customSectionPlan
      ? customSectionPlan.reduce((s, r) => s + r.mcq, 0)
      : 0;
    const planTotalTita = customSectionPlan
      ? customSectionPlan.reduce((s, r) => s + r.tita, 0)
      : 0;

    const perSet = customSectionPlan
      ? planTotalQuestions
      : (Number(questions_per_set) || Number(total_questions) || profile.default_total);
    const mcqCount = customSectionPlan
      ? planTotalMcq
      : (Number(total_mcq) ?? Math.round(perSet * 0.85));
    const titaCount = customSectionPlan
      ? planTotalTita
      : (Number(total_tita) ?? Math.max(0, perSet - mcqCount));
    const safePerSet = mcqCount + titaCount;

    const createdTests: Array<{ id: string; name: string; slug: string }> = [];
    const stats = {
      generated: 0,
      rejected_dup_db: 0,
      rejected_dup_internet: 0,
    };

    // Pre-load all existing question hashes for dedup
    const { data: existingHashes } = await admin
      .from("mock_questions")
      .select("content_hash")
      .not("content_hash", "is", null);
    const seenHashes = new Set<string>(
      (existingHashes || []).map((r: any) => r.content_hash).filter(Boolean),
    );

    // Insert generation log row
    const { data: gen } = await admin.from("ai_mock_generations").insert({
      exam_code, category, level,
      request: body, status: "running",
      total_requested: safePerSet * setsCount,
      ai_model: "google/gemini-2.5-pro",
      created_by: user.id,
    }).select("id").single();
    const genId = gen?.id;

    // Long-running generation runs in the background so the HTTP request
    // returns immediately. The client polls ai_mock_generations for status.
    const runGeneration = async () => {
     try {
    for (let setIdx = 1; setIdx <= setsCount; setIdx++) {
      const baseName = test_name_prefix
        ? `${test_name_prefix} #${setIdx}`
        : `${exam_code} ${labelForCategory(category)} ${setIdx} — AI`;
      const slug = slugify(baseName) + "-" + Date.now().toString(36) + "-" + setIdx;

      // Decide sections for this set based on category (custom plan wins for full_length)
      const sectionPlan: Array<{ code: string; name: string; duration: number; questions: number; sort: number; sets?: number }> =
        customSectionPlan && category === "full_length"
        ? customSectionPlan.map((s, idx) => ({ code: s.code, name: s.name, duration: s.duration, questions: s.questions, sort: idx, sets: s.sets }))
        : planSections(profile, category, safePerSet, section_code, topic);

      const { data: testRow, error: testErr } = await admin.from("mock_tests").insert({
        name: baseName,
        slug,
        description: `AI-generated ${labelForCategory(category)} for ${exam_code}. Level: ${level}.`,
        test_type: category === "topic" ? "topic"
                 : category === "sectional" ? "sectional"
                 : "full_length",
        category,
        exam_code,
        launch_date,
        total_duration_minutes: sectionPlan.reduce((s, x) => s + x.duration, 0),
        difficulty: level === "mixed" ? "medium" : (level === "moderate" ? "medium" : level),
        is_published: false,
        generated_by_ai: true,
        generation_meta: { request: body, set_index: setIdx, total_sets: setsCount, generation_id: genId },
        created_by: user.id,
      }).select("id, name, slug").single();
      if (testErr || !testRow) throw new Error(testErr?.message || "Failed to create test");

      let questionNumberOffset = 0;
      for (const sec of sectionPlan) {
        const { data: secRow, error: secErr } = await admin.from("mock_sections").insert({
          test_id: testRow.id,
          code: sec.code,
          name: sec.name,
          duration_minutes: sec.duration,
          total_questions: sec.questions,
          sort_order: sec.sort,
        }).select("id").single();
        if (secErr || !secRow) throw new Error(secErr?.message || "Failed to create section");

        // Allocate MCQ vs TITA — use custom plan if provided, else proportional split.
        const customSec = customSectionPlan && category === "full_length"
          ? customSectionPlan.find((c) => c.code === sec.code && c.questions === sec.questions) ?? customSectionPlan[sec.sort]
          : null;
        let secMcq: number;
        let secTita: number;
        if (customSec) {
          secMcq = customSec.mcq;
          secTita = customSec.tita;
        } else {
          const sectionShare = sec.questions / safePerSet;
          secMcq = Math.round(mcqCount * sectionShare);
          secTita = sec.questions - secMcq;
        }
        if (secTita < 0) { secTita = 0; secMcq = sec.questions; }

        // Generate in batches
        let produced = 0;
        let attempts = 0;
        const maxAttempts = Math.ceil(sec.questions / BATCH_SIZE) + 3;
        const accepted: any[] = [];
        while (produced < sec.questions && attempts < maxAttempts) {
          attempts++;
          const remain = sec.questions - produced;
          const batch = Math.min(BATCH_SIZE, remain);
          const remainMcq = Math.max(0, secMcq - accepted.filter(q => q.question_type === "mcq").length);
          const remainTita = Math.max(0, secTita - accepted.filter(q => q.question_type === "tita").length);
          const batchMcq = Math.min(remainMcq, Math.ceil(batch * (remainMcq / Math.max(1, remainMcq + remainTita))));
          const batchTita = batch - batchMcq;

          let qs: any[] = [];
          try {
            qs = await callGeminiBatch({
              exam: exam_code, exam_full: profile.full_name,
              category, level,
              section_code: sec.code, section_name: sec.name,
              count: batch, mcq: batchMcq, tita: batchTita,
              positive: profile.default_positive, negative: profile.default_negative,
              userId: user.id,
              // Topic-wise tests must lock every question to the chosen topic.
              strict_topic: category === "topic" && topic ? topic : null,
              // Per-section sets (passages/caselets) — only honoured for full_length.
              sets: category === "full_length" ? (sec.sets ?? 0) : 0,
              total_section_questions: sec.questions,
            });
          } catch (e) {
            console.error("[generate] batch failed:", e);
            continue;
          }

          for (const q of qs) {
            if (produced >= sec.questions) break;
            if (!q?.question_html) continue;
            const hash = await sha256(normalizeForHash(q.question_html));
            if (seenHashes.has(hash)) { stats.rejected_dup_db++; continue; }

            if (verify_internet) {
              const onWeb = await firecrawlIsOnInternet(q.question_html);
              if (onWeb) { stats.rejected_dup_internet++; continue; }
            }

            seenHashes.add(hash);
            accepted.push({ ...q, content_hash: hash });
            produced++;
          }
        }

        // Persist accepted questions + options
        for (let i = 0; i < accepted.length; i++) {
          const q = accepted[i];
          const isTita = q.question_type === "tita";
          const { data: qRow, error: qErr } = await admin.from("mock_questions").insert({
            section_id: secRow.id,
            question_number: questionNumberOffset + i + 1,
            question_type: isTita ? "tita" : "mcq",
            question_html: q.question_html,
            tita_correct_answers: isTita ? (q.tita_answers || []).map(String) : [],
            tita_numeric_tolerance: isTita ? Number(q.tita_tolerance ?? 0) : null,
            positive_marks: profile.default_positive,
            negative_marks: isTita ? 0 : profile.default_negative,
            difficulty: (q.difficulty || (level === "mixed" ? "medium" : (level === "moderate" ? "medium" : level))),
            topic: q.topic || topic || null,
            subtopic: q.subtopic || null,
            explanation_html: q.explanation_html || "",
            content_hash: q.content_hash,
          }).select("id").single();
          if (qErr || !qRow) { console.error("insert q failed", qErr); continue; }

          if (!isTita && Array.isArray(q.options)) {
            const opts = q.options.slice(0, 4).map((o: any, idx: number) => ({
              question_id: qRow.id,
              option_label: o.label || ["A", "B", "C", "D"][idx],
              option_html: o.text || "",
              is_correct: !!o.is_correct,
              sort_order: idx,
            }));
            if (opts.length === 4 && opts.some((o) => o.is_correct)) {
              await admin.from("mock_question_options").insert(opts);
            } else {
              // bad options -> remove the question
              await admin.from("mock_questions").delete().eq("id", qRow.id);
              continue;
            }
          }
          stats.generated++;
        }
        questionNumberOffset += accepted.length;
      }

      createdTests.push(testRow);
    }

    if (genId) {
      await admin.from("ai_mock_generations").update({
        status: "completed",
        total_generated: stats.generated,
        total_rejected_duplicate: stats.rejected_dup_db,
        total_rejected_web_match: stats.rejected_dup_internet,
        result_summary: { tests: createdTests, stats },
        finished_at: new Date().toISOString(),
      }).eq("id", genId);
    }
     } catch (bgErr) {
       const bgMsg = bgErr instanceof Error ? bgErr.message : String(bgErr);
       console.error("[generate-mock-questions] background error:", bgMsg);
       if (genId) {
         await admin.from("ai_mock_generations").update({
           status: "failed",
           error_message: bgMsg,
           finished_at: new Date().toISOString(),
         }).eq("id", genId);
       }
     }
    };

    // Kick off the background task. EdgeRuntime.waitUntil keeps the worker
    // alive after the response is sent.
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runGeneration());
    } else {
      runGeneration();
    }

    return jsonResp(202, {
      ok: true,
      status: "running",
      generation_id: genId,
      message: "Generation started. Poll ai_mock_generations for status.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-mock-questions] error:", msg);
    return jsonResp(500, { error: msg });
  }
});

function jsonResp(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function labelForCategory(c: string) {
  return ({
    full_length: "Full-Length Mock",
    sectional: "Sectional Test",
    topic: "Topic Test",
    daily: "Daily Test",
    practice: "Practice Set",
  } as Record<string, string>)[c] || c;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function planSections(
  profile: typeof EXAM_PROFILES.CAT,
  category: string,
  totalQuestions: number,
  sectionCode: string | null,
  topic: string | null,
) {
  if (category === "full_length") {
    // Scale official sections to totalQuestions
    const officialTotal = profile.sections.reduce((s, x) => s + x.questions, 0);
    return profile.sections.map((s, idx) => {
      const ratio = s.questions / officialTotal;
      const q = Math.max(1, Math.round(totalQuestions * ratio));
      return { code: s.code, name: s.name, duration: s.duration, questions: q, sort: idx };
    });
  }
  if (category === "sectional") {
    const sec = profile.sections.find((s) => s.code === sectionCode) || profile.sections[0];
    return [{ code: sec.code, name: sec.name, duration: sec.duration, questions: totalQuestions, sort: 0 }];
  }
  if (category === "topic") {
    const sec = profile.sections.find((s) => s.code === sectionCode) || profile.sections[0];
    return [{
      code: sec.code,
      name: topic ? `${sec.name} — ${topic}` : sec.name,
      duration: Math.max(15, Math.round((sec.duration / sec.questions) * totalQuestions)),
      questions: totalQuestions, sort: 0,
    }];
  }
  if (category === "daily") {
    // Daily Tests are ALWAYS a balanced 33/33/33 mix across QA, VARC and DILR.
    const desired = ["QA", "VARC", "DILR"] as const;
    const pick = (code: string) =>
      profile.sections.find((s) => s.code === code) || profile.sections[0];
    const base = Math.floor(totalQuestions / 3);
    const remainder = totalQuestions - base * 3; // distribute extras to the first sections
    const counts = [base + (remainder > 0 ? 1 : 0), base + (remainder > 1 ? 1 : 0), base];
    return desired.map((code, idx) => {
      const sec = pick(code);
      const q = Math.max(1, counts[idx]);
      return {
        code: sec.code,
        name: sec.name,
        duration: Math.max(10, Math.round(q * 1.5)),
        questions: q,
        sort: idx,
      };
    });
  }
  if (category === "practice") {
    return [{
      code: sectionCode || "QA",
      name: `${labelForCategory(category)}${topic ? ` — ${topic}` : ""}`,
      duration: Math.max(10, Math.round(totalQuestions * 1.5)),
      questions: totalQuestions, sort: 0,
    }];
  }
  return profile.sections.map((s, idx) => ({ ...s, sort: idx }));
}
