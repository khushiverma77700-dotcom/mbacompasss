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

async function generateBatch(LOVABLE_API_KEY: string, batchSize: number, category: string | null, difficulty: string | null, exclude: string[], recentDupes: string[]) {
  const catLine = category ? `Restrict every word to the category: ${category}.` : `Cover a wide range of MBA categories: finance, marketing, consulting, HR, economics, corp_comm, general.`;
  const diffLine = difficulty ? `Difficulty: ${difficulty}.` : `Mix difficulty across beginner, intermediate, cat, gdpi.`;
  // Send a RANDOM sample of the full existing library (not just last 400) so AI sees broad coverage.
  const sampled = sampleArray(exclude, 600);
  const dupeLine = recentDupes.length
    ? ` ESPECIALLY AVOID these recently-rejected duplicates: ${recentDupes.slice(-150).join(", ")}.`
    : "";
  const excludeBlock = exclude.length
    ? `STRICT UNIQUENESS RULE: The library already contains ${exclude.length} words. DO NOT return any word (case-insensitive, ignoring punctuation/spaces) from this sample of already-used words: ${sampled.join(", ")}.${dupeLine} Pick fresh, less-common MBA words instead.`
    : "";

  const system = `You are an MBA vocabulary curator for Indian aspirants preparing for CAT, XAT, NMAT, SNAP, IIFT, CMAT, MAT, GDPI, WAT, and placements.

Return high-utility business / academic words useful in RC, verbal sections, interviews, GDs and corporate emails.

ABSOLUTE REQUIREMENTS — every single word MUST include EVERY field below, fully filled, no nulls, no empty strings, no placeholders:
- word: the English word
- part_of_speech: noun / verb / adjective / adverb (lowercase)
- meaning: clear 1-2 sentence English definition (>= 10 words)
- meaning_hindi: meaning in DEVANAGARI script (must contain Devanagari characters, NOT romanised). Example: "मूल्यह्रास — किसी संपत्ति के मूल्य में समय के साथ क्रमिक कमी।"
- hinglish_meaning: easy Hinglish (Roman script Hindi) explanation a college student would use. Example: "Matlab koi cheez ya asset ki value time ke saath dheere-dheere kam hona."
- pronunciation_syllables: hyphen-broken easy syllables with the STRESSED syllable in CAPS. Example: "uh-MOR-tuh-zay-shun". MUST contain at least one hyphen.
- pronunciation: same as pronunciation_syllables (or an IPA-like simple form).
- synonyms: 3-5 close English synonyms
- antonyms: 2-5 antonyms (use closest opposites if exact ones don't exist; never empty)
- example_business: one full sentence using the word in a business/board-room context
- example_interview: one full sentence using the word in an MBA interview answer
- example_email: one full sentence using the word in a professional email
- exam_appearances: array of real past Indian MBA entrance exams where this word has actually appeared (e.g. "CAT 2019", "XAT 2021"). If unsure, return []. Never fabricate.
- category: one of finance, marketing, consulting, hr, economics, corp_comm, general
- difficulty: one of beginner, intermediate, cat, gdpi

If you cannot fully complete ALL fields for a word with high quality, OMIT that word entirely — do NOT return partial entries. Words must be unique within the batch and must not appear in the exclude list.`;

  const user = `Generate exactly ${batchSize} unique, fully-complete MBA/business vocabulary words. ${catLine} ${diffLine} ${excludeBlock}\n\nReturn ONLY via the emit_vocab_batch tool. Every word must pass all ABSOLUTE REQUIREMENTS above.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [{
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
                    meaning_hindi: { type: "string", description: "Hindi meaning in Devanagari" },
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
      }],
      tool_choice: { type: "function", function: { name: "emit_vocab_batch" } },
    }),
  });

  if (resp.status === 429) throw new Error("RATE_LIMIT");
  if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (!resp.ok) throw new Error(`AI gateway ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned");
  const parsed = JSON.parse(args);
  return Array.isArray(parsed.words) ? parsed.words : [];
}

async function runJob(jobId: string, total: number, category: string | null, difficulty: string | null) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

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

  await supabase.from("vocab_generation_jobs").update({ status: "running", current_activity: "Warming up…" }).eq("id", jobId);

  const BATCH = 25;
  let consecutiveEmpty = 0;
  const MAX_ATTEMPTS = Math.ceil(total / BATCH) * 4 + 10; // safety cap
  let attempts = 0;

  while (generated < total && attempts < MAX_ATTEMPTS) {
    attempts++;
    const need = Math.min(BATCH, total - generated);
    await supabase.from("vocab_generation_jobs").update({
      current_activity: `Generating batch ${attempts} (${generated}/${total})…`,
    }).eq("id", jobId);

    let batch: any[] = [];
    try {
      batch = await generateBatch(LOVABLE_API_KEY, need, category, difficulty, Array.from(seenSlugs), recentDupes);
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
        hasText(w.part_of_speech);
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
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const { data: job, error } = await supabase.from("vocab_generation_jobs").insert({
      requested: count, category, difficulty, status: "pending",
      created_by: user.id, current_activity: "Queued",
    }).select().single();
    if (error) throw error;

    // @ts-ignore Edge runtime background tasks
    EdgeRuntime.waitUntil(runJob(job.id, count, category, difficulty));

    return new Response(JSON.stringify({ job_id: job.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vocab-bulk-generate error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
