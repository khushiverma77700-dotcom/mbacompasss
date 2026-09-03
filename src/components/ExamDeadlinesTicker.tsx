import { useQuery } from "@tanstack/react-query";
import { CalendarDays, AlertTriangle, ChevronRight, Bell, ChevronLeft, ArrowRight, GraduationCap, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

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

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return { day: null, label: "TBA" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: null, label: dateStr };
  return {
    day: d.getDate(),
    label: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
  };
};

type Urgency = { ring: string; badge: string; bar: string; chip: string; glow: string };
const getUrgency = (days: number | null): Urgency => {
  if (days !== null && days >= 0 && days <= 7)
    return {
      ring: "border-destructive/30 hover:border-destructive/60",
      badge: "bg-destructive/10 text-destructive",
      bar: "bg-gradient-to-r from-destructive to-orange-500",
      chip: "bg-destructive text-destructive-foreground",
      glow: "from-destructive/10",
    };
  if (days !== null && days >= 0 && days <= 30)
    return {
      ring: "border-orange-300/60 hover:border-orange-400",
      badge: "bg-orange-100 text-orange-700",
      bar: "bg-gradient-to-r from-orange-500 to-amber-400",
      chip: "bg-orange-500 text-white",
      glow: "from-orange-100/70",
    };
  return {
    ring: "border-primary/20 hover:border-primary/50",
    badge: "bg-primary/10 text-primary",
    bar: "bg-gradient-to-r from-primary to-sky-400",
    chip: "bg-primary text-primary-foreground",
    glow: "from-primary/10",
  };
};

const ExamDeadlinesTicker = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector<HTMLElement>("[data-card]");
    const delta = (card?.offsetWidth ?? 320) + 16;
    scrollRef.current.scrollBy({ left: direction === "left" ? -delta : delta, behavior: "smooth" });
  };

  const { data: exams } = useQuery({
    queryKey: ["exam-deadlines-ticker"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
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
    <section className="py-16 md:py-20 bg-gradient-to-b from-background via-sky-50/60 to-background relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-10 animate-fade-in">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold mb-4">
            <Bell className="w-3.5 h-3.5" /> Don't Miss Out
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-3">
            Upcoming Exam <span className="text-gradient">Deadlines</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Track registration deadlines and exam dates for every major MBA entrance — all in one place.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border shadow-md text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border shadow-md text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/30 hover:[&::-webkit-scrollbar-thumb]:bg-primary/50"
          >
            {items.map((exam: any, i: number) => {
              const regDays = getDaysLeft(exam.registration_deadline);
              const reg = formatDate(exam.registration_deadline);
              const exm = formatDate(exam.exam_date);
              const urgency = getUrgency(regDays);
              const isUrgent = regDays !== null && regDays >= 0 && regDays <= 7;
              const isClosed = regDays !== null && regDays < 0;

              return (
                <div
                  key={exam.slug || i}
                  data-card
                  className="snap-start shrink-0 w-[280px] sm:w-[300px] lg:w-[320px] animate-fade-in"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <Link
                    to={`/exam/${exam.slug}`}
                    className={`relative block overflow-hidden rounded-2xl border ${urgency.ring} bg-background shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 group h-full`}
                  >
                    {/* top glow */}
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${urgency.glow} to-transparent`} />

                    <div className="relative p-5">
                      {/* header */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div>
                          <h3 className="font-heading font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                            {exam.name}
                          </h3>
                          {exam.conducting_body && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5" /> {exam.conducting_body}
                            </p>
                          )}
                        </div>
                        {isUrgent ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-destructive-foreground bg-destructive px-2 py-1 rounded-full animate-pulse shrink-0">
                            <Flame className="w-3 h-3" /> Closing Soon
                          </span>
                        ) : isClosed ? (
                          <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">Closed</span>
                        ) : regDays !== null && regDays <= 30 ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full shrink-0">
                            <AlertTriangle className="w-3 h-3" /> Hurry
                          </span>
                        ) : null}
                      </div>

                      {/* date block */}
                      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3 mb-3">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-background border border-border shadow-xs">
                          <span className="text-xl font-extrabold leading-none text-foreground">{reg.day ?? "–"}</span>
                          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-0.5">
                            {reg.day ? reg.label : reg.label}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> Registration {reg.day ? `Deadline · ${reg.weekday}` : ""}
                          </p>
                          {regDays !== null && regDays >= 0 ? (
                            <p className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${urgency.chip}`}>
                              {regDays === 0 ? "Last day today!" : `${regDays} days left`}
                            </p>
                          ) : regDays !== null && regDays < 0 ? (
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">Registration closed</p>
                          ) : (
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">Date to be announced</p>
                          )}
                        </div>
                      </div>

                      {/* exam date */}
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="text-muted-foreground text-xs">Exam Date</span>
                        <span className="font-semibold text-foreground text-sm">
                          {exm.day ? `${exm.day} ${exm.label}` : exm.label}
                        </span>
                      </div>

                      {/* progress */}
                      {regDays !== null && regDays >= 0 && (
                        <div className="mb-4">
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${urgency.bar} transition-all duration-500`}
                              style={{ width: `${Math.max(5, Math.min(100, ((90 - regDays) / 90) * 100))}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* footer CTA */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <span className="text-xs font-semibold text-primary">View exam details</span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-4 italic">
          *Dates are tentative and subject to change. Please verify with official exam websites.
        </p>

        <div className="text-center mt-6">
          <Link to="/exam">
            <Button variant="outline" size="lg" className="gap-2 rounded-full">
              Explore All Exams <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ExamDeadlinesTicker;
