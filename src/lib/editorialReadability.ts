/** Pure display cleanup: no database edits, invented copy or DOM observers. */
const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
const keyOf = (html: string) => textOf(html).toLowerCase().replace(/^\d+[.)]\s*/, '').replace(/[^\p{L}\p{N}]/gu, '');
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const labelRE = /^(?:table\s+of\s+contents|contents|on\s+this\s+page)\s*:?$/i;

export function splitLongParagraphs(html: string): string {
  return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (original, attrs: string, inner: string) => {
    if (/data-no-readability/.test(attrs) || /<(?:img|table|ul|ol|code|br)\b/i.test(inner) || textOf(inner).split(/\s+/).length < 85) return original;
    const chunks: string[] = [];
    let current = '';
    let depth = 0;
    for (const part of inner.split(/(<[^>]+>)/g)) {
      if (part.startsWith('<')) {
        if (/^<\//.test(part)) depth = Math.max(0, depth - 1);
        else if (!/\/\s*>$/.test(part) && !/^<(?:wbr|hr|input)\b/i.test(part)) depth += 1;
        current += part;
        continue;
      }
      if (depth > 0) { current += part; continue; }
      const sentences = part.split(/(?<=[.!?])\s+(?=[A-Z“"\d])/);
      sentences.forEach((sentence, index) => {
        current += sentence;
        const abbreviation = /\b(?:Mr|Mrs|Ms|Dr|Prof|Rs|No|St|vs|etc|e\.g|i\.e)\.$/i.test(sentence);
        if (index < sentences.length - 1 && !abbreviation && textOf(current).split(/\s+/).length >= 45) {
          chunks.push(current.trim()); current = '';
        } else if (index < sentences.length - 1) current += ' ';
      });
    }
    if (current.trim()) chunks.push(current.trim());
    if (chunks.length < 2) return original;
    const subsequentAttrs = attrs.replace(/\s+(?:id|data-answer)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
    return chunks.map((chunk, index) => `<p${index === 0 ? attrs : subsequentAttrs}>${chunk}</p>`).join('\n');
  });
}

export function formatEditorialReadability(html: string): string {
  let out = html.replace(/<nav\b[^>]*class=["'][^"']*\bblog-toc\b[^"']*["'][^>]*>[\s\S]*?<\/nav>\s*/gi, '');
  out = out.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (original, attrs: string, inner: string) => {
    const lines = inner.split(/<br\s*\/?\s*>|\n/gi).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2 || !lines.every((line) => /^(?:[•▪*-]|\d+[.)])\s+/.test(line))) return original;
    const tag = /^\d/.test(lines[0]) ? 'ol' : 'ul';
    return `<${tag}${attrs}>${lines.map((line) => `<li>${line.replace(/^(?:[•▪*-]|\d+[.)])\s+/, '')}</li>`).join('')}</${tag}>`;
  });
  out = out.replace(/<p\b[^>]*>\s*<(?:strong|b)>([^<]{3,100})<\/(?:strong|b)>\s*<\/p>(?=\s*<p\b)/gi,
    (original, label: string) => labelRE.test(label.trim()) || /[.!?]$/.test(label.trim()) ? original : `<h3>${label}</h3>`);
  const headingKeys = new Set(Array.from(out.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi), (match) => keyOf(match[1])));
  // Consume only a labelled contents block, stopping at the first real prose block.
  // Scan blocks once; nested wildcard repetitions can hang on long articles.
  let inContents = false;
  out = out.replace(/<(p|ul|ol|h[2-6])\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (block: string, tag: string, inner: string) => {
      if (labelRE.test(textOf(inner))) { inContents = true; return ''; }
      if (!inContents) return block;
      if (tag.startsWith('h')) { inContents = false; return block; }
      const names = tag === 'p' ? [keyOf(inner)] : Array.from(inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi), (match) => keyOf(match[1]));
      if (names.length && names.every((name) => headingKeys.has(name))) return '';
      inContents = false;
      return block;
    });
  out = splitLongParagraphs(out);
  const used = new Set(Array.from(out.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi), (match) => match[1]));
  const seen = new Set<string>();
  const entries: { id: string; text: string; level: string }[] = [];
  out = out.replace(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (original, level: string, attrs: string, inner: string) => {
    const text = textOf(inner);
    if (!text) return original;
    let id = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    if (!id || seen.has(id)) {
      const base = keyOf(inner).slice(0, 60) || 'section';
      id = base;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      attrs = attrs.replace(/\s*\bid\s*=\s*["'][^"']*["']/i, '') + ` id="${escape(id)}"`;
    }
    used.add(id); seen.add(id);
    entries.push({ id, text, level });
    return `<h${level}${attrs}>${inner}</h${level}>`;
  });
  if (entries.length < 2) return out;
  const nav = `<nav class="blog-toc" data-no-toc aria-label="Table of contents"><p class="blog-toc-title"><strong>Table of Contents</strong></p><ol class="blog-toc-list">${entries.map((entry) => `<li class="blog-toc-item blog-toc-h${entry.level}"><a href="#${escape(entry.id)}">${escape(entry.text)}</a></li>`).join('')}</ol></nav>`;
  const firstHeading = out.search(/<h[23]\b/i);
  return `${out.slice(0, firstHeading)}${nav}\n${out.slice(firstHeading)}`;
}
