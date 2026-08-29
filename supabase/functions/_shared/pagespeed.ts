// Google PageSpeed Insights (Lighthouse) helper.
//
// The project's GOOGLE_PSI_API_KEY is restricted to the https://www.mbacompass.in/
// HTTP referrer, so every server-side call must send that Referer header. When no
// key is configured we fall back to the unauthenticated quota, which is shared and
// frequently exhausted — those failures are surfaced, never silently swallowed.

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_REFERER = "https://www.mbacompass.in/";

export interface PsiMetrics {
  perf_score: number | null;
  seo_score: number | null;
  lcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  fcp_ms: number | null;
  strategy: string;
  opportunities: Array<{ id: string; title: string; savings_ms: number }>;
}

export class PsiError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    // 429 = shared/daily quota exhausted, 5xx = upstream blip. Both clear on their own.
    this.retryable = status === 429 || status >= 500;
  }
}

function audit(audits: any, id: string): number | null {
  const v = audits?.[id]?.numericValue;
  return typeof v === "number" ? Math.round(v * 100) / 100 : null;
}

export function psiConfigured(): boolean {
  return !!Deno.env.get("GOOGLE_PSI_API_KEY");
}

/** Run a real Lighthouse audit for one URL. Throws PsiError on API failure. */
export async function psiAudit(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
  timeoutMs = 70_000,
): Promise<PsiMetrics> {
  const key = Deno.env.get("GOOGLE_PSI_API_KEY");
  const qs = new URLSearchParams({ url, strategy });
  qs.append("category", "performance");
  qs.append("category", "seo");
  if (key) qs.set("key", key);

  let resp: Response;
  try {
    resp = await fetch(`${PSI_ENDPOINT}?${qs.toString()}`, {
      headers: { Referer: PSI_REFERER },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new PsiError(`PageSpeed request failed: ${e instanceof Error ? e.message : String(e)}`, 599);
  }

  const json: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = String(json?.error?.message || `HTTP ${resp.status}`);
    throw new PsiError(msg, resp.status);
  }

  const lr = json?.lighthouseResult ?? {};
  const audits = lr?.audits ?? {};
  const opportunities = Object.entries(audits)
    .filter(([, a]: [string, any]) =>
      a?.details?.type === "opportunity" && typeof a?.details?.overallSavingsMs === "number" && a.details.overallSavingsMs >= 100
    )
    .map(([id, a]: [string, any]) => ({
      id,
      title: String(a.title ?? id),
      savings_ms: Math.round(a.details.overallSavingsMs),
    }))
    .sort((a, b) => b.savings_ms - a.savings_ms)
    .slice(0, 8);

  const pct = (c: any) => (typeof c?.score === "number" ? Math.round(c.score * 100) : null);
  return {
    perf_score: pct(lr?.categories?.performance),
    seo_score: pct(lr?.categories?.seo),
    lcp_ms: audit(audits, "largest-contentful-paint"),
    cls: audit(audits, "cumulative-layout-shift"),
    tbt_ms: audit(audits, "total-blocking-time"),
    fcp_ms: audit(audits, "first-contentful-paint"),
    strategy,
    opportunities,
  };
}
