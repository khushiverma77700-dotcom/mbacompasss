import { useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { openLoginDialog } from "@/hooks/useCtaGate";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowUpRight, ExternalLink, FileText, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ExpenseBreakdownView from "@/components/application/ExpenseBreakdown";
import { buildExpenseBreakdown } from "@/lib/applicationExpenses";
import {
  CATEGORY_LABEL,
  type TrackerRow,
  deadlineInfo,
  formatDate,
  formatFee,
  publicTrackersQuery,
  startTrackedApplication,
  trackerBySlugQuery,
  trackTrackerView,
} from "@/lib/applicationTracker";
import {
  APPLICATION_BASE,
  APPLICATION_YEAR,
  collegeFaqs,
  collegeKeywords,
  collegePageMeta,
  collegeSchema,
  collegeUrl,
  faqSchema,
} from "@/lib/applicationSeo";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd className="pt-0.5 text-base font-medium text-slate-900">{value}</dd>
  </div>
);

export default function ApplicationDetailPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { data: row, isLoading } = useQuery(trackerBySlugQuery(slug));
  const { data: all } = useQuery(publicTrackersQuery);
  const [applying, setApplying] = useState(false);

  const related = useMemo(() => {
    if (!row) return [] as TrackerRow[];
    return (all ?? [])
      .filter((r) => r.id !== row.id && r.category === row.category)
      .slice(0, 6);
  }, [all, row]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <h1 className="text-[1.375rem] font-semibold text-slate-900">Application not found</h1>
            <p className="text-sm text-slate-600">
              This application is no longer listed. Browse every open MBA application form instead.
            </p>
            <Button asChild>
              <Link to={APPLICATION_BASE}>View all MBA applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = collegePageMeta(row);
  const info = deadlineInfo(row);
  const faqs = collegeFaqs(row);
  const keywords = collegeKeywords(row);
  const isExam = row.category === "exam";
  const expenseBreakdown = buildExpenseBreakdown(row);

  const handleApply = async () => {
    if (!row.apply_url) {
      toast({ title: "Application link coming soon", description: `${row.name} has not published its form yet.` });
      return;
    }
    if (!user) {
      openLoginDialog(`Sign in to track your ${row.name} application and get deadline reminders.`);
      return;
    }
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");
    setApplying(true);
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
      setApplying(false);
    }
  };

  const openInside = () => void trackTrackerView(row, user ?? null, "inside_info");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20 md:p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collegeSchema(row)) }} />
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
      )}
      <SiteBreadcrumbs
        items={[
          { name: `MBA College & Exam Application ${APPLICATION_YEAR}`, url: APPLICATION_BASE },
          { name: row.name, url: collegeUrl(row) },
        ]}
      />

      <header className="space-y-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-blue-50/60 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-sky-200 bg-white/80 text-sky-700">
            {CATEGORY_LABEL[row.category] ?? row.category}
          </Badge>
          {row.is_recommended && (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              {row.recommendation_label || "Recommended by MBA Compass"}
            </Badge>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700">
            <Timer className="h-3.5 w-3.5" /> {info.label}
          </span>
        </div>
        <div className="flex items-start gap-4">
          {row.logo_url && (
            <img
              src={row.logo_url}
              alt={row.seo_image_alt || `${row.name} logo — MBA application form ${APPLICATION_YEAR}`}
              loading="lazy"
              decoding="async"
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-2xl border border-sky-100 bg-white object-contain p-1.5"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">{meta.h1}</h1>
            <p className="pt-1 text-sm text-slate-500">
              {[row.program, row.location, row.tier].filter(Boolean).join(" • ") || row.name}
            </p>
          </div>
        </div>
        <p className="max-w-3xl text-base text-slate-600">{row.seo_intro?.trim() || meta.description}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="gap-1.5" disabled={applying || !info.isOpen} onClick={() => void handleApply()}>
            {info.isOpen ? "Apply Now" : "Applications Closed"}
            {info.isOpen && <ArrowUpRight className="h-4 w-4" />}
          </Button>
          {row.college_website && (
            <Button asChild size="lg" variant="outline" className="gap-1.5">
              <a href={row.college_website} target="_blank" rel="noopener noreferrer">
                Official website <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </header>

      <section aria-label={`${row.name} application dates and fees`}>
        <h2 className="pb-3 text-[1.375rem] font-semibold text-slate-900">
          {row.name} application dates, fees &amp; {isExam ? "registration" : "admission"} details
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Fact label="Application opens" value={formatDate(row.application_open_date)} />
          <Fact label="Application last date" value={formatDate(row.application_deadline)} />
          <Fact label="Application fee" value={formatFee(row.application_fee)} />
          <Fact label={isExam ? "Exam fee / programme fee" : "Programme fee"} value={formatFee(row.program_fee)} />
          {row.average_package !== null && <Fact label="Average package" value={formatFee(row.average_package)} />}
          {row.median_package !== null && <Fact label="Median package" value={formatFee(row.median_package)} />}
          {row.highest_package !== null && <Fact label="Highest package" value={formatFee(row.highest_package)} />}
          {(row.accepted_exams ?? []).length > 0 && (
            <Fact label="Accepted exams" value={(row.accepted_exams ?? []).join(", ")} />
          )}
        </dl>
      </section>

      <section
        aria-label={`${row.name} detailed application and programme expenses`}
        className="space-y-3"
      >
        <div>
          <h2 className="text-[1.375rem] font-semibold text-slate-900">
            {row.name} complete expense breakdown
          </h2>
          <p className="pt-1 text-sm text-slate-600">
            Plan beyond the form fee with application, programme, living and financing costs shown separately.
          </p>
        </div>
        <ExpenseBreakdownView name={row.name} breakdown={expenseBreakdown} />
      </section>

      {(row.eligibility || row.selection_process || row.cutoff_note || row.recommendation_note) && (
        <section aria-label={`${row.name} eligibility, cutoff and selection process`} className="space-y-3">
          {row.eligibility && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{row.name} eligibility criteria</h3>
              <p className="pt-1 text-sm text-slate-600">{row.eligibility}</p>
            </article>
          )}
          {row.cutoff_note && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{row.name} cutoff</h3>
              <p className="pt-1 text-sm text-slate-600">{row.cutoff_note}</p>
            </article>
          )}
          {row.selection_process && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{row.name} selection process</h3>
              <p className="pt-1 text-sm text-slate-600">{row.selection_process}</p>
            </article>
          )}
          {row.recommendation_note && (
            <article className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <h3 className="text-base font-semibold text-slate-900">Why our team recommends applying</h3>
              <p className="pt-1 text-sm text-slate-700">{row.recommendation_note}</p>
            </article>
          )}
        </section>
      )}

      {(row.inside_info_notes || row.inside_info_url) && (
        <section aria-label={`${row.name} inside information`} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5">
          <h2 className="text-[1.375rem] font-semibold text-slate-900">Inside Information — {row.name}</h2>
          {row.inside_info_notes && (
            <p className="whitespace-pre-line pt-2 text-sm text-slate-700">{row.inside_info_notes}</p>
          )}
          {row.inside_info_url && (
            <div className="space-y-3 pt-3">
              <Button asChild variant="outline" className="gap-1.5" onClick={openInside}>
                <a href={row.inside_info_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" /> Open document <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              {/\.pdf($|\?)/i.test(row.inside_info_url) && (
                <iframe
                  title={`${row.name} inside information document`}
                  src={row.inside_info_url}
                  loading="lazy"
                  className="h-[55vh] w-full rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          )}
        </section>
      )}

      {faqs.length > 0 && (
        <section aria-label={`${row.name} application FAQs`} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[1.375rem] font-semibold text-slate-900">{row.name} application FAQs</h2>
          <Accordion type="single" collapsible className="pt-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.question} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      <section aria-label="Related searches" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[1.375rem] font-semibold text-slate-900">What students look for</h2>
        <ul className="flex flex-wrap gap-2 pt-3">
          {keywords.map((k) => (
            <li key={k} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
              {k}
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section aria-label="Other applications in this category" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[1.375rem] font-semibold text-slate-900">
            Other {CATEGORY_LABEL[row.category] ?? "MBA"} application forms {APPLICATION_YEAR}
          </h2>
          <div className="grid gap-2 pt-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.id}
                to={collegeUrl(r)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
              >
                {r.name} application form — last date {formatDate(r.application_deadline)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
