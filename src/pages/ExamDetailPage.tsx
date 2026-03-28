import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, FileText, ExternalLink, GraduationCap, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { examDetails, institutes } from "@/data/mockData";

const ExamDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const exam = examDetails.find((e) => e.slug === slug);

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Exam not found</h1>
          <Link to="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const totalQuestions = exam.sections.reduce((a, s) => a + s.questions, 0);
  const totalMarks = exam.sections.reduce((a, s) => a + s.marks, 0);

  // Find related coaching institutes
  const examSlugMap: Record<string, string[]> = {
    "cat-exam": ["cat"],
    "xat-exam": ["xat-snap"],
    "gmat-exam": ["gmat"],
    "snap-exam": ["xat-snap"],
    "mat-exam": ["mat-cmat"],
  };
  const relatedCategories = examSlugMap[exam.slug] || [];
  const relatedInstitutes = institutes.filter((i) => relatedCategories.includes(i.category)).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10 md:py-12">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground border-none">MBA Entrance Exam</Badge>
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
              {exam.fullName} ({exam.name})
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-primary-foreground/80 text-sm">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {exam.conductedBy}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {exam.frequency}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {exam.duration}</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader><CardTitle className="font-heading">About {exam.name}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{exam.description}</p>
              </CardContent>
            </Card>

            {/* Exam Pattern */}
            <Card>
              <CardHeader><CardTitle className="font-heading">Exam Pattern</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Section</th>
                        <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Questions</th>
                        <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.sections.map((section) => (
                        <tr key={section.name} className="border-b border-border">
                          <td className="py-3 px-3 text-foreground">{section.name}</td>
                          <td className="py-3 px-3 text-right text-muted-foreground">{section.questions}</td>
                          <td className="py-3 px-3 text-right font-semibold text-primary">{section.marks}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="py-3 px-3 text-foreground">Total</td>
                        <td className="py-3 px-3 text-right text-foreground">{totalQuestions}</td>
                        <td className="py-3 px-3 text-right text-primary">{totalMarks}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" /> Mode: {exam.mode}</Badge>
                  <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Duration: {exam.duration}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Eligibility */}
            <Card>
              <CardHeader><CardTitle className="font-heading">Eligibility Criteria</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {exam.eligibility.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Cutoffs */}
            {exam.previousYearCutoffs.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Previous Year Cutoffs</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">College</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Cutoff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.previousYearCutoffs.map((c) => (
                          <tr key={c.college} className="border-b border-border">
                            <td className="py-3 px-3 text-foreground">{c.college}</td>
                            <td className="py-3 px-3 text-right font-semibold text-primary">{c.cutoff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Coaching */}
            {relatedInstitutes.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Best Coaching for {exam.name}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {relatedInstitutes.map((inst) => (
                      <Link
                        key={inst.id}
                        to={`/institute/${inst.slug}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/40 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">
                          {inst.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground line-clamp-1">{inst.name}</h4>
                          <p className="text-xs text-muted-foreground">{inst.location} — {inst.rating}/5</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Important Dates */}
            <Card>
              <CardHeader><CardTitle className="font-heading text-base">Important Dates</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exam.importantDates.map((d, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{d.event}</div>
                        <div className="text-sm font-semibold text-foreground">{d.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Colleges */}
            <Card>
              <CardHeader><CardTitle className="font-heading text-base">Top Colleges Accepting {exam.name}</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {exam.topColleges.map((college, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-primary">{i + 1}</span>
                      {college}
                    </li>
                  ))}
                </ul>
                <Link to="/colleges">
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    View All Colleges
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="border-primary/30 bg-secondary/50">
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Prepare for {exam.name}</h4>
                <p className="text-sm text-muted-foreground mb-4">Find the best coaching institutes for {exam.name} preparation</p>
                <Link to={`/category/${relatedCategories[0] || "cat"}`}>
                  <Button className="w-full">Explore Coaching</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailPage;
