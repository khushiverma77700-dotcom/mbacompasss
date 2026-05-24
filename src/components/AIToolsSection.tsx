import { Link } from "react-router-dom";
import {
  Brain,
  School,
  Search,
  BarChart3,
  ArrowUpRight,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Calculator,
  ShieldCheck,
  Zap,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";

const tools = [
  {
    title: "AI Profile Analyser",
    description:
      "Get a 5-dimension score breakdown, SWOT analysis, peer comparison & personalized college predictions.",
    icon: Brain,
    path: "/profile-analyzer",
    accent: "139, 92, 246", // violet
    tag: "Most Popular",
    rating: "4.9",
    runs: "25K+",
    stats: [
      { icon: Target, label: "5D Score" },
      { icon: Users, label: "25K+ Reports" },
    ],
  },
  {
    title: "AI College Finder",
    description:
      "8-step smart wizard matches you with best-fit B-schools by budget, location, ROI & career goals.",
    icon: School,
    path: "/college-finder",
    accent: "59, 130, 246", // blue
    tag: "New",
    rating: "4.8",
    runs: "12K+",
    stats: [
      { icon: TrendingUp, label: "ROI Data" },
      { icon: Search, label: "200+ Colleges" },
    ],
  },
  {
    title: "AI Coaching Finder",
    description:
      "Discover the ideal MBA coaching institute matched to your exam, city, budget & learning style.",
    icon: Search,
    path: "/compare",
    accent: "16, 185, 129", // emerald
    tag: "Smart Match",
    rating: "4.8",
    runs: "9K+",
    stats: [
      { icon: Users, label: "500+ Institutes" },
      { icon: Sparkles, label: "AI Match" },
    ],
  },
  {
    title: "Compare Colleges",
    description:
      "Side-by-side comparison across placements, fees, ROI, campus & admissions with AI verdict.",
    icon: BarChart3,
    path: "/college-finder#compare",
    accent: "245, 158, 11", // amber
    tag: "Deep Dive",
    rating: "4.7",
    runs: "7K+",
    stats: [
      { icon: BarChart3, label: "5 Tabs" },
      { icon: Target, label: "50+ Metrics" },
    ],
  },
  {
    title: "CAT Score Calculator",
    description:
      "Paste your CAT response sheet and get instant section-wise score, accuracy & percentile estimate.",
    icon: Calculator,
    path: "/cat-score-calculator",
    accent: "6, 182, 212", // cyan
    tag: "Viral",
    rating: "4.9",
    runs: "40K+",
    stats: [
      { icon: Target, label: "Section-wise" },
      { icon: TrendingUp, label: "Percentile" },
    ],
  },
  {
    title: "MBA ROI Calculator",
    description:
      "Calculate MBA payback period, expected salary jump, and AI-matched college ROI before you invest.",
    icon: TrendingUp,
    path: "/roi-calculator",
    accent: "234, 88, 12", // orange
    tag: "New",
    rating: "4.8",
    runs: "15K+",
    stats: [
      { icon: TrendingUp, label: "Payback" },
      { icon: Target, label: "AI Match" },
    ],
  },
];

const AIToolsSection = () => {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Layered premium background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-50/40 to-transparent dark:via-sky-950/10" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/[0.05] rounded-full blur-[120px]" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-400/[0.06] rounded-full blur-[90px]" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-400/[0.05] rounded-full blur-[90px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 via-blue-500/10 to-violet-500/10 border border-primary/20 mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wider uppercase">
              AI-Powered Toolkit
            </span>
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span className="text-[10px] font-medium text-primary/80">100% Free</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Your{" "}
            <span className="bg-gradient-to-r from-primary via-blue-600 to-violet-600 bg-clip-text text-transparent">
              MBA Success Toolkit
            </span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Six precision-built AI tools to guide every step of your MBA journey — from
            profile analysis to final college selection.
          </p>
        </motion.div>

        {/* Premium grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: "easeOut" }}
            >
              <Link
                to={tool.path}
                aria-label={`Open ${tool.title}`}
                className="group relative block h-full rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(15,23,42,0.04)",
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(600px circle at 50% 0%, rgba(${tool.accent}, 0.10), transparent 60%)`,
                  }}
                />

                {/* Top gradient bar */}
                <div
                  className="h-1 w-full"
                  style={{
                    background: `linear-gradient(90deg, rgba(${tool.accent}, 1), rgba(${tool.accent}, 0.4))`,
                  }}
                />

                {/* Tag */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, rgba(${tool.accent},1), rgba(${tool.accent},0.75))`,
                    }}
                  >
                    {tool.tag}
                  </span>
                </div>

                <div className="p-5 md:p-6">
                  {/* Icon + rating row */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                      style={{
                        background: `linear-gradient(135deg, rgba(${tool.accent}, 0.18), rgba(${tool.accent}, 0.04))`,
                        border: `1px solid rgba(${tool.accent}, 0.2)`,
                        boxShadow: `0 8px 24px -8px rgba(${tool.accent}, 0.35)`,
                      }}
                    >
                      <tool.icon
                        className="w-6 h-6"
                        style={{ color: `rgba(${tool.accent}, 1)` }}
                      />
                      {/* Glossy shine */}
                      <div className="absolute inset-x-1 top-1 h-1/2 rounded-t-xl bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                    </div>

                    <div className="flex flex-col items-end gap-1 mr-14">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[11px] font-bold text-foreground">
                          {tool.rating}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {tool.runs} runs
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground text-lg mb-2 leading-tight tracking-tight">
                    {tool.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground text-[13px] leading-relaxed mb-4 line-clamp-3">
                    {tool.description}
                  </p>

                  {/* Feature chips */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {tool.stats.map((s) => (
                      <span
                        key={s.label}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border/50 text-[10.5px] font-medium text-foreground/80"
                      >
                        <s.icon
                          className="w-3 h-3"
                          style={{ color: `rgba(${tool.accent}, 1)` }}
                        />
                        {s.label}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-300 group-hover:shadow-md"
                    style={{
                      background: `linear-gradient(135deg, rgba(${tool.accent}, 0.10), rgba(${tool.accent}, 0.04))`,
                      border: `1px solid rgba(${tool.accent}, 0.18)`,
                    }}
                  >
                    <span
                      className="text-[12.5px] font-semibold flex items-center gap-1.5"
                      style={{ color: `rgba(${tool.accent}, 1)` }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Try it Free
                    </span>
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 group-hover:rotate-45"
                      style={{
                        background: `rgba(${tool.accent}, 0.15)`,
                        color: `rgba(${tool.accent}, 1)`,
                      }}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Trust strip */}
        <motion.div
          className="mt-12 md:mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs md:text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <span className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 grid place-items-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </span>
            Powered by Advanced AI
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-500/10 grid place-items-center">
              <Users className="w-3.5 h-3.5 text-blue-600" />
            </span>
            Trusted by 10,000+ Aspirants
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 grid place-items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            100% Free, No Credit Card
          </span>
        </motion.div>
      </div>
    </section>
  );
};

export default AIToolsSection;
