import { coachingExams, coachingModes, matchesCoachingHub, type CoachingHub } from "../src/lib/coachingHub";
/** Build-only public manifest. No sessions, privileged keys or private routes. */
export const MAX_PRERENDER_PAGES = 8000;
export const PUBLIC_STATIC_PATHS = [
  "/", "/colleges", "/coaching", "/exam", "/blog", "/compare", "/mocks", "/freebies",
  "/tools/roi-calculator", "/tools/cat-score-calculator", "/tools/college-shortlister", "/tools/profile-analyzer", "/contact",
  "/tools", "/tools/college-finder", "/tools/iim-waitlist-movement", "/start-here",
];
export const PUBLIC_SITEMAP_STATIC_PATHS = [
  ...PUBLIC_STATIC_PATHS,
  "/about", "/business-inquiries", "/list-your-business", "/authors",
  "/authors/mba-compass-editorial-team", "/formulas", "/bundles", "/courses",
  "/editorial-policy", "/fact-check-policy", "/privacy-policy", "/review-policy", "/terms",
  "/mba-compass", "/mba-compass/compare", "/guides/ipmat-preparation", "/cat-mock-1",
  "/mba-application", "/mba-application/mba-entrance-exams", "/mba-application/iim-applications",
  "/mba-application/tier-1-non-iim-colleges", "/mba-application/tier-2-non-iim-colleges", "/mba-application/recommended-applications",
];

