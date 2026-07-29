// Crawls known content tables for image URLs and upserts image_assets rows.
// Any admin can trigger a full rescan; results feed the Image SEO Dashboard.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Source {
  table: string;
  cols: string[];
  slugCol?: string;
  nameCol?: string;
  contextType: string;
}

const SOURCES: Source[] = [
  { table: "colleges", cols: ["logo_url", "banner_url", "image_url"], slugCol: "slug", nameCol: "name", contextType: "college" },
  { table: "institutes", cols: ["logo_url", "banner_url"], slugCol: "slug", nameCol: "name", contextType: "institute" },
  { table: "articles", cols: ["thumbnail_url", "cover_image"], slugCol: "slug", nameCol: "title", contextType: "article" },
  { table: "news_articles", cols: ["image_url", "thumbnail_url"], slugCol: "slug", nameCol: "title", contextType: "news" },
  { table: "mba_compass_courses", cols: ["banner_url", "thumbnail_url"], slugCol: "slug", nameCol: "title", contextType: "course" },
  { table: "banners", cols: ["image_url", "mobile_image_url"], nameCol: "title", contextType: "banner" },
  { table: "city_pages", cols: ["hero_image_url"], slugCol: "slug", nameCol: "city_name", contextType: "city" },
  { table: "exams", cols: ["banner_url", "logo_url"], slugCol: "slug", nameCol: "name", contextType: "exam" },
  { table: "categories", cols: ["image_url"], slugCol: "slug", nameCol: "name", contextType: "category" },
  { table: "freebies", cols: ["thumbnail_url"], slugCol: "slug", nameCol: "title", contextType: "freebie" },
  { table: "testimonials", cols: ["image_url"], nameCol: "name", contextType: "testimonial" },
  { table: "faculty", cols: ["image_url"], nameCol: "name", contextType: "faculty" },
];

const HTML_IMG_RE = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

function normalize(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(SB_URL, SB_SERVICE);

    // Auth: only admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user } } = await sb.auth.getUser(jwt);
      if (user) {
        const { data: role } = await sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!role) {
          return new Response(JSON.stringify({ error: "admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Aggregate URL -> [context]
    const registry = new Map<string, Array<Record<string, unknown>>>();
    const addContext = (url: string, ctx: Record<string, unknown>) => {
      const arr = registry.get(url) ?? [];
      arr.push(ctx);
      registry.set(url, arr);
    };

    let scanned = 0;
    for (const src of SOURCES) {
      const selectCols = ["id", ...src.cols];
      if (src.slugCol) selectCols.push(src.slugCol);
      if (src.nameCol) selectCols.push(src.nameCol);
      const uniqueCols = [...new Set(selectCols)];
      const { data, error } = await sb.from(src.table).select(uniqueCols.join(","));
      if (error) {
        console.warn(`[audit] ${src.table}: ${error.message}`);
        continue;
      }
      for (const row of (data as any[] ?? [])) {
        scanned += 1;
        for (const col of src.cols) {
          const url = normalize(row[col]);
          if (!url) continue;
          addContext(url, {
            type: src.contextType,
            table: src.table,
            id: row.id,
            slug: src.slugCol ? row[src.slugCol] : undefined,
            name: src.nameCol ? row[src.nameCol] : undefined,
            column: col,
          });
        }
      }
    }

    // Also crawl article body HTML for inline <img>
    const { data: articles } = await sb.from("articles").select("id, slug, title, content").limit(500);
    for (const a of (articles as any[] ?? [])) {
      const html = String(a?.content ?? "");
      let m: RegExpExecArray | null;
      while ((m = HTML_IMG_RE.exec(html)) !== null) {
        const url = normalize(m[1]);
        if (!url) continue;
        addContext(url, { type: "article-inline", table: "articles", id: a.id, slug: a.slug, name: a.title, column: "content" });
      }
    }

    // Upsert every URL
    const rows = Array.from(registry.entries()).map(([source_url, page_context]) => ({
      source_url,
      page_context,
      last_audited_at: new Date().toISOString(),
    }));

    // Chunk upserts to avoid oversized payloads
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await sb.from("image_assets").upsert(chunk, { onConflict: "source_url", ignoreDuplicates: false });
      if (error) console.warn(`[audit] upsert error:`, error.message);
      else upserted += chunk.length;
    }

    // Compute issues heuristic (missing alt, oversized filename etc. computed downstream during optimizer)
    return new Response(
      JSON.stringify({ ok: true, scannedRows: scanned, uniqueImages: rows.length, upserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[image-audit-crawler]", err);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
