import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Send, Search, CheckCircle2, XCircle, Clock, Users, TrendingUp, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Log = {
  id: string;
  source: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  state: string | null;
  city: string | null;
  campus: string | null;
  course: string | null;
  campaign: string | null;
  status: string;
  http_status: number | null;
  error: string | null;
  retry_count: number;
  payload: any;
  response: any;
  last_attempt_at: string | null;
  created_at: string;
};

const statusColor = (s: string) => {
  if (s === "success") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "failed") return "bg-red-100 text-red-800 border-red-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
};

export default function AdminMerittoLogs() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Log | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manual, setManual] = useState({
    source: "manual",
    name: "",
    email: "",
    mobile: "",
    state: "",
    city: "",
    campus: "",
    course: "",
    medium: "website",
    campaign: "manual_push",
    extraJson: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("meritto_lead_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data as Log[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (q) {
        const hay = `${r.name ?? ""} ${r.email ?? ""} ${r.mobile ?? ""} ${r.campus ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const success = rows.filter(r => r.status === "success").length;
    const failed = rows.filter(r => r.status === "failed").length;
    const pending = rows.filter(r => r.status === "pending").length;
    const today = rows.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length;
    const rate = total ? Math.round((success / total) * 100) : 0;
    return { total, success, failed, pending, today, rate };
  }, [rows]);

  const sources = useMemo(() => {
    const set = new Set(rows.map(r => r.source));
    return Array.from(set);
  }, [rows]);

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      const { data, error } = await supabase.functions.invoke("push-to-meritto", {
        body: { retry_log_id: id },
      });
      if (error) throw error;
      toast.success(data?.ok ? "Pushed to Meritto" : "Retry attempted — see details");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  const pushManual = async () => {
    if (!manual.name && !manual.email && !manual.mobile) {
      toast.error("Enter at least name, email or mobile");
      return;
    }
    let extra: Record<string, unknown> | undefined;
    if (manual.extraJson.trim()) {
      try { extra = JSON.parse(manual.extraJson); }
      catch { toast.error("Extra JSON is not valid JSON"); return; }
    }
    setManualBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("push-to-meritto", {
        body: {
          source: manual.source || "manual",
          name: manual.name || undefined,
          email: manual.email || undefined,
          mobile: manual.mobile || undefined,
          state: manual.state || undefined,
          city: manual.city || undefined,
          campus: manual.campus || undefined,
          course: manual.course || undefined,
          medium: manual.medium || undefined,
          campaign: manual.campaign || undefined,
          extra,
        },
      });
      if (error) throw error;
      toast.success(data?.ok ? "Lead pushed to Meritto ✅" : `Sent — Meritto responded HTTP ${data?.status}`);
      setManualOpen(false);
      setManual({ ...manual, name: "", email: "", mobile: "", state: "", city: "", campus: "", course: "", extraJson: "" });
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Push failed");
    } finally {
      setManualBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Meritto (NoPaperForms) Integration</h1>
          <p className="text-sm text-muted-foreground">Every lead captured on the site is automatically pushed to Meritto. Track delivery here.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setManualOpen(true)}><Plus className="h-4 w-4 mr-2" />Push Manually</Button>
          <Button onClick={load} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total leads" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Delivered" value={stats.success} tone="emerald" />
        <StatCard icon={<XCircle className="h-4 w-4 text-red-600" />} label="Failed" value={stats.failed} tone="red" />
        <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Pending" value={stats.pending} tone="amber" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Success rate" value={`${stats.rate}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Name / email / mobile" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground self-center">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {rows.length}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Push History</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No leads yet. As soon as a user submits any form, it will show here.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Mobile</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Retries</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2"><Badge variant="secondary">{r.source}</Badge></td>
                    <td className="px-3 py-2">{r.name || "-"}</td>
                    <td className="px-3 py-2">{r.email || "-"}</td>
                    <td className="px-3 py-2">{r.mobile || "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusColor(r.status)}`}>
                        {r.status}{r.http_status ? ` · ${r.http_status}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.retry_count}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>View</Button>
                      {r.status !== "success" && (
                        <Button size="sm" onClick={() => retry(r.id)} disabled={retrying === r.id}>
                          <Send className="h-3 w-3 mr-1" />
                          {retrying === r.id ? "Sending…" : "Retry"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Lead details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Source" value={selected.source} />
                <Field label="Status" value={`${selected.status}${selected.http_status ? ` · HTTP ${selected.http_status}` : ""}`} />
                <Field label="Name" value={selected.name} />
                <Field label="Email" value={selected.email} />
                <Field label="Mobile" value={selected.mobile} />
                <Field label="Campus" value={selected.campus} />
                <Field label="State" value={selected.state} />
                <Field label="City" value={selected.city} />
                <Field label="Course" value={selected.course} />
                <Field label="Campaign" value={selected.campaign} />
                <Field label="Retries" value={String(selected.retry_count)} />
                <Field label="Last attempt" value={selected.last_attempt_at ? new Date(selected.last_attempt_at).toLocaleString() : "-"} />
              </div>
              {selected.error && (
                <div className="p-2 rounded bg-red-50 border border-red-200 text-red-800 text-xs">{selected.error}</div>
              )}
              <div>
                <div className="text-xs font-semibold mb-1">Payload sent</div>
                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-40">{JSON.stringify(selected.payload, null, 2)}</pre>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1">Meritto response</div>
                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-40">{JSON.stringify(selected.response, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className={`text-2xl font-bold mt-1 ${tone === "emerald" ? "text-emerald-600" : tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );
}
