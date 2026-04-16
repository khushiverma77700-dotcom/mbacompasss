import { useParams, Link } from "react-router-dom";
import { getLocationImage, isGeneratedBanner } from "@/data/cityImages";
import { useState, useMemo } from "react";
import { MapPin, ArrowRight, GraduationCap, TrendingUp, Search, Filter, Star, Award, Building2, Users, Monitor, Building, Wifi, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstitutes, useCategories } from "@/hooks/useInstitutes";
import { useCityPageBySlug, useCityPages } from "@/hooks/useCityPages";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import PageKeywords from "@/components/PageKeywords";
import AIGistSection from "@/components/AIGistSection";

const modes = ["Online", "Offline", "Hybrid"];

const CoachingFilterPage = () => {
  const { region } = useParams<{ region: string }>();
  const { data: allInstitutes = [], isLoading: institutesLoading } = useInstitutes();
  const { data: categories = [] } = useCategories();
  const { data: cityPage, isLoading: pageLoading } = useCityPageBySlug(region);
  const { data: allCityPages } = useCityPages();
  const [sortBy, setSortBy] = useState("rating");
  const [modeFilter, setModeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const isLoading = institutesLoading || pageLoading;

  const matchCities = useMemo(() => {
    if (cityPage?.city_aliases?.length) return cityPage.city_aliases;
    return [(region || "").replace(/-/g, " ")];
  }, [cityPage, region]);

  const displayName = cityPage?.name || (region || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const filteredInstitutes = useMemo(() => {
    return allInstitutes.filter((inst: any) => {
      const matchesRegion = matchCities.some(city =>
        (inst.city || "").toLowerCase().includes(city.toLowerCase()) ||
        (inst.state || "").toLowerCase().includes(city.toLowerCase())
      );
      const matchesMode = modeFilter === "all" || inst.mode === modeFilter;
      const matchesCategory = categoryFilter === "all" || (() => {
        const cat = categories.find((c: any) => c.slug === categoryFilter);
        return cat ? inst.category_id === cat.id : false;
      })();
      if (!matchesRegion || !matchesMode || !matchesCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return inst.name.toLowerCase().includes(q) || (inst.city || "").toLowerCase().includes(q);
      }
      return true;
    }).sort((a: any, b: any) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "reviews") return (b.total_reviews || 0) - (a.total_reviews || 0);
      if (sortBy === "success") return (b.success_rate || 0) - (a.success_rate || 0);
      return 0;
    });
  }, [allInstitutes, matchCities, modeFilter, categoryFilter, sortBy, search, categories]);

  const otherPages = (allCityPages || []).filter(p => p.slug !== region);

  const metaTitle = cityPage?.meta_title || `Best MBA Coaching Institutes in ${displayName} 2026 — Fees, Reviews`;
  const metaDesc = cityPage?.meta_description || `Explore top MBA coaching institutes in ${displayName} with fees, ratings, success rates, and student reviews.`;
  const keywords = cityPage?.keywords || [];
  const jsonLd = generateListingSchema(metaTitle, filteredInstitutes, "institute");
  const { seo: resolvedSeo } = useResolvedSeo("cityPage", cityPage?.id, {
    title: metaTitle,
    description: metaDesc,
    keywords,
    canonical: region ? `${window.location.origin}/coaching/${region}` : undefined,
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
        className="py-14 md:py-20 relative overflow-hidden"
        style={{
          backgroundImage: (() => {
            const adminImg = cityPage?.hero_image_url && !isGeneratedBanner(cityPage.hero_image_url) ? cityPage.hero_image_url : null;
            const img = adminImg || getLocationImage(displayName, cityPage?.state);
            return `linear-gradient(to bottom, rgba(44,24,16,0.6), rgba(61,35,23,0.75)), url(${img})`;
          })(),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Link to="/coaching" className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> All Coaching
            </Link>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium transition-colors bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4 border border-white/10">
              <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">{filteredInstitutes.length} Coaching Institutes in {displayName}</span>
            </div>
            <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-4 leading-tight">
              Best MBA Coaching in {displayName}
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
              { label: "Institutes", value: filteredInstitutes.length, icon: Building2 },
              { label: "Categories", value: categories.length, icon: Award },
              { label: "Avg Rated", value: filteredInstitutes.filter((i: any) => i.rating).length, icon: Star },
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
          content={`${displayName} MBA Coaching Institutes. ${cityPage?.intro_content || ""} ${cityPage?.detailed_content || ""} ${filteredInstitutes.map((i: any) => `${i.name}: Rating ${i.rating}, Success Rate ${i.success_rate}%`).join(". ")}`}
          pageType="city"
          pageId={cityPage?.id}
          onScrollToContent={() => document.getElementById("institute-list")?.scrollIntoView({ behavior: "smooth" })}
        />

        {/* Filter Bar */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-8 shadow-lg -mt-8 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Filter className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Refine Results</span>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{filteredInstitutes.length} found</span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search coaching institutes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                {modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat: any) => <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Sort by Rating</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="success">Success Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Institute Cards */}
        {filteredInstitutes.length > 0 ? (
          <div id="institute-list" className="space-y-4">
            {filteredInstitutes.map((inst: any, i: number) => (
              <motion.div key={inst.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <Link to={`/institute/${inst.slug}`} className="group block bg-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/20 overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left: Identity */}
                    <div className="flex items-center gap-4 p-5 sm:w-80 flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-lg">
                        {inst.logo_url ? (
                          <img src={inst.logo_url} alt={inst.name} className="w-10 h-10 rounded-xl object-contain" />
                        ) : (
                          <span className="font-bold text-lg">{inst.name?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-base">
                          {inst.name}
                        </h2>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" /> {inst.city}{inst.state ? `, ${inst.state}` : ""}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                            {inst.mode === "Online" ? <Monitor className="w-2.5 h-2.5 mr-0.5" /> : inst.mode === "Hybrid" ? <Wifi className="w-2.5 h-2.5 mr-0.5" /> : <Building className="w-2.5 h-2.5 mr-0.5" />}
                            {inst.mode}
                          </Badge>
                          {inst.featured && <Badge className="text-[10px] py-0 px-1.5 h-5 bg-amber-100 text-amber-800 border-amber-200">Featured</Badge>}
                        </div>
                      </div>
                    </div>

                    {/* Center: Key Metrics */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:border-l border-t sm:border-t-0 border-border bg-muted/20">
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><Star className="w-3 h-3" /> Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <p className="text-sm font-bold text-foreground">{inst.rating || "—"}</p>
                          <span className="text-[10px] text-muted-foreground">({inst.total_reviews || 0})</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><TrendingUp className="w-3 h-3" /> Success Rate</span>
                        <p className="text-sm font-bold text-primary">{inst.success_rate ? `${inst.success_rate}%` : "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><Users className="w-3 h-3" /> Students</span>
                        <p className="text-sm font-bold text-foreground">{inst.students_count ? `${inst.students_count}+` : "—"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold"><GraduationCap className="w-3 h-3" /> Courses</span>
                        <div className="flex flex-wrap gap-1">
                          {(inst.courses || []).slice(0, 2).map((c: any) => (
                            <Badge key={c.id} variant="secondary" className="text-[10px] font-medium py-0">{c.name}</Badge>
                          ))}
                          {(inst.courses || []).length > 2 && (
                            <Badge variant="secondary" className="text-[10px] font-medium py-0">+{inst.courses.length - 2}</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: CTA */}
                    <div className="flex items-center justify-center p-5 sm:border-l border-t sm:border-t-0 border-border sm:w-36 flex-shrink-0 bg-muted/10">
                      <div className="flex flex-col items-center gap-2 text-center">
                        {inst.courses?.[0]?.fees && (
                          <span className="font-heading font-bold text-primary text-sm">
                            Starting {Number(inst.courses[0].fees).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                          </span>
                        )}
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
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <Building2 className="w-16 h-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">No coaching institutes found</h3>
            <p className="text-muted-foreground text-sm">No coaching institutes found for {displayName}. Institutes will appear once assigned to this city/state.</p>
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
            <h2 className="font-heading font-bold text-foreground text-xl mb-3">About MBA Coaching in {displayName}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {metaDesc} Our comprehensive listing covers fees, success rates, faculty, and student reviews.
              Use our filters to find the perfect coaching institute matching your preparation needs.
            </p>
          </div>
        )}

        {/* Related pages */}
        {otherPages.length > 0 && (
          <div className="mt-10 bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h3 className="font-heading font-bold text-foreground text-lg mb-2">Explore Other Regions</h3>
            <p className="text-sm text-muted-foreground mb-5">Find MBA coaching institutes in other cities and states across India</p>
            <div className="flex flex-wrap gap-2">
              {otherPages.map(p => (
                <Link key={p.slug} to={`/coaching/${p.slug}`}>
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

export default CoachingFilterPage;
