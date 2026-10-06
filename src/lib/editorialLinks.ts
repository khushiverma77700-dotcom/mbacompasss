export type EditorialKind = "colleges" | "exams" | "coachings" | "tools";
export type EditorialTarget = { label: string; url: string; kind: EditorialKind; aliases: string[] };
export type EditorialMatch = { start: number; end: number; text: string; target: EditorialTarget };

export const EDITORIAL_TOOLS: EditorialTarget[] = [
  { label: "College Shortlister", url: "/college-shortlister", kind: "tools", aliases: [] },
  { label: "Profile Analyzer", url: "/profile-analyzer", kind: "tools", aliases: ["Profile Analyser"] },
  { label: "MBA ROI Calculator", url: "/mba-roi-calculator", kind: "tools", aliases: [] },
  { label: "Compare Colleges", url: "/compare", kind: "tools", aliases: [] },
  { label: "Mock Tests", url: "/mocks", kind: "tools", aliases: [] },
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normal = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

/** Ambiguous aliases never choose an arbitrary campus or coaching branch. */
export function createEditorialMatcher(targets: EditorialTarget[]) {
  const names = new Map<string, { name: string; target: EditorialTarget }[]>();
  for (const target of targets) {
    for (const name of new Set([target.label, ...target.aliases].map(v => v.trim()).filter(v => v.length >= 3))) {
      const key = normal(name);
      const bucket = names.get(key) || [];
      if (!bucket.some(v => v.target.url === target.url)) bucket.push({ name, target });
      names.set(key, bucket);
    }
  }
  const unique = new Map([...names].filter(([, values]) => values.length === 1).map(([key, values]) => [key, values[0]]));
  const pattern = [...unique.values()].sort((a, b) => b.name.length - a.name.length).map(v => escape(v.name).replace(/\s+/g, "\\s+"));
  const regex = pattern.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern.join("|")})(?![\\p{L}\\p{N}])`, "giu") : null;
  return (text: string): EditorialMatch[] => {
    if (!regex) return [];
    regex.lastIndex = 0;
    const result: EditorialMatch[] = [];
    for (const match of text.matchAll(regex)) {
      const entry = unique.get(normal(match[0]));
      if (!entry) continue;
      // Short uppercase abbreviations are case-sensitive: CAT is an exam, cat is not.
      if (/^[A-Z.]{3,6}$/.test(entry.name) && match[0] !== entry.name) continue;
      result.push({ start: match.index, end: match.index + match[0].length, text: match[0], target: entry.target });
    }
    return result;
  };
}

const SKIP = "a,button,input,textarea,select,code,pre,script,style,nav,header,footer,h1,h2,h3,h4,[role=button],[contenteditable],[data-no-interlink],.not-prose,[data-ad-slot],aside";

/** Only link editorial sentences; preserve existing links, headings and interactive UI. */
export function linkEditorialContent(root: HTMLElement, targets: EditorialTarget[], pathname: string) {
  const match = createEditorialMatcher(targets);
  const seen = new Set<string>([pathname.replace(/\/$/, "")]);
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(a => {
    try { if ([window.location.hostname, "mbacompass.in", "www.mbacompass.in"].includes(a.hostname)) seen.add(a.pathname.replace(/\/$/, "")); } catch { /* invalid existing link */ }
  });
  const paragraphs = root.querySelectorAll<HTMLElement>("p,li,td,dd");
  const words = (root.textContent || "").split(/\s+/).length;
  const budget = Math.min(24, Math.max(3, Math.floor(words / 80)));
  let added = 0;
  const existing = root.querySelectorAll("a[data-editorial-link]").length;
  for (const paragraph of paragraphs) {
    if (paragraph.closest(SKIP) || added + existing >= budget) continue;
    let inParagraph = paragraph.querySelectorAll("a").length;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) if (walker.currentNode instanceof Text) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement?.closest(SKIP) || inParagraph >= 3 || added + existing >= budget) continue;
      const text = node.data;
      const matches = match(text).filter(m => !seen.has(m.target.url));
      const fragment = document.createDocumentFragment();
      let offset = 0;
      for (const found of matches) {
        if (seen.has(found.target.url) || inParagraph >= 3 || added + existing >= budget) continue;
        fragment.append(document.createTextNode(text.slice(offset, found.start)));
        const anchor = document.createElement("a");
        anchor.href = found.target.url;
        anchor.textContent = found.text;
        anchor.className = "text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary";
        anchor.dataset.editorialLink = "true";
        fragment.append(anchor);
        offset = found.end;
        seen.add(found.target.url);
        inParagraph++; added++;
      }
      if (offset) { fragment.append(document.createTextNode(text.slice(offset))); node.replaceWith(fragment); }
    }
  }
  return added;
}