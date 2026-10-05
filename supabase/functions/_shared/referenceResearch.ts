// Priority-based source research for AI writers.
//
// Admin-supplied reference URLs are always the HIGHEST priority source. They are
// read first (Firecrawl scrape via the Lovable connector gateway) and their text
// is handed to the model as primary evidence. Supplemental web search only runs
// when the supplied links do not give enough material (or none were supplied),
// and every source actually used is reported back so the admin can see it.

import { firecrawlScrape, firecrawlSearch, firecrawlConfigured } from "./firecrawlGateway.ts";

export interface SourceExtract {
  headings: string[];
  tables: number;
  numbers: number;
  dates: number;
  facts: string[];
}

export interface ReferenceSource {
  url: string;
  title: string;
  /** "primary" = admin-supplied link, "supplemental" = found by extra research. */
  kind: "primary" | "supplemental";
  status: "read" | "unreadable" | "skipped";
  /** Tool that produced this source. */
  tool: string;
  chars: number;
  excerpt: string;
  /** Structured counts so the admin can see what was extracted. */
  extracted?: SourceExtract;
}

export interface ReferenceResearch {
  sources: ReferenceSource[];
  toolsUsed: string[];
  supplementalUsed: boolean;
  notes: string[];
}

const MAX_URLS = 8;
const MAX_CHARS_PER_SOURCE = 40000;
const MIN_PRIMARY_CHARS = 1200;

export const normalizeReferenceUrls = (input: unknown): string[] => {
  const raw: string[] = Array.isArray(input)
    ? input.map((v) => String(v))
    : String(input || "").split(/[\s,]+/);
  const out: string[] = [];
  for (const item of raw) {
    const candidate = item.trim().replace(/[.,;)]+$/, "");
    if (!candidate) continue;
    const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    try {
      const u = new URL(withScheme);
      if (!/^https?:$/.test(u.protocol)) continue;
      if (!u.hostname.includes(".")) continue;
      const clean = u.toString();
      if (!out.includes(clean)) out.push(clean);
    } catch {
      continue;
    }
    if (out.length >= MAX_URLS) break;
  }
  return out;
};

const textOf = (payload: unknown): { text: string; title: string } => {
  const p = (payload ?? {}) as Record<string, any>;
  const body = p["data"] && typeof p["data"] === "object" ? p["data"] : p;
  const text = String(body["markdown"] || body["summary"] || body["html"] || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  const title = String(body["metadata"]?.title || body["title"] || "").trim();
  return { text, title };
};

const decode = (t: string) =>
  t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8377;|&#x20b9;/gi, "₹").replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#8217;|&rsquo;|&#8216;|&lsquo;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/g, "–").replace(/&#\d+;/g, " ");

/** Convert article HTML to markdown-like text, keeping headings and tables intact. */
export function htmlToResearchText(html: string): { text: string; title: string } {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim());
  let body = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
  body = body.replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  body = body.replace(/<table[\s\S]*?<\/table>/gi, (tbl) => {
    const rows = [...tbl.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) =>
      [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => decode(c[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()),
    ).filter((r) => r.length);
    if (!rows.length) return " ";
    const out = rows.map((r) => `| ${r.join(" | ")} |`);
    out.splice(1, 0, `| ${rows[0].map(() => "---").join(" | ")} |`);
    return `\n\n${out.join("\n")}\n\n`;
  });
  body = body.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, l, t) => `\n\n${"#".repeat(Number(l))} ${String(t).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n\n`);
  body = body.replace(/<li[^>]*>/gi, "\n- ").replace(/<\/(p|div|li|section)>|<br\s*\/?>/gi, "\n");
  const text = decode(body.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text, title };
}

async function directRead(url: string): Promise<{ text: string; title: string }> {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MBACompassResearch/1.0)", Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`the page returned HTTP ${r.status}`);
  const type = r.headers.get("content-type") || "";
  if (!/html|text/i.test(type)) throw new Error(`unsupported content type ${type}`);
  return htmlToResearchText(await r.text());
}

