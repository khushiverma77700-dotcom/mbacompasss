// SEO Validators & Scorers — pure TS, usable in client + edge functions
// Implements rules from the SEO upgrade plan (titles, meta, URL, keyword
// placement, content score, E-E-A-T, image audit, freshness).

export type ValidationStatus = "pass" | "warn" | "fail";

export interface ValidationResult {
  status: ValidationStatus;
  score: number; // 0-100
  message: string;
  fix?: string;
  details?: Record<string, any>;
}

const POWER_WORDS = [
  "best","top","ultimate","complete","proven","essential","guide","2026",
  "expert","trusted","official","latest","new","free","easy","fast",
  "powerful","detailed","comprehensive","step-by-step",
];

const CTA_VERBS = [
  "learn","discover","explore","get","find","compare","start","apply",
  "download","read","see","check","try","join","unlock","calculate","know",
];

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","of","in","on","at","to","for","with",
  "by","from","is","are","was","were","be","been","being","this","that",
]);

const norm = (s?: string | null) => (s || "").toLowerCase().trim();

// ---------- TITLE ----------
export const validateTitle = (title?: string | null, primaryKw?: string | null): ValidationResult => {
  const t = (title || "").trim();
  if (!t) return { status: "fail", score: 0, message: "Title is missing", fix: "Add a 55–60 character title" };

  const len = t.length;
  const lower = t.toLowerCase();
  const kw = norm(primaryKw);
  const issues: string[] = [];
  let score = 100;

  if (len < 50 || len > 65) {
    score -= 25;
    issues.push(`Length is ${len} (target 55–60)`);
  }
  if (kw) {
    if (!lower.includes(kw)) {
      score -= 30;
      issues.push("Primary keyword missing");
    } else if (!lower.startsWith(kw.slice(0, Math.min(kw.length, 20)))) {
      score -= 10;
      issues.push("Primary keyword should appear at the start");
    }
  }
  const hasYear = /20(2[5-9]|3\d)/.test(t);
  if (!hasYear) {
    score -= 10;
    issues.push("Add a year (e.g. 2026)");
  }
  const hasPower = POWER_WORDS.some((w) => lower.includes(w));
  if (!hasPower) {
    score -= 10;
    issues.push("Consider adding a power word");
  }

  score = Math.max(0, score);
  const status: ValidationStatus = score >= 85 ? "pass" : score >= 60 ? "warn" : "fail";
  return {
    status,
    score,
    message: issues.length ? issues.join("; ") : "Title is well optimized",
    details: { length: len, hasYear, hasPower },
  };
};

// ---------- META DESCRIPTION ----------
export const validateMetaDescription = (
  meta?: string | null,
  primaryKw?: string | null,
  allOtherMetas: string[] = [],
): ValidationResult => {
  const m = (meta || "").trim();
  if (!m) return { status: "fail", score: 0, message: "Meta description missing", fix: "Add a 120–150 char description" };

  const len = m.length;
  const lower = m.toLowerCase();
  const kw = norm(primaryKw);
  const issues: string[] = [];
  let score = 100;

  if (len > 150) { score -= 25; issues.push(`Too long (${len}, max 150)`); }
  else if (len < 110) { score -= 15; issues.push(`Too short (${len}, target 120–150)`); }

  if (kw && !lower.includes(kw)) { score -= 25; issues.push("Primary keyword missing"); }

  const hasCTA = CTA_VERBS.some((v) => new RegExp(`\\b${v}\\b`, "i").test(m));
  if (!hasCTA) { score -= 15; issues.push("No CTA verb (e.g. learn, discover, compare)"); }

  const isDuplicate = allOtherMetas.some((other) => other && other.trim().toLowerCase() === lower);
  if (isDuplicate) { score -= 30; issues.push("Duplicate of another page's meta"); }

  score = Math.max(0, score);
  const status: ValidationStatus = score >= 85 ? "pass" : score >= 60 ? "warn" : "fail";
  return { status, score, message: issues.length ? issues.join("; ") : "Meta description is well optimized", details: { length: len, hasCTA, isDuplicate } };
};

