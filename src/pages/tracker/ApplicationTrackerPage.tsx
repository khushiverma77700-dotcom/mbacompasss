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
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  ChevronRight,
  CircleCheckBig,
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
  rowPrograms,
  PROGRAM_OPTIONS,
  TIER_OPTIONS,
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
import ApplicationCountdown from "@/components/application/ApplicationCountdown";
import ApplicationInformation from "@/components/application/ApplicationInformation";
import { compareRecommendations } from "@/lib/applicationDeadline";
import RecommendedRail from "@/components/application/RecommendedRail";
import NotificationOptIn from "@/components/NotificationOptIn";


const TONE_CLASS: Record<DeadlineTone, string> = {
  today: "bg-application-danger-soft text-application-danger border-application-danger/20",
  urgent: "bg-application-warning-soft text-application-warning border-application-warning/20",
  soon: "bg-application-warning-soft text-application-warning border-application-warning/20",
  open: "bg-application-green-soft text-application-green border-application-green/20",
  closed: "bg-muted text-muted-foreground border-border",
  unknown: "bg-muted text-muted-foreground border-border",
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
        className="h-12 w-12 shrink-0 rounded-lg border border-application-blue/10 bg-application-blue-soft object-contain p-1 shadow-sm"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-application-blue/10 bg-application-blue-soft text-lg font-bold text-application-blue shadow-sm"
    >
      {row.name.slice(0, 2).toUpperCase()}
    </span>
  );
};

type Props = {
  /** When set, the page is a category landing page and the category tabs are locked. */
  presetCategory?: Exclude<CategoryKey, "all">;
};

