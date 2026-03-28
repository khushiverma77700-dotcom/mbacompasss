import { Link } from "react-router-dom";
import { Star, MapPin, ArrowRight, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFeaturedInstitutes } from "@/hooks/useInstitutes";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedInstitutes = () => {
  const { data: featured = [], isLoading } = useFeaturedInstitutes();

  if (isLoading) {
    return (
      <section className="py-14 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section className="py-14 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">
              Top MBA <span className="text-gradient">Coaching Institutes</span>
            </h2>
            <p className="text-muted-foreground">Trusted by thousands of MBA aspirants</p>
          </div>
          <Link to="/category/cat">
            <Button variant="outline" size="sm" className="gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((inst: any, i: number) => (
            <motion.div key={inst.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Link
                to={`/institute/${inst.slug}`}
                className="group block bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className="h-32 hero-gradient relative flex items-center justify-center">
                  <span className="font-heading font-bold text-primary-foreground text-3xl opacity-30">{inst.name.charAt(0)}</span>
                  <Badge className="absolute top-3 left-3 bg-primary-foreground/20 text-primary-foreground border-none text-xs">Featured</Badge>
                  {inst.discount && (
                    <Badge className="absolute top-3 right-3 bg-green-500 text-primary-foreground border-none text-xs">{inst.discount.split(" ")[0]} OFF</Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">{inst.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3" /> {inst.city}, {inst.state}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold text-foreground">{inst.rating}</span>
                      <span className="text-xs text-muted-foreground">({inst.total_reviews})</span>
                    </div>
                    {inst.courses?.[0] && <span className="text-sm font-semibold text-primary">₹{Number(inst.courses[0].fees).toLocaleString()}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {inst.students_count || 0}+ students</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {inst.success_rate}%</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedInstitutes;
