import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=denonext";
import { STATIC_ROUTES } from "../_shared/staticRoutes.ts";

const SITE_URL = "https://mbacompass.in";
const MAX_URLS_PER_SITEMAP = 50000;

type Entry = {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
  images?: ImageEntry[];
};

type ImageEntry = {
  loc: string;
  title?: string;
  caption?: string;
};

const escapeXml = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");

const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return undefined;
  const date = new Date(d);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const normalizePath = (p: string) => {
  if (!p) return "/";
  let path = p.trim();
  if (!path.startsWith("/")) path = "/" + path;
  // Remove trailing slash except for root
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  // Strip query/fragments — non-canonical
  path = path.split("?")[0].split("#")[0];
  return path;
};

const pagePathForImageContext = (ctx: any): string | null => {
  if (!ctx || !ctx.slug) return null;
  switch (ctx.type) {
    case "college": return `/college/${ctx.slug}`;
    case "institute": return `/institute/${ctx.slug}`;
    case "article":
    case "article-inline": return `/article/${ctx.slug}`;
    case "news": return `/news/${ctx.slug}`;
    case "course": return `/courses/${ctx.slug}`;
    case "city": return `/colleges/${ctx.slug}`;
    case "exam": return `/exam/${ctx.slug}`;
    case "category": return `/category/${ctx.slug}`;
    case "freebie": return `/freebies/${ctx.slug}`;
    default: return null;
  }
};