const FEE_BANDS = [
  { key: "lt10", label: "Under ₹10 Lakhs", min: 0, max: 999999 },
  { key: "10to20", label: "₹10–20 Lakhs", min: 1000000, max: 2000000 },
  { key: "gt20", label: "Above ₹20 Lakhs", min: 2000001, max: Number.MAX_SAFE_INTEGER },
];

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
  const [tierFilter, setTierFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [feeFilter, setFeeFilter] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);


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
    // A category landing page is a scoped view, not a filter choice for the main hub.
    if (!prefsReady || presetCategory) return;
    const prefs: TrackerPrefs = { deadline_filter: deadlineFilter, category, exam };
    writeLocalPrefs(prefs);
    if (user) void writeRemotePrefs(user.id, prefs);
  }, [prefsReady, presetCategory, deadlineFilter, category, exam, user]);

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
      if (tierFilter && row.tier !== tierFilter) return false;
      if (programFilter && !rowPrograms(row).includes(programFilter)) return false;
      if (feeFilter) {
        const band = FEE_BANDS.find((b) => b.key === feeFilter);
        if (band && (row.program_fee == null || row.program_fee < band.min || row.program_fee > band.max)) return false;
      }
      if (!q) return true;
      const haystack = `${row.name} ${row.short_name ?? ""} ${rowPrograms(row).join(" ")} ${row.location ?? ""} ${(row.accepted_exams ?? []).join(" ")}`;
      return haystack.toLowerCase().includes(q);
    });
    if (category === "recommended") {
      return [...list].sort(compareRecommendations);
    }
    return list;
  }, [scoped, deadlineFilter, category, exam, search, tierFilter, programFilter, feeFilter, now]);

  const stats = useMemo(() => {
    let open = 0;
    let today = 0;
    let week = 0;
    for (const row of scoped) {
      const info = deadlineInfo(row, now ?? undefined);
      if (info.isOpen) open += 1;
      if (info.daysLeft === 0) today += 1;
      if (info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 7) week += 1;
    }
    return { total: scoped.length, open, today, week };
  }, [scoped, now]);

  const faqs = useMemo(() => listingFaqs(scoped), [scoped]);

  const todaysPicks = useMemo(() => scoped.filter((row) => row.is_recommended).sort(compareRecommendations), [scoped]);

  const filtersDirty = deadlineFilter !== DEFAULT_PREFS.deadline_filter || exam !== null || !!search || !!tierFilter || !!programFilter || !!feeFilter ||
    (!presetCategory && category !== "all");

  const resetFilters = () => {
    setDeadlineFilter("all");
    setTierFilter("");
    setProgramFilter("");
    setFeeFilter("");
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


  const groupedVisible = useMemo(() => {
    const definitions = [
      { key: "exam", title: "MBA entrance examinations", note: "Registration windows, test fees and official exam applications." },
      { key: "iim", title: "IIM applications", note: "Application dossiers for Indian Institutes of Management." },
      { key: "tier1", title: "Tier 1 non-IIM institutions", note: "Priority applications for leading independent business schools." },
      { key: "tier2", title: "Tier 2 non-IIM institutions", note: "Additional programmes to strengthen a balanced application portfolio." },
    ];
    const groups = definitions
      .map((definition) => ({ ...definition, rows: visible.filter((row) => row.category === definition.key) }))
      .filter((group) => group.rows.length > 0);
    const known = new Set(definitions.map((definition) => definition.key));
    const other = visible.filter((row) => !known.has(row.category));
    if (other.length > 0) groups.push({ key: "other", title: "Other MBA applications", note: "Additional active application opportunities.", rows: other });
    return groups;
  }, [visible]);

  const breadcrumbItems = presetCategory
    ? [
        { name: `MBA College & Exam Application ${APPLICATION_YEAR}`, url: APPLICATION_BASE },
        { name: meta.h1, url: categoryUrl(presetCategory) },
      ]
    : [{ name: `MBA College & Exam Application ${APPLICATION_YEAR}`, url: APPLICATION_BASE }];

  return (
    <div className="application-directory min-h-screen">
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 pb-20 md:space-y-8 md:p-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema(meta, scoped)) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
      <SiteBreadcrumbs items={breadcrumbItems} />

      <header className="application-hero px-0 pb-5 pt-2 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0 max-w-3xl space-y-4">
            <Badge variant="outline" className="rounded-md border-application-line bg-application-panel text-application-blue">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> MBA Compass application desk
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight text-application-ink md:text-4xl">{meta.h1}</h1>
            <p className="max-w-3xl text-base text-application-copy">
            College and exam applications, official deadlines, fees and admission details for your MBA journey.
            </p>
            <Button asChild className="h-11 w-full gap-2 sm:w-auto">
              <Link to="/mba-application/my-applications">
                <ClipboardList className="h-4 w-4" /> My Applications <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-application-line pt-4 sm:grid-cols-4 lg:w-96 lg:shrink-0 lg:grid-cols-2">
            {[
              { label: "Applications listed", value: stats.total, icon: LayoutDashboard },
              { label: "Currently open", value: stats.open, icon: ShieldCheck },
              { label: "Deadline today", value: stats.today, icon: Timer },
              { label: "Closing this week", value: stats.week, icon: CalendarClock },
            ].map((s) => (
              <div key={s.label} className="min-w-0">
                <div className="flex items-start gap-2 text-sm leading-tight text-application-copy">
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-application-blue" />
                  {s.label}
                </div>
                <div className="pt-2 text-xl font-semibold leading-none text-application-ink">{s.value}</div>
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
        className="space-y-4 border-y border-application-line py-5"
      >

        <h2 className="text-xl font-semibold text-application-ink">Find applications</h2>
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          <label className="min-w-0 text-sm font-medium text-application-copy">Deadline
            <select aria-label="Filter by deadline" value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value as DeadlineFilterKey)} className="mt-1 block h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground">
              {DEADLINE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </label>
          {!presetCategory && <label className="min-w-0 text-sm font-medium text-application-copy">Category
            <select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as CategoryKey)} className="mt-1 block h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground">
              {CATEGORY_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </label>}
          {exams.length > 0 && <label className="col-span-2 text-sm font-medium text-application-copy">Entrance exam
            <select aria-label="Filter by entrance exam" value={exam ?? ""} onChange={(e) => setExam(e.target.value || null)} className="mt-1 block h-11 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
              <option value="">All exams</option>
              {exams.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>}
        </div>
        <div className="hidden sm:block">
          <p className="pb-2 text-sm font-semibold text-application-copy">Application deadline</p>
          <div className="flex flex-wrap gap-2">
            {DEADLINE_FILTERS.map((f) => (
              <Button
                key={f.key}
                type="button"
                size="sm"
                variant={deadlineFilter === f.key ? "default" : "outline"}
                onClick={() => setDeadlineFilter(f.key)}
                className="rounded-md"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
        {!presetCategory && (
          <div className="hidden sm:block">
            <p className="pb-2 text-sm font-semibold text-application-copy">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((f) => (
                <Button
                  key={f.key}
                  type="button"
                  size="sm"
                  variant={category === f.key ? "default" : "outline"}
                  onClick={() => setCategory(f.key)}
                  className="rounded-md"
                >
                  {f.key === "recommended" && <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        {exams.length > 0 && (
          <div className="hidden sm:block">
            <p className="pb-2 text-sm font-semibold text-application-copy">Entrance exam</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={exam === null ? "default" : "outline"}
                onClick={() => setExam(null)}
                className="rounded-md"
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
                  className="rounded-md"
                >
                  {e}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Tier", value: tierFilter, set: setTierFilter, options: TIER_OPTIONS.map((t) => [t, t]) },
            { label: "Program", value: programFilter, set: setProgramFilter, options: PROGRAM_OPTIONS.map((t) => [t, t]) },
            { label: "Program fees", value: feeFilter, set: setFeeFilter, options: FEE_BANDS.map((b) => [b.key, b.label]) },
          ].map((f) => (
            <label key={f.label} className="min-w-0 text-sm font-medium text-application-copy last:col-span-2 sm:last:col-span-1">
              {f.label}
              <select
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="mt-1 block h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="">All</option>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-application-copy" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search college, B-school, exam or programme…"
              aria-label="Search MBA applications"
              className="h-11 pl-9"
            />
          </div>
          <Button variant="outline" onClick={resetFilters} disabled={!filtersDirty} className="h-11 gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        </div>
      </section>

      {/* Results */}
      {!isLoading && !isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm text-application-copy">
            Showing <span className="font-semibold text-application-ink">{visible.length}</span> of {stats.total}{" "}
            applications{search ? ` for “${search}”` : ""}
          </p>
          <NotificationOptIn compact />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-lg border-application-line">
          <CardContent className="p-8 text-center text-application-copy">
            We could not load applications right now. Please refresh the page.
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="rounded-lg border-application-line">
          <CardContent className="space-y-2 p-10 text-center">
            <p className="text-base font-medium text-application-ink">No applications match these filters</p>
            <p className="text-sm text-application-copy">Try clearing the search or switching back to “All”.</p>
            <Button variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {groupedVisible.map((group) => (
            <section key={group.key} aria-labelledby={`application-group-${group.key}`} className="space-y-4">
              <div className="flex flex-col justify-between gap-3 border-b border-application-line pb-3 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-2 h-1 w-10 rounded-full bg-application-blue" />
                  <h2 id={`application-group-${group.key}`} className="text-xl font-semibold text-application-ink">{group.title}</h2>
                  <p className="mt-1 text-sm text-application-copy">{group.note}</p>
                </div>
                <span className="text-sm font-semibold text-application-blue">{group.rows.length} applications</span>
              </div>

              <div className="space-y-3">
                {group.rows.map((row) => {
                  const info = deadlineInfo(row, now ?? undefined);
                  return (
                    <article key={row.id} className="application-card group overflow-hidden">
                      <div className="grid lg:grid-cols-12">
                        <div className="min-w-0 border-b border-application-line bg-application-panel p-4 lg:col-span-4 lg:border-b-0 lg:border-r md:p-6">
                          <div className="flex min-w-0 items-start gap-3">
                            <LogoBadge row={row} />
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold leading-snug text-application-ink transition-colors group-hover:text-application-blue">
                                <Link to={collegeUrl(row)}>{row.name}</Link>
                              </h3>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                <Badge variant="outline" className="rounded-md border-application-blue/10 bg-application-blue-soft text-sm font-medium text-application-blue">
                                  {CATEGORY_LABEL[row.category] ?? row.category}
                                </Badge>
                                {row.is_recommended && (
                                  <Badge variant="outline" className="max-w-full whitespace-normal rounded-md border-application-warning/20 bg-application-warning-soft text-sm font-medium text-application-warning">
                                    {row.recommendation_label || "Recommended"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4"><ApplicationCountdown row={row} /></div>
                         </div>

                         <div className="grid grid-cols-2 gap-px bg-application-line lg:col-span-5">
                          {[
                            { label: "Program", value: rowPrograms(row).join(", ") || "—" },
                            { label: "Tier", value: row.tier || "—" },
                            { label: "Program fees", value: formatFee(row.program_fee) },
                            { label: "Application fees", value: formatFee(row.application_fee) },
                          ].map((item) => (
                            <div key={item.label} className="min-w-0 bg-application-panel px-4 py-3 md:p-5">
                              <dt className="text-sm font-mediumr text-application-copy/70">{item.label}</dt>
                              <dd className="mt-1 break-words text-base font-semibold text-application-ink">{item.value}</dd>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col justify-between gap-4 border-t border-application-line bg-application-panel p-4 lg:col-span-3 lg:border-l lg:border-t-0 md:p-6">
                          <div>
                            {(row.accepted_exams ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {(row.accepted_exams ?? []).map((e) => (
                                  <span key={e} className="rounded border border-application-line bg-application-panel px-2 py-0.5 text-xs text-application-ink">{e}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <Button
                              disabled={applying === row.id || !info.isOpen}
                              onClick={() => void handleApply(row)}
                              className="h-11 w-full gap-1.5 rounded-md"
                            >
                              {info.isOpen ? "Apply Now" : "Applications Closed"}
                              {info.isOpen && <ArrowUpRight className="h-4 w-4" />}
                            </Button>
                            <Button asChild variant="outline" className="h-11 w-full gap-1.5 rounded-md">
                              <Link to={collegeUrl(row)} onClick={() => void trackTrackerView(row, user ?? null, "view")}>
                                {row.category === "exam" ? "View Exam Details" : "View College Details"} <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                      {(row.details_html || row.eligibility || row.selection_process || row.short_description || row.recommendation_note || row.inside_info_notes || row.cutoff_note || row.average_package != null) && (
                        <Accordion type="single" collapsible className="border-t border-application-line px-4 md:px-6">
                          <AccordionItem value="highlights" className="border-0">
                            <AccordionTrigger className="text-left text-base leading-snug text-application-blue">{row.category === "exam" ? "Exam information" : "College highlights & admissions"}</AccordionTrigger>
                            <AccordionContent className="pb-6"><ApplicationInformation row={row} /></AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Internal links to the category landing pages */}
      {!presetCategory && (
        <section aria-label="Browse MBA applications by category" className="border-t border-application-line pt-5">
          <h2 className="text-xl font-semibold text-application-ink">Browse MBA application forms by category</h2>
          <div className="grid gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_FILTERS.filter((c) => c.key !== "all").map((c) => (
              <Link
                key={c.key}
                to={categoryUrl(c.key as Exclude<CategoryKey, "all">)}
                className="flex items-center justify-between rounded-md border border-application-line px-4 py-3 text-sm text-application-copy transition-colors hover:bg-application-blue-soft hover:text-application-blue"
              >
                <span>{c.label} — application forms, deadlines &amp; fees {APPLICATION_YEAR}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQs (also emitted as FAQPage schema above) */}
      <section aria-label="MBA application FAQs" className="border-t border-application-line pt-5">
        <h2 className="text-xl font-semibold text-application-ink">MBA application FAQs</h2>
        <Accordion type="single" collapsible className="pt-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-application-copy">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
    </div>
  );
}
