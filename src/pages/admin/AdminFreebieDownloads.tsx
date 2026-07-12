import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, Loader2, Search, RefreshCw, Users, FileText,
  TrendingUp, CalendarDays, CalendarRange, Calendar,
} from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  freebie_id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  user_agent: string | null;
  referrer: string | null;
  freebie?: { title: string; category: string | null } | null;
};

const PRESETS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "custom", label: "Custom range" },
];

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const AdminFreebieDownloads = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [preset, setPreset] = useState<string>("30d");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("freebie_downloads")
      .select("*, freebie:freebies(title, category)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.freebie?.category && set.add(r.freebie.category));
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  // Resolve effective date range from preset
  const range = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (preset === "today") return { from: start, to: end };
    if (preset === "7d") { const s = new Date(start); s.setDate(s.getDate() - 6); return { from: s, to: end }; }
    if (preset === "30d") { const s = new Date(start); s.setDate(s.getDate() - 29); return { from: s, to: end }; }
    if (preset === "90d") { const s = new Date(start); s.setDate(s.getDate() - 89); return { from: s, to: end }; }
    if (preset === "custom") {
      const s = from ? new Date(from + "T00:00:00") : null;
      const e = to ? new Date(to + "T23:59:59") : null;
      return { from: s, to: e };
    }
    return { from: null as Date | null, to: null as Date | null };
  }, [preset, from, to]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      if (range.from && t < range.from.getTime()) return false;
      if (range.to && t > range.to.getTime()) return false;
      if (category !== "all" && r.freebie?.category !== category) return false;
      if (!s) return true;
      return (
        (r.name || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.phone || "").toLowerCase().includes(s) ||
        (r.freebie?.title || "").toLowerCase().includes(s) ||
        (r.freebie?.category || "").toLowerCase().includes(s)
      );
    });
  }, [rows, q, range, category]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const users = new Set<string>();
    filtered.forEach((r) => {
      const key = r.user_id || r.email || r.phone;
      if (key) users.add(String(key));
    });
    const uniqueUsers = users.size;

    // Span in days
    let spanDays = 1;
    if (filtered.length > 0) {
      const times = filtered.map((r) => new Date(r.created_at).getTime());
      const min = range.from ? range.from.getTime() : Math.min(...times);
      const max = range.to ? Math.min(range.to.getTime(), Date.now()) : Math.max(...times);
      spanDays = Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1);
    }

    const avgPerUser = uniqueUsers ? total / uniqueUsers : 0;
    const daily = total / spanDays;
    const weekly = daily * 7;
    const monthly = daily * 30;

    // Top freebies
    const byFreebie = new Map<string, { title: string; count: number }>();
    filtered.forEach((r) => {
      const key = r.freebie_id;
      const title = r.freebie?.title || "(deleted)";
      const cur = byFreebie.get(key) || { title, count: 0 };
      cur.count += 1;
      byFreebie.set(key, cur);
    });
    const topFreebies = Array.from(byFreebie.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { total, uniqueUsers, avgPerUser, daily, weekly, monthly, spanDays, topFreebies };
  }, [filtered, range]);

  const exportCsv = () => {
    const header = ["Date", "Freebie", "Category", "Name", "Email", "Phone", "User ID"];
    const body = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      r.freebie?.title || "",
      r.freebie?.category || "",
      r.name || "",
      r.email || "",
      r.phone || "",
      r.user_id || "",
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freebie-downloads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => n >= 100 ? n.toFixed(0) : n.toFixed(1);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button></Link>
        <h1 className="text-2xl font-bold">Freebie Download Logs</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date range</label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={preset === "custom" ? from : (range.from ? toDateInput(range.from) : "")}
                onChange={(e) => { setPreset("custom"); setFrom(e.target.value); }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={preset === "custom" ? to : (range.to ? toDateInput(range.to) : "")}
                onChange={(e) => { setPreset("custom"); setTo(e.target.value); }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, freebie…" className="pl-9" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Download className="h-4 w-4" />} label="Total downloads" value={stats.total.toLocaleString()} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Unique users" value={stats.uniqueUsers.toLocaleString()} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Avg / user" value={fmt(stats.avgPerUser)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Daily avg" value={fmt(stats.daily)} sub={`${stats.spanDays}d span`} />
        <StatCard icon={<CalendarRange className="h-4 w-4" />} label="Weekly avg" value={fmt(stats.weekly)} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Monthly avg" value={fmt(stats.monthly)} />
      </div>

      {/* Top freebies */}
      {stats.topFreebies.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Top freebies in range</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topFreebies.map((t) => {
                const pct = stats.total ? (t.count / stats.total) * 100 : 0;
                return (
                  <div key={t.title} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate mr-3">{t.title}</span>
                      <span className="text-muted-foreground shrink-0">{t.count} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded bg-slate-100 overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log table */}
      <Card>
        <CardHeader>
          <CardTitle>Downloads ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No downloads in this range.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Freebie</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 500).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{r.freebie?.title || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{r.freebie?.category || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{r.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs">{r.email || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs">{r.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {r.user_id ? <Badge variant="secondary" className="text-[10px]">Logged-in</Badge> : <Badge variant="outline" className="text-[10px]">Guest</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 500 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Showing first 500 of {filtered.length} rows. Export CSV to see all.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <Card>
    <CardContent className="pt-4 pb-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent>
  </Card>
);

export default AdminFreebieDownloads;
