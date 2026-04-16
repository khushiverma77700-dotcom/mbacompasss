import { useState, useMemo, useCallback, useEffect } from "react";
import { INDIAN_STATES, getCitiesForState } from "@/data/indianLocations";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Search, Users, IndianRupee, TrendingUp, GraduationCap, Award, ChevronRight, ArrowRight, Building2, Filter, Star, Briefcase, CheckCircle2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useColleges } from "@/hooks/useInstitutes";
import { useCityPages } from "@/hooks/useCityPages";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";
import PageKeywords from "@/components/PageKeywords";

const tabs = [
  { label: "All Colleges", type: "all", icon: Building2 },
  { label: "IIMs", type: "IIM", icon: Award },
  { label: "Top Management", type: "Top Management", icon: TrendingUp },
  { label: "PGDM", type: "PGDM", icon: GraduationCap },
  { label: "University", type: "University", icon: Building2 },
];

const CollegesPage = () => {
  const { data: colleges = [], isLoading } = useColleges();
  const { data: cityPages } = useCityPages();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL params (single source of truth)
  const activeTab = searchParams.get("type") || "all";
  const search = searchParams.get("q") || "";
  const selectedCity = searchParams.get("city") || "all";
  const selectedState = searchParams.get("state") || "all";
  const selectedExam = searchParams.get("exam") || "all";
  const sortBy = searchParams.get("sort") || "ranking";

  // Helper to update URL params without full reload
  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === "all" || value === "" || value === "ranking") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      // Reset city when state changes
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

  const collegeCities = useMemo(() => [...new Set(colleges.map((c: any) => c.city).filter(Boolean))].sort() as string[], [colleges]);
  const collegeStates = useMemo(() => INDIAN_STATES.filter(s => colleges.some((c: any) => c.state === s)), [colleges]);
  const collegeCitiesForState = useMemo(() => selectedState !== "all" ? getCitiesForState(selectedState).filter(c => colleges.some((col: any) => col.city === c)) : [...new Set(colleges.map((c: any) => c.city).filter(Boolean))].sort() as string[], [colleges, selectedState]);
  const allExams = useMemo(() => [...new Set(colleges.flatMap((c: any) => c.exams_accepted || []))].sort() as string[], [colleges]);

  const filtered = useMemo(() => {
    let result = colleges.filter((c: any) => {
      if (activeTab !== "all" && c.type !== activeTab) return false;
      if (selectedCity !== "all" && c.city !== selectedCity) return false;
      if (selectedState !== "all" && c.state !== selectedState) return false;
      if (selectedExam !== "all" && !(c.exams_accepted || []).includes(selectedExam)) return false;
      if (search) { const q = search.toLowerCase(); return c.name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q); }
      return true;
    });
    if (sortBy === "fees") result = [...result].sort((a: any, b: any) => parseInt((a.fees || "0").replace(/[^\d]/g, "")) - parseInt((b.fees || "0").replace(/[^\d]/g, "")));
    return result;
  }, [colleges, activeTab, search, selectedCity, selectedState, selectedExam, sortBy]);

  const regions = (cityPages || []).slice(0, 12);
  const totalColleges = colleges.length;
  const iimCount = colleges.filter((c: any) => c.type === "IIM").length;

  // Active filters for chips display
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; value: string }[] = [];
    if (activeTab !== "all") chips.push({ key: "type", label: tabs.find(t => t.type === activeTab)?.label || activeTab, value: activeTab });
    if (selectedState !== "all") chips.push({ key: "state", label: selectedState, value: selectedState });
    if (selectedCity !== "all") chips.push({ key: "city", label: selectedCity, value: selectedCity });
    if (selectedExam !== "all") chips.push({ key: "exam", label: selectedExam, value: selectedExam });
    if (search) chips.push({ key: "q", label: `"${search}"`, value: search });
    return chips;
  }, [activeTab, selectedState, selectedCity, selectedExam, search]);

  // Dynamic SEO based on filters
  const dynamicTitle = useMemo(() => {
    const parts = ["Top"];
    if (activeTab !== "all") parts.push(tabs.find(t => t.type === activeTab)?.label || "");
    parts.push("MBA Colleges");
    if (selectedCity !== "all") parts.push(`in ${selectedCity}`);
    else if (selectedState !== "all") parts.push(`in ${selectedState}`);
    else parts.push("in India");
    if (selectedExam !== "all") parts.push(`accepting ${selectedExam}`);
    return `${parts.join(" ")} 2026 — Fees, Rankings, Placements | BSchoolBuzz.com`;
  }, [activeTab, selectedState, selectedCity, selectedExam]);

  const dynamicDescription = useMemo(() => {
    const location = selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "India";
    const type = activeTab !== "all" ? (tabs.find(t => t.type === activeTab)?.label || "") + " " : "";
    const exam = selectedExam !== "all" ? ` accepting ${selectedExam}` : "";
    return `Explore ${filtered.length} ${type}MBA colleges in ${location}${exam} with rankings, fees, placements, and admission details.`;
  }, [activeTab, selectedState, selectedCity, selectedExam, filtered.length]);

  const jsonLd = generateListingSchema(dynamicTitle, filtered, "college");

  // Dynamic H1
  const dynamicH1 = useMemo(() => {
    const parts = ["Top"];
    if (activeTab !== "all") parts.push(tabs.find(t => t.type === activeTab)?.label || "");
    parts.push("MBA Colleges");
    if (selectedCity !== "all") parts.push(`in ${selectedCity}`);
    else if (selectedState !== "all") parts.push(`in ${selectedState}`);
    else parts.push("in India");
    return parts.join(" ");
  }, [activeTab, selectedState, selectedCity]);

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
        keywords={["top MBA colleges India", "best B-schools India", "MBA college rankings", "IIM fees placements"]}
        canonical="https://bschoolbuzz.com/colleges"
        jsonLd={jsonLd}
      />

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 pt-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /><span className="text-foreground font-medium">Colleges</span></li>
        </ol>
      </nav>

      {/* Hero */}
      <div className="hero-gradient py-14 md:py-20 mt-2 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <pattern id="dots2" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="1" fill="white" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#dots2)" />
          </svg>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-5 border border-white/10">
              <Award className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">Updated for 2026 Admissions</span>
            </div>
            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-4 tracking-tight leading-tight">
              {dynamicH1}
            </h1>
          </motion.div>

          {/* Quick Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-8">
            {[
              { label: "Total Colleges", value: `${totalColleges}+`, icon: Building2, color: "from-blue-500/20 to-blue-600/20" },
              { label: "IIMs Listed", value: String(iimCount), icon: Award, color: "from-amber-500/20 to-amber-600/20" },
              { label: "Cities Covered", value: `${collegeCities.length}+`, icon: MapPin, color: "from-emerald-500/20 to-emerald-600/20" },
              { label: "Exams Tracked", value: `${allExams.length}+`, icon: GraduationCap, color: "from-purple-500/20 to-purple-600/20" },
            ].map((stat) => (
              <div key={stat.label} className={`bg-gradient-to-br ${stat.color} backdrop-blur-md rounded-2xl p-4 text-center border border-white/10`}>
                <stat.icon className="w-5 h-5 text-primary-foreground/80 mx-auto mb-2" />
                <p className="font-heading font-extrabold text-primary-foreground text-2xl">{stat.value}</p>
                <p className="text-primary-foreground/60 text-xs">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Region badges */}
          {regions.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-2">
              {regions.map(r => (
                <Link key={r.slug} to={`/colleges/${r.slug}`}>
                  <Badge className="bg-white/10 text-primary-foreground border-white/15 hover:bg-white/20 cursor-pointer px-3 py-1.5 transition-all duration-200 backdrop-blur-sm">
                    <MapPin className="w-3 h-3 mr-1" /> {r.name}
                  </Badge>
                </Link>
              ))}
            </motion.div>
          )}
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
              <Input placeholder="Search by college name or city..." value={search} onChange={(e) => setFilter("q", e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={selectedState} onValueChange={(v) => setFilter("state", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All States</SelectItem>{collegeStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedCity} onValueChange={(v) => setFilter("city", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Cities</SelectItem>{collegeCitiesForState.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedExam} onValueChange={(v) => setFilter("exam", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Exam" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Exams</SelectItem>{allExams.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setFilter("sort", v)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ranking">By Ranking</SelectItem>
                <SelectItem value="fees">By Fees (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.type}
                  onClick={() => setFilter("type", tab.type)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.type
                      ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
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
              <button
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* College Cards */}
        <div className="space-y-4">
          {filtered.map((college: any, i: number) => (
            <motion.div
              key={college.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link
                to={`/college/${college.slug}`}
                className="group block bg-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/20 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Left: Rank + Info */}
                  <div className="flex items-center gap-4 p-5 sm:w-80 flex-shrink-0">
                    {/* Rank Badge */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {college.ranking && <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Rank</span>}
                      <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-lg">
                        #{college.ranking || "—"}
                      </div>
                    </div>
                    {/* Logo + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {college.logo_url ? (
                        <img src={college.logo_url} alt={college.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-border flex-shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-base">
                          {college.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" /> {college.city}{college.state ? `, ${college.state}` : ""}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">{college.type}</Badge>
                          {college.established && <span className="text-[10px] text-muted-foreground">Est. {college.established}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center: Key Metrics */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:border-l border-t sm:border-t-0 border-border bg-muted/20">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><IndianRupee className="w-3 h-3" /> Total Fees</span>
                      <p className="text-sm font-bold text-foreground">{college.fees || "—"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><TrendingUp className="w-3 h-3" /> Avg CTC</span>
                      <p className="text-sm font-bold text-primary">{college.placement_avg || "—"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><Star className="w-3 h-3" /> Highest CTC</span>
                      <p className="text-sm font-bold text-foreground">{college.placement_highest || "—"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><Briefcase className="w-3 h-3" /> Exams</span>
                      <div className="flex flex-wrap gap-1">
                        {(college.exams_accepted || []).slice(0, 2).map((exam: string) => (
                          <Badge key={exam} variant="secondary" className="text-[10px] font-medium py-0">{exam}</Badge>
                        ))}
                        {(college.exams_accepted || []).length > 2 && (
                          <Badge variant="secondary" className="text-[10px] font-medium py-0">+{(college.exams_accepted || []).length - 2}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <div className="flex items-center justify-center p-5 sm:border-l border-t sm:border-t-0 border-border sm:w-36 flex-shrink-0 bg-muted/10">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <ArrowRight className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <span className="text-xs text-primary font-bold">View Details</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24 bg-card rounded-2xl border border-border">
            <GraduationCap className="w-16 h-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">No colleges found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search criteria</p>
          </div>
        )}

        {/* Browse by City */}
        {regions.length > 0 && (
          <div className="mt-14 bg-card rounded-2xl border border-border p-8 shadow-lg">
            <h2 className="font-heading font-bold text-xl text-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Browse Colleges by City
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Find the best MBA colleges in your preferred city</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {regions.map(r => (
                <Link
                  key={r.slug}
                  to={`/colleges/${r.slug}`}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all duration-200 text-sm font-medium text-foreground group border border-transparent hover:border-primary/20"
                >
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  <span className="truncate">{r.name}</span>
                  <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground group-hover:text-primary flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <PageKeywords contentType="static" recordId="colleges" fallbackKeywords={["top MBA colleges India", "best B-schools", "IIM fees placements", "MBA college rankings"]} />
      </div>
    </div>
  );
};

export default CollegesPage;
