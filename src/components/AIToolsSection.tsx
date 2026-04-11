import { Link } from "react-router-dom";
import { Brain, School, Search, BarChart3, ArrowRight, Sparkles, Target, TrendingUp, Users, Calculator } from "lucide-react";
import { motion } from "framer-motion";

const tools = [
  {
    title: "AI Profile Analyser",
    description: "Get a 5-dimension score breakdown, SWOT analysis, peer comparison & personalized college predictions.",
    icon: Brain,
    path: "/profile-analyzer",
    color: "139, 92, 246",
    stats: [
      { icon: Target, label: "5D Score" },
      { icon: Users, label: "25K+ Users" },
    ],
    tag: "Most Popular",
  },
  {
    title: "AI College Finder",
    description: "8-step smart wizard matches you with best-fit B-schools by budget, location, ROI & career goals.",
    icon: School,
    path: "/college-finder",
    color: "59, 130, 246",
    stats: [
      { icon: TrendingUp, label: "ROI Data" },
      { icon: Search, label: "200+ Colleges" },
    ],
    tag: "New",
  },
  {
    title: "AI Coaching Finder",
    description: "Discover the ideal MBA coaching institute matched to your exam, city, budget & learning style.",
    icon: Search,
    path: "/compare",
    color: "16, 185, 129",
    stats: [
      { icon: Users, label: "500+ Institutes" },
      { icon: Sparkles, label: "AI Match" },
    ],
    tag: "Smart Match",
  },
  {
    title: "Compare Colleges",
    description: "Side-by-side comparison across placements, fees, ROI, campus & admissions with AI verdict.",
    icon: BarChart3,
    path: "/college-finder#compare",
    color: "245, 158, 11",
    stats: [
      { icon: BarChart3, label: "5 Tabs" },
      { icon: Target, label: "50+ Metrics" },
    ],
    tag: "Deep Dive",
  },
  {
    title: "CAT Score Calculator",
    description: "Paste your CAT response sheet and get instant section-wise score, accuracy & percentile estimate.",
    icon: Calculator,
    path: "/cat-score-calculator",
    color: "6, 182, 212",
    stats: [
      { icon: Target, label: "Section-wise" },
      { icon: TrendingUp, label: "Percentile" },
    ],
    tag: "🔥 Viral",
  },
];

const AIToolsSection = () => {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/[0.04] rounded-full blur-[100px]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/[0.04] rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/[0.04] rounded-full blur-[80px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">AI-Powered Tools</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
            Your MBA Success Toolkit
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            Four powerful AI tools designed to guide every step of your MBA journey — from profile analysis to final selection.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
            >
              <Link
                to={tool.path}
                className="group relative block h-full rounded-2xl bg-card border border-border/60 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-1.5"
              >
                {/* Top colored accent bar */}
                <div
                  className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, rgba(${tool.color}, 0.7), rgba(${tool.color}, 0.3))` }}
                />

                {/* Tag badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ background: `rgba(${tool.color}, 0.85)` }}
                  >
                    {tool.tag}
                  </span>
                </div>

                <div className="p-5 pt-5">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, rgba(${tool.color}, 0.15), rgba(${tool.color}, 0.05))`,
                      border: `1px solid rgba(${tool.color}, 0.15)`,
                    }}
                  >
                    <tool.icon className="w-5.5 h-5.5" style={{ color: `rgba(${tool.color}, 1)` }} />
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground text-[15px] mb-2">{tool.title}</h3>

                  {/* Description */}
                  <p className="text-muted-foreground text-xs leading-relaxed mb-4 min-h-[48px]">
                    {tool.description}
                  </p>

                  {/* Mini stats */}
                  <div className="flex items-center gap-3 mb-4">
                    {tool.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
                      >
                        <stat.icon className="w-3 h-3" style={{ color: `rgba(${tool.color}, 0.7)` }} />
                        {stat.label}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 group-hover:px-4"
                    style={{ background: `rgba(${tool.color}, 0.06)` }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: `rgba(${tool.color}, 1)` }}
                    >
                      Try Now — Free
                    </span>
                    <ArrowRight
                      className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      style={{ color: `rgba(${tool.color}, 1)` }}
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom trust line */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" /> Powered by Advanced AI
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-primary" /> Trusted by 10,000+ Students
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-primary" /> 100% Free to Use
          </span>
        </motion.div>
      </div>
    </section>
  );
};

export default AIToolsSection;
