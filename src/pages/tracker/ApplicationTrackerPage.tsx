import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { openLoginDialog } from "@/hooks/useCtaGate";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowUpRight,
  CalendarClock,
  Info,
  LayoutDashboard,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  CATEGORY_FILTERS,
  CATEGORY_LABEL,
  DEADLINE_FILTERS,
  DEFAULT_PREFS,
  type CategoryKey,
  type DeadlineFilterKey,
  type DeadlineTone,
  type TrackerPrefs,
  type TrackerRow,
  deadlineInfo,
  examOptions,
  formatDate,
  formatFee,
  matchesCategory,
  matchesDeadlineFilter,
  matchesExam,
  publicTrackersQuery,
  readLocalPrefs,
  readRemotePrefs,
  startTrackedApplication,
  trackTrackerView,
  writeLocalPrefs,
  writeRemotePrefs,
} from "@/lib/applicationTracker";
import {
  APPLICATION_BASE,
  APPLICATION_YEAR,
  categoryPageMeta,
  categoryUrl,
  collectionSchema,
  collegeUrl,
  faqSchema,
  listingFaqs,
  mainPageMeta,
} from "@/lib/applicationSeo";
import RecommendedRail from "@/components/application/RecommendedRail";
import NotificationOptIn from "@/components/NotificationOptIn";


