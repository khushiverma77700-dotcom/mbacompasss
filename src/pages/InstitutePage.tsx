import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Star, MapPin, Clock, Users, Award, BookOpen, ArrowLeft, Download, Tag, ChevronLeft, ChevronRight, TrendingUp, GraduationCap, CheckCircle, ChevronDown, ChevronUp, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInstituteBySlug } from "@/hooks/useInstitutes";
import { useAuth } from "@/contexts/AuthContext";

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: institute, isLoading } = useInstituteBySlug(slug);
  const { user } = useAuth();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [discountClaimed, setDiscountClaimed] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({ name: "", phone: "", email: "", course: "", message: "" });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-10 md:py-14"><div className="container mx-auto px-4"><Skeleton className="h-10 w-64 mb-2" /><Skeleton className="h-6 w-96" /></div></div>
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Institute not found</h1>
          <Link to="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const courses = institute.courses || [];
  const faculty = institute.faculty || [];
  const reviews = institute.reviews || [];
  const categorySlug = (institute.categories as any)?.slug || "cat";
  const categoryName = (institute.categories as any)?.name || "MBA";

  document.title = `${institute.name} — Best MBA Coaching in ${institute.city} | MBAHub`;

  const handleClaimDiscount = () => {
    setDiscountClaimed(true);
    toast({ title: "Discount Claimed!", description: "You've unlocked 10% off. Use code MBA10 during enrollment." });
  };

  const handleDownloadPDF = () => {
    const content = [
      `${institute.name} - Course Details`,
      `Location: ${institute.city}, ${institute.state}`,
      `Rating: ${institute.rating}/5`,
      `Success Rate: ${institute.success_rate}%`,
      ``,
      `COURSES:`,
      ...courses.flatMap((c: any) => [
        ``, `${c.name}`, `Duration: ${c.duration} | Fees: ₹${Number(c.fees).toLocaleString()}`,
        ...(c.curriculum || []).map((item: string) => `  - ${item}`),
      ]),
      ``,
      `FACULTY:`,
      ...faculty.map((f: any) => `${f.name} - ${f.designation} (${f.experience})`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${institute.slug}-course-details.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download Started" });
  };

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      institute_id: institute.id,
      name: enquiryForm.name,
      email: enquiryForm.email,
      phone: enquiryForm.phone,
      message: `Course: ${enquiryForm.course}. ${enquiryForm.message}`,
      type: "demo",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Enquiry Submitted!" });
      setEnquiryForm({ name: "", phone: "", email: "", course: "", message: "" });
    }
    setEnquiryLoading(false);
  };

  const handleSaveInstitute = async () => {
    if (!user) { toast({ title: "Please sign in to save institutes" }); return; }
    const { error } = await supabase.from("saved_institutes").insert({ user_id: user.id, institute_id: institute.id });
    if (error) {
      if (error.code === "23505") toast({ title: "Already saved!" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSaved(true);
      toast({ title: "Saved!" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4">
          <Link to={`/category/${categorySlug}`} className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground border-none">{categoryName.toUpperCase()} COACHING</Badge>
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">{institute.name}</h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-primary-foreground/80 text-sm">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {institute.city}, {institute.state}</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-current" /> {institute.rating} ({institute.total_reviews} reviews)</span>
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-none text-xs">{institute.mode}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { label: "Students", value: `${institute.students_count}+` },
                { label: "Success Rate", value: `${institute.success_rate}%` },
                { label: "Courses", value: String(courses.length) },
                { label: "Faculty", value: String(faculty.length) },
              ].map((s) => (
                <div key={s.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-xs text-primary-foreground/70">{s.label}</div>
                  <div className="font-heading font-bold text-primary-foreground">{s.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!selectedTarget && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="border-primary/30 bg-secondary/30">
              <CardContent className="pt-6">
                <h3 className="font-heading font-semibold text-foreground text-lg mb-3">🎯 What are you targeting?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select your target to see relevant courses</p>
                <div className="flex flex-wrap gap-2">
                  {["CAT 2025", "CAT 2026", "XAT 2026", "GMAT", "GRE", "Mock Tests", "GD/PI Preparation"].map((t) => (
                    <Button key={t} variant="outline" size="sm" onClick={() => {
                      setSelectedTarget(t);
                      const relevantCourse = courses.find((c: any) => c.name.toLowerCase().includes(t.split(" ")[0].toLowerCase()));
                      if (relevantCourse) setExpandedCourse(relevantCourse.id);
                    }} className="hover:bg-primary hover:text-primary-foreground">{t}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {selectedTarget && (
          <div className="mb-6 flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-sm">Targeting: {selectedTarget}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTarget(null)} className="text-xs text-muted-foreground">Change</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-heading">About {institute.name}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-4">{institute.description}</p>
                {(institute.features || []).length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(institute.features as string[]).map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{h}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading">Courses Offered ({courses.length})</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadPDF}><Download className="w-4 h-4" /> Download PDF</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead><tr className="bg-muted/50">
                      <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Course</th>
                      <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                      <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Batch</th>
                      <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Fees</th>
                    </tr></thead>
                    <tbody>
                      {courses.map((course: any) => (
                        <tr key={course.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}>
                          <td className="py-3 px-3 font-medium text-primary">{course.name}</td>
                          <td className="py-3 px-3 text-muted-foreground">{course.duration}</td>
                          <td className="py-3 px-3 text-muted-foreground">{course.batch_info}</td>
                          <td className="py-3 px-3 text-right font-heading font-bold text-primary">₹{Number(course.fees).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3">
                  {courses.map((course: any) => {
                    const isExpanded = expandedCourse === course.id;
                    return (
                      <div key={course.id} className="rounded-lg border border-border overflow-hidden">
                        <button onClick={() => setExpandedCourse(isExpanded ? null : course.id)} className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                          <div className="flex-1">
                            <h4 className="font-heading font-semibold text-foreground">{course.name}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</span>
                              <span className="font-heading font-bold text-primary">₹{Number(course.fees).toLocaleString()}</span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="p-4 bg-card space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground">Duration</div><div className="font-semibold text-foreground text-sm">{course.duration}</div></div>
                                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground">Batch Info</div><div className="font-semibold text-foreground text-sm">{course.batch_info || "N/A"}</div></div>
                                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground">Fees</div><div className="font-semibold text-foreground text-sm">₹{Number(course.fees).toLocaleString()}</div></div>
                                </div>
                                {course.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
                                {(course.curriculum || []).length > 0 && (
                                  <div>
                                    <h5 className="font-heading font-semibold text-foreground text-sm mb-2">Curriculum</h5>
                                    <div className="space-y-2">
                                      {(course.curriculum as string[]).map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                          <span className="text-muted-foreground">{item}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <Button size="sm" className="gap-1">Enquire Now</Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {faculty.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Faculty Profiles ({faculty.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {faculty.map((f: any) => {
                      const isExpanded = expandedFaculty === f.id;
                      return (
                        <div key={f.id} className="rounded-xl border border-border overflow-hidden">
                          <button onClick={() => setExpandedFaculty(isExpanded ? null : f.id)} className="w-full flex items-center gap-4 p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                            <div className="w-14 h-14 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                              {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground">{f.name}</h4>
                              <p className="text-sm text-primary font-medium">{f.designation}</p>
                              <p className="text-xs text-muted-foreground">{f.experience} | {f.qualification}</p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="p-4 bg-card space-y-3">
                                  {f.bio && <p className="text-sm text-muted-foreground leading-relaxed">{f.bio}</p>}
                                  {f.specialization && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-foreground mb-2">Specialization</h5>
                                      <Badge variant="secondary" className="text-xs">{f.specialization}</Badge>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {reviews.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Student Reviews ({reviews.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="bg-muted/50 rounded-xl p-5 border border-border">
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        {r.title && <h4 className="font-semibold text-foreground mb-1">{r.title}</h4>}
                        {r.content && <p className="text-sm text-muted-foreground">{r.content}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {r.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    { icon: Users, label: "Students Enrolled", value: `${institute.students_count}+` },
                    { icon: TrendingUp, label: "Success Rate", value: `${institute.success_rate}%` },
                    { icon: BookOpen, label: "Courses", value: String(courses.length) },
                    { icon: Star, label: "Rating", value: `${institute.rating}/5` },
                    { icon: GraduationCap, label: "Faculty", value: String(faculty.length) },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><stat.icon className="w-5 h-5 text-primary" /></div>
                      <div><div className="text-xs text-muted-foreground">{stat.label}</div><div className="font-heading font-bold text-foreground">{stat.value}</div></div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6">Get Free Counselling</Button>
                <Button variant="outline" className="w-full mt-2 gap-1" onClick={handleDownloadPDF}><Download className="w-4 h-4" /> Download Brochure</Button>
                <Button variant="outline" className="w-full mt-2 gap-1" onClick={handleSaveInstitute} disabled={saved}>
                  <Heart className={`w-4 h-4 ${saved ? "fill-current text-destructive" : ""}`} /> {saved ? "Saved" : "Save Institute"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-secondary/50">
              <CardContent className="pt-6 text-center">
                <Tag className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Special Offer</h4>
                <p className="text-sm text-muted-foreground mb-1">{institute.discount}</p>
                {institute.offer && <p className="text-xs text-primary mb-4">{institute.offer}</p>}
                {!discountClaimed ? (
                  <Button className="w-full" onClick={handleClaimDiscount}>Get 10% Discount</Button>
                ) : (
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm font-semibold text-primary">Discount Code: MBA10</p>
                    <p className="text-xs text-muted-foreground mt-1">Show this code during enrollment</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h4 className="font-heading font-semibold text-foreground mb-3">Quick Enquiry</h4>
                <form onSubmit={handleEnquiry} className="space-y-3">
                  <Input placeholder="Your Name *" value={enquiryForm.name} onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })} required />
                  <Input placeholder="Phone Number *" value={enquiryForm.phone} onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })} required />
                  <Input type="email" placeholder="Email *" value={enquiryForm.email} onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })} required />
                  <Select value={enquiryForm.course} onValueChange={(v) => setEnquiryForm({ ...enquiryForm, course: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Your message (optional)" value={enquiryForm.message} onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })} rows={3} />
                  <Button className="w-full" type="submit" disabled={enquiryLoading}>{enquiryLoading ? "Submitting..." : "Submit Enquiry"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Compare Courses</h4>
                <p className="text-sm text-muted-foreground mb-4">Compare this institute with others side by side</p>
                <Link to="/compare"><Button variant="outline" className="w-full">Go to Compare</Button></Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutePage;
