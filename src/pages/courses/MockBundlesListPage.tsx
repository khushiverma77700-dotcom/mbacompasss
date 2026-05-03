import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  Package, Clock, ChevronRight, Search, ShoppingBag, Award, Sparkles, ShieldCheck,
  Users, Star, TrendingUp, X, Filter, CheckCircle2, BarChart3, BookOpen, Brain,
  Target, Trophy, Zap, LineChart, Layers, GraduationCap, Flame, Rocket, ArrowRight,
  Crown, ListChecks,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { FEATURE_DEFINITIONS, type FeatureKey, type FeatureMap } from "@/lib/courseFeatures";
import { useMetaPixel, pixelTrack } from "@/lib/metaPixel";

type Bundle = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  exam_code: string | null;
  cover_image_url: string | null;
  price_inr: number;
  original_price_inr: number | null;
  validity_days: number;
  highlight_on_mocks?: boolean;
  features?: FeatureMap | null;
  included_categories?: string[] | null;
  items: { test_id: string }[];
};

type SortKey = "newest" | "price_asc" | "price_desc" | "popularity" | "discount";
type PriceBucket = "all" | "u999" | "1000-2999" | "3000+";

const PRICE_BUCKETS: { id: PriceBucket; label: string }[] = [
  { id: "all", label: "All prices" },
  { id: "u999", label: "Under ₹999" },
  { id: "1000-2999", label: "₹1,000 – ₹2,999" },
  { id: "3000+", label: "₹3,000 & above" },
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "popularity", label: "Most mocks" },
  { id: "discount", label: "Biggest discount" },
  { id: "price_asc", label: "Price: Low → High" },
  { id: "price_desc", label: "Price: High → Low" },
];

const FEATURE_ICON: Record<FeatureKey, any> = {
  study_planner: BookOpen,
  performance_tracker: LineChart,
  daily_tests: Target,
  daily_mocks: Flame,
  previous_year_papers: Layers,
  personalized_hub: Brain,
  deep_analysis: BarChart3,
  leaderboard: Trophy,
  score_predictor: TrendingUp,
  ai_insights: Sparkles,
  day_planner: ListChecks,
  ai_tools: Zap,
  buy_mocks: ShoppingBag,
  support: ShieldCheck,
};

function priceMatches(p: number, bucket: PriceBucket) {
  if (bucket === "all") return true;
  if (bucket === "u999") return p < 1000;
  if (bucket === "1000-2999") return p >= 1000 && p < 3000;
  if (bucket === "3000+") return p >= 3000;
  return true;
}

function discountOf(b: Bundle) {
  const p = Number(b.price_inr);
  const o = b.original_price_inr ? Number(b.original_price_inr) : null;
  return o && o > p ? Math.round(((o - p) / o) * 100) : 0;
}

function enabledFeatureKeys(b: Bundle): FeatureKey[] {
  const f = (b.features ?? {}) as FeatureMap;
  return FEATURE_DEFINITIONS.map((d) => d.key).filter((k) => f[k]);
}

