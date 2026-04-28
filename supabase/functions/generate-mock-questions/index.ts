// AI Mock Question Generator
// - Calls Gemini via shared aiGateway with structured JSON output
// - De-duplicates against existing mock_questions via SHA-256 content_hash
// - Optionally verifies uniqueness via Firecrawl web search
// - Persists sections + questions + options into the target mock_test
//
// Auth: admin only (verifies JWT in code; verify_jwt = false in config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

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
      { code: "DILR", name: "Data Interpretation & Logical Reasoning", duration: 40, questions: 20 },
      { code: "QA", name: "Quantitative Aptitude", duration: 40, questions: 22 },
    ],
    default_positive: 3, default_negative: 1,
  },
  XAT: {
    full_name: "Xavier Aptitude Test (XLRI)",
    default_total: 95,
    sections: [
      { code: "VALR", name: "Verbal & Logical Ability", duration: 50, questions: 26 },
      { code: "DM", name: "Decision Making", duration: 50, questions: 21 },
      { code: "QADI", name: "Quantitative Ability & Data Interpretation", duration: 50, questions: 28 },
      { code: "GK", name: "General Knowledge", duration: 15, questions: 20 },
    ],
    default_positive: 1, default_negative: 0.25,
  },
  SNAP: {
    full_name: "Symbiosis National Aptitude Test",
    default_total: 60,
    sections: [
      { code: "GE", name: "General English", duration: 15, questions: 15 },
      { code: "AR", name: "Analytical & Logical Reasoning", duration: 25, questions: 25 },
      { code: "QADS", name: "Quantitative, Data Interpretation & Data Sufficiency", duration: 20, questions: 20 },
    ],
    default_positive: 1, default_negative: 0.25,
  },
  NMAT: {
    full_name: "NMAT by GMAC",
    default_total: 108,
    sections: [
      { code: "LS", name: "Language Skills", duration: 28, questions: 36 },
      { code: "LR", name: "Logical Reasoning", duration: 40, questions: 36 },
      { code: "QS", name: "Quantitative Skills", duration: 52, questions: 36 },
    ],
    default_positive: 1, default_negative: 0,
  },
  CMAT: {
    full_name: "Common Management Admission Test",
    default_total: 100,
    sections: [
      { code: "QADI", name: "Quantitative Techniques & Data Interpretation", duration: 36, questions: 20 },
      { code: "LR", name: "Logical Reasoning", duration: 36, questions: 20 },
      { code: "LC", name: "Language Comprehension", duration: 36, questions: 20 },
      { code: "GA", name: "General Awareness", duration: 36, questions: 20 },
      { code: "IE", name: "Innovation & Entrepreneurship", duration: 36, questions: 20 },
    ],
    default_positive: 4, default_negative: 1,
  },
  IIFT: {
    full_name: "Indian Institute of Foreign Trade Entrance Test",
    default_total: 110,
    sections: [
      { code: "VARC", name: "Verbal Ability & Reading Comprehension", duration: 40, questions: 35 },
      { code: "QA", name: "Quantitative Analysis", duration: 35, questions: 25 },
      { code: "DILR", name: "Data Interpretation & Logical Reasoning", duration: 40, questions: 30 },
      { code: "GK", name: "General Knowledge & Current Affairs", duration: 25, questions: 20 },
    ],
    default_positive: 3, default_negative: 1,
  },
  MAT: {
    full_name: "Management Aptitude Test",
    default_total: 150,
    sections: [
      { code: "LC", name: "Language Comprehension", duration: 30, questions: 30 },
      { code: "ICR", name: "Intelligence & Critical Reasoning", duration: 30, questions: 30 },
      { code: "DA", name: "Data Analysis & Sufficiency", duration: 30, questions: 30 },
      { code: "MS", name: "Mathematical Skills", duration: 30, questions: 30 },
      { code: "IGE", name: "Indian & Global Environment", duration: 30, questions: 30 },
    ],
    default_positive: 1, default_negative: 0.25,
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

function sectionFamily(code: string) {
  const c = String(code || "").toUpperCase();
  if (["VARC", "VALR", "LS", "GE", "LC"].includes(c)) return "verbal";
  if (["DILR", "LR", "AR", "DA", "QADS", "QADI"].includes(c)) return "logic-data";
  if (["QA", "QS", "MS"].includes(c)) return "quant";
  if (["GK", "GA", "IGE", "IE", "DM", "ICR"].includes(c)) return "judgement-gk";
  return "general";
}

function normalizeDifficulty(value: unknown, requestedLevel: string): "easy" | "medium" | "hard" {
  const raw = String(value || requestedLevel || "medium").toLowerCase();
  if (["easy", "easier", "low"].includes(raw)) return "easy";
  if (["hard", "difficult", "advanced", "high"].includes(raw)) return "hard";
  return "medium";
}

function buildSystemPrompt(opts: {
  exam: string; exam_full: string; category: string; level: string;
  section_code: string; section_name: string;
  strict_topic?: string | null;
  sets?: number | null;
  questions_per_set?: number | null;
  total_section_questions?: number | null;
  mcq_count?: number | null;
  tita_count?: number | null;
}) {
  const levelGuidance = opts.level === "mixed"
    ? "Mix Easy (~30%), Moderate (~40%), Hard (~30%)."
    : `Strictly target ${normalizeDifficulty(null, opts.level).toUpperCase()} difficulty. Every returned question difficulty must be exactly "${normalizeDifficulty(null, opts.level)}".`;

  const topicLock = opts.strict_topic
    ? `\n\nSTRICT TOPIC LOCK (Topic-wise Test):\n- EVERY question MUST be exclusively from the topic: "${opts.strict_topic}".\n- The "topic" field on every question MUST be "${opts.strict_topic}".`
    : "";

  // Hybrid sets + standalone block.
  // sets > 0 means: first (sets * questions_per_set) questions belong to passages/caselets,
  // the remaining questions in this batch are standalone.
  const setsCount = opts.sets ?? 0;
  const qPerSet = opts.questions_per_set ?? 4;
  const setQuestions = setsCount > 0 ? setsCount * qPerSet : 0;
  const standaloneQuestions = Math.max(0, (opts.total_section_questions ?? 0) - setQuestions);

  let setsBlock = "";
  if (setsCount > 0) {
    const family = sectionFamily(opts.section_code);
    const isVARC = family === "verbal";
    const isDILR = family === "logic-data";
    const ctxLabel = isVARC ? "Reading Comprehension passage" : isDILR ? "DI/LR caselet with data" : "shared-context set";
    const ctxDesc = isVARC
      ? "an original Reading Comprehension PASSAGE of 350–550 words (history / science / philosophy / business / arts / social issues)"
      : isDILR
        ? "an original DI/LR caselet with FULLY DETAILED DATA. Include a properly formatted HTML <table> (rows × columns with numeric data) AND/OR an inline ASCII bar/line chart inside <pre> tags. Caselets must contain rich data such as sales figures, rankings, percentage shares, time series, tournament results, seating arrangements, family trees, blood relations, etc. Numbers, names and the scenario must be fresh and original."
        : "a shared-context block";

    setsBlock = `\n\nMANDATORY SECTION STRUCTURE (CAT-style hybrid):
This batch must contain EXACTLY ${opts.total_section_questions} questions total, structured as:
  • ${setsCount} SETS × ${qPerSet} questions each = ${setQuestions} set-bound questions (FIRST in the output array)
  • ${standaloneQuestions} STANDALONE questions (AFTER the set questions)

For SET-BOUND questions:
- Each of the ${setsCount} sets is ${ctxDesc}.
- Each set has exactly ${qPerSet} questions tied to that ${ctxLabel}.
- The FIRST question of each set MUST contain the FULL shared context wrapped in <div class="passage">…</div> followed by the question stem.
- The remaining ${qPerSet - 1} questions of the same set MUST also include the SAME passage/caselet HTML at the top (so each row is self-contained).
- Tag each set-bound question with "set_index": 1..${setsCount} and "is_set_question": true.
${isDILR ? "- DILR caselets MUST contain rich tabular data; never write a vague caselet — include actual numbers, names, columns, totals." : ""}
${isVARC ? "- The first 3 RC passages each have 4 questions tightly tied to that passage (inference, main idea, vocab in context, author tone, etc.)." : ""}

For STANDALONE questions:
- ${standaloneQuestions} fresh independent questions, no shared context.
- Mix MCQ and TITA per the requested counts.
- Tag each standalone with "is_set_question": false (no set_index).`;
  } else if (sectionFamily(opts.section_code) === "logic-data") {
    setsBlock = `\n\nDATA/REASONING REQUIREMENT: Every question must be exam-realistic with concrete data wherever relevant — include an HTML <table> or ASCII chart in <pre> tags for DI/data-heavy prompts. Never write a vague caselet.`;
  }

  return `You are an elite ${opts.exam_full} (${opts.exam}) question setter with 15+ years of experience writing original mock questions for top MBA coaching institutes in India.

GENERATE 100% ORIGINAL questions for:
- Exam: ${opts.exam} (${opts.exam_full})
- Section: ${opts.section_name} (${opts.section_code})
- Category: ${opts.category}
- Difficulty: ${levelGuidance}${topicLock}${setsBlock}

CRITICAL RULES:
1. EVERY question must be ORIGINAL — never copy from past papers, NCERT, RS Aggarwal, Arun Sharma, Nishit Sinha, Time, IMS, CL, study material, blogs, or anything published.
2. Use FRESH numbers, fresh names, fresh contexts. Never reuse classic problems verbatim.
3. Every question must include a DETAILED step-by-step explanation (200-400 words) with concept, approach, common traps, shortcut tricks, and final answer derivation.
4. For MCQ: exactly 4 options labelled A, B, C, D, with exactly ONE correct.
5. For TITA: provide numeric answer(s) and tolerance if applicable. NO options.
6. Tag each question with topic and subtopic accurately.
7. Match the official ${opts.exam} pattern, length, and style precisely.
8. Output ONLY valid JSON. No prose. No markdown fences. Use raw integers (no thousands separators like "1,234").`;
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

async function callOpenAIBatch(args: {
  exam: string; exam_full: string; category: string; level: string;
  section_code: string; section_name: string;
  count: number; mcq: number; tita: number;
  positive: number; negative: number;
  userId: string | null;
  strict_topic?: string | null;
  sets?: number | null;
  questions_per_set?: number | null;
  total_section_questions?: number | null;
}) {
  const sys = buildSystemPrompt({
    exam: args.exam, exam_full: args.exam_full, category: args.category, level: args.level,
    section_code: args.section_code, section_name: args.section_name,
    strict_topic: args.strict_topic ?? null,
    sets: args.sets ?? null,
    questions_per_set: args.questions_per_set ?? null,
    total_section_questions: args.total_section_questions ?? null,
    mcq_count: args.mcq,
    tita_count: args.tita,
  });
  const user = buildUserPrompt({
    count: args.count, mcq_count: args.mcq, tita_count: args.tita,
    positive: args.positive, negative: args.negative,
  });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
      max_tokens: 16000,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI call failed (${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty content");
  // Tolerant JSON parse: strip markdown fences and locate the outer JSON object.
  let parsed: any;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    const cleaned = String(content).replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
      catch { throw new Error("AI returned non-JSON content"); }
    } else {
      throw new Error("AI returned non-JSON content");
    }
  }
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
      ai_model: "openai/gpt-4o",
      created_by: user.id,
    }).select("id").single();
    const genId = gen?.id;

    // Long-running generation runs in the background so the HTTP request
    // returns immediately. The client polls ai_mock_generations + mock_section_jobs for status.
    const runGeneration = async () => {
     try {
    for (let setIdx = 1; setIdx <= setsCount; setIdx++) {
      const baseName = test_name_prefix
        ? (setsCount > 1 ? `${test_name_prefix} #${setIdx}` : test_name_prefix)
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

      // ---------- Pre-create section rows + progress jobs ----------
      const sectionRecords: Array<{
        sec: typeof sectionPlan[number];
        secRowId: string;
        jobId: string | null;
        secMcq: number;
        secTita: number;
        questionNumberOffset: number;
      }> = [];
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

        const customSec = customSectionPlan && category === "full_length"
          ? customSectionPlan.find((c) => c.code === sec.code) ?? customSectionPlan[sec.sort]
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

        // Create a progress job for the UI to poll
        let jobId: string | null = null;
        if (genId) {
          const { data: jobRow } = await admin.from("mock_section_jobs").insert({
            generation_id: genId,
            test_id: testRow.id,
            section_id: secRow.id,
            exam_code,
            category,
            level,
            section_code: sec.code,
            section_name: sec.name,
            total_questions: sec.questions,
            mcq_count: secMcq,
            tita_count: secTita,
            topic: topic || null,
            strict_topic: category === "topic" ? topic : null,
            positive_marks: profile.default_positive,
            negative_marks: profile.default_negative,
            verify_internet: !!verify_internet,
            status: "pending",
            attempts: 0,
            questions_done: 0,
            current_step: "queued",
            created_by: user.id,
          }).select("id").single();
          jobId = jobRow?.id ?? null;
        }

        sectionRecords.push({ sec, secRowId: secRow.id, jobId, secMcq, secTita, questionNumberOffset });
        questionNumberOffset += sec.questions;
      }

      // ---------- Process sections in PARALLEL ----------
      await Promise.all(sectionRecords.map(async (rec) => {
        const { sec, secRowId, jobId, secMcq, secTita, questionNumberOffset } = rec;

        const updateJob = async (patch: Record<string, unknown>) => {
          if (!jobId) return;
          await admin.from("mock_section_jobs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", jobId);
        };

        await updateJob({ status: "processing", current_step: "Calling AI…", attempts: 1 });

        // Derive sensible questions_per_set defaults if not provided in the plan.
        const setsForSec = category === "full_length" ? Math.max(0, Number(sec.sets || 0)) : 0;
        let questionsPerSet = 0;
        if (setsForSec > 0) {
          if (sectionFamily(sec.code) === "verbal") questionsPerSet = Math.min(5, Math.max(3, Math.floor(sec.questions / setsForSec)));
          else if (sectionFamily(sec.code) === "logic-data") questionsPerSet = Math.min(6, Math.max(4, Math.floor(sec.questions / setsForSec)));
          else questionsPerSet = Math.max(1, Math.floor(sec.questions / setsForSec));
        }

        let produced = 0;
        let attemptsLocal = 0;
        const maxAttempts = Math.ceil(sec.questions / BATCH_SIZE) + 4;
        const accepted: any[] = [];

        try {
          while (produced < sec.questions && attemptsLocal < maxAttempts) {
            attemptsLocal++;
            const remain = sec.questions - produced;
            const setBoundTotal = setsForSec > 0 ? Math.min(sec.questions, setsForSec * questionsPerSet) : 0;
            const generatingSharedSet = setsForSec > 0 && produced < setBoundTotal;
            // Generate one RC/DILR set per AI call. Asking for a whole full-length section in one call
            // was too large and caused partial output / stalled jobs.
            const batch = generatingSharedSet
              ? Math.min(questionsPerSet, setBoundTotal - produced)
              : Math.min(BATCH_SIZE, remain);
            const remainMcq = Math.max(0, secMcq - accepted.filter(q => q.question_type === "mcq").length);
            const remainTita = Math.max(0, secTita - accepted.filter(q => q.question_type === "tita").length);
            const batchMcq = Math.min(remainMcq, Math.ceil(batch * (remainMcq / Math.max(1, remainMcq + remainTita))));
            const batchTita = batch - batchMcq;

            await updateJob({ current_step: `Batch ${attemptsLocal}: requesting ${batch} questions…` });

            let qs: any[] = [];
            try {
              qs = await callOpenAIBatch({
                exam: exam_code, exam_full: profile.full_name,
                category, level,
                section_code: sec.code, section_name: sec.name,
                count: batch, mcq: batchMcq, tita: batchTita,
                positive: profile.default_positive, negative: profile.default_negative,
                userId: user.id,
                strict_topic: category === "topic" && topic ? topic : null,
                sets: generatingSharedSet ? 1 : 0,
                questions_per_set: generatingSharedSet ? batch : null,
                total_section_questions: batch,
              });
            } catch (e) {
              console.error(`[generate] ${sec.code} batch ${attemptsLocal} failed:`, e);
              await updateJob({ current_step: `Batch ${attemptsLocal} failed, retrying…`, error_message: String((e as Error)?.message || e).slice(0, 500) });
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

            // Update progress after each batch — this is what animates the UI.
            await updateJob({
              questions_done: produced,
              current_step: `Generated ${produced}/${sec.questions}`,
            });
          }

          // Persist accepted questions + options
          for (let i = 0; i < accepted.length; i++) {
            const q = accepted[i];
            const isTita = q.question_type === "tita";
            const { data: qRow, error: qErr } = await admin.from("mock_questions").insert({
              section_id: secRowId,
              question_number: questionNumberOffset + i + 1,
              question_type: isTita ? "tita" : "mcq",
              question_html: q.question_html,
              tita_correct_answers: isTita ? (q.tita_answers || []).map(String) : [],
              tita_numeric_tolerance: isTita ? Number(q.tita_tolerance ?? 0) : null,
              positive_marks: profile.default_positive,
              negative_marks: isTita ? 0 : profile.default_negative,
                difficulty: normalizeDifficulty(q.difficulty, level),
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
                await admin.from("mock_questions").delete().eq("id", qRow.id);
                continue;
              }
            }
            stats.generated++;
          }

          await updateJob({
            status: produced >= sec.questions ? "completed" : "failed",
            questions_done: produced,
            current_step: produced >= sec.questions ? `Done — ${produced} questions saved` : `Incomplete — ${produced}/${sec.questions} saved`,
            error_message: produced >= sec.questions ? null : `Only ${produced} of ${sec.questions} questions generated`,
          });
        } catch (sectionErr) {
          const msg = (sectionErr as Error)?.message || String(sectionErr);
          console.error(`[generate] section ${sec.code} fatal:`, msg);
          await updateJob({
            status: "failed",
            error_message: msg.slice(0, 500),
            current_step: "Failed",
          });
        }
      }));

      createdTests.push(testRow);
    }

    if (genId) {
      const expectedTotal = safePerSet * setsCount;
      const completedAll = stats.generated >= expectedTotal;
      await admin.from("ai_mock_generations").update({
        status: completedAll ? "completed" : "failed",
        total_generated: stats.generated,
        total_rejected_duplicate: stats.rejected_dup_db,
        total_rejected_web_match: stats.rejected_dup_internet,
        error_message: completedAll ? null : `Incomplete generation: ${stats.generated}/${expectedTotal} questions saved`,
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
