// Deterministic internal-link enrichment for AI blog drafts.
// 1) Links the first prose mention of every allowed exam/college/coaching page.
// 2) Adds "Similar Colleges" and "Related Reads" tables built only from allowed URLs.

export type AllowedLink = { url: string; label?: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const reEsc = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

function kindOf(url: string) {
  if (url.startsWith("/college/")) return "college";
  if (url.startsWith("/exams/")) return "exam";
  if (url.startsWith("/coaching/")) return "coaching";
  if (url.startsWith("/article/")) return "article";
  return "tool";
}

/** Short names an exam page can be mentioned by, e.g. "CAT (Common Admission Test)" -> ["CAT (Common Admission Test)", "Common Admission Test", "CAT"]. */
function namesFor(link: AllowedLink): string[] {
  const label = (link.label || "").trim();
  if (!label) return [];
  const names = new Set<string>([label]);
  const paren = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) { names.add(paren[1].trim()); names.add(paren[2].trim()); }
  return [...names].filter(n => n.length >= 3).sort((a, b) => b.length - a.length);
}

export function linkFirstMentions(html: string, allowed: AllowedLink[], maxLinks = 40): string {
  if (!html) return html;
  const linked = new Set<string>();
  html.replace(/href="([^"]+)"/gi, (_m, u) => { linked.add(u); return _m; });
  const candidates = allowed.filter(l => ["exam", "college", "coaching"].includes(kindOf(l.url)) && !linked.has(l.url));
  // Ambiguity guard: a name shared by two different URLs is never linked.
  const owner = new Map<string, string | null>();
  for (const l of candidates) for (const n of namesFor(l)) {
    const k = n.toLowerCase();
    owner.set(k, owner.has(k) && owner.get(k) !== l.url ? null : l.url);
  }
  const entries = [...owner.entries()].filter(([, u]) => u).sort((a, b) => b[0].length - a[0].length) as [string, string][];
  let added = 0;
  const anchors: string[] = [];
  const parts = html.split(/(<[^>]+>)/g);
  let skipDepth = 0;
  let paraLinks = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith("<")) {
      const tag = p.match(/^<\/?\s*([a-z0-9]+)/i)?.[1]?.toLowerCase() || "";
      if (["a", "h1", "h2", "h3", "h4", "h5", "h6", "code", "pre", "th", "button"].includes(tag)) skipDepth = Math.max(0, skipDepth + (p.startsWith("</") ? -1 : 1));
      if (["p", "li", "td"].includes(tag) && !p.startsWith("</")) paraLinks = 0;
      continue;
    }
    if (skipDepth > 0 || !p.trim() || added >= maxLinks) continue;
    let text = p;
    for (const [name, url] of entries) {
      if (linked.has(url) || paraLinks >= 3 || added >= maxLinks) continue;
      const acronym = name.length <= 6 && !/\s/.test(name);
      const re = acronym
        ? new RegExp(`(^|[^A-Za-z0-9\\u0001])(${reEsc(name.toUpperCase())})(?=[^A-Za-z0-9]|$)`)
        : new RegExp(`(^|[^A-Za-z0-9\\u0001])(${reEsc(name)})(?=[^A-Za-z0-9]|$)`, "i");
      const mm = text.match(re);
      if (!mm || mm.index === undefined) continue;
      const start = mm.index + mm[1].length;
      anchors.push(`<a href="${esc(url)}">${mm[2]}</a>`);
      text = `${text.slice(0, start)}\u0001${anchors.length - 1}\u0001${text.slice(start + mm[2].length)}`;
      linked.add(url); added++; paraLinks++;
    }
    parts[i] = text;
  }
  return parts.join("").replace(/\u0001(\d+)\u0001/g, (_m, idx) => anchors[Number(idx)]);
}

export function buildRelatedTables(html: string, allowed: AllowedLink[], title: string): string {
  const used = new Set<string>();
  html.replace(/href="([^"]+)"/gi, (_m, u) => { used.add(u); return _m; });
  const colleges = allowed.filter(l => kindOf(l.url) === "college" && l.label).slice(0, 8);
  const reads = allowed.filter(l => ["article", "exam", "tool"].includes(kindOf(l.url)) && l.label && !used.has(l.url)).slice(0, 6);
  const rows = (list: AllowedLink[], kindLabel: (l: AllowedLink) => string) =>
    list.map(l => `<tr><td><a href="${esc(l.url)}">${esc(l.label!)}</a></td><td>${kindLabel(l)}</td></tr>`).join("");
  let out = "";
  if (colleges.length >= 2) {
    out += `<h2>Similar Colleges to Check</h2><p>Compare these colleges alongside ${esc(title.replace(/\s*[:|].*$/, ""))} before you finalise your shortlist.</p><table><thead><tr><th>College</th><th>What to compare</th></tr></thead><tbody>${rows(colleges, () => "Fees, cut-offs and placements")}</tbody></table>`;
  }
  if (reads.length >= 2) {
    const lbl = (l: AllowedLink) => ({ article: "Guide", exam: "Exam details", tool: "Free tool" } as Record<string, string>)[kindOf(l.url)] || "Guide";
    out += `<h2>Related Reads</h2><table><thead><tr><th>Page</th><th>Type</th></tr></thead><tbody>${rows(reads, lbl)}</tbody></table>`;
  }
  if (!out) return html;
  const faq = html.search(/<h2[^>]*>\s*Frequently Asked Questions/i);
  return faq >= 0 ? html.slice(0, faq) + out + html.slice(faq) : html + out;
}

export function enrichInternalLinks(html: string, allowed: AllowedLink[] | undefined, title: string): string {
  const list = (allowed || []).filter(l => l && typeof l.url === "string" && l.url.startsWith("/"));
  if (!list.length) return html;
  return buildRelatedTables(linkFirstMentions(html, list), list, title);
}
