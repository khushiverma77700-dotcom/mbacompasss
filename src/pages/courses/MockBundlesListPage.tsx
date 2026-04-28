import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package, Clock, ChevronRight, Search, ShoppingBag, Award, Sparkles, ShieldCheck, Users, Star, TrendingUp, X, Filter,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

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
  items: { test_id: string }[];
};

type SortKey = "newest" | "price_asc" | "price_desc" | "popularity";
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
  { id: "price_asc", label: "Price: Low → High" },
  { id: "price_desc", label: "Price: High → Low" },
];

function priceMatches(p: number, bucket: PriceBucket) {
  if (bucket === "all") return true;
  if (bucket === "u999") return p < 1000;
  if (bucket === "1000-2999") return p >= 1000 && p < 3000;
  if (bucket === "3000+") return p >= 3000;
  return true;
}

export default function MockBundlesListPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [exam, setExam] = useState<string>("all");
  const [bucket, setBucket] = useState<PriceBucket>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mock_bundles")
        .select("id, name, slug, description, exam_code, cover_image_url, price_inr, original_price_inr, validity_days, highlight_on_mocks, items:mock_bundle_items(test_id)")
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

  const filtered = useMemo(() => {
    let list = bundles
      .filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || (b.description ?? "").toLowerCase().includes(q.toLowerCase()))
      .filter((b) => exam === "all" || b.exam_code === exam)
      .filter((b) => priceMatches(Number(b.price_inr), bucket));

    if (sort === "price_asc") list = [...list].sort((a, b) => Number(a.price_inr) - Number(b.price_inr));
    else if (sort === "price_desc") list = [...list].sort((a, b) => Number(b.price_inr) - Number(a.price_inr));
    else if (sort === "popularity") list = [...list].sort((a, b) => (b.items?.length ?? 0) - (a.items?.length ?? 0));
    return list;
  }, [bundles, q, exam, bucket, sort]);

  const featured = bundles.find((b) => b.highlight_on_mocks) ?? bundles[0];

  const clearFilters = () => { setQ(""); setExam("all"); setBucket("all"); setSort("newest"); };
  const hasActiveFilters = q || exam !== "all" || bucket !== "all" || sort !== "newest";

  return (
    <div className="bg-background min-h-screen">
      <SEOHead title="Mock Test Courses & Bundles | MBA Compass" description="Buy curated CAT, XAT, NMAT, SNAP and IIFT mock test bundles. One purchase unlocks every mock instantly." />

      {/* HERO HEADER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-sky-300/40 to-blue-400/30 blur-3xl animate-blob" />
          <div className="absolute top-20 -right-20 w-[22rem] h-[22rem] rounded-full bg-gradient-to-br from-cyan-300/40 to-sky-200/30 blur-3xl animate-blob [animation-delay:3s]" />
          <div className="absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.06)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>

        <div className="container mx-auto px-4 pt-12 pb-8 md:pt-16 md:pb-10 relative">
          <div className="max-w-3xl">
            <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">
              <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Mock Bundles & Courses
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight bg-gradient-to-br from-slate-900 via-sky-900 to-sky-700 bg-clip-text text-transparent">
              All-access mock bundles for CAT, XAT, NMAT & more
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              One purchase. Every mock unlocked instantly in your dashboard. AI-powered analytics on every attempt.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong>4.8/5</strong> aspirant rating</div>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-sky-600" /><strong>10,000+</strong> students</div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /><strong>365-day</strong> validity</div>
            </div>
          </div>
        </div>

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
            {/* Search + sort row */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search bundles by name…"
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

            {/* Exam chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Exam:
              </span>
              <button
                onClick={() => setExam("all")}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                  exam === "all" ? "bg-sky-600 text-white border-sky-600" : "bg-white text-foreground border-sky-200 hover:border-sky-400"
                }`}
              >
                All
              </button>
              {exams.map((e) => (
                <button
                  key={e}
                  onClick={() => setExam(e)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                    exam === e ? "bg-sky-600 text-white border-sky-600" : "bg-white text-foreground border-sky-200 hover:border-sky-400"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Price chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Price:</span>
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

      {/* RESULTS */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-muted-foreground">
              {loading ? "Loading…" : <><strong className="text-foreground">{filtered.length}</strong> bundle{filtered.length === 1 ? "" : "s"} available</>}
            </div>
          </div>

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
              <p className="text-sm text-muted-foreground mt-1">Try clearing filters or searching for a different exam.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Clear filters</Button>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((b) => {
                const original = b.original_price_inr ? Number(b.original_price_inr) : null;
                const price = Number(b.price_inr);
                const discountPct = original && original > price ? Math.round(((original - price) / original) * 100) : 0;
                const isFeatured = b.id === featured?.id;
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
                      </div>
                      <h3 className="font-semibold text-lg leading-snug">{b.name}</h3>
                      {b.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 flex-1">{b.description}</p>
                      )}
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
        </div>
      </section>

      {/* COMPARISON STRIP */}
      {!loading && filtered.length > 0 && (
        <section className="py-14 bg-gradient-to-b from-sky-50/40 to-white">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto">
              <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">Why bundles win</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">Buy a bundle. Skip the hassle.</h2>
              <p className="text-muted-foreground mt-2">One checkout, full exam coverage, and analytics on every attempt.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              {[
                { t: "Save up to 40%", d: "Bundle pricing is meaningfully cheaper than buying mocks individually." },
                { t: "Instant access", d: "All mocks unlock in your student dashboard the moment payment succeeds." },
                { t: "AI report on every mock", d: "Section, topic and percentile insights for the full pack." },
              ].map((x, i) => (
                <Card key={i} className="p-5 border-sky-100 bg-white">
                  <div className="font-semibold">{x.t}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">{x.d}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
