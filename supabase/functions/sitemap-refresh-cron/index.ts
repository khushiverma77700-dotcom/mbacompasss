// Daily sitemap refresh — runs at 13:30 UTC (7:00 PM IST) via pg_cron.
// Fetches the live DB-backed sitemap, snapshots it to site_settings, and
// stores a small report (url_count, generated_at, next_refresh_at) that
// the admin Sitemap page reads to show a notification.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Add 24h, then snap to 13:30 UTC (7 PM IST) of that day.
function nextRefreshAt(from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(13, 30, 0, 0);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sitemapUrl = `${SUPABASE_URL}/functions/v1/serve-sitemap?cb=${Date.now()}`;
    const res = await fetch(sitemapUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`serve-sitemap returned ${res.status}`);
    const xml = await res.text();
    const urlCount = (xml.match(/<url>/g) || []).length;
    const generatedAt = new Date().toISOString();
    const nextAt = nextRefreshAt(new Date(generatedAt));

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Snapshot XML for download/audit.
    await supabase.from("site_settings").upsert(
      { key: "sitemap_xml", value: JSON.stringify({ xml, generated_at: generatedAt, url_count: urlCount }) },
      { onConflict: "key" }
    );

    // Small report the admin UI reads and shows as a toast.
    const report = {
      url_count: urlCount,
      generated_at: generatedAt,
      next_refresh_at: nextAt,
      source: "cron",
      status: "success",
    };
    await supabase.from("site_settings").upsert(
      { key: "sitemap_last_report", value: JSON.stringify(report) },
      { onConflict: "key" }
    );

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sitemap-refresh-cron failed:", message);
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      await supabase.from("site_settings").upsert(
        {
          key: "sitemap_last_report",
          value: JSON.stringify({
            status: "failed",
            error: message,
            generated_at: new Date().toISOString(),
            next_refresh_at: nextRefreshAt(),
          }),
        },
        { onConflict: "key" }
      );
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
