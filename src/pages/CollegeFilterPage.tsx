import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { MapPin, ArrowRight, Filter, GraduationCap, TrendingUp, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

  // Build match list from city_aliases or fallback to slug
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
        <div className="hero-gradient py-10 md:py-14"><div className="container mx-auto px-4 text-center"><Skeleton className="h-10 w-96 mx-auto" /></div></div>
        <div className="container mx-auto px-4 py-8 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={metaTitle}
        description={metaDesc}
        keywords={keywords}
        canonical={`${window.location.origin}/colleges/${region}`}
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <div className="hero-gradient py-10 md:py-14" style={cityPage?.hero_image_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.7)), url(${cityPage.hero_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <div className="container mx-auto px-4">
          <nav className="text-primary-foreground/60 text-xs mb-4">
            <Link to="/" className="hover:text-primary-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/colleges" className="hover:text-primary-foreground">Colleges</Link>
            <span className="mx-2">/</span>
            <span className="text-primary-foreground">{displayName}</span>
          </nav>
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-3">
            Top MBA Colleges in {displayName}
          </h1>
          {cityPage?.intro_content ? (
            <div className="text-primary-foreground/80 text-sm max-w-3xl prose-sm" dangerouslySetInnerHTML={{ __html: cityPage.intro_content }} />
          ) : (
            <p className="text-primary-foreground/80 max-w-2xl text-sm">{metaDesc}</p>
          )}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {keywords.slice(0, 6).map(kw => (
                <Badge key={kw} className="bg-primary-foreground/15 text-primary-foreground border-none text-xs">{kw}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search colleges..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="College Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ranking">Sort by Ranking</SelectItem>
              <SelectItem value="fees">Sort by Fees</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{filteredColleges.length} colleges found</span>
        </div>

        {/* College listing */}
        {filteredColleges.length > 0 ? (
          <div className="space-y-4">
            {filteredColleges.map((college, i) => (
              <motion.div key={college.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link to={`/college/${college.slug}`}>
                  <Card className="hover:border-primary/40 transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                          {college.logo_url ? (
                            <img src={college.logo_url} alt={college.name} className="w-full h-full rounded-lg object-contain p-0.5" />
                          ) : (
                            college.ranking ? `#${college.ranking}` : college.name.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h2 className="font-heading font-semibold text-foreground text-lg">{college.name}</h2>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {college.city}, {college.state}</span>
                                <Badge variant="secondary" className="text-xs">{college.type}</Badge>
                                {college.established && <span>Est. {college.established}</span>}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                          </div>
                          <div className="flex flex-wrap gap-4 mt-3">
                            {college.fees && <div className="text-sm"><span className="text-muted-foreground">Fees: </span><span className="font-semibold text-foreground">{college.fees}</span></div>}
                            {college.placement_avg && <div className="text-sm flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-primary" /><span className="text-muted-foreground">Avg: </span><span className="font-semibold text-foreground">{college.placement_avg}</span></div>}
                            {college.placement_highest && <div className="text-sm"><span className="text-muted-foreground">Highest: </span><span className="font-semibold text-primary">{college.placement_highest}</span></div>}
                            {(college.exams_accepted || []).length > 0 && (
                              <div className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                                {(college.exams_accepted || []).slice(0, 3).map((e: string) => <Badge key={e} variant="outline" className="text-xs py-0">{e}</Badge>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No colleges found for {displayName}. Colleges will appear here once assigned to this city/state.</p>
          </div>
        )}

        {/* Detailed content from admin */}
        {cityPage?.detailed_content && (
          <div className="mt-12 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: cityPage.detailed_content }} />
        )}

        {/* FAQ content from admin */}
        {cityPage?.faq_content && (
          <div className="mt-8 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: cityPage.faq_content }} />
        )}

        {/* Fallback SEO content when no admin content */}
        {!cityPage?.detailed_content && !cityPage?.faq_content && (
          <div className="mt-12 prose prose-sm max-w-none dark:prose-invert">
            <h2 className="font-heading">About MBA Colleges in {displayName}</h2>
            <p className="text-muted-foreground">
              {metaDesc} Our comprehensive listing covers fees, placement statistics, admission processes, and cutoff information.
              Use our filters to find the perfect MBA college matching your budget and career goals.
            </p>
          </div>
        )}

        {/* Related pages */}
        {otherPages.length > 0 && (
          <div className="mt-8 border-t border-border pt-8">
            <h3 className="font-heading font-semibold text-foreground mb-4">Explore Other Regions</h3>
            <div className="flex flex-wrap gap-2">
              {otherPages.map(p => (
                <Link key={p.slug} to={`/colleges/${p.slug}`}>
                  <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer py-1.5 px-3">
                    {p.name}
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
