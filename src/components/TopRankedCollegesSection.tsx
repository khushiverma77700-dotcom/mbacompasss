import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Trophy, MapPin, IndianRupee, TrendingUp, ChevronRight, Star, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const fallbackColleges = [
  { name: "IIM Ahmedabad", slug: "iim-ahmedabad", city: "Ahmedabad", state: "Gujarat", ranking: 1, fees: "₹23L", placement_avg: "₹35.68 LPA", type: "IIM", logo_url: null },
  { name: "IIM Bangalore", slug: "iim-bangalore", city: "Bangalore", state: "Karnataka", ranking: 2, fees: "₹24.5L", placement_avg: "₹34.21 LPA", type: "IIM", logo_url: null },
  { name: "IIM Calcutta", slug: "iim-calcutta", city: "Kolkata", state: "West Bengal", ranking: 3, fees: "₹27L", placement_avg: "₹35 LPA", type: "IIM", logo_url: null },
  { name: "IIM Lucknow", slug: "iim-lucknow", city: "Lucknow", state: "Uttar Pradesh", ranking: 4, fees: "₹19.25L", placement_avg: "₹30.58 LPA", type: "IIM", logo_url: null },
  { name: "IIM Kozhikode", slug: "iim-kozhikode", city: "Kozhikode", state: "Kerala", ranking: 5, fees: "₹20L", placement_avg: "₹29.5 LPA", type: "IIM", logo_url: null },
  { name: "XLRI Jamshedpur", slug: "xlri-jamshedpur", city: "Jamshedpur", state: "Jharkhand", ranking: 6, fees: "₹25.5L", placement_avg: "₹28 LPA", type: "Top Management", logo_url: null },
];

const TopRankedCollegesSection = () => {
  const { data: colleges } = useQuery({
    queryKey: ["top-ranked-colleges"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("name, slug, city, state, ranking, fees, placement_avg, type, logo_url")
        .not("ranking", "is", null)
        .order("ranking", { ascending: true })
        .limit(6);
      return data && data.length > 0 ? data : fallbackColleges;
    },
  });

  const items = colleges || fallbackColleges;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Top Rankings 2025</span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            India's Top Ranked MBA Colleges
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore the highest-ranked B-Schools in India based on NIRF, placement records, and industry reputation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((college: any, i: number) => (
            <motion.div
              key={college.slug || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/colleges/${college.slug}`}
                className="block bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    {college.ranking ? (
                      <span className="text-lg font-bold text-primary">#{college.ranking}</span>
                    ) : (
                      <GraduationCap className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {college.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {college.city}, {college.state}
                    </div>
                    {college.type && (
                      <span className="inline-block mt-1.5 text-xs font-medium bg-accent/50 text-accent-foreground px-2 py-0.5 rounded-full">
                        {college.type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Fees</p>
                      <p className="text-sm font-semibold text-foreground">{college.fees || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Package</p>
                      <p className="text-sm font-semibold text-foreground">{college.placement_avg || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/colleges">
            <Button variant="outline" size="lg" className="gap-2">
              View All Colleges <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TopRankedCollegesSection;