// ---------- URL ----------
export const validateUrl = (path?: string | null, primaryKw?: string | null): ValidationResult => {
  const p = (path || "").trim().replace(/^\//, "").replace(/\/$/, "");
  if (!p) return { status: "fail", score: 0, message: "URL is empty" };

  const slug = p.split("/").pop() || "";
  const issues: string[] = [];
  let score = 100;

  if (/\s/.test(slug)) { score -= 30; issues.push("Contains spaces"); }
  if (/_/.test(slug)) { score -= 15; issues.push("Use hyphens, not underscores"); }
  if (/\d{3,}/.test(slug)) { score -= 10; issues.push("Avoid long numbers in URL"); }
  if (slug.length > 70) { score -= 15; issues.push(`Slug too long (${slug.length})`); }

  const tokens = slug.toLowerCase().split("-").filter(Boolean);
  const stopCount = tokens.filter((t) => STOP_WORDS.has(t)).length;
  if (stopCount > 1) { score -= 10; issues.push(`${stopCount} stop words in slug`); }

  const kw = norm(primaryKw).replace(/\s+/g, "-");
  if (kw && !slug.toLowerCase().includes(kw.slice(0, Math.min(kw.length, 25)))) {
    score -= 20;
    issues.push("Primary keyword not in URL");
  }

  score = Math.max(0, score);
  const status: ValidationStatus = score >= 85 ? "pass" : score >= 60 ? "warn" : "fail";
  return { status, score, message: issues.length ? issues.join("; ") : "URL is SEO-friendly", details: { slug, length: slug.length } };
};

// ---------- KEYWORD PLACEMENT ----------
export const validateKeywordPlacement = (
  primaryKw: string | null | undefined,
  args: { html?: string | null; h1?: string | null; url?: string | null; },
): ValidationResult => {
  const kw = norm(primaryKw);
  if (!kw) return { status: "fail", score: 0, message: "No primary keyword set", fix: "Assign a primary keyword" };

  const html = args.html || "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.toLowerCase().split(/\s+/);
  const first100 = words.slice(0, 100).join(" ");
  const h1 = norm(args.h1);
  const url = norm(args.url);

  const checks = {
    inH1: h1.includes(kw),
    inUrl: url.replace(/-/g, " ").includes(kw),
    inFirst100: first100.includes(kw),
    inH2H3: /<h[23][^>]*>[^<]*?{kw}[^<]*?<\/h[23]>/i
      .test(html.replace(/{kw}/g, kw)) || new RegExp(`<h[23][^>]*>[^<]*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*</h[23]>`, "i").test(html),
    inAlt: new RegExp(`alt=["'][^"']*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["']`, "i").test(html),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const score = Math.round((passed / total) * 100);

  // density
  const occurrences = words.filter((w) => w.includes(kw.split(" ")[0])).length;
  const density = words.length ? (occurrences / words.length) * 100 : 0;
  const densityWarn = density > 3 ? "Keyword density too high (>3%)" : density < 0.3 ? "Keyword density too low (<0.3%)" : null;

  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const status: ValidationStatus = score >= 80 ? "pass" : score >= 50 ? "warn" : "fail";
  return {
    status,
    score,
    message: missing.length ? `Missing in: ${missing.join(", ")}` : "Keyword placed in all key zones",
    details: { ...checks, density: Number(density.toFixed(2)), densityWarn },
  };
};

// ---------- CONTENT SCORE ----------
export const scoreContent = (html?: string | null): ValidationResult => {
  const h = html || "";
  const text = h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const paragraphs = h.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const paraWordCounts = paragraphs.map((p) => p.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length);
  const avgParaLen = paraWordCounts.length ? paraWordCounts.reduce((a, b) => a + b, 0) / paraWordCounts.length : 0;

  const h1Count = (h.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (h.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (h.match(/<h3[\s>]/gi) || []).length;
  const hasFAQ = /faq|frequently asked/i.test(h) || /<h[23][^>]*>[^<]*\?[^<]*<\/h[23]>/i.test(h);
  const hasNumbers = (text.match(/\d+(\.\d+)?/g) || []).length >= 5;
  const hasLists = /<(ul|ol)[\s>]/i.test(h);

  let score = 0;
  if (wordCount >= 1500) score += 30;
  else if (wordCount >= 800) score += 20;
  else if (wordCount >= 400) score += 10;

  if (avgParaLen > 0 && avgParaLen <= 20) score += 15;
  else if (avgParaLen <= 30) score += 8;

  if (h1Count === 1) score += 10;
  if (h2Count >= 3) score += 10;
  if (h3Count >= 2) score += 5;
  if (hasFAQ) score += 15;
  if (hasNumbers) score += 10;
  if (hasLists) score += 5;

  score = Math.min(100, score);
  const status: ValidationStatus = score >= 80 ? "pass" : score >= 55 ? "warn" : "fail";
  return {
    status,
    score,
    message: `${wordCount} words, ${paragraphs.length} paragraphs, FAQ: ${hasFAQ ? "yes" : "no"}`,
    details: { wordCount, avgParaLen: Math.round(avgParaLen), h1Count, h2Count, h3Count, hasFAQ, hasNumbers, hasLists },
  };
};

// ---------- E-E-A-T ----------
export const scoreEEAT = (args: {
  html?: string | null;
  author?: string | null;
  updatedAt?: string | null;
  internalLinkCount?: number;
  hasSchema?: boolean;
}): ValidationResult => {
  const h = args.html || "";
  let score = 0;
  const checks = {
    hasAuthor: Boolean(args.author && args.author.trim()),
    hasUpdatedDate: Boolean(args.updatedAt),
    hasCitations: /<a[^>]+href=["']https?:\/\/[^"']+["'][^>]*>/i.test(h),
    hasInternalLinks: (args.internalLinkCount || 0) >= 3,
    hasSchema: Boolean(args.hasSchema),
    hasNumbers: ((h.replace(/<[^>]+>/g, " ").match(/\d+(\.\d+)?/g) || []).length) >= 5,
  };
  if (checks.hasAuthor) score += 20;
  if (checks.hasUpdatedDate) score += 15;
  if (checks.hasCitations) score += 15;
  if (checks.hasInternalLinks) score += 20;
  if (checks.hasSchema) score += 20;
  if (checks.hasNumbers) score += 10;

  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const status: ValidationStatus = score >= 80 ? "pass" : score >= 50 ? "warn" : "fail";
  return {
    status,
    score,
    message: missing.length ? `Missing: ${missing.join(", ")}` : "Strong E-E-A-T signals",
    details: checks,
  };
};

// ---------- IMAGE AUDIT ----------
export interface ImageAuditDetail {
  src: string;
  alt: string;
  hasAlt: boolean;
  format: string;
  isModern: boolean;
}

export const auditImages = (html?: string | null): ValidationResult & { images: ImageAuditDetail[] } => {
  const h = html || "";
  const imgTags = h.match(/<img[^>]+>/gi) || [];
  const images: ImageAuditDetail[] = imgTags.map((tag) => {
    const src = (tag.match(/src=["']([^"']+)["']/i)?.[1]) || "";
    const alt = (tag.match(/alt=["']([^"']*)["']/i)?.[1]) || "";
    const ext = (src.split("?")[0].split(".").pop() || "").toLowerCase();
    const isModern = ext === "webp" || ext === "avif";
    return { src, alt, hasAlt: alt.trim().length > 0, format: ext || "unknown", isModern };
  });

  const count = images.length;
  const altPct = count ? Math.round((images.filter((i) => i.hasAlt).length / count) * 100) : 0;
  const modernPct = count ? Math.round((images.filter((i) => i.isModern).length / count) * 100) : 0;

  let score = 0;
  if (count >= 4) score += 30; else if (count >= 2) score += 15;
  score += Math.round(altPct * 0.4);
  score += Math.round(modernPct * 0.3);
  score = Math.min(100, score);

  const issues: string[] = [];
  if (count < 4) issues.push(`Only ${count} images (target ≥4)`);
  if (altPct < 100) issues.push(`${100 - altPct}% images missing ALT text`);
  if (modernPct < 80) issues.push(`${100 - modernPct}% not WebP/AVIF`);

  const status: ValidationStatus = score >= 80 ? "pass" : score >= 50 ? "warn" : "fail";
  return {
    status,
    score,
    message: issues.length ? issues.join("; ") : "Images well optimized",
    details: { count, altPct, modernPct },
    images,
  };
};

// ---------- FRESHNESS ----------
export const isStale = (updatedAt?: string | null, days = 90): boolean => {
  if (!updatedAt) return true;
  const d = new Date(updatedAt).getTime();
  if (Number.isNaN(d)) return true;
  return Date.now() - d > days * 24 * 60 * 60 * 1000;
};

export const daysSince = (date?: string | null): number => {
  if (!date) return Infinity;
  const d = new Date(date).getTime();
  if (Number.isNaN(d)) return Infinity;
  return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
};

// ---------- AGGREGATE PAGE SCORE ----------
export const aggregatePageScore = (results: ValidationResult[]): number => {
  if (!results.length) return 0;
  const sum = results.reduce((acc, r) => acc + r.score, 0);
  return Math.round(sum / results.length);
};
