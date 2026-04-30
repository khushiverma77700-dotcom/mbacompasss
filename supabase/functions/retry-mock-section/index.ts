// Resume / retry a single mock_section_jobs row that got stuck or failed.
// Marks the job as pending → re-invokes the generation worker for just that section.
//
// Invoked from the admin progress panel "Retry section" button.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Strip embedded "Q1.", "Set 1:", "(A)" etc. — UI shows these as static labels.
const Q_PREFIX_PATTERNS: RegExp[] = [
  /^\s*Q\.?\s*\d+\s*[.\):\-]?\s*/i,
  /^\s*Question\s*\d*\s*[.\):\-]?\s*/i,
  /^\s*Set\s*\d+\s*[.\):\-]?\s*/i,
  /^\s*\(?\d+\)?\s*[.\):\-]\s*/,
];
const OPT_PREFIX_PATTERNS: RegExp[] = [
  /^\s*\(?\s*[A-Da-d1-4]\s*\)?\s*[.\):\-]\s*/,
];
function stripPrefixes(html: string | null | undefined, patterns: RegExp[]): string {
  if (!html) return html ?? "";
  return html.replace(/^(\s*(?:<[^>]+>\s*)*)([\s\S]*?)(<|$)/, (_m, lead, body, tail) => {
    let next = body;
    let changed = true;
    let safety = 5;
    while (changed && safety-- > 0) {
      changed = false;
      for (const re of patterns) {
        const r = next.replace(re, "");
        if (r !== next) { next = r; changed = true; }
      }
    }
    return lead + next + tail;
  });
}
const cleanQuestionHtml = (h: string | null | undefined) => stripPrefixes(h, Q_PREFIX_PATTERNS);
const cleanOptionHtml = (h: string | null | undefined) => stripPrefixes(h, OPT_PREFIX_PATTERNS);

const OPENAI_TIMEOUT_MS = 180_000;
const BATCH_SIZE = 1;
// We never give up early. The worker keeps re-invoking itself until either
// the section reaches its target or the watchdog cancels it after hours.
const MAX_ATTEMPTS_PER_QUESTION = 200;

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
  if (["hard", "difficult", "advanced", "high", "very_hard", "very hard", "extremely_hard", "extremely hard", "cat_pyq", "cat pyq", "cat-level", "cat_level"].includes(raw)) return "hard";
  return "medium";
}

function levelGuidanceText(level: string): string {
  const lvl = String(level || "mixed").toLowerCase();
  if (lvl === "very_hard") return `DIFFICULTY = VERY HARD (CAT 95+ percentile band). FORBIDDEN: single-step formula plug-ins, definition recall, basic percentage/ratio sums, simple syllogisms, two-line LR puzzles, vocabulary-only RC. EVERY question must require 3-5 non-obvious reasoning steps and take a 99-percentiler 2.5-3.5 minutes. Quant: fuse 2+ concepts (number theory + combinatorics, geometry + coordinate, etc.); use parametric conditions, max/min over constraints, modular arithmetic. VARC: inference questions with subtle scope traps; 6-sentence parajumbles. DILR: caselets with 3+ branching constraints. All distractors must reflect common student errors. If solvable in <90s by a 90-percentile student, REWRITE. Set "difficulty" to "hard".`;
  if (lvl === "extremely_hard") return `DIFFICULTY = EXTREMELY HARD (CAT 99.5+ percentile / Olympiad-adjacent). The hardest 2-3 questions of an entire CAT paper. MANDATORY: each Quant fuses 3+ topics or needs a non-standard insight (telescoping, AM-GM, pigeonhole, invariants, clever substitution). DILR caselets need dense data (6+×5+ tables or multi-layered constraints) with 4-6 deductive steps. VARC hinges on a single subtle word/scope shift. Solve time 3.5-5 min. All 4 options plausible; 2+ deep traps. NO formula recall, NO single-concept items. Set "difficulty" to "hard".`;
  if (lvl === "cat_pyq") return `DIFFICULTY = CAT PYQ-MIRROR. Internally pick a real CAT/XAT/IIFT 2015-2024 PYQ matching the section/topic, then REWRITE with all names, numbers, entities and units changed — preserve EXACT logical structure, concept fusion, trap pattern and difficulty (LOD 3) of the source PYQ. Never reproduce originals verbatim. Never mention "CAT/PYQ/previous year". Distractors must mirror the original's wrong-answer logic. Solve time 2.5-4 min. If the rewrite ends up easier than the source, pick a harder PYQ. Set "difficulty" to "hard".`;
  return `Difficulty target: ${lvl}.`;
}

