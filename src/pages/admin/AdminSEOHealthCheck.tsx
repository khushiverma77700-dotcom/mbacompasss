import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, PlayCircle, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type Run = {
  id: string;
  status: string;
  scope: string;
  pages_total: number;
  pages_checked: number;
  pages_passing: number;
  pages_warning: number;
  pages_failing: number;
  avg_response_ms: number | null;
  avg_html_kb: number | null;
  summary: any;
  started_at: string;
  completed_at: string | null;
  error: string | null;
};

type PageResult = {
  id: string;
  page_type: string;
  url: string;
  slug: string | null;
  http_status: number | null;
  response_ms: number | null;
  html_kb: number | null;
  is_indexable: boolean | null;
  has_canonical: boolean;
  title: string | null;
  title_length: number;
  description_length: number;
  h1_count: number;
  images_missing_alt: number;
  speed_score: number;
  seo_score: number;
  status: "pass" | "warn" | "fail";
  issues: string[];
};

const statusColor: Record<string, string> = {
  pass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  warn: "bg-amber-100 text-amber-800 border-amber-300",
  fail: "bg-rose-100 text-rose-800 border-rose-300",
};

export default function AdminSEOHealthCheck() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [pageResults, setPageResults] = useState<PageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [filter, setFilter] = useState<"all" | "pass" | "warn" | "fail">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  async function loadRuns() {
    const { data, error } = await supabase
      .from("seo_health_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) return toast.error(error.message);
    setRuns((data as any) || []);
    if (!selectedRunId && data && data.length) setSelectedRunId(data[0].id);
  }

  async function loadResults(runId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_health_page_results")
      .select("*")
      .eq("run_id", runId)
      .order("status", { ascending: true })
      .order("seo_score", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setPageResults((data as any) || []);
  }

  useEffect(() => { loadRuns(); }, []);
  useEffect(() => { if (selectedRunId) loadResults(selectedRunId); }, [selectedRunId]);

  // Auto-refresh while a run is in progress.
  useEffect(() => {
    const active = runs.find((r) => r.status === "running");
    if (!active) return;
    const t = setInterval(() => {
      loadRuns();
      if (selectedRunId === active.id) loadResults(active.id);
    }, 5000);
    return () => clearInterval(t);
  }, [runs, selectedRunId]);

  async function triggerRun() {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-health-check", {
        body: { scope: "manual", limitPerType: 40, includeColleges: true, includeExams: true },
      });
      if (error) throw error;
      toast.success(`Started health check on ${data?.pages_total || "?"} pages`);
      setTimeout(loadRuns, 800);
    } catch (e: any) {
      toast.error(e.message || "Failed to start scan");
    } finally {
      setTriggering(false);
    }
  }

  const currentRun = runs.find((r) => r.id === selectedRunId);
  const progress = currentRun && currentRun.pages_total
    ? Math.round((currentRun.pages_checked / currentRun.pages_total) * 100)
    : 0;

  const filteredResults = useMemo(() => {
    return pageResults.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (typeFilter !== "all" && r.page_type !== typeFilter) return false;
      return true;
    });
  }, [pageResults, filter, typeFilter]);

  const pageTypes = Array.from(new Set(pageResults.map((r) => r.page_type)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly SEO Health Check</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tracks indexability, meta tags, and page speed across category and institute pages. Runs automatically every Monday 05:00 IST.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRuns}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          <Button onClick={triggerRun} disabled={triggering}>
            {triggering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
            Run health check now
          </Button>
        </div>
      </div>

      {currentRun && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Pages checked" value={`${currentRun.pages_checked}/${currentRun.pages_total}`} />
          <StatCard label="Passing" value={currentRun.pages_passing} tone="pass" />
          <StatCard label="Warnings" value={currentRun.pages_warning} tone="warn" />
          <StatCard label="Failing" value={currentRun.pages_failing} tone="fail" />
        </div>
      )}

      {currentRun?.status === "running" && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Scan in progress…</span>
              <span className="text-slate-500">{progress}%</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Run history */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[440px] overflow-y-auto">
              {runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition ${selectedRunId === r.id ? "bg-sky-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">
                      {new Date(r.started_at).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">{r.scope}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>{r.pages_checked}/{r.pages_total} pages</span>
                    <span className="text-emerald-700">✓{r.pages_passing}</span>
                    <span className="text-amber-700">!{r.pages_warning}</span>
                    <span className="text-rose-700">✕{r.pages_failing}</span>
                  </div>
                </button>
              ))}
              {runs.length === 0 && <div className="p-6 text-sm text-slate-500 text-center">No runs yet. Click "Run health check now".</div>}
            </div>
          </CardContent>
        </Card>

        {/* Run detail */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Page results</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {(["all", "fail", "warn", "pass"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={filter === s ? "default" : "outline"}
                  onClick={() => setFilter(s)}
                >{s === "all" ? "All" : s === "pass" ? `Pass (${pageResults.filter(r=>r.status==="pass").length})` : s === "warn" ? `Warn (${pageResults.filter(r=>r.status==="warn").length})` : `Fail (${pageResults.filter(r=>r.status==="fail").length})`}</Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={typeFilter} onValueChange={setTypeFilter}>
              <TabsList className="mb-3 flex-wrap h-auto">
                <TabsTrigger value="all">All ({pageResults.length})</TabsTrigger>
                {pageTypes.map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t} ({pageResults.filter((r) => r.page_type === t).length})
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={typeFilter}>
                {currentRun?.summary?.top_issues?.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-xs font-medium text-amber-900 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Top issues this run
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {currentRun.summary.top_issues.map((it: any) => (
                        <Badge key={it.issue} variant="outline" className="text-xs">
                          {it.issue} <span className="ml-1 text-slate-500">×{it.count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="p-8 text-center text-slate-500"><Loader2 className="inline w-5 h-5 animate-spin" /></div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page</TableHead>
                          <TableHead className="w-20">SEO</TableHead>
                          <TableHead className="w-20">Speed</TableHead>
                          <TableHead className="w-24">Response</TableHead>
                          <TableHead>Issues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {r.status === "pass" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {r.status === "warn" && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                                {r.status === "fail" && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                <div className="min-w-0">
                                  <div className="text-xs text-slate-500 uppercase">{r.page_type}</div>
                                  <a href={r.url} target="_blank" rel="noreferrer" className="text-sm text-sky-700 hover:underline flex items-center gap-1 truncate max-w-[280px]">
                                    {r.slug || r.url} <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge className={statusColor[scoreTone(r.seo_score)]}>{r.seo_score}</Badge></TableCell>
                            <TableCell><Badge className={statusColor[scoreTone(r.speed_score)]}>{r.speed_score}</Badge></TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {r.response_ms != null ? `${r.response_ms}ms` : "-"}
                              <div className="text-slate-400">{r.html_kb != null ? `${r.html_kb}KB` : ""}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-md">
                                {r.issues.slice(0, 4).map((iss, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border">{iss}</span>
                                ))}
                                {r.issues.length > 4 && <span className="text-[10px] text-slate-500">+{r.issues.length - 4} more</span>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredResults.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-sm text-slate-500 py-8">No pages match this filter.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function scoreTone(score: number): "pass" | "warn" | "fail" {
  if (score >= 80) return "pass";
  if (score >= 60) return "warn";
  return "fail";
}

function StatCard({ label, value, tone }: { label: string; value: any; tone?: "pass" | "warn" | "fail" }) {
  const color = tone === "pass" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "fail" ? "text-rose-700" : "text-slate-800";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
