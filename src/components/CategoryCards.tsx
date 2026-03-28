import { Link } from "react-router-dom";
import { Target, Globe, BookOpen, Languages, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";
import { categories } from "@/data/mockData";

const iconMap: Record<string, React.ElementType> = {
  Target,
  Globe,
  BookOpen,
  Languages,
  BarChart3,
  Users,
};

const CategoryCards = () => {
  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
            Explore MBA <span className="text-gradient">Exam Categories</span>
          </h2>
          <p className="text-muted-foreground">Choose your target MBA entrance exam</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon];
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/category/${cat.slug}`}
                  className="group block bg-card rounded-xl p-5 text-center card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-sm mb-1">
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
