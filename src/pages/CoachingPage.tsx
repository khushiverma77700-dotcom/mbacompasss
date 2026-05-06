import { useMemo, useCallback } from "react";
import { INDIAN_STATES, getCitiesForState } from "@/data/indianLocations";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { MapPin, Search, Users, TrendingUp, GraduationCap, Award, ChevronRight, ArrowRight, Building2, Filter, Star, Monitor, Building, Wifi, X, ArrowLeft, Share2, LayoutGrid, List, Map as MapIcon, Sparkles, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInstitutes, useCategories } from "@/hooks/useInstitutes";
import InstituteListingCard from "@/components/InstituteListingCard";
import { useCityPages } from "@/hooks/useCityPages";
import { useSpecializations } from "@/hooks/useSpecializations";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import PageKeywords from "@/components/PageKeywords";
import { getLocationImage } from "@/data/cityImages";
import { FEE_BUCKETS, FEE_BUCKET_LABELS, matchesFeeBucket, getEffectiveFeesLakhs, specMatches, locationMatches } from "@/lib/filterHelpers";
import { CoachingCompareProvider } from "@/contexts/CoachingCompareContext";
import CompareDrawer from "@/components/coaching/CompareDrawer";
import CoachingMapView from "@/components/coaching/CoachingMapView";

const modes = ["Online", "Offline", "Hybrid"];
const toSlug = (value: string) => value.toLowerCase().trim().replace(/\s+/g, "-");

