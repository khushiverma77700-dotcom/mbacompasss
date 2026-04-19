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
const ANGLE = 360 / N;
const RADIUS = 280;
const CARD_W = 180;
const CARD_H = 210;

const MBAJourneySection = () => {
  return (
    <section
      className="relative overflow-hidden py-6 md:py-8 bg-gradient-to-b from-background via-primary/[0.05] to-background"
      aria-labelledby="mba-journey-title"
    >
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[460px] w-[460px] rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDelay: "0.8s" }} />
        {/* grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* floating particles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-primary/50"
            style={{
              top: `${10 + i * 11}%`,
              left: `${8 + i * 12}%`,
              animation: `float ${4 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-2 md:mb-3 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase mb-1.5 backdrop-blur-sm border border-primary/20">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Your MBA Journey
            <Sparkles className="h-3 w-3 animate-pulse" />
          </div>
          <h2
            id="mba-journey-title"
            className="text-lg md:text-2xl font-bold tracking-tight text-foreground"
          >
            Your Complete MBA Journey —{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]">
              Guided at Every Step
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            From the right MBA to converting your dream B-school.
          </p>
        </div>

        {/* 3D Carousel Stage */}
        <div
          className="relative mx-auto"
          style={{
            perspective: "1200px",
            perspectiveOrigin: "50% 45%",
            height: "260px",
          }}
        >
          {/* glowing platform shadow */}
          <div
            aria-hidden
            className="absolute left-1/2 bottom-2 -translate-x-1/2 h-6 w-[400px] max-w-[80vw] rounded-[50%] bg-primary/25 blur-2xl"
          />
          {/* ring beneath */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[480px] w-[480px] rounded-full border border-primary/10"
            style={{ transform: "translate(-50%, -50%) rotateX(75deg)" }}
          />

          <div
            className="relative w-full h-full mx-auto group/stage"
            style={{
              transformStyle: "preserve-3d",
              animation: "spin3d 28s linear infinite",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
            onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
          >
            {steps.map((step, i) => {
              const { n, title, Icon, bullets, gradient } = step;
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
                  <div className="group/card relative w-full h-full rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-2xl overflow-hidden transition-all duration-500 hover:scale-110 hover:border-primary/60 hover:shadow-primary/30">
                    {/* gradient header */}
                    <div className={`absolute top-0 left-0 right-0 h-14 bg-gradient-to-br ${gradient}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_60%)]" />
                      {/* shine sweep */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/card:translate-x-full transition-transform duration-1000" />
                    </div>

                    {/* Step badge */}
                    <div className="absolute top-1.5 right-1.5 h-5 px-1.5 rounded-full bg-white/95 text-[9px] font-bold text-foreground flex items-center justify-center shadow-md z-10">
                      {n}
                    </div>

                    {/* Icon — floating */}
                    <div className="relative pt-2 flex justify-center">
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-lg ring-[3px] ring-card animate-[bob_3s_ease-in-out_infinite]`}>
                        <Icon className="h-5 w-5" strokeWidth={2.3} />
                      </div>
                    </div>

                    {/* Body */}
                    <div className="relative px-3 pt-2 pb-3">
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

        {/* CTA row */}
        <div className="mt-2 md:mt-3 flex flex-col sm:flex-row items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
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

        <p className="text-center text-[10px] text-muted-foreground/70 mt-1">
          ✨ Hover to pause • Click any step
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
          50% { transform: translateY(-3px); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); opacity: 0.4; }
          50% { transform: translate(15px, -15px); opacity: 0.9; }
        }
      `}</style>
    </section>
  );
};

export default MBAJourneySection;
