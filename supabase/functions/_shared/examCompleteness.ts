// Shared exam-page completeness auditor.
//
// The old gap check only looked at array LENGTH, so a fees table with 11 rows
// whose "fee" values were all empty strings counted as complete and shipped a
// blank table to the public page. This module audits at FIELD level: every row
// and every required leaf must carry a real value.
//
// Used by:
//  - ai-exam-writer      → decide which modules need another gap-fill pass
//  - exam-backfill-worker→ audit already-published exams and patch them
//  - exam-generation-worker → refuse to call a fresh exam "complete" while blank

export type Gap = { key: string; detail: string };

const PLACEHOLDER =
  /^(tba|t\.b\.a\.?|to be announced|to be notified|to be updated|not announced|not available|not applicable|n\/?a|na|none|nil|unknown|coming soon|awaited|yet to be announced|official tba|-{1,3}|—|xx+|\?+|\.+)$/i;

/** True when a scalar value is missing, blank or a placeholder string. */
export function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "number") return false;
  if (typeof v === "boolean") return !v;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  const s = String(v).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
  if (!s) return true;
  return PLACEHOLDER.test(s);
}

export const wordCount = (html: unknown) =>
  typeof html === "string"
    ? html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length
    : 0;

type Spec =
  | { type: "html"; words: number; label: string }
  | { type: "object"; fields: string[]; label: string }
  | { type: "array"; min: number; fields: string[]; label: string; path?: string }
  | { type: "table"; min: number; label: string }
  | { type: "strings"; min: number; label: string };

/**
 * Field-level requirements. `fields` are the leaf keys that must be non-blank
 * on EVERY row — these are the ones that render as table cells or card values.
 */
export const EXAM_SPEC: Record<string, Spec> = {
  hero: {
    type: "object",
    label: "Hero facts",
    fields: [
      "full_form", "tagline", "exam_category", "exam_level", "exam_mode",
      "frequency", "duration", "conducting_body", "official_website",
      "registration_status", "exam_status",
    ],
  },
  quick_answer: { type: "array", min: 8, fields: ["q", "a"], label: "Quick answers" },
  highlights: { type: "array", min: 10, fields: ["label", "value"], label: "Highlight cards" },
  dates: { type: "array", min: 8, fields: ["event", "date"], label: "Important dates" },
  overview: { type: "html", words: 600, label: "Overview" },
  eligibility: { type: "array", min: 8, fields: ["label", "value"], path: "criteria", label: "Eligibility criteria" },
  registration: { type: "array", min: 8, fields: ["title", "detail"], path: "steps", label: "Registration steps" },
  fees: { type: "array", min: 4, fields: ["category", "fee"], label: "Application fees" },
  fees_notes: { type: "html", words: 60, label: "Fee payment & refund notes" },
  pattern: { type: "table", min: 3, label: "Exam pattern table" },
  marking: { type: "array", min: 4, fields: ["label", "value"], label: "Marking scheme" },
  syllabus: { type: "array", min: 2, fields: ["subject", "topics"], label: "Syllabus" },
  papers: { type: "array", min: 1, fields: ["year"], label: "Previous papers" },
  difficulty: { type: "table", min: 2, label: "Difficulty analysis" },
  preparation: { type: "array", min: 6, fields: ["title", "body_html"], label: "Preparation guide" },
  cutoffs: { type: "table", min: 3, label: "Cutoffs table" },
  colleges: { type: "array", min: 10, fields: ["name", "location", "course"], label: "Accepting colleges" },
  comparisons: { type: "array", min: 2, fields: ["a", "b", "points"], label: "Comparisons" },
  counselling: { type: "array", min: 3, fields: ["title", "detail"], path: "steps", label: "Counselling steps" },
  admit_card: { type: "html", words: 120, label: "Admit card" },
  exam_day: { type: "object", label: "Exam-day guidelines", fields: ["before", "at_centre", "not_allowed"] },
  centres: { type: "array", min: 15, fields: ["city", "state"], label: "Exam centres" },
  result: { type: "object", label: "Result", fields: ["html"] },
  after_exam: { type: "html", words: 120, label: "After the exam" },
  related_exams: { type: "array", min: 4, fields: ["name", "why"], label: "Related exams" },
  related_searches: { type: "strings", min: 8, label: "Related searches" },
  updates: { type: "array", min: 4, fields: ["headline", "summary"], label: "Latest updates" },
  faqs: { type: "array", min: 20, fields: ["q", "a"], label: "FAQs" },
  seo: { type: "object", label: "SEO metadata", fields: ["meta_title", "meta_description", "h1", "primary_keyword"] },
};

/** Modules grouped exactly like ai-exam-writer's generation batches. */
export const BATCH_OF_KEY: Record<string, "core" | "exam" | "outcomes" | "discovery"> = {
  hero: "core", quick_answer: "core", highlights: "core", dates: "core", overview: "core",
  eligibility: "core", registration: "core", fees: "core", fees_notes: "core",
  pattern: "exam", marking: "exam", syllabus: "exam", resources: "exam", papers: "exam",
  difficulty: "exam", preparation: "exam", tools: "exam",
  cutoffs: "outcomes", colleges: "outcomes", comparisons: "outcomes", counselling: "outcomes",
  admit_card: "outcomes", exam_day: "outcomes", centres: "outcomes", result: "outcomes",
  after_exam: "outcomes",
  related_exams: "discovery", related_searches: "discovery", updates: "discovery",
  faqs: "discovery", seo: "discovery",
};

/**
 * Audits a sections object field by field.
 * Returns one gap per problem, e.g. `{ key: "fees", detail: "11 rows but 11 have a blank \"fee\"" }`.
 */
