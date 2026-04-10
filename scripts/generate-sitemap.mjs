import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://bschoolbuzz.com";
const OUTPUT_PATH = path.join(process.cwd(), "public", "sitemap.xml");
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

const escapeXml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const parseEnvFile = async () => {
  try {
    const envFile = await readFile(path.join(process.cwd(), ".env"), "utf8");

    return Object.fromEntries(
      envFile
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separatorIndex = line.indexOf("=");
          const key = line.slice(0, separatorIndex).trim();
          const rawValue = line.slice(separatorIndex + 1).trim();
          const value = rawValue.replace(/^['"]|['"]$/g, "");

          return [key, value];
        }),
    );
  } catch {
    return {};
  }
};

const resolveEnv = async () => {
  const envFile = await parseEnvFile();

  return {
    supabaseUrl:
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      envFile.VITE_SUPABASE_URL ||
      envFile.SUPABASE_URL ||
      "",
    supabaseKey:
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      envFile.VITE_SUPABASE_PUBLISHABLE_KEY ||
      envFile.SUPABASE_PUBLISHABLE_KEY ||
      envFile.VITE_SUPABASE_ANON_KEY ||
      envFile.SUPABASE_ANON_KEY ||
      "",
  };
};

const buildSitemapXml = (entries) => {
  const lastmod = new Date().toISOString();
  const uniqueEntries = Array.from(new Map(entries.filter((entry) => entry.loc).map((entry) => [entry.loc, entry])).values());

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="${XML_NAMESPACE}" xmlns:xsi="${XML_SCHEMA_INSTANCE}" xsi:schemaLocation="${XML_SCHEMA_LOCATION}">
${uniqueEntries.map((entry) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${entry.loc}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${entry.priority.toFixed(2)}</priority>
  </url>`).join("\n")}
</urlset>`;
};

const fetchTable = async (tableName, query, headers, supabaseUrl) => {
  const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl : `${supabaseUrl}/`;
  const url = new URL(`rest/v1/${tableName}?${query}`, baseUrl);
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${tableName}: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

try {
  const { supabaseUrl, supabaseKey } = await resolveEnv();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing backend environment variables for sitemap generation.");
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: "application/json",
  };

  const [institutes, colleges, exams, categories, articles, cityPages] = await Promise.all([
    fetchTable("institutes", "select=slug", headers, supabaseUrl),
    fetchTable("colleges", "select=slug", headers, supabaseUrl),
    fetchTable("exams", "select=slug", headers, supabaseUrl),
    fetchTable("categories", "select=slug", headers, supabaseUrl),
    fetchTable("articles", "select=slug&published=eq.true", headers, supabaseUrl),
    fetchTable("city_pages", "select=slug&active=eq.true", headers, supabaseUrl),
  ]);

  const xml = buildSitemapXml([
    ...STATIC_PAGES,
    ...institutes.flatMap((entry) => entry.slug ? [{ loc: `/institute/${entry.slug}`, priority: 0.8 }] : []),
    ...colleges.flatMap((entry) => entry.slug ? [{ loc: `/college/${entry.slug}`, priority: 0.8 }] : []),
    ...exams.flatMap((entry) => entry.slug ? [{ loc: `/exam/${entry.slug}`, priority: 0.7 }] : []),
    ...categories.flatMap((entry) => entry.slug ? [{ loc: `/category/${entry.slug}`, priority: 0.7 }] : []),
    ...articles.flatMap((entry) => entry.slug ? [{ loc: `/article/${entry.slug}`, priority: 0.6 }] : []),
    ...cityPages.flatMap((entry) => entry.slug ? [{ loc: `/colleges/${entry.slug}`, priority: 0.8 }] : []),
  ]);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, xml, "utf8");

  console.log(`Generated sitemap.xml at ${OUTPUT_PATH}`);
} catch (error) {
  try {
    await access(OUTPUT_PATH);
    console.warn(`Sitemap refresh failed, keeping existing sitemap.xml. ${(error instanceof Error ? error.message : "Unknown error")}`);
  } catch {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}