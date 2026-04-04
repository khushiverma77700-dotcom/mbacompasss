import { Link } from "react-router-dom";
import { Target, Globe, BookOpen, Languages, BarChart3, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, React.ElementType> = {
  Target, Globe, BookOpen, Languages, BarChart3, Users,
};

const gradients = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-violet-500 to-violet-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
];

const CategoryCards = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories-homepage"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        </div>
      </section>
    );
  }

  if (!categories?.length) return null;

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
            <Target className="w-3.5 h-3.5" /> Exam Categories
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-3">
            Explore MBA <span className="text-gradient">Exam Categories</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Choose your target MBA entrance exam and find the best coaching institute for your preparation</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
          {categories.map((cat: any, i: number) => {
            const Icon = iconMap[cat.icon] || BookOpen;
            const gradient = gradients[i % gradients.length];
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={`/category/${cat.slug}`}
                  className="group block bg-card rounded-2xl p-5 md:p-6 text-center border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
                >
                  {/* Hover gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                  
                  <div className="relative z-10">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-4 shadow-md group-hover:bg-white/20 group-hover:shadow-lg transition-all`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-heading font-bold text-foreground text-sm md:text-base mb-1 group-hover:text-white transition-colors">{cat.name}</h3>
                    {cat.description && <p className="text-xs text-muted-foreground line-clamp-1 group-hover:text-white/70 transition-colors">{cat.description}</p>}
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-primary group-hover:text-white transition-colors">
                      Explore <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
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
