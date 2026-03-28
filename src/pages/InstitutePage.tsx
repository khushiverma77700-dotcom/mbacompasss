import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Star, MapPin, Clock, Users, Award, BookOpen, ArrowLeft, Download, Tag, ChevronLeft, ChevronRight, TrendingUp, GraduationCap, CheckCircle, ChevronDown, ChevronUp, Phone, Mail, Globe, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { institutes } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const institute = institutes.find((i) => i.slug === slug);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [discountClaimed, setDiscountClaimed] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [enquiryForm, setEnquiryForm] = useState({ name: "", phone: "", email: "", course: "", message: "" });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const { toast } = useToast();

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

  // SEO: College name as primary H1, optimized meta
  document.title = `${institute.name} — Best MBA Coaching in ${institute.city} | Reviews, Fees, Courses | MBAHub`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", `${institute.name} in ${institute.city} offers ${institute.courses.length} MBA coaching courses. Rating: ${institute.rating}/5. ${institute.successRate} success rate. Fees from ${institute.fees}. Compare, read reviews & enroll.`);

  const handleClaimDiscount = () => {
    setDiscountClaimed(true);
    toast({ title: "Discount Claimed!", description: "You've unlocked 10% off. Use code MBA10 during enrollment." });
  };

  const handleDownloadPDF = () => {
    // Generate a text-based PDF content
    const content = [
      `${institute.name} - Course Details`,
      `Location: ${institute.location}`,
      `Rating: ${institute.rating}/5 (${institute.reviewCount} reviews)`,
      `Success Rate: ${institute.successRate}`,
      ``,
      `COURSES:`,
      ...institute.courses.flatMap((c) => [
        ``,
        `${c.name}`,
        `Duration: ${c.duration} | Mode: ${c.mode} | Fees: ${c.fees}`,
        `Batch Size: ${c.batchSize} | Start: ${c.startDate}`,
        `Curriculum:`,
        ...c.curriculum.map((item) => `  - ${item}`),
      ]),
      ``,
      `FACULTY:`,
      ...institute.faculty.map((f) => `${f.name} - ${f.subject} (${f.experience})`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${institute.slug}-course-details.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: `Course details for ${institute.name} downloaded.` });
  };

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      institute_id: null, // mock data doesn't have DB UUIDs
      name: enquiryForm.name,
      email: enquiryForm.email,
      phone: enquiryForm.phone,
      message: `Course: ${enquiryForm.course}. ${enquiryForm.message}`,
      type: "demo",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Enquiry Submitted!", description: "We'll connect you with the institute soon." });
      setEnquiryForm({ name: "", phone: "", email: "", course: "", message: "" });
    }
    setEnquiryLoading(false);
  };

  const nextTestimonial = () => setTestimonialIndex((prev) => (prev + 1) % institute.testimonials.length);
  const prevTestimonial = () => setTestimonialIndex((prev) => (prev - 1 + institute.testimonials.length) % institute.testimonials.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Banner */}
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4">
          <Link to={`/category/${institute.category}`} className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground border-none">
              {institute.category.toUpperCase()} COACHING
            </Badge>
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
              {institute.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-primary-foreground/80 text-sm">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {institute.location}</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-current" /> {institute.rating} ({institute.reviewCount} reviews)</span>
              <span>Est. {institute.established}</span>
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-none text-xs">{institute.mode}</Badge>
            </div>
            {/* Quick Stats Bar */}
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { label: "Students", value: institute.students },
                { label: "Success Rate", value: institute.successRate },
                { label: "Courses", value: String(institute.courses.length) },
                { label: "Faculty", value: String(institute.faculty.length) },
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
        {/* Course Selection Prompt */}
        {!selectedTarget && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="border-primary/30 bg-secondary/30">
              <CardContent className="pt-6">
                <h3 className="font-heading font-semibold text-foreground text-lg mb-3">🎯 What are you targeting?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select your target to see relevant courses and comparisons</p>
                <div className="flex flex-wrap gap-2">
                  {["CAT 2025", "CAT 2026", "XAT 2026", "GMAT", "GRE", "Mock Tests", "GD/PI Preparation"].map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTarget(t);
                        // Auto-expand relevant courses
                        const relevantCourse = institute.courses.find((c) => c.name.toLowerCase().includes(t.split(" ")[0].toLowerCase()));
                        if (relevantCourse) setExpandedCourse(relevantCourse.id);
                      }}
                      className="hover:bg-primary hover:text-primary-foreground"
                    >
                      {t}
                    </Button>
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader><CardTitle className="font-heading">About {institute.name}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-4">{institute.description}</p>
                {institute.highlights.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {institute.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{h}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Courses - Clickable with Dropdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading">Courses Offered ({institute.courses.length})</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </CardHeader>
              <CardContent>
                {/* Quick comparison table */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Course</th>
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Mode</th>
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Batch</th>
                        <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Fees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {institute.courses.map((course) => (
                        <tr
                          key={course.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                        >
                          <td className="py-3 px-3 font-medium text-primary">{course.name}</td>
                          <td className="py-3 px-3 text-muted-foreground">{course.duration}</td>
                          <td className="py-3 px-3"><Badge variant="secondary" className="text-xs">{course.mode}</Badge></td>
                          <td className="py-3 px-3 text-muted-foreground">{course.batchSize}</td>
                          <td className="py-3 px-3 text-right font-heading font-bold text-primary">{course.fees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Expandable Course Cards */}
                <div className="space-y-3">
                  {institute.courses.map((course) => {
                    const isExpanded = expandedCourse === course.id;
                    return (
                      <div key={course.id} className="rounded-lg border border-border overflow-hidden">
                        <button
                          onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                          className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex-1">
                            <h4 className="font-heading font-semibold text-foreground">{course.name}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</span>
                              <Badge variant="secondary" className="text-xs">{course.mode}</Badge>
                              <span className="font-heading font-bold text-primary">{course.fees}</span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-card space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground">Duration</div>
                                    <div className="font-semibold text-foreground text-sm">{course.duration}</div>
                                  </div>
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground">Mode</div>
                                    <div className="font-semibold text-foreground text-sm">{course.mode}</div>
                                  </div>
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground">Batch Size</div>
                                    <div className="font-semibold text-foreground text-sm">{course.batchSize}</div>
                                  </div>
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <div className="text-xs text-muted-foreground">Starts</div>
                                    <div className="font-semibold text-foreground text-sm">{course.startDate}</div>
                                  </div>
                                </div>
                                <div>
                                  <h5 className="font-heading font-semibold text-foreground text-sm mb-2">Curriculum</h5>
                                  <div className="space-y-2">
                                    {course.curriculum.map((item, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="gap-1">Enquire Now</Button>
                                  <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadPDF}>
                                    <Download className="w-3.5 h-3.5" /> Download Details
                                  </Button>
                                </div>
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

            {/* Faculty - Expanded with Bio & Specializations */}
            <Card>
              <CardHeader><CardTitle className="font-heading">Faculty Profiles ({institute.faculty.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {institute.faculty.map((f, i) => {
                    const isExpanded = expandedFaculty === f.name;
                    return (
                      <div key={i} className="rounded-xl border border-border overflow-hidden">
                        <button
                          onClick={() => setExpandedFaculty(isExpanded ? null : f.name)}
                          className="w-full flex items-center gap-4 p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="w-14 h-14 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                            {f.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{f.name}</h4>
                            <p className="text-sm text-primary font-medium">{f.subject}</p>
                            <p className="text-xs text-muted-foreground">{f.experience} experience | {f.qualification}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-card space-y-3">
                                <p className="text-sm text-muted-foreground leading-relaxed">{f.bio}</p>
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground mb-2">Specializations</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {f.specializations.map((s, j) => (
                                      <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                                    ))}
                                  </div>
                                </div>
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

            {/* Results Section */}
            {institute.results.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Results & Achievements</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Year</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Students</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Selections</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">99+ %ile</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">IIM Calls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {institute.results.map((r) => (
                          <tr key={r.year} className="border-b border-border">
                            <td className="py-3 px-3 font-medium text-foreground">{r.year}</td>
                            <td className="py-3 px-3 text-right text-muted-foreground">{r.totalStudents.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-muted-foreground">{r.selections.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right font-semibold text-primary">{r.topPercentile}</td>
                            <td className="py-3 px-3 text-right font-semibold text-primary">{r.iimCalls}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Selection Rate Trend</h4>
                    {institute.results.map((r) => {
                      const rate = Math.round((r.selections / r.totalStudents) * 100);
                      return (
                        <div key={r.year} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-10">{r.year}</span>
                          <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                            <motion.div initial={{ width: 0 }} whileInView={{ width: `${rate}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full hero-gradient rounded-full" />
                          </div>
                          <span className="text-sm font-semibold text-foreground w-10">{rate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testimonials - Enhanced */}
            {institute.testimonials.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-heading">Student Testimonials ({institute.testimonials.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={testimonialIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.3 }}
                        className="bg-muted/50 rounded-xl p-6 border border-border"
                      >
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-foreground leading-relaxed mb-4 italic">
                          "{institute.testimonials[testimonialIndex].text}"
                        </p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">
                              {institute.testimonials[testimonialIndex].name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{institute.testimonials[testimonialIndex].name}</p>
                              <p className="text-sm text-primary">{institute.testimonials[testimonialIndex].exam} — {institute.testimonials[testimonialIndex].score}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="mb-1">{institute.testimonials[testimonialIndex].year}</Badge>
                            {institute.testimonials[testimonialIndex].collegePlaced && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> {institute.testimonials[testimonialIndex].collegePlaced}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    {institute.testimonials.length > 1 && (
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <Button variant="outline" size="sm" onClick={prevTestimonial} className="w-8 h-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
                        <span className="text-sm text-muted-foreground">{testimonialIndex + 1} / {institute.testimonials.length}</span>
                        <Button variant="outline" size="sm" onClick={nextTestimonial} className="w-8 h-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    { icon: Users, label: "Students Enrolled", value: institute.students },
                    { icon: TrendingUp, label: "Success Rate", value: institute.successRate },
                    { icon: BookOpen, label: "Courses", value: String(institute.courses.length) },
                    { icon: Star, label: "Rating", value: `${institute.rating}/5` },
                    { icon: GraduationCap, label: "Faculty Members", value: String(institute.faculty.length) },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                        <div className="font-heading font-bold text-foreground">{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6">Get Free Counselling</Button>
                <Button variant="outline" className="w-full mt-2 gap-1" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4" /> Download Brochure
                </Button>
              </CardContent>
            </Card>

            {/* Discount Card */}
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

            {/* Quick Enquiry - Connected to DB */}
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
                      {institute.courses.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Your message (optional)" value={enquiryForm.message} onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })} rows={3} />
                  <Button className="w-full" type="submit" disabled={enquiryLoading}>{enquiryLoading ? "Submitting..." : "Submit Enquiry"}</Button>
                </form>
              </CardContent>
            </Card>

            {/* Compare CTA */}
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
