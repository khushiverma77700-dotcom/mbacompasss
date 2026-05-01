import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Play, AlertTriangle, AlertCircle, Info, Wrench, ExternalLink,
  RefreshCw, ShieldAlert, FileText, Globe, Link2, Search, Server, Layers, Route,
} from "lucide-react";

type Finding = {
  id: string;
  category: string;
  severity: "critical" | "warning" | "info";
  url: string | null;
  page_type: string | null;
  issue_code: string;
  message: string;
  fix_suggestion: string | null;
  fix_action: string | null;
  auto_fixed: boolean;
};

type Run = {
  id: string;
  status: string;
  total_urls: number;
  total_issues: number;
  critical_issues: number;
  warning_issues: number;
  info_issues: number;
  summary: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
};

const CATEGORY_META: Record<string, { label: string; icon: any }> = {
  crawlability: { label: "Crawlability", icon: ShieldAlert },
  sitemap: { label: "Sitemap", icon: Layers },
  indexing: { label: "Indexing Status", icon: Search },
  internal_linking: { label: "Internal Linking", icon: Link2 },
  content_quality: { label: "Content Quality", icon: FileText },
  technical_seo: { label: "Technical SEO", icon: Server },
  search_console: { label: "Search Console", icon: Globe },
  crawl_budget: { label: "Crawl Budget", icon: RefreshCw },
  route_robots: { label: "Route · Robots", icon: ShieldAlert },
  route_canonical: { label: "Route · Canonical", icon: Link2 },
  route_sitemap: { label: "Route · Sitemap", icon: Route },
  route_status: { label: "Route · Status", icon: Server },
  route_soft404: { label: "Soft 404 Risk", icon: AlertCircle },
  duplicate_faq: { label: "Duplicate FAQ", icon: FileText },
};

const severityColor = (s: string) =>
  s === "critical" ? "destructive" : s === "warning" ? "default" : "secondary";

const SeverityIcon = ({ s }: { s: string }) =>
  s === "critical" ? <AlertCircle className="w-4 h-4 text-destructive" /> :
  s === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
  <Info className="w-4 h-4 text-muted-foreground" />;