const TONE_CLASS: Record<DeadlineTone, string> = {
  today: "bg-rose-50 text-rose-700 border-rose-200",
  urgent: "bg-orange-50 text-orange-700 border-orange-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

const LogoBadge = ({ row }: { row: TrackerRow }) => {
  if (row.logo_url) {
    return (
      <img
        src={row.logo_url}
        alt={row.seo_image_alt || `${row.name} MBA application form logo`}
        loading="lazy"
        decoding="async"
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-xl border border-sky-100 bg-white object-contain p-1"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-base font-semibold text-sky-700"
    >
      {row.name.slice(0, 2).toUpperCase()}
    </span>
  );
};

type Props = {
  /** When set, the page is a category landing page and the category tabs are locked. */
  presetCategory?: Exclude<CategoryKey, "all">;
};

export default function ApplicationTrackerPage({ presetCategory }: Props) {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery(publicTrackersQuery);
  const rows = useMemo<TrackerRow[]>(() => data ?? [], [data]);

  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterKey>("all");
  const [category, setCategory] = useState<CategoryKey>(presetCategory ?? "all");
  const [exam, setExam] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [applying, setApplying] = useState<string | null>(null);
  const [prefsReady, setPrefsReady] = useState(false);

  /* Restore the student's last filter choice (profile first, then this device). */
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      let prefs: TrackerPrefs | null = null;
      if (user) prefs = await readRemotePrefs(user.id);
      if (!prefs) prefs = readLocalPrefs();
      if (!cancelled && prefs) {
        setDeadlineFilter(prefs.deadline_filter);
        if (!presetCategory) setCategory(prefs.category);
        setExam(prefs.exam);
      }
      if (!cancelled) setPrefsReady(true);
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [user, presetCategory]);

  /* Persist any change so returning students keep their view. */
  useEffect(() => {
    if (!prefsReady) return;
    const prefs: TrackerPrefs = { deadline_filter: deadlineFilter, category, exam };
    writeLocalPrefs(prefs);
    if (user) void writeRemotePrefs(user.id, prefs);
  }, [prefsReady, deadlineFilter, category, exam, user]);

  const exams = useMemo(() => examOptions(rows), [rows]);

  const scoped = useMemo(
    () => (presetCategory ? rows.filter((r) => matchesCategory(r, presetCategory)) : rows),
    [rows, presetCategory],
  );

  const meta = useMemo(
    () => (presetCategory ? categoryPageMeta(presetCategory, scoped) : mainPageMeta(scoped)),
    [presetCategory, scoped],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = scoped.filter((row) => {
      if (!matchesDeadlineFilter(row, deadlineFilter)) return false;
      if (!matchesCategory(row, category)) return false;
      if (!matchesExam(row, exam)) return false;
      if (!q) return true;
      const haystack = `${row.name} ${row.short_name ?? ""} ${row.program ?? ""} ${row.location ?? ""} ${(row.accepted_exams ?? []).join(" ")}`;
      return haystack.toLowerCase().includes(q);
    });
    if (category === "recommended") {
      return [...list].sort((a, b) => b.recommendation_priority - a.recommendation_priority);
    }
    return list;
  }, [scoped, deadlineFilter, category, exam, search]);

  const stats = useMemo(() => {
    let open = 0;
    let today = 0;
    let week = 0;
    for (const row of scoped) {
      const info = deadlineInfo(row);
      if (info.isOpen) open += 1;
      if (info.daysLeft === 0) today += 1;
      if (info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 7) week += 1;
    }
    return { total: scoped.length, open, today, week };
  }, [scoped]);

  const faqs = useMemo(() => listingFaqs(scoped), [scoped]);

  /* Today's picks: advisor-recommended and still open, highest priority first.
     If nothing is marked recommended, fall back to whatever closes soonest. */
  const todaysPicks = useMemo(() => {
    const open = scoped.filter((row) => deadlineInfo(row).isOpen);
    const picked = open
      .filter((row) => row.is_recommended)
      .sort((a, b) => {
        if (b.recommendation_priority !== a.recommendation_priority) {
          return b.recommendation_priority - a.recommendation_priority;
        }
        return (a.application_deadline ?? "9999").localeCompare(b.application_deadline ?? "9999");
      });
    if (picked.length > 0) return picked.slice(0, 12);
    return [...open]
      .sort((a, b) => (a.application_deadline ?? "9999").localeCompare(b.application_deadline ?? "9999"))
      .slice(0, 10);
  }, [scoped]);

  const filtersDirty = deadlineFilter !== DEFAULT_PREFS.deadline_filter || exam !== null || !!search ||
    (!presetCategory && category !== "all");

  const resetFilters = () => {
    setDeadlineFilter("all");
    if (!presetCategory) setCategory("all");
    setExam(null);
    setSearch("");
  };

  const handleApply = async (row: TrackerRow) => {
    if (!row.apply_url) {
      toast({ title: "Application link coming soon", description: `${row.name} has not published its form yet.` });
      return;
    }
    if (!user) {
      openLoginDialog(`Sign in to track your ${row.name} application and get deadline reminders.`);
      return;
    }
    // Open synchronously so the browser does not treat the tab as a pop-up.
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");
    setApplying(row.id);
    try {
      const url = await startTrackedApplication(row, user);
      if (url) {
        if (win) win.location.href = url;
        else window.location.href = url;
      }
      toast({ title: "Application tracked", description: `${row.name} was added to My Applications.` });
    } catch {
      win?.close();
      toast({ title: "Could not track this application", description: "Please try again.", variant: "destructive" });
    } finally {
      setApplying(null);
    }
  };

  const hasInside = (row: TrackerRow) => !!row.inside_info_url || !!row.inside_info_notes;

  const breadcrumbItems = presetCategory
    ? [
        { name: `MBA College & Exam Application ${APPLICATION_YEAR}`, url: APPLICATION_BASE },
        { name: meta.h1, url: categoryUrl(presetCategory) },
      ]
    : [{ name: `MBA College & Exam Application ${APPLICATION_YEAR}`, url: APPLICATION_BASE }];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-20 md:p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema(meta, scoped)) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
      <SiteBreadcrumbs items={breadcrumbItems} />

      <header className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-blue-50/60 p-6 md:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative space-y-4">
          <Badge variant="outline" className="border-sky-200 bg-white/80 text-sky-700">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Deadlines verified daily by the MBA Compass team
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">{meta.h1}</h1>
          <p className="max-w-3xl text-base text-slate-600">
            Every MBA application form in one place — college-wise last dates, application fees, programme fees,
            accepted entrance exams (CAT, XAT, GMAT, NMAT, SNAP, CMAT), cutoff notes, average package and official
            apply-online links for IIMs, Tier 1 and Tier 2 B-schools. Start an application and we keep it updated inside{" "}
            <Link to="/mba-application/my-applications" className="font-medium text-sky-700 underline-offset-2 hover:underline">
              My Applications
            </Link>
            .
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {[
              { label: "Applications listed", value: stats.total, icon: LayoutDashboard },
              { label: "Currently open", value: stats.open, icon: ShieldCheck },
              { label: "Deadline today", value: stats.today, icon: Timer },
              { label: "Closing this week", value: stats.week, icon: CalendarClock },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-sky-100 bg-white/80 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <s.icon className="h-4 w-4 text-sky-600" />
                  {s.label}
                </div>
                <div className="pt-1 text-[1.375rem] font-semibold text-slate-900">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Today's recommended colleges — auto-scrolling rail */}
      {!isLoading && <RecommendedRail rows={todaysPicks} onApply={(row) => void handleApply(row)} />}

      {/* Browser alerts opt-in (wording and on/off controlled from the admin panel) */}
      <NotificationOptIn />

      {/* Filters */}
      <section
        aria-label="Filter MBA applications"
        className="sticky top-16 z-20 space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
      >

        <div>
          <p className="pb-2 text-sm font-medium text-slate-500">Application deadline</p>
          <div className="flex flex-wrap gap-2">
            {DEADLINE_FILTERS.map((f) => (
              <Button
                key={f.key}
                type="button"
                size="sm"
                variant={deadlineFilter === f.key ? "default" : "outline"}
                onClick={() => setDeadlineFilter(f.key)}
                className="rounded-full"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
        {!presetCategory && (
          <div>
            <p className="pb-2 text-sm font-medium text-slate-500">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((f) => (
                <Button
                  key={f.key}
                  type="button"
                  size="sm"
                  variant={category === f.key ? "default" : "outline"}
                  onClick={() => setCategory(f.key)}
                  className="rounded-full"
                >
                  {f.key === "recommended" && <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        {exams.length > 0 && (
          <div>
            <p className="pb-2 text-sm font-medium text-slate-500">Entrance exam</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={exam === null ? "default" : "outline"}
                onClick={() => setExam(null)}
                className="rounded-full"
              >
                All exams
              </Button>
              {exams.map((e) => (
                <Button
                  key={e}
                  type="button"
                  size="sm"
                  variant={exam === e ? "default" : "outline"}
                  onClick={() => setExam(exam === e ? null : e)}
                  className="rounded-full"
                >
                  {e}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search college, B-school, exam or programme…"
              aria-label="Search MBA applications"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={resetFilters} disabled={!filtersDirty} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        </div>
      </section>

      {/* Results */}
      {!isLoading && !isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-900">{visible.length}</span> of {stats.total}{" "}
            applications{search ? ` for “${search}”` : ""}
          </p>
          <NotificationOptIn compact />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-600">
            We could not load applications right now. Please refresh the page.
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-10 text-center">
            <p className="text-base font-medium text-slate-900">No applications match these filters</p>
            <p className="text-sm text-slate-500">Try clearing the search or switching back to “All”.</p>
            <Button variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table — scrolls sideways when the columns exceed the width */}
          <div className="hidden rounded-2xl border border-slate-200 bg-white lg:block">
            <div
              className="overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-width:thin]"
              tabIndex={0}
              role="region"
              aria-label="MBA application table — scroll sideways for more columns"
            >
            <table className="w-full min-w-[1180px] text-sm">
              <caption className="sr-only">
                MBA college and exam application forms with last dates, application fees and programme fees
              </caption>
              <thead className="bg-slate-50 text-left text-sm text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">College / Exam</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Opens</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Application fee</th>
                  <th scope="col" className="px-4 py-3 font-medium">Programme fee</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const info = deadlineInfo(row);
                  return (
                    <tr key={row.id} className="border-t border-slate-100 align-middle hover:bg-sky-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <LogoBadge row={row} />
                          <div className="min-w-0">
                            <Link
                              to={collegeUrl(row)}
                              className="block truncate font-medium text-slate-900 hover:text-sky-700"
                            >
                              {row.name}
                            </Link>
                            <p className="truncate text-sm text-slate-500">
                              {row.program || row.location || (row.accepted_exams ?? []).join(", ") || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                          {CATEGORY_LABEL[row.category] ?? row.category}
                        </Badge>
                        {row.is_recommended && (
                          <Badge variant="outline" className="ml-1 border-amber-200 bg-amber-50 text-amber-700">
                            {row.recommendation_label || "Recommended"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm ${TONE_CLASS[info.tone]}`}>
                          <Timer className="h-3.5 w-3.5" />
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.application_open_date)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.application_deadline)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatFee(row.application_fee)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatFee(row.program_fee)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {hasInside(row) && (
                            <Button asChild size="sm" variant="outline" className="gap-1.5">
                              <Link to={collegeUrl(row)} onClick={() => void trackTrackerView(row, user ?? null, "inside_info")}>
                                <Info className="h-3.5 w-3.5" /> Inside Information
                              </Link>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            disabled={applying === row.id || !info.isOpen}
                            onClick={() => void handleApply(row)}
                            className="gap-1.5"
                          >
                            {info.isOpen ? "Apply Now" : "Closed"}
                            {info.isOpen && <ArrowUpRight className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

          {/* Mobile / tablet cards */}
          <div className="grid gap-3 lg:hidden">
            {visible.map((row) => {
              const info = deadlineInfo(row);
              return (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <LogoBadge row={row} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-medium leading-snug text-slate-900">
                        <Link to={collegeUrl(row)} className="hover:text-sky-700">
                          {row.name}
                        </Link>
                      </h2>
                      <p className="truncate text-sm text-slate-500">
                        {row.program || row.location || (row.accepted_exams ?? []).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-3">
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                      {CATEGORY_LABEL[row.category] ?? row.category}
                    </Badge>
                    {row.is_recommended && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        {row.recommendation_label || "Recommended"}
                      </Badge>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm ${TONE_CLASS[info.tone]}`}>
                      <Timer className="h-3.5 w-3.5" /> {info.label}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Opens</dt>
                      <dd className="text-slate-900">{formatDate(row.application_open_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Last date</dt>
                      <dd className="text-slate-900">{formatDate(row.application_deadline)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Application fee</dt>
                      <dd className="text-slate-900">{formatFee(row.application_fee)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Programme fee</dt>
                      <dd className="text-slate-900">{formatFee(row.program_fee)}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                    {hasInside(row) && (
                      <Button asChild variant="outline" className="flex-1 gap-1.5">
                        <Link to={collegeUrl(row)} onClick={() => void trackTrackerView(row, user ?? null, "inside_info")}>
                          <Info className="h-4 w-4" /> Inside Information
                        </Link>
                      </Button>
                    )}
                    <Button
                      className="flex-1 gap-1.5"
                      disabled={applying === row.id || !info.isOpen}
                      onClick={() => void handleApply(row)}
                    >
                      {info.isOpen ? "Apply Now" : "Closed"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Internal links to the category landing pages */}
      {!presetCategory && (
        <section aria-label="Browse MBA applications by category" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[1.375rem] font-semibold text-slate-900">Browse MBA application forms by category</h2>
          <div className="grid gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_FILTERS.filter((c) => c.key !== "all").map((c) => (
              <Link
                key={c.key}
                to={categoryUrl(c.key as Exclude<CategoryKey, "all">)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
              >
                {c.label} — application forms, deadlines &amp; fees {APPLICATION_YEAR}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQs (also emitted as FAQPage schema above) */}
      <section aria-label="MBA application FAQs" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[1.375rem] font-semibold text-slate-900">MBA application FAQs</h2>
        <Accordion type="single" collapsible className="pt-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
