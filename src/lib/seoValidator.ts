// SEO pre-publish validator. Pure functions — no network, no DB.
// Used by editor "Validate before publish" buttons and by the validate-seo
// edge function for bulk validation. Keeping it isomorphic so a single rule
// set runs everywhere.

export type Severity = "error" | "warning" | "info";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: Severity;
}

export interface SEOInputPayload {
  contentType: "college" | "institute" | "article" | "category" | "exam" | "city_page" | "static";
  recordId?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  h1_tag?: string | null;
  primary_keyword?: string | null;
  keywords?: string[] | null;
  slug?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  schema_markup?: unknown;            // array | object | string
  faq_content?: unknown;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  passed: string[];          // names of checks that passed
  errorCount: number;
  warningCount: number;
  passedCount: number;
}

const STOP_WORDS = new Set([
  "the","a","an","of","and","or","but","in","on","at","to","for","with",
  "by","as","is","it","this","that","these","those","be","are","was","were",
]);

const SCHEMA_TYPE_REQUIRED: Record<string, string[]> = {
  Article:        ["headline", "author", "datePublished"],
  NewsArticle:    ["headline", "author", "datePublished"],
  BlogPosting:    ["headline", "author", "datePublished"],
  FAQPage:        ["mainEntity"],
  Course:         ["name", "provider"],
  Organization:   ["name"],
  EducationalOrganization: ["name"],
  CollegeOrUniversity: ["name"],
  LocalBusiness:  ["name"],
  BreadcrumbList: ["itemListElement"],
  Review:         ["author", "reviewRating"],
  Rating:         ["ratingValue"],
  AggregateRating:["ratingValue", "reviewCount"],
  Product:        ["name"],
  Person:         ["name"],
  WebSite:        ["url"],
  WebPage:        ["name"],
  ItemList:       ["itemListElement"],
};

function pushErr(arr: ValidationIssue[], field: string, message: string) {
  arr.push({ field, message, severity: "error" });
}
function pushWarn(arr: ValidationIssue[], field: string, message: string) {
  arr.push({ field, message, severity: "warning" });
}

function normalizeSchema(input: unknown): Record<string, unknown>[] {
  if (input == null) return [];
  let val: unknown = input;
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return [];
    try { val = JSON.parse(s); } catch { return [{ __invalid: true } as any]; }
  }
  if (Array.isArray(val)) {
    return val.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  }
  if (typeof val === "object") return [val as Record<string, unknown>];
  return [];
}

