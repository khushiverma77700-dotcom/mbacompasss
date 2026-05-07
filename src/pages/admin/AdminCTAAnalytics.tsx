import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Search, BarChart3, MousePointerClick, LogIn, Zap,
  Lock, Unlock, Download, Globe, FileText, TrendingUp,
} from "lucide-react";

type Cta = {
  cta_key: string;
  label: string;
  category: string;
  requires_login: boolean;
};

type EventRow = {
  cta_key: string;
  outcome: "login_prompted" | "executed";
  created_at: string;
  page_path: string | null;
  user_id: string | null;
  context: Record<string, any> | null;
};

const RANGES: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "all": 3650 };

// Heuristic: turn a path like /colleges/iim-ahmedabad into a section name.
const sectionForPath = (path: string | null): string => {
  if (!path) return "Unknown";
  const p = path.split("?")[0].split("#")[0];
  if (p === "/" || p === "") return "Home";
  const seg = p.split("/").filter(Boolean)[0] || "Home";
  const map: Record<string, string> = {
    colleges: "Colleges",
    college: "Colleges",
    coaching: "Coaching",
    exams: "Exams",
    exam: "Exams",
    blog: "Blog",
    articles: "Articles",
    courses: "Courses",
    "mba-compass": "MBA Compass",
    mocks: "Mocks",
    student: "Student LMS",
    admin: "Admin",
    auth: "Auth",
  };
  return map[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Pretty entity label from path: e.g. /colleges/iim-ahmedabad -> "iim-ahmedabad"
const entityForPath = (path: string | null): string | null => {
  if (!path) return null;
  const parts = path.split("?")[0].split("#")[0].split("/").filter(Boolean);
  return parts[1] || null;
};

const AdminCTAAnalytics = () => {
  const [range, setRange] = useState<keyof typeof RANGES>("7d");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [ctas, setCtas] = useState<Cta[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "executed" | "login_prompted">("all");

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
      .select("cta_key, outcome, created_at, page_path, user_id, context")
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

  const allCategories = useMemo(() => {
    const s = new Set<string>();
    ctas.forEach((c) => s.add(c.category));
    return Array.from(s).sort();
  }, [ctas]);

  const allSections = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => s.add(sectionForPath(e.page_path)));
    return Array.from(s).sort();
  }, [events]);

  // Apply all filters once
  const filteredEvents = useMemo(() => {
    const t = q.trim().toLowerCase();
    return events.filter((e) => {
      const m = meta.get(e.cta_key);
      if (categoryFilter !== "all" && (m?.category || "Unknown") !== categoryFilter) return false;
      if (sectionFilter !== "all" && sectionForPath(e.page_path) !== sectionFilter) return false;
      if (outcomeFilter !== "all" && e.outcome !== outcomeFilter) return false;
      if (t) {
        const label = m?.label?.toLowerCase() || "";
        const path = e.page_path?.toLowerCase() || "";
        if (
          !e.cta_key.toLowerCase().includes(t) &&
          !label.includes(t) &&
          !path.includes(t) &&
          !(m?.category || "").toLowerCase().includes(t)
        ) return false;
      }
      return true;
    });
  }, [events, meta, q, categoryFilter, sectionFilter, outcomeFilter]);

  const totals = useMemo(() => {
    const t = { total: 0, prompted: 0, executed: 0, unique: new Set<string>() };
    filteredEvents.forEach((e) => {
      t.total++;
      if (e.outcome === "login_prompted") t.prompted++;
      else t.executed++;
      if (e.user_id) t.unique.add(e.user_id);
    });
    return { ...t, unique: t.unique.size };
  }, [filteredEvents]);

  // Aggregations
  const byCta = useMemo(() => groupCount(filteredEvents, (e) => e.cta_key, meta), [filteredEvents, meta]);
  const byCategory = useMemo(() => groupCount(filteredEvents, (e) => meta.get(e.cta_key)?.category || "Unknown"), [filteredEvents, meta]);
  const bySection = useMemo(() => groupCount(filteredEvents, (e) => sectionForPath(e.page_path)), [filteredEvents]);
  const byPage = useMemo(() => groupCount(filteredEvents, (e) => e.page_path || "(unknown)"), [filteredEvents]);
  const byEntity = useMemo(
    () =>
      groupCount(
        filteredEvents.filter((e) => sectionForPath(e.page_path) === "Colleges" || sectionForPath(e.page_path) === "Coaching" || sectionForPath(e.page_path) === "Exams"),
        (e) => `${sectionForPath(e.page_path)} → ${entityForPath(e.page_path) || "(list)"}`
      ),
    [filteredEvents]
  );

  // Daily trend
  const trend = useMemo(() => {
    const m = new Map<string, { date: string; total: number; executed: number; prompted: number }>();
    filteredEvents.forEach((e) => {
      const d = e.created_at.slice(0, 10);
      const row = m.get(d) || { date: d, total: 0, executed: 0, prompted: 0 };
      row.total++;
      if (e.outcome === "login_prompted") row.prompted++;
      else row.executed++;
      m.set(d, row);
    });
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents]);

  const exportCsv = () => {
    const header = ["created_at", "cta_key", "label", "category", "outcome", "page_path", "section", "user_id"];
    const rows = filteredEvents.map((e) => {
      const m = meta.get(e.cta_key);
      return [
        e.created_at,
        e.cta_key,
        m?.label || "",
        m?.category || "",
        e.outcome,
        e.page_path || "",
        sectionForPath(e.page_path),
        e.user_id || "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cta-analytics-${range}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setQ(""); setCategoryFilter("all"); setSectionFilter("all"); setOutcomeFilter("all");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            CTA Click Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drill into clicks by CTA, section, category, page and login outcome.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filteredEvents.length}>
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Select value={range} onValueChange={(v: any) => setRange(v)}>
              <SelectTrigger><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {allSections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={outcomeFilter} onValueChange={(v: any) => setOutcomeFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="executed">Ran immediately</SelectItem>
                <SelectItem value="login_prompted">Login prompted</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search CTA, label, page…" className="pl-8" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={MousePointerClick} label="Total clicks" value={totals.total} tone="primary" />
        <StatCard icon={Zap} label="Ran immediately" value={totals.executed} tone="success" />
        <StatCard icon={LogIn} label="Login prompted" value={totals.prompted} tone="warn" />
        <StatCard icon={TrendingUp} label="Unique users" value={totals.unique} tone="primary" />
      </div>

      {loading ? (
        <Card><CardContent className="p-8 flex items-center gap-2 text-muted-foreground justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="cta" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="cta">By CTA</TabsTrigger>
            <TabsTrigger value="section">By Section</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="entity">By College/Page</TabsTrigger>
            <TabsTrigger value="page">Top Pages</TabsTrigger>
            <TabsTrigger value="trend">Daily Trend</TabsTrigger>
            <TabsTrigger value="recent">Recent Clicks</TabsTrigger>
          </TabsList>

          <TabsContent value="cta">
            <BreakdownCard
              title="Per CTA breakdown"
              rows={byCta}
              renderLabel={(r) => {
                const m = meta.get(r.key);
                return (
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{m?.label || r.key}</span>
                      {m?.requires_login ? (
                        <Badge className="text-[10px] gap-1"><Lock className="w-3 h-3" />Gated</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1"><Unlock className="w-3 h-3" />Public</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{m?.category || "Unknown"} · {r.key}</div>
                  </div>
                );
              }}
            />
          </TabsContent>

          <TabsContent value="section">
            <BreakdownCard title="Clicks by site section" rows={bySection} icon={Globe} />
          </TabsContent>

          <TabsContent value="category">
            <BreakdownCard title="Clicks by CTA category" rows={byCategory} />
          </TabsContent>

          <TabsContent value="entity">
            <BreakdownCard title="Clicks by college / coaching / exam" rows={byEntity} icon={FileText}
              empty="No college / coaching / exam clicks in this range." />
          </TabsContent>

          <TabsContent value="page">
            <BreakdownCard title="Top pages by CTA clicks" rows={byPage.slice(0, 50)} icon={FileText} />
          </TabsContent>

          <TabsContent value="trend">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Daily trend</CardTitle>
                <CardDescription>{trend.length} days with activity.</CardDescription>
              </CardHeader>
              <CardContent>
                {trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No data.</p>
                ) : (
                  <div className="space-y-2">
                    {trend.map((d) => {
                      const max = Math.max(...trend.map((x) => x.total), 1);
                      return (
                        <div key={d.date} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{d.date}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {d.executed} ran · {d.prompted} login · <span className="font-semibold text-foreground">{d.total} total</span>
                            </span>
                          </div>
                          <div className="h-2 rounded bg-muted overflow-hidden flex">
                            <div className="bg-emerald-500" style={{ width: `${(d.executed / max) * 100}%` }} />
                            <div className="bg-amber-500" style={{ width: `${(d.prompted / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent clicks</CardTitle>
                <CardDescription>Latest 200 events matching filters.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b text-muted-foreground">
                      <th className="py-2 pr-2">Time</th>
                      <th className="py-2 pr-2">CTA</th>
                      <th className="py-2 pr-2">Outcome</th>
                      <th className="py-2 pr-2">Section</th>
                      <th className="py-2 pr-2">Page</th>
                      <th className="py-2 pr-2">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.slice(0, 200).map((e, i) => {
                      const m = meta.get(e.cta_key);
                      return (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                          <td className="py-1.5 pr-2">{m?.label || e.cta_key}</td>
                          <td className="py-1.5 pr-2">
                            {e.outcome === "executed" ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">Ran</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Login</Badge>
                            )}
                          </td>
                          <td className="py-1.5 pr-2">{sectionForPath(e.page_path)}</td>
                          <td className="py-1.5 pr-2 max-w-[260px] truncate font-mono">{e.page_path || "—"}</td>
                          <td className="py-1.5 pr-2 font-mono text-[10px]">{e.user_id?.slice(0, 8) || "anon"}</td>
                        </tr>
                      );
                    })}
                    {filteredEvents.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No matching events.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// ---------- helpers ----------

type GroupRow = { key: string; total: number; executed: number; prompted: number };

function groupCount(
  events: EventRow[],
  keyer: (e: EventRow) => string,
  _meta?: Map<string, Cta>
): GroupRow[] {
  const m = new Map<string, GroupRow>();
  events.forEach((e) => {
    const k = keyer(e);
    const r = m.get(k) || { key: k, total: 0, executed: 0, prompted: 0 };
    r.total++;
    if (e.outcome === "login_prompted") r.prompted++;
    else r.executed++;
    m.set(k, r);
  });
  return Array.from(m.values()).sort((a, b) => b.total - a.total);
}

const BreakdownCard = ({
  title, rows, renderLabel, icon: Icon, empty,
}: {
  title: string;
  rows: GroupRow[];
  renderLabel?: (r: GroupRow) => React.ReactNode;
  icon?: any;
  empty?: string;
}) => {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </CardTitle>
        <CardDescription>{rows.length} entries.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{empty || "No data for this period."}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const promptedPct = r.total ? Math.round((r.prompted / r.total) * 100) : 0;
              return (
                <div key={r.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    {renderLabel ? renderLabel(r) : (
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.key}</div>
                      </div>
                    )}
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">{r.total.toLocaleString()}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.executed} ran · {r.prompted} login ({promptedPct}%)
                      </div>
                    </div>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${(r.executed / max) * 100}%` }} />
                    <div className="bg-amber-500" style={{ width: `${(r.prompted / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCTAAnalytics;
