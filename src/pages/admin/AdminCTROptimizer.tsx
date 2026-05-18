import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Radar, Wrench, CheckCircle2, AlertTriangle, Loader2, Sparkles,
  TrendingDown, Zap, ChevronDown, ChevronRight, RefreshCw, FileText, Activity,
  Target, GitMerge, Undo2, Send,
} from "lucide-react";

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
type Bug = {
  page_url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  issues: string[];          // e.g. ["Low CTR", "Weak title", "No FAQs"]
  severity: "high" | "medium" | "low";
  status: "pending" | "fixing" | "fixed" | "error";
  fixLog?: { meta?: { old_title?: string; new_title?: string; new_description?: string }; faqs?: number; freshness?: boolean };
  error?: string;
};

const callOptimizer = async (action: string, payload: any = {}) => {
  const { data, error } = await supabase.functions.invoke("ctr-optimizer", { body: { action, ...payload } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
};

const severityFromRow = (r: GscRow): { sev: Bug["severity"]; issues: string[] } => {
  const issues: string[] = [];
  if (r.ctr < 0.01) issues.push("Critically low CTR");
  else if (r.ctr < 0.02) issues.push("Low CTR");
  if (r.position > 3 && r.position <= 10) issues.push(`Stuck at position ${r.position.toFixed(1)}`);
  if (r.impressions > 1000 && r.clicks < 10) issues.push("High impressions, no clicks");
  issues.push("Meta title likely weak");
  issues.push("Missing FAQ schema");
  const sev: Bug["severity"] =
    r.ctr < 0.01 && r.impressions > 500 ? "high" :
    r.ctr < 0.02 ? "medium" : "low";
  return { sev, issues };
};

export default function AdminCTROptimizer() {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [scanMeta, setScanMeta] = useState<{ at?: string; days: number; minImpr: number; maxCtr: number }>({
    days: 28, minImpr: 100, maxCtr: 0.02,
  });
  const [autoFix, setAutoFix] = useState({ running: false, done: 0, total: 0, current: "" });
  const [opts, setOpts] = useState({ meta: true, faqs: true, fresh: true, limit: 25 });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const stats = useMemo(() => ({
    total: bugs.length,
    high: bugs.filter(b => b.severity === "high").length,
    fixed: bugs.filter(b => b.status === "fixed").length,
    errors: bugs.filter(b => b.status === "error").length,
    pending: bugs.filter(b => b.status === "pending").length,
  }), [bugs]);

  // ---------- Step 1: SCAN ----------
  const runScan = async () => {
    setScanning(true);
    setBugs([]);
    try {
      const res = await callOptimizer("fetch-gsc", {
        dimensions: ["page"],
        days: scanMeta.days,
        rowLimit: 500,
        minImpressions: scanMeta.minImpr,
        maxCtr: scanMeta.maxCtr,
      });
      const rows: GscRow[] = res.rows || [];
      const found: Bug[] = rows
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, opts.limit)
        .map((r) => {
          const { sev, issues } = severityFromRow(r);
          return {
            page_url: r.keys[0],
            impressions: r.impressions,
            clicks: r.clicks,
            ctr: r.ctr,
            position: r.position,
            issues, severity: sev, status: "pending" as const,
          };
        });
      setBugs(found);
      setScanMeta(s => ({ ...s, at: new Date().toLocaleString() }));
      toast({ title: "Scan complete", description: `Found ${found.length} underperforming pages.` });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  // ---------- Step 2: AUTO FIX ALL ----------
  const runAutoFix = async () => {
    const queue = bugs.filter(b => b.status === "pending" || b.status === "error");
    if (!queue.length) {
      toast({ title: "Nothing to fix", description: "Run a scan first." });
      return;
    }
    setAutoFix({ running: true, done: 0, total: queue.length, current: "" });
    for (let i = 0; i < queue.length; i++) {
      const bug = queue[i];
      setAutoFix(s => ({ ...s, current: bug.page_url, done: i }));
      setBugs(prev => prev.map(b => b.page_url === bug.page_url ? { ...b, status: "fixing" } : b));
      try {
        const out = await callOptimizer("auto-fix-one", {
          page_url: bug.page_url,
          rewriteMeta: opts.meta,
          generateFaqs: opts.faqs,
          bumpFreshness: opts.fresh,
        });
        setBugs(prev => prev.map(b => b.page_url === bug.page_url ? {
          ...b, status: "fixed",
          fixLog: {
            meta: out.applied?.meta,
            faqs: out.applied?.faqs,
            freshness: out.applied?.freshness,
          },
        } : b));
      } catch (e: any) {
        setBugs(prev => prev.map(b => b.page_url === bug.page_url ? { ...b, status: "error", error: e.message } : b));
      }
    }
    setAutoFix(s => ({ ...s, running: false, done: queue.length, current: "" }));
    toast({ title: "Auto-fix complete", description: `Processed ${queue.length} pages.` });
  };

  const fixOne = async (bug: Bug) => {
    setBugs(prev => prev.map(b => b.page_url === bug.page_url ? { ...b, status: "fixing" } : b));
    try {
      const out = await callOptimizer("auto-fix-one", {
        page_url: bug.page_url,
        rewriteMeta: opts.meta, generateFaqs: opts.faqs, bumpFreshness: opts.fresh,
      });
      setBugs(prev => prev.map(b => b.page_url === bug.page_url ? {
        ...b, status: "fixed",
        fixLog: { meta: out.applied?.meta, faqs: out.applied?.faqs, freshness: out.applied?.freshness },
      } : b));
      toast({ title: "Fixed", description: bug.page_url });
    } catch (e: any) {
      setBugs(prev => prev.map(b => b.page_url === bug.page_url ? { ...b, status: "error", error: e.message } : b));
      toast({ title: "Fix failed", description: e.message, variant: "destructive" });
    }
  };

  const exportReport = () => {
    const rows = [
      ["URL", "Severity", "Status", "Impressions", "Clicks", "CTR%", "Position", "Issues", "New Title", "FAQs Added"],
      ...bugs.map(b => [
        b.page_url, b.severity, b.status, b.impressions, b.clicks,
        (b.ctr * 100).toFixed(2), b.position.toFixed(1),
        b.issues.join(" | "),
        b.fixLog?.meta?.new_title || "",
        b.fixLog?.faqs ?? "",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ctr-bug-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sevColor = (s: Bug["severity"]) =>
    s === "high" ? "bg-red-100 text-red-700 border-red-300" :
    s === "medium" ? "bg-amber-100 text-amber-700 border-amber-300" :
    "bg-blue-100 text-blue-700 border-blue-300";

  const statusBadge = (s: Bug["status"]) => {
    if (s === "fixed") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" />Fixed</Badge>;
    if (s === "fixing") return <Badge className="bg-sky-100 text-sky-700 border-sky-300"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Fixing</Badge>;
    if (s === "error") return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
    return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Radar className="w-8 h-8 text-sky-600" />
            CTR Auto-Pilot
          </h1>
          <p className="text-muted-foreground mt-1">
            Scans your live Google Search Console data → detects SEO bugs → auto-fixes meta + FAQs + freshness → reports every change.
          </p>
        </div>
        {bugs.length > 0 && (
          <Button variant="outline" onClick={exportReport}>
            <FileText className="w-4 h-4 mr-2" />Export Report (CSV)
          </Button>
        )}
      </div>

      {/* The 3-step pipeline */}
      <div className="grid md:grid-cols-3 gap-4">
        <StepCard n={1} label="Auto Scan" icon={<Radar className="w-5 h-5" />} active={scanning || bugs.length === 0} done={bugs.length > 0} />
        <StepCard n={2} label="Auto Fix" icon={<Wrench className="w-5 h-5" />} active={autoFix.running} done={stats.fixed > 0 && !autoFix.running} />
        <StepCard n={3} label="Report" icon={<FileText className="w-5 h-5" />} active={false} done={stats.fixed > 0 && !autoFix.running} />
      </div>

      {/* Control panel */}
      <Card className="border-2 border-sky-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-sky-600" />Control Panel</CardTitle>
          <CardDescription>Configure the scan window and what the AI should auto-fix.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Lookback (days)</Label>
              <Input type="number" min={7} max={90} value={scanMeta.days}
                onChange={e => setScanMeta(s => ({ ...s, days: Number(e.target.value) || 28 }))} />
            </div>
            <div>
              <Label className="text-xs">Min impressions</Label>
              <Input type="number" min={10} value={scanMeta.minImpr}
                onChange={e => setScanMeta(s => ({ ...s, minImpr: Number(e.target.value) || 100 }))} />
            </div>
            <div>
              <Label className="text-xs">Max CTR (e.g. 0.02 = 2%)</Label>
              <Input type="number" step="0.005" min={0} max={1} value={scanMeta.maxCtr}
                onChange={e => setScanMeta(s => ({ ...s, maxCtr: Number(e.target.value) || 0.02 }))} />
            </div>
            <div>
              <Label className="text-xs">Pages to fix (top N)</Label>
              <Input type="number" min={1} max={100} value={opts.limit}
                onChange={e => setOpts(o => ({ ...o, limit: Number(e.target.value) || 25 }))} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2 border-t">
            <ToggleRow label="Rewrite meta title + description" checked={opts.meta} onChange={v => setOpts(o => ({ ...o, meta: v }))} />
            <ToggleRow label="Generate FAQ schema" checked={opts.faqs} onChange={v => setOpts(o => ({ ...o, faqs: v }))} />
            <ToggleRow label="Bump freshness (sitemap re-crawl)" checked={opts.fresh} onChange={v => setOpts(o => ({ ...o, fresh: v }))} />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button size="lg" onClick={runScan} disabled={scanning || autoFix.running} className="bg-sky-600 hover:bg-sky-700">
              {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}
              1. Auto-Scan Website
            </Button>
            <Button size="lg" onClick={runAutoFix} disabled={!bugs.length || autoFix.running}
              className="bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600">
              {autoFix.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              2. Auto-Fix All Bugs ({stats.pending + stats.errors})
            </Button>
            {scanMeta.at && (
              <span className="text-xs text-muted-foreground self-center">
                Last scan: {scanMeta.at}
              </span>
            )}
          </div>

          {autoFix.running && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs">
                <span className="truncate max-w-[60%]">Fixing: {autoFix.current}</span>
                <span>{autoFix.done} / {autoFix.total}</span>
              </div>
              <Progress value={(autoFix.done / Math.max(1, autoFix.total)) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live stats */}
      {bugs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatBox label="Bugs Found" value={stats.total} icon={<TrendingDown className="w-4 h-4" />} tone="sky" />
          <StatBox label="High Severity" value={stats.high} icon={<AlertTriangle className="w-4 h-4" />} tone="red" />
          <StatBox label="Pending" value={stats.pending} icon={<RefreshCw className="w-4 h-4" />} tone="amber" />
          <StatBox label="Fixed" value={stats.fixed} icon={<CheckCircle2 className="w-4 h-4" />} tone="emerald" />
          <StatBox label="Errors" value={stats.errors} icon={<AlertTriangle className="w-4 h-4" />} tone="red" />
        </div>
      )}

      {/* Bug Report Table */}
      {bugs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-sky-600" />Bug Report</CardTitle>
            <CardDescription>Click any row to see the issues and what the AI changed.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Impr.</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Pos.</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bugs.map((bug) => {
                  const isOpen = !!expanded[bug.page_url];
                  return (
                    <>
                      <TableRow key={bug.page_url} className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setExpanded(e => ({ ...e, [bug.page_url]: !isOpen }))}>
                        <TableCell>{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                        <TableCell className="max-w-[280px] truncate font-medium text-sky-700">
                          {bug.page_url.replace("https://mbacompass.in", "") || "/"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{bug.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{(bug.ctr * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right tabular-nums">{bug.position.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sevColor(bug.severity)}>{bug.severity}</Badge>
                        </TableCell>
                        <TableCell>{statusBadge(bug.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" disabled={bug.status === "fixing" || autoFix.running}
                            onClick={(e) => { e.stopPropagation(); fixOne(bug); }}>
                            {bug.status === "fixing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3 mr-1" />}
                            Fix
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/20">
                            <div className="p-3 space-y-3">
                              <div>
                                <p className="text-xs font-semibold mb-1 text-muted-foreground">DETECTED ISSUES</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {bug.issues.map((i, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">{i}</Badge>
                                  ))}
                                </div>
                              </div>
                              {bug.fixLog && (
                                <div className="border-l-4 border-emerald-400 bg-emerald-50 p-3 rounded">
                                  <p className="text-xs font-semibold mb-2 text-emerald-700">AI APPLIED FIXES</p>
                                  {bug.fixLog.meta?.new_title && (
                                    <div className="text-sm space-y-1">
                                      <p><span className="text-muted-foreground">Old title:</span> <span className="line-through">{bug.fixLog.meta.old_title || "(none)"}</span></p>
                                      <p><span className="text-muted-foreground">New title:</span> <strong>{bug.fixLog.meta.new_title}</strong></p>
                                      <p><span className="text-muted-foreground">New description:</span> {bug.fixLog.meta.new_description}</p>
                                    </div>
                                  )}
                                  {bug.fixLog.faqs ? <p className="text-sm mt-1">✓ Added {bug.fixLog.faqs} FAQ schema entries</p> : null}
                                  {bug.fixLog.freshness ? <p className="text-sm">✓ Freshness timestamp bumped (sitemap will re-crawl)</p> : null}
                                </div>
                              )}
                              {bug.error && (
                                <div className="border-l-4 border-red-400 bg-red-50 p-3 rounded text-sm text-red-700">
                                  Error: {bug.error}
                                </div>
                              )}
                              <a href={bug.page_url} target="_blank" rel="noreferrer"
                                className="text-xs text-sky-600 underline">Open page →</a>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Radar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No scan yet</p>
            <p className="text-sm">Click <strong>Auto-Scan Website</strong> to detect underperforming pages from Google Search Console.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Small UI helpers ----------
function StepCard({ n, label, icon, active, done }: { n: number; label: string; icon: React.ReactNode; active: boolean; done: boolean }) {
  return (
    <div className={`rounded-xl border-2 p-4 flex items-center gap-3 transition ${
      done ? "border-emerald-300 bg-emerald-50" : active ? "border-sky-400 bg-sky-50" : "border-muted bg-background"
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
        done ? "bg-emerald-500 text-white" : active ? "bg-sky-500 text-white" : "bg-muted text-muted-foreground"
      }`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : n}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Step {n}</p>
        <p className="font-semibold flex items-center gap-1.5">{icon}{label}</p>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label className="text-sm">{label}</Label>
    </div>
  );
}

function StatBox({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "sky" | "emerald" | "red" | "amber" }) {
  const tones: Record<string, string> = {
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-lg border-2 p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
        <span>{label}</span>{icon}
      </div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
