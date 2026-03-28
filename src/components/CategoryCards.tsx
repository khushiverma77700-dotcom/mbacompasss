import { Link } from "react-router-dom";
import { Briefcase, Heart, Cpu, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { categories } from "@/data/mockData";

const iconMap: Record<string, React.ElementType> = {
  Briefcase,
  Heart,
  Cpu,
  Building2,
};

const CategoryCards = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
            Explore by <span className="text-gradient">Category</span>
          </h2>
          <p className="text-muted-foreground">Find coaching for your target exam</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon];
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/category/${cat.slug}`}
                  className="group block bg-card rounded-xl p-6 text-center card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
                >
                  <div
                    className={`w-14 h-14 rounded-xl ${cat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-sm md:text-base mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{cat.count}+ Institutes</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryCards;
