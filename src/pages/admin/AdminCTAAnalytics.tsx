import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, BarChart3, MousePointerClick, LogIn, Zap, Lock, Unlock } from "lucide-react";

type Cta = {
  cta_key: string;
  label: string;
  category: string;
  requires_login: boolean;
};

type EventRow = { cta_key: string; outcome: "login_prompted" | "executed"; created_at: string };

const RANGES: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

const AdminCTAAnalytics = () => {
  const [range, setRange] = useState<keyof typeof RANGES>("7d");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [ctas, setCtas] = useState<Cta[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("cta_settings")
      .select("cta_key, label, category, requires_login")
      .then(({ data }) => setCtas((data as any) || []));
  }, []);

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
    ctas.forEach((r) => m.set(r.cta_key, r));
    return m;
  }, [ctas]);

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

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, s) => ({ total: acc.total + s.total, prompted: acc.prompted + s.prompted, executed: acc.executed + s.executed }),
        { total: 0, prompted: 0, executed: 0 }
      ),
    [stats]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return stats;
    return stats.filter(
      (s) =>
        s.label.toLowerCase().includes(t) ||
        s.cta_key.toLowerCase().includes(t) ||
        s.category.toLowerCase().includes(t)
    );
  }, [stats, q]);

  const max = Math.max(1, ...filtered.map((s) => s.total));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          CTA Click Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          See how each CTA performs and how often it triggers the login dialog vs runs immediately.
        </p>
      </div>

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

export default AdminCTAAnalytics;
