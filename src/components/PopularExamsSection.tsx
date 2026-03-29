import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, BookOpen, Award, FileText, Users } from "lucide-react";
import { motion } from "framer-motion";
import { differenceInDays, parse, isValid } from "date-fns";

interface ExamPattern {
  name: string;
  questions: number;
  marks: number;
}

/** Try multiple date formats to parse exam_date string */
const parseExamDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;

  // Try ISO / standard formats
  const d = new Date(dateStr);
  if (isValid(d) && d.getFullYear() > 2000) return d;

  // Try common formats like "24 Nov 2026", "November 24, 2026"
  const formats = ["dd MMM yyyy", "MMM dd, yyyy", "dd MMMM yyyy", "MMMM dd, yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 2000) return parsed;
    } catch { /* skip */ }
  }
  return null;
};

const PopularExamsSection = () => {
  const { data: exams } = useQuery({
    queryKey: ["popular-exams-countdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exams")
        .select("name, slug, full_name, exam_date, registration_deadline, conducting_body, frequency, eligibility, description, pattern")
        .order("created_at")
        .limit(6);
      return data || [];
    },
  });

  const today = useMemo(() => new Date(), []);

  if (!exams?.length) return null;

  return (
    <section className="py-16 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
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
            Upcoming MBA Exams 2026
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Key dates, exam patterns, and live countdowns — everything you need at a glance
          </p>
        </motion.div>

        {/* Exam Cards */}
        <div className="space-y-5">
          {exams.map((exam, i) => {
            const examDate = parseExamDate(exam.exam_date);
            const daysLeft = examDate ? differenceInDays(examDate, today) : null;
            const patterns = (exam.pattern as unknown as ExamPattern[] | null) || [];
            const totalQuestions = patterns.reduce((s, p) => s + (p.questions || 0), 0);
            const totalMarks = patterns.reduce((s, p) => s + (p.marks || 0), 0);

            // Progress: assume ~365 day prep window
            const progressPercent = daysLeft !== null && daysLeft >= 0
              ? Math.max(2, Math.min(100, ((365 - daysLeft) / 365) * 100))
              : 0;

            return (
              <motion.div
                key={exam.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <Link
                  to={`/exam/${exam.slug}`}
                  className="block bg-card border border-border rounded-2xl overflow-hidden transition-shadow duration-300"
                >
                  <div className="p-5 md:p-7">
                    {/* Top row: Name + Date badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-xl text-foreground">
                            {exam.name}
                          </h3>
                          {exam.full_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">{exam.full_name}</p>
                          )}
                          {exam.conducting_body && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Award className="w-3 h-3" /> {exam.conducting_body}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date badge */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {exam.exam_date && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                            <Calendar className="w-4 h-4" />
                            {exam.exam_date}
                          </span>
                        )}
                        {exam.frequency && !exam.exam_date && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            {exam.frequency}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {exam.description && (
                      <p className="text-sm text-muted-foreground mb-5 leading-relaxed line-clamp-2">
                        {exam.description.replace(/<[^>]*>/g, "").substring(0, 200)}
                      </p>
                    )}

                    {/* Pattern stats row */}
                    {patterns.length > 0 && (
                      <div className="mb-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-muted/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-foreground">{totalQuestions}</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Total Questions</p>
                          </div>
                          <div className="bg-muted/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-foreground">{totalMarks}</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Total Marks</p>
                          </div>
                          <div className="bg-muted/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-foreground">{patterns.length}</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Sections</p>
                          </div>
                          <div className="bg-muted/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-foreground">
                              {daysLeft !== null && daysLeft >= 0 ? daysLeft : "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Days Left</p>
                          </div>
                        </div>

                        {/* Section breakdown pills */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {patterns.map((p) => (
                            <span
                              key={p.name}
                              className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs text-foreground font-medium"
                            >
                              {p.name}: {p.questions}Q · {p.marks}M
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Countdown progress bar */}
                    {daysLeft !== null && daysLeft >= 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">
                            Exam Countdown
                          </span>
                          <span className="text-xs font-bold text-primary">
                            {daysLeft} days remaining
                          </span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-1000"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">Preparation started</span>
                          <span className="text-[10px] text-muted-foreground">Exam day</span>
                        </div>
                      </div>
                    )}

                    {/* Registration deadline */}
                    {exam.registration_deadline && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10 mb-4">
                        <Clock className="w-4 h-4 text-destructive flex-shrink-0" />
                        <p className="text-xs text-foreground">
                          <span className="font-semibold">Registration Deadline:</span> {exam.registration_deadline}
                        </p>
                      </div>
                    )}

                    {/* Eligibility */}
                    {exam.eligibility && (
                      <div className="pt-4 border-t border-border/50">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Eligibility: </span>
                          {exam.eligibility.replace(/<[^>]*>/g, "").substring(0, 150)}
                        </p>
                      </div>
                    )}

                    {/* CTA row */}
                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {exam.frequency || "Annual exam"}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        View Full Details <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* View All */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md"
          >
            Explore All Exams <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularExamsSection;
