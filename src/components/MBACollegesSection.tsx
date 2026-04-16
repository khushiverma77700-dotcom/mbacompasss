import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mbaColleges as fallbackColleges } from "@/data/mockData";

const tabs = [
  { label: "IIMs", type: "IIM" },
  { label: "Top Management", type: "Top Management" },
  { label: "PGDM Colleges", type: "PGDM" },
  { label: "University", type: "University" },
] as const;

const cityTabs = ["All", "Noida", "Bangalore", "Kolkata", "Mumbai", "Delhi"] as const;

const MBACollegesSection = () => {
  const [activeTab, setActiveTab] = useState<string>("IIM");
  const [activeCity, setActiveCity] = useState<string>("All");

  const { data: dbColleges } = useQuery({
    queryKey: ["mba-colleges-section"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id, name, slug, city, state, type, ranking, fees, placement_avg, exams_accepted, courses, college_category")
        .not("ranking", "is", null)
        .order("ranking", { ascending: true })
        .limit(50);
      return data;
    },
  });

  // Map DB colleges to display format, fall back to mock data
  const colleges = dbColleges && dbColleges.length > 0
    ? dbColleges.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        city: c.city || "",
        state: c.state || "",
        type: (c.college_category || c.type || "University") as string,
        ranking: c.ranking || 99,
        fees: c.fees || "N/A",
        avgPackage: c.placement_avg || "N/A",
        examsAccepted: (c.exams_accepted || []) as string[],
        courses: (c.courses || []) as string[],
      }))
    : fallbackColleges;

  const filtered = colleges.filter((c) => {
    if (c.type !== activeTab) return false;
    if (activeCity !== "All" && c.city !== activeCity) return false;
    return true;
  });

  return (
    <section className="py-14 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">
              Top MBA <span className="text-gradient">Colleges in India</span>
            </h2>
            <p className="text-muted-foreground">Category-wise, city-wise & course-wise directory</p>
          </div>
          <Link to={`/colleges?type=${activeTab}${activeCity !== "All" ? `&city=${activeCity}` : ""}`}>
            <Button variant="outline" size="sm" className="gap-1">View All <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>

        {/* Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.type
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* City filter */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {cityTabs.map((city) => (
            <button
              key={city}
              onClick={() => setActiveCity(city)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeCity === city
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.slice(0, 6).map((college, i) => (
            <motion.div
              key={college.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/college/${college.slug}`}
                className="group block bg-card rounded-xl p-5 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                    #{college.ranking}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">{college.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />{college.city}, {college.state}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div><span className="text-muted-foreground">Fees: </span><span className="font-semibold text-foreground">{college.fees}</span></div>
                  <div><span className="text-muted-foreground">Avg Package: </span><span className="font-semibold text-primary">{college.avgPackage}</span></div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {college.examsAccepted.map((exam) => (
                    <Badge key={exam} variant="secondary" className="text-xs font-normal">{exam}</Badge>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No colleges found for this combination. Try a different city or category.</div>
        )}
      </div>
    </section>
  );
};

export default MBACollegesSection;
