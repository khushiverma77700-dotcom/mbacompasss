import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, Minus, ArrowUpDown, CalendarDays, ExternalLink,
  Search, Sparkles, ShieldCheck, Clock, Trophy, Users, FileText, BellRing,
} from "lucide-react";
import { toast } from "sonner";

type ResultRow = {
  id: string; college_name: string; college_short: string | null;
  college_type: string; status: string; result_date: string | null;
  result_date_label: string | null; result_url: string | null; notes: string | null;
  sort_order: number;
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

function trendIcon(t: string | null) {
  if (t === "up") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (t === "down") return <TrendingDown className="h-4 w-4 text-rose-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    declared: "bg-emerald-100 text-emerald-800 border-emerald-200",
    expected: "bg-amber-100 text-amber-800 border-amber-200",
    delayed: "bg-rose-100 text-rose-800 border-rose-200",
    out: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return map[status?.toLowerCase()] || "bg-secondary text-secondary-foreground border-border";
}

export default function IIMWaitlistPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [movement, setMovement] = useState<MovementRow[]>([]);
  const [rti, setRti] = useState<RTIRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [category, setCategory] = useState<string>("General");
  const [sortKey, setSortKey] = useState<keyof MovementRow>("five_yr_avg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [lead, setLead] = useState({ name: "", email: "", phone: "", current_status: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [r, m, t, a] = await Promise.all([
        supabase.from("iim_waitlist_results").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("iim_waitlist_movement").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("iim_waitlist_rti").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("iim_waitlist_applications").select("*").eq("is_active", true).order("sort_order"),
      ]);
      setResults((r.data as any) || []);
      setMovement((m.data as any) || []);
      setRti((t.data as any) || []);
      setApps((a.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filteredMovement = useMemo(() => {
    let rows = movement.filter(r => r.category === category);
    if (typeFilter !== "all") rows = rows.filter(r => r.college_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.college_name.toLowerCase().includes(q) ||
        (r.college_short || "").toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const av = (a[sortKey] as any) ?? 0; const bv = (b[sortKey] as any) ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [movement, category, typeFilter, search, sortKey, sortDir]);

  const filteredResults = useMemo(() => {
    let rows = results;
    if (typeFilter !== "all") rows = rows.filter(r => r.college_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.college_name.toLowerCase().includes(q));
    }
    return rows;
  }, [results, typeFilter, search]);

  const stats = useMemo(() => {
    const totalColleges = new Set(movement.map(m => m.college_name)).size;
    const declared = results.filter(r => r.status?.toLowerCase() === "declared").length;
    const totalApps = apps.reduce((s, a) => s + (a.applications_received || 0), 0);
    const totalSeats = apps.reduce((s, a) => s + (a.batch_size || 0), 0);
    return { totalColleges, declared, totalApps, totalSeats };
  }, [movement, results, apps]);

  const toggleSort = (k: keyof MovementRow) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>IIM Waitlist Movement 2026 | Live Tracker, RTI Insights & Results</title>
        <meta name="description" content="Track 2026 IIM & top B-school results, waitlist movement trends (2021–2026), RTI insights, and category-wise conversion data — live and curated." />
        <link rel="canonical" href="https://mbacompass.in/iim-waitlist-movement" />
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--hero-gradient)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,white_0%,transparent_60%)] opacity-10" />
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-primary-foreground">
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

      {/* FILTERS */}
      <section className="container mx-auto px-4 -mt-6 relative z-10">
        <Card className="shadow-lg border-border/60">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search IIM A, IIM B, FMS, MDI…" value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutes</SelectItem>
                <SelectItem value="IIM">IIMs</SelectItem>
                <SelectItem value="IIT">IITs</SelectItem>
                <SelectItem value="Non-IIM">Non-IIM</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["General", "OBC", "SC", "ST", "EWS", "PwD"].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </section>

      <section className="container mx-auto px-4 py-10">
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="movement">Waitlist Trends</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="rti">RTI Insights</TabsTrigger>
          </TabsList>

          {/* RESULTS */}
          <TabsContent value="results" className="mt-6">
            <motion.div initial="hidden" animate="show" variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" /> 2026 Result Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institute</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expected / Declared</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Official Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : filteredResults.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No results matching filters.</TableCell></TableRow>
                        ) : filteredResults.map(r => (
                          <TableRow key={r.id} className="hover:bg-accent/30 transition-colors">
                            <TableCell className="font-medium">
                              {r.college_short || r.college_name}
                              <div className="text-xs text-muted-foreground">{r.college_name}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`capitalize ${statusPill(r.status)}`}>{r.status}</Badge>
                            </TableCell>
                            <TableCell>{r.result_date_label || (r.result_date ? new Date(r.result_date).toLocaleDateString() : "TBA")}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs">{r.notes || "—"}</TableCell>
                            <TableCell className="text-right">
                              {r.result_url ? (
                                <a href={r.result_url} target="_blank" rel="noopener noreferrer"
                                   className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                                  Visit <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* MOVEMENT */}
          <TabsContent value="movement" className="mt-6">
            <motion.div initial="hidden" animate="show" variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Waitlist Movement — {category} Category (5-Year Trend)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institute</TableHead>
                          {(["wl_2021","wl_2022","wl_2023","wl_2024","wl_2025","wl_2026_est","five_yr_avg"] as const).map(k => (
                            <TableHead key={k} className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
                              <span className="inline-flex items-center gap-1">
                                {k === "wl_2026_est" ? "2026 Est." : k === "five_yr_avg" ? "5-yr Avg" : k.replace("wl_", "")}
                                <ArrowUpDown className="h-3 w-3 opacity-60" />
                              </span>
                            </TableHead>
                          ))}
                          <TableHead>Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : filteredMovement.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No data for this filter combination.</TableCell></TableRow>
                        ) : filteredMovement.map((r, idx) => (
                          <TableRow key={r.id} className={`${idx % 2 ? "bg-muted/30" : ""} hover:bg-accent/40 transition-colors`}>
                            <TableCell className="font-medium">
                              {r.college_short || r.college_name}
                              <div className="text-xs text-muted-foreground">{r.college_type}</div>
                            </TableCell>
                            {[r.wl_2021, r.wl_2022, r.wl_2023, r.wl_2024, r.wl_2025, r.wl_2026_est].map((v, i) => (
                              <TableCell key={i} className="tabular-nums">{v ?? "—"}</TableCell>
                            ))}
                            <TableCell className="font-semibold tabular-nums">{r.five_yr_avg ?? "—"}</TableCell>
                            <TableCell>{trendIcon(r.trend)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* APPLICATIONS */}
          <TabsContent value="applications" className="mt-6">
            <motion.div initial="hidden" animate="show" variants={fadeUp}>
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
                        {loading ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : apps.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No data yet.</TableCell></TableRow>
                        ) : apps.map((a, i) => (
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
            </motion.div>
          </TabsContent>

          {/* RTI */}
          <TabsContent value="rti" className="mt-6">
            <motion.div initial="hidden" animate="show" variants={fadeUp}
              className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? <div className="text-muted-foreground">Loading…</div> :
                rti.length === 0 ? <div className="text-muted-foreground">No RTI insights published yet.</div> :
                rti.map(r => (
                <Card key={r.id} className="hover:shadow-lg transition-all hover:-translate-y-0.5">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-base">{r.college_short || r.college_name}</span>
                      <Badge variant="outline" className="bg-secondary"><ShieldCheck className="h-3 w-3 mr-1" /> RTI {r.rti_year}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {(Array.isArray(r.insights) ? r.insights : []).map((ins: any, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-foreground/90">{typeof ins === "string" ? ins : ins.text || JSON.stringify(ins)}</span>
                        </li>
                      ))}
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
            </motion.div>
          </TabsContent>
        </Tabs>
      </section>

      {/* LEAD CAPTURE */}
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
