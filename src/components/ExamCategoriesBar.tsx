import { Link } from "react-router-dom";
import { FileText, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    <section className="py-6 bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <h3 className="font-heading font-semibold text-foreground text-lg mb-4">MBA Entrance Exams</h3>
        <div className="relative">
          {canScrollLeft && (
            <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          <div ref={scrollRef} onScroll={checkScroll} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-1">
            {(exams || []).map((exam) => (
              <Link
                key={exam.slug}
                to={`/exam/${exam.slug}`}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/50 border border-border hover:border-primary/40 hover:bg-primary hover:text-primary-foreground transition-all card-shadow whitespace-nowrap flex-shrink-0"
              >
                <FileText className="w-4 h-4 text-primary group-hover:text-primary-foreground" />
                <span className="font-medium text-sm text-foreground group-hover:text-primary-foreground">{exam.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
              </Link>
            ))}
          </div>
          {canScrollRight && (
            <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ExamCategoriesBar;
