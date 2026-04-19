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
  cta?: { label: string; href: string };
};

const steps: Step[] = [
  {
    n: "01",
    title: "Career Clarity & MBA Guidance",
    Icon: Compass,
    bullets: ["Profile evaluation", "College shortlisting", "Personalized roadmap"],
    cta: { label: "Analyze My Profile", href: "/profile-analyzer" },
  },
  {
    n: "02",
    title: "Exam Selection & Strategy",
    Icon: Target,
    bullets: ["CAT / NMAT / XAT selection", "Study plan creation", "Preparation strategy"],
  },
  {
    n: "03",
    title: "Preparation & Mock Analysis",
    Icon: BookOpen,
    bullets: ["Classes & study material", "Mock tests & analytics", "Performance tracking"],
    cta: { label: "Find Coaching", href: "/coaching" },
  },
  {
    n: "04",
    title: "Exam Form Filling Support",
    Icon: ClipboardCheck,
    bullets: ["Step-by-step assistance", "Error-free submission", "Deadline reminders"],
  },
  {
    n: "05",
    title: "Score Analysis & College Prediction",
    Icon: LineChart,
    bullets: ["Score vs percentile analysis", "College predictor tool", "Best-fit recommendations"],
    cta: { label: "Try CAT Calculator", href: "/cat-score-calculator" },
  },
  {
    n: "06",
    title: "College Applications",
    Icon: FileText,
    bullets: ["Form filling guidance", "SOP / Essays support", "Targeted applications"],
  },
  {
    n: "07",
    title: "GD-PI-WAT Preparation",
    Icon: Users,
    bullets: ["Mock interviews", "GD practice", "Personalized feedback"],
  },
  {
    n: "08",
    title: "College Conversion & Financing",
    Icon: Trophy,
    bullets: ["Final admit strategy", "Waitlist movement guidance", "Education loan & ROI planning"],
    cta: { label: "Calculate ROI", href: "/mba-roi-calculator" },
  },
];

const trustStats = [
  { value: "50,000+", label: "Aspirants Guided" },
  { value: "2,000+", label: "B-Schools Mapped" },
  { value: "500+", label: "Coaching Partners" },
  { value: "8 Stages", label: "End-to-End Support" },
];

const MBAJourneySection = () => {
  return (
    <section
      className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-b from-background via-primary/[0.03] to-background"
      aria-labelledby="mba-journey-title"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 opacity-60">
        <div className="absolute top-10 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Your MBA Journey
          </div>
          <h2
            id="mba-journey-title"
            className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
          >
            Your Complete MBA Journey —{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Guided at Every Step
            </span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            From choosing the right MBA to converting your dream B-school, we support you
            throughout — with verified data, expert guidance, and AI-powered tools.
          </p>
        </div>

        {/* Steps Grid (responsive: stacked on mobile, 2-col tablet, 4-col desktop) */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          />

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {steps.map(({ n, title, Icon, bullets, cta }, idx) => (
              <li
                key={n}
                className="group relative bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300"
              >
                {/* Step number badge */}
                <div className="absolute -top-3 -right-3 h-9 min-w-9 px-2.5 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                  {n}
                </div>

                {/* Icon */}
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 leading-snug">
                  {title}
                </h3>

                <ul className="space-y-1.5 mb-4">
                  {bullets.map((b) => (
                    <li
                      key={b}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {cta && (
                  <Link
                    to={cta.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
                  >
                    {cta.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}

                {/* Connector arrow — desktop only, between cards in same row */}
                {idx % 4 !== 3 && idx !== steps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:flex absolute top-1/2 -right-3.5 -translate-y-1/2 h-7 w-7 rounded-full bg-background border border-primary/30 items-center justify-center text-primary z-10"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {trustStats.map((s) => (
            <div
              key={s.label}
              className="text-center p-4 rounded-xl bg-card/50 border border-border/60"
            >
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Final CTA row */}
        <div className="mt-10 md:mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/profile-analyzer">
              Start Your MBA Journey
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link to="/contact">Get Free Counseling</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MBAJourneySection;