export function auditExamSections(sections: Record<string, any> | null | undefined): Gap[] {
  const s = sections && typeof sections === "object" ? sections : {};
  const gaps: Gap[] = [];

  for (const [key, spec] of Object.entries(EXAM_SPEC)) {
    const raw = s[key];

    if (spec.type === "html") {
      const words = wordCount(raw);
      if (isBlank(raw)) gaps.push({ key, detail: `${spec.label} is empty` });
      else if (words < spec.words) gaps.push({ key, detail: `${spec.label} is only ${words} words (need ${spec.words}+)` });
      continue;
    }

    if (spec.type === "object") {
      if (!raw || typeof raw !== "object") {
        gaps.push({ key, detail: `${spec.label} is missing` });
        continue;
      }
      const blanks = spec.fields.filter((f) => isBlank(raw[f]));
      if (blanks.length) gaps.push({ key, detail: `${spec.label}: blank ${blanks.join(", ")}` });
      continue;
    }

    if (spec.type === "table") {
      const rows = Array.isArray(raw?.rows) ? raw.rows : [];
      const cols = Array.isArray(raw?.columns) ? raw.columns : [];
      if (!cols.length || rows.length < spec.min) {
        gaps.push({ key, detail: `${spec.label} has ${rows.length} rows (need ${spec.min}+)` });
        continue;
      }
      const badRows = rows.filter((r: any) => !Array.isArray(r) || r.some((cell: any) => isBlank(cell)));
      if (badRows.length) gaps.push({ key, detail: `${spec.label}: ${badRows.length} of ${rows.length} rows have blank cells` });
      continue;
    }

    if (spec.type === "strings") {
      const arr = Array.isArray(raw) ? raw.filter((v) => !isBlank(v)) : [];
      if (arr.length < spec.min) gaps.push({ key, detail: `${spec.label}: ${arr.length} items (need ${spec.min}+)` });
      continue;
    }

    // array of objects
    const arr = Array.isArray(spec.path ? raw?.[spec.path] : raw) ? (spec.path ? raw[spec.path] : raw) : [];
    if (arr.length < spec.min) {
      gaps.push({ key, detail: `${spec.label}: ${arr.length} rows (need ${spec.min}+)` });
      continue;
    }
    for (const field of spec.fields) {
      const blanks = arr.filter((row: any) => isBlank(row?.[field])).length;
      if (blanks) {
        gaps.push({ key, detail: `${spec.label}: ${blanks} of ${arr.length} rows have a blank "${field}"` });
      }
    }
    // eligibility/registration summaries and notes should not be blank either
    if (spec.path && raw && typeof raw === "object") {
      const extra = key === "eligibility" ? ["summary"] : key === "registration" ? ["notes"] : ["notes"];
      const blankExtra = extra.filter((f) => isBlank(raw[f]));
      if (blankExtra.length) gaps.push({ key, detail: `${spec.label}: blank ${blankExtra.join(", ")}` });
    }
  }

  return gaps;
}

/** Unique module keys that need regeneration, ordered by generation batch. */
export function gapKeys(gaps: Gap[]): string[] {
  return [...new Set(gaps.map((g) => g.key))];
}

export function gapsByBatch(gaps: Gap[]) {
  const out: Record<string, Gap[]> = {};
  for (const g of gaps) {
    const b = BATCH_OF_KEY[g.key] || "core";
    (out[b] ||= []).push(g);
  }
  return out;
}

export function completenessScore(gaps: Gap[]): number {
  const total = Object.keys(EXAM_SPEC).length;
  const broken = new Set(gaps.map((g) => g.key)).size;
  return Math.max(0, Math.round(((total - broken) / total) * 100));
}

/**
 * Last line of defence before saving: drop rows / cells that are still blank so
 * the public page never renders an empty table row or a "TBA" cell. Modules that
 * end up empty are removed entirely (the template hides missing modules).
 */
export function pruneBlankContent(sections: Record<string, any>): Record<string, any> {
  const s: Record<string, any> = { ...(sections || {}) };

  const cleanRows = (arr: any, required: string[]) =>
    Array.isArray(arr)
      ? arr.filter((row) => row && typeof row === "object" && required.every((f) => !isBlank(row[f])))
      : arr;

  for (const [key, spec] of Object.entries(EXAM_SPEC)) {
    const raw = s[key];
    if (raw === undefined || raw === null) continue;

    if (spec.type === "array") {
      if (spec.path) {
        if (raw && typeof raw === "object") {
          s[key] = { ...raw, [spec.path]: cleanRows(raw[spec.path], spec.fields) };
        }
      } else {
        s[key] = cleanRows(raw, spec.fields);
        if (Array.isArray(s[key]) && !s[key].length) delete s[key];
      }
    } else if (spec.type === "strings") {
      s[key] = Array.isArray(raw) ? raw.filter((v) => !isBlank(v)) : raw;
      if (Array.isArray(s[key]) && !s[key].length) delete s[key];
    } else if (spec.type === "table") {
      if (raw && typeof raw === "object" && Array.isArray(raw.rows)) {
        const rows = raw.rows.filter(
          (r: any) => Array.isArray(r) && r.length && !r.every((c: any) => isBlank(c)),
        ).map((r: any[]) => r.map((c: any) => (isBlank(c) ? "" : c)));
        s[key] = { ...raw, rows };
        if (!rows.length) delete s[key];
      }
    } else if (spec.type === "html") {
      if (isBlank(raw)) delete s[key];
    }
  }

  return s;
}
