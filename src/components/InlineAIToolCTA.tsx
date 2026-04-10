import { Link } from "react-router-dom";
import { Brain, School, Search, BarChart3, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type ToolVariant = "profile-analyzer" | "college-finder" | "coaching-finder" | "college-shortlister";

const toolConfig: Record<ToolVariant, {
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Brain;
  path: string;
  cta: string;
  gradient: string;
  glowColor: string;
}> = {
  "profile-analyzer": {
    title: "AI Profile Analyser",
    subtitle: "Know where you stand",
    description: "Get a 5-dimension score breakdown, SWOT analysis, peer comparison & personalized college predictions — all powered by AI.",
    icon: Brain,
    path: "/profile-analyzer",
    cta: "Analyse My Profile — Free",
    gradient: "from-violet-600 via-purple-600 to-indigo-600",
    glowColor: "139, 92, 246",
  },
  "college-finder": {
    title: "AI College Finder",
    subtitle: "Find your perfect B-School",
    description: "Smart 8-step wizard matches you with best-fit MBA colleges by budget, location, ROI & career goals. Powered by real placement data.",
    icon: School,
    path: "/college-finder",
    cta: "Find My College — Free",
    gradient: "from-blue-600 via-sky-600 to-cyan-600",
    glowColor: "59, 130, 246",
  },
  "coaching-finder": {
    title: "AI Coaching Finder",
    subtitle: "Best coaching, matched to you",
    description: "Discover the ideal MBA coaching institute matched to your exam, city, budget & learning style using AI-powered smart matching.",
    icon: Search,
    path: "/compare",
    cta: "Find My Coaching — Free",
    gradient: "from-emerald-600 via-teal-600 to-green-600",
    glowColor: "16, 185, 129",
  },
  "college-shortlister": {
    title: "AI College Shortlister",
    subtitle: "Your shortlist, simplified",
    description: "Enter your scores, preferences & budget — our AI builds a personalized shortlist with acceptance probability for 200+ MBA colleges.",
    icon: BarChart3,
    path: "/college-shortlister",
    cta: "Shortlist Colleges — Free",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    glowColor: "245, 158, 11",
  },
};

interface InlineAIToolCTAProps {
  variant: ToolVariant;
}

const InlineAIToolCTA = ({ variant }: InlineAIToolCTAProps) => {
  const tool = toolConfig[variant];
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="my-8"
    >
      <div className="relative rounded-2xl overflow-hidden">
        {/* Animated border */}
        <div className="ai-gist-border rounded-2xl p-[2px]">
          <div className="relative rounded-2xl overflow-hidden bg-card">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] opacity-20"
                style={{ background: `rgba(${tool.glowColor}, 0.5)` }}
              />
              <div
                className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-[80px] opacity-10"
                style={{ background: `rgba(${tool.glowColor}, 0.4)` }}
              />
            </div>

            <div className="relative z-10 p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Icon */}
                <motion.div
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  style={{ boxShadow: `0 8px 30px rgba(${tool.glowColor}, 0.3)` }}
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{tool.subtitle}</span>
                  </div>
                  <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                    {tool.description}
                  </p>
                </div>

                {/* CTA */}
                <Link to={tool.path} className="flex-shrink-0 w-full md:w-auto">
                  <motion.div
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${tool.gradient} text-white font-semibold text-sm shadow-lg w-full md:w-auto cursor-pointer`}
                    style={{ boxShadow: `0 4px 20px rgba(${tool.glowColor}, 0.35)` }}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {tool.cta}
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InlineAIToolCTA;
