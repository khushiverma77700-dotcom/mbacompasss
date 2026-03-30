import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fallbackComparisons = [
  { title: "CAT vs XAT", description: "Difficulty level, pattern, and acceptance — which is right for you?", link: "/blog" },
  { title: "CAT vs GMAT", description: "Domestic vs international MBA — compare scope, fees, and ROI.", link: "/blog" },
  { title: "IIM vs ISB", description: "India's top B-schools compared on placements, fees, and culture.", link: "/blog" },
  { title: "PGDM vs MBA", description: "Understand the key differences in curriculum, recognition, and value.", link: "/blog" },
  { title: "CAT vs SNAP", description: "Exam pattern, difficulty, and top colleges accepting each score.", link: "/blog" },
  { title: "Online vs Offline MBA", description: "Flexibility vs campus life — which format suits your career goals?", link: "/blog" },
];

const TopExamComparisonSection = () => {
  const { data: comparisons } = useQuery({
    queryKey: ["comparisons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("comparisons")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      return data;
    },
  });

  const items = comparisons && comparisons.length > 0
    ? comparisons.map((c: any) => ({ title: c.title, description: c.description, link: c.link || "/blog" }))
    : fallbackComparisons;

  return (
    <section className="py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Popular Comparisons</h2>
          <p className="text-muted-foreground">Head-to-head analysis to help you make the right choice</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any, i: number) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <Link to={item.link} className="block p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all group">
                <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                <span className="text-xs font-medium text-primary flex items-center gap-1">Read Comparison <ArrowRight className="w-3 h-3" /></span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopExamComparisonSection;