export function selectPrerenderPaths(paths: string[], limit = MAX_PRERENDER_PAGES): string[] {
  const allowed = paths.filter((path) => /^\/(college|institute|exam|article)\/[^/?#]+$/.test(path));
  const unique = [...new Set([...PUBLIC_STATIC_PATHS, ...allowed])];
  if (!Number.isInteger(limit) || limit < PUBLIC_STATIC_PATHS.length || limit > MAX_PRERENDER_PAGES) {
    throw new Error(`Prerender limit must be between ${PUBLIC_STATIC_PATHS.length} and ${MAX_PRERENDER_PAGES}`);
  }
  return unique.slice(0, limit);
}

export async function enumeratePublicPages(url: string, key: string) {
  if (!url || !key) throw new Error("Public database configuration is required to generate public HTML");
  async function rows(table: string, filter = "", columns = "slug,updated_at", order = "slug") {
    const all: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const response = await fetch(`${url}/rest/v1/${table}?select=${columns}${filter}&order=${order}.asc`, {
        headers: { apikey: key, Range: `${from}-${from + 999}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Public manifest ${table}: HTTP ${response.status}`);
      const batch = await response.json() as Record<string, unknown>[];
      all.push(...batch);
      if (batch.length < 1000) return all;
    }
  }
  const [colleges, institutes, exams, articles, redirects, categories, bundles, compass, formulas, applications, courses, courseLinks, regions] = await Promise.all([
    rows("colleges", "", "slug,name,city,state,updated_at"), rows("institutes", "", "id,slug,name,city,state,mode,specializations,category_id,updated_at"), rows("exams"), rows("articles", "&published=eq.true"),
    rows("seo_redirects", "&is_active=eq.true", "from_path", "from_path"),
    rows("categories", "", "id,name,slug,updated_at"), rows("mock_bundles", "&is_published=eq.true"), rows("mba_compass_courses", "&is_active=eq.true"),
    rows("quant_formulas", "&published=eq.true"), rows("application_trackers", "&is_active=eq.true&is_archived=eq.false", "slug,name,updated_at"),
    rows("courses", "", "id,name,institute_id,updated_at", "id"),
    rows("institute_courses", "", "institute_id,course_id", "institute_id"),
    rows("mock_tests", "&is_published=eq.true"),
    rows("city_pages", "&active=eq.true", "slug,name,type,city_aliases"),
  ]);
  const redirected = new Set(redirects.map((row) => row.from_path));
  const paths = (records: Record<string, unknown>[], prefix: string) => records.flatMap((row) => {
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const path = `/${prefix}/${slug}`;
    return slug && !/[/?#]/.test(slug) && (!('name' in row) || (typeof row.name === 'string' && row.name.trim())) && !redirected.has(path) ? [path] : [];
  });
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const locations = (field: "city" | "state", prefix: string) => colleges.flatMap(row => typeof row[field] === "string" && row.name && row.slug && slugify(row[field] as string) ? [`${prefix}/${slugify(row[field] as string)}`] : []);
  const instituteSlugs = new Map(institutes.filter(row => row.name && row.slug).map(row => [row.id, row.slug]));
  const coursePaths = courses.flatMap(row => {
    const related = new Set([row.institute_id, ...courseLinks.filter(link => link.course_id === row.id).map(link => link.institute_id)]);
    // Match the institute course page's slug generator exactly.
    const slug = typeof row.name === "string" ? row.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") : "";
    return [...related].flatMap(id => {
      const institute = instituteSlugs.get(id);
      return institute && slug && !redirected.has(`/institute/${institute}`) ? [`/institute/${institute}/course/${slug}`] : [];
    });
  });
  const coachingRows = institutes.filter(row => row.name && row.slug).map(row => ({
    ...row,
    categories: categories.find(category => category.id === row.category_id),
    courses: courses.filter(course => course.institute_id === row.id),
  }));
  const hubDefaults = { title: "", description: "", h1: "" };
  const coachingHubs: CoachingHub[] = [
    ...regions.flatMap(region => typeof region.slug === "string" && typeof region.name === "string" ? [{
      ...hubDefaults, path: `/coaching/${region.slug}`,
      ...(region.type === "state" ? { state: region.name } : { city: region.name }),
      aliases: Array.isArray(region.city_aliases) ? region.city_aliases as string[] : [],
    }] : []),
    ...coachingExams.map(exam => ({ ...hubDefaults, path: `/coaching/exam/${exam}`, exam })),
    ...Object.entries(coachingModes).map(([slug, mode]) => ({ ...hubDefaults, path: `/coaching/mode/${slug}`, mode })),
  ];
  const coachingPaths = coachingHubs.filter(hub => coachingRows.some(row => matchesCoachingHub(row, hub))).map(hub => hub.path);
  const dynamic = [
    ...paths(exams, "exam"), ...paths(institutes, "institute"),
    ...paths(colleges, "college").sort((a, b) => Number(b.endsWith("/iim-ahmedabad")) - Number(a.endsWith("/iim-ahmedabad"))),
    ...paths(articles, "article"),
    ...paths(categories, "category"), ...paths(bundles, "bundles"), ...paths(compass, "mba-compass"),
    ...paths(formulas, "formula"), ...paths(applications, "mba-application/college"), ...paths(mocks, "mocks"), ...coursePaths,
    ...coachingPaths,
    ...locations("city", "/colleges/by-city"), ...locations("state", "/colleges/by-state"),
    ...["iim", "private", "top-mba", "pgdm", "university", "government"].map(slug => `/colleges/type/${slug}`),
    ...["cat", "xat", "cmat", "mat", "nmat", "snap", "iift", "gmat", "atma"].map(slug => `/colleges/by-exam/${slug}`),
  ];
  // Sitemaps cover ALL canonical public pages, not just capped static HTML output.
  const selected = [...new Set([...PUBLIC_SITEMAP_STATIC_PATHS, ...dynamic])].filter(path => !redirected.has(path));
  console.info(`[sitemap] ${selected.length} canonical public URLs; prerender cap is independent`);
  const dates = new Map<string, string>();
  for (const [records, prefix] of [[colleges, "college"], [institutes, "institute"], [exams, "exam"]] as const) {
    for (const row of records) if (typeof row.slug === "string" && typeof row.updated_at === "string" && Number.isFinite(Date.parse(row.updated_at))) dates.set(`/${prefix}/${row.slug.trim()}`, row.updated_at);
  }
  // Article updated_at was historically bumped by technical preparation.
  // It cannot establish a significant editorial change, so omit it.
  return selected.map((path) => ({ path, ...(dates.has(path) ? { lastmod: dates.get(path) } : {}) }));
}

let renderedBytes = 0;
/** A broken page must fail the build rather than ship a loading shell. */
export function validateRenderedPage({ page, html }: { page: { path: string }; html: string }) {
  if (!/<h1[\s>]/i.test(html) || !/<meta[^>]+name="description"[^>]+content="[^"]+"/i.test(html) || /This page didn(?:'|&#x27;)t load/.test(html)) {
    throw new Error(`Incomplete public HTML: ${page.path}`);
  }
  renderedBytes += new TextEncoder().encode(html).byteLength;
  if (renderedBytes > 2.5 * 1024 ** 3) throw new Error("Public HTML exceeds the safe publication size budget");
}