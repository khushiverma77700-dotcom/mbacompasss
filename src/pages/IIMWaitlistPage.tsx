import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, Minus, CalendarDays, ExternalLink,
  Search, Sparkles, ShieldCheck, Clock, Trophy, Users, FileText, BellRing,
  Radio, ArrowRight, GraduationCap, IndianRupee, Award, Building2, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

type ResultRow = {
  id: string; college_name: string; college_short: string | null;
  college_type: string; status: string; result_date: string | null;
  result_date_label: string | null; result_url: string | null; notes: string | null;
  sort_order: number; updated_at?: string;
};
type MovementRow = {
  id: string; college_name: string; college_short: string | null;
  college_type: string; category: string;
  wl_2021: number | null; wl_2022: number | null; wl_2023: number | null;
  wl_2024: number | null; wl_2025: number | null; wl_2026_est: number | null;
  five_yr_avg: number | null; trend: string | null; sort_order: number;
};
type RTIRow = {
  id: string; college_name: string; college_short: string | null;
  rti_year: number; insights: any[]; source_url: string | null; sort_order: number;
};
type AppRow = {
  id: string; college_name: string; college_short: string | null;
  college_type: string; year: number; batch_size: number | null;
  applications_received: number | null; shortlisted: number | null;
  called_for_pi: number | null; offers_made: number | null;
  waitlisted: number | null; admitted: number | null; sort_order: number;
};
type OpenCollege = {
  id: string; name: string; slug: string; city: string | null; state: string | null;
  fees: string | null; fees_lakhs: number | null;
  placement_avg: string | null; placement_highest: string | null;
  logo_url: string | null; website: string | null; tier: string | null;
};

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let r = 0; const step = Math.max(1, Math.ceil(value / 40));
    const id = setInterval(() => {
      r += step; if (r >= value) { setN(value); clearInterval(id); } else setN(r);
    }, 25);
    return () => clearInterval(id);
  }, [value]);
  return <span>{n.toLocaleString()}{suffix}</span>;
}

function trendDisplay(t: string | null) {
  const v = (t || "").toLowerCase();
  if (v === "up" || v === "rising") return { icon: <ArrowUp className="h-4 w-4" />, label: "Rising", cls: "text-emerald-600" };
  if (v === "down" || v === "falling") return { icon: <ArrowDown className="h-4 w-4" />, label: "Falling", cls: "text-rose-600" };
  return { icon: <Minus className="h-4 w-4" />, label: "Stable", cls: "text-slate-500" };
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    declared: "bg-emerald-500 text-white border-transparent",
    out: "bg-emerald-500 text-white border-transparent",
    coming_soon: "bg-blue-600 text-white border-transparent",
    expected: "bg-amber-500 text-white border-transparent",
    delayed: "bg-rose-500 text-white border-transparent",
  };
  return map[status?.toLowerCase()] || "bg-slate-500 text-white border-transparent";
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    declared: "RESULT OUT",
    out: "RESULT OUT",
    coming_soon: "COMING SOON",
    expected: "EXPECTED",
    delayed: "DELAYED",
  };
  return m[s?.toLowerCase()] || s.toUpperCase();
}

