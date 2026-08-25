import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";


const fallbackComparisons = [
  { title: "CAT vs XAT", description: "Difficulty level, pattern, and acceptance — which is right for you?", link: "/blog" },
  { title: "CAT vs GMAT", description: "Domestic vs international MBA — compare scope, fees, and ROI.", link: "/blog" },
  { title: "IIM vs ISB", description: "India's top B-schools compared on placements, fees, and culture.", link: "/blog" },
  { title: "PGDM vs MBA", description: "Understand the key differences in curriculum, recognition, and value.", link: "/blog" },
  { title: "CAT vs SNAP", description: "Exam pattern, difficulty, and top colleges accepting each score.", link: "/blog" },
  { title: "Online vs Offline MBA", description: "Flexibility vs campus life — which format suits your career goals?", link: "/blog" },
];

const TopExamComparisonSection = () => {
  // Fetch comparisons with their linked articles
  const { data: comparisons } = useQuery({
    queryKey: ["comparisons-with-articles"],
    queryFn: async () => {
      // Get active comparisons
      const { data: comps } = await supabase
        .from("comparisons")
        .select("id, title, description, link")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (!comps || comps.length === 0) return null;

      // Get articles linked to comparisons
      const { data: articles } = await supabase
        .from("articles")
        .select("title, slug, excerpt, comparison_id")
        .eq("published", true)
        .eq("is_comparison", true)
        .not("comparison_id", "is", null);

      // Build items: for each comparison, use its linked article if available, otherwise use comparison's own link
      return comps.map((comp: any) => {
        const linkedArticle = articles?.find((a: any) => a.comparison_id === comp.id);
        return {
          title: comp.title,
          description: linkedArticle?.excerpt || comp.description || "",
          link: linkedArticle ? `/article/${linkedArticle.slug}` : (comp.link || "/blog"),
        };
      });
    },
  });

  const items = comparisons && comparisons.length > 0 ? comparisons : fallbackComparisons;

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = 320;
    const gap = 16;
    const delta = direction === "left" ? -(cardWidth + gap) : cardWidth + gap;
    scrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Popular Comparisons</h2>
          <p className="text-muted-foreground">Head-to-head analysis to help you make the right choice</p>
        </div>

        <div className="relative lg:px-12 max-w-6xl mx-auto">
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 lg:-left-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm text-foreground hover:bg-muted transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-2 lg:-right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm text-foreground hover:bg-muted transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-5 -mx-4 px-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/30 hover:[&::-webkit-scrollbar-thumb]:bg-primary/50"
          >
            {items.map((item: any, i: number) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="snap-start shrink-0 w-[280px] sm:w-[300px] lg:w-[320px]"
              >
                <Link to={item.link} className="block h-full p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
                      VS
                    </span>
                    <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary group-hover:bg-primary/10 transition-colors">Read Comparison <ArrowRight className="w-3 h-3" /></span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopExamComparisonSection;
