import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { MapPin, Star, ArrowRight, Filter, GraduationCap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useColleges } from "@/hooks/useInstitutes";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";

const regionData: Record<string, { title: string; description: string; longTail: string[] }> = {
  "delhi-ncr": {
    title: "Top MBA Colleges in Delhi NCR 2025",
    description: "Explore the best MBA colleges in Delhi NCR with detailed fees, placements, rankings, and admission process. Compare top B-schools in Delhi, Noida, Gurgaon, and Greater Noida.",
    longTail: ["best MBA colleges in Delhi NCR", "top MBA colleges in New Delhi", "MBA colleges in Noida with good placements", "affordable MBA in Gurgaon"],
  },
  "mumbai": {
    title: "Top MBA Colleges in Mumbai 2025",
    description: "Find the best MBA colleges in Mumbai with fees, placements, and rankings. Compare JBIMS, SP Jain, and other top B-schools in Mumbai, Navi Mumbai and Thane.",
    longTail: ["best MBA colleges in Mumbai", "top business schools Mumbai", "MBA colleges in Mumbai with placements", "affordable MBA in Mumbai"],
  },
  "bangalore": {
    title: "Top MBA Colleges in Bangalore 2025",
    description: "Discover top MBA colleges in Bangalore with detailed fees, placements, and admission process. Compare IIM Bangalore, IIMB, Christ University and more.",
    longTail: ["best MBA colleges in Bangalore", "top B-schools Bangalore", "MBA colleges in Bangalore under 10 lakhs"],
  },
  "pune": {
    title: "Top MBA Colleges in Pune 2025",
    description: "Explore best MBA colleges in Pune including SIBM, Symbiosis and more. Detailed fees, placements, rankings and admission details.",
    longTail: ["best MBA colleges in Pune", "top MBA Pune placements", "MBA in Pune fees structure"],
  },
  "hyderabad": {
    title: "Top MBA Colleges in Hyderabad 2025",
    description: "Find top MBA colleges in Hyderabad with fees, placements, and admission details. ISB Hyderabad, ICFAI and more.",
    longTail: ["best MBA colleges in Hyderabad", "top B-schools Hyderabad", "MBA Hyderabad placements"],
  },
  "kolkata": {
    title: "Top MBA Colleges in Kolkata 2025",
    description: "Explore best MBA colleges in Kolkata. IIM Calcutta, XLRI nearby, IISWBM and more with fees and placement details.",
    longTail: ["best MBA colleges in Kolkata", "top B-schools West Bengal", "MBA Kolkata fees"],
  },
  "maharashtra": {
    title: "Top MBA Colleges in Maharashtra 2025",
    description: "Complete list of top MBA colleges in Maharashtra including Mumbai, Pune, Nagpur. Fees, rankings, placements details.",
    longTail: ["best MBA colleges in Maharashtra", "MBA Maharashtra state", "top B-schools Maharashtra"],
  },
  "karnataka": {
    title: "Top MBA Colleges in Karnataka 2025",
    description: "Find best MBA colleges in Karnataka state. IIM Bangalore, Christ University, and other top B-schools.",
    longTail: ["best MBA colleges in Karnataka", "MBA Karnataka placements", "B-schools Bangalore Karnataka"],
  },
};

const cityMapping: Record<string, string[]> = {
  "delhi-ncr": ["Delhi", "New Delhi", "Noida", "Gurgaon", "Gurugram", "Greater Noida", "Faridabad", "Ghaziabad"],
  "mumbai": ["Mumbai", "Navi Mumbai", "Thane"],
  "bangalore": ["Bangalore", "Bengaluru"],
  "pune": ["Pune"],
  "hyderabad": ["Hyderabad"],
  "kolkata": ["Kolkata"],
  "maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Navi Mumbai", "Thane"],
  "karnataka": ["Bangalore", "Bengaluru", "Mysore", "Mangalore"],
};

