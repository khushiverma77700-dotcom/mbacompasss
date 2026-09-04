import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { openLoginDialog } from "@/hooks/useCtaGate";
import { canonicalUrl } from "@/lib/canonical";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  CalendarClock,
  ExternalLink,
  FileText,
  Info,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  CATEGORY_FILTERS,
  CATEGORY_LABEL,
  DEADLINE_FILTERS,
  type DeadlineFilterKey,
  type DeadlineTone,
  type TrackerCategory,
  type TrackerRow,
  deadlineInfo,
  formatDate,
  formatFee,
  matchesCategory,
  matchesDeadlineFilter,
  publicTrackersQuery,
  startTrackedApplication,
  trackTrackerView,
} from "@/lib/applicationTracker";

const TONE_CLASS: Record<DeadlineTone, string> = {
  today: "bg-rose-50 text-rose-700 border-rose-200",
  urgent: "bg-orange-50 text-orange-700 border-orange-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

const setMeta = (name: string, content: string, property = false) => {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    if (property) el.setAttribute("property", name);
    else el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
};

const setCanonical = (href: string) => {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
};

const TITLE = "MBA College & Exam Application Tracker 2027 — Deadlines, Fees & Apply Links";
const DESCRIPTION =
  "Track every MBA entrance exam and B-school application in one place. Live deadlines, application fees, programme fees, accepted exams and official apply links for IIMs and top non-IIM colleges.";

const LogoBadge = ({ row }: { row: TrackerRow }) => {
  if (row.logo_url) {
    return (
      <img
        src={row.logo_url}
        alt={`${row.name} logo`}
        loading="lazy"
        decoding="async"
        className="h-11 w-11 shrink-0 rounded-xl border border-sky-100 bg-white object-contain p-1"
      />
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-base font-semibold text-sky-700">
      {row.name.slice(0, 2).toUpperCase()}
    </span>
  );
};

export default function ApplicationTrackerPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery(publicTrackersQuery);
  const rows = useMemo<TrackerRow[]>(() => data ?? [], [data]);

  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterKey>("all");
  const [category, setCategory] = useState<"all" | TrackerCategory>("all");
  const [search, setSearch] = useState("");
  const [insideRow, setInsideRow] = useState<TrackerRow | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${TITLE} | MBA Compass`;
    setMeta("description", DESCRIPTION);
    setMeta("og:title", TITLE, true);
    setMeta("og:description", DESCRIPTION, true);
    setMeta("og:type", "website", true);
    setMeta("twitter:card", "summary_large_image");
    setCanonical(canonicalUrl("/my-mba-2027"));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesDeadlineFilter(row, deadlineFilter)) return false;
      if (!matchesCategory(row, category)) return false;
      if (!q) return true;
      const haystack = `${row.name} ${row.program ?? ""} ${row.location ?? ""} ${(row.accepted_exams ?? []).join(" ")}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [rows, deadlineFilter, category, search]);

  const stats = useMemo(() => {
    let open = 0;
    let today = 0;
    let week = 0;
    for (const row of rows) {
      const info = deadlineInfo(row);
      if (info.isOpen) open += 1;
      if (info.daysLeft === 0) today += 1;
      if (info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 7) week += 1;
    }
    return { total: rows.length, open, today, week };
  }, [rows]);

  const handleApply = async (row: TrackerRow) => {
    if (!row.apply_url) {
      toast({ title: "Application link coming soon", description: `${row.name} has not published its form yet.` });
      return;
    }
    if (!user) {
      openLoginDialog(`Sign in to track your ${row.name} application and get deadline reminders.`);
      return;
    }
    setApplying(row.id);
    try {
      const url = await startTrackedApplication(row, user);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      toast({ title: "Application tracked", description: `${row.name} was added to My Applications.` });
    } catch {
      toast({ title: "Could not track this application", description: "Please try again.", variant: "destructive" });
    } finally {
      setApplying(null);
    }
  };

  const handleInside = (row: TrackerRow) => {
    setInsideRow(row);
    void trackTrackerView(row, user ?? null, "inside_info");
  };

  const itemListSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: TITLE,
      itemListElement: rows.slice(0, 50).map((row, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: row.name,
        description: row.short_description ?? `${CATEGORY_LABEL[row.category] ?? row.category} application deadline and fees`,
      })),
    }),
    [rows],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-20 md:p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <SiteBreadcrumbs items={[{ name: "MBA Application Tracker", url: "/my-mba-2027" }]} />

      <header className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-blue-50/60 p-6 md:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative space-y-4">
          <Badge variant="outline" className="border-sky-200 bg-white/80 text-sky-700">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Updated daily by the MBA Compass team
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
            MBA College &amp; Exam Application Tracker
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Every MBA entrance exam and B-school application in one premium dashboard — live deadlines, application
            fees, programme fees, accepted exams, inside information and official apply links. Start an application and
            we track it for you inside <Link to="/student" className="font-medium text-sky-700 underline-offset-2 hover:underline">My Applications</Link>.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {[
              { label: "Applications tracked", value: stats.total, icon: LayoutDashboard },
              { label: "Currently open", value: stats.open, icon: ShieldCheck },
              { label: "Closing today", value: stats.today, icon: Timer },
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

      {/* Filters */}
      <section aria-label="Filters" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <p className="pb-2 text-sm font-medium text-slate-500">Deadline status</p>
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
                {f.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="relative pt-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search college, institute, exam or programme…"
            aria-label="Search applications"
            className="pl-9"
          />
        </div>
      </section>

      {/* Results */}
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
            <Button
              variant="outline"
              onClick={() => {
                setDeadlineFilter("all");
                setCategory("all");
                setSearch("");
              }}
            >
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">MBA college and exam applications with deadlines and fees</caption>
              <thead className="bg-slate-50 text-left text-sm text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">College / Exam</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Opens</th>
                  <th scope="col" className="px-4 py-3 font-medium">Deadline</th>
                  <th scope="col" className="px-4 py-3 font-medium">Application Fee</th>
                  <th scope="col" className="px-4 py-3 font-medium">Programme Fee</th>
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
                            <p className="truncate font-medium text-slate-900">{row.name}</p>
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
                          <Button size="sm" variant="outline" onClick={() => handleInside(row)} className="gap-1.5">
                            <Info className="h-3.5 w-3.5" /> Inside Info
                          </Button>
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

          {/* Mobile / tablet cards */}
          <div className="grid gap-3 lg:hidden">
            {visible.map((row) => {
              const info = deadlineInfo(row);
              return (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <LogoBadge row={row} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-medium leading-snug text-slate-900">{row.name}</h2>
                      <p className="truncate text-sm text-slate-500">
                        {row.program || row.location || (row.accepted_exams ?? []).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-3">
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                      {CATEGORY_LABEL[row.category] ?? row.category}
                    </Badge>
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
                      <dt className="text-slate-500">Deadline</dt>
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
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handleInside(row)}>
                      <Info className="h-4 w-4" /> Inside Info
                    </Button>
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

      {/* Inside Information */}
      <Dialog open={!!insideRow} onOpenChange={(o) => !o && setInsideRow(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{insideRow?.name} — Inside Information</DialogTitle>
            <DialogDescription>
              Deadlines, fees and admissions notes curated by the MBA Compass team.
            </DialogDescription>
          </DialogHeader>
          {insideRow && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-slate-500">Category</dt>
                  <dd className="text-slate-900">{CATEGORY_LABEL[insideRow.category] ?? insideRow.category}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Programme</dt>
                  <dd className="text-slate-900">{insideRow.program || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Accepted exams</dt>
                  <dd className="text-slate-900">{(insideRow.accepted_exams ?? []).join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Deadline</dt>
                  <dd className="text-slate-900">{formatDate(insideRow.application_deadline)}</dd>
                </div>
              </dl>
              {insideRow.short_description && <p className="text-slate-600">{insideRow.short_description}</p>}
              {insideRow.inside_info_notes && (
                <p className="whitespace-pre-line text-slate-600">{insideRow.inside_info_notes}</p>
              )}
              {insideRow.inside_info_url ? (
                <div className="space-y-3">
                  <Button asChild variant="outline" className="gap-1.5">
                    <a href={insideRow.inside_info_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4" /> Open document <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  {/\.pdf($|\?)/i.test(insideRow.inside_info_url) && (
                    <iframe
                      title={`${insideRow.name} inside information`}
                      src={insideRow.inside_info_url}
                      className="h-[55vh] w-full rounded-xl border border-slate-200"
                    />
                  )}
                </div>
              ) : (
                !insideRow.inside_info_notes && (
                  <p className="text-slate-500">Detailed inside information for this college is being prepared.</p>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
