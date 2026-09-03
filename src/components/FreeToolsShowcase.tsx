import { Link } from "@/lib/router-compat";
import { UserSearch, ListChecks, Calculator, Sigma, ArrowRight, Sparkles } from "lucide-react";

const TOOLS = [
  {
    icon: UserSearch,
    title: "AI Profile Analyzer",
    desc: "Upload your academics, work-ex & CAT score. Get an IIM/FMS/SPJain call probability report in 60 seconds.",
    stat: "12,400+ analyzed",
    to: "/profile-analyzer",
    accent: "from-sky-500/10 to-cyan-500/5",
    ring: "ring-sky-400/30",
  },
  {
    icon: ListChecks,
    title: "College Shortlister",
    desc: "Answer 6 questions on budget, location & goals — get a personalized shortlist across 500+ B-schools.",
    stat: "500+ colleges scored",
    to: "/college-shortlister",
    accent: "from-blue-500/10 to-sky-500/5",
    ring: "ring-blue-400/30",
  },
  {
    icon: Calculator,
    title: "MBA ROI Calculator",
    desc: "Compare fees vs expected CTC & 5-year payback for any B-school. Know if it's worth the loan before you apply.",
    stat: "Payback in years",
    to: "/roi-calculator",
    accent: "from-cyan-500/10 to-sky-500/5",
    ring: "ring-cyan-400/30",
  },
  {
    icon: Sigma,
    title: "CAT Score → Percentile",
    desc: "Convert your raw CAT score to sectional & overall percentile using the last 5 years of official normalisation data.",
    stat: "5-year data",
    to: "/cat-score-calculator",
    accent: "from-sky-500/10 to-blue-500/5",
    ring: "ring-sky-400/30",
  },
];

const FreeToolsShowcase = () => (
  <section className="py-12 md:py-16 bg-gradient-to-b from-sky-50/40 via-white to-white">
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center mb-8 md:mb-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5" /> Free AI Tools
        </div>
        <h2 className="text-2xl md:text-4xl font-bold mt-3 text-foreground">
          Decide smarter. Not just harder.
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-2">
          Four calculators MBA aspirants use before every decision — from shortlisting to ROI.
          Instant. Data-backed. 100% free.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-5xl mx-auto">
        {TOOLS.map(({ icon: Icon, title, desc, stat, to, accent, ring }) => (
          <Link
            key={title}
            to={to}
            className={`group relative overflow-hidden rounded-2xl bg-white border border-primary/10 ring-1 ${ring} p-5 md:p-6 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(14,165,233,0.35)] transition-all duration-300`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-60 pointer-events-none`} />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="w-12 h-12 rounded-xl bg-white ring-1 ring-primary/15 flex items-center justify-center shadow-xs">
                  <Icon className="w-6 h-6 text-primary" strokeWidth={2.2} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-500/10 ring-1 ring-emerald-500/20 px-2 py-0.5 rounded-full">
                  Free
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold mt-4 text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-primary/80">{stat}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                  Try it now <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default FreeToolsShowcase;
