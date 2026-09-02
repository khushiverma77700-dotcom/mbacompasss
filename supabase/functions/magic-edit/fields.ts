// Server-side allow-list for the magic edit editor.
// Mirrors src/lib/magicEditSchema.ts — every field the master admin editor
// exposes is editable here too, coerced to the right Postgres type.

export type EntityType = "college" | "article" | "exam";

export interface EntityConfig {
  table: string;
  label: string;
  titleField: string;
  bodyField: string;
  publicPath: (slug: string) => string;
  text: string[];
  numeric: string[];
  integer: string[];
  arrays: string[];
  booleans: string[];
}

export const CONFIG: Record<EntityType, EntityConfig> = {
  college: {
    table: "colleges",
    label: "College",
    titleField: "name",
    bodyField: "description",
    publicPath: (slug) => `/college/${slug}`,
    text: [
      "name", "slug", "description", "city", "state", "type", "tier", "college_category",
      "fees", "website", "placement_avg", "placement_highest", "placement_median",
      "campus_size", "admission_process", "logo_url", "banner_url",
      "meta_title", "meta_description", "h1_tag", "primary_keyword", "funnel_stage",
    ],
    numeric: ["fees_lakhs"],
    integer: ["established", "ranking", "total_students"],
    arrays: ["courses", "accreditations", "exams_accepted", "top_recruiters", "specializations", "keywords"],
    booleans: [],
  },
  article: {
    table: "articles",
    label: "Article",
    titleField: "title",
    bodyField: "content",
    publicPath: (slug) => `/article/${slug}`,
    text: [
      "title", "slug", "excerpt", "intro", "content", "category", "author", "status",
      "banner_url", "mobile_banner_url", "image_url",
      "meta_title", "meta_description", "h1_tag", "primary_keyword", "funnel_stage",
    ],
    numeric: [],
    integer: ["priority"],
    arrays: ["keywords"],
    booleans: ["featured", "published"],
  },
  exam: {
    table: "exams",
    label: "Exam",
    titleField: "name",
    bodyField: "description",
    publicPath: (slug) => `/exam/${slug}`,
    text: [
      "name", "slug", "full_name", "description", "conducting_body", "eligibility",
      "exam_date", "registration_deadline", "frequency", "duration", "exam_mode",
      "exam_level", "exam_category", "official_website", "logo_url",
      "meta_title", "meta_description", "h1_tag", "primary_keyword", "funnel_stage",
    ],
    numeric: [],
    integer: ["exam_year"],
    arrays: ["syllabus", "keywords"],
    booleans: [],
  },
};

export const editableKeys = (cfg: EntityConfig): string[] => [
  ...cfg.text, ...cfg.numeric, ...cfg.integer, ...cfg.arrays, ...cfg.booleans,
];

/** Columns selected on load — editable set plus read-only context. */
export const selectKeys = (cfg: EntityConfig): string[] =>
  Array.from(new Set(["id", "slug", "updated_at", ...editableKeys(cfg)]));

const toInt = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const m = String(v).replace(/,/g, "").match(/-?\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
};

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const m = String(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
};

const toArr = (v: unknown): string[] | null => {
  const list = Array.isArray(v)
    ? v.map((x) => String(x).trim())
    : String(v ?? "").split(",").map((x) => x.trim());
  const clean = list.filter(Boolean);
  return clean.length ? clean : null;
};

/** Coerce an incoming patch to a safe, typed DB update object. */
export function coercePatch(cfg: EntityConfig, patch: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (cfg.text.includes(k)) {
      const s = v === null || v === undefined ? null : String(v);
      update[k] = s && s.trim() !== "" ? s : null;
    } else if (cfg.integer.includes(k)) {
      update[k] = toInt(v);
    } else if (cfg.numeric.includes(k)) {
      update[k] = toNum(v);
    } else if (cfg.arrays.includes(k)) {
      update[k] = toArr(v);
    } else if (cfg.booleans.includes(k)) {
      update[k] = v === true || v === "true";
    }
  }
  // Articles keep `published` in sync with `status`, exactly like the admin form.
  if (cfg.table === "articles" && typeof update.status === "string") {
    update.published = update.status === "live";
  }
  // Never allow an empty title or slug to wipe the page.
  if (!update[cfg.titleField]) delete update[cfg.titleField];
  if (update.slug === null) delete update.slug;
  return update;
}

/** Field-by-field diff for the admin change notification. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
) {
  const norm = (v: unknown) => (v === null || v === undefined ? "" : JSON.stringify(v));
  const clip = (v: unknown) => {
    if (v === null || v === undefined) return null;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > 600 ? `${s.slice(0, 600)}…` : s;
  };
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  for (const k of keys) {
    if (norm(before?.[k]) !== norm(after?.[k])) {
      diff[k] = { old: clip(before?.[k]), new: clip(after?.[k]) };
    }
  }
  return diff;
}
