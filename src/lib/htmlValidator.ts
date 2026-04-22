// Pre-save HTML validator for AI-generated content (Blog, College, College Sections).
// Enforces:
//   • allowed tag whitelist (rejects <script>, <style>, <iframe>, etc.)
//   • heading hierarchy (no <h1> in body content; <h2> required when long;
//     no h3 before h2; no question-style headings)
//   • requires at least one <table> when fees / placements / cutoffs are
//     mentioned in the prose
//   • flags inline style="" and class="" that would override .ai-content lock

export type HtmlIssueLevel = "error" | "warning";

export interface HtmlIssue {
  level: HtmlIssueLevel;
  rule: string;
  message: string;
  fix?: string;
}

export interface HtmlValidationReport {
  ok: boolean;
  issues: HtmlIssue[];
  stats: {
    h1: number;
    h2: number;
    h3: number;
    paragraphs: number;
    lists: number;
    tables: number;
    wordCount: number;
  };
}

const ALLOWED_TAGS = new Set([
  "h2","h3","h4","p","ul","ol","li","strong","em","b","i","a","br","hr",
  "table","thead","tbody","tr","th","td","blockquote","code","pre","figure",
  "figcaption","img","span","div",
]);
const FORBIDDEN_TAGS = ["script","style","iframe","object","embed","form","input","button","textarea","select","link","meta","html","head","body"];

const TABLE_TRIGGERS = /\b(fees?|tuition|placement|package|salary|ctc|lpa|cutoff|percentile|recruiter)\b/i;

export function validateHtml(html: string, opts: { context?: "blog" | "college" | "section" } = {}): HtmlValidationReport {
  const h = (html || "").toString();
  const issues: HtmlIssue[] = [];

  // ── Tag scan ──
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)/g;
  let m: RegExpExecArray | null;
  const seenForbidden = new Set<string>();
  const seenUnknown = new Set<string>();
  while ((m = tagRe.exec(h)) !== null) {
    const tag = m[1].toLowerCase();
    if (FORBIDDEN_TAGS.includes(tag) && !seenForbidden.has(tag)) {
      issues.push({ level: "error", rule: "forbidden_tag", message: `<${tag}> is not allowed in content`, fix: `Remove all <${tag}> tags.` });
      seenForbidden.add(tag);
    } else if (!ALLOWED_TAGS.has(tag) && !FORBIDDEN_TAGS.includes(tag) && !seenUnknown.has(tag)) {
      issues.push({ level: "warning", rule: "unknown_tag", message: `<${tag}> is outside the standard whitelist`, fix: `Replace <${tag}> with a semantic tag (p, h2, ul, etc.).` });
      seenUnknown.add(tag);
    }
  }

  // ── Inline-style lockdown ──
  if (/\sstyle\s*=\s*["'][^"']+["']/i.test(h)) {
    issues.push({ level: "warning", rule: "inline_style", message: "Inline style attributes detected", fix: "Remove style=\"…\" attributes — typography is locked via .ai-content." });
  }
  if (/\sclass\s*=\s*["'][^"']+["']/i.test(h)) {
    issues.push({ level: "warning", rule: "inline_class", message: "Inline class attributes detected", fix: "Remove class=\"…\" attributes." });
  }
  if (/<font[\s>]/i.test(h)) {
    issues.push({ level: "error", rule: "font_tag", message: "<font> tag detected", fix: "Replace with semantic <strong> / <em>." });
  }

  // ── Heading hierarchy ──
  const h1 = (h.match(/<h1[\s>]/gi) || []).length;
  const h2 = (h.match(/<h2[\s>]/gi) || []).length;
  const h3 = (h.match(/<h3[\s>]/gi) || []).length;
  const paragraphs = (h.match(/<p[\s>]/gi) || []).length;
  const lists = (h.match(/<(ul|ol)[\s>]/gi) || []).length;
  const tables = (h.match(/<table[\s>]/gi) || []).length;
  const text = h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (h1 > 0) issues.push({ level: "error", rule: "h1_in_body", message: `${h1} <h1> tag(s) inside body content`, fix: "Use <h2> for top-level sections — the page already has its own <h1>." });
  if (wordCount > 250 && h2 === 0) {
    issues.push({ level: "error", rule: "no_h2", message: "Long content without any <h2>", fix: "Break content into <h2> sections." });
  }
  // h3 before any h2
  const firstH2 = h.search(/<h2[\s>]/i);
  const firstH3 = h.search(/<h3[\s>]/i);
  if (firstH3 !== -1 && (firstH2 === -1 || firstH3 < firstH2)) {
    issues.push({ level: "warning", rule: "h3_before_h2", message: "<h3> appears before any <h2>", fix: "Promote the first <h3> to <h2> or add an <h2> before it." });
  }
  // question headings
  const headings = h.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi) || [];
  const questionHeadings = headings.filter(x => /\?\s*<\/h[23]>/i.test(x));
  if (questionHeadings.length >= 2) {
    issues.push({ level: "warning", rule: "question_headings", message: `${questionHeadings.length} headings end with "?"`, fix: "Convert headings to declarative statements." });
  }

  // ── Required <table> when fees/placements present ──
  const wantsTable = TABLE_TRIGGERS.test(text);
  if (wantsTable && tables === 0 && wordCount > 200) {
    issues.push({ level: "warning", rule: "missing_table", message: "Fees / placement / cutoff data mentioned without a <table>", fix: "Add at least one <table> to compare fees, packages or cutoffs." });
  }

  // Context-specific extras
  if (opts.context === "blog" && wordCount > 800 && lists === 0) {
    issues.push({ level: "warning", rule: "no_lists", message: "Long article without any list", fix: "Add at least one <ul> or <ol> for scannability." });
  }

  const ok = !issues.some(i => i.level === "error");
  return {
    ok,
    issues,
    stats: { h1, h2, h3, paragraphs, lists, tables, wordCount },
  };
}
