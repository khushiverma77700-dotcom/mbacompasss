import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, Star, Users, IndianRupee, TrendingUp, GraduationCap, Award, ChevronRight, ArrowRight, Building2, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useColleges } from "@/hooks/useInstitutes";
import { useCityPages } from "@/hooks/useCityPages";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";

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
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedExam, setSelectedExam] = useState("all");
  const [sortBy, setSortBy] = useState("ranking");

  const collegeCities = useMemo(() => [...new Set(colleges.map((c: any) => c.city).filter(Boolean))].sort() as string[], [colleges]);
  const collegeStates = useMemo(() => [...new Set(colleges.map((c: any) => c.state).filter(Boolean))].sort() as string[], [colleges]);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-12 md:py-16"><div className="container mx-auto px-4 text-center"><Skeleton className="h-10 w-96 mx-auto bg-white/20" /></div></div>
        <div className="container mx-auto px-4 py-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const jsonLd = generateListingSchema("Top MBA Colleges in India 2025", filtered, "college");

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Top MBA Colleges in India 2026 — Rankings, Fees, Placements | BestMBACoaching.com"
        description="Explore top MBA colleges in India with rankings, fees, placements, and admission details. Compare IIMs, top management institutes, PGDM colleges across all cities."
        keywords={["top MBA colleges India", "best B-schools India", "MBA college rankings", "IIM fees placements"]}
        canonical="https://bestmbacoaching.com/colleges"
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
      <div className="hero-gradient py-12 md:py-16 mt-2 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-primary-foreground mb-3 tracking-tight">
              Top MBA Colleges in India
            </h1>
            <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
              Compare {totalColleges}+ colleges including {iimCount} IIMs — rankings, fees, placements & admission details
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
            {[
              { label: "Total Colleges", value: `${totalColleges}+`, icon: Building2 },
              { label: "IIMs Listed", value: String(iimCount), icon: Award },
              { label: "Cities Covered", value: `${collegeCities.length}+`, icon: MapPin },
              { label: "Exams Tracked", value: `${allExams.length}+`, icon: GraduationCap },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <stat.icon className="w-4 h-4 text-primary-foreground/70 mx-auto mb-1" />
                <p className="font-heading font-bold text-primary-foreground text-lg">{stat.value}</p>
                <p className="text-primary-foreground/60 text-xs">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Region Badges */}
          {regions.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-2">
              {regions.map(r => (
                <Link key={r.slug} to={`/colleges/${r.slug}`}>
                  <Badge className="bg-white/15 text-primary-foreground border-white/20 hover:bg-white/25 cursor-pointer px-3 py-1 transition-colors">
                    {r.name}
                  </Badge>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Card */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6 card-shadow -mt-6 relative z-10">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
            <Filter className="w-4 h-4 text-primary" /> Filter & Search
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by college name or city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All States</SelectItem>{collegeStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Cities</SelectItem>{collegeCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Exam" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Exams</SelectItem>{allExams.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
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
                  onClick={() => setActiveTab(tab.type)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.type
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> colleges
          </p>
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
                className="group block bg-card rounded-xl card-shadow hover:card-shadow-hover transition-all duration-300 border border-border hover:border-primary/20 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Left: Rank + Logo */}
                  <div className="flex items-center gap-4 p-5 sm:w-72 flex-shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      {college.ranking && (
                        <span className="text-xs text-muted-foreground font-medium">Rank</span>
                      )}
                      <span className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                        #{college.ranking || "-"}
                      </span>
                    </div>
                    {college.logo_url ? (
                      <img src={college.logo_url} alt={college.name} className="w-14 h-14 rounded-xl object-contain bg-white p-1 border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-base">
                        {college.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" /> {college.city}{college.state ? `, ${college.state}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Center: Key Metrics */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 p-5 sm:border-l border-t sm:border-t-0 border-border">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Fees</span>
                      <p className="text-sm font-bold text-foreground">{college.fees || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Avg Package</span>
                      <p className="text-sm font-bold text-primary">{college.placement_avg || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3" /> Highest</span>
                      <p className="text-sm font-bold text-foreground">{college.placement_highest || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Established</span>
                      <p className="text-sm font-bold text-foreground">{college.established || "—"}</p>
                    </div>
                  </div>

                  {/* Right: Tags + CTA */}
                  <div className="flex flex-col justify-center gap-2 p-5 sm:border-l border-t sm:border-t-0 border-border sm:w-48 flex-shrink-0">
                    <Badge variant="outline" className="w-fit text-xs">{college.type}</Badge>
                    <div className="flex flex-wrap gap-1">
                      {(college.exams_accepted || []).slice(0, 3).map((exam: string) => (
                        <Badge key={exam} variant="secondary" className="text-xs font-normal">{exam}</Badge>
                      ))}
                      {(college.exams_accepted || []).length > 3 && (
                        <Badge variant="secondary" className="text-xs font-normal">+{(college.exams_accepted || []).length - 3}</Badge>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-1 group-hover:gap-2 transition-all">
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 bg-card rounded-xl border border-border">
            <GraduationCap className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground mb-2">No colleges found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search criteria</p>
          </div>
        )}

        {/* Browse by City */}
        {regions.length > 0 && (
          <div className="mt-12 bg-card rounded-xl border border-border p-6 card-shadow">
            <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Browse Colleges by City
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {regions.map(r => (
                <Link
                  key={r.slug}
                  to={`/colleges/${r.slug}`}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium text-foreground group"
                >
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  {r.name}
                  <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollegesPage;