const buildUrlset = (entries: Entry[]) => {
  const seen = new Map<string, Entry>();
  for (const e of entries) {
    if (!e.loc) continue;
    const path = normalizePath(e.loc);
    // L1: drop malformed paths — empty, doubled slashes, or trailing-slash
    // shells from rows with a blank slug (e.g. `/college/`). The homepage
    // is added explicitly via the static-routes block, so deduping on
    // `seen` covers that case.
    if (!path || /\/\//.test(path)) continue;
    const full = `${SITE_URL}${path}`;
    const existing = seen.get(full);
    if (!existing) {
      seen.set(full, { ...e, loc: full });
      continue;
    }
    if (e.images?.length) {
      const imageKeys = new Set((existing.images ?? []).map((img) => img.loc));
      existing.images = [
        ...(existing.images ?? []),
        ...e.images.filter((img) => {
          if (imageKeys.has(img.loc)) return false;
          imageKeys.add(img.loc);
          return true;
        }),
      ];
    }
  }
  const items = Array.from(seen.values());
  const hasImages = items.some((e) => e.images?.length);
  return {
    count: items.length,
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hasImages ? ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` : ""}>
${items.map((e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}
    <changefreq>${e.changefreq ?? "monthly"}</changefreq>
    <priority>${(e.priority ?? 0.5).toFixed(1)}</priority>
    ${(e.images ?? []).map((img) => `<image:image>
      <image:loc>${escapeXml(img.loc)}</image:loc>${img.title ? `
      <image:title>${escapeXml(img.title)}</image:title>` : ""}${img.caption ? `
      <image:caption>${escapeXml(img.caption)}</image:caption>` : ""}
    </image:image>`).join("\n    ")}
  </url>`).join("\n")}
</urlset>`,
  };
};

const buildSitemapIndex = (children: { loc: string; lastmod?: string }[]) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children.map((c) => `  <sitemap>
    <loc>${escapeXml(c.loc)}</loc>
    ${c.lastmod ? `<lastmod>${c.lastmod}</lastmod>` : ""}
  </sitemap>`).join("\n")}
</sitemapindex>`;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    // Segment can arrive as ?segment=coaching-hubs OR via a path like
    // /sitemap-coaching-hubs.xml (the .htaccess rewrite maps the latter
    // to this function). Also accept the raw pathname suffix for
    // Cloudflare/edge routing that preserves the request path.
    const segmentFromQuery = url.searchParams.get("segment");
    const pathMatch = url.pathname.match(/sitemap-([a-z0-9-]+)\.xml$/i);
    const segment = segmentFromQuery || (pathMatch ? pathMatch[1] : null);

    // Source of truth: supabase/functions/_shared/staticRoutes.ts
    // Keep sitemap + ssr-prerender aligned by editing that file only.
    const STATIC_PAGES: Entry[] = STATIC_ROUTES.map((r) => ({
      loc: r.path,
      changefreq: r.changefreq,
      priority: r.priority,
    }));

    // Helper: fetch ALL rows (Supabase default limit = 1000)
    const fetchAll = async (table: string, columns: string, filters?: (q: any) => any) => {
      const all: any[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        let q: any = supabase.from(table).select(columns).range(from, from + pageSize - 1);
        if (filters) q = filters(q);
        const { data, error } = await q;
        if (error || !data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
      }
      return all;
    };

    const [
      institutes,
      colleges,
      exams,
      categories,
      articles,
      cityPages,
      mockBundles,
      mockTests,
      mbaCompass,
      coachingCourses,
    ] = await Promise.all([
      fetchAll("institutes", "id, slug, updated_at"),
      fetchAll("colleges", "id, slug, updated_at"),
      fetchAll("exams", "slug, updated_at, created_at"),
      fetchAll("categories", "slug, updated_at"),
      fetchAll("articles", "slug, title, category, updated_at", (q) => q.eq("published", true)),
      fetchAll("city_pages", "slug, updated_at", (q) => q.eq("active", true)),
      fetchAll("mock_bundles", "slug, updated_at", (q) => q.eq("is_published", true)),
      fetchAll("mock_tests", "slug, updated_at", (q) => q.eq("is_published", true)),
      fetchAll("mba_compass_courses", "slug, updated_at", (q) => q.eq("is_active", true)),
      fetchAll("courses", "id, name, institute_id, updated_at"),
    ]);

    // Build slug helper inline (matches src/lib/slugify.ts behaviour)
    const toSlug = (s: string) => (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const instituteSlugById = new Map<string, string>();
    (institutes ?? []).forEach((i: any) => { if (i.id && i.slug) instituteSlugById.set(i.id, i.slug); });

    const coachingCourseEntries: Entry[] = (coachingCourses ?? []).flatMap((c: any) => {
      const instSlug = c.institute_id ? instituteSlugById.get(c.institute_id) : null;
      const courseSlug = toSlug(c.name || "");
      if (!instSlug || !courseSlug) return [];
      return [{
        loc: `/institute/${instSlug}/course/${courseSlug}`,
        lastmod: fmtDate(c.updated_at),
        changefreq: "monthly" as const,
        priority: 0.6,
      }];
    });

    // ---- Article buckets: general blog vs coaching-specific ----
    const isCoachingArticle = (a: any) => {
      const bag = `${a.category || ""} ${a.title || ""} ${a.slug || ""}`.toLowerCase();
      return /coaching|cat[\s-]?prep|mba[\s-]?prep|test[\s-]?prep|ipmat|xat|gmat|nmat|snap|cmat|iift/.test(bag);
    };
    const coachingArticles: Entry[] = (articles ?? []).flatMap((a: any) =>
      a.slug && isCoachingArticle(a)
        ? [{ loc: `/article/${a.slug}`, changefreq: "weekly" as const, priority: 0.7 }]
        : []);
    const blogs: Entry[] = (articles ?? []).flatMap((a: any) =>
      a.slug && !isCoachingArticle(a)
        ? [{ loc: `/article/${a.slug}`, changefreq: "weekly" as const, priority: 0.6 }]
        : []);

    const cats: Entry[] = (categories ?? []).flatMap((c: any) => c.slug
      ? [{ loc: `/category/${c.slug}`, lastmod: fmtDate(c.updated_at), changefreq: "weekly" as const, priority: 0.8 }] : []);
    // Redirected (merged duplicate) pages must not be listed.
    const redirected = new Set(
      ((await fetchAll("seo_redirects", "from_path", (q: any) => q.eq("is_active", true))) ?? []).map((r: any) => r.from_path),
    );
    const collegeEntries: Entry[] = (colleges ?? []).flatMap((c: any) => c.slug && !redirected.has(`/college/${c.slug}`)
      ? [{ loc: `/college/${c.slug}`, lastmod: fmtDate(c.updated_at), changefreq: "monthly" as const, priority: 0.7 }] : []);
    // Institutes in this project == coaching institutes (routed under /institute/:slug)
    const coachingInstituteEntries: Entry[] = (institutes ?? []).flatMap((i: any) => i.slug
      ? [{ loc: `/institute/${i.slug}`, lastmod: fmtDate(i.updated_at), changefreq: "monthly" as const, priority: 0.7 }] : []);
    const examEntries: Entry[] = (exams ?? []).flatMap((e: any) => e.slug
      ? [{ loc: `/exam/${e.slug}`, lastmod: fmtDate(e.updated_at ?? e.created_at), changefreq: "monthly" as const, priority: 0.7 }] : []);
    const cityEntries: Entry[] = (cityPages ?? []).flatMap((cp: any) => cp.slug
      ? [{ loc: `/colleges/${cp.slug}`, lastmod: fmtDate(cp.updated_at), changefreq: "weekly" as const, priority: 0.7 }] : []);
    const courseEntries: Entry[] = (mockBundles ?? []).flatMap((b: any) => b.slug
      ? [{ loc: `/courses/${b.slug}`, lastmod: fmtDate(b.updated_at), changefreq: "weekly" as const, priority: 0.8 }] : []);
    const mockEntries: Entry[] = (mockTests ?? []).flatMap((m: any) => m.slug
      ? [{ loc: `/mocks/${m.slug}`, lastmod: fmtDate(m.updated_at), changefreq: "weekly" as const, priority: 0.7 }] : []);
    const compassEntries: Entry[] = (mbaCompass ?? []).flatMap((c: any) => c.slug
      ? [{ loc: `/mba-compass/${c.slug}`, lastmod: fmtDate(c.updated_at), changefreq: "weekly" as const, priority: 0.7 }] : []);

    // College hub landings (unchanged)
    const TYPE_HUBS = ["iim", "private", "top-mba", "pgdm", "university", "government"];
    const EXAM_HUBS = ["cat", "xat", "cmat", "mat", "nmat", "snap", "iift", "gmat", "atma"];
    const CITY_HUBS = ["mumbai", "delhi", "bangalore", "hyderabad", "pune", "chennai", "kolkata", "ahmedabad", "gurgaon", "noida", "jaipur", "indore", "lucknow", "chandigarh"];
    const collegeHubEntries: Entry[] = [
      ...TYPE_HUBS.map((s) => ({ loc: `/colleges/type/${s}`, changefreq: "weekly" as const, priority: 0.8 })),
      ...EXAM_HUBS.map((s) => ({ loc: `/colleges/by-exam/${s}`, changefreq: "weekly" as const, priority: 0.8 })),
      ...CITY_HUBS.map((s) => ({ loc: `/colleges/by-city/${s}`, changefreq: "weekly" as const, priority: 0.7 })),
    ];

    // Coaching hub landings — city, exam, and mode. Split into its own segment
    // so the coaching-hubs sitemap grows independently of the college hubs and
    // the coaching-institutes sitemap.
    const COACHING_CITY_HUBS = CITY_HUBS;
    const COACHING_EXAM_HUBS = ["cat", "xat", "nmat", "snap", "iift", "cmat", "mat", "ipmat", "gmat"];
    const COACHING_MODE_HUBS = ["online", "offline", "weekend", "crash-course", "classroom", "self-paced"];
    const coachingHubEntries: Entry[] = [
      { loc: `/coaching`, changefreq: "weekly" as const, priority: 0.9 },
      ...COACHING_CITY_HUBS.map((s) => ({ loc: `/coaching/${s}`, changefreq: "weekly" as const, priority: 0.7 })),
      ...COACHING_EXAM_HUBS.map((s) => ({ loc: `/coaching/exam/${s}`, changefreq: "weekly" as const, priority: 0.8 })),
      ...COACHING_MODE_HUBS.map((s) => ({ loc: `/coaching/mode/${s}`, changefreq: "weekly" as const, priority: 0.6 })),
    ];

    const imageEntriesByPath = new Map<string, ImageEntry[]>();
    const imageRows = await fetchAll(
      "image_assets",
      "source_url, alt, title, page_context, variants, status",
      (q) => q.in("status", ["optimized", "discovered"]),
    );
    for (const row of imageRows ?? []) {
      const contexts = Array.isArray(row.page_context) ? row.page_context : [];
      const imageLoc = row?.variants?.webp || row.source_url;
      if (!imageLoc) continue;
      for (const ctx of contexts) {
        const path = pagePathForImageContext(ctx);
        if (!path) continue;
        const bucket = imageEntriesByPath.get(path) ?? [];
        if (bucket.length >= 1000 || bucket.some((img) => img.loc === imageLoc)) continue;
        bucket.push({ loc: imageLoc, title: row.title, caption: row.alt });
        imageEntriesByPath.set(path, bucket);
      }
    }

    const withImages = (entries: Entry[]) => entries.map((entry) => ({
      ...entry,
      images: imageEntriesByPath.get(normalizePath(entry.loc)),
    }));

    // Segments (keys stable — used as `/sitemap-<key>.xml` in the index)
    const segments: Record<string, Entry[]> = {
      pages: withImages([...STATIC_PAGES, ...cityEntries, ...collegeHubEntries]),
      blogs: withImages(blogs),
      categories: withImages(cats),
      colleges: withImages(collegeEntries),
      "coaching-hubs": withImages(coachingHubEntries),
      "coaching-institutes": withImages(coachingInstituteEntries),
      "coaching-articles": withImages(coachingArticles),
      exams: withImages(examEntries),
      courses: withImages([...courseEntries, ...compassEntries]),
      mocks: withImages([]),
    };

    const headers = {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    };

    // Single segment requested
    if (segment && segments[segment]) {
      const { xml } = buildUrlset(segments[segment]);
      return new Response(xml, { headers });
    }

    // Root request → single canonical sitemap, per current project SEO setup.
    // Segment URLs remain supported for diagnostics, but robots/Search Console
    // should use only /sitemap.xml.
    const allEntries = Object.values(segments).flat();
    const { xml } = buildUrlset(allEntries);
    return new Response(xml, { headers });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(message)}</error>`,
      { status: 500, headers: { "Content-Type": "application/xml" } },
    );
  }
});
