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
    <section className="py-20 md:py-24 bg-background border-y border-border/60">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-primary font-semibold mb-4">
            <span className="h-px w-8 bg-primary/40" />
            Top Rankings 2025
            <span className="h-px w-8 bg-primary/40" />
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground mb-4 tracking-[-0.02em] leading-[1.1]">
            India's <span className="font-editorial italic font-normal text-primary">top-ranked</span> MBA colleges
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Hand-picked B-schools curated from NIRF rankings, placement records and verified student feedback.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {items.map((college: any, i: number) => (
            <motion.div
              key={college.slug || i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.05, 0.25) }}
              className="h-full"
            >
              <Link
                to={`/colleges/${college.slug}`}
                className="group relative flex flex-col h-full bg-card rounded-2xl border border-border/70 p-6 hover:border-primary/40 hover:shadow-[0_18px_50px_-20px_hsl(207_90%_54%_/_0.25)] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center">
                    {college.ranking ? (
                      <div className="text-center leading-none">
                        <div className="text-[9px] uppercase tracking-wider text-primary/60 font-semibold">Rank</div>
                        <div className="text-xl font-editorial italic text-primary mt-0.5">#{college.ranking}</div>
                      </div>
                    ) : (
                      <GraduationCap className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                      {college.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{college.city}{college.state ? `, ${college.state}` : ""}</span>
                    </div>
                    {college.type && (
                      <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        {college.type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-5 border-t border-border/60">
                  <div className="flex flex-col">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Total Fees</p>
                    <div className="flex items-start gap-1 min-h-[2.5rem] max-h-[2.5rem] overflow-hidden">
                      <IndianRupee className="w-3.5 h-3.5 text-primary/70 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-foreground line-clamp-2 break-words">
                        {college.fees || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Avg Package</p>
                    <div className="flex items-start gap-1 min-h-[2.5rem] max-h-[2.5rem] overflow-hidden">
                      <TrendingUp className="w-3.5 h-3.5 text-primary/70 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-foreground line-clamp-2 break-words">
                        {college.placement_avg || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/colleges">
            <Button variant="outline" size="lg" className="gap-2 rounded-full px-8 border-primary/30 hover:border-primary hover:bg-primary/5">
              Explore all colleges <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};


export default TopRankedCollegesSection;
