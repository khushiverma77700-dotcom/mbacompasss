import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Copy, CheckCircle, Link2, Sparkles } from "lucide-react";
import STATIC_PAGES_CONFIG from "@/data/staticPages";

const SITE_URL = "https://bschoolbuzz.com";
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

  const fetchLinks = async (isInitial = false) => {
    setLoading(true);
    try {
      const allLinks: LinkItem[] = [];

      // Static pages — auto-detected from centralized config
      const staticPages = STATIC_PAGES_CONFIG.map(sp => ({
        url: sp.path,
        label: sp.label,
        type: "Static",
      }));
      allLinks.push(...staticPages);

      // Institutes
      const { data: institutes } = await supabase.from("institutes").select("slug, name");
      institutes?.forEach((i) => allLinks.push({ url: `/institute/${i.slug}`, label: i.name, type: "Institute" }));

      // Colleges
      const { data: colleges } = await supabase.from("colleges").select("slug, name");
      colleges?.forEach((c) => allLinks.push({ url: `/college/${c.slug}`, label: c.name, type: "College" }));

      // Exams
      const { data: exams } = await supabase.from("exams").select("slug, name");
      exams?.forEach((e) => allLinks.push({ url: `/exam/${e.slug}`, label: e.name, type: "Exam" }));

      // Categories
      const { data: categories } = await supabase.from("categories").select("slug, name");
      categories?.forEach((c) => allLinks.push({ url: `/category/${c.slug}`, label: c.name, type: "Category" }));

      // Articles
      const { data: articles } = await supabase.from("articles").select("slug, title").eq("published", true);
      articles?.forEach((a) => allLinks.push({ url: `/article/${a.slug}`, label: a.title, type: "Article" }));

      // City/State pages
      const { data: cityPages } = await supabase.from("city_pages").select("slug, name").eq("active", true);
      cityPages?.forEach((cp) => allLinks.push({ url: `/colleges/${cp.slug}`, label: cp.name, type: "City/State" }));

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

      {/* New links banner */}
      {newLinks.length > 0 && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              {newLinks.length} New Link{newLinks.length > 1 ? "s" : ""} Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {newLinks.map((l) => (
              <div key={l.url} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-green-600 border-green-500/50">NEW</Badge>
                <span className="font-medium">{l.label}</span>
                <span className="text-muted-foreground truncate">{SITE_URL}{l.url}</span>
              </div>
            ))}
            <Button size="sm" variant="outline" className="mt-3" onClick={copyNewLinks}>
              <Copy className="w-4 h-4 mr-2" /> Copy New Links Only
            </Button>
          </CardContent>
        </Card>
      )}

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
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              {type} ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {items.map((link) => (
                <div
                  key={link.url}
                  className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  {isNew(link.url) && (
                    <Badge variant="outline" className="text-green-600 border-green-500/50 text-[10px] px-1.5 py-0">NEW</Badge>
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
