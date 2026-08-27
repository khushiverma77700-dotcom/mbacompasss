import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import SEOHead, { generateExamSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import { canonicalUrl } from "@/lib/canonical";
import { examDetails } from "@/data/mockData";
import AIGistSection from "@/components/AIGistSection";
import PageKeywords from "@/components/PageKeywords";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import NotFound from "@/pages/NotFound";
import {
  BulletList, CollegeModule, ComparisonBlocks, DataTable, DatesTable, FactList,
  FaqAccordion, HighlightCards, PreparationBlocks, QuickAnswerBox, ResourceLinks,
  RichHtml, Section, SourcesBox, StepFlow, SyllabusAccordion, ToolLinks, UpdatesList,
} from "@/components/exam/ExamModules";
import {
  cleanValue, hasModuleContent, parseSections, tableHasRows,
  type ExamSections, type ExamSource,
} from "@/lib/examSections";

const stripHtml = (value?: string | null) =>
  (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const htmlToList = (value?: string | null) =>
  stripHtml(value).split(/(?:\n|•|·)/).map((v) => v.trim()).filter(Boolean);

/** Legacy exams (created before the AI template) still render through the same
 *  modular template — we synthesise the modules we can from the old columns. */
function synthesiseSections(row: any, fallback?: any): ExamSections {
  const dates = [
    ...(cleanValue(row?.registration_deadline) ? [{ event: "Registration Ends", date: row.registration_deadline }] : []),
    ...(cleanValue(row?.exam_date) ? [{ event: "Examination", date: row.exam_date }] : []),
    ...((fallback?.importantDates || []).map((d: any) => ({ event: d.event, date: d.date }))),
  ];
  return {
    hero: {
      full_form: row?.full_name || fallback?.fullName,
      conducting_body: row?.conducting_body || fallback?.conductedBy,
      frequency: row?.frequency || fallback?.frequency,
      exam_mode: row?.exam_mode || fallback?.mode,
      duration: row?.duration || fallback?.duration,
      exam_level: row?.exam_level,
      exam_category: row?.exam_category,
      official_website: row?.official_website,
      exam_status: row?.exam_status,
      registration_status: row?.registration_status,
    },
    highlights: [
      { label: "Conducting Body", value: row?.conducting_body || fallback?.conductedBy },
      { label: "Exam Mode", value: row?.exam_mode || fallback?.mode },
      { label: "Frequency", value: row?.frequency || fallback?.frequency },
      { label: "Duration", value: row?.duration || fallback?.duration },
    ].filter((h) => cleanValue(h.value)),
    dates,
    overview: row?.description || fallback?.description,
    eligibility: {
      summary: row?.eligibility,
      criteria: (fallback?.eligibility || htmlToList(row?.eligibility)).map((v: string) => ({ label: "Criteria", value: v })),
    },
    pattern: (fallback?.sections || []).length
      ? {
          columns: ["Section", "Questions", "Marks"],
          rows: fallback.sections.map((s: any) => [s.name, String(s.questions ?? ""), String(s.marks ?? "")]),
        }
      : undefined,
    syllabus: Array.isArray(row?.syllabus) && row.syllabus.length
      ? [{ subject: "Syllabus", topics: row.syllabus.map((t: string) => ({ name: t })) }]
      : undefined,
    cutoffs: (fallback?.previousYearCutoffs || []).length
      ? { columns: ["Institution", "Previous Cutoff"], rows: fallback.previousYearCutoffs.map((c: any) => [c.college, c.cutoff]) }
      : undefined,
    faqs: Array.isArray(row?.faqs) ? row.faqs.map((f: any) => ({ q: f.question || f.q, a: f.answer || f.a })) : undefined,
  };
}

const ExamDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const fallbackExam = useMemo(() => examDetails.find((entry) => entry.slug === slug), [slug]);

  const { data: dbExam, isLoading } = useQuery({
    queryKey: ["exam-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  const { data: otherExams = [] } = useQuery({
    queryKey: ["other-exams", slug],
    queryFn: async () => {
      const { data } = await supabase.from("exams").select("id, name, slug, full_name").neq("slug", slug!).limit(8);
      return data || [];
    },
    enabled: !!slug,
  });

  const sections: ExamSections = useMemo(() => {
    const stored = parseSections(dbExam?.sections);
    if (Object.keys(stored).length) return stored;
    if (dbExam || fallbackExam) return synthesiseSections(dbExam, fallbackExam);
    return {};
  }, [dbExam, fallbackExam]);

  const examName = dbExam?.name || fallbackExam?.name || "";
  const year = dbExam?.exam_year || null;
  const titleLabel = `${examName}${year ? ` ${year}` : ""}`;
  const hero = sections.hero || {};
  const sources = (Array.isArray(dbExam?.sources) ? dbExam!.sources : []) as ExamSource[];
  const lastUpdated = dbExam?.updated_at
    ? new Date(dbExam.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const seoTitle = dbExam?.meta_title
    || sections.seo?.meta_title
    || (examName ? `${titleLabel}: Dates, Syllabus, Pattern, Eligibility & Cutoff` : undefined);
  const seoDescription = dbExam?.meta_description
    || sections.seo?.meta_description
    || (examName
      ? `Get complete ${titleLabel} details including exam dates, eligibility, registration, syllabus, pattern, preparation, results, cutoff and participating institutions.`
      : undefined);

  const faqItems = (sections.faqs || []).filter((f) => cleanValue(f.q) && cleanValue(f.a));
  const jsonLd = useMemo(() => {
    const base = dbExam ? generateExamSchema(dbExam) : undefined;
    const graph: any[] = base ? (Array.isArray(base) ? base : [base]) : [];
    if (faqItems.length) {
      graph.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.slice(0, 30).map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      });
    }
    return graph.length === 1 ? graph[0] : graph.length ? graph : undefined;
  }, [dbExam, faqItems]);

  const { seo: resolvedSeo } = useResolvedSeo("exam", dbExam?.id, {
    title: seoTitle,
    description: seoDescription,
    keywords: (dbExam?.keywords || sections.seo?.keywords || []) as string[],
    canonical: slug ? canonicalUrl(`/exam/${slug}`) : undefined,
    jsonLd,
  });

  if (isLoading && !fallbackExam) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-24 w-full rounded-xl" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!dbExam && !fallbackExam) return <NotFound />;

  const metaRow = [
    hero.conducting_body && { label: "Conducting body", value: hero.conducting_body },
    hero.exam_level && { label: "Level", value: hero.exam_level },
    hero.exam_mode && { label: "Mode", value: hero.exam_mode },
    hero.frequency && { label: "Frequency", value: hero.frequency },
    hero.duration && { label: "Duration", value: hero.duration },
  ].filter(Boolean) as { label: string; value: string }[];

  const toc = [
    hasModuleContent(sections.quick_answer) && { id: "quick-answer", label: "At a glance" },
    hasModuleContent(sections.dates) && { id: "dates", label: "Important dates" },
    hasModuleContent(sections.overview) && { id: "overview", label: "Overview" },
    hasModuleContent(sections.eligibility) && { id: "eligibility", label: "Eligibility" },
    hasModuleContent(sections.registration) && { id: "registration", label: "Registration" },
    hasModuleContent(sections.fees) && { id: "fees", label: "Application fee" },
    tableHasRows(sections.pattern) && { id: "pattern", label: "Exam pattern" },
    hasModuleContent(sections.marking) && { id: "marking", label: "Marking scheme" },
    hasModuleContent(sections.syllabus) && { id: "syllabus", label: "Syllabus" },
    hasModuleContent(sections.papers) && { id: "papers", label: "Previous papers" },
    hasModuleContent(sections.preparation) && { id: "preparation", label: "Preparation" },
    tableHasRows(sections.cutoffs) && { id: "cutoffs", label: "Cutoffs" },
    hasModuleContent(sections.colleges) && { id: "colleges", label: "Colleges" },
    hasModuleContent(sections.counselling) && { id: "counselling", label: "Admission" },
    hasModuleContent(sections.admit_card) && { id: "admit-card", label: "Admit card" },
    hasModuleContent(sections.result) && { id: "result", label: "Result" },
    faqItems.length > 0 && { id: "faqs", label: "FAQs" },
  ].filter(Boolean) as { id: string; label: string }[];

  const colleges = sections.colleges || [];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEOHead {...resolvedSeo} />

      {/* HERO */}
      <header className="border-b border-border bg-gradient-to-b from-primary/[0.06] to-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              {dbExam?.logo_url && (
                <img src={dbExam.logo_url} alt={`${examName} official logo`} loading="lazy"
                  className="h-12 w-12 rounded-lg object-contain bg-card border border-border p-1" />
              )}
              <div className="flex flex-wrap gap-2">
                {cleanValue(hero.exam_category) && <Badge variant="secondary" className="text-[11px]">{hero.exam_category}</Badge>}
                {cleanValue(hero.exam_status) && <Badge className="text-[11px]">{hero.exam_status}</Badge>}
                {cleanValue(hero.registration_status) && <Badge variant="outline" className="text-[11px]">{hero.registration_status}</Badge>}
              </div>
            </div>
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground">{titleLabel}</h1>
            {cleanValue(hero.full_form) && hero.full_form !== examName && (
              <p className="text-sm md:text-base text-muted-foreground mt-1">{hero.full_form}</p>
            )}
            <p className="text-sm md:text-base text-muted-foreground mt-3">
              {cleanValue(hero.tagline) || `A complete guide to ${titleLabel} — dates, eligibility, registration, syllabus, exam pattern, preparation, previous papers, results, cutoffs and participating institutes.`}
            </p>

            <div className="flex flex-wrap gap-2 mt-5">
              {hasModuleContent(sections.dates) && (
                <Button asChild size="sm"><a href="#dates" className="gap-1.5"><CalendarDays className="w-4 h-4" /> Check important dates</a></Button>
              )}
              {hasModuleContent(sections.syllabus) && (
                <Button asChild size="sm" variant="outline"><a href="#syllabus" className="gap-1.5"><FileText className="w-4 h-4" /> View syllabus</a></Button>
              )}
              {cleanValue(hero.official_website) && (
                <Button asChild size="sm" variant="ghost">
                  <a href={hero.official_website} target="_blank" rel="noreferrer nofollow" className="gap-1.5">
                    Official website <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              )}
            </div>

            {metaRow.length > 0 && (
              <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-xs">
                {metaRow.map((m) => (
                  <div key={m.label}>
                    <dt className="text-muted-foreground">{m.label}</dt>
                    <dd className="font-semibold text-foreground">{m.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {lastUpdated && <p className="text-xs text-muted-foreground mt-4">Last updated: {lastUpdated}</p>}
          </motion.div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <SiteBreadcrumbs
          items={[{ name: "MBA Exams", url: "/colleges" }, { name: titleLabel, url: `/exam/${slug || ""}` }]}
          className="mb-6"
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-8 min-w-0">
          <main className="space-y-10 min-w-0">
            {hasModuleContent(sections.quick_answer) && (
              <div id="quick-answer" className="scroll-mt-24">
                <QuickAnswerBox items={sections.quick_answer!} title={`${titleLabel} at a glance`} />
              </div>
            )}

            {hasModuleContent(sections.highlights) && (
              <Section id="highlights" title={`${examName} highlights`}>
                <HighlightCards items={sections.highlights!} />
              </Section>
            )}

            {hasModuleContent(sections.dates) && (
              <Section id="dates" title={`${titleLabel} important dates`}>
                <DatesTable rows={sections.dates!} />
              </Section>
            )}

            {hasModuleContent(sections.overview) && (
              <Section id="overview" title={`What is ${examName}?`}>
                <AIGistSection content={sections.overview!} pageType="exam" />
                <div className="mt-4"><RichHtml html={sections.overview} /></div>
              </Section>
            )}

            {colleges.length > 0 && (
              <CollegeModule
                title={`Top institutions accepting ${examName}`}
                colleges={colleges.slice(0, 10)}
                description={`Institutes that use the ${examName} score for admission.`}
              />
            )}

            {hasModuleContent(sections.eligibility) && (
              <Section id="eligibility" title={`${examName} eligibility criteria`}>
                <RichHtml html={sections.eligibility?.summary} className="mb-4" />
                <FactList items={sections.eligibility?.criteria || []} />
                {!!sections.eligibility?.can_i_apply?.length && (
                  <div className="mt-5">
                    <h3 className="font-heading text-base font-bold text-foreground mb-2">Can I apply?</h3>
                    <FaqAccordion items={sections.eligibility!.can_i_apply!} />
                  </div>
                )}
              </Section>
            )}

            {hasModuleContent(sections.registration) && (
              <Section id="registration" title={`${examName} registration & application`}>
                <StepFlow steps={sections.registration?.steps || []} />
                <RichHtml html={sections.registration?.notes} className="mt-4" />
                {!!sections.registration?.documents?.length && (
                  <div className="mt-4">
                    <h3 className="font-heading text-base font-bold text-foreground mb-2">Documents required</h3>
                    <BulletList items={sections.registration!.documents} />
                  </div>
                )}
              </Section>
            )}

            {hasModuleContent(sections.fees) && (
              <Section id="fees" title={`${examName} application fee`}>
                <DataTable block={{
                  columns: ["Category", "Application fee"],
                  rows: (sections.fees || []).map((f) => [f.category || "", f.fee || ""]),
                }} />
              </Section>
            )}

            {tableHasRows(sections.pattern) && (
              <Section id="pattern" title={`${examName} exam pattern`}>
                <DataTable block={sections.pattern} />
              </Section>
            )}

            {hasModuleContent(sections.marking) && (
              <Section id="marking" title={`${examName} marking scheme`}>
                <FactList items={sections.marking!} />
              </Section>
            )}

            {hasModuleContent(sections.syllabus) && (
              <Section id="syllabus" title={`${examName} syllabus`}>
                <SyllabusAccordion subjects={sections.syllabus!} />
              </Section>
            )}

            {hasModuleContent(sections.resources) && (
              <Section id="resources" title="Official downloads & resources">
                <ResourceLinks items={sections.resources!} />
              </Section>
            )}

            {hasModuleContent(sections.papers) && (
              <Section id="papers" title={`${examName} previous year papers`}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(sections.papers || []).filter((p) => cleanValue(p.year) || cleanValue(p.paper_url)).map((p, i) => (
                    <Card key={i}><CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{cleanValue(p.year) || "Question paper"}</p>
                        {cleanValue(p.difficulty) && <Badge variant="secondary" className="text-[11px]">{p.difficulty}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {cleanValue(p.paper_url) && (
                          <a href={p.paper_url} target="_blank" rel="noreferrer nofollow" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            Question paper <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {cleanValue(p.solutions_url) && (
                          <a href={p.solutions_url} target="_blank" rel="noreferrer nofollow" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            Solutions <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              </Section>
            )}

            {tableHasRows(sections.difficulty) && (
              <Section id="difficulty" title={`${examName} difficulty analysis`}>
                <DataTable block={sections.difficulty} />
              </Section>
            )}

            {hasModuleContent(sections.preparation) && (
              <Section id="preparation" title={`How to prepare for ${examName}`}>
                <PreparationBlocks items={sections.preparation!} />
              </Section>
            )}

            {hasModuleContent(sections.tools) && (
              <Section id="tools" title="Score, percentile & college prediction tools">
                <ToolLinks items={sections.tools!} />
              </Section>
            )}

            {tableHasRows(sections.cutoffs) && (
              <Section id="cutoffs" title={`${titleLabel} cutoffs`}>
                <DataTable block={sections.cutoffs} />
              </Section>
            )}

            {colleges.length > 4 && (
              <div id="colleges" className="scroll-mt-24">
                <CollegeModule
                  title={`Institutions you can target at different ${examName} scores`}
                  colleges={colleges}
                  description="Use the shortlister to map your expected score to safe, target and reach institutes."
                />
              </div>
            )}

            {hasModuleContent(sections.comparisons) && (
              <Section id="comparisons" title="Compare institutions">
                <ComparisonBlocks items={sections.comparisons!} />
              </Section>
            )}

            {hasModuleContent(sections.counselling) && (
              <Section id="counselling" title={`${examName} admission & counselling process`}>
                <StepFlow steps={sections.counselling?.steps || []} />
                <RichHtml html={sections.counselling?.notes} className="mt-4" />
              </Section>
            )}

            {hasModuleContent(sections.admit_card) && (
              <Section id="admit-card" title={`${examName} admit card`}>
                <RichHtml html={sections.admit_card} />
              </Section>
            )}

            {hasModuleContent(sections.exam_day) && (
              <Section id="exam-day" title="Exam day guidelines">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { title: "Before the exam", items: sections.exam_day?.before },
                    { title: "At the centre", items: sections.exam_day?.at_centre },
                    { title: "Not allowed", items: sections.exam_day?.not_allowed },
                  ].filter((b) => (b.items || []).length).map((block) => (
                    <Card key={block.title}><CardContent className="p-4">
                      <h3 className="font-heading text-sm font-bold text-foreground mb-2">{block.title}</h3>
                      <BulletList items={block.items} />
                    </CardContent></Card>
                  ))}
                </div>
              </Section>
            )}

            {hasModuleContent(sections.centres) && (
              <Section id="centres" title={`${examName} exam centres`}>
                <DataTable block={{
                  columns: ["City", "State", "Availability"],
                  rows: (sections.centres || []).map((c) => [c.city || "", c.state || "", c.availability || ""]),
                }} />
              </Section>
            )}

            {hasModuleContent(sections.result) && (
              <Section id="result" title={`${titleLabel} result`}>
                <RichHtml html={sections.result?.html} />
                {cleanValue(sections.result?.link) && (
                  <Button asChild className="mt-4">
                    <a href={sections.result!.link} target="_blank" rel="noreferrer nofollow" className="gap-1.5">
                      Check your result <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
              </Section>
            )}

            {hasModuleContent(sections.after_exam) && (
              <Section id="after-exam" title={`What after ${examName}?`}>
                <RichHtml html={sections.after_exam} />
              </Section>
            )}

            {hasModuleContent(sections.updates) && (
              <Section id="updates" title={`Latest ${examName} updates`}>
                <UpdatesList items={sections.updates!} />
              </Section>
            )}

            {faqItems.length > 0 && (
              <Section id="faqs" title={`${titleLabel} FAQs`}>
                <FaqAccordion items={faqItems} />
              </Section>
            )}

            {hasModuleContent(sections.related_searches) && (
              <Section id="related-searches" title="Students also search">
                <div className="flex flex-wrap gap-2">
                  {sections.related_searches!.filter((s) => cleanValue(s)).map((term, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">{term}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {(hasModuleContent(sections.related_exams) || otherExams.length > 0) && (
              <Section id="related-exams" title="Explore related exams">
                <div className="grid gap-3 sm:grid-cols-2">
                  {otherExams.map((e: any) => (
                    <Link key={e.id} to={`/exam/${e.slug}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{e.name}</p>
                        {e.full_name && <p className="text-xs text-muted-foreground truncate">{e.full_name}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
                {hasModuleContent(sections.related_exams) && (
                  <ul className="mt-4 space-y-1.5">
                    {sections.related_exams!.filter((r) => cleanValue(r.name)).map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{r.name}</span>{cleanValue(r.why) ? ` — ${r.why}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            <SourcesBox sources={sources} reviewedBy={dbExam?.reviewed_by} lastUpdated={lastUpdated} />

            {dbExam?.id && <PageKeywords contentType="exam" recordId={dbExam.id} fallbackKeywords={dbExam.keywords || []} />}
          </main>

          {/* STICKY SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <ExamTocCard items={toc} />
              <ExamPlannerCard />
            </div>
          </aside>

        </div>
      </div>

      {/* MOBILE STICKY CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex gap-2">
        <Button asChild size="sm" className="flex-1"><Link to="/college-shortlister">Shortlist colleges</Link></Button>
        <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/mocks">Take a mock</Link></Button>
      </div>
    </div>
  );
};

export default ExamDetailPage;
