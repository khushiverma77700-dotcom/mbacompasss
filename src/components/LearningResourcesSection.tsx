import { motion } from "framer-motion";
import { BookOpen, FileText, TestTube, Video, Download, ChevronRight, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const resources = [
  { icon: FileText, title: "Free Study Material", description: "Comprehensive PDFs covering Quant, VARC, DILR and more.", count: "200+", countLabel: "Resources", gradient: "from-blue-500 to-blue-600" },
  { icon: TestTube, title: "Mock Tests & Quizzes", description: "Full-length mocks and topic-wise quizzes on actual exam patterns.", count: "150+", countLabel: "Mock Tests", gradient: "from-orange-500 to-orange-600" },
  { icon: Video, title: "Video Lectures", description: "Expert-led video lessons on concepts, shortcuts, and strategies.", count: "500+", countLabel: "Videos", gradient: "from-emerald-500 to-emerald-600" },
  { icon: BookOpen, title: "Previous Year Papers", description: "Solved papers for CAT, XAT, SNAP, NMAT with detailed analysis.", count: "50+", countLabel: "Papers", gradient: "from-violet-500 to-violet-600" },
  { icon: Download, title: "Exam Guides", description: "Detailed syllabus breakdowns, patterns, and preparation roadmaps.", count: "20+", countLabel: "Guides", gradient: "from-rose-500 to-rose-600" },
  { icon: Lightbulb, title: "Strategy & Tips", description: "Expert tips on time management and test-taking strategies.", count: "100+", countLabel: "Articles", gradient: "from-amber-500 to-amber-600" },
];

const LearningResourcesSection = () => {
  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
            <BookOpen className="w-3.5 h-3.5" /> Free Resources
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-3">
            Learning <span className="text-gradient">Resources</span> & Study Material
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Access free study material, mock tests, video lectures, and guides to ace your MBA entrance exams
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
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
                  to="/blog"
                  className="group block bg-background rounded-2xl border border-border p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${res.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors mb-1 text-base">
                        {res.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {res.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-foreground">{res.count}</span>
                        <span className="text-xs text-muted-foreground font-medium">{res.countLabel}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="gap-2 rounded-full">
              Browse All Resources <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LearningResourcesSection;
