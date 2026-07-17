import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Send, Search, CheckCircle2, XCircle, Clock, Users, TrendingUp, Plus, Upload, Download } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MERITTO_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "campus", label: "Campus / Program" },
  { key: "course", label: "Course" },
  { key: "medium", label: "Medium" },
  { key: "campaign", label: "Campaign" },
  { key: "source", label: "Source" },
];

type BulkResult = {
  row: number;
  mapped: Record<string, string>;
  status: "pending" | "success" | "failed" | "invalid";
  error?: string;
  http?: number;
};

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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStep, setBulkStep] = useState<"upload" | "map" | "review">("upload");
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([]);
  const [bulkRaw, setBulkRaw] = useState<Record<string, string>[]>([]);
  const [bulkMapping, setBulkMapping] = useState<Record<string, string>>({});
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const parseLine = (line: string) => {
      const out: string[] = [];
      let cur = "", q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (c === "," && !q) { out.push(cur); cur = ""; }
        else cur += c;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
      return row;
    });
    return { headers, rows };
  };

  const autoMap = (headers: string[]): Record<string, string> => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const map: Record<string, string> = {};
    for (const t of MERITTO_FIELDS) {
      const hit = headers.find((h) => norm(h) === norm(t.key)) || headers.find((h) => norm(h).includes(norm(t.key)));
      if (hit) map[t.key] = hit;
    }
    return map;
  };

  const validateRow = (r: Record<string, string>): string | null => {
    if (!r.name) return "Name is required";
    if (!r.email && !r.mobile) return "Email or mobile is required";
    if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return "Invalid email format";
    if (r.mobile) {
      const digits = r.mobile.replace(/\D/g, "");
      if (digits.length < 10) return "Mobile must have at least 10 digits";
    }
    return null;
  };

  const onBulkFile = async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    if (!rows.length) { toast.error("CSV appears empty"); return; }
    setBulkHeaders(headers);
    setBulkRaw(rows);
    setBulkMapping(autoMap(headers));
    setBulkStep("map");
  };

  const buildMapped = (): { mapped: Record<string, string>; raw: Record<string, string>; error: string | null }[] => {
    return bulkRaw.map((r) => {
      const mapped: Record<string, string> = {};
      for (const t of MERITTO_FIELDS) {
        const src = bulkMapping[t.key];
        mapped[t.key] = src ? (r[src] ?? "").trim() : "";
      }
      return { mapped, raw: r, error: validateRow(mapped) };
    });
  };

  const pushOne = async (mapped: Record<string, string>): Promise<{ ok: boolean; error?: string; http?: number }> => {
    try {
      const { data, error } = await supabase.functions.invoke("push-to-meritto", {
        body: {
          skip_log: true, // ephemeral: never persist bulk lead data on our server
          source: mapped.source || "bulk_upload",
          name: mapped.name || undefined,
          email: mapped.email || undefined,
          mobile: mapped.mobile || undefined,
          state: mapped.state || undefined,
          city: mapped.city || undefined,
          campus: mapped.campus || undefined,
          course: mapped.course || undefined,
          medium: mapped.medium || "website",
          campaign: mapped.campaign || "bulk_upload",
        },
      });
      if (error) return { ok: false, error: error.message };
      if (!data?.ok) return { ok: false, error: `Meritto rejected (HTTP ${data?.status ?? "?"})`, http: data?.status };
      return { ok: true, http: data?.status };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Network error" };
    }
  };

  const runBulk = async () => {
    const prepared = buildMapped();
    const initial: BulkResult[] = prepared.map((p, i) => ({
      row: i + 2,
      mapped: p.mapped,
      status: p.error ? "invalid" : "pending",
      error: p.error ?? undefined,
    }));
    setBulkResults(initial);
    setBulkStep("review");
    const toSend = initial.map((r, idx) => ({ r, idx })).filter(({ r }) => r.status === "pending");
    if (!toSend.length) { toast.error("No valid rows to send — fix errors and retry"); return; }
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: toSend.length });
    let done = 0;
    const next = [...initial];
    for (const { r, idx } of toSend) {
      const res = await pushOne(r.mapped);
      next[idx] = { ...r, status: res.ok ? "success" : "failed", error: res.error, http: res.http };
      done++;
      setBulkResults([...next]);
      setBulkProgress({ done, total: toSend.length });
    }
    setBulkBusy(false);
    const s = next.filter((x) => x.status === "success").length;
    const f = next.filter((x) => x.status === "failed").length;
    toast.success(`Bulk push complete — ${s} delivered, ${f} failed`);
    await load();
  };

  const retryFailed = async () => {
    const failedIdx = bulkResults.map((r, i) => (r.status === "failed" ? i : -1)).filter((i) => i >= 0);
    if (!failedIdx.length) { toast.info("No failed rows to retry"); return; }
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: failedIdx.length });
    const next = [...bulkResults];
    let done = 0;
    for (const i of failedIdx) {
      next[i] = { ...next[i], status: "pending", error: undefined };
      setBulkResults([...next]);
      const res = await pushOne(next[i].mapped);
      next[i] = { ...next[i], status: res.ok ? "success" : "failed", error: res.error, http: res.http };
      done++;
      setBulkResults([...next]);
      setBulkProgress({ done, total: failedIdx.length });
    }
    setBulkBusy(false);
    await load();
  };

  const exportResults = () => {
    if (!bulkResults.length) return;
    const cols = ["row", "status", "http", "error", ...MERITTO_FIELDS.map((f) => f.key)];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.join(",");
    const body = bulkResults.map((r) => cols.map((c) => {
      if (c === "row") return r.row;
      if (c === "status") return r.status;
      if (c === "http") return r.http ?? "";
      if (c === "error") return esc(r.error ?? "");
      return esc(r.mapped[c] ?? "");
    }).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meritto-bulk-results-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetBulk = () => {
    setBulkStep("upload");
    setBulkHeaders([]);
    setBulkRaw([]);
    setBulkMapping({});
    setBulkResults([]);
    setBulkProgress({ done: 0, total: 0 });
  };



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
          <Button onClick={() => setBulkOpen(true)} variant="secondary"><Upload className="h-4 w-4 mr-2" />Bulk Upload</Button>
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

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Push a lead manually to Meritto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ManualField label="Name" value={manual.name} onChange={(v) => setManual({ ...manual, name: v })} placeholder="John Doe" />
            <ManualField label="Email" value={manual.email} onChange={(v) => setManual({ ...manual, email: v })} placeholder="john@example.com" />
            <ManualField label="Mobile (10 digits)" value={manual.mobile} onChange={(v) => setManual({ ...manual, mobile: v })} placeholder="9876543210" />
            <ManualField label="State" value={manual.state} onChange={(v) => setManual({ ...manual, state: v })} placeholder="Maharashtra" />
            <ManualField label="City" value={manual.city} onChange={(v) => setManual({ ...manual, city: v })} placeholder="Mumbai" />
            <ManualField label="Campus" value={manual.campus} onChange={(v) => setManual({ ...manual, campus: v })} placeholder="MBA Compass" />
            <ManualField label="Course" value={manual.course} onChange={(v) => setManual({ ...manual, course: v })} placeholder="MBA / PGDM" />
            <ManualField label="Source (tag)" value={manual.source} onChange={(v) => setManual({ ...manual, source: v })} placeholder="manual" />
            <ManualField label="Medium" value={manual.medium} onChange={(v) => setManual({ ...manual, medium: v })} placeholder="website" />
            <ManualField label="Campaign" value={manual.campaign} onChange={(v) => setManual({ ...manual, campaign: v })} placeholder="manual_push" />
            <div className="md:col-span-2">
              <Label className="text-xs">Extra fields (optional JSON)</Label>
              <Textarea
                rows={3}
                placeholder='{ "utm_source": "facebook", "custom_field": "value" }'
                value={manual.extraJson}
                onChange={(e) => setManual({ ...manual, extraJson: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Any extra Meritto fields as JSON. Leave empty if not needed.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button onClick={pushManual} disabled={manualBusy}>
              <Send className="h-4 w-4 mr-2" />{manualBusy ? "Pushing…" : "Push to Meritto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(o) => { if (bulkBusy) return; setBulkOpen(o); if (!o) resetBulk(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk upload leads to Meritto</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 text-xs mb-2">
            {(["upload", "map", "review"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${bulkStep === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                <span className={bulkStep === s ? "font-semibold" : "text-muted-foreground"}>{s === "upload" ? "Upload CSV" : s === "map" ? "Map columns" : "Review & push"}</span>
                {i < 2 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>

          {bulkStep === "upload" && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="font-medium mb-1">Step 1 — Download the sample CSV</div>
                <p className="text-xs text-muted-foreground mb-2">Uses the exact field names Meritto expects: name, email, mobile, state, city, campus, course, medium, campaign, source. If your CSV uses different headers, you'll map them in the next step.</p>
                <a href="/meritto-bulk-sample.csv" download>
                  <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" />Download sample.csv</Button>
                </a>
              </div>
              <div>
                <div className="font-medium mb-1">Step 2 — Upload your CSV</div>
                <Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onBulkFile(f); }} />
                <p className="text-[11px] text-muted-foreground mt-1">You'll review headers, mapping and validation before anything is sent.</p>
              </div>
            </div>
          )}

          {bulkStep === "map" && (() => {
            const mapped = buildMapped();
            const invalid = mapped.filter((m) => m.error).length;
            return (
              <div className="space-y-4 text-sm">
                <div className="rounded-md border p-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground">Detected {bulkRaw.length} rows and {bulkHeaders.length} columns. Map each Meritto field to a column in your CSV.</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MERITTO_FIELDS.map((f) => (
                    <div key={f.key}>
                      <Label className="text-xs">{f.label}{f.required && <span className="text-red-500"> *</span>}</Label>
                      <Select value={bulkMapping[f.key] ?? "__none"} onValueChange={(v) => setBulkMapping({ ...bulkMapping, [f.key]: v === "__none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— Skip —</SelectItem>
                          {bulkHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className={`rounded-md border p-3 text-xs ${invalid ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                  {invalid
                    ? `${invalid} of ${mapped.length} rows have validation errors (missing name / contact, invalid email, or short mobile). You can still push — invalid rows will be skipped and shown in results.`
                    : `All ${mapped.length} rows passed validation.`}
                </div>
                <div className="overflow-x-auto max-h-64 border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1">Row</th>
                        {MERITTO_FIELDS.map((f) => <th key={f.key} className="text-left px-2 py-1">{f.label}</th>)}
                        <th className="text-left px-2 py-1">Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapped.slice(0, 20).map((m, i) => (
                        <tr key={i} className={`border-t ${m.error ? "bg-red-50" : ""}`}>
                          <td className="px-2 py-1">{i + 2}</td>
                          {MERITTO_FIELDS.map((f) => <td key={f.key} className="px-2 py-1">{m.mapped[f.key] || "-"}</td>)}
                          <td className="px-2 py-1 text-red-700">{m.error || "OK"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {mapped.length > 20 && <div className="p-2 text-[11px] text-muted-foreground">Showing first 20 of {mapped.length} rows.</div>}
                </div>
              </div>
            );
          })()}

          {bulkStep === "review" && (
            <div className="space-y-3 text-sm">
              {bulkBusy && (
                <div className="rounded-md border p-3 text-xs space-y-1">
                  <div>Pushing… {bulkProgress.done}/{bulkProgress.total}</div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <ResultChip label="Total" value={bulkResults.length} />
                <ResultChip label="Delivered" value={bulkResults.filter((r) => r.status === "success").length} tone="emerald" />
                <ResultChip label="Failed" value={bulkResults.filter((r) => r.status === "failed").length} tone="red" />
                <ResultChip label="Invalid" value={bulkResults.filter((r) => r.status === "invalid").length} tone="amber" />
              </div>
              <div className="overflow-x-auto max-h-80 border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1">Row</th>
                      <th className="text-left px-2 py-1">Name</th>
                      <th className="text-left px-2 py-1">Email</th>
                      <th className="text-left px-2 py-1">Mobile</th>
                      <th className="text-left px-2 py-1">Status</th>
                      <th className="text-left px-2 py-1">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r) => (
                      <tr key={r.row} className={`border-t ${r.status === "failed" ? "bg-red-50" : r.status === "invalid" ? "bg-amber-50" : r.status === "success" ? "bg-emerald-50/40" : ""}`}>
                        <td className="px-2 py-1">{r.row}</td>
                        <td className="px-2 py-1">{r.mapped.name || "-"}</td>
                        <td className="px-2 py-1">{r.mapped.email || "-"}</td>
                        <td className="px-2 py-1">{r.mapped.mobile || "-"}</td>
                        <td className="px-2 py-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${
                            r.status === "success" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : r.status === "failed" ? "bg-red-100 text-red-800 border-red-200"
                            : r.status === "invalid" ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-muted text-muted-foreground"
                          }`}>{r.status}{r.http ? ` · ${r.http}` : ""}</span>
                        </td>
                        <td className="px-2 py-1 text-red-700">{r.error || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            {bulkStep === "upload" && (
              <Button variant="outline" onClick={() => setBulkOpen(false)}>Close</Button>
            )}
            {bulkStep === "map" && (
              <>
                <Button variant="outline" onClick={resetBulk} disabled={bulkBusy}>Back</Button>
                <Button onClick={runBulk} disabled={bulkBusy || !bulkMapping.name}>
                  <Upload className="h-4 w-4 mr-2" />Start Bulk Push
                </Button>
              </>
            )}
            {bulkStep === "review" && (
              <>
                <Button variant="outline" onClick={resetBulk} disabled={bulkBusy}>New Upload</Button>
                <Button variant="outline" onClick={exportResults} disabled={!bulkResults.length}>
                  <Download className="h-4 w-4 mr-2" />Export CSV
                </Button>
                <Button onClick={retryFailed} disabled={bulkBusy || !bulkResults.some((r) => r.status === "failed")}>
                  <RefreshCw className="h-4 w-4 mr-2" />Retry Failed
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManualField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
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

function ResultChip({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const cls = tone === "emerald" ? "text-emerald-600" : tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "";
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${cls}`}>{value}</div>
    </div>
  );
}
