import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, DollarSign, AlertTriangle, RefreshCw, TrendingUp, BarChart3, Clock, Cloud, Database, Shield, HardDrive, Server } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";
import { computeAICost, modelLabel } from "@/lib/aiPricing";
import { estimateCloudCost, formatUsd, CLOUD_FREE_MONTHLY_USD } from "@/lib/cloudPricing";

// ── Types ──

interface UsageLog {
  id: string;
  feature: string;
  model: string | null;
  provider: string | null;
  latency_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  "gemini-direct": "#4285f4",
  "lovable-gateway": "#8b5cf6",
  "validation": "#ef4444",
  "none": "#6b7280",
  "unknown": "#94a3b8",
};

const PROVIDER_LABELS: Record<string, string> = {
  "gemini-direct": "Gemini Direct",
  "lovable-gateway": "Lovable Gateway",
  "validation": "Validation Error",
  "none": "No Provider",
  "unknown": "Unknown / Legacy",
};

// Strip "-stream" suffix and legacy "feature::provider" encoding
function normalizeProvider(p: string | null | undefined, feature?: string): string {
  let raw = p;
  if (!raw && feature && feature.includes("::")) {
    raw = feature.split("::").pop() || null;
  }
  if (!raw) return "unknown";
  return raw.replace(/-stream$/, "");
}

function normalizeFeature(f: string): string {
  // Legacy rows stored "feature::provider"
  return f.includes("::") ? f.split("::")[0] : f;
}

interface EdgeLog {
  id: string;
  timestamp: string;
  function_id: string;
  status_code: number;
  method: string;
  execution_time_ms: number;
}

interface AuthLog {
  id: string;
  timestamp: string;
  msg: string;
  status: number | null;
  path: string | null;
  level: string;
}

interface DbLog {
  id: string;
  timestamp: string;
  event_message: string;
  error_severity: string;
}

// ── Constants ──

const FEATURE_COLORS: Record<string, string> = {
  "keyword-research": "#3b82f6",
  "profile-analyzer": "#8b5cf6",
  "college-finder": "#10b981",
  "coaching-finder": "#f59e0b",
  "page-summary": "#ec4899",
  "seo-enhance": "#06b6d4",
  "auto-seo": "#6366f1",
  "college-shortlister": "#ef4444",
  "competitor-cron": "#84cc16",
};

const FEATURE_LABELS: Record<string, string> = {
  "keyword-research": "Keyword Research",
  "profile-analyzer": "Profile Analyzer",
  "college-finder": "College Finder",
  "coaching-finder": "Coaching Finder",
  "page-summary": "Page Summary",
  "seo-enhance": "SEO Enhance",
  "auto-seo": "Auto SEO Engine",
  "college-shortlister": "College Shortlister",
  "competitor-cron": "Competitor Analysis",
};

const TIME_RANGES = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#ef4444", "#84cc16"];

function getDateRange(range: string) {
  const now = new Date();
  switch (range) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case "7d": return new Date(now.getTime() - 7 * 86400000).toISOString();
    case "30d": return new Date(now.getTime() - 30 * 86400000).toISOString();
    default: return null;
  }
}

// ── AI Usage Tab ──

