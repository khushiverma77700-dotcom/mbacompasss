import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { MapPin, ArrowRight, GraduationCap, TrendingUp, Search, Filter, IndianRupee, Star, Award, Building2, ChevronRight, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useColleges } from "@/hooks/useInstitutes";
import { useCityPageBySlug, useCityPages } from "@/hooks/useCityPages";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";

const CollegeFilterPage = () => {
  const { region } = useParams<{ region: string }>();
  const { data: allColleges, isLoading: collegesLoading } = useColleges();
  const { data: cityPage, isLoading: pageLoading } = useCityPageBySlug(region);
  const { data: allCityPages } = useCityPages();
  const [sortBy, setSortBy] = useState("ranking");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const isLoading = collegesLoading || pageLoading;

  const matchCities = useMemo(() => {
    if (cityPage?.city_aliases?.length) return cityPage.city_aliases;
    return [(region || "").replace(/-/g, " ")];
  }, [cityPage, region]);

  const displayName = cityPage?.name || (region || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const filteredColleges = useMemo(() => {
    return (allColleges || []).filter(c => {
      const matchesRegion = matchCities.some(city =>
        (c.city || "").toLowerCase().includes(city.toLowerCase()) ||
        (c.state || "").toLowerCase().includes(city.toLowerCase())
      );
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      if (!matchesRegion || !matchesType) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "ranking") return (a.ranking || 999) - (b.ranking || 999);
      if (sortBy === "fees") return (parseInt((a.fees || "0").replace(/\D/g, "")) || 0) - (parseInt((b.fees || "0").replace(/\D/g, "")) || 0);
      return 0;
    });
  }, [allColleges, matchCities, typeFilter, sortBy, search]);

  const types = [...new Set((allColleges || []).map(c => c.type).filter(Boolean))];
  const otherPages = (allCityPages || []).filter(p => p.slug !== region);

  const metaTitle = cityPage?.meta_title || `Top MBA Colleges in ${displayName} 2026 — Fees, Rankings`;
  const metaDesc = cityPage?.meta_description || `Explore top MBA colleges in ${displayName} with fees, placements, and rankings.`;
  const keywords = cityPage?.keywords || [];
  const jsonLd = generateListingSchema(metaTitle, filteredColleges, "college");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-14"><div className="container mx-auto px-4 text-center"><Skeleton className="h-12 w-96 mx-auto bg-white/20" /></div></div>
        <div className="container mx-auto px-4 py-8 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={metaTitle} description={metaDesc} keywords={keywords} canonical={`${window.location.origin}/colleges/${region}`} jsonLd={jsonLd} />

      {/* Hero */}
      <div
        className="hero-gradient py-14 md:py-20 relative overflow-hidden"
        style={cityPage?.hero_image_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.7)), url(${cityPage.hero_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <nav className="flex items-center gap-1.5 text-xs text-primary-foreground/60 mb-5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-primary-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/colleges" className="hover:text-primary-foreground transition-colors">Colleges</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary-foreground">{displayName}</span>
          </nav>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4 border border-white/10">
              <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">{filteredColleges.length} Colleges in {displayName}</span>
            </div>
            <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-4 leading-tight">
              Top MBA Colleges in {displayName}
            </h1>
            {cityPage?.intro_content ? (
              <div className="text-primary-foreground/75 text-sm max-w-3xl prose-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: cityPage.intro_content }} />
            ) : (
              <p className="text-primary-foreground/75 max-w-2xl text-sm leading-relaxed">{metaDesc}</p>
            )}
          </motion.div>

          {keywords.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 mt-5">
              {keywords.slice(0, 6).map(kw => (
                <Badge key={kw} className="bg-white/10 text-primary-foreground border-white/15 text-xs backdrop-blur-sm">{kw}</Badge>
              ))}
            </motion.div>
          )}

          {/* Quick Stats */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3 max-w-md mt-6">
            {[
              { label: "Colleges", value: filteredColleges.length, icon: Building2 },
              { label: "Types", value: types.length, icon: Award },
              { label: "Avg Ranked", value: filteredColleges.filter(c => c.ranking).length, icon: TrendingUp },
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

      <div className="container mx-auto px-4 py-8">
        {/* Filter Bar */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-8 shadow-lg -mt-8 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Filter className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Refine Results</span>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{filteredColleges.length} found</span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search colleges..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="College Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ranking">Sort by Ranking</SelectItem>
                <SelectItem value="fees">Sort by Fees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* College listing */}
        {filteredColleges.length > 0 ? (
          <div className="space-y-4">
            {filteredColleges.map((college, i) => (
              <motion.div key={college.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <Link to={`/college/${college.slug}`} className="group block bg-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/20 overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex items-center gap-4 p-5 sm:w-72 flex-shrink-0">
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-12 h-12 rounded-2xl hero-gradient flex items-center justify-center text-primary-foreground font-extrabold text-base shadow-lg">
                          #{college.ranking || "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        {college.logo_url ? (
                          <img src={college.logo_url} alt={college.name} className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border border-border flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm">
                            {college.name}
                          </h2>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" /> {college.city}, {college.state}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 p-5 sm:border-l border-t sm:border-t-0 border-border bg-muted/20">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><IndianRupee className="w-3 h-3" /> Fees</span>
                        <p className="text-sm font-bold text-foreground">{college.fees || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><TrendingUp className="w-3 h-3" /> Avg CTC</span>
                        <p className="text-sm font-bold text-primary">{college.placement_avg || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><Star className="w-3 h-3" /> Highest</span>
                        <p className="text-sm font-bold text-foreground">{college.placement_highest || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><Briefcase className="w-3 h-3" /> Type</span>
                        <Badge variant="outline" className="text-[10px] py-0">{college.type}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-center p-5 sm:border-l border-t sm:border-t-0 border-border sm:w-32 flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                        <ArrowRight className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <GraduationCap className="w-16 h-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">No colleges found</h3>
            <p className="text-muted-foreground text-sm">No colleges found for {displayName}. Colleges will appear once assigned to this city/state.</p>
          </div>
        )}

        {/* Admin content */}
        {cityPage?.detailed_content && (
          <div className="mt-12 bg-card rounded-2xl border border-border p-8 shadow-sm prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: cityPage.detailed_content }} />
        )}
        {cityPage?.faq_content && (
          <div className="mt-8 bg-card rounded-2xl border border-border p-8 shadow-sm prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: cityPage.faq_content }} />
        )}
        {!cityPage?.detailed_content && !cityPage?.faq_content && (
          <div className="mt-12 bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h2 className="font-heading font-bold text-foreground text-xl mb-3">About MBA Colleges in {displayName}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {metaDesc} Our comprehensive listing covers fees, placement statistics, admission processes, and cutoff information.
              Use our filters to find the perfect MBA college matching your budget and career goals.
            </p>
          </div>
        )}

        {/* Related pages */}
        {otherPages.length > 0 && (
          <div className="mt-10 bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">Explore Other Regions</h3>
            <p className="text-sm text-muted-foreground mb-5">Find MBA colleges in other cities and states across India</p>
            <div className="flex flex-wrap gap-2">
              {otherPages.map(p => (
                <Link key={p.slug} to={`/colleges/${p.slug}`}>
                  <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-all duration-200 cursor-pointer py-1.5 px-3 text-xs">
                    <MapPin className="w-3 h-3 mr-1" /> {p.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollegeFilterPage;
