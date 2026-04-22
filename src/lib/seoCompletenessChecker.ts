// SEO Completeness Checker — scores any blog or college page on the SEO basics
// (meta title, meta description, canonical URL slug, FAQ schema readiness, primary
// + secondary keyword coverage) and flags keyword stuffing.
//
// Pure TS so it can run in the admin UI before save AND inside edge functions.

export type CompletenessLevel = "pass" | "warn" | "fail";

export interface CompletenessCheck {
  key: string;
  label: string;
  status: CompletenessLevel;
  message: string;
  fix?: string;
}

export interface CompletenessReport {
  overall: number; // 0-100
  level: CompletenessLevel;
  checks: CompletenessCheck[];
  summary: string;
}

export interface CompletenessInput {
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  primaryKeyword?: string | null;
  secondaryKeywords?: string[] | null;
  html?: string | null;
  faqs?: { question: string; answer: string }[] | null;
  /** When true the page is expected to ship FAQ schema (blogs, college Q&A sections). */
  faqExpected?: boolean;
}

const STOP = new Set(["a","an","the","and","or","but","of","in","on","at","to","for","with","by"]);

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const slugifyKw = (kw: string) =>
  kw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function checkMetaTitle(metaTitle: string | null | undefined, primary: string | null | undefined): CompletenessCheck {
  const t = (metaTitle || "").trim();
  if (!t) return { key: "meta_title", label: "Meta title", status: "fail", message: "Missing", fix: "Add a 50–60 char meta title." };
  const len = t.length;
  if (len > 65) return { key: "meta_title", label: "Meta title", status: "warn", message: `Too long (${len}, max 65)`, fix: "Shorten to ≤60 chars." };
  if (len < 40) return { key: "meta_title", label: "Meta title", status: "warn", message: `Too short (${len}, target 50–60)`, fix: "Expand to ~55 chars with keyword + USP." };
  if (primary && !t.toLowerCase().includes(primary.toLowerCase())) {
    return { key: "meta_title", label: "Meta title", status: "warn", message: "Primary keyword missing", fix: `Include "${primary}" in the title.` };
  }
  return { key: "meta_title", label: "Meta title", status: "pass", message: `${len} chars, keyword present` };
}

function checkMetaDescription(metaDesc: string | null | undefined, primary: string | null | undefined): CompletenessCheck {
  const m = (metaDesc || "").trim();
  if (!m) return { key: "meta_description", label: "Meta description", status: "fail", message: "Missing", fix: "Add a 130–160 char description with keyword + CTA." };
  const len = m.length;
  if (len > 165) return { key: "meta_description", label: "Meta description", status: "warn", message: `Too long (${len})`, fix: "Trim to ≤160 chars." };
  if (len < 110) return { key: "meta_description", label: "Meta description", status: "warn", message: `Too short (${len}, target 130–160)`, fix: "Expand with keyword + CTA." };
  if (primary && !m.toLowerCase().includes(primary.toLowerCase())) {
    return { key: "meta_description", label: "Meta description", status: "warn", message: "Primary keyword missing" };
  }
  return { key: "meta_description", label: "Meta description", status: "pass", message: `${len} chars, keyword present` };
}

function checkCanonicalSlug(slug: string | null | undefined, primary: string | null | undefined): CompletenessCheck {
  const s = (slug || "").trim().replace(/^\/+|\/+$/g, "");
  if (!s) return { key: "canonical_slug", label: "Canonical slug", status: "fail", message: "Missing", fix: "Add a lowercase, hyphenated slug." };
  if (/\s/.test(s)) return { key: "canonical_slug", label: "Canonical slug", status: "fail", message: "Contains spaces", fix: "Replace spaces with hyphens." };
  if (/_/.test(s)) return { key: "canonical_slug", label: "Canonical slug", status: "warn", message: "Use hyphens, not underscores" };
  if (s !== s.toLowerCase()) return { key: "canonical_slug", label: "Canonical slug", status: "warn", message: "Use lowercase only" };
  if (s.length > 75) return { key: "canonical_slug", label: "Canonical slug", status: "warn", message: `Slug too long (${s.length})`, fix: "Trim to ≤75 chars." };
  const tokens = s.split("-").filter(Boolean);
  const stopCount = tokens.filter(t => STOP.has(t)).length;
  if (stopCount > 2) return { key: "canonical_slug", label: "Canonical slug", status: "warn", message: `${stopCount} stop words`, fix: "Drop unnecessary stop words." };
  if (primary) {
    const kwSlug = slugifyKw(primary);
    const head = kwSlug.split("-").slice(0, 3).join("-");
    if (head && !s.includes(head)) {
      return { key: "canonical_slug", label: "Canonical slug", status: "warn", message: "Primary keyword not in slug", fix: `Include "${head}".` };
    }
  }
  return { key: "canonical_slug", label: "Canonical slug", status: "pass", message: `OK (${s.length} chars)` };
}

