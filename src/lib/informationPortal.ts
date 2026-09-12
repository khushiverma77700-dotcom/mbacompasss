import type { Json } from "@/integrations/supabase/types";

export type EntityType = "college" | "exam";
export type VerificationStatus = "verified_official" | "cross_verified" | "manual_review" | "conflict" | "not_found";

export const normalizeEntityName = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

export const slugifyEntity = (value: string) =>
  normalizeEntityName(value).replace(/\s+/g, "-").slice(0, 90);

export const valueIsPresent = (value: unknown): boolean => {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

export const toJson = (value: unknown): Json => JSON.parse(JSON.stringify(value ?? null)) as Json;

export const displayValue = (value: Json | null): string => {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
};

export const parseEditedValue = (raw: string, valueType: string): Json | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (valueType === "number") {
    const value = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(value) ? value : null;
  }
  if (["string_list", "object", "object_list"].includes(valueType)) {
    try { return JSON.parse(trimmed) as Json; } catch { return trimmed; }
  }
  return trimmed;
};

export const sourceClassForUrl = (url: string, officialDomain?: string | null) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const official = officialDomain?.replace(/^www\./, "");
    if (host.endsWith(".gov.in") || host.endsWith(".nic.in") || host === "gov.in") return "government" as const;
    if (/\.pdf($|\?)/i.test(parsed.pathname)) return "official_document" as const;
    if (official && (host === official || host.endsWith(`.${official}`))) return "official_domain" as const;
    return "third_party" as const;
  } catch {
    return "third_party" as const;
  }
};

export const safeOfficialUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
};

export const collegePayloadFromResearch = (college: Record<string, unknown>, fallbackName: string) => ({
  name: String(college.name || fallbackName),
  slug: String(college.slug || slugifyEntity(fallbackName)),
  description: college.description ?? null,
  city: college.city ?? null,
  state: college.state ?? null,
  type: college.type ?? null,
  tier: college.tier ?? null,
  college_category: college.college_category ?? null,
  established: college.established ?? null,
  ranking: college.ranking ?? null,
  fees: college.fees ?? null,
  website: college.website ?? null,
  placement_avg: college.placement_avg ?? null,
  placement_highest: college.placement_highest ?? null,
  placement_median: college.placement_median ?? null,
  campus_size: college.campus_size ?? null,
  admission_process: college.admission_process ?? null,
  courses: college.courses ?? null,
  accreditations: college.accreditations ?? null,
  exams_accepted: college.exams_accepted ?? null,
  top_recruiters: college.top_recruiters ?? null,
  specializations: college.specializations ?? null,
  meta_title: college.meta_title ?? null,
  meta_description: college.meta_description ?? null,
  keywords: college.keywords ?? null,
  primary_keyword: college.primary_keyword ?? null,
  h1_tag: college.h1_tag ?? null,
});

export const examPayloadFromSections = (name: string, sections: Record<string, any>, context: Record<string, unknown>) => {
  const hero = sections.hero || {};
  const seo = sections.seo || {};
  const dates = Array.isArray(sections.dates) ? sections.dates : [];
  return {
    name,
    slug: slugifyEntity(name),
    full_name: hero.full_form || name,
    description: sections.overview || null,
    conducting_body: hero.conducting_body || null,
    frequency: hero.frequency || null,
    duration: hero.duration || null,
    exam_mode: hero.exam_mode || null,
    exam_level: hero.exam_level || null,
    exam_category: context.exam_category || hero.exam_category || null,
    exam_status: hero.exam_status || null,
    registration_status: hero.registration_status || null,
    official_website: context.official_website || hero.official_website || null,
    exam_year: context.exam_year || null,
    eligibility: sections.eligibility?.summary || null,
    exam_date: dates.find((item: any) => /exam(ination)?\b/i.test(item?.event || ""))?.date || null,
    registration_deadline: dates.find((item: any) => /registration end|last date|registration close/i.test(item?.event || ""))?.date || null,
    important_dates: dates.length ? dates : null,
    pattern: sections.pattern || null,
    cutoffs: sections.cutoffs || null,
    faqs: Array.isArray(sections.faqs) && sections.faqs.length ? sections.faqs : null,
    syllabus: Array.isArray(sections.syllabus) ? sections.syllabus.map((item: any) => item?.subject).filter(Boolean) : null,
    meta_title: seo.meta_title || null,
    meta_description: seo.meta_description || null,
    h1_tag: seo.h1 || name,
    primary_keyword: seo.primary_keyword || null,
    keywords: seo.keywords || null,
    sources: context.sources || null,
    sections,
  };
};