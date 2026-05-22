// AI Mock Question Generator
// - Calls OpenAI via the configured OPENAI_API_KEY with structured JSON output
// - De-duplicates against existing mock_questions via SHA-256 content_hash
// - Optionally verifies uniqueness via Firecrawl web search
// - Persists sections + questions + options into the target mock_test
//
// Auth: admin only (verifies JWT in code; verify_jwt = false in config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { getCredential } from "../_shared/getCredential.ts";

// Service-role admin client used for fire-and-forget telemetry writes.
const _telemetryAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface AIUsageRecord {
  feature: string;
  model?: string | null;
  provider?: string | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost?: number;
  latency_ms?: number;
  status?: "success" | "error";
  error_message?: string | null;
  user_id?: string | null;
}

function logAIUsage(rec: AIUsageRecord) {
  try {
    _telemetryAdmin.from("ai_usage_logs").insert({
      feature: rec.feature,
      model: rec.model ?? null,
      provider: rec.provider ?? null,
      prompt_tokens: rec.prompt_tokens ?? 0,
      completion_tokens: rec.completion_tokens ?? 0,
      total_tokens: rec.total_tokens ?? 0,
      estimated_cost: rec.estimated_cost ?? 0,
      latency_ms: rec.latency_ms ?? null,
      status: rec.status ?? "success",
      error_message: rec.error_message ?? null,
      user_id: rec.user_id ?? null,
    }).then(({ error }) => {
      if (error) console.warn("[logAIUsage] insert failed", error.message);
    });
  } catch (e) {
    console.warn("[logAIUsage] threw", (e as Error)?.message);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --------- Question / Option text sanitizers ---------
// UI renders question number, set badge and A/B/C/D labels as STATIC chips.
// Stored HTML must contain only the pure question/option text.
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

const BATCH_SIZE = 5; // optimized: generate 5 questions per AI call to reduce prompt overhead ~80%
const OPENAI_TIMEOUT_MS = 90_000;       // tighter timeout; batched calls return faster than single ones in practice
const FIRECRAWL_TIMEOUT_MS = 6_000;     // single web-check hard timeout
const MAX_FIRECRAWL_CHECKS_PER_SECTION = 4; // cap web-checks tightly to avoid stalls
const MAX_ATTEMPTS_PER_QUESTION = 60;   // no wall-clock cutoff; retry enough times to hit exact count

// Map mock_section.code (e.g. "DILR") + exam to the personalized_questions catalog
// Uses src/data/personalizedExams.ts vocabulary so the admin hub counter picks it up.
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

// --------- Helpers ---------

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  if (["hard", "difficult", "advanced", "high", "very_hard", "very hard", "extremely_hard", "extremely hard", "cat_pyq", "cat pyq", "cat-level", "cat_level"].includes(raw)) return "hard";
  return "medium";
}

// ============================================================================
// EXAM BLUEPRINTS — official pattern, timing, marking, section traits
// Difficulty is normalized RELATIVE to each exam's baseline (CAT High,
// XAT > CAT, SNAP easier but speed-pressured, NMAT moderate + speed, etc.)
// ============================================================================
const EXAM_BLUEPRINTS: Record<string, {
  full: string;
  baselineDifficulty: string;   // exam's natural baseline (what "Medium" maps to)
  totalQuestions: number;
  totalDuration: number;        // minutes
  sectionalTiming: boolean;
  marking: string;
  sections: string;             // section-wise distribution + traits
  styleNotes: string;           // exam-specific tone & quirks
}> = {
  CAT: {
    full: "Common Admission Test",
    baselineDifficulty: "HIGH (CAT 85-95 percentile difficulty as the natural baseline)",
    totalQuestions: 66,
    totalDuration: 120,
    sectionalTiming: true,
    marking: "+3 correct, -1 wrong for MCQ; +3/0 for TITA (no negative)",
    sections: "VARC 24Q/40min (RC-heavy: 4 RCs × 4Q + 8 standalone — parajumbles, para-summary, odd-one-out); DILR 22Q/40min (4 sets × 5-6Q each, dense data + multi-step deduction); QA 22Q/40min (Arithmetic-heavy ~40%, Algebra ~25%, Geometry ~15%, Number Systems/Modern Math ~20%; ~8 TITA)",
    styleNotes: "CAT favors elegant single-insight questions over heavy calculation. RC passages 500-700 words on abstract/philosophical/social-science themes. DILR caselets reward case enumeration and constraint logic. Avoid GK and current affairs entirely.",
  },
  XAT: {
    full: "Xavier Aptitude Test",
    baselineDifficulty: "VERY HIGH (HARDER than CAT — denser language, ethical dilemmas, tougher Decision Making)",
    totalQuestions: 100,
    totalDuration: 180,
    sectionalTiming: false,
    marking: "+1 correct, -0.25 wrong; -0.10 for un-attempted beyond 8; GK no negative",
    sections: "VALR 26Q (Verbal+Logical with critical reasoning, dense RC); DM 21Q (Decision Making — UNIQUE to XAT: ethical/business case-lets, no single 'right' answer, must pick BEST option); QA+DI 28Q (Quant + heavy DI, harder than CAT QA); GK 25Q (separate, no negative)",
    styleNotes: "XAT is famously verbose — long passages, layered conditions, ambiguous phrasing. Decision Making must present a stakeholder dilemma with 4-5 plausible actions and demand judgment, not calculation. QA leans Modern Math + Geometry harder than CAT.",
  },
  SNAP: {
    full: "Symbiosis National Aptitude Test",
    baselineDifficulty: "EASY-TO-MODERATE absolute, but EXTREMELY TIME-PRESSURED (60 min for 60Q ≈ 1 min/question)",
    totalQuestions: 60,
    totalDuration: 60,
    sectionalTiming: false,
    marking: "+1 correct, -0.25 wrong",
    sections: "GE 15Q (General English — vocab, grammar, short RC, idioms); QADS 20Q (Quant + DI + DS — easier than CAT but high volume); AR 25Q (Analytical & Logical Reasoning — puzzles, arrangements, syllogism, coding-decoding)",
    styleNotes: "SNAP rewards SPEED over depth. Questions are individually solvable but the volume crushes most aspirants. Use shorter stems, direct calculations, classic LR puzzles. NO long RCs (250-350 words max).",
  },
  NMAT: {
    full: "NMAT by GMAC",
    baselineDifficulty: "MODERATE with strong SPEED FOCUS (108Q in 120min, no negative marking, adaptive feel)",
    totalQuestions: 108,
    totalDuration: 120,
    sectionalTiming: true,
    marking: "+3 correct, 0 wrong (NO NEGATIVE MARKING)",
    sections: "LS 36Q/28min (Language Skills — vocab, grammar, RC); QS 36Q/52min (Quantitative Skills — arithmetic-heavy + DI + DS); LR 36Q/40min (Logical Reasoning — puzzles, syllogism, statement-conclusion)",
    styleNotes: "NMAT is moderate but SPEED-heavy. Questions are fairly direct, less trap-laden than CAT. RC passages ~300-400 words. Quant is arithmetic + basic algebra, not olympiad-style. Distractors are reasonable, not viciously close.",
  },
  IIFT: {
    full: "Indian Institute of Foreign Trade",
    baselineDifficulty: "HIGH (CAT-level Quant + heavy DI + GK component)",
    totalQuestions: 110,
    totalDuration: 120,
    sectionalTiming: false,
    marking: "Variable +1.5/+1.0, -0.5/-0.33 (mixed by section)",
    sections: "VARC 35Q (RC-heavy + vocab, idioms, analogies); QA 25Q (CAT-level arithmetic + algebra + geometry); DILR 30Q (heavy DI with complex tables/charts + LR puzzles); GK 20Q (current affairs, business, sports, awards — UNIQUE)",
    styleNotes: "IIFT has a real GK section — include factual MBA/business/economy questions when GK is requested. DI is the trickiest section: multi-table caselets requiring cross-referencing.",
  },
  CMAT: {
    full: "Common Management Admission Test",
    baselineDifficulty: "MODERATE (easier than CAT/XAT; closer to NMAT difficulty with broader syllabus)",
    totalQuestions: 100,
    totalDuration: 180,
    sectionalTiming: false,
    marking: "+4 correct, -1 wrong",
    sections: "QADI 20Q (Quantitative + DI); LR 20Q (Logical Reasoning); LC 20Q (Language Comprehension); GA 20Q (General Awareness — current affairs + static GK); IE 20Q (Innovation & Entrepreneurship — UNIQUE: startup ecosystem, business terms, Indian entrepreneurs)",
    styleNotes: "CMAT covers wider ground but with shallower depth per topic. IE section needs questions on Indian startups, unicorns, business jargon, government schemes (Startup India, MUDRA, etc.). GA is current-affairs heavy.",
  },
  MAT: {
    full: "Management Aptitude Test",
    baselineDifficulty: "EASY-TO-MODERATE (easiest of the major MBA exams; broad but shallow)",
    totalQuestions: 200,
    totalDuration: 150,
    sectionalTiming: false,
    marking: "+1 correct, -0.25 wrong",
    sections: "LC 40Q (Language Comprehension); MS 40Q (Mathematical Skills — basic arithmetic & algebra); DA 40Q (Data Analysis & Sufficiency); ICR 40Q (Intelligence & Critical Reasoning); IGE 40Q (Indian & Global Environment — current affairs + static GK)",
    styleNotes: "MAT questions are direct, formula-based, low-trap. Avoid CAT-style elegant traps. IGE needs straightforward current-affairs and GK questions on India/world.",
  },
};

function getBlueprint(examCode: string) {
  const code = String(examCode || "").toUpperCase();
  return EXAM_BLUEPRINTS[code] || null;
}

function buildExamCalibrationBlock(examCode: string, level: string, sectionCode: string): string {
  const bp = getBlueprint(examCode);
  if (!bp) return "";
  const lvl = String(level || "").toLowerCase();
  let calibration = "";
  if (lvl === "easy") {
    calibration = `Target difficulty = EASIER than ${examCode}'s natural baseline. Still authentic to ${examCode} style — just at the lower end of what appears in real ${examCode} papers (40-60 percentile difficulty). NOT generic-easy.`;
  } else if (lvl === "medium" || lvl === "moderate") {
    calibration = `Target difficulty = MATCHES the actual ${examCode} exam baseline → ${bp.baselineDifficulty}. This is what a real ${examCode} paper feels like.`;
  } else if (lvl === "hard") {
    calibration = `Target difficulty = SLIGHTLY ABOVE actual ${examCode} baseline. Above ${examCode}'s natural high band but still realistic for that exam.`;
  } else if (["very_hard", "extremely_hard", "cat_pyq"].includes(lvl)) {
    calibration = `Target difficulty = SIGNIFICANTLY ABOVE ${examCode} baseline (top 1-2% hardest questions ever seen in this exam) — but still recognizably ${examCode}-style, never out-of-syllabus or unrealistic.`;
  }
  return `\n\nEXAM BLUEPRINT — ${examCode} (${bp.full}):
- Baseline difficulty: ${bp.baselineDifficulty}
- Real exam pattern: ${bp.totalQuestions}Q in ${bp.totalDuration} min, ${bp.sectionalTiming ? "WITH sectional timing" : "no sectional timing"}
- Marking: ${bp.marking}
- Section structure: ${bp.sections}
- Exam-specific style: ${bp.styleNotes}

EXAM-NORMALIZED DIFFICULTY CALIBRATION:
${calibration}

CRITICAL: Difficulty is RELATIVE to ${examCode}, not absolute. ${examCode} ${lvl.toUpperCase()} ≠ any other exam's ${lvl.toUpperCase()}. The mock must feel indistinguishable from a real ${examCode} paper in pattern, tone, topic distribution and question style. NO out-of-syllabus questions. NO unrealistic difficulty spikes. NO generic content.`;
}

// ── Section scope lock (mirrors retry-mock-section) ──────────────────
const SECTION_SCOPE_GEN: Record<string, Record<string, { allowed: string; forbiddenKeywords: string[] }>> = {
  CAT: {
    VARC: { allowed: "RC, parajumbles, para-summary, odd-one-out, sentence completion, vocab-in-context.", forbiddenKeywords: ["arithmetic", "algebra", "geometry", "number system", "probability", "permutation", "trigonometry", "data interpretation", "caselet", "bar chart", "pie chart", "seating arrangement", "blood relation", "syllogism"] },
    DILR: { allowed: "DI caselets + LR sets (arrangements, distributions, puzzles).", forbiddenKeywords: ["reading comprehension", "parajumble", "vocabulary", "sentence completion", "quadratic equation", "trigonometric identity"] },
    QA: { allowed: "Pure QA — Arithmetic, Algebra, Geometry, Number Systems, Modern Math.", forbiddenKeywords: ["reading comprehension", "parajumble", "vocabulary", "data interpretation caselet", "seating arrangement", "blood relation", "syllogism"] },
  },
  NMAT: {
    LS: { allowed: "Language Skills — vocab, grammar, RC.", forbiddenKeywords: ["arithmetic", "algebra", "geometry", "data interpretation", "syllogism", "seating arrangement"] },
    QS: { allowed: "Quantitative Skills.", forbiddenKeywords: ["reading comprehension", "vocabulary", "parajumble", "syllogism puzzle", "seating arrangement"] },
    LR: { allowed: "Logical Reasoning.", forbiddenKeywords: ["reading comprehension", "vocabulary", "arithmetic word problem", "algebra equation", "geometry"] },
  },
  XAT: {
    VALR: { allowed: "Verbal + Logical Ability.", forbiddenKeywords: ["arithmetic word problem", "algebra equation", "geometry", "data interpretation table"] },
    DM: { allowed: "Decision Making case-lets.", forbiddenKeywords: ["reading comprehension passage", "vocabulary", "arithmetic", "algebra", "geometry", "syllogism"] },
    QADI: { allowed: "Quant + DI.", forbiddenKeywords: ["reading comprehension passage", "vocabulary", "ethical dilemma"] },
    GK: { allowed: "GK + current affairs.", forbiddenKeywords: ["arithmetic", "algebra", "geometry", "reading comprehension passage", "data interpretation chart"] },
  },
  SNAP: {
    GE: { allowed: "General English.", forbiddenKeywords: ["arithmetic", "algebra", "geometry", "data interpretation", "syllogism"] },
    QADS: { allowed: "Quant + DI + DS.", forbiddenKeywords: ["reading comprehension", "vocabulary", "syllogism puzzle", "seating arrangement"] },
    AR: { allowed: "Analytical & Logical Reasoning.", forbiddenKeywords: ["reading comprehension", "vocabulary", "arithmetic word problem", "algebra equation", "geometry"] },
  },
  IIFT: {
    VARC: { allowed: "Verbal + RC.", forbiddenKeywords: ["arithmetic", "algebra equation", "geometry", "data interpretation chart", "current affairs"] },
    QA: { allowed: "Quant.", forbiddenKeywords: ["reading comprehension", "vocabulary", "data interpretation caselet", "current affairs"] },
    DILR: { allowed: "DI + LR.", forbiddenKeywords: ["reading comprehension", "vocabulary", "current affairs"] },
    GK: { allowed: "GK.", forbiddenKeywords: ["arithmetic", "algebra", "geometry", "reading comprehension passage", "data interpretation chart"] },
  },
  CMAT: {
    QADI: { allowed: "Quant + DI.", forbiddenKeywords: ["reading comprehension", "vocabulary", "current affairs", "innovation startup"] },
    LR: { allowed: "Logical Reasoning.", forbiddenKeywords: ["reading comprehension", "vocabulary", "arithmetic word problem", "algebra equation", "geometry", "current affairs", "innovation startup"] },
    LC: { allowed: "Language Comprehension.", forbiddenKeywords: ["arithmetic", "algebra", "geometry", "data interpretation", "current affairs", "innovation startup"] },
    GA: { allowed: "General Awareness.", forbiddenKeywords: ["arithmetic", "algebra equation", "geometry", "reading comprehension passage", "innovation startup"] },
    IE: { allowed: "Innovation & Entrepreneurship.", forbiddenKeywords: ["arithmetic", "algebra equation", "geometry", "reading comprehension passage", "vocabulary"] },
  },
  MAT: {
    LC: { allowed: "Language Comprehension.", forbiddenKeywords: ["arithmetic word problem", "algebra equation", "geometry", "data interpretation", "current affairs"] },
    MS: { allowed: "Mathematical Skills.", forbiddenKeywords: ["reading comprehension", "vocabulary", "current affairs"] },
    DA: { allowed: "Data Analysis & Sufficiency.", forbiddenKeywords: ["reading comprehension", "vocabulary", "current affairs"] },
    ICR: { allowed: "Intelligence & Critical Reasoning.", forbiddenKeywords: ["reading comprehension", "vocabulary", "arithmetic word problem", "geometry", "current affairs"] },
    IGE: { allowed: "Indian & Global Environment.", forbiddenKeywords: ["arithmetic", "algebra equation", "geometry", "reading comprehension passage"] },
  },
};

function buildSectionScopeLockGen(examCode: string, sectionCode: string, sectionName: string): string {
  const ex = String(examCode || "").toUpperCase();
  const sc = String(sectionCode || "").toUpperCase();
  const entry = SECTION_SCOPE_GEN[ex]?.[sc];
  if (!entry) return `STRICT SCOPE LOCK: Every question MUST belong only to the ${sectionName} (${sc}) section's syllabus. Do NOT generate questions from any other section of ${ex}.`;
  return `STRICT SCOPE LOCK — DO NOT VIOLATE: Every question MUST be from the ${sectionName} (${sc}) section of ${ex} ONLY. ALLOWED: ${entry.allowed} FORBIDDEN (these belong to OTHER sections of ${ex}): ${entry.forbiddenKeywords.join(", ")}. If a topic feels like it belongs to another section, write a different in-section topic instead. The "topic" field must reflect a topic of the ${sc} section.`;
}

export function isQuestionInSectionGen(examCode: string, sectionCode: string, questionHtml: string, topic?: string): boolean {
  const ex = String(examCode || "").toUpperCase();
  const sc = String(sectionCode || "").toUpperCase();
  const entry = SECTION_SCOPE_GEN[ex]?.[sc];
  if (!entry) return true;
  const haystack = (String(questionHtml || "") + " " + String(topic || "")).toLowerCase().replace(/<[^>]+>/g, " ");
  for (const kw of entry.forbiddenKeywords) {
    if (haystack.includes(kw.toLowerCase())) return false;
  }
  return true;
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
  const lvl = String(opts.level || "mixed").toLowerCase();
  let levelGuidance: string;
  if (lvl === "mixed") {
    {
      const sc = String(opts.section_code || "").toUpperCase();
      if (["VARC", "VALR", "LS", "GE", "LC"].includes(sc)) {
        levelGuidance = "Mix Easy ~30%, Moderate ~45%, Hard ~25%. Hard items must demand inference / scope-trap elimination, not vocabulary.";
      } else if (["DILR", "LRDI", "DI", "LR", "AR"].includes(sc)) {
        levelGuidance = "Mix Easy ~20%, Moderate ~40%, Hard ~40%. Hard caselets require multi-step constraint logic with dense data tables.";
      } else if (["QA", "QADI", "QADS", "QS", "MS", "DA"].includes(sc)) {
        levelGuidance = "Mix Easy ~25%, Moderate ~40%, Hard ~35%. Hard items must fuse 2+ topics or need a non-obvious insight — NO single-step formula plug-ins, NO trivial percentage/ratio sums, NO direct definition recall.";
      } else {
        levelGuidance = "Mix Easy ~30%, Moderate ~40%, Hard ~30%.";
      }
    }
  } else if (lvl === "very_hard") {
    levelGuidance = `DIFFICULTY = VERY HARD (CAT 95+ percentile band). ABSOLUTELY FORBIDDEN: single-step formula plug-ins, direct definition recall, simple percentage/ratio sums, basic syllogisms, vocabulary-only RC questions, two-line LR puzzles. EVERY question MUST require AT LEAST 3-5 non-obvious reasoning steps and take a 99-percentiler 2.5-3.5 minutes.

MANDATORY CHARACTERISTICS for each question:
- Quant: combine 2+ concepts (e.g. number theory + combinatorics, geometry + coordinate, P&C + probability with conditional cases). Use non-standard variables, parametric conditions, "find all values such that…", quadratic-in-disguise, modular arithmetic, functional equations, max/min over constraints. NO direct TSD/SI/CI plug-ins.
- VARC: RC inference questions where 3 of 4 options are partially supported and require eliminating subtle scope/tone traps; parajumbles with 6 sentences and overlapping cohesion; critical-reasoning style assumption/flaw questions.
- DILR: caselets needing case enumeration with 3+ branching constraints; tournament/seating/scheduling with partial info; data sufficiency style sub-questions.
- All distractors MUST be derived from common student errors (off-by-one, sign flip, missed case, wrong base) — never random.

If the question can be solved in under 90 seconds by a 90-percentile student, it is TOO EASY — discard and rewrite. Set "difficulty" field to exactly "hard".`;
  } else if (lvl === "extremely_hard") {
    levelGuidance = `DIFFICULTY = EXTREMELY HARD (CAT 99.5+ percentile / IIM final-round / Olympiad-adjacent). These must be the HARDEST 2-3 questions of an entire CAT paper.

MANDATORY:
- Each Quant question fuses 3+ topics OR requires a non-standard insight/trick (telescoping, AM-GM, pigeonhole, generating functions, clever substitution, invariants).
- Each DILR caselet has dense data (table of 6+ rows × 5+ columns OR multi-layered constraint set) and requires 4-6 deductive steps before any computation.
- Each VARC question hinges on a single subtle word or logical scope shift; correct answer is defensible only via close textual evidence.
- Solve time for a 99.5-percentiler: 3.5-5 minutes per question.
- All 4 options must be plausible; at least 2 must reflect deep traps.

NO formula recall, NO single-concept questions, NO short LR riddles. If a strong CAT topper can eyeball the answer, REWRITE it. Set "difficulty" to exactly "hard".`;
  } else if (lvl === "cat_pyq") {
    levelGuidance = `DIFFICULTY = CAT PYQ-MIRROR. Internally pick a real CAT/XAT/IIFT Previous Year Question (2015-2024 slot) that matches the section/topic, then REWRITE it by changing ALL names, numbers, entities, units and surface context — but preserve the EXACT logical structure, concept fusion, trap pattern and difficulty band of the original PYQ.

RULES:
- Do NOT reproduce original numbers, names, or phrasing verbatim.
- Do NOT mention "CAT 2019" / "PYQ" / "previous year" anywhere in question or explanation.
- The skeleton (what is given, what is asked, the trap) must be authentically PYQ-grade.
- Difficulty band: hard CAT slot questions (LOD 3). Solve time 2.5-4 min.
- Distractors must mirror the original PYQ's distractor logic (common error → wrong option).

If the rewritten question is materially easier than the source PYQ, discard and pick a harder PYQ. Set "difficulty" to exactly "hard".`;
  } else {
    levelGuidance = `Strictly target ${normalizeDifficulty(null, opts.level).toUpperCase()} difficulty. Every returned question difficulty must be exactly "${normalizeDifficulty(null, opts.level)}".`;
  }

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

  const examCalibration = buildExamCalibrationBlock(opts.exam, opts.level, opts.section_code);

  const sectionScopeLock = buildSectionScopeLockGen(opts.exam, opts.section_code, opts.section_name);

  return `You are an elite ${opts.exam_full} (${opts.exam}) question setter with 15+ years of experience writing original mock questions for top MBA coaching institutes in India.
${examCalibration}

${sectionScopeLock}

GENERATE 100% ORIGINAL questions for:
- Exam: ${opts.exam} (${opts.exam_full})
- Section: ${opts.section_name} (${opts.section_code}) — STRICTLY this section's syllabus only
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
8. Output ONLY valid JSON. No prose. No markdown fences. Use raw integers (no thousands separators like "1,234").
9. STRICT FORMATTING — the UI renders question number, set badge and option letters (A/B/C/D) as STATIC labels:
   - "question_html" must contain ONLY the pure question text. Do NOT prefix it with "Q1.", "Q.1", "Question 1:", "Question:", "1.", "1)", "(1)", "Set 1:", or any numbering/labeling.
   - "options[].text" must contain ONLY the pure option text. Do NOT prefix it with "A)", "(A)", "A.", "a)", "1)" or any letter/number label.
   - For set-bound questions, keep the shared passage/caselet INSIDE <div class="passage">…</div> exactly as instructed; do NOT write "Question 1 of Set 2", "Set 1 — Q3" etc. anywhere.
10. MATH RENDERING — render every fraction, root, exponent, summation or symbol with LaTeX delimited by $...$ for inline (e.g. $\\frac{a}{b}$, $\\sqrt{x^2+1}$, $x_1 \\le x_2$) or $$...$$ for block. Never write fractions as "a/b" when they should be stacked. Never use Unicode hacks for math operators when LaTeX is clearer.
11. DI-LR VISUALS — when a caselet needs a chart, ALWAYS emit a clean inline <svg viewBox="0 0 600 300">…</svg> with proper <rect>/<line>/<text> elements (or a well-formatted HTML <table>). NEVER emit base64 images, NEVER reference external image URLs, NEVER write "see image below". The SVG must be self-contained and human-readable.`;
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
  avoid_topics?: string[];
  attempt_seed?: string;
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
  const avoidLine = (args.avoid_topics && args.avoid_topics.length)
    ? `\n\nDIVERSITY MANDATE: Do NOT repeat or paraphrase questions on these recently-used topic/subtopic combinations: ${args.avoid_topics.slice(0, 12).join(" | ")}. Pick FRESH topics and subtopics within the section's syllabus.`
    : "";
  const seedLine = args.attempt_seed ? `\n\nUNIQUENESS SEED (use to vary scenarios): ${args.attempt_seed}` : "";
  const user = buildUserPrompt({
    count: args.count, mcq_count: args.mcq, tita_count: args.tita,
    positive: args.positive, negative: args.negative,
  }) + avoidLine + seedLine;

  const apiKey = (await getCredential("OPENAI_API_KEY"));
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const lvlLower = String(args.level || "").toLowerCase();
  const isHardVariant = ["very_hard", "extremely_hard", "cat_pyq"].includes(lvlLower);
  const modelId = "gpt-4o-mini";
  const temp = lvlLower === "cat_pyq" ? 0.55 : isHardVariant ? 0.45 : 0.35;
  // ~1100 tokens per question is plenty (stem + 4 options + explanation). Cap by batch size.
  const tokenBudget = Math.min(8000, 1200 * Math.max(1, args.count));
  const reqBody: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    max_tokens: tokenBudget,
    temperature: temp,
  };

  // Inline retry with exponential backoff for transient errors (429 / 5xx / network).
  // OpenAI 502s in the field were causing whole batches to be discarded.
  const MAX_INLINE_RETRIES = 4;
  let resp: Response | null = null;
  let lastErr: string | null = null;
  const callStart = Date.now();
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= MAX_INLINE_RETRIES; attempt++) {
    attemptsUsed = attempt;
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
      // Retry on 408/429/5xx
      if ([408, 425, 429, 500, 502, 503, 504].includes(resp.status) && attempt < MAX_INLINE_RETRIES) {
        const txt = await resp.text();
        lastErr = `AI call failed (${resp.status}): ${txt.slice(0, 200)}`;
        console.warn(`[callOpenAIBatch] transient ${resp.status}, retry ${attempt}/${MAX_INLINE_RETRIES - 1}`);
        const backoff = Math.min(8000, 1000 * Math.pow(2, attempt - 1)) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, backoff));
        resp = null;
        continue;
      }
      // non-retryable
      const txt = await resp.text();
      // log failure
      logAIUsage({
        feature: "mock_question_generator",
        model: `openai/${modelId}`,
        provider: "openai",
        prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
        latency_ms: Date.now() - callStart,
        status: "error",
        error_message: `HTTP ${resp.status}: ${txt.slice(0, 200)}`,
        user_id: args.userId,
      });
      throw new Error(`AI call failed (${resp.status}): ${txt.slice(0, 300)}`);
    } catch (e) {
      clearTimeout(timer);
      const msg = (e as Error)?.name === "AbortError"
        ? `OpenAI request aborted after ${OPENAI_TIMEOUT_MS}ms`
        : `OpenAI fetch failed: ${(e as Error)?.message || e}`;
      lastErr = msg;
      if (attempt < MAX_INLINE_RETRIES) {
        console.warn(`[callOpenAIBatch] network error, retry ${attempt}/${MAX_INLINE_RETRIES - 1}: ${msg}`);
        const backoff = Math.min(8000, 1000 * Math.pow(2, attempt - 1)) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, backoff));
        resp = null;
        continue;
      }
      logAIUsage({
        feature: "mock_question_generator",
        model: `openai/${modelId}`,
        provider: "openai",
        prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
        latency_ms: Date.now() - callStart,
        status: "error",
        error_message: msg,
        user_id: args.userId,
      });
      throw new Error(msg);
    }
  }
  if (!resp || !resp.ok) {
    throw new Error(lastErr || "AI call failed after retries");
  }
  const data = await resp.json();
  const usage = data?.usage || {};
  const promptTok = Number(usage.prompt_tokens) || 0;
  const completionTok = Number(usage.completion_tokens) || 0;
  const totalTok = Number(usage.total_tokens) || (promptTok + completionTok);
  // Per-1M pricing for gpt-4o-mini: $0.15 in / $0.60 out
  const cost = (promptTok * 0.15 + completionTok * 0.60) / 1_000_000;
  logAIUsage({
    feature: "mock_question_generator",
    model: `openai/${modelId}`,
    provider: "openai",
    prompt_tokens: promptTok,
    completion_tokens: completionTok,
    total_tokens: totalTok,
    estimated_cost: cost,
    latency_ms: Date.now() - callStart,
    status: "success",
    user_id: args.userId,
  });
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
  const apiKey = (await getCredential("FIRECRAWL_API_KEY"));
  if (!apiKey) return false; // skip if not configured
  // Trim to a sentence-ish probe
  const probe = normalizeForHash(questionText).slice(0, 220);
  if (probe.length < 60) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FIRECRAWL_TIMEOUT_MS);
  try {
    const resp = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: `"${probe.slice(0, 140)}"`, limit: 3 }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return false;
    const json = await resp.json();
    const hits = json?.data || json?.web?.results || [];
    return Array.isArray(hits) && hits.length > 0;
  } catch {
    clearTimeout(timer);
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

    const finiteOr = (v: any, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const finiteOrZero = (v: any, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    const perSet = customSectionPlan
      ? planTotalQuestions
      : finiteOr(questions_per_set, finiteOr(total_questions, profile.default_total));
    const mcqCount = customSectionPlan
      ? planTotalMcq
      : finiteOrZero(total_mcq, Math.round(perSet * 0.85));
    const titaCount = customSectionPlan
      ? planTotalTita
      : finiteOrZero(total_tita, Math.max(0, perSet - mcqCount));
    const safePerSet = Math.max(1, mcqCount + titaCount);

    const createdTests: Array<{ id: string; name: string; slug: string }> = [];
    const stats = {
      generated: 0,
      rejected_dup_db: 0,
      rejected_dup_internet: 0,
    };

    // Dedup is now performed per-section inside retry-mock-section, scoped to
    // the same (exam, section). Skipping the global hash preload here saves a
    // multi-second round-trip on every generation kickoff.

    // Insert generation log row
    const { data: gen } = await admin.from("ai_mock_generations").insert({
      exam_code, category, level,
      request: body, status: "running",
      total_requested: safePerSet * setsCount,
      ai_model: "gpt-4o-mini",
      created_by: user.id,
    }).select("id").single();
    const genId = gen?.id;

    // Long-running generation runs in the background so the HTTP request
    // returns immediately. The client polls ai_mock_generations + mock_section_jobs for status.
    const runGeneration = async () => {
     try {
    for (let setIdx = 1; setIdx <= setsCount; setIdx++) {
      const rawBase = test_name_prefix
        ? (setsCount > 1 ? `${test_name_prefix} #${setIdx}` : test_name_prefix)
        : `${exam_code} ${labelForCategory(category)} ${setIdx} — AI`;
      // Append exam_code + short unique suffix so concurrent generations across exams
      // never collide on mock_tests_unique_name_idx (was the cause of "stuck" UI).
      const uniqSuffix = `${exam_code}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
      let baseName = `${rawBase} (${uniqSuffix})`;
      // Safety net: if name already exists (extreme edge), keep adding random suffix.
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: dup } = await admin.from("mock_tests").select("id").eq("name", baseName).maybeSingle();
        if (!dup) break;
        baseName = `${rawBase} (${exam_code}-${Math.random().toString(36).slice(2, 8)})`;
      }
      const slug = slugify(baseName) + "-" + Date.now().toString(36) + "-" + setIdx;

      // Decide sections for this set based on category (custom plan wins for full_length)
      const sectionPlan: Array<{ code: string; name: string; duration: number; questions: number; sort: number; sets?: number }> =
        customSectionPlan && category === "full_length"
        ? customSectionPlan.map((s, idx) => ({ code: s.code, name: s.name, duration: s.duration, questions: s.questions, sort: idx, sets: s.sets }))
        : planSections(profile, exam_code, category, safePerSet, section_code, topic);

      const { data: testRow, error: testErr } = await admin.from("mock_tests").insert({
        name: baseName,
        slug,
        description: `AI-generated ${labelForCategory(category)} for ${exam_code}. Level: ${level}.`,
        test_type: category === "topic" ? "topic_wise"
                 : category === "sectional" ? "sectional"
                 : "full_length",
        category,
        exam_code,
        topic: category === "topic" ? (topic || null) : null,
        launch_date,
        total_duration_minutes: sectionPlan.reduce((s, x) => s + x.duration, 0),
        difficulty: normalizeDifficulty(null, level),
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
        // Hard guard — never insert NaN/undefined into NOT NULL columns.
        const safeSecQ = Number.isFinite(Number(sec.questions)) && Number(sec.questions) > 0
          ? Math.floor(Number(sec.questions))
          : 1;
        const safeSecDur = Number.isFinite(Number(sec.duration)) && Number(sec.duration) > 0
          ? Math.floor(Number(sec.duration))
          : 30;
        sec.questions = safeSecQ;
        sec.duration = safeSecDur;
        const { data: secRow, error: secErr } = await admin.from("mock_sections").insert({
          test_id: testRow.id,
          code: sec.code,
          name: sec.name,
          duration_minutes: safeSecDur,
          total_questions: safeSecQ,
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

        // ---- Derive sets / questions_per_set for this section ----
        // Priority: custom plan from the admin > exam defaults (CAT VARC=3×4,
        // CAT/IIFT DILR=4×5) > 0/0 (no sets, all standalone).
        let secSets = 0;
        let secQPerSet = 0;
          if (customSec && Number(customSec.sets) > 0) {
          secSets = Math.max(1, Math.floor(Number(customSec.sets)));
          // questions_per_set if user provided it on the row, else infer
          const customQPS = Number((customSec as any).questions_per_set || 0);
            if (customQPS > 0) {
              secQPerSet = customQPS;
            } else {
              const ec = String(exam_code || "").toUpperCase();
              const sc = String(sec.code || "").toUpperCase();
              // Keep RC/LRDI sets exam-realistic and small. Previously a custom
              // full-length CAT plan inferred VARC as 3×8-question RCs, creating
              // huge prompts that could run for 20–30 minutes.
              if ((ec === "CAT" || ec === "IIFT") && sc === "VARC") secQPerSet = 4;
              else if ((ec === "CAT" || ec === "IIFT") && sc === "DILR") secQPerSet = 5;
              else if (sc === "VALR" || sc === "VARC" || sc === "LS" || sc === "GE" || sc === "LC") secQPerSet = 4;
              else secQPerSet = Math.max(1, Math.floor(sec.questions / secSets));
            }
        } else if (category === "full_length") {
          const ec = String(exam_code || "").toUpperCase();
          const sc = String(sec.code || "").toUpperCase();
          if ((ec === "CAT" || ec === "IIFT") && sc === "VARC") {
            // 3 RCs × 4 = 12 set-questions, the rest standalone (parajumbles etc.)
            secSets = 3; secQPerSet = 4;
          } else if ((ec === "CAT" || ec === "IIFT") && sc === "DILR") {
            // 4 caselets × 5 = 20; if section has fewer Qs, scale down qPerSet.
            secSets = 4; secQPerSet = Math.max(4, Math.floor(sec.questions / 4));
          }
        }
        // ── HARD CAP: any RC-style verbal section must have 4–5 Qs per passage.
        // CAT/XAT/IIFT/SNAP RCs never exceed 5 questions. Prevents the bug
        // where a single passage was rendering 8–9 questions.
        const verbalCodes = new Set(["VARC", "VALR", "LS", "GE", "LC", "VABI"]);
        if (verbalCodes.has(String(sec.code || "").toUpperCase()) && secSets > 0) {
          secQPerSet = Math.min(5, Math.max(4, secQPerSet));
        }
        // Also cap DILR caselets at a sane max of 6 questions per set
        if (["DILR", "LRDI", "DI", "LR"].includes(String(sec.code || "").toUpperCase()) && secSets > 0) {
          secQPerSet = Math.min(6, Math.max(4, secQPerSet));
        }
        // Safety: never let sets demand more questions than the section has
        if (secSets * secQPerSet > sec.questions) {
          secQPerSet = Math.max(1, Math.floor(sec.questions / Math.max(1, secSets)));
        }

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
            sets: secSets,
            questions_per_set: secQPerSet,
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

      // Kick off up to three section workers in parallel. Do NOT pre-lock the
      // row here: retry-mock-section owns the lock. Pre-locking made the worker
      // think another worker was active and exit without generating anything.
      const workerUrl = `${url}/functions/v1/retry-mock-section`;
      const internalWorkerSecret = Deno.env.get("LOVABLE_API_KEY") || serviceKey;
      const allJobIds = sectionRecords.map((r) => r.jobId).filter(Boolean) as string[];
      const initialJobIds = allJobIds.slice(0, 3);
      for (const firstJobId of initialJobIds) {
        await admin.from("mock_section_jobs").update({
          status: "pending",
          current_step: "Queued fast section worker…",
          worker_lock_until: null,
          updated_at: new Date().toISOString(),
        }).eq("id", firstJobId);
        const kick = fetch(workerUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${internalWorkerSecret}`,
            apikey: internalWorkerSecret,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ job_id: firstJobId, auto: true, service: true, internal_secret: internalWorkerSecret }),
        }).catch((e) => console.error("[generate] worker kickoff failed", e));
        // @ts-ignore
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(kick);
      }

      createdTests.push(testRow);
    }

    if (genId) {
      await admin.from("ai_mock_generations").update({
        status: "running",
        total_generated: 0,
        result_summary: { tests: createdTests, stats },
      }).eq("id", genId);
    }

    return;

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
  examCode: string,
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
    // Daily Tests are ALWAYS a balanced 33/33/33 mix across the exam's 3 core sections.
    // XAT has VALR/DM/QADI, so never fall back to one repeated section code.
    const dailySectionCodesByExam: Record<string, string[]> = {
      CAT: ["VARC", "DILR", "QA"],
      XAT: ["VALR", "DM", "QADI"],
      SNAP: ["GE", "AR", "QADS"],
      NMAT: ["LS", "LR", "QS"],
      CMAT: ["QADI", "LR", "LC"],
      IIFT: ["VARC", "DILR", "QA"],
      MAT: ["LC", "ICR", "DA"],
    };
    const desired = dailySectionCodesByExam[String(examCode || "").toUpperCase()]
      || profile.sections.slice(0, 3).map((s) => s.code);
    const uniqueDesired = Array.from(new Set(desired)).slice(0, 3);
    const pick = (code: string, idx: number) =>
      profile.sections.find((s) => s.code === code) || profile.sections[idx] || profile.sections[0];
    const base = Math.floor(totalQuestions / 3);
    const remainder = totalQuestions - base * 3; // distribute extras to the first sections
    const counts = [base + (remainder > 0 ? 1 : 0), base + (remainder > 1 ? 1 : 0), base];
    return uniqueDesired.map((code, idx) => {
      const sec = pick(code, idx);
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
