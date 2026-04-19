import { Link } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = {
  n: string;
  title: string;
  Icon: typeof Compass;
  bullets: string[];
  gradient: string;
};

const steps: Step[] = [
  { n: "01", title: "Career Clarity", Icon: Compass, bullets: ["Profile evaluation", "Shortlisting", "Roadmap"], gradient: "from-sky-500 to-blue-600" },
  { n: "02", title: "Exam Strategy", Icon: Target, bullets: ["CAT / NMAT / XAT", "Study plan", "Strategy"], gradient: "from-violet-500 to-indigo-600" },
  { n: "03", title: "Prep & Mocks", Icon: BookOpen, bullets: ["Classes & material", "Mock analytics", "Tracking"], gradient: "from-emerald-500 to-teal-600" },
  { n: "04", title: "Form Filling", Icon: ClipboardCheck, bullets: ["Step-by-step help", "Error-free", "Reminders"], gradient: "from-amber-500 to-orange-600" },
  { n: "05", title: "Score & Predict", Icon: LineChart, bullets: ["Percentile analysis", "College predictor", "Best-fit"], gradient: "from-pink-500 to-rose-600" },
  { n: "06", title: "Applications", Icon: FileText, bullets: ["Form guidance", "SOP / Essays", "Targeted apps"], gradient: "from-cyan-500 to-sky-600" },
  { n: "07", title: "GD-PI-WAT", Icon: Users, bullets: ["Mock interviews", "GD practice", "Feedback"], gradient: "from-fuchsia-500 to-purple-600" },
  { n: "08", title: "Convert & Finance", Icon: Trophy, bullets: ["Admit strategy", "Waitlist guidance", "Loan & ROI"], gradient: "from-yellow-500 to-amber-600" },
];

const N = steps.length;
const ANGLE = 360 / N; // 45deg per card
const RADIUS = 340; // px — distance of cards from center

const MBAJourneySection = () => {
  return (
    <section
      className="relative overflow-hidden py-8 md:py-10 bg-gradient-to-b from-background via-primary/[0.04] to-background"
      aria-labelledby="mba-journey-title"
    >
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDelay: "0.8s" }} />
        {/* floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-primary/40"
            style={{
              top: `${15 + i * 13}%`,
              left: `${10 + i * 14}%`,
              animation: `float ${4 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-3 md:mb-4 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase mb-2 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Your MBA Journey
            <Sparkles className="h-3 w-3 animate-pulse" />
          </div>
          <h2
            id="mba-journey-title"
            className="text-xl md:text-3xl font-bold tracking-tight text-foreground"
          >
            Your Complete MBA Journey —{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]">
              Guided at Every Step
            </span>
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            From the right MBA to converting your dream B-school — we support you throughout.
          </p>
        </div>

        {/* 3D Carousel Stage */}
        <div
          className="relative mx-auto group/stage"
          style={{
            perspective: "1400px",
            perspectiveOrigin: "50% 50%",
            height: "320px",
          }}
        >
          {/* glowing platform */}
          <div
            aria-hidden
            className="absolute left-1/2 bottom-4 -translate-x-1/2 h-8 w-[480px] max-w-[90vw] rounded-[50%] bg-primary/20 blur-2xl"
          />

          <div
            className="relative w-full h-full mx-auto"
            style={{
              transformStyle: "preserve-3d",
              animation: "spin3d 32s linear infinite",
              animationPlayState: "running",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
            onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
          >
            {steps.map((step, i) => {
              const { n, title, Icon, bullets, gradient } = step;
              return (
                <div
                  key={n}
                  className="absolute top-1/2 left-1/2 w-[240px] h-[260px] -ml-[120px] -mt-[130px]"
                  style={{
                    transform: `rotateY(${i * ANGLE}deg) translateZ(${RADIUS}px)`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="group/card relative w-full h-full rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl overflow-hidden transition-transform duration-500 hover:scale-105">
                    {/* gradient header */}
                    <div className={`absolute top-0 left-0 right-0 h-20 bg-gradient-to-br ${gradient} opacity-90`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
                    </div>

                    {/* Step badge */}
                    <div className="absolute top-3 right-3 h-7 px-2.5 rounded-full bg-white/95 text-[10px] font-bold text-foreground flex items-center justify-center shadow-md z-10">
                      STEP {n}
                    </div>

                    {/* Icon — floating over header */}
                    <div className="relative pt-4 flex justify-center">
                      <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-xl ring-4 ring-background animate-[bob_3s_ease-in-out_infinite]`}>
                        <Icon className="h-7 w-7" strokeWidth={2.2} />
                      </div>
                    </div>

                    {/* Body */}
                    <div className="relative px-4 pt-3 pb-4">
                      <h3 className="text-sm font-bold text-foreground text-center mb-2.5 leading-tight">
                        {title}
                      </h3>
                      <ul className="space-y-1.5">
                        {bullets.map((b) => (
                          <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="truncate">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA row */}
        <div className="mt-3 md:mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-3 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
          <Button asChild size="sm" className="w-full sm:w-auto h-9 hover-scale shadow-lg hover:shadow-primary/30">
            <Link to="/profile-analyzer">
              Start Your MBA Journey
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto h-9 hover-scale">
            <Link to="/contact">Get Free Counseling</Link>
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70 mt-1.5">
          ✨ Hover anywhere on the carousel to pause
        </p>
      </div>

      <style>{`
        @keyframes spin3d {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(-360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); opacity: 0.4; }
          50% { transform: translate(20px, -20px); opacity: 0.8; }
        }
        @media (max-width: 768px) {
          @keyframes spin3d {
            from { transform: rotateY(0deg); }
            to { transform: rotateY(-360deg); }
          }
        }
      `}</style>
    </section>
  );
};

export default MBAJourneySection;
