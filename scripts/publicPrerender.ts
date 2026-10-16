/** Build-only public manifest. No sessions, privileged keys or private routes. */
export const MAX_PRERENDER_PAGES = 8000;
export const PUBLIC_STATIC_PATHS = [
  "/", "/colleges", "/coaching", "/exam", "/blog", "/compare", "/mocks", "/freebies",
  "/roi-calculator", "/cat-score-calculator", "/college-shortlister", "/profile-analyzer", "/contact",
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
  async function rows(table: string, filter = "") {
    const all: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const response = await fetch(`${url}/rest/v1/${table}?select=${table === "seo_redirects" ? "from_path" : "slug"}${filter}&order=${table === "seo_redirects" ? "from_path" : "slug"}.asc`, {
        headers: { apikey: key, Range: `${from}-${from + 999}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Public manifest ${table}: HTTP ${response.status}`);
      const batch = await response.json() as Record<string, unknown>[];
      all.push(...batch);
      if (batch.length < 1000) return all;
    }
  }
  const [colleges, institutes, exams, articles, redirects] = await Promise.all([
    rows("colleges"), rows("institutes"), rows("exams"), rows("articles", "&published=eq.true"),
    rows("seo_redirects", "&is_active=eq.true"),
  ]);
  const redirected = new Set(redirects.map((row) => row.from_path));
  const paths = (records: Record<string, unknown>[], prefix: string) => records.flatMap((row) => {
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const path = `/${prefix}/${slug}`;
    return slug && !redirected.has(path) ? [path] : [];
  });
  const dynamic = [
    ...paths(exams, "exam"), ...paths(institutes, "institute"),
    ...paths(colleges, "college").sort((a, b) => Number(b.endsWith("/iim-ahmedabad")) - Number(a.endsWith("/iim-ahmedabad"))),
    ...paths(articles, "article"),
  ];
  const selected = selectPrerenderPaths(dynamic);
  console.info(`[public-html] ${selected.length} public pages selected; ${Math.max(0, dynamic.length + PUBLIC_STATIC_PATHS.length - selected.length)} long-tail pages remain server-rendered`);
  return selected.map((path) => ({ path }));
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