import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, BookOpen, Award, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { differenceInDays, parse, isValid } from "date-fns";

const ACCENT_COLORS = [
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", bar: "bg-sky-500", iconBg: "bg-sky-100" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", bar: "bg-indigo-500", iconBg: "bg-indigo-100" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500", iconBg: "bg-emerald-100" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "bg-amber-500", iconBg: "bg-amber-100" },
];


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
        .select("name, slug, full_name, exam_date, registration_deadline, conducting_body");
      const now = new Date();
      const all = (data || []).filter((e: any) => e.name?.trim());
      // Sort by nearest upcoming exam date ascending; past/unknown dates go last
      const sorted = all.sort((a: any, b: any) => {
        const da = parseExamDate(a.exam_date);
        const db = parseExamDate(b.exam_date);
        const aFuture = da && da.getTime() >= now.getTime() - 86400000;
        const bFuture = db && db.getTime() >= now.getTime() - 86400000;
        if (aFuture && bFuture) return da!.getTime() - db!.getTime();
        if (aFuture) return -1;
        if (bFuture) return 1;
        if (da && db) return da.getTime() - db.getTime();
        if (da) return -1;
        if (db) return 1;
        return 0;
      });
      return sorted.slice(0, 6);
    },
  });

  const today = useMemo(() => new Date(), []);

  if (!exams?.length) return null;

  return (
    <section className="py-12 md:py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
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
          <p className="text-xs text-muted-foreground/60 mt-2 italic">
            *Dates are tentative and subject to change. Please verify with official exam websites.
          </p>
        </motion.div>

        {/* Exam Cards — 2x2 visual grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 auto-rows-fr max-w-5xl mx-auto">
          {exams.slice(0, 4).map((exam, i) => {
            const examDate = parseExamDate(exam.exam_date);
            const daysLeft = examDate ? differenceInDays(examDate, today) : null;
            const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
            const progressPercent = daysLeft !== null && daysLeft >= 0
              ? Math.max(2, Math.min(100, ((365 - daysLeft) / 365) * 100))
              : 0;
            const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

            return (
              <motion.div
                key={exam.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="h-full"
              >
                <Link
                  to={`/exam/${exam.slug}`}
                  className={`group relative flex flex-col h-full ${accent.bg} rounded-xl border ${accent.border} p-4 md:p-5 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
                >
                  {/* Top accent bar */}
                  <div className={`absolute inset-x-0 top-0 h-0.5 ${accent.bar}`} />

                  <div className="flex-1 min-h-0">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-lg ${accent.iconBg} ${accent.text} flex items-center justify-center flex-shrink-0`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading font-bold text-base md:text-lg text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                            {exam.name}
                          </h3>
                          {exam.conducting_body && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                              <Award className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{exam.conducting_body}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {daysLeft !== null && daysLeft >= 0 && (
                        <div className="text-center flex-shrink-0">
                          <div className={`text-xl md:text-2xl font-extrabold ${isUrgent ? "text-destructive" : accent.text} leading-none`}>
                            {daysLeft}
                          </div>
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">days left</div>
                        </div>
                      )}
                    </div>

                    {/* Full name */}
                    {exam.full_name && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2.5">
                        {exam.full_name}
                      </p>
                    )}

                    {/* Date + deadline row */}
                    <div className="space-y-1.5 mb-3">
                      {exam.exam_date && (
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className={`w-3.5 h-3.5 ${accent.text} flex-shrink-0`} />
                          <span className="text-foreground font-medium">{exam.exam_date}</span>
                        </div>
                      )}
                      {exam.registration_deadline && (
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-destructive" : accent.text} flex-shrink-0`} />
                          <span className="text-foreground font-medium">Reg. by {exam.registration_deadline}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom section: progress + CTA */}
                  <div>
                    {daysLeft !== null && daysLeft >= 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">Countdown</span>
                          <span className={`text-[9px] font-bold ${isUrgent ? "text-destructive" : accent.text}`}>
                            {daysLeft === 0 ? "Today" : `${daysLeft} days remaining`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-background/70 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${accent.bar} rounded-full transition-all duration-1000`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                      <span className={`text-xs font-semibold ${accent.text}`}>View details</span>
                      <span className={`w-7 h-7 rounded-full ${accent.iconBg} ${accent.text} flex items-center justify-center group-hover:translate-x-1 transition-transform`}>
                        <ArrowRight className="w-3.5 h-3.5" />
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
