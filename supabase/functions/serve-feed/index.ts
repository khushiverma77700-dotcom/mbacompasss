// L7: RSS 2.0 feed for /articles
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=denonext";

const SITE_URL = "https://mbacompass.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: articles } = await supabase
    .from("articles")
    .select("slug,title,excerpt,banner_url,image_url,category,created_at,updated_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (articles ?? [])
    .filter((a) => a.slug && a.title)
    .map((a) => {
      const url = `${SITE_URL}/articles/${a.slug}`;
      const pub = new Date(a.updated_at || a.created_at || Date.now()).toUTCString();
      const img = a.banner_url || a.image_url;
      const enclosure = img
        ? `\n      <enclosure url="${esc(img)}" type="image/jpeg" />`
        : "";
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      ${a.category ? `<category>${esc(a.category)}</category>` : ""}
      <description>${esc(a.excerpt || a.title)}</description>${enclosure}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MBA Compass — Articles</title>
    <link>${SITE_URL}/articles</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Latest MBA prep articles, college news, and exam updates from MBA Compass.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600",
    },
  });
});
