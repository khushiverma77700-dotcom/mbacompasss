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
  glow: string;
};

const steps: Step[] = [
  { n: "01", title: "Career Clarity", Icon: Compass, bullets: ["Profile evaluation", "Shortlisting", "Roadmap"], gradient: "from-sky-500 to-blue-600", glow: "14,165,233" },
  { n: "02", title: "Exam Strategy", Icon: Target, bullets: ["CAT / NMAT / XAT", "Study plan", "Strategy"], gradient: "from-violet-500 to-indigo-600", glow: "139,92,246" },
  { n: "03", title: "Prep & Mocks", Icon: BookOpen, bullets: ["Classes & material", "Mock analytics", "Tracking"], gradient: "from-emerald-500 to-teal-600", glow: "16,185,129" },
  { n: "04", title: "Form Filling", Icon: ClipboardCheck, bullets: ["Step-by-step help", "Error-free", "Reminders"], gradient: "from-amber-500 to-orange-600", glow: "245,158,11" },
  { n: "05", title: "Score & Predict", Icon: LineChart, bullets: ["Percentile analysis", "College predictor", "Best-fit"], gradient: "from-pink-500 to-rose-600", glow: "236,72,153" },
  { n: "06", title: "Applications", Icon: FileText, bullets: ["Form guidance", "SOP / Essays", "Targeted apps"], gradient: "from-cyan-500 to-sky-600", glow: "6,182,212" },
  { n: "07", title: "GD-PI-WAT", Icon: Users, bullets: ["Mock interviews", "GD practice", "Feedback"], gradient: "from-fuchsia-500 to-purple-600", glow: "217,70,239" },
  { n: "08", title: "Convert & Finance", Icon: Trophy, bullets: ["Admit strategy", "Waitlist guidance", "Loan & ROI"], gradient: "from-yellow-500 to-amber-600", glow: "234,179,8" },
];

const N = steps.length;
const ANGLE = 360 / N;