/** Count headings, tables, figures and dates; pull the fact-bearing lines. */
export function extractStructure(text: string): SourceExtract {
  const headings = [...text.matchAll(/^#{1,4} (.+)$/gm)].map((m) => m[1].trim()).slice(0, 40);
  const tables = (text.match(/^\| ?---/gm) || []).length;
  const numbers = (text.match(/(₹|Rs\.?|INR)\s?[\d,.]+(\s?(lakh|lakhs|crore|L|Cr))?|\b\d+(\.\d+)?\s?(%|lakh|lakhs|crore|LPA)\b/gi) || []).length;
  const dates = (text.match(/\b(\d{1,2}\s)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s\d{4}\b|\b20\d{2}[-/]\d{2}[-/]\d{2}\b/gi) || []).length;
  const facts = text.split(/\n/).map((l) => l.trim())
    .filter((l) => l.length > 20 && l.length < 400 && /\d/.test(l) && !/^\| ?---/.test(l))
    .slice(0, 80);
  return { headings, tables, numbers, dates, facts };
}

/**
 * Read the admin's reference links first, then (only if needed) look for extra
 * trusted sources. Never throws — a failed link is reported, not fatal.
 * Uses Firecrawl when connected and the built-in page reader otherwise.
 */
export async function researchReferences(opts: {
  urls?: unknown;
  topic: string;
  keyword?: string;
}): Promise<ReferenceResearch> {
  const urls = normalizeReferenceUrls(opts.urls);
  const sources: ReferenceSource[] = [];
  const toolsUsed: string[] = [];
  const notes: string[] = [];
  const useFirecrawl = firecrawlConfigured();

  if (urls.length) toolsUsed.push(useFirecrawl ? "Firecrawl page reader (reference links)" : "Built-in page reader (reference links)");

  for (const url of urls) {
    let text = "", title = "", tool = "";
    if (useFirecrawl) {
      try {
        const got = textOf(await firecrawlScrape(url, ["markdown"]));
        text = got.text; title = got.title; tool = "Firecrawl page reader";
      } catch {
        notes.push(`Firecrawl could not read ${url}; the built-in reader was used instead.`);
      }
    }
    if (text.length < 200) {
      try {
        const got = await directRead(url);
        text = got.text; title = title || got.title; tool = "Built-in page reader";
      } catch (e) {
        notes.push(`Could not read ${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (text.length < 200) {
      sources.push({ url, title: title || url, kind: "primary", status: "unreadable", tool: tool || "page reader", chars: text.length, excerpt: "" });
      continue;
    }
    sources.push({
      url, title: title || url, kind: "primary", status: "read", tool,
      chars: text.length, excerpt: text.slice(0, MAX_CHARS_PER_SOURCE), extracted: extractStructure(text),
    });
  }

  const primaryChars = sources
    .filter((s) => s.kind === "primary" && s.status === "read")
    .reduce((sum, s) => sum + s.chars, 0);

  let supplementalUsed = false;
  if (primaryChars < MIN_PRIMARY_CHARS && useFirecrawl) {
    const query = `${opts.topic} ${opts.keyword || ""} official latest data India MBA`.trim();
    const results = await firecrawlSearch({
      query,
      limit: 4,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    });
    if (results.length) {
      supplementalUsed = true;
      toolsUsed.push("Firecrawl web search (additional trusted sources)");
      notes.push(
        urls.length
          ? "The reference links did not contain enough material, so additional trusted sources were searched."
          : "No reference links were supplied, so trusted sources were searched for this topic.",
      );
      for (const r of results) {
        const text = String(r.markdown || r.description || r.snippet || "").replace(/<[^>]+>/g, " ").trim();
        sources.push({
          url: r.url,
          title: r.title || r.url,
          kind: "supplemental",
          status: text.length > 200 ? "read" : "unreadable",
          tool: "Firecrawl web search",
          chars: text.length,
          excerpt: text.slice(0, 12000),
          extracted: extractStructure(text),
        });
      }
    } else if (urls.length) {
      notes.push("No additional sources were available, so only the supplied links and verified database facts were used.");
    }
  }

  return { sources, toolsUsed, supplementalUsed, notes };
}

/** Prompt block pinning source priority and the no-unverified-data rule. */
export function referenceGroundingRules(research?: ReferenceResearch | null): string {
  if (!research || !research.sources.length) {
    return `

## SOURCE ACCURACY (no reference links supplied)
- Do NOT invent, estimate or "recall" any statistic, fee, date, cutoff, ranking, percentile or package.
- Use only figures present in the verified database facts above. If a number is not supplied, describe the point qualitatively instead — never guess and never write placeholders such as "XX".
- Name authoritative sources as plain text only when genuinely applicable (official notification, official placement report, NIRF).`;
  }

  const primary = research.sources.filter((s) => s.kind === "primary" && s.status === "read");
  const supplemental = research.sources.filter((s) => s.kind === "supplemental" && s.status === "read");
  const failed = research.sources.filter((s) => s.status !== "read");

  const block = (label: string, list: ReferenceSource[]) =>
    list
      .map(
        (s, i) => `### ${label} ${i + 1}: ${s.title}
URL: ${s.url}
EXTRACTED CONTENT:
"""
${s.excerpt}
"""`,
      )
      .join("\n\n");

  return `

## SOURCE PRIORITY (STRICT)
1. PRIMARY SOURCES below (supplied by the editor) outrank everything else. Every fact, statistic, date, fee, deadline, ranking, cutoff, percentile, package and definition you write must come from these primary sources first, or from the verified database facts above.
2. SUPPLEMENTAL SOURCES (only present when the primary sources were insufficient) may be used to fill gaps, and only when the primary sources are silent on that point.
3. If neither carries a number, write the point qualitatively. NEVER invent, average, round up or "remember" a figure. No placeholders such as "XX" or "approximately (estimate)".
4. Where a specific figure, date or ranking comes from a source, mention the source by plain-text name (e.g. "as per the official admission notification") — never fabricate URLs or citation markers.
5. If a primary source contradicts your own recollection, the primary source wins.

${primary.length ? `## PRIMARY SOURCES (highest priority)\n\n${block("PRIMARY SOURCE", primary)}` : "## PRIMARY SOURCES\nNone of the supplied links could be read — rely strictly on verified database facts."}
${supplemental.length ? `\n\n## SUPPLEMENTAL SOURCES (lower priority)\n\n${block("SUPPLEMENTAL SOURCE", supplemental)}` : ""}
${failed.length ? `\n\nUnreadable links (do NOT cite): ${failed.map((s) => s.url).join(", ")}` : ""}`;
}

/** Compact report saved on the job so admins can see which sources were used. */
export function referenceReport(research?: ReferenceResearch | null) {
  if (!research) return null;
  return {
    toolsUsed: research.toolsUsed,
    supplementalUsed: research.supplementalUsed,
    notes: research.notes,
    sources: research.sources.map((s) => ({
      url: s.url,
      title: s.title,
      kind: s.kind,
      status: s.status,
      tool: s.tool,
      chars: s.chars,
      extracted: s.extracted || null,
    })),
  };
}
