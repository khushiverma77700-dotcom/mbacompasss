import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import {
  Globe,
  RefreshCw,
  Send,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowUpCircle,
  BarChart3,
  TrendingUp,
  Activity,
  Timer,
  Zap,
} from "lucide-react";

interface IndexingUrl {
  id: string;
  url: string;
  page_type: string;
  status: string;
  last_submitted_at: string | null;
  indexed_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

interface IndexingLog {
  id: string;
  action: string;
  status: string;
  created_at: string;
  error_message: string | null;
}

const AdminGoogleIndexing = () => {
  const { toast } = useToast();
  const [urls, setUrls] = useState<IndexingUrl[]>([]);
  const [logs, setLogs] = useState<IndexingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"urls" | "logs" | "charts">("urls");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [urlsRes, logsRes] = await Promise.all([
      supabase
        .from("indexing_urls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("indexing_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setUrls((urlsRes.data as IndexingUrl[]) || []);
    setLogs((logsRes.data as IndexingLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // === Stats ===
  const stats = useMemo(() => {
    const s = { total: urls.length, submitted: 0, indexed: 0, failed: 0, pending: 0 };
    for (const r of urls) {
      if (r.status === "submitted") s.submitted++;
      else if (r.status === "indexed") s.indexed++;
      else if (r.status === "failed") s.failed++;
      else if (r.status === "pending") s.pending++;
    }
    return s;
  }, [urls]);

  // === Chart data ===
  const chartData = useMemo(() => {
    // Cumulative indexed over time
    const indexedUrls = urls
      .filter((u) => u.indexed_at || u.status === "submitted" || u.status === "indexed")
      .map((u) => ({ date: (u.indexed_at || u.last_submitted_at || u.created_at).slice(0, 10) }));

    const dateCounts: Record<string, number> = {};
    for (const u of indexedUrls) {
      dateCounts[u.date] = (dateCounts[u.date] || 0) + 1;
    }

    const sortedDates = Object.keys(dateCounts).sort();
    let cumulative = 0;
    const cumulativeData = sortedDates.map((date) => {
      cumulative += dateCounts[date];
      return { date, daily: dateCounts[date], cumulative };
    });

    // If no data, show at least today
    if (cumulativeData.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      cumulativeData.push({ date: today, daily: 0, cumulative: 0 });
    }

    return cumulativeData;
  }, [urls]);

  // === Helpers ===
  const callFunction = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("google-indexing", { body });
    if (error) throw error;
    return data;
  };

  const formatDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return "—";
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (ms < 0) return "—";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // === Actions ===
  const handleDiscover = async () => {
    setActionLoading("discover");
    try {
      const result = await callFunction({ action: "discover" });
      toast({ title: "Discovery Complete", description: `${result.discovered} new URLs found` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleRefresh = async () => {
    setActionLoading("refresh");
    try {
      const result = await callFunction({ action: "refresh" });
      toast({ title: "Refresh Complete", description: `${result.success}/${result.total} URLs retried successfully` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleSubmitAll = async () => {
    setActionLoading("submit-all");
    try {
      const pendingUrls = urls.filter((u) => u.status === "pending").map((u) => u.url);
      if (!pendingUrls.length) {
        toast({ title: "No Pending URLs", description: "All URLs have been submitted" });
        setActionLoading(null);
        return;
      }
      const result = await callFunction({ action: "batch_submit", urls: pendingUrls.slice(0, 100) });
      const successCount = result.results?.filter((r: any) => r.success).length || 0;
      toast({ title: "Batch Submit Complete", description: `${successCount}/${pendingUrls.length} URLs submitted` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleManualSubmit = async () => {
    if (!manualUrl.trim()) return;
    setActionLoading("manual");
    try {
      const result = await callFunction({ action: "submit_url", url: manualUrl.trim(), page_type: "manual" });
      toast({
        title: result.success ? "URL Submitted" : "Submission Failed",
        description: result.success ? "URL sent to Google Indexing API" : JSON.stringify(result.result),
        variant: result.success ? "default" : "destructive",
      });
      setManualUrl("");
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleResubmit = async (url: string) => {
    setActionLoading(url);
    try {
      await callFunction({ action: "submit_url", url });
      toast({ title: "Re-submitted", description: url });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: any; label: string }> = {
      submitted: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: ArrowUpCircle, label: "Submitted" },
      indexed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle, label: "Indexed" },
      failed: { cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle, label: "Failed" },
      pending: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return <Badge variant="outline" className={`gap-1 ${s.cls}`}><Icon className="w-3 h-3" />{s.label}</Badge>;
  };

  const filtered = urls.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (searchTerm && !u.url.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const chartConfig = {
    cumulative: { label: "Total Indexed", color: "hsl(var(--primary))" },
    daily: { label: "Daily Indexed", color: "hsl(142 71% 45%)" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" /> Google Indexing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated URL submission & tracking — refreshes every hour
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDiscover} disabled={!!actionLoading}>
            {actionLoading === "discover" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
            Discover New
          </Button>
          <Button variant="outline" size="sm" onClick={handleSubmitAll} disabled={!!actionLoading}>
            {actionLoading === "submit-all" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
            Submit All Pending
          </Button>
          <Button size="sm" onClick={handleRefresh} disabled={!!actionLoading}>
            {actionLoading === "refresh" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Retry Failed
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: "all", label: "Total URLs", value: stats.total, icon: BarChart3, color: "text-muted-foreground" },
          { key: "submitted", label: "Submitted", value: stats.submitted, icon: ArrowUpCircle, color: "text-blue-500" },
          { key: "indexed", label: "Indexed", value: stats.indexed, icon: CheckCircle, color: "text-emerald-500" },
          { key: "failed", label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-500" },
          { key: "pending", label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className={`cursor-pointer transition-all hover:shadow-md ${filter === card.key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFilter(card.key)}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${card.color}`} />
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {[
          { id: "urls" as const, label: "URLs", icon: Globe },
          { id: "charts" as const, label: "Analytics", icon: TrendingUp },
          { id: "logs" as const, label: "Activity Logs", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Manual Submit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Send className="w-4 h-4" /> Submit URL Manually
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://bschoolbuzz.com/article/..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              className="flex-1"
            />
            <Button onClick={handleManualSubmit} disabled={!!actionLoading || !manualUrl.trim()}>
              {actionLoading === "manual" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* URLs Tab */}
      {activeTab === "urls" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                {filter !== "all" ? `${filter.charAt(0).toUpperCase() + filter.slice(1)} URLs` : "All URLs"} — {filtered.length} results
              </CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search URLs..."
                  className="w-52 h-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {filter !== "all" && (
                  <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>Clear</Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No URLs found. Click "Discover New" to scan your content.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px]">URL</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Indexed</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> Duration</span>
                      </TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.id} className="group">
                        <TableCell className="max-w-[300px]">
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-primary hover:underline truncate block"
                          >
                            {row.url.replace("https://bschoolbuzz.com", "")}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1.5">{row.page_type}</Badge>
                        </TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(row.last_submitted_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(row.indexed_at)}
                        </TableCell>
                        <TableCell className="text-xs font-medium whitespace-nowrap">
                          {formatDuration(row.last_submitted_at, row.indexed_at)}
                        </TableCell>
                        <TableCell className="text-xs text-center">{row.retry_count}</TableCell>
                        <TableCell className="max-w-[180px]">
                          {row.error_message && (
                            <span className="text-[10px] text-red-500 line-clamp-2" title={row.error_message}>
                              {row.error_message.slice(0, 80)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(row.status === "failed" || row.status === "pending") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleResubmit(row.url)}
                              disabled={actionLoading === row.url}
                              title="Re-submit"
                            >
                              {actionLoading === row.url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Tab */}
      {activeTab === "charts" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Cumulative Indexed URLs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Total Indexed"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" /> Daily Indexed URLs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="daily"
                    fill="hsl(142 71% 45%)"
                    radius={[4, 4, 0, 0]}
                    name="Daily Indexed"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Recent Activity — {logs.length} entries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No activity logs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell className="text-[10px] text-red-500 max-w-[300px] truncate">
                          {log.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminGoogleIndexing;
