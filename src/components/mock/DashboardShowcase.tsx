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
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused]);

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  const active = SLIDES[index];

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
        className="mt-6 rounded-2xl border border-sky-100 bg-white shadow-sm overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="relative bg-gradient-to-br from-sky-50 to-blue-50">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {SLIDES.map((s, i) => (
                <div key={s.title} className="w-full shrink-0 p-3 sm:p-5">
                  <img
                    src={s.url}
                    alt={`MBA Compass mocks dashboard — ${s.title}`}
                    className="w-full aspect-[16/9] object-cover object-top rounded-xl border border-sky-100 bg-white shadow-md"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous screenshot"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 border border-sky-100 shadow grid place-items-center text-sky-700 hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next screenshot"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 border border-sky-100 shadow grid place-items-center text-sky-700 hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4 border-t border-sky-50 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0" aria-live="polite">
            <div className="font-semibold text-gray-900 text-sm sm:text-base">{active.title}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{active.caption}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
