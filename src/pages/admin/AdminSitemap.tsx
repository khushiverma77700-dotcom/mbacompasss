import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Globe, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const SITE_URL = "https://bestmbacoaching.com";

const AdminSitemap = () => {
  const [sitemapXml, setSitemapXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlCount, setUrlCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateSitemap = async () => {
    setLoading(true);
    try {
      const urls: { loc: string; priority: string; changefreq: string }[] = [];

      // Static pages
      const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/colleges", priority: "0.9", changefreq: "daily" },
        { loc: "/blog", priority: "0.8", changefreq: "daily" },
        { loc: "/compare", priority: "0.7", changefreq: "weekly" },
        { loc: "/profile-analyzer", priority: "0.8", changefreq: "weekly" },
        { loc: "/about", priority: "0.5", changefreq: "monthly" },
        { loc: "/contact", priority: "0.5", changefreq: "monthly" },
      ];
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

      institutes?.forEach((i) => urls.push({ loc: `/institute/${i.slug}`, priority: "0.8", changefreq: "weekly" }));
      colleges?.forEach((c) => urls.push({ loc: `/college/${c.slug}`, priority: "0.8", changefreq: "weekly" }));
      exams?.forEach((e) => urls.push({ loc: `/exam/${e.slug}`, priority: "0.7", changefreq: "weekly" }));
      categories?.forEach((c) => urls.push({ loc: `/category/${c.slug}`, priority: "0.7", changefreq: "weekly" }));
      articles?.forEach((a) => urls.push({ loc: `/article/${a.slug}`, priority: "0.6", changefreq: "weekly" }));
      cityPages?.forEach((cp) => urls.push({ loc: `/colleges/${cp.slug}`, priority: "0.8", changefreq: "weekly" }));

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

      setSitemapXml(xml);
      setUrlCount(urls.length);

      // Save to site_settings for reference
      await supabase.from("site_settings").upsert({
        key: "sitemap_xml",
        value: JSON.stringify({ xml, generated_at: new Date().toISOString(), url_count: urls.length }),
      }, { onConflict: "key" });

      toast({ title: "Sitemap Generated!", description: `${urls.length} URLs included.` });
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
          {loading ? "Generating..." : "Generate / Refresh Sitemap"}
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
                <strong>Step 1:</strong> Click "Generate / Refresh Sitemap" above to create the latest sitemap.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Step 2:</strong> Download the sitemap.xml file and host it at your domain root.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Step 3:</strong> Go to Google Search Console and submit the sitemap URL:
              </p>
              <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2">
                <code className="text-sm text-primary flex-1 break-all">{SITE_URL}/sitemap.xml</code>
              </div>
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
