import { Link } from "@/lib/router-compat";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { activeAdmissionPhases } from "@/lib/homepageCalendar";

type Phase = {
  window: string;
  month: string;
  title: string;
  points: string[];
  link: string;
};

const PHASES: Phase[] = [
  {
    window: "Jan – Apr",
    month: "Foundation",
    title: "Build your base",
    points: ["Quant & Verbal fundamentals", "Pick coaching / self-prep track", "Shortlist 15–20 target B-schools"],
    link: "/coaching",
  },
  {
    window: "May – Jul",
    month: "Sectionals",
    title: "Sharpen sections",
    points: ["Sectional tests every week", "LRDI speed building", "Reading habit for RC accuracy"],
    link: "/student",
  },
  {
    window: "Aug – Sep",
    month: "Registration",
    title: "Forms & mocks",
    points: ["CAT / NMAT / SNAP forms open", "Full-length mocks begin", "Fix percentile leaks weekly"],
    link: "/exam",
  },
  {
    window: "Oct – Dec",
    month: "Exam Season",
    title: "Peak performance",
    points: ["Entrance exam preparation and attempts", "Mock analysis over new content", "Score & call predictors"],
    link: "/tools/college-shortlister",
  },
  {
    window: "Jan – Mar",
    month: "Selection",
    title: "GDPI–WAT rounds",
    points: ["Profile & SOP polishing", "Mock interviews + WAT drills", "Final converts & offer compare"],
    link: "/blog",
  },
  {
    window: "Apr – Jun",
    month: "Onboarding",
    title: "Pre-MBA prep",
    points: ["Fee, loan & scholarship steps", "Pre-term Excel + accounting", "Campus & specialisation choice"],
    link: "/colleges",
  },
];


/**
 * Admission-year roadmap rendered as a horizontal rail on desktop and a
 * vertical stepper on mobile. Pure static content — no fetches, so it adds
 * no network cost to the homepage.
 */
const HomeAdmissionTimeline = () => {
  const [active, setActive] = useState(() => activeAdmissionPhases());
  useEffect(() => {
    const update = () => setActive(activeAdmissionPhases());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  return (
  <section className="py-16 md:py-24 bg-gradient-to-b from-sky-50/70 via-white to-white" id="home-timeline">
    <div className="container mx-auto px-4">
      <div className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <CalendarDays className="w-3.5 h-3.5" /> Admission Year Map
        </div>
        <h2 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
          Your MBA year, <span className="font-editorial italic text-primary">month by month</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          What to do right now — and what comes next — across the full CAT-to-campus cycle.
        </p>
      </div>

      <div className="relative">
        <div className="hidden md:block absolute left-0 right-0 top-[3.25rem] h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {PHASES.map((p, i) => {
            const isActive = active.includes(i);
            return (
              <li key={p.window} className="relative">
                <Link
                  to={p.link}
                  className={`group relative flex h-full flex-col rounded-2xl border p-5 md:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-200/40 ${
                    isActive
                      ? "border-primary/40 bg-white shadow-lg shadow-sky-200/50 ring-1 ring-primary/20"
                      : "border-primary/10 bg-white/80 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                      <span className="relative flex h-2 w-2">
                        {isActive && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                        )}
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      {p.window}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">
                        You are here
                      </span>
                    )}
                  </div>
                  <p className="font-editorial italic text-sm text-muted-foreground mb-1">{p.month}</p>
                  <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-3">{p.title}</h3>
                  <ul className="space-y-1.5 mb-4">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all group-hover:gap-2">
                    Open this step <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  </section>
  );
};

export default HomeAdmissionTimeline;
