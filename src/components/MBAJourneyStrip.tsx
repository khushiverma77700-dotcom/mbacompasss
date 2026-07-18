import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, BookOpenCheck, FileEdit, PenTool, LineChart, Award, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ICONS: Record<string, any> = { Compass, BookOpenCheck, FileEdit, PenTool, LineChart, Award };

type Step = { n: string; icon: any; title: string; sub: string; link: string; cta: string };

const DEFAULT_STEPS: Step[] = [
  { n: "01", icon: Compass, title: "Discover", sub: "Explore B-schools & specialisations that fit your goals.", link: "/colleges", cta: "Explore Colleges" },
  { n: "02", icon: BookOpenCheck, title: "Prepare", sub: "Coaching, mocks, sectionals — CAT, XAT, GMAT, SNAP.", link: "/mba-compass", cta: "Start Prep" },
  { n: "03", icon: FileEdit, title: "Register", sub: "Track exam windows & never miss a deadline.", link: "/exams", cta: "Exam Calendar" },
  { n: "04", icon: PenTool, title: "Attempt", sub: "Full-length mocks with detailed analytics & percentile.", link: "/student", cta: "Take Mocks" },
  { n: "05", icon: LineChart, title: "Predict", sub: "AI predictor for calls basis your score + profile.", link: "/tools/predictor", cta: "Predict Calls" },
  { n: "06", icon: Award, title: "Admit", sub: "GDPI-WAT prep, profile building & final conversion.", link: "/blog", cta: "Read Guides" },
];

const MBAJourneyStrip = () => {
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_mba_journey_strip")
        .maybeSingle();
      const items: any[] = Array.isArray((data?.value as any)?.items) ? (data!.value as any).items : [];
      if (cancelled || items.length === 0) return;
      const mapped: Step[] = items
        .filter((r) => r?.title && r?.link)
        .map((r, i) => ({
          n: r.n || String(i + 1).padStart(2, "0"),
          icon: ICONS[r.icon] || DEFAULT_STEPS[i % DEFAULT_STEPS.length].icon,
          title: r.title,
          sub: r.sub || "",
          link: r.link,
          cta: r.cta || "Learn More",
        }));
      setSteps(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
  <section className="py-16 md:py-24 bg-white">
    <div className="container mx-auto px-4">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          Your Roadmap
        </div>
        <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-3">
          From CAT-aspirant to <span className="font-editorial italic text-primary">B-school student</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          A single track of tools, mentors and content — mapped to every step of the MBA journey.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {STEPS.map(({ n, icon: Icon, title, sub, link, cta }, i) => (
          <Link
            key={n}
            to={link}
            className="group relative bg-gradient-to-br from-sky-50/60 via-white to-white border border-primary/10 rounded-2xl p-5 md:p-6 hover:shadow-xl hover:shadow-sky-200/40 hover:border-primary/30 hover:-translate-y-1 transition-all"
          >
            <div className="absolute top-4 right-5 font-editorial italic text-4xl md:text-5xl text-primary/10 group-hover:text-primary/20 transition-colors">
              {n}
            </div>
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center mb-4 shadow-md shadow-sky-200/60">
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.2} />
            </div>
            <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1.5">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{sub}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
              {cta} <ChevronRight className="w-3.5 h-3.5" />
            </span>
            {i < STEPS.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-primary/30 to-transparent" />
            )}
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default MBAJourneyStrip;