function normalizeForHash(s: string): string {
  return (s || "").toLowerCase().replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function loadExistingQuestionHashes(admin: any): Promise<Set<string>> {
  const seen = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("mock_questions")
      .select("content_hash, question_html")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not load existing question hashes: ${error.message}`);
    for (const row of data || []) {
      if ((row as any).content_hash) seen.add((row as any).content_hash);
      else if ((row as any).question_html) seen.add(await sha256(normalizeForHash((row as any).question_html)));
    }
    if (!data || data.length < pageSize) break;
  }
  return seen;
}

// Section-scoped corpus used for similarity / paraphrase rejection.
// Keeping it section-local (instead of the entire bank) keeps the math cheap
// while still catching the most common AI repetition patterns.
async function loadSectionCorpus(admin: any, sectionId: string): Promise<{ tokens: Set<string>[]; shingles: Set<string>[] }> {
  const tokens: Set<string>[] = [];
  const shingles: Set<string>[] = [];
  const { data } = await admin
    .from("mock_questions")
    .select("question_html")
    .eq("section_id", sectionId)
    .limit(2000);
  for (const row of data || []) {
    const norm = normalizeForHash((row as any).question_html || "");
    tokens.push(tokenize(norm));
    shingles.push(buildShingles(norm, 5));
  }
  return { tokens, shingles };
}

function tokenize(text: string): Set<string> {
  return new Set(text.split(/\s+/).filter((t) => t.length > 2));
}

function buildShingles(text: string, n: number): Set<string> {
  const words = text.split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  if (words.length < n) {
    if (words.length) out.add(words.join(" "));
    return out;
  }
  for (let i = 0; i <= words.length - n; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const SIM_THRESHOLD = 0.72;        // token Jaccard
const PARAPHRASE_THRESHOLD = 0.35; // 5-word shingle Jaccard

const EXAM_BASELINE: Record<string, string> = {
  CAT: "HIGH baseline (CAT 85-95 percentile difficulty). Elegant single-insight questions, RC-heavy VARC, dense DILR caselets, arithmetic-heavy QA. No GK.",
  XAT: "VERY HIGH baseline — HARDER than CAT. Verbose passages, ethical Decision Making dilemmas with no single right answer, harder Modern Math + Geometry. GK section, no negative on GK.",
  SNAP: "EASY-TO-MODERATE baseline but EXTREMELY TIME-PRESSURED (~1 min/question). Direct calculations, classic LR puzzles, short RCs (250-350 words). Reward speed over depth.",
  NMAT: "MODERATE baseline with strong SPEED FOCUS. NO negative marking. Direct questions, less trap-laden than CAT. RC ~300-400 words. Arithmetic + basic algebra QA.",
  IIFT: "HIGH baseline. CAT-level Quant + heavy multi-table DI + real GK section (current affairs, business, sports). Variable marking by section.",
  CMAT: "MODERATE baseline (closer to NMAT). Broader syllabus including Innovation & Entrepreneurship (Indian startups, business jargon, government schemes) and General Awareness.",
  MAT: "EASY-TO-MODERATE baseline. Direct, formula-based, low-trap. Includes Indian & Global Environment (current affairs + static GK).",
};

function buildExamCalibration(examCode: string, level: string): string {
  const code = String(examCode || "").toUpperCase();
  const baseline = EXAM_BASELINE[code];
  if (!baseline) return "";
  const lvl = String(level || "").toLowerCase();
  let cal = "";
  if (lvl === "easy") cal = `Easier than ${code} baseline but still ${code}-style.`;
  else if (lvl === "medium" || lvl === "moderate") cal = `MATCHES actual ${code} exam baseline.`;
  else if (lvl === "hard") cal = `Slightly above ${code} baseline.`;
  else if (["very_hard", "extremely_hard", "cat_pyq"].includes(lvl)) cal = `Significantly above ${code} baseline (top 1-2% hardest), still ${code}-style and in-syllabus.`;
  return ` EXAM BLUEPRINT — ${code}: ${baseline} EXAM-NORMALIZED DIFFICULTY: ${cal} Difficulty is RELATIVE to ${code}, never absolute. The mock must feel indistinguishable from a real ${code} paper.`;
}

async function callOpenAIBatch(opts: {
  exam_code: string; section_name: string; section_code: string;
  count: number; mcq: number; tita: number; level: string;
  positive: number; negative: number; topic?: string | null;
  // ----- set mode -----
  set_mode?: boolean;            // true ⇒ produce ONE passage + `count` tied questions
  set_kind?: "rc" | "caselet" | "shared"; // verbal RC vs DI/LR caselet vs generic
  set_label?: string;            // e.g. "Set 1 of 3"
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const mathRules = `MATH FORMATTING — CRITICAL: ALL math notation MUST be wrapped in LaTeX delimiters so the renderer can typeset it. Use $...$ for inline math and $$...$$ for block math. Examples:
- powers: write $x^2$ NOT x² or x^2 in plain text
- subscripts: $a_n$ NOT a_n
- fractions: $\\frac{a}{b}$ NOT a/b when displayed as a fraction
- square roots: $\\sqrt{3}$ NOT √3
- summations: $\\sum_{i=1}^{n} i$
- inequalities: $x \\leq 5$, $a \\neq b$
- Greek letters: $\\alpha, \\beta, \\pi, \\theta$
- log/trig: $\\log_2 8$, $\\sin\\theta$
- multiplication dot: $a \\cdot b$
- ANY equation, expression, variable with operators, or formula MUST be inside $...$.
Plain integer counts and percentages used in prose (e.g. "3 students", "20%") do NOT need LaTeX.`;

  const formatRules = `STRICT FORMATTING — the UI renders question number, set badge and option letters as STATIC labels:
- "question_html" must contain ONLY the pure question text. NEVER prefix with "Q1.", "Question 1:", "Set 1:", "1.", "1)" or any numbering.
- "options[].text" must contain ONLY pure option text. NEVER prefix with "A)", "(A)", "A.", "1)" or any label.`;

  let sys: string; let user: string;

  if (opts.set_mode) {
    const ctxLabel = opts.set_kind === "rc"
      ? "an original Reading Comprehension passage of 500-700 words on an abstract / philosophical / social-science / business / economics theme"
      : opts.set_kind === "caselet"
        ? "an original DI/LR caselet with FULLY DETAILED DATA — include a properly formatted HTML <table> (rows × columns with concrete numbers/names) AND/OR an inline ASCII bar/line chart inside <pre> tags. Caselets must contain rich data such as sales figures, rankings, percentage shares, time series, tournament results, seating arrangements, family trees, blood relations, etc."
        : "an original shared-context block";
    sys = `You are an elite ${opts.exam_code} question setter writing a SET of ${opts.count} questions tied to ONE shared ${opts.set_kind === "rc" ? "passage" : "caselet"}.${buildExamCalibration(opts.exam_code, opts.level)} ${levelGuidanceText(opts.level)} ${opts.topic ? `Topic lock: ${opts.topic}.` : ""} ${mathRules} ${formatRules} Output ONLY valid JSON.`;
    user = `Write ${ctxLabel}, then ${opts.count} questions ALL tied to that shared context. Use FRESH original content; do NOT reuse any famous passage / caselet. Each MCQ has 4 options A-D with one correct; include a 200-400 word explanation per question. JSON shape: {"passage_html":"<div>...full passage or caselet HTML here, with tables/charts if applicable...</div>","questions":[{"question_type":"mcq","question_html":"<question stem only — DO NOT include the passage>","topic":"...","subtopic":"...","difficulty":"easy|medium|hard","options":[{"label":"A","text":"...","is_correct":true|false},...],"explanation_html":"..."}]}`;
  } else {
    sys = `You are an elite ${opts.exam_code} question setter writing 100% original questions for the ${opts.section_name} (${opts.section_code}) section.${buildExamCalibration(opts.exam_code, opts.level)} ${levelGuidanceText(opts.level)} ${opts.topic ? `Topic lock: ${opts.topic}.` : ""} Use fresh numbers, fresh names, fresh contexts. Each MCQ has 4 options A-D with one correct; each TITA has numeric answer(s). Include detailed 200-400 word explanations. ${mathRules} ${formatRules} Output ONLY valid JSON.`;
    user = `Generate exactly ${opts.count} questions: ${opts.mcq} MCQ + ${opts.tita} TITA. Marking +${opts.positive}/-${opts.negative}. JSON shape: {"questions":[{"question_type":"mcq"|"tita","question_html":"...","topic":"...","subtopic":"...","difficulty":"easy|medium|hard","options":[{"label":"A","text":"...","is_correct":true|false},...],"tita_answers":["..."],"tita_tolerance":0.01,"explanation_html":"..."}]}`;
  }

  const lvlLower = String(opts.level || "").toLowerCase();
  const isHardVariant = ["very_hard", "extremely_hard", "cat_pyq"].includes(lvlLower);
  const modelId = "gpt-4o";
  const temp = lvlLower === "cat_pyq" ? 0.55 : isHardVariant ? 0.45 : 0.4;
  const reqBody: Record<string, unknown> = {
    model: modelId,
    messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    response_format: { type: "json_object" },
  };
  if (modelId === "gpt-5") {
    reqBody.max_completion_tokens = 16000;
  } else {
    reqBody.max_tokens = 16000;
    reqBody.temperature = temp;
  }

  // Inline retry with exponential backoff for transient errors (429 / 5xx).
  const MAX_INLINE_RETRIES = 4;
  let resp: Response | null = null;
  let lastErr: string | null = null;
  for (let attempt = 1; attempt <= MAX_INLINE_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), OPENAI_TIMEOUT_MS);
    try {
      resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (resp.ok) break;
      if ([408, 425, 429, 500, 502, 503, 504].includes(resp.status) && attempt < MAX_INLINE_RETRIES) {
        const txt = await resp.text();
        lastErr = `AI ${resp.status}: ${txt.slice(0, 200)}`;
        console.warn(`[retry-mock-section] transient ${resp.status}, retry ${attempt}/${MAX_INLINE_RETRIES - 1}`);
        const backoff = Math.min(8000, 1000 * Math.pow(2, attempt - 1)) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, backoff));
        resp = null;
        continue;
      }
      throw new Error(`AI ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    } catch (e) {
      clearTimeout(timer);
      const msg = (e as Error)?.name === "AbortError" ? `OpenAI aborted after ${OPENAI_TIMEOUT_MS}ms` : `OpenAI fetch failed: ${(e as Error)?.message || e}`;
      lastErr = msg;
      if (attempt < MAX_INLINE_RETRIES) {
        const backoff = Math.min(8000, 1000 * Math.pow(2, attempt - 1)) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, backoff));
        resp = null;
        continue;
      }
      throw new Error(msg);
    }
  }
  if (!resp || !resp.ok) throw new Error(lastErr || "AI call failed after retries");
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  if (opts.set_mode) {
    return {
      passage_html: typeof parsed?.passage_html === "string" ? parsed.passage_html : "",
      questions: Array.isArray(parsed?.questions) ? parsed.questions : [],
    };
  }
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
    const bearerToken = authHeader.slice("Bearer ".length).trim();

    const admin = createClient(url, serviceKey);

    // Two valid auth modes:
    //  1) Service-role token (background self-recursion / kickoff from generate-mock-questions)
    //  2) End-user JWT (admin clicked "Retry section")
    let userId: string | null = null;
    const isServiceCall = bearerToken === serviceKey;
    if (!isServiceCall) {
      const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userRes } = await userClient.auth.getUser();
      const user = userRes?.user;
      if (!user) return jsonResp(401, { error: "Invalid auth" });
      const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) return jsonResp(403, { error: "Admin role required" });
      userId = user.id;
    }

    const { job_id, auto = false } = await req.json();
    if (!job_id) return jsonResp(400, { error: "job_id required" });

    const { data: job, error: jobErr } = await admin.from("mock_section_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) return jsonResp(404, { error: "Job not found" });

    if (!userId) userId = job.created_by;

    // Re-arm the job and grab a worker lock so the watchdog can recover us if we die.
    await admin.from("mock_section_jobs").update({
      status: "processing",
      current_step: "Restart requested — re-calling AI…",
      error_message: null,
      attempts: auto ? (job.attempts || 0) : (job.attempts || 0) + 1,
      worker_lock_until: new Date(Date.now() + 8 * 60_000).toISOString(),
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

        const seen = await loadExistingQuestionHashes(admin);
        const corpus = await loadSectionCorpus(admin, job.section_id);

        // Persisted dedup counters — preserve any value already on the row.
        let dupHash = job.dup_hash || 0;
        let dupSimilarity = job.dup_similarity || 0;
        let dupParaphrase = job.dup_paraphrase || 0;
        let dupDb = job.dup_db_conflict || 0;
        let rejectedInvalid = job.rejected_invalid || 0;

        let attempts = 0;
        const maxAttempts = Math.max(20, (target - produced) * MAX_ATTEMPTS_PER_QUESTION);

        // Mirror to Personalized Hub ONLY if the parent test is Daily/sectional/topic.
        // Look up parent test_type via section → test.
        let allowHubMirror = false;
        try {
          const { data: secRow } = await admin.from("mock_sections").select("test_id").eq("id", job.section_id).maybeSingle();
          if (secRow?.test_id) {
            const { data: tRow } = await admin.from("mock_tests").select("test_type, category").eq("id", secRow.test_id).maybeSingle();
            const tt = String((tRow as any)?.test_type || "").toLowerCase();
            const cat = String((tRow as any)?.category || "").toLowerCase();
            allowHubMirror = tt === "daily" || tt === "sectional" || tt === "topic" || cat === "daily" || cat === "sectional" || cat === "topic";
          }
        } catch { /* default false */ }
        const hubSection = allowHubMirror ? (PERSONALIZED_SECTION_MAP[job.exam_code] || {})[job.section_code] : undefined;

        while (produced < target && attempts < maxAttempts) {
          attempts++;
          const remain = target - produced;
          const batch = 1;
          const remainTita = Math.max(0, (job.tita_count || 0) - produced);
          const batchTita = remainTita > 0 && remain <= remainTita ? 1 : 0;
          const batchMcq = batch - batchTita;

          await admin.from("mock_section_jobs").update({
            current_step: `Writing question ${produced + 1}/${target} — uniqueness check active…`,
            worker_lock_until: new Date(Date.now() + 8 * 60_000).toISOString(),
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
            if (!q?.question_html) { rejectedInvalid++; continue; }
            const norm = normalizeForHash(q.question_html);
            const hash = await sha256(norm);

            // Reason 1 — exact hash collision against the entire bank
            if (seen.has(hash)) { dupHash++; continue; }

            // Reason 2 — high token Jaccard against any question in this section
            const candTokens = tokenize(norm);
            let maxSim = 0;
            for (const t of corpus.tokens) {
              const s = jaccard(candTokens, t);
              if (s > maxSim) maxSim = s;
              if (maxSim >= SIM_THRESHOLD) break;
            }
            if (maxSim >= SIM_THRESHOLD) { dupSimilarity++; continue; }

            // Reason 3 — near-paraphrase: 5-word shingle overlap
            const candShingles = buildShingles(norm, 5);
            let maxShingle = 0;
            for (const sh of corpus.shingles) {
              const s = jaccard(candShingles, sh);
              if (s > maxShingle) maxShingle = s;
              if (maxShingle >= PARAPHRASE_THRESHOLD) break;
            }
            if (maxShingle >= PARAPHRASE_THRESHOLD) { dupParaphrase++; continue; }

            seen.add(hash);
            corpus.tokens.push(candTokens);
            corpus.shingles.push(candShingles);

            const isTita = q.question_type === "tita";
            const cleanedQHtml = cleanQuestionHtml(q.question_html);
            const { data: qRow, error: insErr } = await admin.from("mock_questions").insert({
              section_id: job.section_id,
              question_number: produced + 1,
              question_type: isTita ? "tita" : "mcq",
              question_html: cleanedQHtml,
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
            if (insErr) { dupDb++; continue; }
            if (!qRow) { rejectedInvalid++; continue; }

            if (!isTita && Array.isArray(q.options)) {
              const opts = q.options.slice(0, 4).map((o: any, idx: number) => ({
                question_id: qRow.id,
                option_label: o.label || ["A","B","C","D"][idx],
                option_html: cleanOptionHtml(o.text || ""),
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
                    question_text: cleanedQHtml,
                    options: opts.map((o) => ({ label: o.option_label, text: o.option_html })),
                    correct_index: correctIdx >= 0 ? correctIdx : 0,
                    explanation: q.explanation_html || null,
                    topic: q.topic || job.topic || null,
                    source: "mock-mirror-retry",
                    created_by: userId,
                  });
                }
              } else {
                await admin.from("mock_questions").delete().eq("id", qRow.id);
                rejectedInvalid++;
                continue;
              }
            }
            produced++;
          }

          if (hubRows.length > 0) {
            await admin.from("personalized_questions").insert(hubRows);
          }

          const totalDup = dupHash + dupSimilarity + dupParaphrase + dupDb;
          await admin.from("mock_section_jobs").update({
            questions_done: produced,
            current_step: `Generated ${produced}/${target}`,
            duplicates_rejected: totalDup,
            dup_hash: dupHash,
            dup_similarity: dupSimilarity,
            dup_paraphrase: dupParaphrase,
            dup_db_conflict: dupDb,
            rejected_invalid: rejectedInvalid,
            worker_lock_until: new Date(Date.now() + 8 * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", job_id);

          if (auto && produced < target) {
            const workerUrl = `${url}/functions/v1/retry-mock-section`;
            // ALWAYS use service-role for self-recursion so we don't depend on
            // the (possibly expired) end-user JWT. Never forward `authHeader`.
            const next = fetch(workerUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                apikey: serviceKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ job_id, auto: true, service: true }),
            }).catch((e) => console.error("[retry-mock-section] next worker failed", e));
            // @ts-ignore
            if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(next);
            return;
          }
        }

        const success = produced === target;
        const totalDup = dupHash + dupSimilarity + dupParaphrase + dupDb;
        const finalReason = success
          ? `Saved exactly ${produced}/${target} questions. Rejected ${totalDup} duplicates (${dupHash} hash, ${dupSimilarity} similarity, ${dupParaphrase} paraphrase, ${dupDb} db) and ${rejectedInvalid} invalid candidates across ${attempts} AI calls.`
          : `Saved only ${produced}/${target} after ${attempts} AI calls. Rejected ${totalDup} duplicates (${dupHash} hash, ${dupSimilarity} similarity, ${dupParaphrase} paraphrase, ${dupDb} db) and ${rejectedInvalid} invalid candidates.`;
        await admin.from("mock_section_jobs").update({
          status: success ? "completed" : "failed",
          questions_done: produced,
          duplicates_rejected: totalDup,
          dup_hash: dupHash,
          dup_similarity: dupSimilarity,
          dup_paraphrase: dupParaphrase,
          dup_db_conflict: dupDb,
          rejected_invalid: rejectedInvalid,
          final_reason: finalReason,
          current_step: success ? `Done — exactly ${produced} questions saved` : `Incomplete — ${produced}/${target}`,
          error_message: success ? null : `Only ${produced} of ${target} after retry`,
          worker_lock_until: null,
          updated_at: new Date().toISOString(),
        }).eq("id", job_id);

        // Chain to the next pending sibling section in the same generation.
        if (job.generation_id) {
          const { data: siblings } = await admin
            .from("mock_section_jobs")
            .select("id")
            .eq("generation_id", job.generation_id)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);
          const nextJobId = siblings?.[0]?.id;
          if (nextJobId) {
            await admin.from("mock_section_jobs").update({
              status: "processing",
              current_step: "Queued reliable one-question worker…",
              worker_lock_until: new Date(Date.now() + 8 * 60_000).toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", nextJobId);
            const workerUrl = `${url}/functions/v1/retry-mock-section`;
            const next = fetch(workerUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                apikey: serviceKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ job_id: nextJobId, auto: true, service: true }),
            }).catch((e) => console.error("[retry-mock-section] sibling kickoff failed", e));
            // @ts-ignore
            if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(next);
          }
        }
      } catch (e) {
        await admin.from("mock_section_jobs").update({
          status: "failed",
          error_message: String((e as Error)?.message || e).slice(0, 500),
          current_step: "Retry failed",
          worker_lock_until: null,
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
