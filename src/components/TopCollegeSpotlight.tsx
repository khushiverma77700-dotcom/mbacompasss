import { Link } from "react-router-dom";
import { GraduationCap, MapPin, TrendingUp, ArrowRight, Award } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useCollegesLight } from "@/hooks/useInstitutes";

const TopCollegeSpotlight = () => {
  const { data: colleges, isLoading } = useCollegesLight();

  if (isLoading || !colleges?.length) return null;

  const topColleges = colleges
    .filter((c: any) => c.ranking && c.ranking <= 20)
    .sort((a: any, b: any) => (a.ranking || 999) - (b.ranking || 999))
    .slice(0, 6);

  if (topColleges.length === 0) return null;

  return (
    <section className="py-16 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl -translate-y-1/2" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 mb-3">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">NIRF Ranked</span>
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              Top Ranked <span className="text-gradient">MBA Colleges</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-1">India's highest-ranked business schools by NIRF</p>
          </div>
          <Link to="/colleges" className="hidden md:inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:gap-2.5 transition-all">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topColleges.map((college: any, i: number) => (
            <motion.div
              key={college.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link to={`/college/${college.slug}`} className="group block bg-card rounded-2xl border border-border shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full">
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl hero-gradient flex items-center justify-center text-primary-foreground font-extrabold text-sm shadow-lg flex-shrink-0">
                      #{college.ranking}
                    </div>
                    {college.logo_url ? (
                      <img src={college.logo_url} alt="" className="w-10 h-10 rounded-xl object-contain bg-white border border-border p-0.5 flex-shrink-0" />
                    ) : null}
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">{college.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {college.city}, {college.state}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Fees</p>
                      <p className="text-xs font-bold text-foreground">{college.fees || "—"}</p>
                    </div>
                    <div className="bg-primary/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Avg CTC</p>
                      <p className="text-xs font-bold text-primary">{college.placement_avg || "—"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Highest</p>
                      <p className="text-xs font-bold text-foreground">{college.placement_highest || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px] py-0">{college.type}</Badge>
                      {(college.exams_accepted || []).slice(0, 1).map((e: string) => (
                        <Badge key={e} variant="secondary" className="text-[10px] py-0">{e}</Badge>
                      ))}
                    </div>
                    <span className="text-xs text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link to="/colleges" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:gap-2.5 transition-all">
            View All Colleges <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TopCollegeSpotlight;
