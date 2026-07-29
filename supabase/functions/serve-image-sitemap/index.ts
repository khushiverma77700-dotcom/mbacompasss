// Dynamic image sitemap. Groups images by their primary page URL so crawlers
// see <image:image> inside the correct <url> block per Google's spec.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://mbacompass.in";

function xmlEsc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function pageUrlForContext(ctx: any): string | null {
  if (!ctx || !ctx.slug) return null;
  switch (ctx.type) {
    case "college": return `${SITE}/college/${ctx.slug}`;
    case "institute": return `${SITE}/institute/${ctx.slug}`;
    case "article":
    case "article-inline": return `${SITE}/article/${ctx.slug}`;
    case "news": return `${SITE}/news/${ctx.slug}`;
    case "course": return `${SITE}/courses/${ctx.slug}`;
    case "city": return `${SITE}/colleges/${ctx.slug}`;
    case "exam": return `${SITE}/exam/${ctx.slug}`;
    case "category": return `${SITE}/category/${ctx.slug}`;
    case "freebie": return `${SITE}/freebies/${ctx.slug}`;
    default: return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SB_URL, SB_SERVICE);

  // Batch through all images
  const perPage = new Map<string, { image: string; alt?: string; title?: string }[]>();
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await sb.from("image_assets")
      .select("source_url, alt, title, page_context, variants, status")
      .in("status", ["optimized", "discovered"])
      .range(from, from + size - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as any[]) {
      const contexts = Array.isArray(row.page_context) ? row.page_context : [];
      const deliveredUrl = row?.variants?.webp || row.source_url;
      for (const ctx of contexts) {
        const page = pageUrlForContext(ctx);
        if (!page) continue;
        const bucket = perPage.get(page) ?? [];
        if (bucket.length < 1000 && !bucket.some((b) => b.image === deliveredUrl)) {
          bucket.push({ image: deliveredUrl, alt: row.alt, title: row.title });
        }
        perPage.set(page, bucket);
      }
    }
    if (data.length < size) break;
    from += size;
  }

  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
  ];
  for (const [page, images] of perPage.entries()) {
    parts.push(`<url><loc>${xmlEsc(page)}</loc>`);
    for (const img of images) {
      parts.push(`<image:image><image:loc>${xmlEsc(img.image)}</image:loc>`);
      if (img.title) parts.push(`<image:title>${xmlEsc(img.title)}</image:title>`);
      if (img.alt) parts.push(`<image:caption>${xmlEsc(img.alt)}</image:caption>`);
      parts.push(`</image:image>`);
    }
    parts.push(`</url>`);
  }
  parts.push(`</urlset>`);

  return new Response(parts.join(""), {
    headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" },
  });
});
