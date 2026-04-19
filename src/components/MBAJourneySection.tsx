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

const StepCard = ({ step }: { step: Step }) => {
  const { n, title, Icon, bullets, gradient } = step;
  return (
    <div className="group relative w-[230px] md:w-[260px] flex-shrink-0 rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 hover:border-primary/50 transition-all duration-500 cursor-pointer overflow-hidden">
      {/* gradient glow on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />

      {/* shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center gap-2.5 mb-3">
        <div className={`relative h-11 w-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 flex-shrink-0`}>
          <Icon className="h-5 w-5" strokeWidth={2.3} />
          <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border text-[10px] font-bold text-foreground flex items-center justify-center shadow-sm">
            {n}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-foreground leading-tight">
          {title}
        </h3>
      </div>

      <ul className="relative space-y-1">
        {bullets.map((b) => (
          <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="truncate">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MBAJourneySection = () => {
  // duplicate for seamless marquee
  const loop = [...steps, ...steps];

  return (
    <section
      className="relative overflow-hidden py-8 md:py-12 bg-gradient-to-b from-background via-primary/[0.04] to-background"
      aria-labelledby="mba-journey-title"
    >
      {/* animated background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-5 md:mb-7 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase mb-2">
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
          <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
            From the right MBA to converting your dream B-school — we support you throughout.
          </p>
        </div>
      </div>

      {/* Marquee — pause on hover, fade edges */}
      <div className="relative group/marquee">
        {/* edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

        <div className="flex gap-3 md:gap-4 animate-[marquee_40s_linear_infinite] group-hover/marquee:[animation-play-state:paused] py-2">
          {loop.map((step, i) => (
            <StepCard key={`${step.n}-${i}`} step={step} />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* CTA row */}
        <div className="mt-5 md:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-3 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
          <Button asChild size="sm" className="w-full sm:w-auto h-9 hover-scale shadow-md hover:shadow-lg">
            <Link to="/profile-analyzer">
              Start Your MBA Journey
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto h-9 hover-scale">
            <Link to="/contact">Get Free Counseling</Link>
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70 mt-2 animate-fade-in" style={{ animationDelay: "500ms", animationFillMode: "both" }}>
          ✨ Hover over any step to pause and explore
        </p>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </section>
  );
};

export default MBAJourneySection;
