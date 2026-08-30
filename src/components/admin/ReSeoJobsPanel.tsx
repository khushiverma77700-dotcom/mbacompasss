import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, XCircle, RotateCcw, Clock, PlayCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type JobRow = {
  id: string;
  label: string | null;
  scope: string;
  status: "queued" | "running" | "completed" | "cancelled" | "failed" | string;
  total_items: number;
  processed: number;
  succeeded: number;
  failed: number;
  run_at: string | null;
  priority: number;
  cancel_requested: boolean;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

const statusBadge = (s: string) => {
  switch (s) {
    case "queued": return { icon: <Clock className="h-3 w-3" />, cls: "bg-slate-100 text-slate-700 border-slate-200", label: "Queued" };
    case "running": return { icon: <Loader2 className="h-3 w-3 animate-spin" />, cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Running" };
    case "completed": return { icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-green-50 text-green-700 border-green-200", label: "Completed" };
    case "cancelled": return { icon: <XCircle className="h-3 w-3" />, cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Cancelled" };
    case "failed": return { icon: <AlertTriangle className="h-3 w-3" />, cls: "bg-red-50 text-red-700 border-red-200", label: "Failed" };
    default: return { icon: null, cls: "bg-slate-50 text-slate-600 border-slate-200", label: s };
  }
};

export default function ReSeoJobsPanel({ onOpenRun }: { onOpenRun: (runId: string) => void }) {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-reoptimize", {
        method: "GET" as any,
        // supabase-js appends query string via body? use direct fetch instead:
      });
      if (error) throw error;
      // fallback path — the above may not pass GET query; use direct URL
      setRows((data?.runs as JobRow[]) || []);
    } catch {
      // Direct GET fetch (invoke doesn't support query params consistently)
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const url = `${(supabase as any).functionsUrl || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`}/seo-reoptimize?list=1&limit=50`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        setRows((j?.runs as JobRow[]) || []);
      } catch (e: any) {
        toast({ title: "Failed to load jobs", description: String(e?.message || e), variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const cancelRun = async (id: string) => {
    setBusyId(id);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${(supabase as any).functionsUrl || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`}/seo-reoptimize?action=cancel`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ run_id: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Cancellation requested" });
      load();
    } catch (e: any) {
      toast({ title: "Cancel failed", description: String(e?.message || e), variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const rerunFailed = async (id: string) => {
    setBusyId(id);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${(supabase as any).functionsUrl || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`}/seo-reoptimize?action=rerun`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ run_id: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      toast({ title: "Re-queued failed items", description: `${j.requeued || 0} item(s) will re-run.` });
      load();
    } catch (e: any) {
      toast({ title: "Re-run failed", description: String(e?.message || e), variant: "destructive" });
    } finally { setBusyId(null); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Re-SEO Jobs</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Queued, running and recent bulk optimizations. Jobs run in the background; the UI stays responsive.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">No Re-SEO jobs yet.</div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => {
              const b = statusBadge(r.status);
              const total = r.total_items || 0;
              const pct = total ? Math.round((r.processed / total) * 100) : 0;
              const isCancellable = r.status === "queued" || r.status === "running";
              const scheduled = r.status === "queued" && r.run_at ? new Date(r.run_at) : null;
              return (
                <div key={r.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="font-medium text-sm truncate hover:underline text-left"
                        onClick={() => onOpenRun(r.id)}
                        title="Open live progress"
                      >
                        {r.label || `Run ${r.id.slice(0, 8)}`}
                      </button>
                      <Badge variant="outline" className={`text-xs ${b.cls} flex items-center gap-1`}>{b.icon}{b.label}</Badge>
                      <Badge variant="outline" className="text-xs">{r.scope}</Badge>
                      {scheduled && (
                        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                          runs {formatDistanceToNow(scheduled, { addSuffix: true })}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{r.processed}/{total} processed</span>
                      <span className="text-green-600">{r.succeeded} ok</span>
                      {r.failed > 0 && <span className="text-red-600">{r.failed} failed</span>}
                      <span>· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${r.status === "failed" ? "bg-red-400" : r.status === "cancelled" ? "bg-amber-400" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onOpenRun(r.id)}>View</Button>
                    {isCancellable && (
                      <Button size="sm" variant="outline" onClick={() => cancelRun(r.id)} disabled={busyId === r.id}>
                        {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                      </Button>
                    )}
                    {r.failed > 0 && (r.status === "completed" || r.status === "failed" || r.status === "cancelled") && (
                      <Button size="sm" variant="outline" onClick={() => rerunFailed(r.id)} disabled={busyId === r.id} title="Re-queue failed items">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
