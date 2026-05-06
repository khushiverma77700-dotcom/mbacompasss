import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=denonext";

const SITE_URL = "https://mbacompass.in";
const MAX_URLS_PER_SITEMAP = 50000;

type Entry = {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
};

const escapeXml = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");

const fmtDate = (d: string | Date | null | undefined) => {
  const date = d ? new Date(d) : new Date();
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
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

const buildUrlset = (entries: Entry[]) => {
  const seen = new Map<string, Entry>();
  for (const e of entries) {
    if (!e.loc) continue;
    const path = normalizePath(e.loc);
    const full = `${SITE_URL}${path}`;
    if (!seen.has(full)) seen.set(full, { ...e, loc: full });
  }
  const items = Array.from(seen.values());
  return {
    count: items.length,
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.map((e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod ?? fmtDate(new Date())}</lastmod>
    <changefreq>${e.changefreq ?? "monthly"}</changefreq>
    <priority>${(e.priority ?? 0.5).toFixed(1)}</priority>
  </url>`).join("\n")}
</urlset>`,
  };
};

const buildSitemapIndex = (children: { loc: string; lastmod: string }[]) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children.map((c) => `  <sitemap>
    <loc>${escapeXml(c.loc)}</loc>
    <lastmod>${c.lastmod}</lastmod>
  </sitemap>`).join("\n")}
</sitemapindex>`;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const segment = url.searchParams.get("segment"); // e.g. "pages" | "blogs" | "colleges" | "institutes" | "exams" | "categories" | "courses" | "mocks"

    const today = fmtDate(new Date());

    const STATIC_PAGES: Entry[] = [
      { loc: "/", changefreq: "daily", priority: 1.0, lastmod: today },
      { loc: "/blog", changefreq: "daily", priority: 0.8, lastmod: today },
      { loc: "/colleges", changefreq: "weekly", priority: 0.8, lastmod: today },
      { loc: "/coaching", changefreq: "weekly", priority: 0.8, lastmod: today },
      { loc: "/compare", changefreq: "monthly", priority: 0.6, lastmod: today },
      { loc: "/college-finder", changefreq: "monthly", priority: 0.6, lastmod: today },
      { loc: "/profile-analyzer", changefreq: "monthly", priority: 0.6, lastmod: today },
      { loc: "/college-shortlister", changefreq: "monthly", priority: 0.6, lastmod: today },
      { loc: "/cat-score-calculator", changefreq: "monthly", priority: 0.6, lastmod: today },
      { loc: "/mba-roi-calculator", changefreq: "monthly", priority: 0.6, lastmod: today },
      { loc: "/about", changefreq: "monthly", priority: 0.5, lastmod: today },
      { loc: "/contact", changefreq: "monthly", priority: 0.5, lastmod: today },
      { loc: "/business-inquiry", changefreq: "monthly", priority: 0.5, lastmod: today },
      { loc: "/list-your-business", changefreq: "monthly", priority: 0.5, lastmod: today },
      { loc: "/mocks", changefreq: "weekly", priority: 0.8, lastmod: today },
      { loc: "/courses", changefreq: "weekly", priority: 0.8, lastmod: today },
      { loc: "/iim-waitlist-movement", changefreq: "daily", priority: 0.8, lastmod: today },
      { loc: "/mba-programme-compare", changefreq: "monthly", priority: 0.6, lastmod: today },
      { loc: "/mba-compass", changefreq: "weekly", priority: 0.7, lastmod: today },
      { loc: "/mba-compass/compare", changefreq: "monthly", priority: 0.5, lastmod: today },
    ];

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
      programmes,
      mbaCompass,
    ] = await Promise.all([
      fetchAll("institutes", "slug, updated_at"),
      fetchAll("colleges", "slug, updated_at"),
      fetchAll("exams", "slug, created_at"),
      fetchAll("categories", "slug, updated_at"),
      fetchAll("articles", "slug, updated_at", (q) => q.eq("published", true)),
      fetchAll("city_pages", "slug, updated_at", (q) => q.eq("active", true)),
      fetchAll("mock_bundles", "slug, updated_at", (q) => q.eq("is_published", true)),
      fetchAll("mock_tests", "slug, updated_at", (q) => q.eq("is_published", true)),
      fetchAll("programme_courses", "slug, updated_at, college_id", (q) => q.eq("active", true)),
      fetchAll("mba_compass_courses", "slug, updated_at", (q) => q.eq("is_active", true)),
    ]);

    const blogs: Entry[] = (articles ?? []).flatMap((a: any) => a.slug
      ? [{ loc: `/article/${a.slug}`, lastmod: fmtDate(a.updated_at), changefreq: "weekly" as const, priority: 0.6 }] : []);
    const cats: Entry[] = (categories ?? []).flatMap((c: any) => c.slug
      ? [{ loc: `/category/${c.slug}`, lastmod: fmtDate(c.updated_at), changefreq: "weekly" as const, priority: 0.8 }] : []);
    const collegeEntries: Entry[] = (colleges ?? []).flatMap((c: any) => c.slug
      ? [{ loc: `/college/${c.slug}`, lastmod: fmtDate(c.updated_at), changefreq: "monthly" as const, priority: 0.7 }] : []);
    const instEntries: Entry[] = (institutes ?? []).flatMap((i: any) => i.slug
      ? [{ loc: `/institute/${i.slug}`, lastmod: fmtDate(i.updated_at), changefreq: "monthly" as const, priority: 0.7 }] : []);
    const examEntries: Entry[] = (exams ?? []).flatMap((e: any) => e.slug
      ? [{ loc: `/exam/${e.slug}`, lastmod: fmtDate(e.created_at), changefreq: "monthly" as const, priority: 0.7 }] : []);
    const cityEntries: Entry[] = (cityPages ?? []).flatMap((cp: any) => cp.slug
      ? [{ loc: `/colleges/${cp.slug}`, lastmod: fmtDate(cp.updated_at), changefreq: "weekly" as const, priority: 0.7 }] : []);
    const courseEntries: Entry[] = (mockBundles ?? []).flatMap((b: any) => b.slug
      ? [{ loc: `/courses/${b.slug}`, lastmod: fmtDate(b.updated_at), changefreq: "weekly" as const, priority: 0.8 }] : []);
    const mockEntries: Entry[] = (mockTests ?? []).flatMap((m: any) => m.slug
      ? [{ loc: `/mocks/${m.slug}`, lastmod: fmtDate(m.updated_at), changefreq: "weekly" as const, priority: 0.7 }] : []);
    const programmeEntries: Entry[] = (programmes ?? []).flatMap((p: any) => (p.slug && p.college?.slug)
      ? [{ loc: `/college/${p.college.slug}/programme/${p.slug}`, lastmod: fmtDate(p.updated_at), changefreq: "monthly" as const, priority: 0.6 }] : []);
    const compassEntries: Entry[] = (mbaCompass ?? []).flatMap((c: any) => c.slug
      ? [{ loc: `/mba-compass/${c.slug}`, lastmod: fmtDate(c.updated_at), changefreq: "weekly" as const, priority: 0.7 }] : []);

    const segments: Record<string, Entry[]> = {
      pages: [...STATIC_PAGES, ...cityEntries],
      blogs,
      categories: cats,
      colleges: collegeEntries,
      institutes: instEntries,
      exams: examEntries,
      courses: [...courseEntries, ...compassEntries],
      mocks: mockEntries,
      programmes: programmeEntries,
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

    // Combine all
    const all: Entry[] = Object.values(segments).flat();

    // If under threshold, return single urlset
    if (all.length <= MAX_URLS_PER_SITEMAP) {
      const { xml } = buildUrlset(all);
      return new Response(xml, { headers });
    }

    // Otherwise return a sitemap index pointing at child segments (same host via this same function)
    const children = Object.entries(segments)
      .filter(([_, arr]) => arr.length > 0)
      .map(([key]) => ({
        loc: `${SITE_URL}/sitemap-${key}.xml`,
        lastmod: today,
      }));
    return new Response(buildSitemapIndex(children), { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(message)}</error>`,
      { status: 500, headers: { "Content-Type": "application/xml" } },
    );
  }
});
