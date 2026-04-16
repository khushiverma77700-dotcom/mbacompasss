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

        {/* Single-row cards */}
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className="flex-shrink-0 w-[200px] md:w-[1fr]"
              style={{ flex: '1 1 0', minWidth: '180px' }}
            >
              <Link
                to={tool.path}
                className="group relative block h-full rounded-xl bg-card border border-border/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-1"
              >
                {/* Top accent */}
                <div
                  className="h-0.5 w-full"
                  style={{ background: `linear-gradient(90deg, rgba(${tool.color}, 0.7), rgba(${tool.color}, 0.3))` }}
                />

                {/* Tag */}
                <div className="absolute top-2 right-2">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: `rgba(${tool.color}, 0.85)` }}
                  >
                    {tool.tag}
                  </span>
                </div>

                <div className="p-3 pt-3">
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, rgba(${tool.color}, 0.15), rgba(${tool.color}, 0.05))`,
                      border: `1px solid rgba(${tool.color}, 0.15)`,
                    }}
                  >
                    <tool.icon className="w-4 h-4" style={{ color: `rgba(${tool.color}, 1)` }} />
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground text-[13px] mb-1.5 leading-tight">{tool.title}</h3>

                  {/* Description */}
                  <p className="text-muted-foreground text-[10px] leading-relaxed mb-3 line-clamp-2">
                    {tool.description}
                  </p>

                  {/* CTA */}
                  <div
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-300 group-hover:px-3"
                    style={{ background: `rgba(${tool.color}, 0.06)` }}
                  >
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: `rgba(${tool.color}, 1)` }}
                    >
                      Try Free
                    </span>
                    <ArrowRight
                      className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1"
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