const CoachingPage = () => {
  const navigate = useNavigate();
  const { data: allInstitutes = [], isLoading } = useInstitutes();
  const { data: categories = [] } = useCategories();
  const { data: cityPages = [] } = useCityPages();
  const { data: specOptions = [] } = useSpecializations("coaching");
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL
  const search = searchParams.get("q") || "";
  const selectedState = searchParams.get("state") || "all";
  const selectedCity = searchParams.get("city") || "all";
  const selectedMode = searchParams.get("mode") || "all";
  const selectedCategory = searchParams.get("category") || "all";
  const selectedFee = searchParams.get("fee") || "all";
  const selectedSpec = searchParams.get("specialization") || "all";
  const sortBy = searchParams.get("sort") || "rating";

  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === "all" || value === "" || value === "rating") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      if (key === "state") next.delete("city");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const removeFilter = useCallback((key: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      if (key === "state") next.delete("city");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearAllFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const currentCityPage = useMemo(() => {
    if (selectedCity === "all") return null;
    const normalizedCity = selectedCity.trim().toLowerCase();

    return cityPages.find((page: any) =>
      page.name?.toLowerCase().trim() === normalizedCity ||
      page.slug === toSlug(selectedCity) ||
      (page.city_aliases || []).some((alias: string) => alias?.toLowerCase().trim() === normalizedCity)
    ) || null;
  }, [cityPages, selectedCity]);

  const states = useMemo(() => {
    const stateOptions = INDIAN_STATES.filter(s => allInstitutes.some((i: any) => i.state === s));
    return selectedState !== "all" && !stateOptions.includes(selectedState)
      ? [selectedState, ...stateOptions]
      : stateOptions;
  }, [allInstitutes, selectedState]);

  const citiesForState = useMemo(() => {
    const cityOptions = (
      selectedState !== "all"
        ? getCitiesForState(selectedState).filter(c => allInstitutes.some((i: any) => i.city === c))
        : [...new Set(allInstitutes.map((i: any) => i.city).filter(Boolean))].sort() as string[]
    );

    return selectedCity !== "all" && !cityOptions.includes(selectedCity)
      ? [selectedCity, ...cityOptions]
      : cityOptions;
  }, [allInstitutes, selectedState, selectedCity]);

  const allCities = useMemo(() => {
    const cityOptions = [...new Set(allInstitutes.map((i: any) => i.city).filter(Boolean))].sort() as string[];
    return selectedCity !== "all" && !cityOptions.includes(selectedCity)
      ? [selectedCity, ...cityOptions]
      : cityOptions;
  }, [allInstitutes, selectedCity]);

  const filtered = useMemo(() => {
    let list = [...allInstitutes] as any[];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.city || "").toLowerCase().includes(q) ||
        (i.state || "").toLowerCase().includes(q)
      );
    }
    if (selectedCity !== "all") {
      list = list.filter((i) => locationMatches(i.city, selectedCity, currentCityPage?.city_aliases));
    }
    if (selectedState !== "all") {
      const normalizedState = selectedState.trim().toLowerCase();
      list = list.filter((i) => (i.state || "").trim().toLowerCase() === normalizedState);
    }
    if (selectedMode !== "all") {
      const normalizedMode = selectedMode.trim().toLowerCase();
      list = list.filter((i) => (i.mode || "").trim().toLowerCase() === normalizedMode);
    }
    if (selectedCategory !== "all") {
      const cat = categories.find((c: any) => c.slug === selectedCategory);
      if (cat) list = list.filter((i: any) => i.category_id === cat.id);
    }
    if (selectedFee !== "all") list = list.filter((i: any) => matchesFeeBucket(getEffectiveFeesLakhs(i), selectedFee));
    if (selectedSpec !== "all") list = list.filter((i: any) => specMatches(i.specializations, selectedSpec));
    if (sortBy === "rating") list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === "reviews") list.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
    if (sortBy === "success") list.sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0));
    if (sortBy === "fees-low") {
      list.sort((a, b) => (getEffectiveFeesLakhs(a) ?? Infinity) - (getEffectiveFeesLakhs(b) ?? Infinity));
    }
    return list;
  }, [allInstitutes, search, selectedCity, selectedState, selectedMode, selectedCategory, selectedFee, selectedSpec, sortBy, categories, currentCityPage]);

  // Active filters chips
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (selectedState !== "all") chips.push({ key: "state", label: selectedState });
    if (selectedCity !== "all") chips.push({ key: "city", label: selectedCity });
    if (selectedMode !== "all") chips.push({ key: "mode", label: selectedMode });
    if (selectedCategory !== "all") {
      const cat = categories.find((c: any) => c.slug === selectedCategory);
      chips.push({ key: "category", label: cat?.name || selectedCategory });
    }
    if (selectedFee !== "all") chips.push({ key: "fee", label: FEE_BUCKET_LABELS[selectedFee] || selectedFee });
    if (selectedSpec !== "all") {
      const sp = specOptions.find(s => s.slug === selectedSpec);
      chips.push({ key: "specialization", label: sp?.name || selectedSpec });
    }
    if (search) chips.push({ key: "q", label: `"${search}"` });
    return chips;
  }, [selectedState, selectedCity, selectedMode, selectedCategory, selectedFee, selectedSpec, search, categories, specOptions]);

  // Dynamic SEO
  const dynamicH1 = useMemo(() => {
    const parts = ["Best MBA Coaching Institutes"];
    if (selectedCity !== "all") parts.push(`in ${selectedCity}`);
    else if (selectedState !== "all") parts.push(`in ${selectedState}`);
    else parts.push("in India");
    return parts.join(" ");
  }, [selectedState, selectedCity]);

  const dynamicTitle = useMemo(() => {
    const cat = selectedCategory !== "all" ? (categories.find((c: any) => c.slug === selectedCategory)?.name + " " || "") : "";
    const location = selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "India";
    const mode = selectedMode !== "all" ? ` (${selectedMode})` : "";
    return `Best ${cat}MBA Coaching Institutes in ${location}${mode} 2026 | MBA Compass`;
  }, [selectedState, selectedCity, selectedMode, selectedCategory, categories]);

  const dynamicDescription = useMemo(() => {
    const location = selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "India";
    return `Compare ${filtered.length} MBA coaching institutes in ${location}. Ratings, fees, success rates, and reviews.`;
  }, [selectedState, selectedCity, filtered.length]);

  const totalInstitutes = allInstitutes.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-14 md:py-20"><div className="container mx-auto px-4 text-center"><Skeleton className="h-12 w-96 mx-auto bg-white/20" /></div></div>
        <div className="container mx-auto px-4 py-8 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={dynamicTitle}
        description={dynamicDescription}
        keywords={[
          "CAT coaching", "MBA preparation", "online MBA coaching", "exam training", "coaching institutes",
          "best CAT coaching institutes in India fees", "top online coaching for MBA entrance exams",
          "CAT coaching near me with reviews", "best coaching for GMAT and GRE in India",
          "weekend CAT coaching for working professionals", "free trial classes for MBA entrance coaching",
          "online study material for MBA entrance exams", "cheap MBA coaching classes online",
        ]}
        canonical={typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}${window.location.search}` : "https://mbacompass.in/coaching"}
      />


      {/* Hero */}
      <div className="relative py-10 md:py-16 overflow-hidden" style={{ background: 'hsl(207 90% 54%)' }}>
        {/* Dynamic blurred background image */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={getLocationImage(selectedCity !== "all" ? selectedCity : null, selectedState !== "all" ? selectedState : null)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105 opacity-80 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-10 right-10 w-32 h-32 border border-white/10 rounded-full" />
          <div className="absolute bottom-10 left-10 w-20 h-20 border border-white/10 rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Top bar: Back + Share */}
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
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-5 border border-white/10">
                <Award className="w-3.5 h-3.5 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">Updated for 2026 Season</span>
              </div>
              <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-4 tracking-tight leading-tight">
                {dynamicH1}
              </h1>
              <p className="text-primary-foreground/75 mb-6 max-w-2xl mx-auto text-base md:text-lg">
                Compare {totalInstitutes}+ coaching institutes — ratings, fees, success rates & student reviews
              </p>
            </motion.div>

            {/* Search bar in hero */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-2xl mx-auto mb-8">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search coaching by name, city, state..."
                  value={search}
                  onChange={(e) => setFilter("q", e.target.value)}
                  className="pl-13 pr-4 py-3 h-14 rounded-2xl bg-white/95 backdrop-blur-sm border-0 text-foreground shadow-2xl text-base focus:ring-2 focus:ring-white/30"
                />
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {[
                { label: "Total Institutes", value: `${totalInstitutes}+`, icon: Building2, color: "from-blue-500/20 to-blue-600/20" },
                { label: "Categories", value: String(categories.length), icon: Award, color: "from-amber-500/20 to-amber-600/20" },
                { label: "Cities", value: `${allCities.length}+`, icon: MapPin, color: "from-emerald-500/20 to-emerald-600/20" },
                { label: "States", value: `${states.length}+`, icon: GraduationCap, color: "from-purple-500/20 to-purple-600/20" },
              ].map((stat) => (
                <div key={stat.label} className={`bg-gradient-to-br ${stat.color} backdrop-blur-md rounded-2xl p-4 text-center border border-white/10`}>
                  <stat.icon className="w-5 h-5 text-primary-foreground/80 mx-auto mb-2" />
                  <p className="font-heading font-extrabold text-primary-foreground text-2xl">{stat.value}</p>
                  <p className="text-primary-foreground/60 text-xs">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Card */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-8 shadow-lg -mt-8 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Filter className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Filter & Search</span>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{filtered.length} results</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, city, or state..." value={search} onChange={(e) => setFilter("q", e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={selectedState} onValueChange={(v) => setFilter("state", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All States</SelectItem>{states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedCity} onValueChange={(v) => setFilter("city", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Cities</SelectItem>{citiesForState.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedMode} onValueChange={(v) => setFilter("mode", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Mode" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Modes</SelectItem>{modes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedFee} onValueChange={(v) => setFilter("fee", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Fees" /></SelectTrigger>
              <SelectContent>{FEE_BUCKETS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
            </Select>
            {specOptions.length > 0 && (
              <Select value={selectedSpec} onValueChange={(v) => setFilter("specialization", v)}>
                <SelectTrigger className="w-full sm:w-44 rounded-xl"><SelectValue placeholder="Specialization" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  {specOptions.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={sortBy} onValueChange={(v) => setFilter("sort", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="fees-low">Fees: Low to High</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="success">Success Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("category", "all")}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> All Coaching ({allInstitutes.length})
            </button>
            {categories.map((cat: any) => {
              const catCount = allInstitutes.filter((i: any) => i.category_id === cat.id).length;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setFilter("category", cat.slug)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat.slug
                      ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat.name} ({catCount})
                </button>
              );
            })}
          </div>

          {/* Active Filters Bar */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
              <span className="text-xs font-semibold text-muted-foreground">Active:</span>
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => removeFilter(f.key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {f.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Institute Cards */}
        <div className="space-y-5">
          {filtered.map((inst: any, i: number) => (
            <InstituteListingCard key={inst.id} inst={inst} index={i} rank={i + 1} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24 bg-card rounded-2xl border border-border">
            <Building2 className="w-16 h-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">No institutes found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search criteria</p>
            <button onClick={clearAllFilters} className="mt-4 text-sm text-primary font-medium hover:underline">Clear All Filters</button>
          </div>
        )}

        <PageKeywords contentType="static" recordId="coaching" fallbackKeywords={["MBA coaching India", "CAT coaching institutes", "best MBA coaching"]} />
      </div>
    </div>
  );
};

export default CoachingPage;