const CollegeFilterPage = () => {
  const { region } = useParams<{ region: string }>();
  const { data: allColleges, isLoading } = useColleges();
  const [sortBy, setSortBy] = useState("ranking");
  const [typeFilter, setTypeFilter] = useState("all");

  const regionInfo = regionData[region || ""] || {
    title: `Top MBA Colleges in ${(region || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())} 2025`,
    description: `Explore top MBA colleges with fees, placements, and rankings.`,
    longTail: [],
  };

  const matchCities = cityMapping[region || ""] || [(region || "").replace(/-/g, " ")];
  
  const filteredColleges = (allColleges || []).filter(c => {
    const matchesRegion = matchCities.some(city =>
      (c.city || "").toLowerCase().includes(city.toLowerCase()) ||
      (c.state || "").toLowerCase().includes(city.toLowerCase())
    );
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesRegion && matchesType;
  }).sort((a, b) => {
    if (sortBy === "ranking") return (a.ranking || 999) - (b.ranking || 999);
    if (sortBy === "fees") return (parseInt((a.fees || "0").replace(/\D/g, "")) || 0) - (parseInt((b.fees || "0").replace(/\D/g, "")) || 0);
    return 0;
  });

  // If no region-specific results, show all colleges
  const displayColleges = filteredColleges.length > 0 ? filteredColleges : (allColleges || []);

  const types = [...new Set((allColleges || []).map(c => c.type).filter(Boolean))];

  const jsonLd = generateListingSchema(regionInfo.title, displayColleges, "college");

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${regionInfo.title} — Fees, Placements, Rankings | MBAHub`}
        description={regionInfo.description}
        keywords={regionInfo.longTail}
        canonical={`${window.location.origin}/colleges/${region}`}
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4">
          <nav className="text-primary-foreground/60 text-xs mb-4">
            <Link to="/" className="hover:text-primary-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/colleges" className="hover:text-primary-foreground">Colleges</Link>
            <span className="mx-2">/</span>
            <span className="text-primary-foreground">{(region || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
          </nav>
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-3">{regionInfo.title}</h1>
          <p className="text-primary-foreground/80 max-w-2xl text-sm">{regionInfo.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {regionInfo.longTail.slice(0, 4).map(kw => (
              <Badge key={kw} className="bg-primary-foreground/15 text-primary-foreground border-none text-xs">{kw}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Filter className="w-4 h-4" /> Filters:</div>
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
          <span className="text-sm text-muted-foreground ml-auto">{displayColleges.length} colleges found</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-4">
            {displayColleges.map((college, i) => (
              <motion.div key={college.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link to={`/college/${college.slug}`}>
                  <Card className="hover:border-primary/40 transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                          {college.ranking ? `#${college.ranking}` : college.name.charAt(0)}
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
                            {college.fees && (
                              <div className="text-sm"><span className="text-muted-foreground">Fees: </span><span className="font-semibold text-foreground">{college.fees}</span></div>
                            )}
                            {college.placement_avg && (
                              <div className="text-sm flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-primary" /><span className="text-muted-foreground">Avg: </span><span className="font-semibold text-foreground">{college.placement_avg}</span></div>
                            )}
                            {college.placement_highest && (
                              <div className="text-sm"><span className="text-muted-foreground">Highest: </span><span className="font-semibold text-primary">{college.placement_highest}</span></div>
                            )}
                            {(college.exams_accepted || []).length > 0 && (
                              <div className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                                {(college.exams_accepted || []).slice(0, 3).map((e: string) => (
                                  <Badge key={e} variant="outline" className="text-xs py-0">{e}</Badge>
                                ))}
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
        )}

        {/* SEO Content Block */}
        <div className="mt-12 prose prose-sm max-w-none dark:prose-invert">
          <h2 className="font-heading">About MBA Colleges in {(region || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</h2>
          <p className="text-muted-foreground">
            {regionInfo.description} Our comprehensive listing covers fees ranging from affordable to premium,
            placement statistics including average and highest packages, admission processes, and detailed cutoff information.
            Use our filters to find the perfect MBA college matching your budget, preferred entrance exam, and career goals.
          </p>
          <h3 className="font-heading">Frequently Asked Questions</h3>
          <p className="text-muted-foreground">
            <strong>Q: What are the top MBA colleges in {(region || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}?</strong><br />
            A: The top colleges include {displayColleges.slice(0, 3).map(c => c.name).join(", ")} and more. Check our complete ranking above.
          </p>
          <p className="text-muted-foreground">
            <strong>Q: What is the average fee for MBA in {(region || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}?</strong><br />
            A: MBA fees range from ₹5 Lakh to ₹25+ Lakh depending on the institution. Use our fee filter above to find colleges in your budget.
          </p>
        </div>

        {/* Related Regions */}
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="font-heading font-semibold text-foreground mb-4">Explore Other Regions</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(regionData).filter(([key]) => key !== region).map(([key, val]) => (
              <Link key={key} to={`/colleges/${key}`}>
                <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer py-1.5 px-3">
                  {val.title.replace("Top MBA Colleges in ", "").replace(" 2025", "")}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeFilterPage;