export default function MockBundlesListPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [exam, setExam] = useState<string>("all");
  const [bucket, setBucket] = useState<PriceBucket>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [tab, setTab] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mock_bundles")
        .select("id, name, slug, description, exam_code, cover_image_url, price_inr, original_price_inr, validity_days, highlight_on_mocks, features, included_categories, items:mock_bundle_items(test_id)")
        .eq("is_published", true)
        .order("sort_order");
      setBundles((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const exams = useMemo(() => {
    const set = new Set<string>();
    bundles.forEach((b) => b.exam_code && set.add(b.exam_code));
    return Array.from(set).sort();
  }, [bundles]);

  // Aggregate stats for hero strip
  const stats = useMemo(() => {
    const totalMocks = bundles.reduce((s, b) => s + (b.items?.length ?? 0), 0);
    const examsCount = exams.length;
    const maxOff = bundles.reduce((m, b) => Math.max(m, discountOf(b)), 0);
    return { totalBundles: bundles.length, totalMocks, examsCount, maxOff };
  }, [bundles, exams]);

  const filtered = useMemo(() => {
    let list = bundles
      .filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || (b.description ?? "").toLowerCase().includes(q.toLowerCase()))
      .filter((b) => exam === "all" || b.exam_code === exam)
      .filter((b) => priceMatches(Number(b.price_inr), bucket));

    // Tab filter
    if (tab === "best_value") list = list.filter((b) => discountOf(b) >= 20);
    else if (tab === "premium") list = list.filter((b) => Number(b.price_inr) >= 3000);
    else if (tab === "starter") list = list.filter((b) => Number(b.price_inr) < 1000);
    else if (tab !== "all") list = list.filter((b) => b.exam_code === tab);

    if (sort === "price_asc") list = [...list].sort((a, b) => Number(a.price_inr) - Number(b.price_inr));
    else if (sort === "price_desc") list = [...list].sort((a, b) => Number(b.price_inr) - Number(a.price_inr));
    else if (sort === "popularity") list = [...list].sort((a, b) => (b.items?.length ?? 0) - (a.items?.length ?? 0));
    else if (sort === "discount") list = [...list].sort((a, b) => discountOf(b) - discountOf(a));
    return list;
  }, [bundles, q, exam, bucket, sort, tab]);

  const featured = bundles.find((b) => b.highlight_on_mocks) ?? bundles[0];
  const featuredDiscount = featured ? discountOf(featured) : 0;
  const featuredFeatures = featured ? enabledFeatureKeys(featured) : [];

  const clearFilters = () => { setQ(""); setExam("all"); setBucket("all"); setSort("newest"); setTab("all"); };
  const hasActiveFilters = q || exam !== "all" || bucket !== "all" || sort !== "newest" || tab !== "all";

  return (
    <div className="bg-background min-h-screen">
      <SEOHead
        title="Mock Test Courses & Bundles | MBA Compass"
        description="Buy curated CAT, XAT, NMAT, SNAP and IIFT mock test bundles. AI analytics, study planner, and full dashboard included with every course."
      />

      {/* HERO HEADER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-sky-300/40 to-blue-400/30 blur-3xl animate-blob" />
          <div className="absolute top-20 -right-20 w-[22rem] h-[22rem] rounded-full bg-gradient-to-br from-cyan-300/40 to-sky-200/30 blur-3xl animate-blob [animation-delay:3s]" />
          <div className="absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.06)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>

        <div className="container mx-auto px-4 pt-12 pb-6 md:pt-16 md:pb-8 relative">
          <div className="max-w-3xl">
            <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">
              <ShoppingBag className="h-3.5 w-3.5 mr-1" /> MBA Compass Course Catalog
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight bg-gradient-to-br from-slate-900 via-sky-900 to-sky-700 bg-clip-text text-transparent">
              All-access mock bundles built for serious MBA aspirants
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              CAT, XAT, NMAT, SNAP & IIFT — curated by 99.9%ilers. Every bundle unlocks full
              dashboard tools, AI analytics, study planner and percentile predictor.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong>4.8/5</strong> aspirant rating</div>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-sky-600" /><strong>10,000+</strong> students</div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /><strong>365-day</strong> validity</div>
              <div className="flex items-center gap-1.5"><Crown className="h-4 w-4 text-amber-600" /><strong>Topper-built</strong> content</div>
            </div>
          </div>

          {/* LIVE STATS GRID */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Package, label: "Active bundles", value: stats.totalBundles, accent: "from-sky-500 to-sky-600" },
              { icon: GraduationCap, label: "Total mocks", value: stats.totalMocks, accent: "from-emerald-500 to-emerald-600" },
              { icon: BookOpen, label: "Exams covered", value: stats.examsCount, accent: "from-violet-500 to-violet-600" },
              { icon: Flame, label: "Max savings", value: `${stats.maxOff}%`, accent: "from-rose-500 to-rose-600" },
            ].map((s, i) => (
              <Card key={i} className="p-4 border-sky-100 bg-white/95 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.accent} text-white flex items-center justify-center shrink-0`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-xl font-bold">{loading ? "—" : s.value}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* FEATURED HERO CARD */}
        {!loading && featured && (
          <div className="container mx-auto px-4 pb-10 relative">
            <Card className="overflow-hidden border-sky-200 shadow-xl shadow-sky-500/10 bg-gradient-to-br from-white via-sky-50/50 to-white">
              <div className="grid lg:grid-cols-5 gap-0">
                {/* Left: image */}
                <div className="lg:col-span-2 relative min-h-[240px] bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-50 flex items-center justify-center overflow-hidden">
                  {featured.cover_image_url ? (
                    <img src={featured.cover_image_url} alt={featured.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="h-20 w-20 text-sky-400" />
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400 border-0 shadow-md">
                      <Star className="h-3 w-3 mr-1 fill-current" /> FEATURED
                    </Badge>
                    {featuredDiscount > 0 && (
                      <Badge className="bg-rose-500 text-white hover:bg-rose-500 border-0 shadow-md">
                        {featuredDiscount}% OFF
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Right: details */}
                <div className="lg:col-span-3 p-6 md:p-8">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {featured.exam_code && <Badge variant="outline" className="border-sky-300 text-sky-700">{featured.exam_code}</Badge>}
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      {featured.items?.length ?? 0} mocks included
                    </Badge>
                    <Badge variant="secondary" className="bg-sky-100 text-sky-800 hover:bg-sky-100">
                      <Clock className="h-3 w-3 mr-1" /> {featured.validity_days} days access
                    </Badge>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight">{featured.name}</h2>
                  {featured.description && (
                    <p className="text-sm md:text-base text-muted-foreground mt-2 line-clamp-3">{featured.description}</p>
                  )}

                  {/* Included features */}
                  {featuredFeatures.length > 0 && (
                    <div className="mt-5">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">What's inside</div>
                      <div className="flex flex-wrap gap-2">
                        {featuredFeatures.slice(0, 8).map((k) => {
                          const def = FEATURE_DEFINITIONS.find((f) => f.key === k);
                          const Ic = FEATURE_ICON[k] ?? CheckCircle2;
                          return (
                            <span key={k} className="inline-flex items-center gap-1.5 text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-full">
                              <Ic className="h-3.5 w-3.5" /> {def?.label}
                            </span>
                          );
                        })}
                        {featuredFeatures.length > 8 && (
                          <span className="text-xs font-medium text-muted-foreground self-center">+{featuredFeatures.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4 pt-5 border-t">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-sky-700 to-sky-500 bg-clip-text text-transparent">
                          ₹{Number(featured.price_inr).toLocaleString()}
                        </div>
                        {featured.original_price_inr && Number(featured.original_price_inr) > Number(featured.price_inr) && (
                          <div className="text-base text-muted-foreground line-through">₹{Number(featured.original_price_inr).toLocaleString()}</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">One-time payment · Instant unlock</div>
                    </div>
                    <Button asChild size="lg" className="shadow-lg shadow-sky-500/30">
                      <Link to={`/courses/${featured.slug}`}>
                        View course details <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TRUST BAR */}
        <div className="container mx-auto px-4 pb-10 relative">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Sparkles, t: "Instant unlock", d: "All mocks in dashboard immediately." },
              { icon: TrendingUp, t: "AI Analytics", d: "Section, topic & percentile breakdown." },
              { icon: Award, t: "Topper-grade", d: "Designed by 99.9%ilers & IIM alumni." },
              { icon: ShieldCheck, t: "Secure checkout", d: "Razorpay UPI / cards / netbanking." },
            ].map((b, i) => (
              <Card key={i} className="p-4 border-sky-100 bg-white/95 flex items-start gap-3 hover:shadow-md transition">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center shrink-0">
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{b.t}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{b.d}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FILTERS BAR */}
      <section className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search bundles by name, exam or topic…"
                  className="pl-9 h-11"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm font-medium md:w-56"
              >
                {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>Sort: {o.label}</option>)}
              </select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="md:w-auto">
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            {/* Price chips only — exam moved to tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Price:
              </span>
              {PRICE_BUCKETS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBucket(b.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                    bucket === b.id ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-foreground border-emerald-200 hover:border-emerald-400"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TABBED RESULTS */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <TabsList className="bg-sky-50 border border-sky-100 h-auto flex-wrap p-1">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow text-xs md:text-sm">
                  <Layers className="h-3.5 w-3.5 mr-1.5" /> All courses
                </TabsTrigger>
                <TabsTrigger value="best_value" className="data-[state=active]:bg-white data-[state=active]:shadow text-xs md:text-sm">
                  <Flame className="h-3.5 w-3.5 mr-1.5 text-rose-500" /> Best value
                </TabsTrigger>
                <TabsTrigger value="starter" className="data-[state=active]:bg-white data-[state=active]:shadow text-xs md:text-sm">
                  <Rocket className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Starter
                </TabsTrigger>
                <TabsTrigger value="premium" className="data-[state=active]:bg-white data-[state=active]:shadow text-xs md:text-sm">
                  <Crown className="h-3.5 w-3.5 mr-1.5 text-amber-600" /> Premium
                </TabsTrigger>
                {exams.map((e) => (
                  <TabsTrigger key={e} value={e} className="data-[state=active]:bg-white data-[state=active]:shadow text-xs md:text-sm">
                    {e}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="text-sm text-muted-foreground">
                {loading ? "Loading…" : <><strong className="text-foreground">{filtered.length}</strong> result{filtered.length === 1 ? "" : "s"}</>}
              </div>
            </div>

            <TabsContent value={tab} className="mt-0">
              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="h-44 bg-sky-50 animate-pulse" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-sky-50 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-sky-50 rounded animate-pulse w-full" />
                        <div className="h-3 bg-sky-50 rounded animate-pulse w-1/2" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 text-sky-300 mx-auto mb-3" />
                  <div className="font-semibold">No bundles match your filters</div>
                  <p className="text-sm text-muted-foreground mt-1">Try clearing filters or switching tab.</p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Clear filters</Button>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((b) => {
                    const original = b.original_price_inr ? Number(b.original_price_inr) : null;
                    const price = Number(b.price_inr);
                    const discountPct = discountOf(b);
                    const isFeatured = b.id === featured?.id;
                    const fkeys = enabledFeatureKeys(b);
                    const perMockCost = (b.items?.length ?? 0) > 0 ? Math.round(price / (b.items?.length ?? 1)) : 0;
                    return (
                      <Card
                        key={b.id}
                        className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group border-sky-100 relative"
                      >
                        {isFeatured && (
                          <Badge className="absolute top-3 left-3 z-10 bg-amber-400 text-amber-950 hover:bg-amber-400 border-0 shadow-md text-[10px]">
                            <Star className="h-3 w-3 mr-1 fill-current" /> FEATURED
                          </Badge>
                        )}
                        {discountPct > 0 && (
                          <Badge className="absolute top-3 right-3 z-10 bg-rose-500 text-white hover:bg-rose-500 border-0 shadow-md">
                            {discountPct}% OFF
                          </Badge>
                        )}
                        {b.cover_image_url ? (
                          <div className="overflow-hidden">
                            <img
                              src={b.cover_image_url}
                              alt={b.name}
                              className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-44 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-50 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
                            <Package className="h-14 w-14 text-sky-400 relative" />
                          </div>
                        )}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {b.exam_code && <Badge variant="outline" className="border-sky-300 text-sky-700">{b.exam_code}</Badge>}
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              {b.items?.length ?? 0} mocks
                            </Badge>
                            {fkeys.length > 0 && (
                              <Badge variant="secondary" className="bg-violet-100 text-violet-800 hover:bg-violet-100">
                                {fkeys.length} tools
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg leading-snug">{b.name}</h3>
                          {b.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">{b.description}</p>
                          )}

                          {/* Mini feature pills */}
                          {fkeys.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {fkeys.slice(0, 4).map((k) => {
                                const def = FEATURE_DEFINITIONS.find((f) => f.key === k);
                                const Ic = FEATURE_ICON[k] ?? CheckCircle2;
                                return (
                                  <span key={k} className="inline-flex items-center gap-1 text-[10px] font-medium bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded-full">
                                    <Ic className="h-3 w-3" /> {def?.label}
                                  </span>
                                );
                              })}
                              {fkeys.length > 4 && (
                                <span className="text-[10px] font-medium text-muted-foreground self-center">+{fkeys.length - 4}</span>
                              )}
                            </div>
                          )}

                          {/* Quick stat strip */}
                          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-md bg-sky-50/60 border border-sky-100 px-2 py-1.5">
                              <div className="text-muted-foreground">Per-mock</div>
                              <div className="font-semibold text-sky-800">₹{perMockCost.toLocaleString()}</div>
                            </div>
                            <div className="rounded-md bg-emerald-50/60 border border-emerald-100 px-2 py-1.5">
                              <div className="text-muted-foreground">Validity</div>
                              <div className="font-semibold text-emerald-800">{b.validity_days} days</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div>
                              <div className="flex items-baseline gap-2">
                                <div className="text-2xl font-bold bg-gradient-to-br from-sky-700 to-sky-500 bg-clip-text text-transparent">
                                  ₹{price.toLocaleString()}
                                </div>
                                {original && original > price && (
                                  <div className="text-sm text-muted-foreground line-through">₹{original.toLocaleString()}</div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" /> {b.validity_days} days access
                              </div>
                            </div>
                            <Button asChild size="sm" className="shadow-md shadow-sky-500/30">
                              <Link to={`/courses/${b.slug}`}>View <ChevronRight className="h-4 w-4 ml-1" /></Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      {!loading && filtered.length > 1 && (
        <section className="py-12 bg-gradient-to-b from-sky-50/40 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">Side-by-side</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">Quick comparison of available courses</h2>
              <p className="text-muted-foreground mt-2">Compare price, mocks, validity and dashboard tools at a glance.</p>
            </div>

            <Card className="overflow-hidden border-sky-100">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-sky-50 text-sky-900">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Course</th>
                      <th className="text-left px-4 py-3 font-semibold">Exam</th>
                      <th className="text-center px-4 py-3 font-semibold">Mocks</th>
                      <th className="text-center px-4 py-3 font-semibold">Tools</th>
                      <th className="text-center px-4 py-3 font-semibold">Validity</th>
                      <th className="text-right px-4 py-3 font-semibold">Price</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 8).map((b) => {
                      const fkeys = enabledFeatureKeys(b);
                      const original = b.original_price_inr ? Number(b.original_price_inr) : null;
                      const price = Number(b.price_inr);
                      return (
                        <tr key={b.id} className="border-t border-sky-50 hover:bg-sky-50/40 transition">
                          <td className="px-4 py-3 font-medium">{b.name}</td>
                          <td className="px-4 py-3">
                            {b.exam_code ? <Badge variant="outline" className="border-sky-300 text-sky-700">{b.exam_code}</Badge> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">{b.items?.length ?? 0}</td>
                          <td className="px-4 py-3 text-center">{fkeys.length}</td>
                          <td className="px-4 py-3 text-center">{b.validity_days}d</td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-semibold text-sky-800">₹{price.toLocaleString()}</div>
                            {original && original > price && (
                              <div className="text-xs text-muted-foreground line-through">₹{original.toLocaleString()}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/courses/${b.slug}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            {filtered.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-3">Showing top 8 — refine filters above to compare specific bundles.</p>
            )}
          </div>
        </section>
      )}

      {/* WHY BUNDLES WIN */}
      {!loading && filtered.length > 0 && (
        <section className="py-14">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto">
              <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">Why bundles win</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">Buy a bundle. Skip the hassle.</h2>
              <p className="text-muted-foreground mt-2">One checkout, full exam coverage, and analytics on every attempt.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              {[
                { icon: Flame, t: "Save up to 40%", d: "Bundle pricing is meaningfully cheaper than buying mocks individually." },
                { icon: Zap, t: "Instant access", d: "All mocks unlock in your student dashboard the moment payment succeeds." },
                { icon: BarChart3, t: "AI report on every mock", d: "Section, topic and percentile insights for the full pack." },
              ].map((x, i) => (
                <Card key={i} className="p-5 border-sky-100 bg-white hover:shadow-md transition">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center mb-3">
                    <x.icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold">{x.t}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">{x.d}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 bg-gradient-to-b from-white to-sky-50/40">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8">
            <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">FAQs</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Everything you need to know</h2>
          </div>
          <Accordion type="single" collapsible className="bg-white rounded-xl border border-sky-100 px-2">
            {[
              { q: "How do I access mocks after purchase?", a: "Mocks unlock instantly in your student dashboard. You'll receive login credentials by email if you're a new user." },
              { q: "Can I attempt mocks more than once?", a: "Yes. Each mock can be attempted multiple times within the validity period of your bundle." },
              { q: "Do I get analytics and AI insights?", a: "Every attempt generates a detailed AI-powered report — sectional accuracy, topic-wise heatmap, percentile prediction and improvement suggestions." },
              { q: "What's the validity of a bundle?", a: "Most bundles come with 365-day access. Check the individual course page for the exact validity." },
              { q: "Can I switch or upgrade my bundle?", a: "Yes — contact our support and we'll help you upgrade with prorated pricing." },
              { q: "Is there a refund policy?", a: "Due to instant digital delivery, bundles are non-refundable once accessed. Reach out before attempting any mock if you have concerns." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-sky-100">
                <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-14">
        <div className="container mx-auto px-4">
          <Card className="relative overflow-hidden border-sky-200 bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 text-white p-8 md:p-12">
            <div className="absolute inset-0 pointer-events-none opacity-30 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
            <div className="relative grid md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <h3 className="text-2xl md:text-3xl font-bold leading-tight">Not sure which course fits you?</h3>
                <p className="mt-2 text-white/90 text-sm md:text-base">Our advisors will help you pick the right bundle based on your target exam, current prep level and timeline.</p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Button asChild size="lg" variant="secondary" className="bg-white text-sky-700 hover:bg-white/90">
                  <Link to="/mocks">Browse free mocks</Link>
                </Button>
                <Button asChild size="lg" className="bg-sky-900 hover:bg-sky-950 text-white border-0">
                  <Link to="/contact">Talk to advisor <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
