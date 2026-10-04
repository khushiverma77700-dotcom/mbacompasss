// Personalized Hub bulk generation worker.
// - action=create: builds a job + items, kicks off background processing
// - action=tick: cron-callable, drains stale/pending items in background
// - action=resume: re-kicks a job's background loop
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0?target=denonext";
import { getCredential } from "../_shared/getCredential.ts";
import { validateMockQuestion } from "../_shared/mockQuestionQuality.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an elite MBA entrance exam question setter and meticulous copy editor (CAT, NMAT, XAT, SNAP, IIFT, CMAT, MAT). Match the selected exam's real difficulty, syllabus, pacing and style. Never create school-level recall, one-step filler, ambiguous stems, insufficient data, duplicate options or incorrect answer keys. Independently solve and proofread every item before returning it. Respond ONLY by calling the provided tool.`;

const CHUNK = 10; // questions per OpenAI call
const LOCK_MINUTES = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function generateChunk(
  exam_code: string,
  section: string,
  difficulty: string,
  n: number,
): Promise<{ rows: any[]; error?: string }> {
  const OPENAI_API_KEY = await getCredential("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return { rows: [], error: "OPENAI_API_KEY missing" };

  const userPrompt = `Generate ${n} ${difficulty} difficulty multiple-choice questions for exam ${exam_code}, section ${section}.
Each question:
- Realistic ${exam_code} style; difficulty is relative to the actual exam, and even easy questions must not be basic filler
- Requires at least two meaningful reasoning/application steps
- No trivia unless this section officially tests it
- 4 options
- Single correct answer (index 0–3)
- Detailed explanation of at least 140 characters that verifies the answer
- 1–2 word topic tag
Vary topics, numbers, names, and contexts so questions are clearly different from one another and from any standard textbook questions. Do not reuse stems. Seed: ${crypto.randomUUID()}.`;

  const tools = [{
    type: "function",
    function: {
      name: "save_questions",
      description: "Save the generated MCQ questions",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                correct_index: { type: "integer", minimum: 0, maximum: 3 },
                explanation: { type: "string" },
                topic: { type: "string" },
              },
              required: ["question_text", "options", "correct_index", "explanation", "topic"],
              additionalProperties: false,
            },
          },
        },
        required: ["questions"],
        additionalProperties: false,
      },
    },
  }];

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
      tools,
      tool_choice: { type: "function", function: { name: "save_questions" } },
      temperature: 0.8,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    return { rows: [], error: `OpenAI ${resp.status}: ${t.slice(0, 300)}` };
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { rows: [], error: "no tool call" };
  let parsed: any;
  try { parsed = JSON.parse(args); } catch { return { rows: [], error: "bad json" }; }
  const qs = parsed.questions ?? [];
  if (!qs.length) return { rows: [], error: "no questions" };

  const validQuestions = qs.filter((q: any) => validateMockQuestion({ ...q, question_type: "mcq" }).valid);
  if (!validQuestions.length) return { rows: [], error: "all generated questions failed the editorial quality check" };

  return {
    rows: validQuestions.map((q: any) => ({
      exam_code,
      section,
      difficulty,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      topic: q.topic ?? null,
      source: "ai-bulk",
    })),
  };
}

