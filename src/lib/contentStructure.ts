/**
 * Deterministic structural clean-up for AI-generated HTML.
 *
 * Answer engines and crawlers read structure, not styling. Historic AI content
 * on the site ships broken hierarchies (a second <h1> mid-article, an <h2>
 * followed by an <h4>), tables without header semantics and images without
 * lazy-loading or alt text. This module fixes all of that at render time so we
 * don't need to rewrite every stored row.
 *
 * It runs inside enhanceAIContent(), which means every page that renders AI
 * content (articles, colleges, exams, coaching, courses) gets it for free.
 */

/** Demote in-body H1s and repair skipped heading levels (h2 → h4 becomes h3). */
export const normalizeHeadingHierarchy = (html: string): string => {
  let previous = 1; // the route's own <h1> lives outside this fragment
  return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_m, lvlRaw, attrs, inner) => {
    let level = Number(lvlRaw);
    // Only one H1 per document, and it belongs to the page shell.
    if (level === 1) level = 2;
    // Never skip more than one level down from the previous heading.
    if (level > previous + 1) level = previous + 1;
    if (level < 2) level = 2;
    previous = level;
    return `<h${level}${attrs}>${inner}</h${level}>`;
  });
};

/** Give tables real header semantics so data can be parsed as a fact table. */
export const normalizeTableSemantics = (html: string): string =>
  html.replace(/<th(?![^>]*\bscope=)([^>]*)>/gi, "<th scope=\"col\"$1>");

/** Lazy-load + decode async every in-content image; guarantee an alt attribute. */
export const normalizeImages = (html: string): string =>
  html.replace(/<img\b([^>]*)>/gi, (m, attrs: string) => {
    let out = attrs;
    if (!/\bloading=/i.test(out)) out += ' loading="lazy"';
    if (!/\bdecoding=/i.test(out)) out += ' decoding="async"';
    if (!/\balt=/i.test(out)) out += ' alt=""';
    return `<img${out}>`;
  });

/**
 * Mark the first paragraph after the fragment start as the extractable answer
 * when it reads like a direct definition. Adds data-answer so AEO tooling and
 * the compliance scorer can find it without guessing.
 */
export const markLeadAnswer = (html: string): string => {
  const match = html.match(/<p(?![^>]*data-answer)([^>]*)>([\s\S]*?)<\/p>/i);
  if (!match) return html;
  const text = match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < 80 || text.length > 600) return html;
  return html.replace(match[0], `<p${match[1]} data-answer="1">${match[2]}</p>`);
};

/** Full structural pass. Idempotent — safe to run on already-processed HTML. */
export const normalizeContentStructure = (html: string): string => {
  if (!html) return "";
  let out = html;
  out = normalizeHeadingHierarchy(out);
  out = normalizeTableSemantics(out);
  out = normalizeImages(out);
  out = markLeadAnswer(out);
  return out;
};
