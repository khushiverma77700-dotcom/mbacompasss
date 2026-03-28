import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useColleges } from "@/hooks/useInstitutes";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";

const tabs = [
  { label: "All", type: "all" },
  { label: "IIMs", type: "IIM" },
  { label: "Top Management", type: "Top Management" },
  { label: "PGDM", type: "PGDM" },
  { label: "University", type: "University" },
];

const CollegesPage = () => {
  const { data: colleges = [], isLoading } = useColleges();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedExam, setSelectedExam] = useState("all");

  useEffect(() => { document.title = "Top MBA Colleges in India | MBAHub"; }, []);

  const collegeCities = useMemo(() => [...new Set(colleges.map((c: any) => c.city).filter(Boolean))].sort() as string[], [colleges]);
  const collegeStates = useMemo(() => [...new Set(colleges.map((c: any) => c.state).filter(Boolean))].sort() as string[], [colleges]);
  const allExams = useMemo(() => [...new Set(colleges.flatMap((c: any) => c.exams_accepted || []))].sort() as string[], [colleges]);

  const filtered = useMemo(() => {
    return colleges.filter((c: any) => {
      if (activeTab !== "all" && c.type !== activeTab) return false;
      if (selectedCity !== "all" && c.city !== selectedCity) return false;
      if (selectedState !== "all" && c.state !== selectedState) return false;
      if (selectedExam !== "all" && !(c.exams_accepted || []).includes(selectedExam)) return false;
      if (search) { const q = search.toLowerCase(); return c.name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q); }
      return true;
    });
  }, [colleges, activeTab, search, selectedCity, selectedState, selectedExam]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-10 md:py-14">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">Top MBA Colleges in India</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const jsonLd = generateListingSchema("Top MBA Colleges in India 2025", filtered, "college");
  const regions = [
    { slug: "delhi-ncr", label: "Delhi NCR" }, { slug: "mumbai", label: "Mumbai" },
    { slug: "bangalore", label: "Bangalore" }, { slug: "pune", label: "Pune" },
    { slug: "hyderabad", label: "Hyderabad" }, { slug: "kolkata", label: "Kolkata" },
    { slug: "maharashtra", label: "Maharashtra" }, { slug: "karnataka", label: "Karnataka" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Top MBA Colleges in India 2026 — Rankings, Fees, Placements | BestMBACoaching.com"
        description="Explore top MBA colleges in India with rankings, fees, placements, and admission details. Compare IIMs, top management institutes, PGDM colleges across all cities."
        keywords={["top MBA colleges India", "best B-schools India", "MBA college rankings", "IIM fees placements", "MBA college admission", "PGDM colleges India"]}
        canonical="https://bestmbacoaching.com/colleges"
        jsonLd={jsonLd}
      />
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">Top MBA Colleges in India</h1>
          <p className="text-primary-foreground/70 mb-4">IIMs, PGDM colleges, top management institutes — city-wise and state-wise</p>
          <div className="flex flex-wrap justify-center gap-2">
            {regions.map(r => (
              <Link key={r.slug} to={`/colleges/${r.slug}`}>
                <Badge className="bg-primary-foreground/15 text-primary-foreground border-none hover:bg-primary-foreground/25 cursor-pointer">{r.label}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search colleges..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button key={tab.type} onClick={() => setActiveTab(tab.type)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.type ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary border border-border"}`}>{tab.label}</button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} colleges found</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((college: any, i: number) => (
            <motion.div key={college.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/college/${college.slug}`} className="group block bg-card rounded-xl p-5 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border">
                <div className="flex items-start gap-3 mb-3">
                  {college.logo_url ? (
                    <img src={college.logo_url} alt={college.name} className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">#{college.ranking}</div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">{college.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><MapPin className="w-3 h-3" />{college.city}, {college.state}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div><span className="text-muted-foreground">Fees: </span><span className="font-semibold text-foreground">{college.fees}</span></div>
                  <div><span className="text-muted-foreground">Avg Package: </span><span className="font-semibold text-primary">{college.placement_avg}</span></div>
                </div>
                <Badge variant="outline" className="text-xs mb-2">{college.type}</Badge>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(college.exams_accepted || []).map((exam: string) => <Badge key={exam} variant="secondary" className="text-xs font-normal">{exam}</Badge>)}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-16"><p className="text-muted-foreground">No colleges found.</p></div>}
      </div>
    </div>
  );
};

export default CollegesPage;
