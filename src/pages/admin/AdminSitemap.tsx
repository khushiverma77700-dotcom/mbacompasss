import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Globe, ExternalLink, Copy, CheckCircle, Download, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const SITE_URL = "https://bschoolbuzz.com";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const LIVE_SITEMAP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/serve-sitemap`;

const AdminSitemap = () => {
  const [sitemapXml, setSitemapXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlCount, setUrlCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateSitemap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${LIVE_SITEMAP_URL}?cb=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Sitemap engine returned ${res.status}`);
      const xml = await res.text();
      const totalUrls = (xml.match(/<url>/g) || []).length;

      setSitemapXml(xml);
      setUrlCount(totalUrls);

      await supabase.from("site_settings").upsert({
        key: "sitemap_xml",
        value: JSON.stringify({ xml, generated_at: new Date().toISOString(), url_count: totalUrls }),
      }, { onConflict: "key" });

      toast({ title: "Sitemap Generated", description: `${totalUrls} URLs ready. Download and replace public/sitemap.xml to publish on your domain.` });
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
          {loading ? "Generating..." : "Generate Sitemap"}
        </Button>
      </div>

      <Card className="border-border bg-muted/30">
        <CardContent className="pt-6 flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">How publishing works</p>
            <p className="text-muted-foreground">
              The live sitemap engine always returns fresh URLs from your database. To publish them at <code className="text-primary">{SITEMAP_URL}</code>, click <strong>Generate Sitemap</strong>, then <strong>Download .xml</strong>, and replace <code>public/sitemap.xml</code> in your project. A 6-hour cron also keeps the saved snapshot fresh.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Globe className="w-5 h-5" /> Submit to Google</CardTitle>
            <CardDescription>Submit your same-domain sitemap URL to Google Search Console.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2">
                <code className="text-sm text-primary flex-1 break-all">{SITEMAP_URL}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(SITEMAP_URL);
                    toast({ title: "URL copied!" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Google Search Console only accepts sitemaps on the verified domain. Always submit <code>{SITEMAP_URL}</code>.
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
                  <span className="font-bold text-foreground">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied!" : "Copy XML"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadSitemap}>
                    <Download className="w-4 h-4 mr-1" />
                    Download .xml
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Generate Sitemap" to fetch the latest URLs from your database.</p>
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
