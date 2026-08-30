import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Copy, CheckCircle, Link2, Sparkles } from "lucide-react";
import STATIC_PAGES_CONFIG from "@/data/staticPages";

const SITE_URL = "https://mbacompass.in";
const STORAGE_KEY = "admin_known_links";

interface LinkItem {
  url: string;
  label: string;
  type: string;
}

const AdminAllLinks = () => {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [previousLinks, setPreviousLinks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreviousLinks(new Set(parsed.links || []));
        setLastRefreshed(parsed.refreshedAt || null);
      } catch {}
    }
    fetchLinks(true);
  }, []);

  const inferType = (path: string): string => {
    if (path.startsWith("/institute/")) return "Institute";
    if (path.startsWith("/college/")) return "College";
    if (path.startsWith("/exam/")) return "Exam";
    if (path.startsWith("/category/")) return "Category";
    if (path.startsWith("/article/") || path.startsWith("/blog/")) return "Article";
    if (path.startsWith("/colleges/") || path.startsWith("/coaching/")) return "City/State";
    if (path.startsWith("/courses/") || path.startsWith("/course/")) return "Course";
    if (path.startsWith("/news/") || path.startsWith("/newsroom/")) return "News";
    if (path.startsWith("/formula")) return "Formula";
    return "Static";
  };

  const fetchLinks = async (isInitial = false) => {
    setLoading(true);
    try {
      const labelMap = new Map<string, string>();

      // Static pages — labels first
      STATIC_PAGES_CONFIG.forEach((sp) => labelMap.set(sp.path, sp.label));

      // Pull labels from DB in parallel (best-effort; failures are non-fatal)
      const [institutes, colleges, exams, categories, articles, cityPages] = await Promise.all([
        supabase.from("institutes").select("slug, name").then((r) => r.data || []),
        supabase.from("colleges").select("slug, name").then((r) => r.data || []),
        supabase.from("exams").select("slug, name").then((r) => r.data || []),
        supabase.from("categories").select("slug, name").then((r) => r.data || []),
        supabase.from("articles").select("slug, title").eq("published", true).then((r) => r.data || []),
        supabase.from("city_pages").select("slug, name").eq("active", true).then((r) => r.data || []),
      ]);
      institutes.forEach((i: any) => i.slug && labelMap.set(`/institute/${i.slug}`, i.name));
      colleges.forEach((c: any) => c.slug && labelMap.set(`/college/${c.slug}`, c.name));
      exams.forEach((e: any) => e.slug && labelMap.set(`/exam/${e.slug}`, e.name));
      categories.forEach((c: any) => c.slug && labelMap.set(`/category/${c.slug}`, c.name));
      articles.forEach((a: any) => a.slug && labelMap.set(`/article/${a.slug}`, a.title));
      cityPages.forEach((cp: any) => cp.slug && labelMap.set(`/colleges/${cp.slug}`, cp.name));

      // Source of truth: the live sitemap (matches Google Search Console).
      const SITEMAP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/serve-sitemap`;
      const seen = new Set<string>();
      const allLinks: LinkItem[] = [];
      try {
        const res = await fetch(`${SITEMAP_URL}?cb=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const xml = await res.text();
          const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
          for (const loc of locs) {
            let path = loc;
            try {
              path = new URL(loc).pathname + new URL(loc).search;
            } catch {}
            if (!path.startsWith("/")) continue;
            if (seen.has(path)) continue;
            seen.add(path);
            const type = inferType(path);
            const label = labelMap.get(path) || decodeURIComponent(path.split("/").pop() || path) || path;
            allLinks.push({ url: path, label, type });
          }
        }
      } catch (e) {
        console.warn("[AllLinks] sitemap fetch failed", e);
      }

      // Safety net: include static pages even if sitemap missed any
      STATIC_PAGES_CONFIG.forEach((sp) => {
        if (!seen.has(sp.path)) {
          seen.add(sp.path);
          allLinks.push({ url: sp.path, label: sp.label, type: "Static" });
        }
      });

      setLinks(allLinks);

      if (!isInitial) {
        // On manual refresh, save current links as "known"
        const urlSet = allLinks.map((l) => l.url);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ links: urlSet, refreshedAt: new Date().toISOString() }));
        setPreviousLinks(new Set(urlSet));
        setLastRefreshed(new Date().toISOString());
        toast({ title: "Links Refreshed!", description: `${allLinks.length} links found.` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isNew = (url: string) => previousLinks.size > 0 && !previousLinks.has(url);

  const newLinks = links.filter((l) => isNew(l.url));

  const copyAllLinks = () => {
    const text = links.map((l) => `${SITE_URL}${l.url}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "All links copied!" });
    setTimeout(() => setCopied(false), 3000);
  };

  const copyNewLinks = () => {
    const text = newLinks.map((l) => `${SITE_URL}${l.url}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: `${newLinks.length} new link(s) copied!` });
  };

  const copySection = (type: string, items: LinkItem[]) => {
    const text = items.map((l) => `${SITE_URL}${l.url}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: `${items.length} ${type} link(s) copied!` });
  };

  const copyNewSection = (type: string, items: LinkItem[]) => {
    const text = items.map((l) => `${SITE_URL}${l.url}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: `${items.length} new ${type} link(s) copied!` });
  };

  const groupedLinks = links.reduce<Record<string, LinkItem[]>>((acc, link) => {
    if (!acc[link.type]) acc[link.type] = [];
    acc[link.type].push(link);
    return acc;
  }, {});

  const typeColors: Record<string, string> = {
    Static: "bg-primary/10 text-primary",
    Institute: "bg-blue-500/10 text-blue-600",
    College: "bg-green-500/10 text-green-600",
    Exam: "bg-orange-500/10 text-orange-600",
    Category: "bg-purple-500/10 text-purple-600",
    Article: "bg-pink-500/10 text-pink-600",
    "City/State": "bg-teal-500/10 text-teal-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">All Site Links</h1>
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground mt-1">
              Last refreshed: {new Date(lastRefreshed).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => fetchLinks(false)} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={copyAllLinks} disabled={links.length === 0}>
            {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : `Copy All (${links.length})`}
          </Button>
        </div>
      </div>

      {/* New links banner — grouped by type */}
      {newLinks.length > 0 && (() => {
        const newGrouped = newLinks.reduce<Record<string, LinkItem[]>>((acc, l) => {
          (acc[l.type] = acc[l.type] || []).push(l);
          return acc;
        }, {});
        return (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                {newLinks.length} New Link{newLinks.length > 1 ? "s" : ""} Detected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(newGrouped).map(([type, items]) => (
                <div key={type} className="border rounded-md p-3 bg-background">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <span className="font-semibold text-sm">{type} ({items.length} new)</span>
                    <Button size="sm" variant="outline" onClick={() => copyNewSection(type, items)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {items.map((l) => (
                      <div key={l.url} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs">NEW</Badge>
                        <span className="font-medium truncate max-w-[180px]">{l.label}</span>
                        <span className="text-muted-foreground truncate flex-1">{SITE_URL}{l.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button size="sm" onClick={copyNewLinks}>
                <Copy className="w-4 h-4 mr-2" /> Copy All New Links ({newLinks.length})
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(groupedLinks).map(([type, items]) => (
          <Card key={type} className="text-center">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{items.length}</p>
              <p className="text-xs text-muted-foreground">{type}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Links by type */}
      {Object.entries(groupedLinks).map(([type, items]) => (
        <Card key={type}>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              {type} ({items.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => copySection(type, items)}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy {type}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {items.map((link) => (
                <div
                  key={link.url}
                  className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  {isNew(link.url) && (
                    <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs px-1.5 py-0">NEW</Badge>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[type] || "bg-muted text-muted-foreground"}`}>
                    {type}
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[200px]">{link.label}</span>
                  <span className="text-muted-foreground text-xs truncate flex-1">{SITE_URL}{link.url}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminAllLinks;
