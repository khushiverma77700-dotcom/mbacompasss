import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const comparisons = [
  { title: "CAT vs XAT", desc: "Difficulty level, pattern, and acceptance — which is right for you?", link: "/blog" },
  { title: "CAT vs GMAT", desc: "Domestic vs international MBA — compare scope, fees, and ROI.", link: "/blog" },
  { title: "IIM vs ISB", desc: "India's top B-schools compared on placements, fees, and culture.", link: "/blog" },
  { title: "PGDM vs MBA", desc: "Understand the key differences in curriculum, recognition, and value.", link: "/blog" },
  { title: "CAT vs SNAP", desc: "Exam pattern, difficulty, and top colleges accepting each score.", link: "/blog" },
  { title: "Online vs Offline MBA", desc: "Flexibility vs campus life — which format suits your career goals?", link: "/blog" },
];

const TopExamComparisonSection = () => (
  <section className="py-14 bg-muted/30">
    <div className="container mx-auto px-4">
      <div className="text-center mb-10">
        <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Popular Comparisons</h2>
        <p className="text-muted-foreground">Head-to-head analysis to help you make the right choice</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparisons.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <Link
              to={item.link}
              className="block p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                Read Comparison <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TopExamComparisonSection;
