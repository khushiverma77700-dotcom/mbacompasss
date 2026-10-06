// Firecrawl helper using the Lovable connector gateway.
// The linked Firecrawl connection is gateway-backed, so we must NEVER call
// api.firecrawl.dev directly with the FIRECRAWL_API_KEY (it's a Lovable
// connection key, not a raw Firecrawl key). Always route through
// https://connector-gateway.lovable.dev/firecrawl/...

const FIRECRAWL_GATEWAY = "https://connector-gateway.lovable.dev/firecrawl";

export interface FirecrawlSearchOptions {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  tbs?: string;
  scrapeOptions?: { formats?: string[]; onlyMainContent?: boolean };
}

export interface FirecrawlSearchResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  snippet?: string;
  metadata?: Record<string, any>;
}

export async function firecrawlSearch(options: FirecrawlSearchOptions): Promise<FirecrawlSearchResult[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) {
    console.warn("[firecrawlGateway] Missing LOVABLE_API_KEY or FIRECRAWL_API_KEY");
    return [];
  }

  try {
    const r = await fetch(`${FIRECRAWL_GATEWAY}/v2/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": FIRECRAWL_API_KEY,
      },
      body: JSON.stringify({
        query: options.query,
        limit: options.limit ?? 5,
        lang: options.lang ?? "en",
        country: options.country ?? "in",
        tbs: options.tbs,
        scrapeOptions: options.scrapeOptions,
      }),
    });
    if (!r.ok) {
      console.warn("[firecrawlGateway] search failed", r.status, await r.text().catch(() => ""));
      return [];
    }
    const j = await r.json();
    const raw: any[] = j?.data?.web || j?.data || j?.web || j?.results || [];
    return raw.slice(0, options.limit ?? 5).map((it) => ({
      url: it.url || it.link || "",
      title: it.title || it.metadata?.title || "",
      description: it.description || it.snippet || "",
      markdown: it.markdown || "",
      snippet: (it.description || it.snippet || "").slice(0, 300),
      metadata: it.metadata || {},
    })).filter((it) => it.url);
  } catch (e) {
    console.warn("[firecrawlGateway] search threw", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function firecrawlScrape(url: string, formats: string[] = ["markdown"]): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) {
    console.warn("[firecrawlGateway] Missing LOVABLE_API_KEY or FIRECRAWL_API_KEY");
    return null;
  }

  try {
    const r = await fetch(`${FIRECRAWL_GATEWAY}/v2/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": FIRECRAWL_API_KEY,
      },
      body: JSON.stringify({ url, formats, onlyMainContent: true }),
    });
    if (!r.ok) {
      console.warn("[firecrawlGateway] scrape failed", r.status, await r.text().catch(() => ""));
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn("[firecrawlGateway] scrape threw", e instanceof Error ? e.message : e);
    return null;
  }
}

export class FirecrawlError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

/**
 * Strict scrape used by monitoring stages: surfaces the real provider status
 * (402 credits, 403 blocked, 429 rate limit) instead of returning null, so the
 * caller can park honestly rather than record a false "no content" result.
 */
export async function firecrawlScrapeStrict(
  url: string,
  opts: { formats?: string[]; onlyMainContent?: boolean; timeoutMs?: number } = {},
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) {
    throw new FirecrawlError("Firecrawl is not connected (missing LOVABLE_API_KEY or FIRECRAWL_API_KEY)", 401);
  }

  let r: Response;
  try {
    r = await fetch(`${FIRECRAWL_GATEWAY}/v2/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": FIRECRAWL_API_KEY,
      },
      body: JSON.stringify({
        url,
        formats: opts.formats ?? ["markdown", "rawHtml"],
        onlyMainContent: opts.onlyMainContent ?? false,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
  } catch (e) {
    throw new FirecrawlError(`Firecrawl request failed: ${e instanceof Error ? e.message : String(e)}`, 599);
  }

  const text = await r.text();
  if (!r.ok) throw new FirecrawlError(`Firecrawl ${r.status}: ${text.slice(0, 240)}`, r.status);
  try {
    return JSON.parse(text);
  } catch {
    throw new FirecrawlError(`Firecrawl returned non-JSON: ${text.slice(0, 160)}`, 599);
  }
}

export function firecrawlConfigured(): boolean {
  return !!Deno.env.get("LOVABLE_API_KEY") && !!Deno.env.get("FIRECRAWL_API_KEY");
}

