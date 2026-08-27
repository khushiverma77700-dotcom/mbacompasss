// Shared types + helpers for the modular AI exam page payload (exams.sections).
// Every module is optional — the public template renders a module only when it
// actually has content, so an exam never shows an empty or "TBA" block.

export interface ExamHero {
  full_form?: string;
  tagline?: string;
  exam_category?: string;
  exam_level?: string;
  exam_mode?: string;
  frequency?: string;
  duration?: string;
  conducting_body?: string;
  official_website?: string;
  registration_status?: string;
  exam_status?: string;
}

export interface QA { q?: string; a?: string; category?: string }
export interface LabelValue { label?: string; value?: string }
export interface ExamDateRow { event?: string; date?: string; status?: string; notes?: string }
export interface TableBlock { columns?: string[]; rows?: string[][]; notes?: string }

export interface ExamSections {
  hero?: ExamHero;
  quick_answer?: QA[];
  highlights?: LabelValue[];
  dates?: ExamDateRow[];
  overview?: string;
  eligibility?: { summary?: string; criteria?: LabelValue[]; can_i_apply?: QA[] };
  registration?: { steps?: { title?: string; detail?: string }[]; documents?: string[]; notes?: string };
  fees?: { category?: string; fee?: string; notes?: string }[];
  fees_notes?: string;
  pattern?: TableBlock;
  marking?: LabelValue[];
  syllabus?: { subject?: string; topics?: { name?: string; subtopics?: string[] }[] }[];
  resources?: { label?: string; url?: string }[];
  papers?: { year?: string; paper_url?: string; solutions_url?: string; difficulty?: string }[];
  difficulty?: TableBlock;
  preparation?: { title?: string; body_html?: string }[];
  tools?: { label?: string; url?: string; description?: string }[];
  cutoffs?: TableBlock;
  colleges?: { name?: string; location?: string; course?: string; cutoff?: string; fees?: string; outcome?: string; slug?: string }[];
  comparisons?: { a?: string; b?: string; points?: { parameter?: string; a_value?: string; b_value?: string }[] }[];
  counselling?: { steps?: { title?: string; detail?: string }[]; notes?: string };
  admit_card?: string;
  exam_day?: { before?: string[]; at_centre?: string[]; not_allowed?: string[] };
  centres?: { city?: string; state?: string; availability?: string }[];
  result?: { html?: string; link?: string };
  after_exam?: string;
  related_exams?: { name?: string; slug?: string; why?: string }[];
  related_searches?: string[];
  updates?: { date?: string; headline?: string; summary?: string; source_url?: string }[];
  faqs?: QA[];
  seo?: { meta_title?: string; meta_description?: string; h1?: string; primary_keyword?: string; keywords?: string[] };
}

export interface ExamSource { title?: string; url?: string }

export const EXAM_MODULE_LABELS: Record<keyof ExamSections, string> = {
  hero: "Hero & key facts",
  quick_answer: "Quick answer",
  highlights: "Exam highlights",
  dates: "Important dates",
  overview: "Exam overview",
  eligibility: "Eligibility",
  registration: "Registration process",
  fees: "Application fee",
  fees_notes: "Fee notes & payment modes",
  pattern: "Exam pattern",
  marking: "Marking scheme",
  syllabus: "Syllabus",
  resources: "Syllabus & downloads",
  papers: "Previous year papers",
  difficulty: "Difficulty analysis",
  preparation: "Preparation strategy",
  tools: "Score / rank tools",
  cutoffs: "Cutoffs",
  colleges: "Colleges accepting the score",
  comparisons: "College comparison",
  counselling: "Admission / counselling",
  admit_card: "Admit card",
  exam_day: "Exam day guidelines",
  centres: "Exam centres",
  result: "Result",
  after_exam: "What after the exam",
  related_exams: "Related exams",
  related_searches: "Related searches",
  updates: "Latest updates",
  faqs: "FAQs",
  seo: "SEO metadata",
};

export const EXAM_MODULE_ORDER: (keyof ExamSections)[] = [
  "hero", "quick_answer", "highlights", "dates", "overview", "eligibility",
  "registration", "fees", "fees_notes", "pattern", "marking", "syllabus", "resources",
  "papers", "difficulty", "preparation", "tools", "cutoffs", "colleges",
  "comparisons", "counselling", "admit_card", "exam_day", "centres", "result",
  "after_exam", "related_exams", "related_searches", "updates", "faqs", "seo",
];

export const EXAM_BATCHES: { key: string; label: string; modules: (keyof ExamSections)[] }[] = [
  { key: "core", label: "Core", modules: ["hero", "quick_answer", "highlights", "dates", "overview", "eligibility", "registration", "fees", "fees_notes"] },
  { key: "exam", label: "Exam & prep", modules: ["pattern", "marking", "syllabus", "resources", "papers", "difficulty", "preparation", "tools"] },
  { key: "outcomes", label: "Outcomes", modules: ["cutoffs", "colleges", "comparisons", "counselling", "admit_card", "exam_day", "centres", "result", "after_exam"] },
  { key: "discovery", label: "Discovery & SEO", modules: ["related_exams", "related_searches", "updates", "faqs", "seo"] },
];

const PLACEHOLDER = /^(tba|to be announced|n\/?a|na|coming soon|-+|—|not available|unknown)$/i;

export const cleanValue = (value?: string | null) => {
  const v = (value ?? "").toString().trim();
  if (!v || PLACEHOLDER.test(v)) return "";
  return v.replace(/^official\s+TBA;?\s*/i, "").trim();
};

export function hasModuleContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return !!cleanValue(value);
  if (Array.isArray(value)) return value.some((item) => hasModuleContent(item));
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasModuleContent);
  if (typeof value === "number") return true;
  return false;
}

export function tableHasRows(block?: TableBlock | null) {
  return !!block?.columns?.length && !!block?.rows?.some((row) => row?.some((cell) => !!cleanValue(cell)));
}

export function parseSections(raw: unknown): ExamSections {
  if (!raw || typeof raw !== "object") return {};
  return raw as ExamSections;
}
