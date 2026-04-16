import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

interface IndexingUrl {
  id: string;
  url: string;
  page_type: string;
  status: string;
  last_submitted_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

interface Stats {
  total: number;
  submitted: number;
  indexed: number;
  failed: number;
  pending: number;
}

const AdminGoogleIndexing = () => {
  const { toast } = useToast();
  const [urls, setUrls] = useState<IndexingUrl[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, submitted: 0, indexed: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("indexing_urls")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setUrls((data as IndexingUrl[]) || []);

    // Compute stats locally
    const all = (data as IndexingUrl[]) || [];
    const s: Stats = { total: all.length, submitted: 0, indexed: 0, failed: 0, pending: 0 };
    for (const r of all) {
      if (r.status === "submitted") s.submitted++;
      else if (r.status === "indexed") s.indexed++;
      else if (r.status === "failed") s.failed++;
      else if (r.status === "pending") s.pending++;
    }
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const callFunction = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("google-indexing", { body });
    if (error) throw error;
    return data;
  };

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
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-700 gap-1"><ArrowUpCircle className="w-3 h-3" />Submitted</Badge>;
      case "indexed":
        return <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle className="w-3 h-3" />Indexed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    }
  };

  const filtered = urls.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (searchTerm && !u.url.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Indexing</h1>
          <p className="text-sm text-muted-foreground">Manage URL submissions to Google Indexing API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDiscover} disabled={!!actionLoading}>
            {actionLoading === "discover" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
            Discover URLs
          </Button>
          <Button onClick={handleRefresh} disabled={!!actionLoading}>
            {actionLoading === "refresh" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Retry Pending/Failed
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("all")}>
          <CardContent className="pt-4 pb-3 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total URLs</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("submitted")}>
          <CardContent className="pt-4 pb-3 text-center">
            <ArrowUpCircle className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("indexed")}>
          <CardContent className="pt-4 pb-3 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{stats.indexed}</p>
            <p className="text-xs text-muted-foreground">Indexed</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("failed")}>
          <CardContent className="pt-4 pb-3 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("pending")}>
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual Submit */}
      <Card>
        <CardHeader><CardTitle className="text-base">Submit URL Manually</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://bschoolbuzz.com/article/..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            />
            <Button onClick={handleManualSubmit} disabled={!!actionLoading || !manualUrl.trim()}>
              {actionLoading === "manual" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* URL Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              URLs {filter !== "all" ? `(${filter})` : ""} — {filtered.length} results
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search URLs..."
                className="w-60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {filter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>Clear filter</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No URLs found. Click "Discover URLs" to scan your content.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Submitted</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-xs truncate text-xs font-mono">{row.url}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{row.page_type}</Badge></TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.last_submitted_at ? new Date(row.last_submitted_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{row.retry_count}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-red-500">{row.error_message || "—"}</TableCell>
                      <TableCell>
                        {(row.status === "failed" || row.status === "pending") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResubmit(row.url)}
                            disabled={actionLoading === row.url}
                          >
                            {actionLoading === row.url ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
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
    </div>
  );
};

export default AdminGoogleIndexing;
