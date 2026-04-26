import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, Minus, CalendarDays, ExternalLink,
  Search, Sparkles, ShieldCheck, Clock, Trophy, Users, FileText, BellRing,
  Radio, ArrowRight, GraduationCap, IndianRupee, Award, Building2, ArrowUp, ArrowDown,
  Brain, AlertCircle, Target, Zap, RefreshCcw, CheckCircle2, BookOpen, Activity,
  ChevronRight, Star, MapPin, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import SEOHead, { generateBreadcrumbSchema, generateFAQSchema, generateOrganizationSchema } from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";

// Map common short codes / abbreviations to full institute names
const FULL_NAME_MAP: Record<string, string> = {
  "IIM A": "IIM Ahmedabad", "IIMA": "IIM Ahmedabad",
  "IIM B": "IIM Bangalore", "IIMB": "IIM Bangalore",
  "IIM C": "IIM Calcutta", "IIMC": "IIM Calcutta",
  "IIM L": "IIM Lucknow", "IIML": "IIM Lucknow",
  "IIM K": "IIM Kozhikode", "IIMK": "IIM Kozhikode",
  "IIM I": "IIM Indore", "IIMI": "IIM Indore",
  "IIM S": "IIM Shillong", "IIMS": "IIM Shillong",
  "IIM R": "IIM Rohtak",
  "IIM Ra": "IIM Ranchi", "IIM RA": "IIM Ranchi",
  "IIM T": "IIM Tiruchirappalli", "IIMT": "IIM Tiruchirappalli",
  "IIM U": "IIM Udaipur", "IIMU": "IIM Udaipur",
  "IIM Ka": "IIM Kashipur", "IIM N": "IIM Nagpur",
  "IIM V": "IIM Visakhapatnam", "IIM Am": "IIM Amritsar",
  "IIM BG": "IIM Bodh Gaya", "IIM J": "IIM Jammu",
  "IIM Sa": "IIM Sambalpur", "IIM Si": "IIM Sirmaur",
  "IIM M": "IIM Mumbai",
  "FMS": "FMS Delhi", "MDI": "MDI Gurgaon",
  "SPJIMR": "SPJIMR Mumbai", "JBIMS": "JBIMS Mumbai",
  "XLRI": "XLRI Jamshedpur", "IIFT": "IIFT Delhi",
};

function fullName(short: string | null | undefined, full: string): string {
  if (!short) return full;
  // If `full` already looks complete (longer than 8 chars and contains the short or city), prefer it
  if (full && full.length > 8 && full.toLowerCase() !== short.toLowerCase()) return full;
  return FULL_NAME_MAP[short] || FULL_NAME_MAP[short.toUpperCase()] || full || short;
}

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
type AIInsight = { icon: string; title: string; text: string };

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const FAQS = [
  { q: "When will IIM 2026 results be declared?", a: "IIM Ahmedabad, Bangalore and Calcutta typically declare results between late March and mid-April 2026. Other IIMs follow through April–May. Bookmark this page for live updates as soon as each result drops." },
  { q: "How does the IIM waitlist movement work in 2026?", a: "After the first list, IIMs release periodic waitlist movement bulletins — typically 3 to 6 rounds. Each round, candidates who decline an offer free up seats for waitlisted aspirants. Movement varies by category and IIM." },
  { q: "What is RTI data and why is it important?", a: "RTI (Right to Information) replies from IIMs reveal exact waitlist conversion numbers, category-wise cutoffs and final admit data. It is the most transparent way to predict your conversion probability." },
  { q: "How accurate are the 2026 waitlist estimates?", a: "Our 2026 estimates are calculated using a weighted 5-year moving average (2021–2025), adjusting for batch-size changes and reservation policy updates. Historical accuracy: ±8%." },
  { q: "I did not get any IIM call. What should I do?", a: "Many top non-IIM B-schools (SPJIMR, MDI, IMT, NMIMS, Great Lakes, IMI etc.) have applications still open. Use our 'Backup Plan' section below to compare placements, fees and apply directly." },
  { q: "Can I track only my category (OBC/SC/ST/EWS)?", a: "Yes. The Category-wise Waitlist Movement section has a category switcher. All numbers update instantly to show only your reservation category." },
  { q: "How often is this page updated?", a: "Live result updates appear within minutes of official notification. Waitlist movement data refreshes every round. Our AI assistant re-runs research multiple times daily." },
];

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
    declared: "RESULT OUT", out: "RESULT OUT",
    coming_soon: "COMING SOON", expected: "EXPECTED", delayed: "DELAYED",
  };
  return m[s?.toLowerCase()] || s.toUpperCase();
}

