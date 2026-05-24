// Bulk-generate unique MBA vocabulary words via Lovable AI.
// POST { count, category?, difficulty? } -> creates job, runs in background, returns { job_id }
// GET ?job_id=...                         -> returns job row
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = ["finance","marketing","consulting","hr","economics","corp_comm","general"];
const DIFFICULTIES = ["beginner","intermediate","cat","gdpi"];
const EXAMS = ["CAT","XAT","NMAT","SNAP","IIFT","CMAT","MAT"];

function slugify(w: string): string {
  return String(w).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n) {
    const i = Math.floor(Math.random() * arr.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(arr[i]);
  }
  return out;
}

type Provider = "lovable" | "openai";

async function generateBatch(
  provider: Provider,
  keys: { lovable: string; openai: string },
  batchSize: number,
  category: string | null,
  difficulty: string | null,
  exam: string | null,
  exclude: string[],
  recentDupes: string[],
) {
  const catLine = category ? `Restrict every word to the category: ${category}.` : `Cover finance, marketing, consulting, HR, economics, corp_comm, general.`;
  const diffLine = difficulty ? `Difficulty: ${difficulty}.` : `Mix difficulty across beginner, intermediate, cat, gdpi.`;
  const examLine = exam
    ? `EXAM SCOPE: Only words actually appeared in real past ${exam} papers (verbal/RC/vocab/SC/cloze). Each MUST list at least one verifiable "${exam} <YEAR> Slot <N>" appearance. If unsure, OMIT.`
    : "";
  const sampled = sampleArray(exclude, 400);
  const dupeLine = recentDupes.length ? ` Avoid recent duplicates: ${recentDupes.slice(-100).join(", ")}.` : "";
  const excludeBlock = exclude.length
    ? `UNIQUENESS: Library has ${exclude.length} words. DO NOT return any (case-insensitive) from: ${sampled.join(", ")}.${dupeLine}`
    : "";

  const examAppearanceRule = exam
    ? `- exam_appearances: REQUIRED non-empty. Each entry matches "${exam} <YEAR> Slot <N>" or "${exam} <YEAR>". Never fabricate.`
    : `- exam_appearances: real past Indian MBA exam appearances ("CAT 2019 Slot 2"). If unsure, return [].`;

  // Compact system prompt — saves ~500 input tokens per call vs the old verbose one.
  const system = `You curate MBA vocabulary for Indian aspirants (CAT/XAT/NMAT/SNAP/IIFT/CMAT/MAT, GDPI, placements).

EVERY word MUST include EVERY field, fully filled — no nulls, no placeholders:
- word, part_of_speech (noun/verb/adjective/adverb, lowercase)
- meaning: 1-2 sentence English definition (>=10 words)
- meaning_hindi: DEVANAGARI script (must contain Devanagari chars). Ex: "मूल्यह्रास — संपत्ति के मूल्य में क्रमिक कमी।"
- hinglish_meaning: easy Roman-script Hindi. Ex: "Matlab asset ki value time ke saath kam hona."
- pronunciation_syllables: hyphen-broken, STRESSED syllable in CAPS. Ex: "uh-MOR-tuh-zay-shun" (MUST contain a hyphen)
- pronunciation: same as syllables
- synonyms: 3-5 strings | antonyms: 2-5 strings (never empty)
- example_business, example_interview, example_email: one full sentence each
${examAppearanceRule}
- category: finance|marketing|consulting|hr|economics|corp_comm|general
- difficulty: beginner|intermediate|cat|gdpi

If you cannot fully complete ALL fields with high quality, OMIT the word. Unique within batch, not in exclude list.`;

  const user = `Generate exactly ${batchSize} unique fully-complete words. ${catLine} ${diffLine} ${examLine} ${excludeBlock}\n\nReturn ONLY via the emit_vocab_batch tool.`;

  const toolSchema = {
    type: "function",
    function: {
      name: "emit_vocab_batch",
      description: "Return a batch of structured MBA vocabulary words.",
      parameters: {
        type: "object",
        properties: {
          words: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                word: { type: "string" },
                part_of_speech: { type: "string" },
                meaning: { type: "string" },
                meaning_hindi: { type: "string" },
                hinglish_meaning: { type: "string" },
                pronunciation: { type: "string" },
                pronunciation_syllables: { type: "string" },
                synonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
                antonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
                example_business: { type: "string" },
                example_interview: { type: "string" },
                example_email: { type: "string" },
                exam_appearances: { type: "array", items: { type: "string" }, maxItems: 6 },
                category: { type: "string", enum: CATEGORIES },
                difficulty: { type: "string", enum: DIFFICULTIES },
              },
              required: ["word","part_of_speech","meaning","meaning_hindi","hinglish_meaning","pronunciation_syllables","synonyms","antonyms","example_business","example_interview","example_email","exam_appearances","category","difficulty"],
              additionalProperties: false,
            },
          },
        },
        required: ["words"],
        additionalProperties: false,
      },
    },
  } as const;

  const endpoint = provider === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const apiKey = provider === "openai" ? keys.openai : keys.lovable;
  const model = provider === "openai" ? "gpt-4o-mini" : "google/gemini-3-flash-preview";

  if (!apiKey) throw new Error(provider === "openai" ? "OPENAI_API_KEY not configured" : "LOVABLE_API_KEY not configured");

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [toolSchema],
      tool_choice: { type: "function", function: { name: "emit_vocab_batch" } },
      ...(provider === "openai" ? { temperature: 0.7 } : {}),
    }),
  });

  if (resp.status === 429) throw new Error("RATE_LIMIT");
  if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (resp.status === 401) throw new Error(`${provider.toUpperCase()}_AUTH_FAILED`);
  if (!resp.ok) throw new Error(`${provider} ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned");
  const parsed = JSON.parse(args);
  return Array.isArray(parsed.words) ? parsed.words : [];
}

async function runJob(jobId: string, total: number, category: string | null, difficulty: string | null, exam: string | null, provider: Provider) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keys = {
    lovable: Deno.env.get("LOVABLE_API_KEY") || "",
    openai: Deno.env.get("OPENAI_API_KEY") || "",
  };

  let generated = 0, duplicates = 0, failed = 0;
  const seenSlugs = new Set<string>();
  const recentDupes: string[] = [];

  // Seed exclude list with ALL existing slugs (paginated, so dedupe works for large libraries)
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data: page } = await supabase.from("vocab_words").select("word").range(from, from + PAGE - 1);
      if (!page || page.length === 0) break;
      for (const r of page as any[]) if (r.word) seenSlugs.add(slugify(r.word));
      if (page.length < PAGE) break;
      from += PAGE;
    }
  }

  await supabase.from("vocab_generation_jobs").update({ status: "running", current_activity: `Warming up (${provider})…` }).eq("id", jobId);

  // OpenAI handles bigger batches reliably -> fewer calls -> lower cost.
  const BATCH = provider === "openai" ? 40 : 25;
  let consecutiveEmpty = 0;
  const MAX_ATTEMPTS = Math.ceil(total / BATCH) * 4 + 10; // safety cap
  let attempts = 0;

  while (generated < total && attempts < MAX_ATTEMPTS) {
    attempts++;
    const need = Math.min(BATCH, total - generated);
    await supabase.from("vocab_generation_jobs").update({
      current_activity: `Generating batch ${attempts} via ${provider} (${generated}/${total})…`,
    }).eq("id", jobId);

    let batch: any[] = [];
    try {
      batch = await generateBatch(provider, keys, need, category, difficulty, exam, Array.from(seenSlugs), recentDupes);
    } catch (e) {
      const msg = (e as Error).message;
      console.error("Batch error", msg);
      if (msg === "RATE_LIMIT") {
        await supabase.from("vocab_generation_jobs").update({ current_activity: "Rate limited, sleeping 15s…" }).eq("id", jobId);
        await new Promise((r) => setTimeout(r, 15000));
        continue;
      }
      if (msg === "CREDITS_EXHAUSTED") {
        await supabase.from("vocab_generation_jobs").update({ status: "failed", error: "AI credits exhausted." }).eq("id", jobId);
        return;
      }
      failed++;
      if (failed > 8) {
        await supabase.from("vocab_generation_jobs").update({ status: "failed", error: msg, failed }).eq("id", jobId);
        return;
      }
      continue;
    }

    if (!batch.length) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 3) break;
      continue;
    }
    consecutiveEmpty = 0;

    const rows: any[] = [];
    let rejectedIncomplete = 0;
    for (const w of batch) {
      if (!w?.word || !w?.meaning) { rejectedIncomplete++; continue; }
      const slug = slugify(w.word);
      if (!slug || seenSlugs.has(slug)) {
        duplicates++;
        recentDupes.push(w.word);
        if (recentDupes.length > 300) recentDupes.splice(0, recentDupes.length - 300);
        continue;
      }

      // STRICT: every required field must be a non-empty string / non-empty array.
      const hasText = (v: any) => typeof v === "string" && v.trim().length > 1;
      const hasArr = (v: any) => Array.isArray(v) && v.filter((x) => typeof x === "string" && x.trim()).length > 0;
      const complete =
        hasText(w.meaning) &&
        hasText(w.meaning_hindi) &&
        /[\u0900-\u097F]/.test(w.meaning_hindi) && // must contain Devanagari
        hasText(w.hinglish_meaning) &&
        hasText(w.pronunciation_syllables) &&
        w.pronunciation_syllables.includes("-") && // must be hyphen-broken
        hasText(w.example_business) &&
        hasText(w.example_interview) &&
        hasText(w.example_email) &&
        hasArr(w.synonyms) &&
        hasArr(w.antonyms) &&
        hasText(w.part_of_speech) &&
        // When an exam is specified, require at least one valid exam appearance for that exam.
        (!exam || (hasArr(w.exam_appearances) && w.exam_appearances.some((s: any) =>
          typeof s === "string" && new RegExp(`\\b${exam}\\b`, "i").test(s) && /\b(19|20)\d{2}\b/.test(s)
        )));
      if (!complete) { rejectedIncomplete++; continue; }

      seenSlugs.add(slug);
      rows.push({
        word: w.word,
        slug,
        part_of_speech: w.part_of_speech,
        meaning: w.meaning,
        meaning_hindi: w.meaning_hindi,
        hinglish_meaning: w.hinglish_meaning,
        pronunciation: w.pronunciation || w.pronunciation_syllables,
        pronunciation_syllables: w.pronunciation_syllables,
        synonyms: w.synonyms,
        antonyms: w.antonyms,
        example_business: w.example_business,
        example_interview: w.example_interview,
        example_email: w.example_email,
        exam_appearances: Array.isArray(w.exam_appearances) ? w.exam_appearances : [],
        category: CATEGORIES.includes(w.category) ? w.category : (category || "general"),
        difficulty: DIFFICULTIES.includes(w.difficulty) ? w.difficulty : (difficulty || "intermediate"),
        source: "ai_bulk",
      });
    }
    if (rejectedIncomplete) {
      console.log(`Rejected ${rejectedIncomplete} incomplete words in batch ${attempts}`);
    }

    if (rows.length) {
      const { data: inserted, error } = await supabase
        .from("vocab_words")
        .upsert(rows, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) {
        console.error("Upsert error", error);
        failed++;
      } else {
        const addedNow = inserted?.length || 0;
        generated += addedNow;
        // any rows that didn't insert were duplicates from a race
        duplicates += rows.length - addedNow;
      }
    }

    await supabase.from("vocab_generation_jobs").update({
      generated, duplicates, failed,
    }).eq("id", jobId);
  }

  await supabase.from("vocab_generation_jobs").update({
    status: generated >= total ? "completed" : "completed",
    current_activity: `Done. Added ${generated}, skipped ${duplicates} duplicates, ${failed} failed batches.`,
    generated, duplicates, failed,
  }).eq("id", jobId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // Direct lookup with service role — has_role() RPC is restricted to auth.uid() context.
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (req.method === "GET") {
      const url = new URL(req.url);
      const jobId = url.searchParams.get("job_id");
      if (!jobId) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data, error } = await supabase.from("vocab_generation_jobs").select("*").eq("id", jobId).maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ job: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    let count = Number(body.count || 100);
    if (!Number.isFinite(count) || count < 1) count = 100;
    count = Math.min(count, 5000);
    const category = body.category && CATEGORIES.includes(body.category) ? body.category : null;
    const difficulty = body.difficulty && DIFFICULTIES.includes(body.difficulty) ? body.difficulty : null;
    const exam = body.exam && EXAMS.includes(String(body.exam).toUpperCase()) ? String(body.exam).toUpperCase() : null;
    const provider: Provider = body.provider === "openai" ? "openai" : "lovable";

    if (provider === "openai" && !Deno.env.get("OPENAI_API_KEY")) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured in backend secrets." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: job, error } = await supabase.from("vocab_generation_jobs").insert({
      requested: count, category, difficulty, status: "pending",
      created_by: user.id,
      current_activity: `Queued (${provider}${exam ? `, ${exam}-only` : ""})`,
    }).select().single();
    if (error) throw error;

    // @ts-ignore Edge runtime background tasks
    EdgeRuntime.waitUntil(runJob(job.id, count, category, difficulty, exam, provider));

    return new Response(JSON.stringify({ job_id: job.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vocab-bulk-generate error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
