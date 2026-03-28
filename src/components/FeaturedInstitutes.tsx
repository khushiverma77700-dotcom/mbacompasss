import { Link } from "react-router-dom";
import { Star, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { institutes } from "@/data/mockData";

const FeaturedInstitutes = () => {
  const featured = institutes.filter((i) => i.featured);

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">
              Top Rated <span className="text-gradient">Coaching</span>
            </h2>
            <p className="text-muted-foreground">Trusted by thousands of students</p>
          </div>
          <Link to="/category/mba">
            <Button variant="outline" size="sm" className="gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((inst, i) => (
            <motion.div
              key={inst.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/institute/${inst.slug}`}
                className="group block bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className="h-36 hero-gradient relative flex items-center justify-center">
                  <span className="font-heading font-bold text-primary-foreground text-lg opacity-80">
                    {inst.name.charAt(0)}
                  </span>
                  <Badge className="absolute top-3 left-3 bg-card text-foreground text-xs">
                    {inst.category.toUpperCase()}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {inst.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    {inst.location}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-cat-mba text-cat-mba" />
                      <span className="text-sm font-semibold text-foreground">{inst.rating}</span>
                      <span className="text-xs text-muted-foreground">({inst.reviewCount})</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">{inst.fees}</span>
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
