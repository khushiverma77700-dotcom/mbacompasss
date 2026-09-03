import { Link } from "@/lib/router-compat";
import { UserSearch, Calculator, Sigma, LineChart, ArrowUpRight, Sparkles } from "lucide-react";

const TOOLS = [
  {
    icon: UserSearch,
    title: "AI Profile Analyzer",
    desc: "Call probability in 60 sec",
    to: "/profile-analyzer",
  },
  {
    icon: Calculator,
    title: "MBA ROI Calculator",
    desc: "Fees vs CTC payback",
    to: "/roi-calculator",
  },
  {
    icon: Sigma,
    title: "CAT Score Calculator",
    desc: "Score to percentile",
    to: "/cat-score-calculator",
  },
  {
    icon: LineChart,
    title: "XAT Score Calculator",
    desc: "XAT scoring & percentile",
    to: "/exam/xat",
  },
];

const ToolCard = ({
  icon: Icon,
  title,
  desc,
  to,
}: (typeof TOOLS)[number]) => (
  <Link
    to={to}
    className="group flex w-[230px] shrink-0 items-center gap-3 rounded-xl border border-primary/15 bg-card px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-5 w-5 text-primary" strokeWidth={2.2} />
    </span>
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
      <span className="block truncate text-xs text-muted-foreground">{desc}</span>
    </span>
    <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-primary/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
  </Link>
);

const GuidanceToolsSlider = () => {
  const loop = [...TOOLS, ...TOOLS];

  return (
    <div className="mt-10 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
          Free AI tools while you wait
        </h2>
      </div>

      <div className="freebies-marquee-track relative mt-3 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-card to-transparent" />
        <div className="freebies-marquee tools-speed flex w-max gap-3">
          {loop.map((tool, i) => (
            <ToolCard key={`${tool.title}-${i}`} {...tool} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuidanceToolsSlider;
