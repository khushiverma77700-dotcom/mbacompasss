import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Search as SearchIcon, ExternalLink, Sparkles, CheckCircle2, AlertCircle, Clock, EyeOff, Globe } from "lucide-react";

type PageInput = { url: string; slug?: string; page_type?: string; page_name?: string };
type IndexRow = {
  url: string; slug: string | null; page_type: string | null;
  verdict: string | null; coverage_state: string | null;
  index_status: string; priority: number;
  google_canonical: string | null; user_canonical: string | null;
  last_crawl_time: string | null; error: string | null;
  checked_at: string;
};

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  indexed: { label: "Indexed", cls: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  discovered_not_indexed: { label: "Discovered · not indexed", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  crawled_not_indexed: { label: "Crawled · not indexed", cls: "bg-orange-100 text-orange-800 border-orange-200", icon: EyeOff },
  excluded: { label: "Excluded", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: EyeOff },
  partial: { label: "Partial", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  error: { label: "Error", cls: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
  unknown: { label: "Unchecked", cls: "bg-slate-50 text-slate-500 border-slate-200", icon: Clock },
};

export default function IndexingStatusPanel({
  pages,
  onReseoUrls,
}: {
  pages: PageInput[];
  onReseoUrls?: (urls: string[]) => void;
}) {
  const [sites, setSites] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [statusMap, setStatusMap] = useState<Record<string, IndexRow>>({});
  const [loadingSites, setLoadingSites] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // 1. Load GSC verified sites
  useEffect(() => {
    (async () => {
      setLoadingSites(true);
      try {
        const { data, error } = await supabase.functions.invoke("gsc-index-check", {
          body: null, method: "GET",
        } as any);
        // invoke doesn't support GET reliably; fall back to fetch via query
        let list: any[] = [];
        if (!error && Array.isArray(data?.siteEntry)) list = data.siteEntry;
        else {
          const res = await fetch(
            `https://mttoiqruzzxooveooldo.supabase.co/functions/v1/gsc-index-check?action=sites`,
            { headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}` } },
          );
          const j = await res.json();
          list = j?.siteEntry || [];
        }
        setSites(list);
        if (list.length && !siteUrl) setSiteUrl(list[0].siteUrl);
      } catch (e: any) {
        toast({ title: "Google Search Console not reachable", description: e.message, variant: "destructive" });
      } finally {
        setLoadingSites(false);
      }
    })();
    // eslint-disable-next-line
  }, []);

  // 2. Load cached statuses for the given pages
  const loadCached = async () => {
    const urls = pages.map(p => p.url).filter(Boolean);
    if (!urls.length) return;
    const chunks: string[][] = [];
    for (let i = 0; i < urls.length; i += 200) chunks.push(urls.slice(i, i + 200));
    const map: Record<string, IndexRow> = {};
    for (const c of chunks) {
      const { data } = await supabase.from("page_indexing_status" as any)
        .select("*").in("url", c);
      (data as any[] || []).forEach(r => { map[r.url] = r; });
    }
    setStatusMap(map);
  };

  useEffect(() => { loadCached(); /* eslint-disable-next-line */ }, [pages.length]);

  // 3. Trigger bulk check
  const runCheck = async (subset?: PageInput[]) => {
    if (!siteUrl) { toast({ title: "Pick a verified property first", variant: "destructive" }); return; }
    const target = subset && subset.length ? subset : pages;
    if (!target.length) return;
    setChecking(true);
    setProgress({ done: 0, total: target.length });
    // Send in batches of 25 so we can update progress
    const BATCH = 25;
    try {
      for (let i = 0; i < target.length; i += BATCH) {
        const slice = target.slice(i, i + BATCH);
        const { data, error } = await supabase.functions.invoke("gsc-index-check", {
          body: { siteUrl, pages: slice },
        });
        if (error) throw new Error(error.message);
        (data?.results || []).forEach((r: IndexRow) => {
          setStatusMap(prev => ({ ...prev, [r.url]: r }));
        });
        setProgress({ done: Math.min(i + BATCH, target.length), total: target.length });
      }
      toast({ title: "Indexing check complete", description: `Checked ${target.length} URLs` });
    } catch (e: any) {
      toast({ title: "Check failed", description: e.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const rows: IndexRow[] = useMemo(() => {
    return pages.map(p => statusMap[p.url] || {
      url: p.url, slug: p.slug || null, page_type: p.page_type || null,
      verdict: null, coverage_state: null, index_status: "unknown", priority: 50,
      google_canonical: null, user_canonical: null, last_crawl_time: null, error: null,
      checked_at: "",
    } as IndexRow);
  }, [pages, statusMap]);

  const stats = useMemo(() => {
    const s = { total: rows.length, indexed: 0, discovered: 0, crawled: 0, excluded: 0, error: 0, unchecked: 0 };
    for (const r of rows) {
      if (r.index_status === "indexed") s.indexed++;
      else if (r.index_status === "discovered_not_indexed") s.discovered++;
      else if (r.index_status === "crawled_not_indexed") s.crawled++;
      else if (r.index_status === "excluded") s.excluded++;
      else if (r.index_status === "error") s.error++;
      else s.unchecked++;
    }
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => statusFilter === "all" || r.index_status === statusFilter)
      .filter(r => !q || r.url.toLowerCase().includes(q) || (r.slug || "").toLowerCase().includes(q))
      .sort((a, b) => b.priority - a.priority);
  }, [rows, statusFilter, search]);

  const pendingUrls = useMemo(
    () => rows.filter(r => ["discovered_not_indexed", "crawled_not_indexed", "error"].includes(r.index_status))
              .sort((a, b) => b.priority - a.priority).map(r => r.url),
    [rows]
  );

  const coveragePct = stats.total ? Math.round((stats.indexed / stats.total) * 100) : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" /> Indexing Status
            </CardTitle>
            <CardDescription>
              Live check against Google Search Console — discovered vs indexed, with pending pages prioritized for Re-SEO.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={siteUrl} onValueChange={setSiteUrl} disabled={loadingSites || !sites.length}>
              <SelectTrigger className="h-9 w-[260px]">
                <SelectValue placeholder={loadingSites ? "Loading properties…" : "Select GSC property"} />
              </SelectTrigger>
              <SelectContent>
                {sites.map(s => <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={loadCached} disabled={checking}>
              <RefreshCw className="h-4 w-4 mr-1" />Reload
            </Button>
            <Button size="sm" onClick={() => runCheck()} disabled={checking || !siteUrl || !pages.length}>
              {checking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SearchIcon className="h-4 w-4 mr-1" />}
              Check All ({pages.length})
            </Button>
            {pendingUrls.length > 0 && onReseoUrls && (
              <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700"
                onClick={() => onReseoUrls(pendingUrls)}>
                <Sparkles className="h-4 w-4 mr-1" />Re-SEO {pendingUrls.length} pending
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage bar */}
        <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Coverage: {stats.indexed}/{stats.total} indexed</span>
            <span className="text-muted-foreground">{coveragePct}%</span>
          </div>
          <Progress value={coveragePct} className="h-2" />
          {checking && (
            <p className="text-xs text-muted-foreground">
              Checking {progress.done} / {progress.total}…
            </p>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { k: "all", label: "Total", val: stats.total, cls: "" },
            { k: "indexed", label: "Indexed", val: stats.indexed, cls: "text-green-700" },
            { k: "discovered_not_indexed", label: "Discovered", val: stats.discovered, cls: "text-amber-700" },
            { k: "crawled_not_indexed", label: "Crawled", val: stats.crawled, cls: "text-orange-700" },
            { k: "excluded", label: "Excluded", val: stats.excluded, cls: "text-slate-600" },
            { k: "error", label: "Errors", val: stats.error, cls: "text-red-700" },
          ].map(s => (
            <button key={s.k} onClick={() => setStatusFilter(s.k)}
              className={`rounded-md border bg-background p-3 text-left hover:border-primary transition ${statusFilter === s.k ? "border-primary ring-1 ring-primary" : ""}`}>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold ${s.cls}`}>{s.val}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search URL or slug…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Last crawled</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {pages.length ? "No URLs match this filter." : "No pages loaded yet."}
                </TableCell></TableRow>
              ) : filtered.slice(0, 200).map(r => {
                const meta = STATUS_META[r.index_status] || STATUS_META.unknown;
                const Icon = meta.icon;
                const canonicalMismatch = r.google_canonical && r.user_canonical && r.google_canonical !== r.user_canonical;
                return (
                  <TableRow key={r.url} className="text-xs">
                    <TableCell className="max-w-[380px]">
                      <div className="font-medium truncate">{r.slug || r.url}</div>
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary truncate flex items-center gap-1">
                        {r.url} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {canonicalMismatch && (
                        <div className="text-[10px] text-amber-700 mt-0.5">⚠ Canonical mismatch → {r.google_canonical}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={meta.cls}>
                        <Icon className="h-3 w-3 mr-1" />{meta.label}
                      </Badge>
                      {r.error && <div className="text-[10px] text-red-600 mt-1 truncate max-w-[200px]" title={r.error}>{r.error}</div>}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate" title={r.coverage_state || ""}>{r.coverage_state || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.last_crawl_time ? new Date(r.last_crawl_time).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={r.priority >= 80 ? "text-red-600 font-semibold" : r.priority >= 50 ? "text-amber-600" : "text-muted-foreground"}>
                        {r.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => runCheck([{ url: r.url, slug: r.slug || undefined, page_type: r.page_type || undefined }])}
                        disabled={checking}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      {onReseoUrls && r.index_status !== "indexed" && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-primary"
                          onClick={() => onReseoUrls([r.url])}>
                          <Sparkles className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length > 200 && (
            <div className="p-2 text-center text-xs text-muted-foreground border-t">Showing top 200 of {filtered.length} — refine filters to see more.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
