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
import { ArrowUpRight, ExternalLink, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ApplicationCountdown from "@/components/application/ApplicationCountdown";
import ApplicationInformation from "@/components/application/ApplicationInformation";
import {
  CATEGORY_LABEL,
  type TrackerRow,
  deadlineInfo,
  formatDate,
  formatFee,
  rowPrograms,
  publicTrackersQuery,
  startTrackedApplication,
  trackerBySlugQuery,
  trackTrackerView,
} from "@/lib/applicationTracker";
import {
  APPLICATION_BASE,
  APPLICATION_YEAR,
  collegeFaqs,
  collegePageMeta,
  collegeSchema,
  collegeUrl,
  faqSchema,
} from "@/lib/applicationSeo";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-application-line bg-application-panel p-3">
    <dt className="text-sm text-application-copy">{label}</dt>
    <dd className="pt-0.5 text-base font-medium text-application-ink">{value}</dd>
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
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <h1 className="text-xl font-semibold text-application-ink">Application not found</h1>
            <p className="text-sm text-application-copy">
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
  const isExam = row.category === "exam";

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


  return (
    <div className="application-directory mx-auto max-w-5xl space-y-8 p-4 pb-20 md:p-6">
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

      <header className="space-y-5 border-b border-application-line pb-8 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-application-line bg-application-panel/80 text-application-blue">
            {CATEGORY_LABEL[row.category] ?? row.category}
          </Badge>
          {row.is_recommended && (
            <Badge variant="outline" className="border-application-warning/20 bg-application-warning-soft text-application-warning">
              {row.recommendation_label || "Recommended by MBA Compass"}
            </Badge>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-application-line bg-application-panel px-2.5 py-1 text-sm text-application-copy">
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
              className="h-16 w-16 shrink-0 rounded-lg border border-application-line bg-application-panel object-contain p-1.5"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight text-application-ink md:text-4xl">{meta.h1}</h1>
            <p className="pt-1 text-sm text-application-copy">
              {[rowPrograms(row).join(" / "), row.tier].filter(Boolean).join(" • ") || row.name}
            </p>
          </div>
        </div>
        <p className="max-w-3xl text-base text-application-copy">{row.seo_intro?.trim() || meta.description}</p>
        <div className="max-w-md"><ApplicationCountdown row={row} /></div>
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
        <h2 className="pb-3 text-xl font-semibold text-application-ink">
          {row.name} application dates, fees &amp; {isExam ? "registration" : "admission"} details
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Fact label="Program" value={rowPrograms(row).join(", ") || "—"} />
          {!isExam && <Fact label="Tier" value={row.tier || "—"} />}
          <Fact label="Program fees" value={formatFee(row.program_fee)} />
          <Fact label="Application fees" value={formatFee(row.application_fee)} />
          <Fact label="Application deadline" value={formatDate(row.application_deadline)} />
          {(row.accepted_exams ?? []).length > 0 && (
            <Fact label="Exams accepted" value={(row.accepted_exams ?? []).join(", ")} />
          )}
        </dl>
      </section>

      <section aria-label={`${row.name} application information`} className="border-t border-application-line pt-6">
        <h2 className="pb-5 text-xl font-semibold text-application-ink">{isExam ? "Exam information & registration" : "College highlights & admission details"}</h2>
        <ApplicationInformation row={row} />
      </section>

      {faqs.length > 0 && (
        <section aria-label={`${row.name} application FAQs`} className="border-t border-application-line pt-6">
          <h2 className="text-xl font-semibold text-application-ink">{row.name} application FAQs</h2>
          <Accordion type="single" collapsible className="pt-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.question} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-application-copy">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {related.length > 0 && (
        <section aria-label="Other applications in this category" className="border-t border-application-line pt-6">
          <h2 className="text-xl font-semibold text-application-ink">
            Other {CATEGORY_LABEL[row.category] ?? "MBA"} application forms {APPLICATION_YEAR}
          </h2>
          <div className="grid gap-2 pt-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.id}
                to={collegeUrl(r)}
                className="rounded-lg border border-application-line px-4 py-3 text-sm text-application-copy hover:border-application-line hover:bg-application-blue-soft"
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
