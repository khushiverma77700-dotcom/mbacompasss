// Final article structure for AI-written blogs:
//   Summary  →  Table of Contents  →  full article body
//
// Also adds stable heading anchor ids (so the contents links actually jump) and
// bolds important data points (dates, ₹ amounts, percentages, percentiles,
// ranks, package figures) inside paragraphs and list items.

const slugifyHeading = (raw: string, used: Set<string>): string => {
  const base =
    raw
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "section";
  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  used.add(id);
  return id;
};

const textOfHeading = (inner: string): string =>
  inner.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Give every H2/H3 a stable id and return the contents outline. */
export function injectHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const used = new Set<string>();
  const toc: TocEntry[] = [];
  const out = String(html || "").replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, levelRaw: string, attrs: string, inner: string) => {
      const level = Number(levelRaw) === 3 ? 3 : 2;
      const text = textOfHeading(inner);
      if (!text) return `<h${levelRaw}${attrs}>${inner}</h${levelRaw}>`;
      const existing = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs);
      let id: string;
      if (existing && existing[1]) {
        id = existing[1];
        used.add(id);
      } else {
        id = slugifyHeading(text, used);
      }
      const nextAttrs = existing ? attrs : `${attrs} id="${id}"`;
      toc.push({ id, text, level: level as 2 | 3 });
      return `<h${levelRaw}${nextAttrs}>${inner}</h${levelRaw}>`;
    },
  );
  return { html: out, toc };
}

const escapeHtmlText = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Clickable table of contents built from the real headings. */
export function buildTableOfContents(toc: TocEntry[], title = "Table of Contents"): string {
  const usable = toc.filter((t) => t.text.length > 1);
  if (usable.length < 3) return "";
  const items = usable
    .map(
      (t) =>
        `<li class="blog-toc-item blog-toc-h${t.level}"><a href="#${t.id}">${escapeHtmlText(t.text)}</a></li>`,
    )
    .join("");
  return `<nav class="blog-toc" data-no-toc aria-label="${escapeHtmlText(title)}"><p class="blog-toc-title"><strong>${escapeHtmlText(title)}</strong></p><ol class="blog-toc-list">${items}</ol></nav>`;
}

const DATA_PATTERNS: RegExp[] = [
  // ₹ / Rs / INR amounts with optional unit
  /(?:₹|Rs\.?|INR)\s?[\d,.]+(?:\s?(?:lakh|lakhs|lac|lacs|crore|crores|cr|LPA|L))?/gi,
  // percentages and percentiles
  /\d+(?:\.\d+)?\s?(?:%|percentile|per cent|percent)/gi,
  // years and academic cycles
  /\b(?:19|20)\d{2}(?:\s?[-–/]\s?(?:19|20)?\d{2})?\b/g,
  // explicit dates
  /\b\d{1,2}\s(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s\d{4})?\b/gi,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2}(?:,\s?\d{4})?\b/gi,
  // ranks
  /\b(?:rank|ranked|ranking)\s#?\d+\b/gi,
  /\b#\d{1,3}\b/g,
  // packages in LPA
  /\b\d+(?:\.\d+)?\s?LPA\b/gi,
];

const highlightTextRun = (text: string): string => {
  let out = text;
  for (const re of DATA_PATTERNS) {
    out = out.replace(re, (m) => `\u0001${m}\u0002`);
  }
  // Collapse nested markers, then convert to <strong>
  out = out.replace(/\u0001([^\u0001\u0002]*)\u0002/g, (_m, inner: string) => `<strong>${inner}</strong>`);
  return out.replace(/[\u0001\u0002]/g, "");
};

/**
 * Bold key data inside <p> and <li> text. Skips headings, tables, links and text
 * already inside <strong>/<em>, and never bolds a whole block.
 */
export function highlightKeyData(html: string): string {
  return String(html || "").replace(/<(p|li)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (match, tag: string, attrs: string, inner: string) => {
    if (/<(?:table|ul|ol|h[2-6])\b/i.test(inner)) return match;
    let highlightedCount = 0;
    // Walk text runs outside any tag, and outside existing strong/a blocks.
    const parts = inner.split(/(<[^>]+>)/g);
    let inProtected = 0;
    const rebuilt = parts.map((part) => {
      if (/^<\/?(?:strong|b|a|em|code)\b/i.test(part)) {
        if (/^<\//.test(part)) inProtected = Math.max(0, inProtected - 1);
        else inProtected += 1;
        return part;
      }
      if (part.startsWith("<")) return part;
      if (inProtected > 0) return part;
      if (highlightedCount >= 4) return part;
      const next = highlightTextRun(part);
      if (next !== part) highlightedCount += (next.match(/<strong>/g) || []).length;
      return next;
    });
    return `<${tag}${attrs || ""}>${rebuilt.join("")}</${tag}>`;
  });
}

const SUMMARY_HEADING_RE = /<h2[^>]*>\s*summary\s*<\/h2>/i;

/**
 * Compose the final article: a standalone Summary block, then the clickable
 * table of contents, then the full body with highlighted key data.
 *
 * `intro` is rendered above `content` by the article page, so the Summary stays
 * in the intro and the contents box is prepended to the content.
 */
export function structureArticle(intro: string, content: string): { intro: string; content: string; tocCount: number } {
  let introHtml = String(intro || "").trim();

  // Promote the inline "Summary:" lead into a labelled Summary block.
  if (!SUMMARY_HEADING_RE.test(introHtml)) {
    const m = /<p[^>]*>\s*<strong>\s*Summary\s*:?\s*<\/strong>\s*([\s\S]*?)<\/p>/i.exec(introHtml);
    if (m) {
      const rest = introHtml.replace(m[0], "").trim();
      introHtml = `<h2 id="summary">Summary</h2><p>${m[1].trim()}</p>${rest}`;
    }
  }

  const { html: bodyWithIds, toc } = injectHeadingIds(String(content || ""));
  const { html: introWithIds, toc: introToc } = injectHeadingIds(introHtml);
  const fullToc = [...introToc, ...toc];
  const tocHtml = buildTableOfContents(fullToc);

  const highlightedBody = highlightKeyData(bodyWithIds);
  const highlightedIntro = highlightKeyData(introWithIds);

  return {
    intro: highlightedIntro,
    content: tocHtml ? `${tocHtml}\n${highlightedBody}` : highlightedBody,
    tocCount: fullToc.length,
  };
}
