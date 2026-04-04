import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, CalendarDays, AlertTriangle, ChevronRight, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const fallbackDeadlines = [
  { name: "CAT 2025", slug: "cat", registration_deadline: "2025-09-20", exam_date: "2025-11-24", conducting_body: "IIM" },
  { name: "XAT 2026", slug: "xat", registration_deadline: "2025-11-30", exam_date: "2026-01-05", conducting_body: "XLRI" },
  { name: "SNAP 2025", slug: "snap", registration_deadline: "2025-11-22", exam_date: "2025-12-15", conducting_body: "SIU" },
  { name: "NMAT 2025", slug: "nmat", registration_deadline: "2025-10-10", exam_date: "2025-12-18", conducting_body: "GMAC" },
  { name: "IIFT 2026", slug: "iift", registration_deadline: "2025-09-25", exam_date: "2025-12-01", conducting_body: "NTA" },
  { name: "CMAT 2026", slug: "cmat", registration_deadline: "2026-01-15", exam_date: "2026-03-20", conducting_body: "NTA" },
];

const getDaysLeft = (dateStr: string | null) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getUrgencyStyle = (days: number | null) => {
  if (days === null || days < 0) return { text: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground/30", border: "border-border" };
  if (days <= 7) return { text: "text-destructive", bg: "bg-destructive/5", bar: "bg-destructive", border: "border-destructive/20" };
  if (days <= 30) return { text: "text-orange-600", bg: "bg-orange-50", bar: "bg-orange-500", border: "border-orange-200" };
  return { text: "text-primary", bg: "bg-primary/5", bar: "bg-primary", border: "border-primary/10" };
};

const ExamDeadlinesTicker = () => {
  const { data: exams } = useQuery({
    queryKey: ["exam-deadlines-ticker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exams")
        .select("name, slug, registration_deadline, exam_date, conducting_body")
        .order("registration_deadline", { ascending: true })
        .limit(6);
      return data && data.length > 0 ? data : fallbackDeadlines;
    },
  });

  const items = exams || fallbackDeadlines;

  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold mb-4">
            <Bell className="w-3.5 h-3.5" /> Don't Miss Out
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-3">
            Upcoming Exam <span className="text-gradient">Deadlines</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay updated with registration deadlines and exam dates for your MBA preparation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {items.map((exam: any, i: number) => {
            const regDays = getDaysLeft(exam.registration_deadline);
            const examDays = getDaysLeft(exam.exam_date);
            const style = getUrgencyStyle(regDays);

            return (
              <motion.div
                key={exam.slug || i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  to={`/exams/${exam.slug}`}
                  className={`block bg-background rounded-2xl border ${style.border} p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group h-full`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading font-bold text-foreground text-base group-hover:text-primary transition-colors">
                      {exam.name}
                    </h3>
                    {regDays !== null && regDays >= 0 && regDays <= 7 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                      </span>
                    )}
                  </div>

                  {exam.conducting_body && (
                    <p className="text-xs text-muted-foreground mb-4">By {exam.conducting_body}</p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Registration</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{exam.registration_deadline || "TBA"}</p>
                        {regDays !== null && regDays >= 0 && (
                          <p className={`text-xs font-bold ${style.text}`}>
                            {regDays === 0 ? "Today!" : `${regDays} days left`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Exam Date</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{exam.exam_date || "TBA"}</p>
                        {examDays !== null && examDays >= 0 && (
                          <p className="text-xs text-muted-foreground">{examDays} days to go</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {regDays !== null && regDays >= 0 && (
                    <div className="mt-4">
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${style.bar}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${Math.max(5, Math.min(100, ((90 - regDays) / 90) * 100))}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="gap-2 rounded-full">
              View All Exam Dates <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ExamDeadlinesTicker;
