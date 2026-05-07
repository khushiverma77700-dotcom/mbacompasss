import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, Lock, Unlock } from "lucide-react";

type Cta = {
  id: string;
  cta_key: string;
  label: string;
  category: string;
  description: string | null;
  location_hint: string | null;
  requires_login: boolean;
};

const AdminCTAManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Cta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("cta_settings")
        .select("*")
        .order("category", { ascending: true })
        .order("label", { ascending: true });
      if (cancelled) return;
      if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows((data as any) || []);
      setLoading(false);
    };
    load();

    // Realtime keeps the page in sync with other admins
    const channel = supabase
      .channel("admin_cta_settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cta_settings" },
        (payload: any) => {
          setRows((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((r) => r.id !== payload.old.id);
            }
            const next = payload.new as Cta;
            const i = prev.findIndex((r) => r.id === next.id);
            if (i === -1) return [...prev, next].sort((a, b) => (a.category + a.label).localeCompare(b.category + b.label));
            const copy = prev.slice();
            copy[i] = next;
            return copy;
          });
        }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [toast]);

  const toggle = async (row: Cta, value: boolean) => {
    setSavingKey(row.cta_key);
    // Optimistic update
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, requires_login: value } : r)));
    const { error } = await supabase
      .from("cta_settings")
      .update({ requires_login: value })
      .eq("id", row.id);
    setSavingKey(null);
    if (error) {
      // revert
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, requires_login: !value } : r)));
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: value ? "Login required enabled" : "Login requirement removed",
      description: row.label,
    });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        (r.description || "").toLowerCase().includes(term) ||
        (r.location_hint || "").toLowerCase().includes(term) ||
        r.cta_key.toLowerCase().includes(term)
    );
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Cta[]>();
    filtered.forEach((r) => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const totalGated = rows.filter((r) => r.requires_login).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            CTA Login Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle login requirement for any button on the site, and see how each one performs.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalGated} of {rows.length} gated
        </Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search CTA, category, location…"
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading CTA settings…
        </div>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No CTAs match your search.</CardContent></Card>
      ) : (
        grouped.map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{cat}</CardTitle>
              <CardDescription>
                {items.filter((i) => i.requires_login).length} of {items.length} require login
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{row.label}</span>
                      {row.requires_login ? (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <Lock className="w-3 h-3" /> Login required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Unlock className="w-3 h-3" /> Public
                        </Badge>
                      )}
                    </div>
                    {row.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{row.description}</p>
                    )}
                    {row.location_hint && (
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
                        <span className="font-medium">Where:</span> {row.location_hint}
                      </p>
                    )}
                    <code className="text-[10px] text-muted-foreground/70">{row.cta_key}</code>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {savingKey === row.cta_key && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={row.requires_login}
                      onCheckedChange={(v) => toggle(row, v)}
                      aria-label={`Toggle login required for ${row.label}`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

// ---------- Analytics ----------

type EventRow = { cta_key: string; outcome: "login_prompted" | "executed"; created_at: string };

const RANGES: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

const CtaAnalyticsPanel = ({ rows }: { rows: Cta[] }) => {
  const [range, setRange] = useState<keyof typeof RANGES>("7d");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const since = new Date(Date.now() - RANGES[range] * 86400000).toISOString();
    supabase
      .from("cta_events")
      .select("cta_key, outcome, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50000)
      .then(({ data }) => {
        if (cancelled) return;
        setEvents((data as any) || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [range]);

  const meta = useMemo(() => {
    const m = new Map<string, Cta>();
    rows.forEach((r) => m.set(r.cta_key, r));
    return m;
  }, [rows]);

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; prompted: number; executed: number }>();
    events.forEach((e) => {
      const s = map.get(e.cta_key) || { total: 0, prompted: 0, executed: 0 };
      s.total += 1;
      if (e.outcome === "login_prompted") s.prompted += 1;
      else s.executed += 1;
      map.set(e.cta_key, s);
    });
    const arr = Array.from(map.entries()).map(([cta_key, s]) => ({
      cta_key,
      label: meta.get(cta_key)?.label || cta_key,
      category: meta.get(cta_key)?.category || "Unknown",
      requires_login: !!meta.get(cta_key)?.requires_login,
      ...s,
    }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [events, meta]);

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => ({ total: acc.total + s.total, prompted: acc.prompted + s.prompted, executed: acc.executed + s.executed }),
      { total: 0, prompted: 0, executed: 0 }
    );
  }, [stats]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return stats;
    return stats.filter((s) => s.label.toLowerCase().includes(t) || s.cta_key.toLowerCase().includes(t) || s.category.toLowerCase().includes(t));
  }, [stats, q]);

  const max = Math.max(1, ...filtered.map((s) => s.total));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={range} onValueChange={(v: any) => setRange(v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter CTAs…" className="pl-8" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={MousePointerClick} label="Total clicks" value={totals.total} tone="primary" />
        <StatCard icon={Zap} label="Ran immediately" value={totals.executed} tone="success" />
        <StatCard icon={LogIn} label="Login prompted" value={totals.prompted} tone="warn" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">By CTA</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${filtered.length} CTAs with activity in the last ${range}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No clicks recorded yet for this period.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const pct = Math.round((s.total / max) * 100);
                const promptedPct = s.total ? Math.round((s.prompted / s.total) * 100) : 0;
                return (
                  <div key={s.cta_key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{s.label}</span>
                          {s.requires_login ? (
                            <Badge variant="default" className="text-[10px] gap-1"><Lock className="w-3 h-3" />Gated</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1"><Unlock className="w-3 h-3" />Public</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{s.category}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold tabular-nums">{s.total.toLocaleString()}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.executed} ran · {s.prompted} login ({promptedPct}%)
                        </div>
                      </div>
                    </div>
                    <div className="h-2 rounded bg-muted overflow-hidden flex">
                      <div className="bg-emerald-500" style={{ width: `${(s.executed / max) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${(s.prompted / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "success" | "warn" }) => {
  const toneClass =
    tone === "success" ? "text-emerald-600 bg-emerald-500/10" :
    tone === "warn" ? "text-amber-600 bg-amber-500/10" :
    "text-primary bg-primary/10";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCTAManager;
