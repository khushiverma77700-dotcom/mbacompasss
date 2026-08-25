import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react";
import dash1 from "@/assets/dashboard/dash-1.png.asset.json";
import dash2 from "@/assets/dashboard/dash-2.png.asset.json";
import dash3 from "@/assets/dashboard/dash-3.png.asset.json";
import dash4 from "@/assets/dashboard/dash-4.png.asset.json";
import dash5 from "@/assets/dashboard/dash-5.png.asset.json";
import dash6 from "@/assets/dashboard/dash-6.png.asset.json";
import dash7 from "@/assets/dashboard/dash-7.png.asset.json";
import dash8 from "@/assets/dashboard/dash-8.png.asset.json";
import dash9 from "@/assets/dashboard/dash-9.png.asset.json";

const SLIDES: { url: string; title: string; caption: string }[] = [
  { url: dash1.url, title: "Student Overview", caption: "Streaks, projected score, enrolled mocks and today's plan at a glance." },
  { url: dash2.url, title: "My Day Planner", caption: "Plan tasks, track focus hours and build a daily study streak." },
  { url: dash3.url, title: "Daily Tests", caption: "A fresh test every day with schedule, missed and upcoming tabs." },
  { url: dash4.url, title: "Full-Length Mocks", caption: "Exam-day simulations across all sections with live mock drops." },
  { url: dash5.url, title: "Sectional Mocks", caption: "Single-section drills to fix weak areas, filtered by exam." },
  { url: dash6.url, title: "All India Rank & Insights", caption: "AIR progression, percentile trend and mock-wise analysis." },
  { url: dash7.url, title: "B-School Vocabulary", caption: "Word cards with meanings, pronunciation and revision tracking." },
  { url: dash8.url, title: "Quant Formula Book", caption: "300+ formulas with explanations, usage triggers and examples." },
  { url: dash9.url, title: "News & Insights", caption: "Daily current affairs and GDPI-ready briefs in 3 languages." },
];

export default function DashboardShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 2500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused]);

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  const active = SLIDES[index];
  const at = (offset: number) => SLIDES[(index + offset + SLIDES.length) % SLIDES.length];

  return (
    <section className="container mx-auto px-4 py-8" aria-labelledby="dashboard-showcase-heading">
      <div className="text-center max-w-2xl mx-auto">
        <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">
          <LayoutDashboard className="h-3.5 w-3.5 mr-1" /> Inside the platform
        </Badge>
        <h2 id="dashboard-showcase-heading" className="text-2xl md:text-3xl font-bold text-gray-900">
          MBA Compass Mocks Dashboard
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-2">
          A quick tour of the student dashboard you unlock with this course.
        </p>
      </div>

      <div
        className="mt-6 max-w-5xl mx-auto rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="relative px-3 sm:px-10 py-6">
          {/* 3-up stage: side previews (desktop) with a zoomed centre slide */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {[-1, 0, 1].map((offset) => {
              const s = at(offset);
              const isCenter = offset === 0;
              return (
                <button
                  key={`${offset}-${s.title}`}
                  type="button"
                  onClick={() => !isCenter && go(offset as -1 | 1)}
                  aria-label={isCenter ? s.title : `Show ${s.title}`}
                  aria-current={isCenter}
                  tabIndex={isCenter ? -1 : 0}
                  className={`relative shrink-0 transition-all duration-500 ease-out rounded-xl overflow-hidden bg-white border ${
                    isCenter
                      ? "w-full sm:w-[54%] border-sky-200 shadow-xl z-10 scale-100"
                      : "hidden sm:block w-[23%] border-sky-100 shadow-sm opacity-60 hover:opacity-90 scale-95"
                  }`}
                >
                  <img
                    src={s.url}
                    alt={`MBA Compass mocks dashboard — ${s.title}`}
                    className="w-full h-auto aspect-[16/10] object-contain bg-white"
                    loading={isCenter && offset === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous screenshot"
            className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/95 border border-sky-100 shadow grid place-items-center text-sky-700 hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next screenshot"
            className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/95 border border-sky-100 shadow grid place-items-center text-sky-700 hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-5 pt-3 border-t border-sky-100/70 bg-white/70">
          <div className="text-center max-w-xl mx-auto" aria-live="polite">
            <div className="font-semibold text-gray-900 text-sm sm:text-base">{active.title}</div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">{active.caption}</p>
          </div>
          <div className="mt-3 flex items-center justify-center flex-wrap gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${s.title}`}
                aria-current={i === index}
                className={`h-2 shrink-0 rounded-full transition-all ${i === index ? "w-6 bg-sky-600" : "w-2 bg-sky-200 hover:bg-sky-300"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