const AdminIndexingAudit = () => {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<Run | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [fixingId, setFixingId] = useState<string | null>(null);

  const loadLatest = async () => {
    const { data: runs } = await supabase
      .from("seo_audit_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1);
    if (runs?.[0]) {
      setLatestRun(runs[0] as Run);
      const { data: f } = await supabase
        .from("seo_audit_findings")
        .select("*")
        .eq("run_id", runs[0].id)
        .order("severity", { ascending: true });
      setFindings((f ?? []) as Finding[]);
    }
  };

  useEffect(() => { loadLatest(); }, []);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-indexing-audit", {
        body: { action: "run" },
      });
      if (error) throw error;
      toast({
        title: "Audit Complete",
        description: `${data.totals.total} issues found (${data.totals.critical} critical).`,
      });
      await loadLatest();
    } catch (err: any) {
      toast({ title: "Audit failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  // Lightweight, focused check: walks every public route and verifies that it
  // is (a) not blocked by robots.txt, (b) has a self-referencing canonical
  // tag, and (c) appears in /sitemap.xml. Designed to catch the most common
  // Soft 404 / "Discovered – not indexed" causes before Google sees them.
  const runRouteCoverage = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("route-coverage-check", {
        body: {},
      });
      if (error) throw error;
      toast({
        title: "Route Coverage Check Complete",
        description: `${data.routes_checked} routes scanned · ${data.findings} issues (${data.critical} critical).`,
      });
      await loadLatest();
    } catch (err: any) {
      toast({ title: "Route check failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const applyFix = async (finding: Finding) => {
    setFixingId(finding.id);
    try {
      const { data, error } = await supabase.functions.invoke("seo-indexing-audit", {
        body: { action: "fix", finding_id: finding.id },
      });
      if (error) throw error;
      toast({ title: "Fix applied", description: `Result: ${data.result}` });
      await loadLatest();
    } catch (err: any) {
      toast({ title: "Fix failed", description: err.message, variant: "destructive" });
    } finally {
      setFixingId(null);
    }
  };

  const filtered = activeCat === "all" ? findings : findings.filter(f => f.category === activeCat);
  const catCounts: Record<string, number> = {};
  for (const f of findings) catCounts[f.category] = (catCounts[f.category] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Indexing Audit</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end Google indexing & crawlability check across all 8 dimensions.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={runRouteCoverage} disabled={running} size="lg" variant="outline">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Route className="w-4 h-4 mr-2" />}
            Route Coverage Check
          </Button>
          <Button onClick={runAudit} disabled={running} size="lg">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {running ? "Running..." : "Run Full Audit"}
          </Button>
        </div>
      </div>

      {latestRun && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="URLs Scanned" value={latestRun.total_urls} />
          <StatCard label="Total Issues" value={latestRun.total_issues} />
          <StatCard label="Critical" value={latestRun.critical_issues} tone="destructive" />
          <StatCard label="Warnings" value={latestRun.warning_issues} tone="amber" />
          <StatCard label="Info" value={latestRun.info_issues} tone="muted" />
        </div>
      )}

      {latestRun?.summary && Object.keys(latestRun.summary).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Run summary</CardTitle>
            <CardDescription className="text-xs">
              Started {new Date(latestRun.started_at).toLocaleString()}
              {latestRun.finished_at && ` · Finished ${new Date(latestRun.finished_at).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
{JSON.stringify(latestRun.summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {!latestRun && !running && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No audit has been run yet. Click <strong>Run Full Audit</strong> to start.
            </p>
          </CardContent>
        </Card>
      )}

      {findings.length > 0 && (
        <Tabs value={activeCat} onValueChange={setActiveCat}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All ({findings.length})</TabsTrigger>
            {Object.entries(CATEGORY_META).map(([key, m]) => (
              <TabsTrigger key={key} value={key} disabled={!catCounts[key]}>
                {m.label} {catCounts[key] ? `(${catCounts[key]})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCat} className="space-y-3 mt-4">
            {filtered.map((f) => {
              const cat = CATEGORY_META[f.category];
              const Icon = cat?.icon ?? Info;
              return (
                <Card key={f.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <SeverityIcon s={f.severity} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={severityColor(f.severity) as any}>{f.severity}</Badge>
                            <Badge variant="outline" className="gap-1">
                              <Icon className="w-3 h-3" />
                              {cat?.label ?? f.category}
                            </Badge>
                            <code className="text-xs text-muted-foreground">{f.issue_code}</code>
                            {f.auto_fixed && <Badge variant="secondary">Fixed</Badge>}
                          </div>
                          <p className="text-sm font-medium text-foreground">{f.message}</p>
                          {f.url && (
                            <a href={f.url} target="_blank" rel="noopener noreferrer"
                               className="text-xs text-primary hover:underline inline-flex items-center gap-1 break-all">
                              <ExternalLink className="w-3 h-3 shrink-0" /> {f.url}
                            </a>
                          )}
                          {f.fix_suggestion && (
                            <p className="text-xs text-muted-foreground">
                              <strong>Fix:</strong> {f.fix_suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                      {f.fix_action && !f.auto_fixed && (
                        <Button size="sm" variant="outline" onClick={() => applyFix(f)}
                                disabled={fixingId === f.id}>
                          {fixingId === f.id
                            ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            : <Wrench className="w-3 h-3 mr-1" />}
                          Fix
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No issues in this category. Great job!
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

const StatCard = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <Card>
    <CardContent className="pt-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${
        tone === "destructive" ? "text-destructive" :
        tone === "amber" ? "text-amber-600" :
        tone === "muted" ? "text-muted-foreground" : "text-foreground"
      }`}>{value}</p>
    </CardContent>
  </Card>
);

export default AdminIndexingAudit;
