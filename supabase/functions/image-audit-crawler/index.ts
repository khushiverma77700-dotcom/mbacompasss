// Crawls known content tables for image URLs and upserts image_assets rows. v3
// Any admin can trigger a full rescan; results feed the Image SEO Dashboard.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Source {
  table: string;
  cols: string[];        // scalar text URL columns
  arrayCols?: string[];  // text[] or jsonb array of URLs / objects containing url
  htmlCols?: string[];   // HTML columns to scan for inline <img>
  slugCol?: string;
  nameCol?: string;
  contextType: string;
}

const SOURCES: Source[] = [
  { table: "colleges", cols: ["logo_url", "banner_url"], htmlCols: ["description"], slugCol: "slug", nameCol: "name", contextType: "college" },
  { table: "institutes", cols: ["logo_url", "banner_url", "og_image", "twitter_image"], htmlCols: ["description"], slugCol: "slug", nameCol: "name", contextType: "institute" },
  { table: "articles", cols: ["image_url", "banner_url", "mobile_banner_url"], htmlCols: ["content"], slugCol: "slug", nameCol: "title", contextType: "article" },
  { table: "college_sections", htmlCols: ["content"], cols: [], contextType: "college-section" },
  { table: "mba_compass_courses", cols: ["banner_url", "thumbnail_url"], arrayCols: ["gallery_images"], htmlCols: ["description"], slugCol: "slug", nameCol: "title", contextType: "course" },
  { table: "courses", cols: ["og_image"], htmlCols: ["description"], slugCol: "slug", nameCol: "name", contextType: "course" },
  { table: "banners", cols: ["image_url", "mobile_image_url"], nameCol: "title", contextType: "banner" },
  { table: "city_pages", cols: ["hero_image_url"], slugCol: "slug", nameCol: "name", contextType: "city" },
  { table: "exams", cols: ["logo_url"], htmlCols: ["description"], slugCol: "slug", nameCol: "name", contextType: "exam" },
  { table: "categories", htmlCols: ["description"], cols: [], slugCol: "slug", nameCol: "name", contextType: "category" },
  { table: "freebies", cols: ["cover_image_url"], htmlCols: ["description"], nameCol: "title", contextType: "freebie" },
  { table: "testimonials", cols: ["image_url"], htmlCols: ["content"], nameCol: "name", contextType: "testimonial" },
  { table: "faculty", cols: ["photo_url"], nameCol: "name", contextType: "faculty" },
  { table: "coaching_of_week", cols: ["banner_url"], htmlCols: ["description"], contextType: "coaching-of-week" },
  { table: "mock_bundles", cols: ["cover_image_url"], htmlCols: ["description"], contextType: "mock-bundle" },
  { table: "mock_tests", cols: ["banner_url"], htmlCols: ["description"], contextType: "mock-test" },
  { table: "mock_passages", arrayCols: ["image_urls"], cols: [], contextType: "mock-passage" },
  { table: "mock_questions", arrayCols: ["image_urls"], cols: [], contextType: "mock-question" },
  { table: "mocks_landing_settings", cols: ["hero_image_url"], arrayCols: ["student_feedback_images"], contextType: "mocks-landing" },
  { table: "student_notifications", cols: ["image_url"], contextType: "notification" },
  { table: "page_seo_overrides", cols: ["og_image"], slugCol: "slug", nameCol: "title", contextType: "seo-override" },
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

function extractFromArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item && typeof item === "object") {
        const anyItem = item as Record<string, unknown>;
        const url = (anyItem.url ?? anyItem.src ?? anyItem.image_url ?? anyItem.image) as string | undefined;
        return url ? [url] : [];
      }
      return [];
    });
  }
  if (typeof v === "string") {
    // some jsonb columns land as JSON strings
    try {
      const parsed = JSON.parse(v);
      return extractFromArray(parsed);
    } catch {
      return [v];
    }
  }
  return [];
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

    const registry = new Map<string, Array<Record<string, unknown>>>();
    const addContext = (url: string, ctx: Record<string, unknown>) => {
      const arr = registry.get(url) ?? [];
      arr.push(ctx);
      registry.set(url, arr);
    };

    let scanned = 0;
    const perSource: Record<string, { rows: number; images: number; error?: string }> = {};

    for (const src of SOURCES) {
      const selectCols = new Set<string>(["id"]);
      for (const c of src.cols) selectCols.add(c);
      for (const c of src.arrayCols ?? []) selectCols.add(c);
      for (const c of src.htmlCols ?? []) selectCols.add(c);
      if (src.slugCol) selectCols.add(src.slugCol);
      if (src.nameCol) selectCols.add(src.nameCol);

      const { data, error } = await sb.from(src.table).select([...selectCols].join(","));
      if (error) {
        perSource[src.table] = { rows: 0, images: 0, error: error.message };
        console.warn(`[audit] ${src.table}: ${error.message}`);
        continue;
      }
      let sourceImages = 0;
      const rows = (data as any[]) ?? [];
      for (const row of rows) {
        scanned += 1;
        const ctxBase = {
          type: src.contextType,
          table: src.table,
          id: row.id,
          slug: src.slugCol ? row[src.slugCol] : undefined,
          name: src.nameCol ? row[src.nameCol] : undefined,
        };
        for (const col of src.cols) {
          const url = normalize(row[col]);
          if (!url) continue;
          addContext(url, { ...ctxBase, column: col });
          sourceImages += 1;
        }
        for (const col of src.arrayCols ?? []) {
          for (const raw of extractFromArray(row[col])) {
            const url = normalize(raw);
            if (!url) continue;
            addContext(url, { ...ctxBase, column: col });
            sourceImages += 1;
          }
        }
        for (const col of src.htmlCols ?? []) {
          const html = String(row[col] ?? "");
          if (!html) continue;
          let m: RegExpExecArray | null;
          HTML_IMG_RE.lastIndex = 0;
          while ((m = HTML_IMG_RE.exec(html)) !== null) {
            const url = normalize(m[1]);
            if (!url) continue;
            addContext(url, { ...ctxBase, column: `${col}(inline)` });
            sourceImages += 1;
          }
        }
      }
      perSource[src.table] = { rows: rows.length, images: sourceImages };
    }

    const rows = Array.from(registry.entries()).map(([source_url, page_context]) => ({
      source_url,
      page_context,
      last_audited_at: new Date().toISOString(),
    }));

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await sb.from("image_assets").upsert(chunk, { onConflict: "source_url", ignoreDuplicates: false });
      if (error) console.warn(`[audit] upsert error:`, error.message);
      else upserted += chunk.length;
    }

    return new Response(
      JSON.stringify({ ok: true, scannedRows: scanned, uniqueImages: rows.length, upserted, perSource }),
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