/** Mini bar chart for the category movement cards */
function MiniBars({ values, labels, est }: { values: (number | null)[]; labels: string[]; est?: number | null }) {
  const all = [...values, est].map(v => v ?? 0);
  const max = Math.max(1, ...all);
  return (
    <div className="flex items-end justify-between gap-1.5 h-24 px-1">
      {values.map((v, i) => {
        const h = Math.max(8, ((v ?? 0) / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[10px] font-semibold tabular-nums text-slate-700">{v ?? 0}</div>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all hover:from-blue-700 hover:to-blue-500"
              style={{ height: `${h}%` }}
            />
            <div className="text-[10px] text-slate-500">{labels[i]}</div>
          </div>
        );
      })}
      {est !== undefined && (
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[10px] font-semibold tabular-nums text-blue-700">{est ?? 0}</div>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-sky-400 to-sky-200 ring-1 ring-sky-300"
            style={{ height: `${Math.max(8, ((est ?? 0) / max) * 100)}%` }}
          />
          <div className="text-[10px] font-semibold text-blue-700">2026E</div>
        </div>
      )}
    </div>
  );
}

export default function IIMWaitlistPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [movement, setMovement] = useState<MovementRow[]>([]);
  const [rti, setRti] = useState<RTIRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [openColleges, setOpenColleges] = useState<OpenCollege[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [category, setCategory] = useState<string>("General");
  const [tickIdx, setTickIdx] = useState(0);

  const [lead, setLead] = useState({ name: "", email: "", phone: "", current_status: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [r, m, t, a, c] = await Promise.all([
        supabase.from("iim_waitlist_results").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("iim_waitlist_movement").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("iim_waitlist_rti").select("*").eq("is_active", true).order("rti_year", { ascending: false }).order("sort_order"),
        supabase.from("iim_waitlist_applications").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("colleges")
          .select("id,name,slug,city,state,fees,fees_lakhs,placement_avg,placement_highest,logo_url,website,tier")
          .order("ranking", { ascending: true, nullsFirst: false })
          .limit(12),
      ]);
      setResults((r.data as any) || []);
      setMovement((m.data as any) || []);
      setRti((t.data as any) || []);
      setApps((a.data as any) || []);
      setOpenColleges((c.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const liveUpdates = useMemo(() => {
    return [...results]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0, 8);
  }, [results]);

  useEffect(() => {
    if (liveUpdates.length === 0) return;
    const id = setInterval(() => setTickIdx(i => (i + 1) % liveUpdates.length), 3500);
    return () => clearInterval(id);
  }, [liveUpdates.length]);

  const declaredResults = useMemo(
    () => results.filter(r => ["declared", "out"].includes(r.status?.toLowerCase())),
    [results]
  );
  const expectedReleases = useMemo(
    () => results.filter(r => !["declared", "out"].includes(r.status?.toLowerCase())),
    [results]
  );

  const filteredMovementCards = useMemo(() => {
    const map = new Map<string, MovementRow[]>();
    movement.forEach(r => {
      if (typeFilter !== "all" && r.college_type !== typeFilter) return;
      if (search) {
        const q = search.toLowerCase();
        if (!r.college_name.toLowerCase().includes(q) && !(r.college_short || "").toLowerCase().includes(q)) return;
      }
      const key = r.college_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).map(([name, rows]) => ({ name, rows }));
  }, [movement, typeFilter, search]);

  const stats = useMemo(() => {
    const totalColleges = new Set(movement.map(m => m.college_name)).size;
    const declared = declaredResults.length;
    const totalApps = apps.reduce((s, a) => s + (a.applications_received || 0), 0);
    const totalSeats = apps.reduce((s, a) => s + (a.batch_size || 0), 0);
    return { totalColleges, declared, totalApps, totalSeats };
  }, [movement, declaredResults, apps]);

  const rtiByYear = useMemo(() => {
    const map = new Map<number, RTIRow[]>();
    rti.forEach(r => {
      if (!map.has(r.rti_year)) map.set(r.rti_year, []);
      map.get(r.rti_year)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [rti]);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.email || !lead.phone) {
      toast.error("Please fill in name, email and phone");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("iim_waitlist_leads").insert({
      ...lead, year: 2026, source: "iim_waitlist_page",
    });
    setSubmitting(false);
    if (error) { toast.error("Could not submit. Try again."); return; }
    toast.success("Thanks! Our team will reach out shortly.");
    setLead({ name: "", email: "", phone: "", current_status: "", message: "" });
  };

  useEffect(() => {
    document.title = "IIM Waitlist Movement 2026 | Live Tracker, RTI Insights & Results";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "Live IIM, IIT & Non-IIM 2026 result tracker, expected release calendar, category-wise waitlist movement (2021–2026), RTI insights and apply-now B-school list.");
  }, []);

  const currentLive = liveUpdates[tickIdx];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--hero-gradient)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,white_0%,transparent_60%)] opacity-10" />
        <div className="relative container mx-auto px-4 py-14 md:py-20 text-primary-foreground">
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }}>
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur mb-4">
              <Sparkles className="h-3 w-3 mr-1" /> Live 2026 Admission Season
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-3xl">
              IIM Waitlist Movement 2026 — Live Tracker, RTI Insights & Result Dates
            </h1>
            <p className="text-base md:text-lg max-w-2xl text-white/90 mb-8">
              Real waitlist movement data from RTI replies, official notifications, and historical conversions for IIMs, IITs and top non-IIM B-schools — all in one transparent dashboard.
            </p>
            {currentLive && (
              <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-4 max-w-3xl mb-8">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold tracking-wider">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                  <Radio className="h-3.5 w-3.5" /> LIVE UPDATES
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentLive.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 flex-wrap"
                  >
                    <Badge className={statusPill(currentLive.status)}>{statusLabel(currentLive.status)}</Badge>
                    <span className="font-semibold text-sm md:text-base">{currentLive.notes || `${currentLive.college_short || currentLive.college_name} ${currentLive.status}`}</span>
                    <span className="text-xs text-white/70 inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {currentLive.result_date_label || (currentLive.result_date ? new Date(currentLive.result_date).toLocaleDateString() : "TBA")}
                    </span>
                    <span className="text-xs text-white/70 inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {currentLive.college_short || currentLive.college_name}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              {[
                { icon: Trophy, label: "B-Schools Tracked", value: stats.totalColleges },
                { icon: BellRing, label: "Results Declared", value: stats.declared },
                { icon: FileText, label: "Applications (Sum)", value: stats.totalApps },
                { icon: Users, label: "Seats Available", value: stats.totalSeats },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="rounded-xl bg-white/10 border border-white/20 backdrop-blur p-4">
                  <s.icon className="h-5 w-5 mb-2 opacity-90" />
                  <div className="text-2xl md:text-3xl font-bold"><CountUp value={s.value} /></div>
                  <div className="text-xs md:text-sm text-white/80">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-3">Current Status</Badge>
          <h2 className="text-2xl md:text-3xl font-bold">Current Results Status &amp; Waitlist Data</h2>
          <p className="text-muted-foreground mt-2">Latest declared results from official IIM, IIT and Non-IIM portals</p>
        </div>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading…</div>
        ) : declaredResults.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No results declared yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {declaredResults.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group h-full hover:shadow-xl hover:-translate-y-1 transition-all border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={statusPill(r.status)}>{statusLabel(r.status)}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                    <h3 className="font-bold text-lg leading-tight mb-2">
                      {r.notes || `${r.college_short || r.college_name} 2026 Result`}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {r.result_date_label || "Recently"}</span>
                      <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {r.college_short || r.college_name}</span>
                    </div>
                    {r.result_url && (
                      <a href={r.result_url} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline font-medium">
                        Official Link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      <section className="bg-gradient-to-br from-amber-50/50 to-blue-50/40 py-12 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="bg-amber-500 text-white border-transparent mb-3">
              <Clock className="h-3 w-3 mr-1" /> Coming Soon
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Expected Releases</h2>
            <p className="text-muted-foreground mt-2">Upcoming result announcements — bookmark this page for live updates</p>
          </div>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading…</div>
          ) : expectedReleases.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">All results are out 🎉</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {expectedReleases.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white">
                    <CardContent className="p-5">
                      <Badge className={statusPill(r.status) + " mb-3"}>{statusLabel(r.status)}</Badge>
                      <div className="font-bold text-base mb-1">{r.college_short || r.college_name}</div>
                      <div className="text-xs text-muted-foreground mb-3">{r.college_name}</div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Expected</span>
                        <span className="text-sm font-semibold text-amber-700 inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {r.result_date_label || (r.result_date ? new Date(r.result_date).toLocaleDateString() : "TBA")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="container mx-auto px-4 py-14">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-3">RTI Verified</Badge>
          <h2 className="text-2xl md:text-3xl font-bold">Category-wise Waitlist Movement Data</h2>
          <p className="text-muted-foreground mt-2">5-year trend (2021–2025) + 2026 estimate — switch category to compare</p>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 max-w-5xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search college e.g. IIM Calcutta, FMS Delhi…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "all", l: "All" }, { v: "IIM", l: "IIM" },
              { v: "IIT", l: "IIT" }, { v: "Non-IIM", l: "Others" },
            ].map(t => (
              <Button
                key={t.v}
                size="sm"
                variant={typeFilter === t.v ? "default" : "outline"}
                onClick={() => setTypeFilter(t.v)}
                className="rounded-full px-5"
              >
                {t.l}
              </Button>
            ))}
          </div>
        </div>
        <Tabs value={category} onValueChange={setCategory} className="max-w-5xl mx-auto mb-8">
          <TabsList className="grid grid-cols-5 w-full max-w-xl mx-auto">
            {["General", "EWS", "OBC", "SC", "ST"].map(c => (
              <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading…</div>
        ) : filteredMovementCards.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No colleges match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMovementCards.map(({ name, rows }, idx) => {
              const row = rows.find(r => r.category === category) || rows[0];
              if (!row) return null;
              const t = trendDisplay(row.trend);
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                >
                  <Card className="overflow-hidden border-slate-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-base leading-tight">{row.college_short || name}</div>
                        <div className="text-[11px] text-white/60">{name}</div>
                      </div>
                      <Badge className="bg-white/15 text-white border-white/20 text-[10px]">{row.college_type}</Badge>
                    </div>
                    <div className="px-4 pt-3 flex justify-between text-[11px] text-slate-500 font-medium">
                      {["General","EWS","OBC","SC","ST"].map(c => (
                        <span key={c} className={c === category ? "text-blue-600 font-bold border-b-2 border-blue-600 pb-1" : ""}>{c}</span>
                      ))}
                    </div>
                    <div className="px-4 pt-4 pb-2">
                      <MiniBars
                        values={[row.wl_2021, row.wl_2022, row.wl_2023, row.wl_2024, row.wl_2025]}
                        labels={["2021","2022","2023","2024","2025"]}
                        est={row.wl_2026_est}
                      />
                    </div>
                    <div className="bg-slate-50 px-4 py-3 grid grid-cols-4 gap-2 text-center border-t">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">5yr Avg</div>
                        <div className="font-bold text-slate-900 tabular-nums">{row.five_yr_avg ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">2025</div>
                        <div className="font-bold text-slate-900 tabular-nums">{row.wl_2025 ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">2026 Est</div>
                        <div className="font-bold text-blue-700 tabular-nums">{row.wl_2026_est ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Trend</div>
                        <div className={`font-bold inline-flex items-center justify-center gap-0.5 ${t.cls}`}>
                          {t.icon}<span className="text-xs">{t.label}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
      <section className="bg-slate-50 py-14 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3">
              <ShieldCheck className="h-3 w-3 mr-1" /> Government Verified
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">RTI Data — Past Years</h2>
            <p className="text-muted-foreground mt-2">Direct from official RTI replies — verified, transparent, and chronologically organised</p>
          </div>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading…</div>
          ) : rtiByYear.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No RTI insights yet.</div>
          ) : (
            <div className="space-y-10 max-w-6xl mx-auto">
              {rtiByYear.map(([year, rows]) => (
                <div key={year}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 font-bold text-sm">RTI {year}</div>
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">{rows.length} colleges</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rows.map(r => (
                      <Card key={r.id} className="hover:shadow-lg transition-all hover:-translate-y-0.5 bg-white">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between">
                            <span className="text-base">{r.college_short || r.college_name}</span>
                            <Badge variant="outline" className="bg-secondary"><ShieldCheck className="h-3 w-3 mr-1" /> {r.rti_year}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            {(Array.isArray(r.insights) ? r.insights : []).map((ins: any, i: number) => {
                              const text = typeof ins === "string" ? ins : ins.text || JSON.stringify(ins);
                              return (
                                <li key={i} className="flex gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span className="text-foreground/90" dangerouslySetInnerHTML={{ __html: text }} />
                                </li>
                              );
                            })}
                          </ul>
                          {r.source_url && (
                            <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline">
                              Source <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="container mx-auto px-4 py-14">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <Badge className="bg-rose-500 text-white border-transparent mb-3">Backup Plan</Badge>
          <h2 className="text-2xl md:text-3xl font-bold">Did Not Shortlist for Any Top B-School?</h2>
          <p className="text-muted-foreground mt-2">
            Don't worry — these reputed B-schools have their applications <strong className="text-foreground">open right now</strong>. Compare placements and fees, then apply directly.
          </p>
        </div>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading…</div>
        ) : openColleges.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No colleges available.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {openColleges.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
              >
                <Card className="h-full overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all group border-slate-200">
                  <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-5 border-b">
                    <div className="flex items-start gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={`${c.name} logo`} loading="lazy"
                             className="w-14 h-14 object-contain rounded-lg bg-white p-1 ring-1 ring-slate-200" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center">
                          <GraduationCap className="h-7 w-7 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base leading-tight line-clamp-2">{c.name}</h3>
                        <div className="text-xs text-muted-foreground mt-1">
                          {[c.city, c.state].filter(Boolean).join(", ") || "India"}
                        </div>
                        {c.tier && (
                          <Badge variant="outline" className="mt-2 text-[10px]">{c.tier}</Badge>
                        )}
                      </div>
                      <Badge className="bg-emerald-500 text-white border-transparent text-[10px] shrink-0">
                        <span className="relative flex h-1.5 w-1.5 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        OPEN
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <Award className="h-3.5 w-3.5 mx-auto text-amber-600 mb-1" />
                        <div className="text-[10px] text-muted-foreground">Avg Placement</div>
                        <div className="text-xs font-bold truncate">{c.placement_avg || "—"}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <TrendingUp className="h-3.5 w-3.5 mx-auto text-emerald-600 mb-1" />
                        <div className="text-[10px] text-muted-foreground">Highest</div>
                        <div className="text-xs font-bold truncate">{c.placement_highest || "—"}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <IndianRupee className="h-3.5 w-3.5 mx-auto text-blue-600 mb-1" />
                        <div className="text-[10px] text-muted-foreground">Fees</div>
                        <div className="text-xs font-bold truncate">
                          {c.fees_lakhs ? `₹${c.fees_lakhs}L` : (c.fees || "—")}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/college/${c.slug}`}>View Details</Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1 group/btn">
                        <a href={c.website || `/college/${c.slug}`} target={c.website ? "_blank" : undefined} rel="noopener noreferrer">
                          Apply Now <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Button asChild variant="outline" size="lg">
            <Link to="/colleges">Browse All B-Schools <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </section>
      {apps.length > 0 && (
        <section className="container mx-auto px-4 pb-14">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Application Funnel — 2026
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institute</TableHead>
                      <TableHead>Batch Size</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Shortlisted</TableHead>
                      <TableHead>Called for PI</TableHead>
                      <TableHead>Offers</TableHead>
                      <TableHead>Waitlisted</TableHead>
                      <TableHead>Admitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apps.map((a, i) => (
                      <TableRow key={a.id} className={`${i % 2 ? "bg-muted/30" : ""}`}>
                        <TableCell className="font-medium">{a.college_short || a.college_name}</TableCell>
                        <TableCell className="tabular-nums">{a.batch_size ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{a.applications_received ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{a.shortlisted ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{a.called_for_pi ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{a.offers_made ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{a.waitlisted ?? "—"}</TableCell>
                        <TableCell className="tabular-nums font-semibold">{a.admitted ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      <section className="container mx-auto px-4 pb-16">
        <Card className="overflow-hidden border-primary/20">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-2 p-8 text-primary-foreground relative" style={{ background: "var(--stat-gradient)" }}>
              <Clock className="h-8 w-8 mb-4 opacity-90" />
              <h3 className="text-2xl font-bold mb-2">Get a Free Waitlist Conversion Plan</h3>
              <p className="text-white/90 text-sm mb-4">
                Our mentors will analyse your CAT score, category and target IIMs, then map your realistic conversion probability based on 5 years of waitlist data.
              </p>
              <ul className="text-sm space-y-2 text-white/90">
                <li>✓ Personalised waitlist forecast</li>
                <li>✓ GD-PI prep roadmap</li>
                <li>✓ Backup plan with non-IIM B-schools</li>
              </ul>
            </div>
            <form onSubmit={submitLead} className="md:col-span-3 p-8 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input placeholder="Full Name *" value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} required />
                <Input type="email" placeholder="Email *" value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} required />
                <Input placeholder="Phone (10-digit) *" value={lead.phone} onChange={e => setLead({ ...lead, phone: e.target.value })} required />
                <Input placeholder="Your current status (CAT %ile / IIM call etc.)" value={lead.current_status} onChange={e => setLead({ ...lead, current_status: e.target.value })} />
              </div>
              <Textarea placeholder="Which IIMs are you targeting? Any specific question?" value={lead.message} onChange={e => setLead({ ...lead, message: e.target.value })} rows={3} />
              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting ? "Submitting…" : "Get My Free Plan"}
              </Button>
            </form>
          </div>
        </Card>
      </section>
    </div>
  );
}
