import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { FileText, Calendar, Clock, ArrowRight, BookOpen, Users, TrendingUp, Award } from "lucide-react";
import { motion } from "framer-motion";

const examIcons: Record<string, typeof FileText> = {
  CAT: TrendingUp,
  XAT: Award,
  GMAT: BookOpen,
  SNAP: Users,
  NMAT: FileText,
  MAT: Calendar,
  CMAT: Clock,
  IIFT: Award,
};

const examGradients = [
  "from-violet-500/15 to-purple-500/5 border-violet-200/60 dark:border-violet-800/40",
  "from-blue-500/15 to-cyan-500/5 border-blue-200/60 dark:border-blue-800/40",
  "from-emerald-500/15 to-teal-500/5 border-emerald-200/60 dark:border-emerald-800/40",
  "from-orange-500/15 to-amber-500/5 border-orange-200/60 dark:border-orange-800/40",
  "from-rose-500/15 to-pink-500/5 border-rose-200/60 dark:border-rose-800/40",
  "from-indigo-500/15 to-blue-500/5 border-indigo-200/60 dark:border-indigo-800/40",
];

const examIconColors = [
  "text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/50",
  "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50",
  "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/50",
  "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/50",
  "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/50",
  "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/50",
];

const PopularExamsSection = () => {
  const { data: exams } = useQuery({
    queryKey: ["popular-exams-rich"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exams")
        .select("name, slug, full_name, exam_date, registration_deadline, conducting_body, frequency, eligibility, description")
        .order("created_at")
        .limit(6);
      return data || [];
    },
  });

  if (!exams?.length) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            MBA Entrance Exams
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Popular MBA Exams 2026
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Everything you need to know — dates, eligibility, patterns & more for India's top MBA entrance exams
          </p>
        </motion.div>

        {/* Exam Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam, i) => {
            const Icon = examIcons[exam.name] || FileText;
            const gradient = examGradients[i % examGradients.length];
            const iconColor = examIconColors[i % examIconColors.length];

            return (
              <motion.div
                key={exam.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link
                  to={`/exam/${exam.slug}`}
                  className={`group block relative p-5 md:p-6 rounded-2xl border bg-gradient-to-br ${gradient} hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden h-full`}
                >
                  {/* Corner accent */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />

                  {/* Icon + Name */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${iconColor} transition-transform group-hover:scale-110`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {exam.name}
                        </h3>
                        {exam.full_name && (
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                            {exam.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0" />
                  </div>

                  {/* Description snippet */}
                  {exam.description && (
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                      {exam.description.replace(/<[^>]*>/g, "").substring(0, 120)}...
                    </p>
                  )}

                  {/* Info pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {exam.exam_date && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 text-[11px] font-medium text-foreground border border-border/50">
                        <Calendar className="w-3 h-3 text-primary" />
                        {exam.exam_date}
                      </span>
                    )}
                    {exam.registration_deadline && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 text-[11px] font-medium text-foreground border border-border/50">
                        <Clock className="w-3 h-3 text-orange-500" />
                        Deadline: {exam.registration_deadline}
                      </span>
                    )}
                    {exam.conducting_body && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 text-[11px] font-medium text-muted-foreground border border-border/50">
                        <Award className="w-3 h-3" />
                        {exam.conducting_body}
                      </span>
                    )}
                  </div>

                  {/* Eligibility teaser */}
                  {exam.eligibility && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/80">Eligibility:</span>{" "}
                        {exam.eligibility.replace(/<[^>]*>/g, "").substring(0, 80)}...
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View Full Details <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* View All Button */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
          >
            Explore All Exams <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularExamsSection;
