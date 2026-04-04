import { Link } from "react-router-dom";
import { Star, MapPin, ArrowRight, Users, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFeaturedInstitutes } from "@/hooks/useInstitutes";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedInstitutes = () => {
  const { data: featured = [], isLoading } = useFeaturedInstitutes();

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Top Picks
            </span>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-1">
              Top MBA <span className="text-gradient">Coaching Institutes</span>
            </h2>
            <p className="text-muted-foreground">Trusted by thousands of MBA aspirants across India</p>
          </motion.div>
          <Link to="/category/cat">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((inst: any, i: number) => (
            <motion.div key={inst.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Link
                to={`/institute/${inst.slug}`}
                className="group block bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-36 hero-gradient relative flex items-center justify-center overflow-hidden">
                  {inst.banner_url ? (
                    <img src={inst.banner_url} alt={inst.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : inst.logo_url ? (
                    <img src={inst.logo_url} alt={inst.name} className="h-16 w-auto object-contain" />
                  ) : (
                    <span className="font-heading font-bold text-primary-foreground text-4xl opacity-20">{inst.name.charAt(0)}</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-none text-[10px] shadow-lg z-10">
                    <Sparkles className="w-3 h-3 mr-1" /> Featured
                  </Badge>
                  {inst.discount && (
                    <Badge className="absolute top-3 right-3 bg-green-500 text-white border-none text-[10px] shadow-lg z-10">{inst.discount.split(" ")[0]} OFF</Badge>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1 text-base">{inst.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3.5 h-3.5" /> {inst.city}, {inst.state}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-amber-700">{inst.rating}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({inst.total_reviews} reviews)</span>
                    </div>
                    {inst.courses?.[0] && <span className="text-sm font-bold text-primary">₹{Number(inst.courses[0].fees).toLocaleString()}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {inst.students_count || 0}+ students</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {inst.success_rate}% success</span>
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