function checkFaqReadiness(html: string, faqs: { question: string; answer: string }[] | null | undefined, expected: boolean): CompletenessCheck {
  const list = Array.isArray(faqs) ? faqs.filter(f => f && f.question && f.answer) : [];
  if (list.length >= 3) return { key: "faq_schema", label: "FAQ schema", status: "pass", message: `${list.length} FAQ items ready for FAQPage schema` };
  // try to detect inline FAQ headings
  const inlineQ = (html.match(/<h[23][^>]*>[^<]*\?[^<]*<\/h[23]>/gi) || []).length;
  if (inlineQ >= 3) return { key: "faq_schema", label: "FAQ schema", status: "warn", message: `Detected ${inlineQ} inline questions but no structured FAQ list`, fix: "Move them into a FAQ block to enable FAQPage schema." };
  if (!expected) return { key: "faq_schema", label: "FAQ schema", status: "pass", message: "Not required for this page type" };
  return { key: "faq_schema", label: "FAQ schema", status: "fail", message: "No FAQ block (need ≥3 Q/A pairs)", fix: "Add at least 3 FAQ items." };
}

function checkKeywordCoverage(
  html: string,
  primary: string | null | undefined,
  secondary: string[] | null | undefined,
): CompletenessCheck[] {
  const checks: CompletenessCheck[] = [];
  const text = stripTags(html).toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (!primary) {
    checks.push({ key: "primary_keyword", label: "Primary keyword", status: "fail", message: "No primary keyword set", fix: "Assign one." });
  } else {
    const kw = primary.toLowerCase();
    const occ = (text.match(new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")) || []).length;
    const density = wordCount ? (occ / wordCount) * 100 : 0;
    if (occ === 0) checks.push({ key: "primary_keyword", label: "Primary keyword", status: "fail", message: "Not found in content", fix: `Use "${primary}" naturally in body.` });
    else if (density > 4) checks.push({ key: "primary_keyword", label: "Primary keyword", status: "fail", message: `Density ${density.toFixed(1)}% — keyword stuffing`, fix: "Reduce repetitions; vary wording." });
    else if (density > 3) checks.push({ key: "primary_keyword", label: "Primary keyword", status: "warn", message: `Density ${density.toFixed(1)}% — close to stuffing` });
    else if (density < 0.3 && wordCount > 200) checks.push({ key: "primary_keyword", label: "Primary keyword", status: "warn", message: `Density ${density.toFixed(2)}% — increase mentions` });
    else checks.push({ key: "primary_keyword", label: "Primary keyword", status: "pass", message: `${occ} mentions, ${density.toFixed(1)}% density` });
  }

  const sec = (secondary || []).filter(Boolean);
  if (sec.length) {
    const missing = sec.filter(k => !text.includes(k.toLowerCase()));
    if (missing.length === 0) checks.push({ key: "secondary_keywords", label: "Secondary keywords", status: "pass", message: `All ${sec.length} present` });
    else if (missing.length <= sec.length / 2) checks.push({ key: "secondary_keywords", label: "Secondary keywords", status: "warn", message: `${missing.length}/${sec.length} missing: ${missing.slice(0, 3).join(", ")}` });
    else checks.push({ key: "secondary_keywords", label: "Secondary keywords", status: "fail", message: `${missing.length}/${sec.length} missing` });
  }

  return checks;
}

export function checkSeoCompleteness(input: CompletenessInput): CompletenessReport {
  const html = input.html || "";
  const checks: CompletenessCheck[] = [];

  checks.push(checkMetaTitle(input.metaTitle, input.primaryKeyword));
  checks.push(checkMetaDescription(input.metaDescription, input.primaryKeyword));
  checks.push(checkCanonicalSlug(input.slug, input.primaryKeyword));
  checks.push(checkFaqReadiness(html, input.faqs ?? null, input.faqExpected ?? true));
  checks.push(...checkKeywordCoverage(html, input.primaryKeyword, input.secondaryKeywords));

  const weights: Record<CompletenessLevel, number> = { pass: 100, warn: 60, fail: 0 };
  const total = checks.reduce((sum, c) => sum + weights[c.status], 0);
  const overall = Math.round(total / Math.max(checks.length, 1));
  const failCount = checks.filter(c => c.status === "fail").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const level: CompletenessLevel = failCount > 0 ? "fail" : warnCount > 1 ? "warn" : "pass";

  const summary = level === "pass"
    ? "All SEO basics covered."
    : level === "warn"
      ? `${warnCount} warning${warnCount > 1 ? "s" : ""} — review before publishing.`
      : `${failCount} blocker${failCount > 1 ? "s" : ""} — fix before publishing.`;

  return { overall, level, checks, summary };
}
