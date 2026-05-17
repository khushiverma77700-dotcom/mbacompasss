import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, RefreshCw, Loader2, Check, Search, Link2,
  Eye, MessageCircle, TrendingUp, Calendar,
} from "lucide-react";

type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

const callOptimizer = async (action: string, payload: any = {}) => {
  const { data, error } = await supabase.functions.invoke("ctr-optimizer", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
};

// ---------- Tab 1: CTR Dashboard (worst CTR pages) ----------
const CtrDashboardTab = () => {
  const [rows, setRows] = useState<GscRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ days: 28, minImpressions: 100, maxCtr: 2 });
  const { toast } = useToast();

  const fetchRows = async () => {
    setLoading(true);
    try {
      const r = await callOptimizer("fetch-gsc", {
        dimensions: ["page"],
        days: filters.days,
        rowLimit: 200,
        minImpressions: filters.minImpressions,
        maxCtr: filters.maxCtr / 100,
      });
      setRows((r.rows || []).sort((a: GscRow, b: GscRow) => b.impressions - a.impressions));
    } catch (e: any) {
      toast({ title: "Failed to fetch GSC", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-sky-600" /> Worst-CTR Pages</CardTitle>
        <CardDescription>Pages getting impressions but failing to win the click. Fix these first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Days lookback</Label>
            <Input type="number" value={filters.days}
              onChange={(e) => setFilters({ ...filters, days: +e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Min impressions</Label>
            <Input type="number" value={filters.minImpressions}
              onChange={(e) => setFilters({ ...filters, minImpressions: +e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Max CTR (%)</Label>
            <Input type="number" step="0.1" value={filters.maxCtr}
              onChange={(e) => setFilters({ ...filters, maxCtr: +e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchRows} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Fetch
            </Button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Impr</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Pos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-md truncate font-mono text-xs">{r.keys[0]}</TableCell>
                    <TableCell className="text-right">{r.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.clicks}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.ctr < 0.01 ? "destructive" : "secondary"}>
                        {(r.ctr * 100).toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.position.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------- Tab 2: Meta Rewriter ----------
const MetaRewriterTab = () => {
  const [pageUrl, setPageUrl] = useState("");
  const [topQueries, setTopQueries] = useState("");
  const [current, setCurrent] = useState({ title: "", description: "" });
  const [suggestion, setSuggestion] = useState<{ title: string; description: string; reasoning: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true); setSuggestion(null);
    try {
      const s = await callOptimizer("rewrite-meta", {
        url: pageUrl,
        currentTitle: current.title,
        currentDescription: current.description,
        topQueries: topQueries.split("\n").map((q) => q.trim()).filter(Boolean),
      });
      setSuggestion(s);
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const apply = async () => {
    if (!suggestion) return;
    setApplying(true);
    try {
      await callOptimizer("apply-rewrite", {
        page_url: pageUrl,
        new_title: suggestion.title,
        new_description: suggestion.description,
        old_title: current.title,
        old_description: current.description,
      });
      toast({ title: "Applied", description: "Meta saved and page updated." });
    } catch (e: any) {
      toast({ title: "Apply failed", description: e.message, variant: "destructive" });
    }
    setApplying(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-sky-600" /> AI Meta Title & Description Rewriter</CardTitle>
        <CardDescription>Formula: Keyword + 2026 + Hook | MBA Compass. Maximizes CTR for position 4–10 pages.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Page URL</Label>
          <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)}
            placeholder="https://mbacompass.in/college/iim-ahmedabad" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Current title</Label>
            <Input value={current.title} onChange={(e) => setCurrent({ ...current, title: e.target.value })} />
          </div>
          <div>
            <Label>Current description</Label>
            <Input value={current.description} onChange={(e) => setCurrent({ ...current, description: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Top Google queries (one per line)</Label>
          <Textarea rows={4} value={topQueries} onChange={(e) => setTopQueries(e.target.value)}
            placeholder="iim ahmedabad placement report 2026&#10;iim a average package&#10;iim ahmedabad fees" />
        </div>
        <Button onClick={generate} disabled={!pageUrl || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          Generate AI Rewrite
        </Button>

        {suggestion && (
          <div className="rounded-lg border bg-sky-50/50 p-4 space-y-3">
            <div>
              <Label className="text-xs uppercase">New Title ({suggestion.title.length} chars)</Label>
              <p className="font-medium">{suggestion.title}</p>
            </div>
            <div>
              <Label className="text-xs uppercase">New Description ({suggestion.description.length} chars)</Label>
              <p className="text-sm">{suggestion.description}</p>
            </div>
            <p className="text-xs text-muted-foreground italic">{suggestion.reasoning}</p>
            <Button onClick={apply} disabled={applying} size="sm">
              {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
              Apply to live page
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------- Tab 3: FAQ Schema Injector ----------
const FaqInjectorTab = () => {
  const [pageUrl, setPageUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [topQueries, setTopQueries] = useState("");
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true); setFaqs([]);
    try {
      const s = await callOptimizer("generate-faqs", {
        url: pageUrl, topic,
        topQueries: topQueries.split("\n").map((q) => q.trim()).filter(Boolean),
      });
      setFaqs(s.faqs || []);
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const apply = async () => {
    setApplying(true);
    try {
      await callOptimizer("apply-faqs", { page_url: pageUrl, faqs });
      toast({ title: "Applied", description: `${faqs.length} FAQs saved. Rich snippets will appear after Google re-crawl.` });
    } catch (e: any) {
      toast({ title: "Apply failed", description: e.message, variant: "destructive" });
    }
    setApplying(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-sky-600" /> FAQ Schema Auto-Injector</CardTitle>
        <CardDescription>Generates FAQs from real Google queries → saves to page → renders FAQPage JSON-LD → wins rich snippets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Page URL</Label>
          <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://mbacompass.in/college/..." />
        </div>
        <div>
          <Label>Page topic (optional)</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="IIM Ahmedabad MBA placement report" />
        </div>
        <div>
          <Label>Top Google queries</Label>
          <Textarea rows={4} value={topQueries} onChange={(e) => setTopQueries(e.target.value)} />
        </div>
        <Button onClick={generate} disabled={!pageUrl || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          Generate FAQs
        </Button>

        {faqs.length > 0 && (
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <Input value={f.q} onChange={(e) => {
                  const next = [...faqs]; next[i] = { ...next[i], q: e.target.value }; setFaqs(next);
                }} className="font-medium" />
                <Textarea value={f.a} rows={3} onChange={(e) => {
                  const next = [...faqs]; next[i] = { ...next[i], a: e.target.value }; setFaqs(next);
                }} />
              </div>
            ))}
            <Button onClick={apply} disabled={applying}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
              Save {faqs.length} FAQs to page
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------- Tab 4: Freshness ----------
const FreshnessTab = () => {
  const [pageUrl, setPageUrl] = useState("");
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  const apply = async () => {
    setApplying(true);
    try {
      await callOptimizer("apply-freshness", { page_url: pageUrl });
      toast({ title: "Bumped", description: "updated_at refreshed. Sitemap lastmod & freshness badge will update." });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setApplying(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-sky-600" /> Freshness Bump</CardTitle>
        <CardDescription>
          Bumps the page's <code>updated_at</code> so the sitemap's <code>lastmod</code> changes and Google re-crawls.
          The <code>&lt;FreshnessBadge /&gt;</code> component renders "Updated &lt;Month Year&gt;" on the page using this timestamp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Page URL</Label>
          <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://mbacompass.in/college/..." />
        </div>
        <Button onClick={apply} disabled={!pageUrl || applying}>
          {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          Bump freshness
        </Button>
        <div className="rounded-lg border bg-sky-50/50 p-3 text-sm text-muted-foreground">
          <strong>To show the badge on a page</strong>, import and use:
          <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-x-auto">{`import FreshnessBadge from "@/components/FreshnessBadge";

<FreshnessBadge date={college.updated_at} />`}</pre>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Tab 5: Internal Links ----------
const InternalLinksTab = () => {
  const [pageUrl, setPageUrl] = useState("");
  const [topQueries, setTopQueries] = useState("");
  const [topPages, setTopPages] = useState("/\n/colleges\n/coaching\n/mocks");
  const [links, setLinks] = useState<{ from_url: string; anchor: string; context_sentence: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true); setLinks([]);
    try {
      const s = await callOptimizer("suggest-links", {
        url: pageUrl,
        topQueries: topQueries.split("\n").map((q) => q.trim()).filter(Boolean),
        topPages: topPages.split("\n").map((p) => ({ url: p.trim() })).filter((p) => p.url),
      });
      setLinks(s.links || []);
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-sky-600" /> Internal Link Booster</CardTitle>
        <CardDescription>Push a position #4-10 page to #1-3 by adding contextual internal links from your top-traffic pages.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Target page URL (struggling at #4-10)</Label>
          <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
        </div>
        <div>
          <Label>Top queries this page ranks for</Label>
          <Textarea rows={3} value={topQueries} onChange={(e) => setTopQueries(e.target.value)} />
        </div>
        <div>
          <Label>Your top-traffic pages (one URL per line)</Label>
          <Textarea rows={4} value={topPages} onChange={(e) => setTopPages(e.target.value)} />
        </div>
        <Button onClick={generate} disabled={!pageUrl || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          Suggest internal links
        </Button>

        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm space-y-1">
                <div><span className="text-xs text-muted-foreground">FROM:</span> <code className="text-xs">{l.from_url}</code></div>
                <div><span className="text-xs text-muted-foreground">ANCHOR:</span> <strong>{l.anchor}</strong></div>
                <div className="text-muted-foreground italic">"{l.context_sentence}"</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------- Tab 6: SERP Preview ----------
const SerpPreviewTab = () => {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("https://mbacompass.in/college/iim-ahmedabad");

  // Approx Google SERP pixel widths
  const titlePx = title.length * 8.5;
  const descPx = desc.length * 6.5;
  const titleOverflow = titlePx > 580;
  const descOverflow = descPx > 920;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-sky-600" /> SERP Preview</CardTitle>
        <CardDescription>Exactly how your page will look in Google. Google truncates by pixel width, not character count.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meta title" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Meta description" rows={3} />
        </div>

        <div className="rounded-lg border bg-white p-4 max-w-2xl">
          <div className="text-xs text-emerald-700">{url}</div>
          <div className="text-xl text-sky-700 hover:underline cursor-pointer truncate" style={{ maxWidth: 580 }}>
            {title || "Your title appears here"}
          </div>
          <div className="text-sm text-slate-600 mt-1 line-clamp-2" style={{ maxWidth: 600 }}>
            {desc || "Your description appears here. Aim for 140-158 chars including the primary keyword."}
          </div>
        </div>

        <div className="flex gap-3 text-xs">
          <Badge variant={titleOverflow ? "destructive" : "secondary"}>
            Title ≈{Math.round(titlePx)}px / 580px max
          </Badge>
          <Badge variant={descOverflow ? "destructive" : "secondary"}>
            Description ≈{Math.round(descPx)}px / 920px max
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Page wrapper ----------
const AdminCTROptimizer = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-sky-600" /> CTR Optimizer
        </h1>
        <p className="text-muted-foreground">
          Fix the click — improve CTR + push positions 4-10 → 1-3. Powered by Google Search Console + AI.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="dashboard"><Search className="h-4 w-4 mr-1.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="meta"><Sparkles className="h-4 w-4 mr-1.5" />Meta Rewriter</TabsTrigger>
          <TabsTrigger value="faqs"><MessageCircle className="h-4 w-4 mr-1.5" />FAQs</TabsTrigger>
          <TabsTrigger value="freshness"><Calendar className="h-4 w-4 mr-1.5" />Freshness</TabsTrigger>
          <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-1.5" />Links</TabsTrigger>
          <TabsTrigger value="serp"><Eye className="h-4 w-4 mr-1.5" />SERP</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4"><CtrDashboardTab /></TabsContent>
        <TabsContent value="meta" className="mt-4"><MetaRewriterTab /></TabsContent>
        <TabsContent value="faqs" className="mt-4"><FaqInjectorTab /></TabsContent>
        <TabsContent value="freshness" className="mt-4"><FreshnessTab /></TabsContent>
        <TabsContent value="links" className="mt-4"><InternalLinksTab /></TabsContent>
        <TabsContent value="serp" className="mt-4"><SerpPreviewTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCTROptimizer;
