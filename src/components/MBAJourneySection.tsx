import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Compass,
  Target,
  BookOpen,
  ClipboardCheck,
  LineChart,
  FileText,
  Users,
  Trophy,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = {
  n: string;
  title: string;
  Icon: typeof Compass;
  bullets: string[];
  gradient: string;
  shadow: string;
};

const steps: Step[] = [
  { n: "01", title: "Career Clarity", Icon: Compass, bullets: ["Profile evaluation", "Shortlisting", "Roadmap"], gradient: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/40" },
  { n: "02", title: "Exam Strategy", Icon: Target, bullets: ["CAT / NMAT / XAT", "Study plan", "Strategy"], gradient: "from-violet-500 to-indigo-600", shadow: "shadow-violet-500/40" },
  { n: "03", title: "Prep & Mocks", Icon: BookOpen, bullets: ["Classes & material", "Mock analytics", "Tracking"], gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/40" },
  { n: "04", title: "Form Filling", Icon: ClipboardCheck, bullets: ["Step-by-step help", "Error-free", "Reminders"], gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/40" },
  { n: "05", title: "Score & Predict", Icon: LineChart, bullets: ["Percentile analysis", "College predictor", "Best-fit"], gradient: "from-pink-500 to-rose-600", shadow: "shadow-pink-500/40" },
  { n: "06", title: "Applications", Icon: FileText, bullets: ["Form guidance", "SOP / Essays", "Targeted apps"], gradient: "from-cyan-500 to-sky-600", shadow: "shadow-cyan-500/40" },
  { n: "07", title: "GD-PI-WAT", Icon: Users, bullets: ["Mock interviews", "GD practice", "Feedback"], gradient: "from-fuchsia-500 to-purple-600", shadow: "shadow-fuchsia-500/40" },
  { n: "08", title: "Convert & Finance", Icon: Trophy, bullets: ["Admit strategy", "Waitlist guidance", "Loan & ROI"], gradient: "from-yellow-500 to-amber-600", shadow: "shadow-amber-500/40" },
];

const N = steps.length;
const ANGLE = 360 / N;

const MBAJourneySection = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0 → 1 across pinned scroll
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Total scroll distance the wrapper occupies beyond viewport
      const total = el.offsetHeight - vh;
      // How far we've scrolled into the wrapper
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      setProgress(p);
      setActiveIdx(Math.min(N - 1, Math.floor(p * N)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Rotation angle 0 → -315 (covers 8 steps, lands on step 8)
  const rotation = -progress * ANGLE * (N - 1);

  return (
    // Pinned wrapper: ~250vh tall so user scrolls ~1.5 screens to advance through all 8 steps
    <div ref={wrapperRef} className="relative" style={{ height: "260vh" }}>
      <section
        className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-b from-background via-primary/[0.05] to-background"
        aria-labelledby="mba-journey-title"
      >
        {/* Animated background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl animate-pulse" />
          <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDelay: "0.8s" }} />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-3 md:mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase mb-1.5 backdrop-blur-sm border border-primary/20">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Your MBA Journey
              <Sparkles className="h-3 w-3 animate-pulse" />
            </div>
            <h2
              id="mba-journey-title"
              className="text-lg md:text-2xl lg:text-3xl font-bold tracking-tight text-foreground"
            >
              Your Complete MBA Journey —{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]">
                Guided at Every Step
              </span>
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Scroll to navigate through all 8 stages
            </p>
          </div>

          {/* ===== MOBILE: Single focused card ===== */}
          <div className="md:hidden">
            <div className="relative h-[300px] flex items-center justify-center" style={{ perspective: "1000px" }}>
              {steps.map((step, i) => {
                const offset = i - activeIdx;
                const isActive = offset === 0;
                const visible = Math.abs(offset) <= 1;
                if (!visible) return null;
                const { n, title, Icon, bullets, gradient, shadow } = step;
                return (
                  <div
                    key={n}
                    className="absolute w-[240px] transition-all duration-500 ease-out"
                    style={{
                      transform: `translateX(${offset * 60}%) translateZ(${isActive ? 0 : -150}px) rotateY(${offset * -25}deg) scale(${isActive ? 1 : 0.8})`,
                      opacity: isActive ? 1 : 0.4,
                      zIndex: isActive ? 10 : 1,
                    }}
                  >
                    <div className={`relative rounded-2xl bg-card border border-border overflow-hidden shadow-2xl ${isActive ? shadow : ""}`}>
                      <div className={`relative h-16 bg-gradient-to-br ${gradient}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_60%)]" />
                      </div>
                      <div className="absolute top-2 right-2 h-6 px-2 rounded-full bg-white/95 text-[10px] font-bold text-foreground flex items-center justify-center shadow-md z-10">
                        STEP {n}
                      </div>
                      <div className="relative -mt-7 flex justify-center">
                        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-xl ring-4 ring-card animate-[bob_3s_ease-in-out_infinite]`}>
                          <Icon className="h-6 w-6" strokeWidth={2.3} />
                        </div>
                      </div>
                      <div className="px-4 pt-2 pb-4">
                        <h3 className="text-sm font-bold text-foreground text-center mb-2">
                          {title}
                        </h3>
                        <ul className="space-y-1">
                          {bullets.map((b) => (
                            <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== DESKTOP: 3D rotating carousel driven by scroll ===== */}
          <div
            className="hidden md:block relative mx-auto"
            style={{
              perspective: "1400px",
              perspectiveOrigin: "50% 45%",
              height: "300px",
            }}
          >
            {/* Glow platform shadow */}
            <div
              aria-hidden
              className="absolute left-1/2 bottom-2 -translate-x-1/2 h-8 w-[460px] max-w-[80vw] rounded-[50%] bg-primary/30 blur-2xl"
            />
            {/* Orbit ring */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[520px] w-[520px] rounded-full border border-primary/15"
              style={{ transform: "translate(-50%, -50%) rotateX(72deg)" }}
            />
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[420px] w-[420px] rounded-full border border-primary/10"
              style={{ transform: "translate(-50%, -50%) rotateX(72deg)" }}
            />

            <div
              className="relative w-full h-full mx-auto"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateY(${rotation}deg)`,
                transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {steps.map((step, i) => {
                const { n, title, Icon, bullets, gradient, shadow } = step;
                const isActive = i === activeIdx;
                const RADIUS = 300;
                const CARD_W = 200;
                const CARD_H = 230;
                return (
                  <div
                    key={n}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      width: `${CARD_W}px`,
                      height: `${CARD_H}px`,
                      marginLeft: `-${CARD_W / 2}px`,
                      marginTop: `-${CARD_H / 2}px`,
                      transform: `rotateY(${i * ANGLE}deg) translateZ(${RADIUS}px)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div
                      className={`relative w-full h-full rounded-2xl bg-card backdrop-blur-md border overflow-hidden transition-all duration-500 ${
                        isActive
                          ? `scale-110 border-primary/60 shadow-2xl ${shadow}`
                          : "border-border shadow-xl opacity-70"
                      }`}
                      style={{
                        boxShadow: isActive
                          ? "0 30px 60px -15px rgba(0,0,0,0.3), 0 0 0 1px hsl(var(--primary) / 0.2)"
                          : "0 15px 30px -10px rgba(0,0,0,0.2)",
                      }}
                    >
                      {/* gradient header */}
                      <div className={`relative h-14 bg-gradient-to-br ${gradient}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_60%)]" />
                      </div>
                      <div className="absolute top-1.5 right-1.5 h-5 px-1.5 rounded-full bg-white/95 text-[9px] font-bold text-foreground flex items-center justify-center shadow-md z-10">
                        {n}
                      </div>
                      <div className="relative -mt-6 flex justify-center">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-lg ring-[3px] ring-card ${isActive ? "animate-[bob_2s_ease-in-out_infinite]" : ""}`}>
                          <Icon className="h-5 w-5" strokeWidth={2.3} />
                        </div>
                      </div>
                      <div className="px-3 pt-2 pb-3">
                        <h3 className="text-[13px] font-bold text-foreground text-center mb-1.5 leading-tight">
                          {title}
                        </h3>
                        <ul className="space-y-1">
                          {bullets.map((b) => (
                            <li key={b} className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary flex-shrink-0" />
                              <span className="truncate">{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-3 md:mt-4">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? "w-6 bg-primary"
                    : i < activeIdx
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Active step indicator + scroll hint */}
          <div className="text-center mt-2">
            <p className="text-xs md:text-sm font-semibold text-foreground">
              <span className="text-primary">Step {steps[activeIdx].n}</span> · {steps[activeIdx].title}
            </p>
            {progress < 0.95 && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 inline-flex items-center gap-1">
                <ChevronDown className="h-3 w-3 animate-bounce" />
                Scroll to continue
              </p>
            )}
          </div>

          {/* CTA row */}
          <div className="mt-2 md:mt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button asChild size="sm" className="w-full sm:w-auto h-9 hover-scale shadow-lg hover:shadow-primary/40">
              <Link to="/profile-analyzer">
                Start Your MBA Journey
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto h-9 hover-scale backdrop-blur-sm">
              <Link to="/contact">Get Free Counseling</Link>
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
          }
          @keyframes bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>
      </section>
    </div>
  );
};

export default MBAJourneySection;
