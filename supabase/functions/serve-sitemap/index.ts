import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://bschoolbuzz.com";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/about", priority: "0.7", changefreq: "weekly" },
  { path: "/contact", priority: "0.7", changefreq: "weekly" },
  { path: "/blog", priority: "0.7", changefreq: "daily" },
  { path: "/colleges", priority: "0.7", changefreq: "weekly" },
  { path: "/compare", priority: "0.7", changefreq: "weekly" },
  { path: "/college-finder", priority: "0.7", changefreq: "weekly" },
  { path: "/profile-analyzer", priority: "0.7", changefreq: "weekly" },
  { path: "/college-shortlister", priority: "0.7", changefreq: "weekly" },
];

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const urls: { loc: string; priority: string; changefreq: string }[] = [
      ...STATIC_PAGES,
    ];

    const [
      { data: institutes },
      { data: colleges },
      { data: exams },
      { data: categories },
      { data: articles },
      { data: cityPages },
    ] = await Promise.all([
      supabase.from("institutes").select("slug"),
      supabase.from("colleges").select("slug"),
      supabase.from("exams").select("slug"),
      supabase.from("categories").select("slug"),
      supabase.from("articles").select("slug").eq("published", true),
      supabase.from("city_pages").select("slug").eq("active", true),
    ]);

    institutes?.forEach((i: any) => urls.push({ loc: `/institute/${i.slug}`, priority: "0.8", changefreq: "weekly" }));
    colleges?.forEach((c: any) => urls.push({ loc: `/college/${c.slug}`, priority: "0.8", changefreq: "weekly" }));
    exams?.forEach((e: any) => urls.push({ loc: `/exam/${e.slug}`, priority: "0.7", changefreq: "weekly" }));
    categories?.forEach((c: any) => urls.push({ loc: `/category/${c.slug}`, priority: "0.7", changefreq: "weekly" }));
    articles?.forEach((a: any) => urls.push({ loc: `/article/${a.slug}`, priority: "0.6", changefreq: "weekly" }));
    cityPages?.forEach((cp: any) => urls.push({ loc: `/colleges/${cp.slug}`, priority: "0.8", changefreq: "weekly" }));

    const now = new Date().toISOString().split("T")[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>${err.message}</error>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
