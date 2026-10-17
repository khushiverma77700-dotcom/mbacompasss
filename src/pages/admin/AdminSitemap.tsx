import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import SitemapDailyTracker from "./SitemapDailyTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Globe, ExternalLink, Copy, CheckCircle, Download, AlertTriangle, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { readSitemapInventory } from "@/lib/sitemapInventory";

const SITE_URL = "https://mbacompass.in";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

function fmtIST(d: Date) {
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}


const AdminSitemap = () => {
  const [sitemapXml, setSitemapXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlCount, setUrlCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [files, setFiles] = useState<{ url: string; urlCount: number }[]>([]);
  const [allUrls, setAllUrls] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return (q ? allUrls.filter(u => u.toLowerCase().includes(q)) : allUrls).slice(0, 500); }, [allUrls, query]);
  const { toast } = useToast();


  const generateSitemap = async () => {
    setLoading(true);
    try {
      const inventory = await readSitemapInventory(`${window.location.origin}/sitemap.xml`);
      const { xml, urlCount: totalUrls, imageCount: totalImages } = inventory;

      setSitemapXml(xml);
      setUrlCount(totalUrls);
      setImageCount(totalImages);
      setFileCount(inventory.fileCount);
      setFiles(inventory.files);
      setAllUrls(inventory.urls);
      setCheckedAt(new Date().toISOString());

      // Google Indexing API integration removed to reduce backend load.
      toast({
        title: "Sitemap checked",
        description: `${totalUrls} URLs across ${inventory.fileCount} sitemap files.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generateSitemap(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = () => {
    navigator.clipboard.writeText(sitemapXml);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 3000);
  };

  const downloadSitemap = () => {
    const xml = sitemapXml;
    const name = "sitemap.xml";
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground">Sitemap Manager</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={generateSitemap} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing…" : "Refresh Sitemap"}
          </Button>
        </div>
      </div>

      <Card className="border-border bg-muted/30">
        <CardContent className="pt-6 flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">How publishing works</p>
            <p className="text-muted-foreground">
              Submit <code className="text-primary">{SITEMAP_URL}</code> to Google Search Console. Its child files cover public pages, including city, state and filter pages. Private student dashboards are excluded.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" /> Publication status
          </CardTitle>
          <CardDescription>
            Sitemap files are regenerated when the website is published. Refresh checks the current files; it does not publish newly added pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Last check</div>
            <div className="font-semibold">
              {checkedAt ? fmtIST(new Date(checkedAt)) : "Not checked yet"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">URLs in sitemap files</div>
            <div className="font-semibold">{urlCount || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Sitemap files</div>
            <div className="font-semibold">
              {fileCount || "—"}
            </div>
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
                  <span className="text-muted-foreground">Images included</span>
                  <span className="font-bold text-foreground">{imageCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last checked</span>
                  <span className="font-bold text-foreground">{checkedAt ? fmtIST(new Date(checkedAt)) : "—"}</span>
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
              <p className="text-sm text-muted-foreground">Refresh Sitemap checks every child file in the current sitemap index.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {files.length > 0 && <SitemapDailyTracker files={files} indexUrl={SITEMAP_URL} totalUrls={urlCount} />}

      {allUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All links ({allUrls.length})</CardTitle>
            <CardDescription>Every page currently listed in the sitemap. Search to filter; showing up to 500 at a time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search links, e.g. iim or delhi" className="max-w-sm" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(allUrls.join("\n")); toast({ title: `${allUrls.length} links copied` }); }}><Copy className="w-4 h-4 mr-1" /> Copy all links</Button>
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border border-border divide-y divide-border text-sm">
              {shown.map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block px-3 py-1.5 text-primary hover:underline break-all">{u}</a>)}
            </div>
            {query && <p className="text-xs text-muted-foreground">{allUrls.filter(u => u.toLowerCase().includes(query.trim().toLowerCase())).length} matches</p>}
          </CardContent>
        </Card>
      )}

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
