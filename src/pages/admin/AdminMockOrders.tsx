import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, RefreshCw, Search, Download, IndianRupee, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

type OrderRow = {
  id: string;
  user_id: string;
  bundle_id: string;
  amount: number;
  currency: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  bundle_name?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
};

const STATUS_CONFIG: Record<string, { label: string; tone: string; icon: any }> = {
  paid: { label: "Confirmed", tone: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending: { label: "Processing", tone: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  created: { label: "Processing", tone: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  failed: { label: "Failed", tone: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle },
  cancelled: { label: "Failed", tone: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle },
};

const TABS = [
  { key: "all", label: "All Orders" },
  { key: "paid", label: "Confirmed" },
  { key: "pending", label: "Processing" },
  { key: "failed", label: "Failed" },
];

export default function AdminMockOrders() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [bundleFilter, setBundleFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: orders, error } = await supabase
      .from("mock_bundle_orders")
      .select("id, user_id, bundle_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) { toast.error(error.message); setLoading(false); return; }

    const userIds = [...new Set((orders ?? []).map((o) => o.user_id).filter(Boolean))];
    const bundleIds = [...new Set((orders ?? []).map((o) => o.bundle_id).filter(Boolean))];

    const [{ data: profiles }, { data: bundles }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, phone").in("user_id", userIds),
      supabase.from("mock_bundles").select("id, name").in("id", bundleIds),
    ]);

    // Fetch emails via admin function (best-effort)
    let emailMap: Record<string, string> = {};
    try {
      const { data: ed } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "get_emails", user_ids: userIds },
      });
      if ((ed as any)?.emails) emailMap = (ed as any).emails;
    } catch { /* optional */ }

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const bundleMap = new Map((bundles ?? []).map((b: any) => [b.id, b.name]));

    setRows((orders ?? []).map((o: any) => ({
      ...o,
      bundle_name: bundleMap.get(o.bundle_id) || "—",
      user_name: profileMap.get(o.user_id)?.display_name || "—",
      user_email: emailMap[o.user_id] || "",
      user_phone: profileMap.get(o.user_id)?.phone || "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const bundleOptions = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((r) => r.bundle_id && set.set(r.bundle_id, r.bundle_name || r.bundle_id));
    return [...set.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all") {
        const tone = STATUS_CONFIG[r.status]?.label.toLowerCase();
        if (tab === "paid" && tone !== "confirmed") return false;
        if (tab === "pending" && tone !== "processing") return false;
        if (tab === "failed" && tone !== "failed") return false;
      }
      if (bundleFilter !== "all" && r.bundle_id !== bundleFilter) return false;
      if (from && new Date(r.created_at) < new Date(from)) return false;
      if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${r.user_name} ${r.user_email} ${r.user_phone} ${r.bundle_name} ${r.razorpay_order_id} ${r.razorpay_payment_id}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, tab, bundleFilter, from, to, search]);

  const stats = useMemo(() => {
    const confirmed = rows.filter((r) => STATUS_CONFIG[r.status]?.label === "Confirmed");
    return {
      total: rows.length,
      confirmed: confirmed.length,
      processing: rows.filter((r) => STATUS_CONFIG[r.status]?.label === "Processing").length,
      failed: rows.filter((r) => STATUS_CONFIG[r.status]?.label === "Failed").length,
      revenue: confirmed.reduce((a, r) => a + (Number(r.amount) || 0), 0),
    };
  }, [rows]);

  const exportCsv = () => {
    const headers = ["Date", "Student", "Email", "Phone", "Course", "Amount", "Currency", "Status", "Razorpay Order", "Payment ID"];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      lines.push([
        new Date(r.created_at).toISOString(),
        r.user_name, r.user_email, r.user_phone, r.bundle_name,
        r.amount, r.currency, STATUS_CONFIG[r.status]?.label || r.status,
        r.razorpay_order_id || "", r.razorpay_payment_id || "",
      ].map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mock-orders-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Mock Orders</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Orders" value={stats.total} />
        <StatCard label="Confirmed" value={stats.confirmed} tone="text-emerald-700" />
        <StatCard label="Processing" value={stats.processing} tone="text-amber-700" />
        <StatCard label="Failed" value={stats.failed} tone="text-rose-700" />
        <StatCard label="Revenue (Confirmed)" value={`₹${stats.revenue.toLocaleString()}`} tone="text-sky-700" icon={IndianRupee} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, phone, order ID…" className="pl-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Course / Bundle</Label>
            <Select value={bundleFilter} onValueChange={setBundleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bundles</SelectItem>
                {bundleOptions.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From date</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To date</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Student</th>
                <th className="p-3">Course</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders match these filters</td></tr>}
              {!loading && filtered.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, tone: "bg-muted", icon: Clock };
                const Icon = cfg.icon;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/20">
                    <td className="p-3 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.user_name}</div>
                      <div className="text-xs text-muted-foreground">{r.user_email}</div>
                      {r.user_phone && <div className="text-xs text-muted-foreground">+91 {r.user_phone}</div>}
                    </td>
                    <td className="p-3">{r.bundle_name}</td>
                    <td className="p-3 text-right font-medium">₹{Number(r.amount).toLocaleString()}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={cfg.tone}>
                        <Icon className="h-3 w-3 mr-1" />{cfg.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs font-mono text-muted-foreground">
                      {r.razorpay_payment_id || r.razorpay_order_id || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon }: { label: string; value: any; tone?: string; icon?: any }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 flex items-center gap-1 ${tone ?? ""}`}>
        {Icon && <Icon className="h-5 w-5" />}{value}
      </div>
    </Card>
  );
}
