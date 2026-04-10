import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, DollarSign, AlertTriangle, RefreshCw, TrendingUp, BarChart3, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";

interface UsageLog {
  id: string;
  feature: string;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

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

function getDateRange(range: string) {
  const now = new Date();
  switch (range) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case "7d": return new Date(now.getTime() - 7 * 86400000).toISOString();
    case "30d": return new Date(now.getTime() - 30 * 86400000).toISOString();
    default: return null;
  }
}

export default function AdminAIUsage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");

  const fetchLogs = async () => {
    setLoading(true);
    let q = supabase.from("ai_usage_logs").select("*").order("created_at", { ascending: false }).limit(1000);
    const from = getDateRange(range);
    if (from) q = q.gte("created_at", from);
    const { data, error } = await q;
    if (error) toast.error("Failed to load AI usage logs");
    setLogs((data as unknown as UsageLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [range]);

  const stats = useMemo(() => {
    const totalCalls = logs.length;
    const totalTokens = logs.reduce((s, l) => s + (l.total_tokens || 0), 0);
    const totalCost = logs.reduce((s, l) => s + Number(l.estimated_cost || 0), 0);
    const errors = logs.filter(l => l.status === "error").length;
    const successRate = totalCalls ? ((totalCalls - errors) / totalCalls * 100).toFixed(1) : "0";
    return { totalCalls, totalTokens, totalCost, errors, successRate };
  }, [logs]);

  const byFeature = useMemo(() => {
    const map: Record<string, { calls: number; tokens: number; cost: number; errors: number }> = {};
    logs.forEach(l => {
      if (!map[l.feature]) map[l.feature] = { calls: 0, tokens: 0, cost: 0, errors: 0 };
      map[l.feature].calls++;
      map[l.feature].tokens += l.total_tokens || 0;
      map[l.feature].cost += Number(l.estimated_cost || 0);
      if (l.status === "error") map[l.feature].errors++;
    });
    return Object.entries(map).map(([feature, d]) => ({
      feature, name: FEATURE_LABELS[feature] || feature, ...d,
      color: FEATURE_COLORS[feature] || "#94a3b8",
    })).sort((a, b) => b.cost - a.cost);
  }, [logs]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, { date: string; calls: number; tokens: number; cost: number }> = {};
    logs.forEach(l => {
      const d = l.created_at.split("T")[0];
      if (!map[d]) map[d] = { date: d, calls: 0, tokens: 0, cost: 0 };
      map[d].calls++;
      map[d].tokens += l.total_tokens || 0;
      map[d].cost += Number(l.estimated_cost || 0);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  const byModel = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach(l => { const m = l.model || "unknown"; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.split("/").pop() || name, value }));
  }, [logs]);

  const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-primary" /> AI Usage Tracker</h1>
          <p className="text-sm text-muted-foreground">Monitor AI balance consumption per feature in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{stats.totalCalls}</p>
          <p className="text-xs text-muted-foreground">Total AI Calls</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold">{(stats.totalTokens / 1000).toFixed(1)}K</p>
          <p className="text-xs text-muted-foreground">Total Tokens</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground">Est. Cost</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-2xl font-bold">{stats.successRate}%</p>
          <p className="text-xs text-muted-foreground">Success Rate</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold">{stats.errors}</p>
          <p className="text-xs text-muted-foreground">Errors</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">Feature Breakdown</TabsTrigger>
          <TabsTrigger value="trend">Daily Trend</TabsTrigger>
          <TabsTrigger value="logs">Raw Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-6 mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Cost by feature bar chart */}
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

            {/* Calls by model pie chart */}
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

          {/* Feature table */}
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
                  {logs.slice(0, 100).map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(l.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{FEATURE_LABELS[l.feature] || l.feature}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{(l.model || "").split("/").pop()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(l.total_tokens || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">${Number(l.estimated_cost || 0).toFixed(4)}</TableCell>
                      <TableCell>
                        {l.status === "success" ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">OK</Badge>
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
