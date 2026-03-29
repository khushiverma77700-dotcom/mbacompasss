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
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const getUrgencyColor = (days: number | null) => {
  if (days === null || days < 0) return "text-muted-foreground";
  if (days <= 7) return "text-destructive";
  if (days <= 30) return "text-orange-500";
  return "text-primary";
};

const getUrgencyBg = (days: number | null) => {
  if (days === null || days < 0) return "bg-muted";
  if (days <= 7) return "bg-destructive/10";
  if (days <= 30) return "bg-orange-500/10";
  return "bg-primary/10";
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
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-destructive/10 rounded-full px-4 py-1.5 mb-4">
            <Bell className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Don't Miss Out</span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            Upcoming Exam Deadlines & Dates
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay updated with registration deadlines and exam dates. Never miss an important date for your MBA preparation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((exam: any, i: number) => {
            const regDays = getDaysLeft(exam.registration_deadline);
            const examDays = getDaysLeft(exam.exam_date);
            const urgency = getUrgencyColor(regDays);
            const urgencyBg = getUrgencyBg(regDays);

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
                  className="block bg-background rounded-xl border border-border p-5 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                      {exam.name}
                    </h3>
                    {regDays !== null && regDays >= 0 && regDays <= 7 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                      </span>
                    )}
                  </div>

                  {exam.conducting_body && (
                    <p className="text-xs text-muted-foreground mb-3">By {exam.conducting_body}</p>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Registration</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {exam.registration_deadline || "TBA"}
                        </p>
                        {regDays !== null && regDays >= 0 && (
                          <p className={`text-xs font-semibold ${urgency}`}>
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
                        <p className="text-sm font-medium text-foreground">
                          {exam.exam_date || "TBA"}
                        </p>
                        {examDays !== null && examDays >= 0 && (
                          <p className="text-xs text-muted-foreground">{examDays} days to go</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {regDays !== null && regDays >= 0 && (
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${regDays <= 7 ? "bg-destructive" : regDays <= 30 ? "bg-orange-500" : "bg-primary"}`}
                          style={{ width: `${Math.max(5, Math.min(100, ((90 - regDays) / 90) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="gap-2">
              View All Exam Dates <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ExamDeadlinesTicker;
