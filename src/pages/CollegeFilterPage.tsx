import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useRef } from "react";
import { MapPin, ArrowRight, GraduationCap, TrendingUp, Search, Filter, IndianRupee, Star, Award, Building2, ChevronRight, Briefcase, Users, BookOpen, Calendar, CheckCircle2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useColleges } from "@/hooks/useInstitutes";
import { useCityPageBySlug, useCityPages } from "@/hooks/useCityPages";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import PageKeywords from "@/components/PageKeywords";
import AIGistSection from "@/components/AIGistSection";

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
  const { seo: resolvedSeo } = useResolvedSeo("cityPage", cityPage?.id, {
    title: metaTitle,
    description: metaDesc,
    keywords,
    canonical: region ? `${window.location.origin}/colleges/${region}` : undefined,
    jsonLd,
    ogImage: cityPage?.hero_image_url || undefined,
  });

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
      <SEOHead {...resolvedSeo} />

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
        {/* AI Gist */}
        <AIGistSection
          content={`${displayName} MBA Colleges. ${cityPage?.intro_content || ""} ${cityPage?.detailed_content || ""} ${filteredColleges.map(c => `${c.name}: Rank ${c.ranking}, Fees ${c.fees}, Placement ${c.placement_avg}`).join(". ")}`}
          pageType="city"
          pageId={cityPage?.id}
          onScrollToContent={() => document.getElementById("college-list")?.scrollIntoView({ behavior: "smooth" })}
        />
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

        {/* Enhanced College Cards */}
        {filteredColleges.length > 0 ? (
          <div className="space-y-5">
            {filteredColleges.map((college, i) => (
              <motion.div key={college.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <Link to={`/college/${college.slug}`} className="group block bg-card rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 border border-border hover:border-primary/30 overflow-hidden">
                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Rank + College Identity */}
                    <div className="flex items-start gap-4 p-5 lg:p-6 lg:w-[340px] flex-shrink-0">
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-lg relative">
                          #{college.ranking || "—"}
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                            <Star className="w-3 h-3 text-amber-900 fill-amber-900" />
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">NIRF</span>
                      </div>
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {college.logo_url ? (
                          <img src={college.logo_url} alt={college.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-border flex-shrink-0 shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-[15px] leading-snug">
                            {college.name}
                          </h2>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3 text-primary/60" /> {college.city}, {college.state}
                          </div>
                          <div className="flex items-center flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 border-primary/20 text-primary">{college.type}</Badge>
                            {college.established && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" /> Est. {college.established}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center: Key Metrics Grid */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0 border-t lg:border-t-0 lg:border-l border-border bg-muted/20 divide-x divide-y lg:divide-y-0 divide-border/50">
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                          <IndianRupee className="w-3 h-3" /> Total Fees
                        </span>
                        <p className="text-sm font-bold text-foreground">{college.fees || "—"}</p>
                        <span className="text-[9px] text-muted-foreground mt-0.5">Full Program</span>
                      </div>
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                          <TrendingUp className="w-3 h-3" /> Avg Package
                        </span>
                        <p className="text-sm font-bold text-primary">{college.placement_avg || "—"}</p>
                        <span className="text-[9px] text-muted-foreground mt-0.5">Per Annum</span>
                      </div>
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                          <Star className="w-3 h-3" /> Highest CTC
                        </span>
                        <p className="text-sm font-bold text-foreground">{college.placement_highest || "—"}</p>
                        <span className="text-[9px] text-muted-foreground mt-0.5">Placement Record</span>
                      </div>
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                          <Users className="w-3 h-3" /> Students
                        </span>
                        <p className="text-sm font-bold text-foreground">{college.total_students ? `${college.total_students}+` : "—"}</p>
                        <span className="text-[9px] text-muted-foreground mt-0.5">Batch Size</span>
                      </div>
                      <div className="p-4 flex flex-col justify-center col-span-2 md:col-span-1">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                          <BookOpen className="w-3 h-3" /> Exams Accepted
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(college.exams_accepted || []).slice(0, 3).map((exam: string) => (
                            <Badge key={exam} variant="secondary" className="text-[9px] font-semibold py-0 px-1.5 h-5">{exam}</Badge>
                          ))}
                          {(college.exams_accepted || []).length > 3 && (
                            <Badge variant="secondary" className="text-[9px] font-semibold py-0 px-1.5 h-5">+{(college.exams_accepted || []).length - 3}</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Accreditations + CTA */}
                    <div className="flex items-center justify-center p-5 lg:p-6 border-t lg:border-t-0 lg:border-l border-border lg:w-40 flex-shrink-0 bg-gradient-to-br from-primary/5 to-transparent">
                      <div className="flex flex-col items-center gap-3 text-center">
                        {college.accreditations && college.accreditations.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mb-1">
                            {college.accreditations.slice(0, 3).map((acc: string) => (
                              <span key={acc} className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md uppercase">{acc}</span>
                            ))}
                          </div>
                        )}
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                          <ArrowRight className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                        </div>
                        <span className="text-[11px] text-primary font-bold group-hover:underline">View Details</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Courses + Top Recruiters (only on hover / always visible on mobile) */}
                  {(college.courses?.length || college.top_recruiters?.length) && (
                    <div className="border-t border-border/50 px-5 py-3 bg-muted/30 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
                      {college.courses && college.courses.length > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <GraduationCap className="w-3 h-3 text-primary/50" />
                          <span className="font-semibold">Courses:</span>
                          <span>{college.courses.slice(0, 3).join(", ")}{college.courses.length > 3 ? ` +${college.courses.length - 3} more` : ""}</span>
                        </div>
                      )}
                      {college.top_recruiters && college.top_recruiters.length > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Briefcase className="w-3 h-3 text-primary/50" />
                          <span className="font-semibold">Recruiters:</span>
                          <span>{college.top_recruiters.slice(0, 4).join(", ")}{college.top_recruiters.length > 4 ? ` +${college.top_recruiters.length - 4}` : ""}</span>
                        </div>
                      )}
                    </div>
                  )}
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

        {/* Page Keywords */}
        {cityPage?.id && (
          <PageKeywords contentType="cityPage" recordId={cityPage.id} fallbackKeywords={keywords} />
        )}
      </div>
    </div>
  );
};

export default CollegeFilterPage;