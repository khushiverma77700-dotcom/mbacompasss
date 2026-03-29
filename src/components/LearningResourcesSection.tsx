import { motion } from "framer-motion";
import { BookOpen, FileText, TestTube, Video, Download, ChevronRight, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const resources = [
  {
    icon: FileText,
    title: "Free Study Material",
    description: "Comprehensive PDFs covering Quant, VARC, DILR and more — curated by top educators.",
    count: "200+",
    countLabel: "Resources",
    color: "text-primary",
    bg: "bg-primary/10",
    link: "/blog",
  },
  {
    icon: TestTube,
    title: "Mock Tests & Quizzes",
    description: "Practice with full-length mocks and topic-wise quizzes modelled on actual exam patterns.",
    count: "150+",
    countLabel: "Mock Tests",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    link: "/blog",
  },
  {
    icon: Video,
    title: "Video Lectures",
    description: "Expert-led video lessons on key concepts, shortcuts, and problem-solving strategies.",
    count: "500+",
    countLabel: "Videos",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    link: "/blog",
  },
  {
    icon: BookOpen,
    title: "Previous Year Papers",
    description: "Solved papers for CAT, XAT, SNAP, NMAT and more with detailed explanations and analysis.",
    count: "50+",
    countLabel: "Papers",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    link: "/blog",
  },
  {
    icon: Download,
    title: "Exam Syllabus & Guides",
    description: "Detailed syllabus breakdowns, exam patterns, and preparation roadmaps for every major MBA entrance.",
    count: "20+",
    countLabel: "Guides",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    link: "/blog",
  },
  {
    icon: Lightbulb,
    title: "Strategy & Tips",
    description: "Expert tips on time management, test-taking strategies, and last-minute preparation advice.",
    count: "100+",
    countLabel: "Articles",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    link: "/blog",
  },
];

const LearningResourcesSection = () => {
  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Free Resources</span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            Learning Resources & Study Material
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Access free study material, mock tests, video lectures, and preparation guides to ace your MBA entrance exams.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((res, i) => {
            const Icon = res.icon;
            return (
              <motion.div
                key={res.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={res.link}
                  className="block bg-background rounded-xl border border-border p-6 hover:shadow-md transition-all group h-full"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-11 h-11 rounded-lg ${res.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${res.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                        {res.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {res.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${res.color}`}>{res.count}</span>
                        <span className="text-xs text-muted-foreground">{res.countLabel}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="gap-2">
              Browse All Resources <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LearningResourcesSection;
