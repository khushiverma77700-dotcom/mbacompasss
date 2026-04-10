import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Globe, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import STATIC_PAGES_CONFIG from "@/data/staticPages";

const SITE_URL = "https://bschoolbuzz.com";
const LIVE_SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const EXCLUDED_SITEMAP_PATHS = new Set(["/auth", "/dashboard"]);

const buildSitemapXml = (urls: { loc: string; priority: number }[]) => {
  const uniqueUrls = Array.from(
    new Map(urls.filter((url) => url.loc).map((url) => [url.loc, url])).values(),
  );
  const lastmod = new Date().toISOString();

  return {
    urlCount: uniqueUrls.length,
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${uniqueUrls.map((url) => `  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${url.priority.toFixed(2)}</priority>
  </url>`).join("\n")}
</urlset>`,
  };
};

const AdminSitemap = () => {
  const [sitemapXml, setSitemapXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlCount, setUrlCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateSitemap = async () => {
    setLoading(true);
    try {
      const urls: { loc: string; priority: number }[] = [];

      // Static pages — auto-detected from centralized config
      const staticPages = STATIC_PAGES_CONFIG.filter((page) => !EXCLUDED_SITEMAP_PATHS.has(page.path)).map(sp => ({
        loc: sp.path,
        priority: sp.path === "/" ? 1.0 : 0.7,
      }));
      urls.push(...staticPages);

      // Fetch all dynamic content from DB in parallel
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

      institutes?.forEach((i) => i.slug && urls.push({ loc: `/institute/${i.slug}`, priority: 0.8 }));
      colleges?.forEach((c) => c.slug && urls.push({ loc: `/college/${c.slug}`, priority: 0.8 }));
      exams?.forEach((e) => e.slug && urls.push({ loc: `/exam/${e.slug}`, priority: 0.7 }));
      categories?.forEach((c) => c.slug && urls.push({ loc: `/category/${c.slug}`, priority: 0.7 }));
      articles?.forEach((a) => a.slug && urls.push({ loc: `/article/${a.slug}`, priority: 0.6 }));
      cityPages?.forEach((cp) => cp.slug && urls.push({ loc: `/colleges/${cp.slug}`, priority: 0.8 }));

      const { xml, urlCount: totalUrls } = buildSitemapXml(urls);

      setSitemapXml(xml);
      setUrlCount(totalUrls);

      // Save to site_settings for reference
      await supabase.from("site_settings").upsert({
        key: "sitemap_xml",
        value: JSON.stringify({ xml, generated_at: new Date().toISOString(), url_count: totalUrls }),
      }, { onConflict: "key" });

      toast({ title: "Sitemap Preview Generated!", description: `${totalUrls} URLs ready. Publish the app to refresh the live sitemap.xml file.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sitemapXml);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 3000);
  };

  const downloadSitemap = () => {
    const blob = new Blob([sitemapXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Sitemap Manager</h1>
        <Button onClick={generateSitemap} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating..." : "Generate Sitemap Preview"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Globe className="w-5 h-5" /> Submit to Google</CardTitle>
            <CardDescription>Submit your sitemap to Google Search Console for indexing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>Step 1:</strong> Click "Generate Sitemap Preview" above to review the latest sitemap XML.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Step 2:</strong> Publish the app so the live <code className="text-xs">/sitemap.xml</code> file updates on your domain root.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Step 3:</strong> Go to Google Search Console and submit the sitemap URL:
              </p>
              <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2">
                <code className="text-sm text-primary flex-1 break-all">{LIVE_SITEMAP_URL}</code>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Submit your domain sitemap URL in Google Search Console.
              </p>
            </div>
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <ExternalLink className="w-4 h-4" /> Open Google Search Console
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {urlCount > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total URLs</span>
                  <span className="font-bold text-foreground">{urlCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Generated</span>
                  <span className="font-bold text-foreground">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied!" : "Copy XML"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadSitemap}>
                    Download .xml
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Generate / Refresh Sitemap" to create your sitemap.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {sitemapXml && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sitemap Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sitemapXml}
              readOnly
              className="font-mono text-xs min-h-[300px]"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSitemap;
