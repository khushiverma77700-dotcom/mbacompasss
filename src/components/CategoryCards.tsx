import { Link } from "react-router-dom";
import { Target, Globe, BookOpen, Languages, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, React.ElementType> = {
  Target, Globe, BookOpen, Languages, BarChart3, Users,
};

const colorCycle = [
  "bg-primary/10 text-primary",
  "bg-emerald-500/10 text-emerald-600",
  "bg-amber-500/10 text-amber-600",
  "bg-violet-500/10 text-violet-600",
  "bg-rose-500/10 text-rose-600",
  "bg-cyan-500/10 text-cyan-600",
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
      <section className="py-14 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </section>
    );
  }

  if (!categories?.length) return null;

  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Target className="w-3.5 h-3.5" /> Exam Categories
          </span>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
            Explore MBA <span className="text-gradient">Exam Categories</span>
          </h2>
          <p className="text-muted-foreground">Choose your target MBA entrance exam and find the best coaching</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {categories.map((cat: any, i: number) => {
            const Icon = iconMap[cat.icon] || BookOpen;
            const color = colorCycle[i % colorCycle.length];
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
                  className="group block bg-card rounded-xl p-5 text-center card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
                >
                  <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{cat.name}</h3>
                  {cat.description && <p className="text-xs text-muted-foreground line-clamp-1">{cat.description}</p>}
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
