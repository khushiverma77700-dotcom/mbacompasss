import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const pillColors = [
  "hover:bg-violet-500 hover:border-violet-500",
  "hover:bg-blue-500 hover:border-blue-500",
  "hover:bg-emerald-500 hover:border-emerald-500",
  "hover:bg-orange-500 hover:border-orange-500",
  "hover:bg-rose-500 hover:border-rose-500",
  "hover:bg-indigo-500 hover:border-indigo-500",
  "hover:bg-teal-500 hover:border-teal-500",
  "hover:bg-amber-500 hover:border-amber-500",
];

const ExamCategoriesBar = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: exams } = useQuery({
    queryKey: ["exams-bar"],
    queryFn: async () => {
      const { data } = await supabase.from("exams").select("name, slug").order("name");
      return data || [];
    },
  });

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => { checkScroll(); }, [exams]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  return (
    <section className="py-5 bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-[64px] z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-heading font-semibold text-foreground text-sm hidden sm:inline">Exams</span>
          </div>

          <div className="relative flex-1 min-w-0">
            {canScrollLeft && (
              <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
              </button>
            )}
            <div ref={scrollRef} onScroll={checkScroll} className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-1">
              {(exams || []).map((exam, i) => (
                <Link
                  key={exam.slug}
                  to={`/exam/${exam.slug}`}
                  className={`group flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary/40 border border-border/60 hover:text-white transition-all whitespace-nowrap flex-shrink-0 text-sm font-medium text-foreground ${pillColors[i % pillColors.length]}`}
                >
                  {exam.name}
                  <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </Link>
              ))}
            </div>
            {canScrollRight && (
              <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExamCategoriesBar;
