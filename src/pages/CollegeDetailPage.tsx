import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Star, Users, TrendingUp, Award, BookOpen, ArrowLeft, Globe, GraduationCap, CheckCircle, Building, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollegeBySlug } from "@/hooks/useInstitutes";

const CollegeDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: college, isLoading } = useCollegeBySlug(slug);

  useEffect(() => {
    if (college) {
      document.title = `${college.name} — Fees, Placements, Admission, Ranking | MBAHub`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content",
        `${college.name}, ${college.city} — Fees: ${college.fees}, Avg Package: ${college.placement_avg}. Ranking #${college.ranking}. Check courses, cutoffs, placements & admission details.`
      );
    }
  }, [college]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-12"><div className="container mx-auto px-4"><Skeleton className="h-10 w-80 mb-3" /><Skeleton className="h-6 w-60" /></div></div>
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!college) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">College not found</h1>
          <Link to="/colleges"><Button>Browse All Colleges</Button></Link>
        </div>
      </div>
    );
  }

  const exams = college.exams_accepted || [];
  const courses = college.courses || [];
  const accreditations = (college as any).accreditations || [];
  const topRecruiters = (college as any).top_recruiters || [];
  const highlights = (college as any).highlights as any;
  const cutoffInfo = (college as any).cutoff_info as any;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4">
          <Link to="/colleges" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Colleges
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold text-2xl flex-shrink-0">
                {college.ranking ? `#${college.ranking}` : college.name.charAt(0)}
              </div>
              <div>
                <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-1">{college.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-primary-foreground/80 text-sm">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {college.city}, {college.state}</span>
                  <Badge className="bg-primary-foreground/15 text-primary-foreground border-none text-xs">{college.type}</Badge>
                  {(college as any).established && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Est. {(college as any).established}</span>}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { label: "NIRF Ranking", value: college.ranking ? `#${college.ranking}` : "N/A" },
                { label: "Fees", value: college.fees || "N/A" },
                { label: "Avg Package", value: college.placement_avg || "N/A" },
                { label: "Highest Package", value: (college as any).placement_highest || "N/A" },
              ].map((s) => (
                <div key={s.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-xs text-primary-foreground/70">{s.label}</div>
                  <div className="font-heading font-bold text-primary-foreground text-sm">{s.value}</div>
                </div>
              ))}
            </div>

            {accreditations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {accreditations.map((a: string) => (
                  <Badge key={a} className="bg-primary-foreground/20 text-primary-foreground border-none text-xs">{a}</Badge>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="courses">Courses & Fees</TabsTrigger>
                <TabsTrigger value="admission">Admission</TabsTrigger>
                <TabsTrigger value="placements">Placements</TabsTrigger>
                <TabsTrigger value="cutoff">Cutoff</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">About {college.name}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {(college as any).description || `${college.name} is a premier ${college.type} institute located in ${college.city}, ${college.state}. Ranked #${college.ranking} nationally, it offers world-class MBA education with strong industry connections and excellent placement records.`}
                    </p>

                    {highlights && (
                      <div className="mt-6">
                        <h3 className="font-heading font-semibold text-foreground mb-3">Key Highlights</h3>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {(Array.isArray(highlights) ? highlights : Object.entries(highlights).map(([k, v]) => `${k}: ${v}`)).map((h: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{h}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Exams Accepted */}
                {exams.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="font-heading">Exams Accepted</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {exams.map((exam: string) => (
                          <Link key={exam} to={`/exam/${exam.toLowerCase()}`}>
                            <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm py-1.5 px-3">{exam}</Badge>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Courses & Fees Tab */}
              <TabsContent value="courses" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Courses & Fee Structure</CardTitle></CardHeader>
                  <CardContent>
                    {courses.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Course</th>
                              <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                              <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Total Fees</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courses.map((c: string) => (
                              <tr key={c} className="border-b border-border">
                                <td className="py-3 px-3 font-medium text-foreground">{c}</td>
                                <td className="py-3 px-3 text-muted-foreground">2 Years</td>
                                <td className="py-3 px-3 text-right font-heading font-bold text-primary">{college.fees || "Contact College"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Course details coming soon.</p>
                        <p className="text-sm text-muted-foreground mt-1">Fee structure: {college.fees || "Contact the college"}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Admission Tab */}
              <TabsContent value="admission" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Admission Process</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {(college as any).admission_process || `Admission to ${college.name} is based on scores in national-level entrance exams such as ${exams.join(", ") || "CAT, XAT, GMAT"}, followed by Group Discussion (GD), Written Ability Test (WAT), and Personal Interview (PI).`}
                    </p>

                    <div className="space-y-4 mt-6">
                      <h3 className="font-heading font-semibold text-foreground">Admission Steps</h3>
                      {[
                        { step: "1", title: "Entrance Exam", desc: `Score well in ${exams[0] || "CAT"} or other accepted exams` },
                        { step: "2", title: "Shortlisting", desc: "Based on exam scores, academic profile, and work experience" },
                        { step: "3", title: "GD/WAT/PI", desc: "Group Discussion, Written Ability Test, and Personal Interview rounds" },
                        { step: "4", title: "Final Selection", desc: "Merit list based on composite scores from all rounds" },
                      ].map((s) => (
                        <div key={s.step} className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">{s.step}</div>
                          <div>
                            <h4 className="font-semibold text-foreground">{s.title}</h4>
                            <p className="text-sm text-muted-foreground">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Placements Tab */}
              <TabsContent value="placements" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Placement Statistics</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: "Average Package", value: college.placement_avg || "N/A", icon: TrendingUp },
                        { label: "Highest Package", value: (college as any).placement_highest || "N/A", icon: Award },
                        { label: "Median Package", value: (college as any).placement_median || "N/A", icon: Star },
                      ].map((s) => (
                        <div key={s.label} className="bg-secondary/50 rounded-lg p-4 text-center">
                          <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                          <div className="font-heading text-lg font-bold text-primary">{s.value}</div>
                          <div className="text-xs text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {topRecruiters.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-heading font-semibold text-foreground mb-3">Top Recruiters</h3>
                        <div className="flex flex-wrap gap-2">
                          {topRecruiters.map((r: string) => (
                            <Badge key={r} variant="outline" className="text-xs py-1.5 px-3">
                              <Building className="w-3 h-3 mr-1" /> {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cutoff Tab */}
              <TabsContent value="cutoff" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Cutoff Details</CardTitle></CardHeader>
                  <CardContent>
                    {cutoffInfo ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Category</th>
                              <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Cutoff Percentile</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(cutoffInfo).map(([cat, val]) => (
                              <tr key={cat} className="border-b border-border">
                                <td className="py-3 px-3 font-medium text-foreground capitalize">{cat}</td>
                                <td className="py-3 px-3 text-right font-heading font-bold text-primary">{String(val)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Cutoff data for {exams[0] || "CAT"} at {college.name}:</p>
                        <p className="text-sm text-muted-foreground mt-1">General: 95+ percentile (expected). Detailed cutoffs will be updated soon.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Info Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-heading font-semibold text-foreground mb-4">Quick Info</h3>
                <div className="space-y-3">
                  {[
                    { icon: MapPin, label: "Location", value: `${college.city}, ${college.state}` },
                    { icon: Award, label: "Ranking", value: college.ranking ? `#${college.ranking} (NIRF)` : "N/A" },
                    { icon: BookOpen, label: "Type", value: college.type || "N/A" },
                    { icon: Users, label: "Students", value: (college as any).total_students ? `${(college as any).total_students}+` : "N/A" },
                    { icon: Building, label: "Campus", value: (college as any).campus_size || "N/A" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"><item.icon className="w-4 h-4 text-primary" /></div>
                      <div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="font-semibold text-foreground text-sm">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {college.website && (
                  <a href={college.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full mt-4 gap-1"><Globe className="w-4 h-4" /> Visit Website</Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Fee Summary */}
            <Card className="border-primary/30 bg-secondary/50">
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-1">Total Fees</h4>
                <p className="font-heading text-2xl font-bold text-primary">{college.fees || "Contact College"}</p>
                <p className="text-xs text-muted-foreground mt-1">For full program duration</p>
              </CardContent>
            </Card>

            {/* Compare CTA */}
            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Compare Colleges</h4>
                <p className="text-sm text-muted-foreground mb-4">Compare {college.name} with other top MBA colleges</p>
                <Link to="/compare"><Button variant="outline" className="w-full">Go to Compare</Button></Link>
              </CardContent>
            </Card>

            {/* Other Colleges */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-heading font-semibold text-foreground mb-3">Similar Colleges</h4>
                <div className="space-y-2">
                  {exams.slice(0, 3).map((exam: string) => (
                    <Link key={exam} to={`/exam/${exam.toLowerCase()}`} className="block">
                      <Badge variant="secondary" className="w-full justify-center py-2 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">{exam} Accepting Colleges</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeDetailPage;
