import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://bschoolbuzz.com";
const XML_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
const XML_SCHEMA_INSTANCE = "http://www.w3.org/2001/XMLSchema-instance";
const XML_SCHEMA_LOCATION = `${XML_NAMESPACE} ${XML_NAMESPACE}/sitemap.xsd`;

const STATIC_PAGES = [
  { loc: "/", priority: 1.0 },
  { loc: "/about", priority: 0.7 },
  { loc: "/contact", priority: 0.7 },
  { loc: "/blog", priority: 0.7 },
  { loc: "/colleges", priority: 0.7 },
  { loc: "/compare", priority: 0.7 },
  { loc: "/college-finder", priority: 0.7 },
  { loc: "/profile-analyzer", priority: 0.7 },
  { loc: "/college-shortlister", priority: 0.7 },
];

const escapeXml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const buildSitemapXml = (entries: { loc: string; priority: number }[]) => {
  const lastmod = new Date().toISOString();
  const uniqueEntries = Array.from(
    new Map(entries.filter((entry) => entry.loc).map((entry) => [entry.loc, entry])).values(),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="${XML_NAMESPACE}" xmlns:xsi="${XML_SCHEMA_INSTANCE}" xsi:schemaLocation="${XML_SCHEMA_LOCATION}">
${uniqueEntries.map((entry) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${entry.loc}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${entry.priority.toFixed(2)}</priority>
  </url>`).join("\n")}
</urlset>`;
};

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [
      { data: institutes, error: institutesError },
      { data: colleges, error: collegesError },
      { data: exams, error: examsError },
      { data: categories, error: categoriesError },
      { data: articles, error: articlesError },
      { data: cityPages, error: cityPagesError },
    ] = await Promise.all([
      supabase.from("institutes").select("slug"),
      supabase.from("colleges").select("slug"),
      supabase.from("exams").select("slug"),
      supabase.from("categories").select("slug"),
      supabase.from("articles").select("slug").eq("published", true),
      supabase.from("city_pages").select("slug").eq("active", true),
    ]);

    const queryErrors = [
      institutesError,
      collegesError,
      examsError,
      categoriesError,
      articlesError,
      cityPagesError,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      throw new Error(queryErrors.map((error) => error.message).join("; "));
    }

    const urls = [
      ...STATIC_PAGES,
      ...(institutes ?? []).flatMap((institute: { slug: string | null }) => institute.slug ? [{ loc: `/institute/${institute.slug}`, priority: 0.8 }] : []),
      ...(colleges ?? []).flatMap((college: { slug: string | null }) => college.slug ? [{ loc: `/college/${college.slug}`, priority: 0.8 }] : []),
      ...(exams ?? []).flatMap((exam: { slug: string | null }) => exam.slug ? [{ loc: `/exam/${exam.slug}`, priority: 0.7 }] : []),
      ...(categories ?? []).flatMap((category: { slug: string | null }) => category.slug ? [{ loc: `/category/${category.slug}`, priority: 0.7 }] : []),
      ...(articles ?? []).flatMap((article: { slug: string | null }) => article.slug ? [{ loc: `/article/${article.slug}`, priority: 0.6 }] : []),
      ...(cityPages ?? []).flatMap((cityPage: { slug: string | null }) => cityPage.slug ? [{ loc: `/colleges/${cityPage.slug}`, priority: 0.8 }] : []),
    ];

    const xml = buildSitemapXml(urls);

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(message)}</error>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
