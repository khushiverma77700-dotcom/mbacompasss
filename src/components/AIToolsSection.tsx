import { Link } from "react-router-dom";
import { Brain, School, Search, BarChart3, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const tools = [
  {
    title: "AI Profile Analyser",
    description: "Get a detailed analysis of your MBA admission chances with AI-powered insights, SWOT analysis & college predictions.",
    icon: Brain,
    path: "/profile-analyzer",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-500",
    borderColor: "border-violet-500/20",
  },
  {
    title: "AI College Finder",
    description: "Answer 8 smart questions and let AI match you with the best-fit B-schools based on your profile, budget & goals.",
    icon: School,
    path: "/college-finder",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
    borderColor: "border-blue-500/20",
  },
  {
    title: "AI Coaching Finder",
    description: "Find the perfect MBA coaching institute tailored to your exam, city, budget and learning style — powered by AI.",
    icon: Search,
    path: "/category/cat",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
    borderColor: "border-emerald-500/20",
  },
  {
    title: "Compare Colleges",
    description: "Side-by-side comparison of top MBA colleges — placements, fees, ROI, campus life and admission criteria.",
    icon: BarChart3,
    path: "/college-finder#compare",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
    borderColor: "border-amber-500/20",
  },
];

const AIToolsSection = () => {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-3">
            <Brain className="w-3.5 h-3.5" /> AI-Powered Tools
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Smart Tools to Accelerate Your MBA Journey
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm">
            Leverage AI to find the right college, coaching, and strategy — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Link
                to={tool.path}
                className={`group block h-full rounded-xl border ${tool.borderColor} bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-1`}
              >
                <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4`}>
                  <tool.icon className={`w-5 h-5 ${tool.iconColor}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 text-[15px]">{tool.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-4">{tool.description}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                  Try Now <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIToolsSection;