async function processOneItem(itemId: string) {
  const db = admin();
  const { data: item } = await db
    .from("personalized_bulk_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (!item) return;

  const remaining = (item.requested_count ?? 0) - (item.generated_count ?? 0);
  if (remaining <= 0) {
    await db.from("personalized_bulk_items").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      current_step: "done",
    }).eq("id", itemId);
    await db.rpc("rollup_personalized_bulk_job", { _job_id: item.job_id });
    return;
  }

  const take = Math.min(remaining, CHUNK);
  await db.from("personalized_bulk_items").update({
    current_step: `generating ${take}…`,
    worker_lock_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
  }).eq("id", itemId);

  const { rows, error } = await generateChunk(item.exam_code, item.section, item.difficulty, take);

  if (error || !rows.length) {
    await db.from("personalized_bulk_items").update({
      status: "pending", // let cron/worker retry
      failed_count: (item.failed_count ?? 0) + take,
      last_error: error ?? "empty response",
      current_step: `failed: ${error ?? "empty"} — will retry`,
      worker_lock_until: new Date(Date.now() + 60_000).toISOString(), // backoff
    }).eq("id", itemId);
    await db.rpc("rollup_personalized_bulk_job", { _job_id: item.job_id });
    return;
  }

  // Deduplicate within batch by normalized text
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    const k = (r.question_text ?? "").trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Upsert with ignoreDuplicates so the DB-level unique index on
  // (exam_code, section, question_hash) drops anything already in the bank.
  // .select() returns only the rows that were actually inserted.
  const { data: inserted, error: insErr } = await db
    .from("personalized_questions")
    .upsert(deduped, { onConflict: "exam_code,section,question_hash", ignoreDuplicates: true })
    .select("id");

  if (insErr) {
    await db.from("personalized_bulk_items").update({
      status: "pending",
      last_error: insErr.message.slice(0, 500),
      current_step: "insert failed — will retry",
      worker_lock_until: new Date(Date.now() + 60_000).toISOString(),
    }).eq("id", itemId);
    await db.rpc("rollup_personalized_bulk_job", { _job_id: item.job_id });
    return;
  }

  const newGen = (item.generated_count ?? 0) + (inserted?.length ?? 0);
  const dupSkipped = deduped.length - (inserted?.length ?? 0);
  const done = newGen >= item.requested_count;
  await db.from("personalized_bulk_items").update({
    generated_count: newGen,
    status: done ? "completed" : "pending",
    completed_at: done ? new Date().toISOString() : null,
    current_step: done
      ? "done"
      : `${newGen}/${item.requested_count}${dupSkipped ? ` (skipped ${dupSkipped} dup)` : ""}`,
    last_error: null,
    worker_lock_until: null,
  }).eq("id", itemId);
  await db.rpc("rollup_personalized_bulk_job", { _job_id: item.job_id });
}

async function drainLoop(maxItems = 200) {
  const db = admin();
  for (let i = 0; i < maxItems; i++) {
    const { data: claimed, error } = await db.rpc("claim_personalized_bulk_item", { _lock_minutes: LOCK_MINUTES });
    if (error || !claimed) break;
    try {
      await processOneItem((claimed as any).id);
    } catch (e) {
      await db.from("personalized_bulk_items").update({
        status: "pending",
        last_error: String(e).slice(0, 500),
        current_step: "exception — will retry",
        worker_lock_until: new Date(Date.now() + 60_000).toISOString(),
      }).eq("id", (claimed as any).id);
    }
    // tiny stagger to be polite to the API
    await new Promise((r) => setTimeout(r, 500));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "tick";
    const db = admin();

    if (action === "create") {
      // Verify caller is admin
      const auth = req.headers.get("Authorization");
      if (!auth) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "Unauthorized" }, 401);
      const { data: roles } = await db.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!roles?.some((r) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

      const items: { exam_code: string; section: string; difficulty: string; existing_count: number; requested_count: number }[] = body.items ?? [];
      const clean = items.filter((it) => it.requested_count > 0);
      if (!clean.length) return json({ error: "No items requested" }, 400);

      const totalReq = clean.reduce((s, it) => s + it.requested_count, 0);
      const { data: job, error: jobErr } = await db.from("personalized_bulk_jobs").insert({
        created_by: u.user.id,
        total_requested: totalReq,
        note: body.note ?? null,
        status: "running",
      }).select("*").single();
      if (jobErr) return json({ error: jobErr.message }, 500);

      const rows = clean.map((it) => ({ ...it, job_id: job.id }));
      const { error: itErr } = await db.from("personalized_bulk_items").insert(rows);
      if (itErr) return json({ error: itErr.message }, 500);

      // Background drain — survives client disconnect
      // @ts-ignore EdgeRuntime is provided
      EdgeRuntime.waitUntil(drainLoop(500));
      return json({ ok: true, job_id: job.id, total_items: rows.length, total_requested: totalReq });
    }

    if (action === "resume") {
      const jobId = body.job_id;
      if (jobId) {
        // unlock any stuck-on-this-job items so the next tick picks them up
        await db.from("personalized_bulk_items").update({
          status: "pending",
          worker_lock_until: null,
          current_step: "resumed",
        }).eq("job_id", jobId).in("status", ["processing"]);
      }
      // @ts-ignore
      EdgeRuntime.waitUntil(drainLoop(500));
      return json({ ok: true });
    }

    if (action === "cancel") {
      const jobId = body.job_id;
      if (!jobId) return json({ error: "job_id required" }, 400);
      await db.from("personalized_bulk_items").update({
        status: "completed",
        current_step: "cancelled",
        completed_at: new Date().toISOString(),
      }).eq("job_id", jobId).in("status", ["pending", "processing"]);
      await db.rpc("rollup_personalized_bulk_job", { _job_id: jobId });
      return json({ ok: true });
    }

    // default: tick (cron)
    // @ts-ignore
    EdgeRuntime.waitUntil(drainLoop(200));
    return json({ ok: true, ticked: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