function AIUsageTab({ logs, loading }: { logs: UsageLog[]; loading: boolean }) {
  // Recompute cost from model + tokens (the stored estimated_cost column was
  // written with a flat rate that does not reflect actual per-model pricing).
  const enriched = useMemo(() => logs.map(l => ({
    ...l,
    feature: normalizeFeature(l.feature),
    providerKey: normalizeProvider(l.provider, l.feature),
    cost: computeAICost({
      model: l.model,
      promptTokens: l.prompt_tokens,
      completionTokens: l.completion_tokens,
      totalTokens: l.total_tokens,
    }),
  })), [logs]);

  const stats = useMemo(() => {
    const totalCalls = enriched.length;
    const totalTokens = enriched.reduce((s, l) => s + (l.total_tokens || 0), 0);
    const totalCost = enriched.reduce((s, l) => s + l.cost, 0);
    const errors = enriched.filter(l => l.status === "error").length;
    const successRate = totalCalls ? ((totalCalls - errors) / totalCalls * 100).toFixed(1) : "0";
    const avgCostPerCall = totalCalls ? totalCost / totalCalls : 0;
    const latencies = enriched.map(l => l.latency_ms).filter((n): n is number => typeof n === "number" && n > 0);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95Latency = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    return { totalCalls, totalTokens, totalCost, errors, successRate, avgCostPerCall, avgLatency, p95Latency };
  }, [enriched]);

  const byFeature = useMemo(() => {
    const map: Record<string, { calls: number; tokens: number; cost: number; errors: number }> = {};
    enriched.forEach(l => {
      if (!map[l.feature]) map[l.feature] = { calls: 0, tokens: 0, cost: 0, errors: 0 };
      map[l.feature].calls++;
      map[l.feature].tokens += l.total_tokens || 0;
      map[l.feature].cost += l.cost;
      if (l.status === "error") map[l.feature].errors++;
    });
    return Object.entries(map).map(([feature, d]) => ({
      feature, name: FEATURE_LABELS[feature] || feature, ...d,
      color: FEATURE_COLORS[feature] || "#94a3b8",
    })).sort((a, b) => b.cost - a.cost);
  }, [enriched]);

  const byProvider = useMemo(() => {
    const map: Record<string, { calls: number; tokens: number; cost: number; errors: number; latencySum: number; latencyCount: number }> = {};
    enriched.forEach(l => {
      const k = l.providerKey;
      if (!map[k]) map[k] = { calls: 0, tokens: 0, cost: 0, errors: 0, latencySum: 0, latencyCount: 0 };
      map[k].calls++;
      map[k].tokens += l.total_tokens || 0;
      map[k].cost += l.cost;
      if (l.status === "error") map[k].errors++;
      if (typeof l.latency_ms === "number" && l.latency_ms > 0) {
        map[k].latencySum += l.latency_ms;
        map[k].latencyCount++;
      }
    });
    return Object.entries(map).map(([key, d]) => ({
      key,
      name: PROVIDER_LABELS[key] || key,
      color: PROVIDER_COLORS[key] || "#94a3b8",
      calls: d.calls,
      tokens: d.tokens,
      cost: d.cost,
      errors: d.errors,
      successRate: d.calls ? Number(((d.calls - d.errors) / d.calls * 100).toFixed(1)) : 0,
      avgLatency: d.latencyCount ? Math.round(d.latencySum / d.latencyCount) : 0,
    })).sort((a, b) => b.calls - a.calls);
  }, [enriched]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, { date: string; calls: number; tokens: number; cost: number }> = {};
    enriched.forEach(l => {
      const d = l.created_at.split("T")[0];
      if (!map[d]) map[d] = { date: d, calls: 0, tokens: 0, cost: 0 };
      map[d].calls++;
      map[d].tokens += l.total_tokens || 0;
      map[d].cost += l.cost;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [enriched]);

  const byModel = useMemo(() => {
    const map: Record<string, { calls: number; cost: number; tokens: number; errors: number; latencySum: number; latencyCount: number }> = {};
    enriched.forEach(l => {
      const m = l.model || "unknown";
      if (!map[m]) map[m] = { calls: 0, cost: 0, tokens: 0, errors: 0, latencySum: 0, latencyCount: 0 };
      map[m].calls++;
      map[m].cost += l.cost;
      map[m].tokens += l.total_tokens || 0;
      if (l.status === "error") map[m].errors++;
      if (typeof l.latency_ms === "number" && l.latency_ms > 0) {
        map[m].latencySum += l.latency_ms;
        map[m].latencyCount++;
      }
    });
    return Object.entries(map).map(([name, v]) => ({
      raw: name,
      name: modelLabel(name),
      value: v.calls,
      calls: v.calls,
      tokens: v.tokens,
      cost: v.cost,
      errors: v.errors,
      successRate: v.calls ? Number(((v.calls - v.errors) / v.calls * 100).toFixed(1)) : 0,
      avgLatency: v.latencyCount ? Math.round(v.latencySum / v.latencyCount) : 0,
    })).sort((a, b) => b.calls - a.calls);
  }, [enriched]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{stats.totalCalls}</p>
          <p className="text-xs text-muted-foreground">Total AI Calls</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{(stats.totalTokens / 1000).toFixed(1)}K</p>
          <p className="text-xs text-muted-foreground">Total Tokens</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{formatUsd(stats.totalCost, 4)}</p>
          <p className="text-xs text-muted-foreground">AI Cost (per-model)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{formatUsd(stats.avgCostPerCall, 5)}</p>
          <p className="text-xs text-muted-foreground">Avg Cost / Call</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{stats.successRate}%</p>
          <p className="text-xs text-muted-foreground">Success Rate</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold">{stats.errors}</p>
          <p className="text-xs text-muted-foreground">Errors</p>
        </CardContent></Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 text-xs text-muted-foreground">
          Cost is recomputed live using current Lovable AI per-model pricing
          (input vs output tokens). Older log rows showing different stored
          values are ignored.
        </CardContent>
      </Card>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">Feature Breakdown</TabsTrigger>
          <TabsTrigger value="trend">Daily Trend</TabsTrigger>
          <TabsTrigger value="logs">Raw Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-6 mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-sm">Cost by Feature ($)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {byFeature.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byFeature} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" tickFormatter={v => `$${v.toFixed(3)}`} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
                      <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                        {byFeature.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground pt-20">No data yet</p>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-sm">Calls by Model</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {byModel.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byModel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {byModel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground pt-20">No data yet</p>}
              </CardContent>
            </Card>
          </div>
          <Card><CardHeader><CardTitle className="text-sm">Detailed Feature Stats</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Avg Tokens/Call</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {byFeature.map(f => (
                    <TableRow key={f.feature}>
                      <TableCell><Badge variant="outline" style={{ borderColor: f.color, color: f.color }}>{f.name}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{f.calls}</TableCell>
                      <TableCell className="text-right font-mono">{f.tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">${f.cost.toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono">{f.errors}</TableCell>
                      <TableCell className="text-right font-mono">{f.calls ? Math.round(f.tokens / f.calls).toLocaleString() : 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <Card><CardHeader><CardTitle className="text-sm">Daily AI Usage Trend</CardTitle></CardHeader>
            <CardContent className="h-[350px]">
              {dailyTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${v.toFixed(3)}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number, name: string) => name === "cost" ? `$${v.toFixed(4)}` : v} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground pt-20">No data yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card><CardContent className="pt-4">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {enriched.slice(0, 100).map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(l.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{FEATURE_LABELS[l.feature] || l.feature}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{modelLabel(l.model)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(l.total_tokens || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatUsd(l.cost, 5)}</TableCell>
                      <TableCell>
                        {l.status === "success" ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">OK</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">{l.error_message?.slice(0, 30) || "Error"}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {logs.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">No AI usage logs yet. They'll appear here once AI features are used.</p>
              )}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Cloud Usage Tab ──

// Recursively walk a storage bucket to count every file (not just top-level).
async function countBucketFiles(bucket: string): Promise<number> {
  let total = 0;
  const walk = async (prefix: string) => {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data) return;
    for (const item of data) {
      // Folders have null id and no metadata; files have an id.
      if (item.id) total++;
      else await walk(prefix ? `${prefix}/${item.name}` : item.name);
    }
  };
  try { await walk(""); } catch { /* ignore */ }
  return total;
}

interface CloudUsageTabProps {
  registerRefresh?: (fn: () => Promise<void>) => void;
  registerLoading?: (loading: boolean) => void;
}

function CloudUsageTab({ registerRefresh, registerLoading }: CloudUsageTabProps) {
  const [edgeLogs, setEdgeLogs] = useState<EdgeLog[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [, setDbLogs] = useState<DbLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState({ tables: 0, totalRows: 0, storageFiles: 0 });
  const [totalUsers, setTotalUsers] = useState(0);
  const [edgeInvocations30d, setEdgeInvocations30d] = useState(0);

  const fetchCloudData = useCallback(async () => {
    setLoading(true);
    try {
      // Actual tables that exist in the public schema (verified against the
      // generated Supabase types). Removes legacy/never-created tables that
      // silently failed and adds tables that were missing — so totals match
      // the real database.
      const tables = [
        "admin_permissions", "ai_usage_logs", "analysis_results", "articles",
        "audit_runs", "audit_step_logs", "banners", "business_inquiries",
        "cat_score_submissions", "categories", "city_pages", "coaching_of_week",
        "coaching_results", "college_sections", "colleges", "comparisons",
        "content_refreshes", "coupon_claims", "coupons", "course_categories",
        "courses", "exams", "faculty", "indexing_logs", "indexing_urls",
        "inquiries", "institute_results", "institutes", "listing_change_requests",
        "mega_menu_items", "newsletter_subscribers", "page_summary_cache",
        "phone_otps", "profile_analyses", "profiles", "user_roles",
      ];

      let totalRows = 0;
      const tableCounts: { name: string; count: number }[] = [];

      const countPromises = tables.map(async (table) => {
        try {
          const { count } = await supabase.from(table as any).select("*", { count: "exact", head: true });
          const c = count || 0;
          totalRows += c;
          tableCounts.push({ name: table, count: c });
        } catch { tableCounts.push({ name: table, count: 0 }); }
      });

      await Promise.all(countPromises);

      // Count files across BOTH storage buckets, recursing into subfolders.
      const [uploadsCount, listingCount] = await Promise.all([
        countBucketFiles("uploads"),
        countBucketFiles("listing-uploads"),
      ]);
      const storageFiles = uploadsCount + listingCount;

      setDbStats({ tables: tables.length, totalRows, storageFiles });

      tableCounts.sort((a, b) => b.count - a.count);

      setEdgeLogs(tableCounts.filter(t => t.count > 0).map((t, i) => ({
        id: String(i),
        timestamp: new Date().toISOString(),
        function_id: t.name,
        status_code: 200,
        method: "GET",
        execution_time_ms: t.count,
      })));

      // Edge invocations proxy: count AI usage logs in last 30d (each call is
      // a function invocation). Real edge logs require analytics access; this
      // is a conservative lower-bound for cost estimation.
      try {
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const { count } = await supabase
          .from("ai_usage_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since);
        // Multiply by ~3x to account for non-AI edge functions (sitemap,
        // indexing, OTP, etc.) which we cannot count directly.
        setEdgeInvocations30d(Math.round((count || 0) * 3));
      } catch {}

    } catch (e) {
      console.error("Cloud data fetch error:", e);
      toast.error("Failed to load some Cloud data");
    }

    // Auth logs (latest 50 + total user count)
    try {
      const { data: authData, count } = await supabase
        .from("profiles")
        .select("user_id, display_name, created_at, city, target_exam", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(50);
      setTotalUsers(count || (authData?.length || 0));
      setAuthLogs((authData || []).map((u: any, i: number) => ({
        id: String(i),
        timestamp: u.created_at,
        msg: u.display_name || "Anonymous",
        status: null,
        path: u.city || "",
        level: u.target_exam || "",
      })));
    } catch {}

    setLoading(false);
  }, []);

  useEffect(() => { fetchCloudData(); }, [fetchCloudData]);
  useEffect(() => { registerRefresh?.(fetchCloudData); }, [registerRefresh, fetchCloudData]);
  useEffect(() => { registerLoading?.(loading); }, [registerLoading, loading]);

  const cloudCost = useMemo(() => estimateCloudCost({
    totalRows: dbStats.totalRows,
    storageFiles: dbStats.storageFiles,
    edgeInvocationsLast30d: edgeInvocations30d,
    monthlyActiveUsers: totalUsers,
  }), [dbStats, edgeInvocations30d, totalUsers]);

  // Table distribution chart data
  const tableChartData = useMemo(() => {
    return edgeLogs.slice(0, 15).map(l => ({
      name: l.function_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      rows: l.execution_time_ms,
    }));
  }, [edgeLogs]);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const db = dbStats.totalRows;
    const storage = dbStats.storageFiles;
    const auth = authLogs.length;
    return [
      { name: "Database", value: db, color: "#3b82f6" },
      { name: "Storage", value: storage, color: "#10b981" },
      { name: "Auth Users", value: auth, color: "#f59e0b" },
    ].filter(s => s.value > 0);
  }, [dbStats, authLogs]);

  // Daily signups
  const dailySignups = useMemo(() => {
    const map: Record<string, number> = {};
    authLogs.forEach(l => {
      const d = l.timestamp?.split("T")[0];
      if (d) map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, signups: count })).sort((a, b) => a.date.localeCompare(b.date));
  }, [authLogs]);

  return (
    <div className="space-y-6">
      {/* Cloud Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <Database className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{dbStats.tables}</p>
          <p className="text-xs text-muted-foreground">Database Tables</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Server className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{dbStats.totalRows.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total DB Rows</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <HardDrive className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{dbStats.storageFiles}</p>
          <p className="text-xs text-muted-foreground">Storage Files</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Registered Users</p>
        </CardContent></Card>
        <Card className="border-primary/40 bg-primary/5"><CardContent className="pt-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-primary">{formatUsd(cloudCost.totalMonthly, 4)}</p>
          <p className="text-xs text-muted-foreground">Est. Monthly Cloud Cost</p>
        </CardContent></Card>
      </div>

      {/* Detailed Cloud cost breakdown */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" />
            Cloud Cost Breakdown — Live Estimate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase">DB Storage</p>
              <p className="text-base font-bold">{formatUsd(cloudCost.dbStorageCost, 5)}</p>
              <p className="text-[10px] text-muted-foreground">{cloudCost.dbStorageGb.toFixed(4)} GB</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase">File Storage</p>
              <p className="text-base font-bold">{formatUsd(cloudCost.fileStorageCost, 5)}</p>
              <p className="text-[10px] text-muted-foreground">{cloudCost.fileStorageGb.toFixed(4)} GB</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Edge Invocations (30d)</p>
              <p className="text-base font-bold">{formatUsd(cloudCost.edgeInvocationsCost, 5)}</p>
              <p className="text-[10px] text-muted-foreground">{edgeInvocations30d.toLocaleString()} calls</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Auth (MAU)</p>
              <p className="text-base font-bold">{formatUsd(cloudCost.authCost, 5)}</p>
              <p className="text-[10px] text-muted-foreground">{totalUsers.toLocaleString()} users (free under 100k)</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-card border p-3">
            <div>
              <p className="text-xs text-muted-foreground">Total estimated monthly Cloud cost</p>
              <p className="text-xl font-bold text-primary">{formatUsd(cloudCost.totalMonthly, 4)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Free monthly balance</p>
              <p className="text-sm font-semibold">
                {cloudCost.withinFreeTier
                  ? <span className="text-primary">Within free ${CLOUD_FREE_MONTHLY_USD} tier · {formatUsd(cloudCost.freeRemaining, 2)} left</span>
                  : <span className="text-destructive">Over free tier by {formatUsd(-cloudCost.freeRemaining + CLOUD_FREE_MONTHLY_USD - cloudCost.totalMonthly, 2)}</span>}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Estimate based on Supabase pay-as-you-go rates: $0.125/GB-month DB,
            $0.021/GB-month file storage, $2/1M edge invocations. Edge call
            volume is approximated from AI usage logs ×3 to cover non-AI
            functions. Real billing is shown in <strong>Settings → Cloud & AI balance</strong>.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Database Tables</TabsTrigger>
          <TabsTrigger value="services">Service Breakdown</TabsTrigger>
          <TabsTrigger value="users">Recent Users</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-sm">Rows per Table</CardTitle></CardHeader>
              <CardContent className="h-[400px]">
                {tableChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tableChartData} layout="vertical" margin={{ left: 100 }}>
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="rows" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground pt-20">Loading...</p>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-sm">All Tables</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {edgeLogs.map(l => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs font-mono">{l.function_id}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{l.execution_time_ms.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-sm">Cloud Services Distribution</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {serviceBreakdown.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={serviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                        {serviceBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground pt-20">No data</p>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-sm">Cloud Service Details</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2"><Database className="w-4 h-4 text-primary" /><span className="text-sm font-medium">Database</span></div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{dbStats.totalRows.toLocaleString()} rows</p>
                    <p className="text-xs text-muted-foreground">{dbStats.tables} tables</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-primary" /><span className="text-sm font-medium">Storage</span></div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{dbStats.storageFiles} files</p>
                    <p className="text-xs text-muted-foreground">uploads bucket</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /><span className="text-sm font-medium">Authentication</span></div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{authLogs.length} users</p>
                    <p className="text-xs text-muted-foreground">registered profiles</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2"><Server className="w-4 h-4 text-primary" /><span className="text-sm font-medium">Edge Functions</span></div>
                  <div className="text-right">
                    <p className="text-sm font-bold">11 functions</p>
                    <p className="text-xs text-muted-foreground">deployed & active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card><CardContent className="pt-4">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Joined</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Target Exam</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {authLogs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(l.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{l.msg}</TableCell>
                      <TableCell className="text-xs">{l.path || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{l.level || "—"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {authLogs.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">No registered users yet.</p>
              )}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Main Component ──

export default function AdminAIUsage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");
  const [mainTab, setMainTab] = useState("ai");
  const [cloudRefresh, setCloudRefresh] = useState<(() => Promise<void>) | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("ai_usage_logs").select("*").order("created_at", { ascending: false }).limit(1000);
    const from = getDateRange(range);
    if (from) q = q.gte("created_at", from);
    const { data, error } = await q;
    if (error) toast.error("Failed to load AI usage logs");
    setLogs((data as unknown as UsageLog[]) || []);
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRefresh = useCallback(async () => {
    if (mainTab === "ai") {
      await fetchLogs();
      toast.success("AI usage refreshed");
    } else if (cloudRefresh) {
      await cloudRefresh();
      toast.success("Cloud usage refreshed");
    }
  }, [mainTab, fetchLogs, cloudRefresh]);

  const isLoading = mainTab === "ai" ? loading : cloudLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Usage Tracker
          </h1>
          <p className="text-sm text-muted-foreground">Monitor AI & Cloud balance consumption in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          {mainTab === "ai" && (
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Zap className="w-4 h-4" /> AI Usage
          </TabsTrigger>
          <TabsTrigger value="cloud" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" /> Cloud Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4">
          <AIUsageTab logs={logs} loading={loading} />
        </TabsContent>

        <TabsContent value="cloud" className="mt-4">
          <CloudUsageTab
            registerRefresh={(fn) => setCloudRefresh(() => fn)}
            registerLoading={setCloudLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
