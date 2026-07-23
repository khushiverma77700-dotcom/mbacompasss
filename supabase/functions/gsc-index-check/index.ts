import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const GSC_KEY = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY') ?? '';

function gscHeaders() {
  return {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': GSC_KEY,
    'Content-Type': 'application/json',
  };
}

// Classify verdict/coverage into a compact status our UI sorts by.
function classify(idx: any): { index_status: string; priority: number } {
  const verdict = (idx?.verdict || '').toUpperCase();
  const coverage = (idx?.coverageState || '').toLowerCase();
  if (verdict === 'PASS' || coverage.includes('submitted and indexed') || coverage.includes('indexed, not submitted')) {
    return { index_status: 'indexed', priority: 0 };
  }
  if (coverage.includes('discovered')) return { index_status: 'discovered_not_indexed', priority: 90 };
  if (coverage.includes('crawled')) return { index_status: 'crawled_not_indexed', priority: 80 };
  if (verdict === 'FAIL' || coverage.includes('error')) return { index_status: 'error', priority: 100 };
  if (coverage.includes('excluded') || coverage.includes('duplicate') || coverage.includes('alternate')) {
    return { index_status: 'excluded', priority: 40 };
  }
  if (verdict === 'NEUTRAL' || verdict === 'PARTIAL') return { index_status: 'partial', priority: 60 };
  return { index_status: 'unknown', priority: 50 };
}

async function inspectOne(inspectionUrl: string, siteUrl: string) {
  const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
    method: 'POST',
    headers: gscHeaders(),
    body: JSON.stringify({ inspectionUrl, siteUrl }),
  });
  const body = await res.text();
  if (!res.ok) {
    return { ok: false as const, status: res.status, error: body };
  }
  try { return { ok: true as const, data: JSON.parse(body) }; }
  catch { return { ok: false as const, status: 500, error: 'invalid_json' }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY || !GSC_KEY) {
      return new Response(JSON.stringify({ error: 'Google Search Console connector not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (req.method === 'GET' ? 'sites' : 'check');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) List verified GSC properties
    if (action === 'sites') {
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers: gscHeaders() });
      const body = await r.text();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: 'gsc_sites_failed', status: r.status, details: body }),
          { status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(body, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2) Bulk check URLs -> upsert into page_indexing_status
    if (action === 'check') {
      const { urls = [], siteUrl, pages = [] } = await req.json().catch(() => ({}));
      if (!siteUrl || (!urls.length && !pages.length)) {
        return new Response(JSON.stringify({ error: 'siteUrl and urls[] (or pages[]) required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const targets: Array<{ url: string; slug?: string; page_type?: string }> =
        pages.length ? pages : urls.map((u: string) => ({ url: u }));

      const results: any[] = [];
      // Small concurrency to respect GSC quota (~2000/day, ~600/min)
      const CONC = 3;
      for (let i = 0; i < targets.length; i += CONC) {
        const chunk = targets.slice(i, i + CONC);
        const out = await Promise.all(chunk.map(async (t) => {
          const insp = await inspectOne(t.url, siteUrl);
          if (!insp.ok) {
            const row = {
              url: t.url, slug: t.slug ?? null, page_type: t.page_type ?? null,
              site_url: siteUrl, error: `[${insp.status}] ${insp.error.slice(0, 500)}`,
              index_status: 'error', priority: 100, checked_at: new Date().toISOString(),
              raw: null, verdict: null, coverage_state: null,
              robots_txt_state: null, indexing_state: null, page_fetch_state: null,
              google_canonical: null, user_canonical: null, last_crawl_time: null,
            };
            await supabase.from('page_indexing_status').upsert(row, { onConflict: 'url' });
            return row;
          }
          const idx = insp.data?.inspectionResult?.indexStatusResult || {};
          const { index_status, priority } = classify(idx);
          const row = {
            url: t.url, slug: t.slug ?? null, page_type: t.page_type ?? null,
            site_url: siteUrl,
            verdict: idx.verdict ?? null,
            coverage_state: idx.coverageState ?? null,
            index_status, priority,
            robots_txt_state: idx.robotsTxtState ?? null,
            indexing_state: idx.indexingState ?? null,
            page_fetch_state: idx.pageFetchState ?? null,
            google_canonical: idx.googleCanonical ?? null,
            user_canonical: idx.userCanonical ?? null,
            last_crawl_time: idx.lastCrawlTime ?? null,
            error: null,
            checked_at: new Date().toISOString(),
            raw: insp.data,
          };
          await supabase.from('page_indexing_status').upsert(row, { onConflict: 'url' });
          return row;
        }));
        results.push(...out);
      }

      return new Response(JSON.stringify({ ok: true, count: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'unknown_action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('gsc-index-check error', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
