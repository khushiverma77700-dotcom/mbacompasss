import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, IndianRupee, TrendingUp, ChevronRight, GraduationCap } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";

const fallbackColleges = [
  { name: "IIM Ahmedabad", slug: "iim-ahmedabad", city: "Ahmedabad", state: "Gujarat", ranking: 1, fees: "₹23L", placement_avg: "₹35.68 LPA", type: "IIM", logo_url: null },
  { name: "IIM Bangalore", slug: "iim-bangalore", city: "Bangalore", state: "Karnataka", ranking: 2, fees: "₹24.5L", placement_avg: "₹34.21 LPA", type: "IIM", logo_url: null },
  { name: "IIM Calcutta", slug: "iim-calcutta", city: "Kolkata", state: "West Bengal", ranking: 3, fees: "₹27L", placement_avg: "₹35 LPA", type: "IIM", logo_url: null },
  { name: "IIM Lucknow", slug: "iim-lucknow", city: "Lucknow", state: "Uttar Pradesh", ranking: 4, fees: "₹19.25L", placement_avg: "₹30.58 LPA", type: "IIM", logo_url: null },
  { name: "IIM Kozhikode", slug: "iim-kozhikode", city: "Kozhikode", state: "Kerala", ranking: 5, fees: "₹20L", placement_avg: "₹29.5 LPA", type: "IIM", logo_url: null },
  { name: "XLRI Jamshedpur", slug: "xlri-jamshedpur", city: "Jamshedpur", state: "Jharkhand", ranking: 6, fees: "₹25.5L", placement_avg: "₹28 LPA", type: "Top Management", logo_url: null },
];

const getInitials = (name: string) => {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return words.map((w) => w[0]?.toUpperCase()).join("").slice(0, 3);
  return (words[0]?.[0] + words[1]?.[0] + words[words.length - 1]?.[0]).toUpperCase();
};

const formatBadge = (ranking?: number | null, type?: string) => {
  if (ranking) return `NIRF #${ranking}`;
  if (type) return type;
  return "Top College";
};

const TopRankedCollegesSection = () => {
  const { data: colleges } = useQuery({
    queryKey: ["top-ranked-colleges"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("colleges")
        .select("name, slug, city, state, ranking, fees, placement_avg, type, logo_url")
        .not("ranking", "is", null)
        .order("ranking", { ascending: true })
        .limit(6);
      return data && data.length > 0 ? data : fallbackColleges;
    },
  });

  const items = useMemo(() => (colleges || fallbackColleges).filter((c) => c.name?.trim() && c.slug?.trim()), [colleges]);

  return (
    <section className="py-20 md:py-24 bg-background border-y border-border/60">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-2xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-primary font-semibold mb-4">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {items.map((college: any, i: number) => {
            const badge = formatBadge(college.ranking, college.type);
            const initials = getInitials(college.name);
            return (
              <Link
                key={college.slug || i}
                to={`/colleges/${college.slug}`}
                className="group relative flex flex-col h-full bg-card rounded-2xl border border-border/70 p-6 card-shadow hover:border-primary/40 card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
              >
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-sky-50 border border-primary/15 flex items-center justify-center">
                    <span className="font-heading font-bold text-base text-primary tracking-tight">{initials}</span>
                  </div>
                  <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/10 whitespace-nowrap">
                    {badge}
                  </span>
                </div>

                <div className="min-h-[3.5rem]">
                  <h3 className="font-heading font-bold text-base md:text-lg text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {college.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{college.city}{college.state ? `, ${college.state}` : ""}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5 py-4 border-y border-border/60">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Total Fees</p>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <p className="text-sm font-bold text-foreground truncate">{college.fees || "N/A"}</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Avg Package</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600/70 shrink-0" />
                      <p className="text-sm font-bold text-emerald-600 truncate">{college.placement_avg || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <div className="inline-flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg group-hover:bg-primary/90 transition-colors">
                    View Details
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
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