const MBAJourneySection = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  useEffect(() => {
    let lastIdx = -1;

    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = el.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;

      targetRotation.current = -p * ANGLE * (N - 1);
      const idx = Math.min(N - 1, Math.floor(p * N));
      if (idx !== lastIdx) {
        lastIdx = idx;
        setActiveIdx(idx);
      }
    };

    // Smooth interpolation loop — runs every frame for buttery rotation
    const tick = () => {
      currentRotation.current += (targetRotation.current - currentRotation.current) * 0.15;
      if (stageRef.current) {
        stageRef.current.style.transform = `rotateY(${currentRotation.current.toFixed(2)}deg)`;
      }
      if (mobileTrackRef.current) {
        const offset = -targetRotation.current / ANGLE; // 0..7
        mobileTrackRef.current.style.transform = `translate3d(${-offset * 100}%, 0, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    update();
    tick();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    // Pinned wrapper
    <div ref={wrapperRef} className="relative" style={{ height: "260vh" }}>
      <section
        className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-b from-background via-primary/[0.05] to-background"
        aria-labelledby="mba-journey-title"
        style={{ contain: "layout paint" }}
      >
        {/* Background — static, GPU-friendly (no animated blurs) */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            }}
          />
        </div>

        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-3 md:mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase mb-1.5 border border-primary/20">
              <Sparkles className="h-3 w-3" />
              Your MBA Journey
              <Sparkles className="h-3 w-3" />
            </div>
            <h2
              id="mba-journey-title"
              className="text-lg md:text-2xl lg:text-3xl font-bold tracking-tight text-foreground"
              style={{ textShadow: "0 1px 2px hsl(var(--primary) / 0.1)" }}
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

          {/* ===== MOBILE: smooth horizontal carousel ===== */}
          <div className="md:hidden overflow-hidden">
            <div className="relative h-[280px]" style={{ perspective: "1000px" }}>
              <div
                ref={mobileTrackRef}
                className="absolute inset-0 flex items-center"
                style={{
                  willChange: "transform",
                  transformStyle: "preserve-3d",
                  paddingLeft: "calc(50% - 120px)",
                }}
              >
                {steps.map((step, i) => {
                  const { n, title, Icon, bullets, gradient, glow } = step;
                  const isActive = i === activeIdx;
                  return (
                    <div
                      key={n}
                      className="w-[240px] flex-shrink-0 px-2 transition-all duration-500"
                      style={{
                        transform: isActive ? "scale(1) rotateY(0deg)" : "scale(0.85) rotateY(15deg)",
                        opacity: isActive ? 1 : 0.45,
                      }}
                    >
                      <MobileCard step={step} isActive={isActive} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== DESKTOP: 3D carousel ===== */}
          <div
            className="hidden md:block relative mx-auto"
            style={{
              perspective: "1600px",
              perspectiveOrigin: "50% 42%",
              height: "320px",
            }}
          >
            {/* Stage glow shadow */}
            <div
              aria-hidden
              className="absolute left-1/2 bottom-1 -translate-x-1/2 h-10 w-[500px] max-w-[80vw] rounded-[50%] blur-2xl"
              style={{
                background: `radial-gradient(ellipse, rgba(${steps[activeIdx].glow}, 0.45), transparent 70%)`,
                transition: "background 0.6s ease",
              }}
            />
            {/* Orbit rings */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[540px] w-[540px] rounded-full border border-primary/15"
              style={{ transform: "translate(-50%, -50%) rotateX(72deg)" }}
            />
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[440px] w-[440px] rounded-full border border-primary/10 border-dashed"
              style={{ transform: "translate(-50%, -50%) rotateX(72deg)" }}
            />

            <div
              ref={stageRef}
              className="relative w-full h-full mx-auto"
              style={{
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
            >
              {steps.map((step, i) => {
                const { n, title, Icon, bullets, gradient, glow } = step;
                const isActive = i === activeIdx;
                const RADIUS = 320;
                const CARD_W = 200;
                const CARD_H = 240;
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
                      className={`relative w-full h-full rounded-2xl bg-card border overflow-hidden transition-all duration-500 ${
                        isActive ? "scale-110 border-primary/60" : "border-border opacity-60"
                      }`}
                      style={{
                        boxShadow: isActive
                          ? `0 25px 50px -12px rgba(${glow}, 0.45), 0 0 0 1px rgba(${glow}, 0.3), 0 0 40px rgba(${glow}, 0.2)`
                          : "0 10px 25px -8px rgba(0,0,0,0.25)",
                        willChange: "transform",
                      }}
                    >
                      <CardContent step={step} isActive={isActive} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? "w-7 bg-primary"
                    : i < activeIdx
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Active step indicator */}
          <div className="text-center mt-2">
            <p className="text-xs md:text-sm font-semibold text-foreground">
              <span className="text-primary">Step {steps[activeIdx].n}</span> · {steps[activeIdx].title}
            </p>
            {activeIdx < N - 1 && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 inline-flex items-center gap-1">
                <ChevronDown className="h-3 w-3 animate-bounce" />
                Scroll to continue
              </p>
            )}
          </div>

          {/* CTA row */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button asChild size="sm" className="w-full sm:w-auto h-9 hover-scale shadow-lg hover:shadow-primary/40">
              <Link to="/profile-analyzer">
                Start Your MBA Journey
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto h-9 hover-scale">
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

// ===== Card content (shared) =====
const CardContent = ({ step, isActive }: { step: Step; isActive: boolean }) => {
  const { n, title, Icon, bullets, gradient } = step;
  return (
    <>
      {/* gradient header */}
      <div className={`relative h-14 bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/30" />
      </div>
      <div className="absolute top-1.5 right-1.5 h-5 px-1.5 rounded-full bg-white text-[9px] font-bold text-foreground flex items-center justify-center shadow-md z-10">
        {n}
      </div>
      <div className="relative -mt-6 flex justify-center">
        <div
          className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-lg ring-[3px] ring-card ${
            isActive ? "animate-[bob_2s_ease-in-out_infinite]" : ""
          }`}
        >
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
    </>
  );
};

const MobileCard = ({ step, isActive }: { step: Step; isActive: boolean }) => {
  const { glow } = step;
  return (
    <div
      className={`relative h-[240px] rounded-2xl bg-card border overflow-hidden ${
        isActive ? "border-primary/60" : "border-border"
      }`}
      style={{
        boxShadow: isActive
          ? `0 25px 50px -12px rgba(${glow}, 0.5), 0 0 0 1px rgba(${glow}, 0.3)`
          : "0 10px 25px -8px rgba(0,0,0,0.2)",
      }}
    >
      <CardContent step={step} isActive={isActive} />
    </div>
  );
};

export default MBAJourneySection;
