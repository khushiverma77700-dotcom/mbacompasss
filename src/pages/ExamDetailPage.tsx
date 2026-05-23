import { useMemo } from "react";
import PageKeywords from "@/components/PageKeywords";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead, { generateExamSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import { examDetails } from "@/data/mockData";
import AIGistSection from "@/components/AIGistSection";
import InlineAIToolCTA from "@/components/InlineAIToolCTA";
import DOMPurify from "isomorphic-dompurify";

const stripHtml = (value?: string | null) => (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const htmlToList = (value?: string | null) =>
  stripHtml(value)
    .split(/(?:\n|•|-)/)
    .map((item) => item.trim())
    .filter(Boolean);

const ExamDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const fallbackExam = useMemo(() => examDetails.find((entry) => entry.slug === slug), [slug]);

  const { data: dbExam, isLoading } = useQuery({
    queryKey: ["exam-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const exam = dbExam
    ? {
        id: dbExam.id,
        slug: dbExam.slug,
        name: dbExam.name,
        fullName: dbExam.full_name || dbExam.name,
        description: stripHtml(dbExam.description) || fallbackExam?.description || "",
        rawDescription: dbExam.description || fallbackExam?.description || "",
        conductedBy: dbExam.conducting_body || fallbackExam?.conductedBy || "TBA",
        frequency: dbExam.frequency || fallbackExam?.frequency || "Annual",
        mode: fallbackExam?.mode || "Computer Based Test",
        duration: fallbackExam?.duration || "TBA",
        sections: fallbackExam?.sections || [],
        eligibility: htmlToList(dbExam.eligibility).length ? htmlToList(dbExam.eligibility) : fallbackExam?.eligibility || [],
        previousYearCutoffs: fallbackExam?.previousYearCutoffs || [],
        importantDates: [
          ...(dbExam.registration_deadline ? [{ event: "Registration Deadline", date: dbExam.registration_deadline }] : []),
          ...(dbExam.exam_date ? [{ event: "Exam Date", date: dbExam.exam_date }] : []),
          ...((fallbackExam?.importantDates || []).filter(
            (item) => !["Registration Deadline", "Exam Date"].includes(item.event),
          )),
        ],
        topColleges: fallbackExam?.topColleges || [],
        syllabus: dbExam.syllabus || [],
      }
    : fallbackExam
      ? {
          ...fallbackExam,
          rawDescription: fallbackExam.description,
          syllabus: [],
        }
      : null;

  const baseJsonLd = dbExam
    ? generateExamSchema(dbExam)
    : exam
      ? generateExamSchema({
          name: exam.name,
          full_name: exam.fullName,
          description: exam.description,
          conducting_body: exam.conductedBy,
          exam_date: undefined,
        })
      : undefined;

  const { seo: resolvedSeo } = useResolvedSeo("exam", dbExam?.id, {
    title: exam
      ? `${dbExam?.meta_title || exam.fullName || exam.name} Exam ${new Date().getFullYear()} - Pattern, Syllabus, Dates | MBA Compass`
      : undefined,
    description: dbExam?.meta_description || exam?.description || undefined,
    keywords: (dbExam?.keywords || []) as string[],
    canonical: exam?.slug ? `${window.location.origin}/exam/${exam.slug}` : undefined,
    jsonLd: baseJsonLd,
  });

  if (isLoading && !fallbackExam) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-10 md:py-14">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-52 mb-3 bg-white/20" />
            <Skeleton className="h-10 w-80 bg-white/20" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(2)].map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!exam) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center"><h1 className="font-heading text-2xl font-bold text-foreground mb-4">Exam not found</h1><Link to="/"><Button>Go Home</Button></Link></div>
    </div>
  );

  const { data: relatedInstitutes = [] } = useQuery({
    queryKey: ["exam-related-institutes", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("institutes")
        .select("id, name, slug, city, state, rating, logo_url")
        .order("rating", { ascending: false })
        .limit(4);
      return (data || []).map((inst) => ({
        id: inst.id,
        name: inst.name,
        slug: inst.slug,
        location: `${inst.city || ""}, ${inst.state || ""}`,
        rating: inst.rating || 0,
      }));
    },
    enabled: !!exam,
  });

  const { data: otherExams = [] } = useQuery({
    queryKey: ["other-exams", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("exams")
        .select("id, name, slug")
        .neq("slug", slug!)
        .limit(10);
      return data || [];
    },
    enabled: !!slug,
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead {...resolvedSeo} />
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm"><ArrowLeft className="w-4 h-4" /> Home</Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground border-none">MBA Exam</Badge>
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">{exam.fullName}</h1>
            <p className="text-primary-foreground/70 text-sm">Conducted by {exam.conductedBy} | {exam.frequency}</p>
          </motion.div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6 min-w-0">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <AIGistSection
              content={exam.rawDescription || exam.description || exam.name}
              pageType="exam"
              onScrollToContent={() => document.getElementById("exam-content")?.scrollIntoView({ behavior: "smooth" })}
            />
            <Card id="exam-content">
              <CardHeader><CardTitle className="font-heading">About {exam.name}</CardTitle></CardHeader>
              <CardContent>
                {exam.rawDescription?.includes("<") ? (
                  <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(exam.rawDescription || "") }} />
                ) : (
                  <p className="text-muted-foreground leading-relaxed">{exam.description}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-heading">Exam Pattern</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><div className="text-xs text-muted-foreground">Mode</div><div className="font-semibold text-foreground text-sm">{exam.mode}</div></div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><div className="text-xs text-muted-foreground">Duration</div><div className="font-semibold text-foreground text-sm">{exam.duration}</div></div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><div className="text-xs text-muted-foreground">Total Marks</div><div className="font-semibold text-foreground text-sm">{exam.sections.length > 0 ? exam.sections.reduce((s, sec) => s + sec.marks, 0) : "TBA"}</div></div>
                </div>
                {exam.sections.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50"><th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Section</th><th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Questions</th><th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Marks</th></tr></thead>
                    <tbody>{exam.sections.map((sec) => <tr key={sec.name} className="border-b border-border"><td className="py-3 px-3 text-foreground">{sec.name}</td><td className="py-3 px-3 text-right text-muted-foreground">{sec.questions}</td><td className="py-3 px-3 text-right font-semibold text-primary">{sec.marks}</td></tr>)}</tbody>
                  </table>
                ) : exam.syllabus.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {exam.syllabus.map((topic: string) => (
                      <Badge key={topic} variant="secondary" className="text-xs">{topic}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Detailed section-wise pattern will be updated soon.</p>
                )}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-heading">Eligibility</CardTitle></CardHeader><CardContent><div className="space-y-2">{exam.eligibility.length > 0 ? exam.eligibility.map((e, i) => <div key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span className="text-muted-foreground">{e}</span></div>) : <p className="text-sm text-muted-foreground">Eligibility details will be updated soon.</p>}</div></CardContent></Card>
            {exam.previousYearCutoffs.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Previous Year Cutoffs</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm"><thead><tr className="bg-muted/50"><th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">College</th><th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Cutoff</th></tr></thead>
                  <tbody>{exam.previousYearCutoffs.map((c) => <tr key={c.college} className="border-b border-border"><td className="py-3 px-3 text-foreground">{c.college}</td><td className="py-3 px-3 text-right font-semibold text-primary">{c.cutoff}</td></tr>)}</tbody></table>
                </CardContent>
              </Card>
            )}
            <InlineAIToolCTA variant="college-finder" />
            {relatedInstitutes.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Best Coaching for {exam.name}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {relatedInstitutes.slice(0, 4).map((inst) => (
                      <Link key={inst.id} to={`/institute/${inst.slug}`} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                        <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">{inst.name.charAt(0)}</div>
                        <div className="min-w-0"><h4 className="font-semibold text-foreground text-sm line-clamp-1">{inst.name}</h4><p className="text-xs text-muted-foreground">{inst.location} · {inst.rating} ★</p></div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="font-heading text-base">Important Dates</CardTitle></CardHeader><CardContent><div className="space-y-3">{exam.importantDates.map((d, i) => <div key={i} className="flex items-start gap-3"><Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><div><div className="text-sm font-medium text-foreground">{d.event}</div><div className="text-xs text-muted-foreground">{d.date}</div></div></div>)}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="font-heading text-base">Top Colleges Accepting {exam.name}</CardTitle></CardHeader><CardContent><div className="space-y-2">{exam.topColleges.map((col, i) => <div key={i} className="flex items-center gap-2 text-sm"><span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">{i + 1}</span><span className="text-foreground">{col}</span></div>)}</div><Link to="/colleges"><Button variant="outline" size="sm" className="w-full mt-4 gap-1">View All Colleges <ArrowRight className="w-3.5 h-3.5" /></Button></Link></CardContent></Card>
            <Card><CardHeader><CardTitle className="font-heading text-base">Other MBA Exams</CardTitle></CardHeader><CardContent><div className="space-y-2">{(otherExams.length > 0 ? otherExams : examDetails.filter((e) => e.slug !== slug)).map((e) => <Link key={e.id} to={`/exam/${e.slug}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"><span className="text-sm font-medium text-foreground">{e.name}</span><ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /></Link>)}</div></CardContent></Card>
          </div>
      </div>
      {dbExam?.id && <PageKeywords contentType="exam" recordId={dbExam.id} fallbackKeywords={dbExam.keywords || []} />}
    </div>
    </div>
  );
};

export default ExamDetailPage;