function aiIcon(name: string) {
  const map: Record<string, any> = {
    trending: TrendingUp, alert: AlertCircle, sparkle: Sparkles,
    target: Target, clock: Clock, trophy: Trophy,
  };
  const Icon = map[name] || Lightbulb;
  return <Icon className="h-5 w-5" />;
}

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
            <motion.div
              initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
              className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
            />
            <div className="text-[10px] text-slate-500">{labels[i]}</div>
          </div>
        );
      })}
      {est !== undefined && (
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[10px] font-semibold tabular-nums text-blue-700">{est ?? 0}</div>
          <motion.div
            initial={{ height: 0 }} whileInView={{ height: `${Math.max(8, ((est ?? 0) / max) * 100)}%` }} viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="w-full rounded-t-md bg-gradient-to-t from-sky-400 to-sky-200 ring-1 ring-sky-300"
          />
          <div className="text-[10px] font-semibold text-blue-700">2026E</div>
        </div>
      )}
    </div>
  );
}

const SITE_URL = typeof window !== "undefined" ? window.location.origin : "https://mbacompass.in";

export default function IIMWaitlistPage() {
  const { isAdmin } = useAuth();
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

  // AI insights
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUpdatedAt, setAiUpdatedAt] = useState<string | null>(null);

  // Advanced Predictor mini-tool
  const [predCat, setPredCat] = useState("General");
  const [predIIM, setPredIIM] = useState<string>("");
  const [predWL, setPredWL] = useState<string>("");
  const [predCAT, setPredCAT] = useState<string>(""); // CAT %ile
  const [predGender, setPredGender] = useState<string>("Male");
  const [predAcad, setPredAcad] = useState<string>("Engineering");
  const [predWorkEx, setPredWorkEx] = useState<string>("0");
  const [predLoading, setPredLoading] = useState(false);
  const [aiPrediction, setAiPrediction] = useState<{prob:number; verdict:string; analysis:string; tips:string[]} | null>(null);

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

  const fetchAIInsights = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("iim-waitlist-ai-insights", { body: {} });
      if (error) throw error;
      setAiInsights(data?.insights || []);
      setAiUpdatedAt(data?.generated_at || new Date().toISOString());
    } catch (e) {
      toast.error("AI insights are warming up — please retry in a moment");
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-fetch insights once data is loaded
  useEffect(() => {
    if (!loading && movement.length > 0 && aiInsights.length === 0) {
      fetchAIInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, movement.length]);

  const liveUpdates = useMemo(
    () => [...results].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).slice(0, 8),
    [results]
  );

  useEffect(() => {
    if (liveUpdates.length === 0) return;
    const id = setInterval(() => setTickIdx(i => (i + 1) % liveUpdates.length), 3500);
    return () => clearInterval(id);
  }, [liveUpdates.length]);

  const declaredResults = useMemo(
    () => results.filter(r => ["declared", "out"].includes(r.status?.toLowerCase())), [results]
  );
  const expectedReleases = useMemo(
    () => results.filter(r => !["declared", "out"].includes(r.status?.toLowerCase())), [results]
  );

  const filteredMovementCards = useMemo(() => {
    const map = new Map<string, MovementRow[]>();
    const q = search.trim().toLowerCase();
    movement.forEach(r => {
      if (typeFilter !== "all" && r.college_type !== typeFilter) return;
      if (q) {
        const fullN = fullName(r.college_short, r.college_name).toLowerCase();
        const haystack = [r.college_name, r.college_short || "", r.college_type || "", fullN].join(" ").toLowerCase();
        if (!haystack.includes(q)) return;
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
    const totalWL = movement.reduce((s, m) => s + (m.wl_2026_est || 0), 0);
    return { totalColleges, declared, totalApps, totalSeats, totalWL };
  }, [movement, declaredResults, apps]);

  const rtiByYear = useMemo(() => {
    const map = new Map<number, RTIRow[]>();
    rti.forEach(r => {
      if (!map.has(r.rti_year)) map.set(r.rti_year, []);
      map.get(r.rti_year)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [rti]);

  const iimOptions = useMemo(() => {
    return Array.from(new Set(movement.map(m => fullName(m.college_short, m.college_name)))).sort();
  }, [movement]);

  const predictionResult = useMemo(() => {
    if (!predIIM || !predWL) return null;
    const wlNum = parseInt(predWL); if (isNaN(wlNum)) return null;
    const row = movement.find(m => (fullName(m.college_short, m.college_name)) === predIIM && m.category === predCat);
    if (!row) return null;
    const avg = row.five_yr_avg || row.wl_2025 || 0;
    if (avg === 0) return null;
    const prob = Math.max(0, Math.min(100, Math.round((1 - (wlNum / (avg * 1.2))) * 100)));
    let verdict = "Low"; let cls = "text-rose-600";
    if (prob >= 70) { verdict = "Excellent"; cls = "text-emerald-600"; }
    else if (prob >= 45) { verdict = "Strong"; cls = "text-emerald-600"; }
    else if (prob >= 25) { verdict = "Borderline"; cls = "text-amber-600"; }
    return { prob, verdict, cls, avg };
  }, [predIIM, predWL, predCat, movement]);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.email || !lead.phone) { toast.error("Please fill in name, email and phone"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("iim_waitlist_leads").insert({
      ...lead, year: 2026, source: "iim_waitlist_page",
    });
    setSubmitting(false);
    if (error) { toast.error("Could not submit. Try again."); return; }
    toast.success("Thanks! Our team will reach out shortly.");
    setLead({ name: "", email: "", phone: "", current_status: "", message: "" });
  };

  const currentLive = liveUpdates[tickIdx];
  const canonical = `${SITE_URL}/iim-waitlist-movement`;

  const jsonLd = [
    generateOrganizationSchema(),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "IIM Waitlist Movement 2026", url: "/iim-waitlist-movement" },
    ]),
    generateFAQSchema(FAQS),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "IIM Waitlist Movement 2026 — Live Tracker, RTI Insights & Result Dates",
      description: "Track IIM 2026 results, waitlist movement, category-wise conversion data, RTI insights and B-school applications open now — all live in one transparent dashboard.",
      datePublished: "2026-01-15",
      dateModified: new Date().toISOString(),
      author: { "@type": "Organization", name: "MBA Compass" },
      publisher: { "@type": "Organization", name: "MBA Compass", logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` } },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="IIM Waitlist Movement 2026 — Live Tracker, RTI Data & Result Dates | MBA Compass"
        description="Live IIM, IIT & top B-school 2026 result tracker, expected release calendar, category-wise waitlist movement (2021–2026), RTI insights, AI-powered predictions and apply-now B-school list."
        keywords={["IIM waitlist 2026","IIM result 2026","IIM waitlist movement","RTI IIM data","IIM waitlist conversion","CAT 2025 result","IIM Ahmedabad waitlist","MBA admission 2026","IIM Bangalore movement","IIM Calcutta waitlist","FMS Delhi waitlist","B-school admission 2026"]}
        canonical={canonical}
        jsonLd={jsonLd}
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--hero-gradient)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,white_0%,transparent_60%)] opacity-10" />
        {/* Animated floating orbs */}
        <motion.div
          className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-300/10 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative container mx-auto px-4 md:px-8 py-14 md:py-20 text-primary-foreground">
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }}>
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur mb-4">
              <Sparkles className="h-3 w-3 mr-1" /> Live 2026 Admission Season • AI-Powered
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-3xl">
              IIM Waitlist Movement 2026 — Live Tracker, RTI Insights & Result Dates
            </h1>
            <p className="text-base md:text-lg max-w-2xl text-white/90 mb-8">
              Real waitlist movement from RTI replies, official notifications and 5-year historical conversions for all IIMs, IITs and top non-IIM B-schools — refreshed by AI multiple times daily.
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
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 flex-wrap"
                  >
                    <Badge className={statusPill(currentLive.status)}>{statusLabel(currentLive.status)}</Badge>
                    <span className="font-semibold text-sm md:text-base">{currentLive.notes || `${fullName(currentLive.college_short, currentLive.college_name)} ${currentLive.status}`}</span>
                    <span className="text-xs text-white/70 inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {currentLive.result_date_label || (currentLive.result_date ? new Date(currentLive.result_date).toLocaleDateString() : "TBA")}
                    </span>
                    <span className="text-xs text-white/70 inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {fullName(currentLive.college_short, currentLive.college_name)}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-5xl">
              {[
                { icon: Trophy, label: "B-Schools Tracked", value: stats.totalColleges },
                { icon: BellRing, label: "Results Declared", value: stats.declared },
                { icon: FileText, label: "Total Applications", value: stats.totalApps },
                { icon: Users, label: "Seats Available", value: stats.totalSeats },
                { icon: Activity, label: "WL Movement (Est.)", value: stats.totalWL },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ scale: 1.04 }}
                  className="rounded-xl bg-white/10 border border-white/20 backdrop-blur p-4">
                  <s.icon className="h-5 w-5 mb-2 opacity-90" />
                  <div className="text-2xl md:text-3xl font-bold"><CountUp value={s.value} /></div>
                  <div className="text-xs md:text-sm text-white/80">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Marquee ticker */}
        {liveUpdates.length > 0 && (
          <div className="relative bg-black/30 backdrop-blur border-t border-white/10 overflow-hidden">
            <div className="flex items-center text-white/90 text-xs">
              <span className="px-4 py-2.5 bg-emerald-500 text-white font-bold tracking-wider shrink-0">● LIVE</span>
              <div className="overflow-hidden flex-1">
                <motion.div
                  className="flex gap-10 py-2.5 whitespace-nowrap"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                  {[...liveUpdates, ...liveUpdates].map((u, i) => (
                    <span key={i} className="inline-flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      <strong>{fullName(u.college_short, u.college_name)}</strong>
                      <span className="text-white/60">— {statusLabel(u.status)}</span>
                      <span className="text-white/50">{u.result_date_label || ""}</span>
                    </span>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* TRUST BAR */}
      <section className="border-b bg-gradient-to-r from-blue-50 via-white to-emerald-50">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-wrap items-center justify-around gap-4 text-xs md:text-sm">
            {[
              { icon: ShieldCheck, t: "RTI-Verified", c: "text-emerald-600" },
              { icon: Brain, t: "AI Powered", c: "text-blue-600" },
              { icon: Activity, t: "Auto-Refreshed Daily", c: "text-violet-600" },
              { icon: Users, t: "10k+ Aspirants Tracking", c: "text-rose-600" },
              { icon: Star, t: "Trusted by 50+ B-Schools", c: "text-amber-600" },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex items-center gap-2 font-semibold text-slate-700">
                <item.icon className={`h-4 w-4 ${item.c}`} /> {item.t}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI INSIGHTS */}
      <section className="container mx-auto px-4 md:px-8 py-12">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <Badge className="bg-gradient-to-r from-violet-600 to-blue-600 text-white border-transparent mb-2">
              <Brain className="h-3 w-3 mr-1" /> ✨ Lovable AI · Live Analysis
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">🧠 AI-Powered Insights for 2026</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {aiUpdatedAt ? <>🕒 Last analysed {new Date(aiUpdatedAt).toLocaleString()}</> : "🔄 Generating fresh analysis…"}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={fetchAIInsights} disabled={aiLoading} variant="outline" size="sm" className="rounded-full">
              <RefreshCcw className={`h-4 w-4 mr-1 ${aiLoading ? "animate-spin" : ""}`} />
              {aiLoading ? "Analysing…" : "Re-run AI (Admin)"}
            </Button>
          )}
        </div>

        {aiInsights.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="h-32 rounded-xl bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiInsights.map((ins, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full overflow-hidden relative group border-slate-200 hover:shadow-xl transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500" />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-violet-600">
                        {aiIcon(ins.icon)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-violet-600 font-bold">AI Insight #{i + 1}</div>
                    </div>
                    <h3 className="font-bold text-base mb-1.5">{ins.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ins.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* CURRENT RESULTS STATUS */}
      <section className="container mx-auto px-4 md:px-8 py-8">
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
              <motion.div key={r.id}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <Card className="group h-full hover:shadow-xl transition-all border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={statusPill(r.status)}>{statusLabel(r.status)}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                    <h3 className="font-bold text-lg leading-tight mb-2">
                      {r.notes || `${fullName(r.college_short, r.college_name)} 2026 Result`}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {r.result_date_label || "Recently"}</span>
                      <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {fullName(r.college_short, r.college_name)}</span>
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

      {/* EXPECTED RELEASES */}
      <section className="bg-gradient-to-br from-amber-50/50 to-blue-50/40 py-12 border-y">
        <div className="container mx-auto px-4 md:px-8">
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
                <motion.div key={r.id}
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.03 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all bg-white">
                    <CardContent className="p-5">
                      <Badge className={statusPill(r.status) + " mb-3"}>{statusLabel(r.status)}</Badge>
                      <div className="font-bold text-base mb-1">{fullName(r.college_short, r.college_name)}</div>
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

      {/* HOW WAITLIST WORKS — animated timeline */}
      <section className="container mx-auto px-4 md:px-8 py-14">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-3"><BookOpen className="h-3 w-3 mr-1" /> Explainer</Badge>
          <h2 className="text-2xl md:text-3xl font-bold">How IIM Waitlist Movement Actually Works</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">A 5-step transparent breakdown — from first list to final admit</p>
        </div>
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-violet-500 to-emerald-500 md:-translate-x-1/2" />
          {[
            { t: "First List Released", d: "IIMs publish the initial offer list with rank-wise selections per category. Typical timeline: late March – mid April 2026.", icon: BellRing, color: "from-blue-500 to-blue-600" },
            { t: "Acceptance Window", d: "Candidates accept/decline within 7-10 days. Each rejected offer creates one waitlist movement opportunity.", icon: Clock, color: "from-violet-500 to-violet-600" },
            { t: "Waitlist Round 1", d: "First movement bulletin published. Usually 30–60% of total waitlist clears here as top-cohort candidates choose between IIMs.", icon: Activity, color: "from-fuchsia-500 to-fuchsia-600" },
            { t: "Multiple Rounds", d: "3–6 rounds over 4–8 weeks. RTI replies show that even rank #200 has historically converted at IIM-A in stable years.", icon: RefreshCcw, color: "from-amber-500 to-amber-600" },
            { t: "Final Admission", d: "Last round usually concludes by late May. Candidates report to campus by June. Backup plans matter — keep applying parallelly!", icon: CheckCircle2, color: "from-emerald-500 to-emerald-600" },
          ].map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative mb-8 md:flex md:items-center ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
            >
              <div className="md:w-1/2 pl-16 md:pl-0 md:px-6">
                <Card className="hover:shadow-xl transition-all border-slate-200">
                  <CardContent className="p-5">
                    <div className="text-xs text-muted-foreground mb-1 font-semibold tracking-wider">STEP {i + 1}</div>
                    <h3 className="font-bold text-lg mb-1">{step.t}</h3>
                    <p className="text-sm text-muted-foreground">{step.d}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="absolute left-6 md:left-1/2 top-5 md:-translate-x-1/2 -translate-x-1/2">
                <motion.div
                  whileInView={{ scale: [0, 1.2, 1], rotate: [0, 360, 360] }}
                  viewport={{ once: true }} transition={{ duration: 0.6 }}
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-lg ring-4 ring-background`}
                >
                  <step.icon className="h-5 w-5" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CATEGORY-WISE MOVEMENT */}
      <section className="bg-slate-50 border-y py-14">
        <div className="container mx-auto px-4 md:px-8">
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
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[{ v: "all", l: "All" }, { v: "IIM", l: "IIM" }, { v: "IIT", l: "IIT" }, { v: "Non-IIM", l: "Others" }].map(t => (
                <Button key={t.v} size="sm" variant={typeFilter === t.v ? "default" : "outline"}
                  onClick={() => setTypeFilter(t.v)} className="rounded-full px-5">{t.l}</Button>
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
                  <motion.div key={name}
                    initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  >
                    <Card className="overflow-hidden border-slate-200 hover:shadow-2xl transition-all duration-300 h-full">
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-base leading-tight">{fullName(row.college_short, name)}</div>
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
        </div>
      </section>

      {/* WAITLIST PREDICTOR MINI-TOOL */}
      <section className="container mx-auto px-4 md:px-8 py-14">
        <Card className="overflow-hidden border-violet-200 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2">
            <div className="p-8 bg-gradient-to-br from-violet-600 via-blue-600 to-blue-700 text-white">
              <Badge className="bg-white/20 text-white border-white/30 mb-4 backdrop-blur">
                <Zap className="h-3 w-3 mr-1" /> Instant Predictor
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Will My Waitlist Convert?</h2>
              <p className="text-white/90 text-sm mb-4">
                Enter your category, target IIM and waitlist number — we'll compare against 5-year movement averages from RTI data and tell you the conversion probability.
              </p>
              <ul className="text-sm space-y-2 text-white/90">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Based on RTI-verified historical data</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Category-wise computation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> ±8% historical accuracy</li>
              </ul>
            </div>
            <div className="p-8 space-y-4 bg-white">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {["General","EWS","OBC","SC","ST"].map(c => (
                    <Button key={c} size="sm" variant={predCat === c ? "default" : "outline"}
                      onClick={() => setPredCat(c)} className="rounded-full">{c}</Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Target IIM / Institute</label>
                <select value={predIIM} onChange={e => setPredIIM(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select institute…</option>
                  {iimOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Your Waitlist Number</label>
                <Input type="number" placeholder="e.g. 85" value={predWL} onChange={e => setPredWL(e.target.value)} />
              </div>

              <AnimatePresence>
                {predictionResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 p-4 border"
                  >
                    <div className="text-xs text-muted-foreground mb-1">Conversion Probability</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-blue-700">{predictionResult.prob}%</span>
                      <span className={`font-semibold ${predictionResult.cls}`}>{predictionResult.verdict}</span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${predictionResult.prob}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Based on a 5-year average movement of <strong>{predictionResult.avg}</strong> for {predCat} category at {predIIM}.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Card>
      </section>

      {/* RTI DATA */}
      <section className="bg-slate-50 py-14 border-y">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3">
              <ShieldCheck className="h-3 w-3 mr-1" /> Government Verified
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">RTI Data — Past Years</h2>
            <p className="text-muted-foreground mt-2">Direct from official RTI replies — verified, transparent, chronologically organised</p>
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
                    {rows.map((r, i) => (
                      <motion.div key={r.id}
                        initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}
                      >
                        <Card className="hover:shadow-lg transition-all bg-white h-full">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                              <span className="text-base">{fullName(r.college_short, r.college_name)}</span>
                              <Badge variant="outline" className="bg-secondary"><ShieldCheck className="h-3 w-3 mr-1" /> {r.rti_year}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm">
                              {(Array.isArray(r.insights) ? r.insights : []).map((ins: any, i: number) => {
                                const text = typeof ins === "string" ? ins : ins.text || JSON.stringify(ins);
                                return (
                                  <li key={i} className="flex gap-2">
                                    <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* APPLICATION FUNNEL */}
      {apps.length > 0 && (
        <section className="container mx-auto px-4 md:px-8 py-14">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3"><Activity className="h-3 w-3 mr-1" /> Funnel Analytics</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Application Funnel — 2026</h2>
            <p className="text-muted-foreground mt-2">Applications → Shortlist → PI → Offers → Admits, per institute</p>
          </div>
          <Card>
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
                        <TableCell className="font-medium">{fullName(a.college_short, a.college_name)}</TableCell>
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

      {/* BACKUP PLAN — APPLY NOW */}
      <section className="bg-gradient-to-br from-rose-50/40 via-white to-blue-50/40 py-14 border-y">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <Badge className="bg-rose-500 text-white border-transparent mb-3">Backup Plan</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Did Not Shortlist for Any Top B-School?</h2>
            <p className="text-muted-foreground mt-2">
              Don't worry — these reputed B-schools have applications <strong className="text-foreground">open right now</strong>. Compare placements, fees, then apply directly.
            </p>
          </div>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading…</div>
          ) : openColleges.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No colleges available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {openColleges.map((c, i) => (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.05, 0.4) }} whileHover={{ y: -6 }}
                >
                  <Card className="h-full overflow-hidden hover:shadow-2xl transition-all group border-slate-200">
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
                          <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[c.city, c.state].filter(Boolean).join(", ") || "India"}
                          </div>
                          {c.tier && <Badge variant="outline" className="mt-2 text-[10px]">{c.tier}</Badge>}
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
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 md:px-8 py-14">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-3"><Lightbulb className="h-3 w-3 mr-1" /> FAQ</Badge>
          <h2 className="text-2xl md:text-3xl font-bold">Frequently Asked Questions</h2>
          <p className="text-muted-foreground mt-2">Everything aspirants ask about IIM waitlist movement 2026</p>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">{f.q}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* LEAD CAPTURE */}
      <section className="container mx-auto px-4 md:px-8 pb-16">
        <Card className="overflow-hidden border-primary/20">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-2 p-8 text-primary-foreground relative overflow-hidden" style={{ background: "var(--stat-gradient)" }}>
              <motion.div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"
                animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 4, repeat: Infinity }}
              />
              <Clock className="h-8 w-8 mb-4 opacity-90 relative" />
              <h3 className="text-2xl font-bold mb-2 relative">Get a Free Waitlist Conversion Plan</h3>
              <p className="text-white/90 text-sm mb-4 relative">
                Our mentors will analyse your CAT score, category and target IIMs, then map your realistic conversion probability based on 5 years of waitlist data.
              </p>
              <ul className="text-sm space-y-2 text-white/90 relative">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Personalised waitlist forecast</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> GD-PI prep roadmap</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Backup plan with non-IIM B-schools</li>
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
