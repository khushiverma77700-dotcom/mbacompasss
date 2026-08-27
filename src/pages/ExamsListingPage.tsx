import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight, BookOpen, CalendarDays, Clock, Filter, Globe, GraduationCap,
  LayoutGrid, List, Search, SlidersHorizontal, Timer, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import PageKeywords from "@/components/PageKeywords";
import { canonicalUrl } from "@/lib/canonical";
import { examDetails } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/* Normalised exam shape used by the listing                           */
/* ------------------------------------------------------------------ */

interface ExamCard {
  id: string;
  name: string;
  slug: string;
  fullName?: string;
  conductingBody?: string;
  frequency?: string;
  mode?: string;
  duration?: string;
  level?: string;
  category?: string;
  examDate?: string;
  registrationDeadline?: string;
  description?: string;
  officialWebsite?: string;
  logoUrl?: string;
  year?: number | null;
  sectionCount?: number;
  topColleges?: string[];
}

const clean = (v?: string | null) => {
  const s = (v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  if (/^(tba|tbd|n\/?a|not available|none)$/i.test(s)) return undefined;
  return s;
};

const parseDate = (value?: string | null): Date | null => {
  const raw = clean(value);
  if (!raw) return null;
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime()) && direct.getFullYear() > 2000) return direct;
  const m = raw.match(/([A-Za-z]{3,})\s*(\d{1,2})?,?\s*(\d{4})/);
  if (m) {
    const d = new Date(`${m[1]} ${m[2] || 1}, ${m[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
};

const MODE_BUCKETS = [
  { value: "cbt", label: "Computer-Based (CBT)", test: (m: string) => /cbt|computer|online/i.test(m) },
  { value: "pen", label: "Pen & Paper", test: (m: string) => /pen|paper|offline|omr/i.test(m) },
  { value: "hybrid", label: "Hybrid / Both", test: (m: string) => /hybrid|both/i.test(m) },
];

const modeBucket = (mode?: string) => {
  const m = mode || "";
  return MODE_BUCKETS.find((b) => b.test(m))?.value;
};

const FREQ_BUCKETS = [
  { value: "yearly", label: "Once a year", test: (f: string) => /once a year|annual|yearly/i.test(f) },
  { value: "multi", label: "Multiple times a year", test: (f: string) => /twice|multiple|several|two|quarter/i.test(f) },
  { value: "rolling", label: "Round the year / on demand", test: (f: string) => /round the year|any ?time|on demand|continuous|throughout/i.test(f) },
];
const freqBucket = (freq?: string) => FREQ_BUCKETS.find((b) => b.test(freq || ""))?.value;

const inferCategory = (exam: ExamCard) => {
  const c = clean(exam.category);
  if (c) return c;
  const n = `${exam.name} ${exam.fullName || ""}`;
  if (/gmat|gre|toefl|ielts/i.test(n)) return "International";
  if (/mah|tancet|kmat|pgcet|state/i.test(n)) return "State Level";
  return "MBA / PGDM";
};

const inferLevel = (exam: ExamCard) => {
  const l = clean(exam.level);
  if (l) return l;
  const n = `${exam.name} ${exam.fullName || ""}`;
  if (/gmat|gre|toefl|ielts/i.test(n)) return "International";
  if (/mah|tancet|kmat|pgcet/i.test(n)) return "State";
  if (/snap|xat|nmat|micat|iift/i.test(n)) return "University";
  return "National";
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const monthOf = (exam: ExamCard) => {
  const d = parseDate(exam.examDate);
  if (d) return MONTHS[d.getMonth()];
  const hit = MONTHS.find((m) => new RegExp(m, "i").test(`${exam.examDate || ""} ${exam.frequency || ""}`));
  return hit;
};

type ExamStatus = "registration-open" | "upcoming" | "closed";

const statusOf = (exam: ExamCard): { key: ExamStatus; label: string; tone: string } => {
  const now = Date.now();
  const reg = parseDate(exam.registrationDeadline);
  const date = parseDate(exam.examDate);
  if (reg && reg.getTime() >= now) {
    return { key: "registration-open", label: "Registration open", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (date && date.getTime() >= now) {
    return { key: "upcoming", label: "Exam upcoming", tone: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  return { key: "closed", label: "Dates awaited", tone: "bg-muted text-muted-foreground border-border" };
};

const daysLeft = (exam: ExamCard) => {
  const d = parseDate(exam.examDate);
  if (!d) return null;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  return diff >= 0 ? diff : null;
};

const fromDb = (row: any): ExamCard => ({
  id: row.id,
  name: clean(row.name) || "",
  slug: row.slug,
  fullName: clean(row.full_name),
  conductingBody: clean(row.conducting_body),
  frequency: clean(row.frequency),
  mode: clean(row.exam_mode),
  duration: clean(row.duration),
  level: clean(row.exam_level),
  category: clean(row.exam_category),
  examDate: clean(row.exam_date),
  registrationDeadline: clean(row.registration_deadline),
  description: clean(row.description),
  officialWebsite: clean(row.official_website),
  logoUrl: clean(row.logo_url),
  year: row.exam_year ?? null,
  sectionCount: Array.isArray(row?.pattern?.sections) ? row.pattern.sections.length : undefined,
});

const fromStatic = (e: (typeof examDetails)[number]): ExamCard => ({
  id: e.id,
  name: e.name,
  slug: e.slug,
  fullName: e.fullName,
  conductingBody: e.conductedBy,
  frequency: e.frequency,
  mode: e.mode,
  duration: e.duration,
  examDate: e.importantDates.find((d) => /exam date|examination/i.test(d.event))?.date,
  registrationDeadline: e.importantDates.find((d) => /registration ends/i.test(d.event))?.date,
  description: e.description,
  officialWebsite: e.registrationLink,
  sectionCount: e.sections.length,
  topColleges: e.topColleges,
});

/* ------------------------------------------------------------------ */
/* Card                                                               */
/* ------------------------------------------------------------------ */

const ExamListCard = ({ exam, compact }: { exam: ExamCard; compact?: boolean }) => {
  const status = statusOf(exam);
  const left = daysLeft(exam);
  const category = inferCategory(exam);
  const level = inferLevel(exam);

  return (
    <Card className="group h-full overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <CardContent className={compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {exam.logoUrl ? (
              <img src={exam.logoUrl} alt={`${exam.name} logo`} loading="lazy" className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <GraduationCap className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
              <Link to={`/exam/${exam.slug}`} className="hover:text-primary">
                {exam.name}{exam.year ? ` ${exam.year}` : ""}
              </Link>
            </h3>
            {exam.fullName && (
              <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">{exam.fullName}</p>
            )}
          </div>
          <Badge variant="outline" className={`shrink-0 text-[10px] sm:text-xs ${status.tone}`}>{status.label}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px] sm:text-xs">{category}</Badge>
          {level !== category && <Badge variant="secondary" className="text-[10px] sm:text-xs">{level}</Badge>}
          {exam.mode && <Badge variant="secondary" className="max-w-[11rem] truncate text-[10px] sm:text-xs">{exam.mode}</Badge>}
        </div>

        {!compact && exam.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{exam.description}</p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:text-sm">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
              <CalendarDays className="h-3 w-3" /> Exam date
            </dt>
            <dd className="mt-0.5 line-clamp-1 font-medium text-foreground">{exam.examDate || "To be announced"}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
              <Clock className="h-3 w-3" /> Registration ends
            </dt>
            <dd className="mt-0.5 line-clamp-1 font-medium text-foreground">{exam.registrationDeadline || "To be announced"}</dd>
          </div>
          {exam.conductingBody && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                <BookOpen className="h-3 w-3" /> Conducted by
              </dt>
              <dd className="mt-0.5 line-clamp-1 font-medium text-foreground">{exam.conductingBody}</dd>
            </div>
          )}
          {(exam.duration || exam.frequency) && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                <Timer className="h-3 w-3" /> {exam.duration ? "Duration" : "Frequency"}
              </dt>
              <dd className="mt-0.5 line-clamp-1 font-medium text-foreground">{exam.duration || exam.frequency}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex items-center justify-between gap-2">
          {left !== null ? (
            <span className="text-xs font-medium text-primary sm:text-sm">{left} days to go</span>
          ) : (
            <span className="text-xs text-muted-foreground">Updated for {new Date().getFullYear()}</span>
          )}
          <div className="flex items-center gap-2">
            {exam.officialWebsite && (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <a href={exam.officialWebsite} target="_blank" rel="noopener noreferrer nofollow">
                  <Globe className="mr-1 h-3.5 w-3.5" /> Official
                </a>
              </Button>
            )}
            <Button asChild size="sm">
              <Link to={`/exam/${exam.slug}`}>
                View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

const SORTS = [
  { value: "soonest", label: "Exam date (soonest first)" },
  { value: "deadline", label: "Registration deadline" },
  { value: "name", label: "Name (A–Z)" },
  { value: "popularity", label: "Most popular" },
];

const POPULAR_ORDER = ["CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "IIFT", "MICAT", "TISSNET"];

const ExamsListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "all";
  const level = searchParams.get("level") || "all";
  const mode = searchParams.get("mode") || "all";
  const frequency = searchParams.get("frequency") || "all";
  const month = searchParams.get("month") || "all";
  const status = searchParams.get("status") || "all";
  const sort = searchParams.get("sort") || "soonest";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => { setSearchInput(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) setParam("q", searchInput);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const { data: dbExams, isLoading } = useQuery({
    queryKey: ["exams-listing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id, name, slug, full_name, conducting_body, frequency, exam_date, registration_deadline, description, official_website, logo_url, exam_year, exam_category, exam_level, exam_mode, duration, pattern")
        .order("name");
      if (error) throw error;
      return (data || []).filter((r: any) => clean(r.name) && clean(r.slug));
    },
    staleTime: 10 * 60 * 1000,
  });

  const exams = useMemo(() => {
    const map = new Map<string, ExamCard>();
    examDetails.forEach((e) => map.set(e.name.toUpperCase(), fromStatic(e)));
    (dbExams || []).forEach((row: any) => {
      const card = fromDb(row);
      map.set(card.name.toUpperCase(), card); // DB rows win over static seeds
    });
    return Array.from(map.values());
  }, [dbExams]);

  const options = useMemo(() => {
    const uniq = (values: (string | undefined)[]) =>
      Array.from(new Set(values.filter(Boolean) as string[])).sort();
    return {
      categories: uniq(exams.map(inferCategory)),
      levels: uniq(exams.map(inferLevel)),
      months: MONTHS.filter((m) => exams.some((e) => monthOf(e) === m)),
    };
  }, [exams]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = exams.filter((exam) => {
      if (needle) {
        const hay = `${exam.name} ${exam.fullName || ""} ${exam.conductingBody || ""} ${(exam.topColleges || []).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (category !== "all" && inferCategory(exam) !== category) return false;
      if (level !== "all" && inferLevel(exam) !== level) return false;
      if (mode !== "all" && modeBucket(exam.mode) !== mode) return false;
      if (frequency !== "all" && freqBucket(exam.frequency) !== frequency) return false;
      if (month !== "all" && monthOf(exam) !== month) return false;
      if (status !== "all" && statusOf(exam).key !== status) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "popularity") {
        const ia = POPULAR_ORDER.indexOf(a.name.toUpperCase());
        const ib = POPULAR_ORDER.indexOf(b.name.toUpperCase());
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }
      const key = sort === "deadline" ? "registrationDeadline" : "examDate";
      const da = parseDate(a[key as "examDate"]);
      const db = parseDate(b[key as "examDate"]);
      if (da && db) return da.getTime() - db.getTime();
      if (da) return -1;
      if (db) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [exams, q, category, level, mode, frequency, month, status, sort]);

  const stats = useMemo(() => ({
    total: exams.length,
    open: exams.filter((e) => statusOf(e).key === "registration-open").length,
    upcoming: exams.filter((e) => statusOf(e).key === "upcoming").length,
  }), [exams]);

  const activeCount = ["category", "level", "mode", "frequency", "month", "status"].filter(
    (k) => (searchParams.get(k) || "all") !== "all",
  ).length + (q ? 1 : 0);

  const jsonLd = useMemo(() => ([
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "MBA Entrance Exams in India",
      itemListElement: filtered.slice(0, 30).map((exam, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: exam.name,
        url: `https://mbacompass.in/exam/${exam.slug}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Which entrance exams are accepted for MBA admission in India?",
          acceptedAnswer: { "@type": "Answer", text: "CAT, XAT, NMAT, SNAP, CMAT, MAT, GMAT, IIFT, MICAT and various state-level tests such as MAH MBA CET are accepted by Indian B-schools. Most IIMs accept CAT, while private institutes accept their own tests." },
        },
        {
          "@type": "Question",
          name: "When are the MBA entrance exams held?",
          acceptedAnswer: { "@type": "Answer", text: "CAT is held in November, XAT in January, SNAP in December, NMAT between October and December, and CMAT and MAT are conducted in the first half of the year. Use the exam-month filter on this page to plan your calendar." },
        },
        {
          "@type": "Question",
          name: "How many MBA entrance exams should I appear for?",
          acceptedAnswer: { "@type": "Answer", text: "Most serious aspirants take three to four exams — CAT plus two or three among XAT, NMAT, SNAP and CMAT — so that a single bad test day does not end the admission season." },
        },
      ],
    },
  ]), [filtered]);

  const filterBar = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Exam category</label>
        <Select value={category} onValueChange={(v) => setParam("category", v)}>
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {options.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Exam level</label>
        <Select value={level} onValueChange={(v) => setParam("level", v)}>
          <SelectTrigger><SelectValue placeholder="All levels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {options.levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Exam mode</label>
        <Select value={mode} onValueChange={(v) => setParam("mode", v)}>
          <SelectTrigger><SelectValue placeholder="All modes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            {MODE_BUCKETS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Frequency</label>
        <Select value={frequency} onValueChange={(v) => setParam("frequency", v)}>
          <SelectTrigger><SelectValue placeholder="Any frequency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any frequency</SelectItem>
            {FREQ_BUCKETS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Exam month</label>
        <Select value={month} onValueChange={(v) => setParam("month", v)}>
          <SelectTrigger><SelectValue placeholder="Any month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any month</SelectItem>
            {options.months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Application status</label>
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="registration-open">Registration open</SelectItem>
            <SelectItem value="upcoming">Exam upcoming</SelectItem>
            <SelectItem value="closed">Dates awaited</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MBA Entrance Exams 2026: Dates, Eligibility, Pattern & Syllabus"
        description="Complete list of MBA entrance exams in India for 2026 — CAT, XAT, NMAT, SNAP, CMAT, MAT, GMAT and more. Filter by exam date, mode, level and registration status."
        keywords={["MBA entrance exams", "MBA exams 2026", "CAT XAT NMAT SNAP dates", "MBA exam calendar"]}
        canonical={canonicalUrl("/exam")}
        jsonLd={jsonLd}
      />
      <PageKeywords contentType="static" recordId="exam" fallbackKeywords={["MBA entrance exams 2026", "CAT XAT NMAT SNAP dates", "MBA exam calendar India"]} />

      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <SiteBreadcrumbs items={[{ name: "MBA Entrance Exams", url: "/exam" }]} className="mb-4" />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-3xl">
            <Badge variant="secondary" className="mb-3">Exam calendar {new Date().getFullYear()}</Badge>
            <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              MBA Entrance Exams in India — Dates, Pattern, Eligibility &amp; Cutoffs
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Browse every major management entrance test with verified exam dates, registration windows,
              paper pattern and accepting colleges. Filter by month, mode or application status to build
              your own test calendar.
            </p>
          </motion.div>

          <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl">
            {[
              { label: "Exams tracked", value: stats.total },
              { label: "Registrations open", value: stats.open },
              { label: "Upcoming exams", value: stats.upcoming },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-card p-3 text-center">
                <div className="text-lg font-bold text-primary sm:text-2xl">{s.value}</div>
                <div className="text-[11px] text-muted-foreground sm:text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search + filters */}
      <section className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search exams, conducting body or colleges…"
                className="pl-9"
                aria-label="Search MBA entrance exams"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
              <SelectTrigger className="w-[13rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters((v) => !v)} className="lg:hidden">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filters{activeCount ? ` (${activeCount})` : ""}
            </Button>
            <div className="hidden items-center gap-1 rounded-lg border border-border p-1 sm:flex">
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" aria-label="Grid view" onClick={() => setView("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" aria-label="List view" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={`${showFilters ? "block" : "hidden"} mt-3 lg:block`}>{filterBar}</div>

          {activeCount > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Filter className="h-3 w-3" /> Active:</span>
              {["category", "level", "mode", "frequency", "month", "status"].map((key) => {
                const value = searchParams.get(key);
                if (!value) return null;
                const label = key === "mode"
                  ? MODE_BUCKETS.find((m) => m.value === value)?.label
                  : key === "frequency"
                    ? FREQ_BUCKETS.find((f) => f.value === value)?.label
                    : value.replace(/-/g, " ");
                return (
                  <Badge key={key} variant="secondary" className="gap-1 capitalize">
                    {label}
                    <button onClick={() => setParam(key, "all")} aria-label={`Remove ${key} filter`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              <Button variant="ghost" size="sm" onClick={resetFilters}>Clear all</Button>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 py-6 sm:py-8">
        <p className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {exams.length} exams
        </p>

        {isLoading && !exams.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <h2 className="text-lg font-semibold">No exams match these filters</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Try widening your search — clear the month or status filter to see the full exam calendar.
              </p>
              <Button onClick={resetFilters}>Clear all filters</Button>
            </CardContent>
          </Card>
        ) : (
          <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {filtered.map((exam) => (
              <ExamListCard key={exam.id} exam={exam} compact={view === "list"} />
            ))}
          </div>
        )}
      </section>

      {/* Supporting content for SEO / AEO */}
      <section className="border-t border-border/60 bg-muted/20">
        <div className="container mx-auto grid gap-6 px-4 py-8 sm:py-12 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">How to choose which MBA exams to take</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Start with CAT — it opens the IIMs and over 1,200 B-schools. Add XAT for XLRI and the Xavier
              network, NMAT for NMIMS, and SNAP for the Symbiosis institutes. CMAT and MAT widen your safety
              net across AICTE-approved colleges, while GMAT is the route for one-year and international
              programmes. State tests such as MAH MBA CET matter if you are targeting Maharashtra colleges.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• Pick three to four exams so a single bad test day does not end your season.</li>
              <li>• Check registration deadlines first — they close weeks before the exam.</li>
              <li>• Match the paper pattern to your strengths (decision making in XAT, GK in XAT and SNAP).</li>
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "College Shortlister", desc: "Get a data-backed shortlist by score and profile", to: "/college-shortlister" },
              { title: "AI Profile Analyzer", desc: "Know where your profile stands today", to: "/profile-analyzer" },
              { title: "Browse MBA Colleges", desc: "Fees, placements and cutoffs for every B-school", to: "/colleges" },
              { title: "Mock Tests", desc: "Full-length and sectional mocks with analytics", to: "/mocks" },
            ].map((t) => (
              <Link key={t.to} to={t.to} className="group rounded-xl border border-border/60 bg-card p-4 transition hover:border-primary/40 hover:shadow-md">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary sm:text-base">{t.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExamsListingPage;