export function validateSEO(input: SEOInputPayload): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const passed: string[] = [];

  const primary = (input.primary_keyword || "").toLowerCase().trim();
  const containsPrimary = (s: string | null | undefined) =>
    !!primary && !!s && s.toLowerCase().includes(primary);

  // --- meta_title ---
  const mt = (input.meta_title || "").trim();
  if (!mt) {
    pushErr(errors, "meta_title", "Meta title is required.");
  } else {
    if (mt.length < 30) pushWarn(warnings, "meta_title", `Meta title is short (${mt.length} chars). Aim for 50–60.`);
    else if (mt.length > 60) pushErr(errors, "meta_title", `Meta title is too long (${mt.length} chars). Keep under 60.`);
    else passed.push("Meta title length");
    if (primary && !containsPrimary(mt)) pushWarn(warnings, "meta_title", `Primary keyword "${input.primary_keyword}" is missing from meta title.`);
    else if (primary) passed.push("Primary keyword in meta title");
  }

  // --- meta_description ---
  const md = (input.meta_description || "").trim();
  if (!md) {
    pushErr(errors, "meta_description", "Meta description is required.");
  } else {
    if (md.length < 120) pushWarn(warnings, "meta_description", `Meta description is short (${md.length} chars). Aim for 150–160.`);
    else if (md.length > 165) pushErr(errors, "meta_description", `Meta description is too long (${md.length} chars). Keep under 160.`);
    else passed.push("Meta description length");
    if (!/[.!?]$/.test(md)) pushWarn(warnings, "meta_description", "Meta description should end with sentence punctuation.");
    if (primary && !containsPrimary(md)) pushWarn(warnings, "meta_description", `Primary keyword "${input.primary_keyword}" is missing from meta description.`);
  }

  // --- h1_tag ---
  const h1 = (input.h1_tag || "").trim();
  if (!h1) pushWarn(warnings, "h1_tag", "H1 tag is empty. Add a unique H1 separate from meta title.");
  else {
    if (h1.length < 20) pushWarn(warnings, "h1_tag", `H1 is short (${h1.length} chars).`);
    else if (h1.length > 80) pushWarn(warnings, "h1_tag", `H1 is long (${h1.length} chars). Keep under 80.`);
    if (mt && h1.toLowerCase() === mt.toLowerCase()) pushWarn(warnings, "h1_tag", "H1 is identical to meta title — make it distinct.");
    else if (h1) passed.push("H1 distinct from meta title");
  }

  // --- slug ---
  const slug = (input.slug || "").trim();
  if (!slug) {
    pushErr(errors, "slug", "URL slug is required.");
  } else {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) pushErr(errors, "slug", "Slug must be lowercase kebab-case (a-z, 0-9, hyphens).");
    else passed.push("Slug format");
    if (slug.length > 70) pushWarn(warnings, "slug", `Slug is long (${slug.length} chars). Aim for ≤ 60.`);
    const stopHits = slug.split("-").filter((w) => STOP_WORDS.has(w));
    if (stopHits.length >= 3) pushWarn(warnings, "slug", `Slug has ${stopHits.length} stop words (${stopHits.join(", ")}). Trim for SEO.`);
  }

  // --- keywords ---
  const kws = Array.isArray(input.keywords) ? input.keywords.filter((k) => typeof k === "string" && k.trim()) : [];
  if (kws.length < 5) pushWarn(warnings, "keywords", `Only ${kws.length} keywords. Add at least 5 (target 10–25).`);
  else if (kws.length > 30) pushWarn(warnings, "keywords", `${kws.length} keywords is too many — Google ignores excessive keyword stuffing.`);
  else passed.push("Keyword count");

  if (primary && !kws.some((k) => k.toLowerCase().includes(primary))) {
    pushWarn(warnings, "keywords", "Primary keyword is not represented in the keywords list.");
  }

  // --- OG / Twitter ---
  if (!input.og_image) pushWarn(warnings, "og_image", "OG image missing — social shares will look bare.");
  else passed.push("OG image set");

  if (input.og_title && input.og_title.length > 95) pushWarn(warnings, "og_title", `OG title is ${input.og_title.length} chars; keep ≤ 95.`);
  if (input.twitter_title && input.twitter_title.length > 70) pushWarn(warnings, "twitter_title", `Twitter title is ${input.twitter_title.length} chars; keep ≤ 70.`);

  // --- JSON-LD schema ---
  const schemas = normalizeSchema(input.schema_markup);
  if (schemas.length === 0) {
    pushWarn(warnings, "schema_markup", "No JSON-LD schema attached. Add Article/Organization/Breadcrumb at minimum.");
  } else {
    let validBlocks = 0;
    schemas.forEach((s, idx) => {
      if ((s as any).__invalid) {
        pushErr(errors, `schema_markup[${idx}]`, "Schema is not valid JSON.");
        return;
      }
      const ctx = s["@context"];
      if (!ctx || (typeof ctx === "string" && !/schema\.org/i.test(ctx))) {
        pushErr(errors, `schema_markup[${idx}]`, `Missing @context "https://schema.org".`);
      }
      const type = s["@type"];
      if (!type) {
        pushErr(errors, `schema_markup[${idx}]`, "Missing @type.");
        return;
      }
      const types = Array.isArray(type) ? type : [type];
      for (const t of types) {
        const required = SCHEMA_TYPE_REQUIRED[String(t)];
        if (required) {
          for (const f of required) {
            if (s[f] == null || (Array.isArray(s[f]) && (s[f] as unknown[]).length === 0)) {
              pushErr(errors, `schema_markup[${idx}].${f}`, `${t} requires "${f}".`);
            }
          }
        }
      }
      validBlocks++;
    });
    if (validBlocks > 0) passed.push(`${validBlocks} schema block(s) parsed`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    passed,
    errorCount: errors.length,
    warningCount: warnings.length,
    passedCount: passed.length,
  };
}

// Helper for the editor — turns a record from the DB into the validator shape
export function buildValidationInput(
  contentType: SEOInputPayload["contentType"],
  record: Record<string, any>,
): SEOInputPayload {
  return {
    contentType,
    recordId: record.id,
    meta_title: record.meta_title,
    meta_description: record.meta_description,
    h1_tag: record.h1_tag,
    primary_keyword: record.primary_keyword,
    keywords: record.keywords,
    slug: record.slug,
    canonical_url: record.canonical_url,
    og_title: record.og_title,
    og_description: record.og_description,
    og_image: record.og_image,
    twitter_title: record.twitter_title,
    twitter_description: record.twitter_description,
    twitter_image: record.twitter_image,
    schema_markup: record.schema_markup ?? record.json_ld_schema,
    faq_content: record.faq_content,
  };
}
