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
