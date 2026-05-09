import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { getLocationImage, isGeneratedBanner } from "@/data/cityImages";
import { MapPin, ArrowRight, GraduationCap, TrendingUp, Search, Filter, Star, Award, Building2, Users, Monitor, Building, Wifi, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstitutes, useCategories } from "@/hooks/useInstitutes";
import InstituteListingCard from "@/components/InstituteListingCard";
import { useCityPages } from "@/hooks/useCityPages";
import { useSpecializations } from "@/hooks/useSpecializations";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import PageKeywords from "@/components/PageKeywords";
import AIGistSection from "@/components/AIGistSection";
import { FEE_BUCKETS, matchesFeeBucket, getEffectiveFeesLakhs, specMatches, locationMatches } from "@/lib/filterHelpers";

const modes = ["Online", "Offline", "Hybrid"];

const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

const buildRegionQuery = (page: any) => {
  const params = new URLSearchParams();

  if (page?.type === "state") {
    params.set("state", page.name);
    return params.toString();
  }

  if (page?.state) params.set("state", page.state);
  if (page?.name) params.set("city", page.name);

  return params.toString();
};

const CategoryPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCity = searchParams.get("city") || "all";
  const queryState = searchParams.get("state") || "all";
  const queryMode = searchParams.get("mode") || "all";
  const querySearch = searchParams.get("q") || "";
  const queryFee = searchParams.get("fee") || "all";
  const querySpec = searchParams.get("specialization") || "all";
  const querySort = searchParams.get("sort") || "rating";

  const { data: institutes = [], isLoading: institutesLoading } = useInstitutes(slug);
  const { data: categories = [] } = useCategories();
  const { data: allCityPages = [] } = useCityPages();
  const { data: specOptions = [] } = useSpecializations("coaching");

  const isLoading = institutesLoading;
  const category = categories.find((c: any) => c.slug === slug);

  const setFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === "all" || value === "" || value === "rating") next.delete(key);
      else next.set(key, value);
      if (key === "state") next.delete("city");
      return next;
    }, { replace: true });
  };

  const cityPage = useMemo(() => {
    if (queryCity !== "all") {
      const normalizedCity = queryCity.toLowerCase().trim();
      return allCityPages.find((p: any) =>
        p.name?.toLowerCase().trim() === normalizedCity ||
        p.slug === slugify(queryCity) ||
        (p.city_aliases || []).some((a: string) => a.toLowerCase().trim() === normalizedCity)
      ) || null;
    }

    if (queryState !== "all") {
      return allCityPages.find((p: any) =>
        p.type === "state" && p.name?.toLowerCase().trim() === queryState.toLowerCase().trim()
      ) || null;
    }

    return null;
  }, [allCityPages, queryCity, queryState]);

  const hasLocationFilter = queryCity !== "all" || queryState !== "all";
  const locationName = queryCity !== "all" ? queryCity : queryState !== "all" ? queryState : "";
  const displayName = cityPage?.name || locationName;

  const filtered = useMemo(() => {
    let list = [...institutes] as any[];

    if (querySearch) {
      const q = querySearch.toLowerCase();
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.city || "").toLowerCase().includes(q) ||
        (i.state || "").toLowerCase().includes(q) ||
        (i.courses || []).some((c: any) => c.name.toLowerCase().includes(q))
      );
    }

    if (queryCity !== "all") {
      list = list.filter((i) => locationMatches(i.city, queryCity, cityPage?.city_aliases));
    }

    if (queryState !== "all") {
      const stateFilter = queryState.trim().toLowerCase();
      list = list.filter((i) => (i.state || "").trim().toLowerCase() === stateFilter);
    }

    if (queryMode !== "all") {
      const modeFilter = queryMode.trim().toLowerCase();
      list = list.filter((i) => (i.mode || "").trim().toLowerCase() === modeFilter);
    }

    if (queryFee !== "all") list = list.filter((i: any) => matchesFeeBucket(getEffectiveFeesLakhs(i), queryFee));
    if (querySpec !== "all") list = list.filter((i: any) => specMatches(i.specializations, querySpec));
    if (querySort === "rating") list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (querySort === "reviews") list.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
    if (querySort === "success") list.sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0));
    if (querySort === "fees-low") list.sort((a, b) => (getEffectiveFeesLakhs(a) ?? Infinity) - (getEffectiveFeesLakhs(b) ?? Infinity));

    return list;
  }, [institutes, querySearch, querySort, queryCity, queryState, queryMode, queryFee, querySpec, cityPage]);

  const availableCities = useMemo(() => {
    const cities = [...new Set(institutes.map((i: any) => i.city).filter(Boolean))].sort() as string[];
    return queryCity !== "all" && !cities.includes(queryCity) ? [queryCity, ...cities] : cities;
  }, [institutes, queryCity]);

  const availableStates = useMemo(() => {
    const states = [...new Set(institutes.map((i: any) => i.state).filter(Boolean))].sort() as string[];
    return queryState !== "all" && !states.includes(queryState) ? [queryState, ...states] : states;
  }, [institutes, queryState]);

  // Strip a trailing "Coaching" so names like "CAT Coaching" don't produce "CAT Coaching Coaching Institutes"
  const categoryBase = category?.name?.replace(/\s+coaching\s*$/i, "").trim() || "";
  const categoryLabel = categoryBase || category?.name || "";

  const heroTitle = hasLocationFilter
    ? `${category ? `Best ${categoryLabel} Coaching` : "Best MBA Coaching"} in ${displayName}`
    : category
      ? `Best ${categoryLabel} Coaching Institutes`
      : "All MBA Coaching Institutes in India";

  // Plain-text version of category.description (strip HTML) for meta/fallback
  const categoryDescPlain = (category?.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const metaTitle = cityPage?.meta_title ||
    (hasLocationFilter
      ? `Best ${categoryLabel || "MBA"} Coaching in ${displayName} 2026 — Fees, Reviews | MBA Compass`
      : `${categoryLabel || "All MBA"} Coaching Institutes in India | MBA Compass`);
  const metaDesc = cityPage?.meta_description ||
    (hasLocationFilter
      ? `Explore top ${categoryLabel || "MBA"} coaching institutes in ${displayName} with fees, ratings, success rates, and student reviews.`
      : categoryDescPlain || "Find the best MBA coaching institutes across India");
  const keywords: string[] = cityPage?.keywords || [];
  const jsonLd = generateListingSchema(metaTitle, filtered, "institute");
  const { seo: resolvedSeo } = useResolvedSeo(
    cityPage ? "cityPage" : category ? "category" : undefined,
    cityPage?.id || category?.id,
    {
      title: metaTitle,
      description: metaDesc,
      keywords,
      canonical: typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}${window.location.search}` : undefined,
      jsonLd,
      ogImage: cityPage?.hero_image_url || undefined,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-14"><div className="container mx-auto px-4 text-center"><Skeleton className="h-12 w-96 mx-auto bg-white/20" /></div></div>
        <div className="container mx-auto px-4 py-8 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      </div>
    );
  }

  const otherPages = allCityPages.filter((p: any) => p.slug !== cityPage?.slug);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead {...resolvedSeo} />

      <div
        className="py-14 md:py-20 relative overflow-hidden"
        style={{
          backgroundImage: (() => {
            const adminImg = cityPage?.hero_image_url && !isGeneratedBanner(cityPage.hero_image_url) ? cityPage.hero_image_url : null;
            const img = adminImg || getLocationImage(
              queryCity !== "all" ? queryCity : cityPage?.name,
              queryState !== "all" ? queryState : cityPage?.state
            );
            return `url(${img})`;
          })(),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/55" />
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-20 h-20 border border-white/10 rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium transition-colors bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>

          <div className="text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4 border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">
                  {filtered.length} Coaching Institute{filtered.length !== 1 ? "s" : ""}{hasLocationFilter ? ` in ${displayName}` : ""}
                </span>
              </div>
              <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-4 tracking-tight leading-tight">
                {heroTitle}
              </h1>
              {cityPage?.intro_content ? (
                <div className="text-primary-foreground/75 max-w-3xl mx-auto prose-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: cityPage.intro_content }} />
              ) : (
                <p className="text-primary-foreground/75 mb-6 max-w-2xl mx-auto text-base md:text-lg">{metaDesc}</p>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-2xl mx-auto mt-6 mb-6">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search coaching by name, city, state..."
                  value={querySearch}
                  onChange={(e) => setFilter("q", e.target.value)}
                  className="pl-13 pr-4 py-3 h-14 rounded-2xl bg-white/95 backdrop-blur-sm border-0 text-foreground shadow-2xl text-base focus:ring-2 focus:ring-white/30"
                />
              </div>
            </motion.div>

            {keywords.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-2 mt-5">
                {keywords.slice(0, 6).map((kw: string) => (
                  <Badge key={kw} className="bg-white/10 text-primary-foreground border-white/15 text-xs backdrop-blur-sm">{kw}</Badge>
                ))}
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3 max-w-md mt-6 mx-auto">
              {[
                { label: "Institutes", value: filtered.length, icon: Building2 },
                { label: "Categories", value: categories.length, icon: Award },
                { label: "Avg Rated", value: filtered.filter((i: any) => i.rating).length, icon: Star },
              ].map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <s.icon className="w-4 h-4 text-primary-foreground/70 mx-auto mb-1" />
                  <p className="font-heading font-extrabold text-primary-foreground text-xl">{s.value}</p>
                  <p className="text-primary-foreground/60 text-[10px] uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AIGistSection
          content={`${displayName || "India"} ${category?.name || "MBA"} Coaching Institutes. ${cityPage?.intro_content || ""} ${cityPage?.detailed_content || ""} ${filtered.map((i: any) => `${i.name}: Rating ${i.rating}, Success Rate ${i.success_rate}%`).join(". ")}`}
          pageType="city"
          pageId={cityPage?.id}
          onScrollToContent={() => document.getElementById("institute-list")?.scrollIntoView({ behavior: "smooth" })}
        />

        <div className="bg-card rounded-2xl border border-border p-5 mb-8 shadow-lg -mt-8 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Filter className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Filter & Search</span>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{filtered.length} results</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search coaching by name, city, state..." value={querySearch} onChange={e => setFilter("q", e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={queryState} onValueChange={(v) => setFilter("state", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {availableStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={queryCity} onValueChange={(v) => setFilter("city", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {availableCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={queryMode} onValueChange={(v) => setFilter("mode", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                {modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={queryFee} onValueChange={(v) => setFilter("fee", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Fees" /></SelectTrigger>
              <SelectContent>{FEE_BUCKETS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
            </Select>
            {specOptions.length > 0 && (
              <Select value={querySpec} onValueChange={(v) => setFilter("specialization", v)}>
                <SelectTrigger className="w-full sm:w-44 rounded-xl"><SelectValue placeholder="Specialization" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  {specOptions.map(s => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={querySort} onValueChange={(v) => setFilter("sort", v)}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Sort by Rating</SelectItem>
                <SelectItem value="fees-low">Fees: Low to High</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="success">Success Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div id="institute-list" className="space-y-5">
            {filtered.map((inst: any, i: number) => (
              <InstituteListingCard key={inst.id} inst={inst} index={i} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <Building2 className="w-16 h-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">No coaching institutes found</h3>
            <p className="text-muted-foreground text-sm">No coaching institutes match your filters{hasLocationFilter ? ` for ${displayName}` : ""}. Try adjusting your selection.</p>
          </div>
        )}

        {cityPage?.detailed_content && (
          <div className="mt-12 bg-card rounded-2xl border border-border p-8 shadow-sm prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: cityPage.detailed_content }} />
        )}
        {cityPage?.faq_content && (
          <div className="mt-8 bg-card rounded-2xl border border-border p-8 shadow-sm prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: cityPage.faq_content }} />
        )}
        {hasLocationFilter && !cityPage?.detailed_content && !cityPage?.faq_content && (
          <div className="mt-12 bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h2 className="font-heading font-bold text-foreground text-xl mb-3">About {category?.name || "MBA"} Coaching in {displayName}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {metaDesc} Our comprehensive listing covers fees, batch information, success rates, and student reviews.
              Use our filters to find the perfect coaching institute matching your budget and learning preferences.
            </p>
          </div>
        )}

        {hasLocationFilter && otherPages.length > 0 && (
          <div className="mt-10 bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">Explore Other Regions</h3>
            <p className="text-sm text-muted-foreground mb-5">Find MBA coaching institutes in other cities and states across India</p>
            <div className="flex flex-wrap gap-2">
              {otherPages.slice(0, 30).map((p: any) => (
                <Link key={p.slug} to={`/category/${slug || "cat"}?${buildRegionQuery(p)}`}>
                  <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-all duration-200 cursor-pointer py-1.5 px-3 text-xs">
                    <MapPin className="w-3 h-3 mr-1" /> {p.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {cityPage?.id && (
          <PageKeywords contentType="cityPage" recordId={cityPage.id} fallbackKeywords={keywords} />
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
