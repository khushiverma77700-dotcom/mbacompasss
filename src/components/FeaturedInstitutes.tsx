import { Link } from "react-router-dom";
import { Star, MapPin, ArrowRight, Users, TrendingUp, Sparkles, Award, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useFeaturedInstitutes } from "@/hooks/useInstitutes";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedInstitutes = () => {
  const { data: featured = [], isLoading } = useFeaturedInstitutes();

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-20 -left-32 w-64 h-64 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute bottom-20 -right-32 w-64 h-64 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
              <Award className="w-3.5 h-3.5" /> Featured This Week
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-foreground mb-3">
              Top MBA Coaching Institutes
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Handpicked & verified coaching centres trusted by thousands of MBA aspirants
            </p>
          </motion.div>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((inst: any, i: number) => (
            <motion.div
              key={inst.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <Link
                to={`/institute/${inst.slug}`}
                className="group relative flex flex-col bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-1"
              >
                {/* Image / Banner */}
                <div className="relative h-40 bg-gradient-to-br from-primary/80 to-primary overflow-hidden">
                  {inst.banner_url ? (
                    <img
                      src={inst.banner_url}
                      alt={inst.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : inst.logo_url ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/90 to-primary">
                      <img src={inst.logo_url} alt={inst.name} className="h-16 w-auto object-contain drop-shadow-lg" loading="lazy" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-heading font-extrabold text-primary-foreground/20 text-6xl select-none">
                        {inst.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold shadow-lg backdrop-blur-sm">
                      <Sparkles className="w-3 h-3" /> Featured
                    </span>
                  </div>

                  {inst.discount && (
                    <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-md bg-green-500 text-white text-[10px] font-bold shadow-lg">
                      {inst.discount.split(" ")[0]} OFF
                    </span>
                  )}

                  {/* Rating pill on image */}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-foreground">{inst.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({inst.total_reviews})</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-5">
                  <h3 className="font-heading font-bold text-foreground text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {inst.name}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                    <MapPin className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span className="line-clamp-1">{inst.city}{inst.state ? `, ${inst.state}` : ""}</span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <Users className="w-4 h-4 text-primary/70 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-foreground">{inst.students_count || 0}+</div>
                        <div className="text-[10px] text-muted-foreground leading-none">Students</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-foreground">{inst.success_rate}%</div>
                        <div className="text-[10px] text-muted-foreground leading-none">Success</div>
                      </div>
                    </div>
                  </div>

                  {/* Price + CTA row */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    {inst.courses?.[0] ? (
                      <div>
                        <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Starting from</div>
                        <div className="text-sm font-bold text-foreground">₹{Number(inst.courses[0].fees).toLocaleString()}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Contact for pricing</div>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/category/cat">
            <Button variant="outline" size="lg" className="rounded-full gap-2 px-8 font-semibold">
              Explore All Institutes <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedInstitutes;
