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
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = {
  n: string;
  title: string;
  Icon: typeof Compass;
  bullets: string[];
};

const steps: Step[] = [
  { n: "01", title: "Career Clarity", Icon: Compass, bullets: ["Profile evaluation", "Shortlisting", "Roadmap"] },
  { n: "02", title: "Exam Strategy", Icon: Target, bullets: ["CAT / NMAT / XAT", "Study plan", "Strategy"] },
  { n: "03", title: "Prep & Mocks", Icon: BookOpen, bullets: ["Classes & material", "Mock analytics", "Tracking"] },
  { n: "04", title: "Form Filling", Icon: ClipboardCheck, bullets: ["Step-by-step help", "Error-free", "Reminders"] },
  { n: "05", title: "Score & Predict", Icon: LineChart, bullets: ["Percentile analysis", "College predictor", "Best-fit"] },
  { n: "06", title: "Applications", Icon: FileText, bullets: ["Form guidance", "SOP / Essays", "Targeted apps"] },
  { n: "07", title: "GD-PI-WAT", Icon: Users, bullets: ["Mock interviews", "GD practice", "Feedback"] },
  { n: "08", title: "Convert & Finance", Icon: Trophy, bullets: ["Admit strategy", "Waitlist guidance", "Loan & ROI"] },
];

const MBAJourneySection = () => {
  return (
    <section
      className="relative overflow-hidden py-10 md:py-14 bg-gradient-to-b from-background via-primary/[0.03] to-background"
      aria-labelledby="mba-journey-title"
    >
      <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header — compact */}
        <div className="text-center max-w-2xl mx-auto mb-6 md:mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide uppercase mb-2">
            <Sparkles className="h-3 w-3" />
            Your MBA Journey
          </div>
          <h2
            id="mba-journey-title"
            className="text-xl md:text-3xl font-bold tracking-tight text-foreground"
          >
            Your Complete MBA Journey —{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Guided at Every Step
            </span>
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
            From the right MBA to converting your dream B-school — we support you throughout.
          </p>
        </div>

        {/* Steps — 4x2 always, fits on screen */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-9 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          />

          <ol className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
            {steps.map(({ n, title, Icon, bullets }, idx) => (
              <li
                key={n}
                className="group relative bg-card border border-border rounded-xl p-3 md:p-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300 animate-fade-in opacity-0"
                style={{
                  animationDelay: `${idx * 70}ms`,
                  animationFillMode: "forwards",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-primary/70 leading-none">STEP {n}</div>
                    <h3 className="text-xs md:text-sm font-semibold text-foreground leading-tight mt-0.5 truncate">
                      {title}
                    </h3>
                  </div>
                </div>

                <ul className="space-y-0.5">
                  {bullets.map((b) => (
                    <li
                      key={b}
                      className="text-[11px] md:text-xs text-muted-foreground flex items-center gap-1.5"
                    >
                      <span className="h-1 w-1 rounded-full bg-primary/60 flex-shrink-0" />
                      <span className="truncate">{b}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA row — compact */}
        <div className="mt-5 md:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-3 animate-fade-in" style={{ animationDelay: "600ms", animationFillMode: "both" }}>
          <Button asChild size="sm" className="w-full sm:w-auto h-9 hover-scale">
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
    </section>
  );
};

export default MBAJourneySection;
