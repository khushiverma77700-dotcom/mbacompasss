import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import SEOHead, { generateInstituteSchema } from "@/components/SEOHead";
import { Star, MapPin, Clock, Users, Award, BookOpen, ArrowLeft, Download, Tag, TrendingUp, GraduationCap, CheckCircle, ChevronDown, ChevronUp, Heart, Lock, Play, Quote, Columns2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInstituteBySlug } from "@/hooks/useInstitutes";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";

const testimonials = [
  { name: "Ankit Verma", text: "IMS coaching transformed my CAT prep. Scored 99.2 percentile. The faculty's approach to Quant was game-changing.", rating: 5, batch: "CAT 2024", type: "text" },
  { name: "Sneha Gupta", text: "The mock test series was incredibly close to the actual exam. Got 98.5 percentile and calls from all top IIMs!", rating: 5, batch: "CAT 2024", type: "text" },
  { name: "Rohit Sharma", text: "Switched from another coaching mid-way. Best decision ever. The personalized mentoring helped me crack XAT with 99.1.", rating: 4, batch: "XAT 2024", type: "text" },
  { name: "Priya Singh", text: "The GMAT prep course was excellent. Scored 740+ on first attempt. Faculty support was outstanding.", rating: 5, batch: "GMAT 2024", type: "text" },
  { name: "Vikram Das", text: "GD/PI preparation here is unmatched. Converted IIM-A after their intense interview prep sessions.", rating: 5, batch: "CAT 2023", type: "text" },
];

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: institute, isLoading } = useInstituteBySlug(slug);
  const { user } = useAuth();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [discountClaimed, setDiscountClaimed] = useState(false);
  const [showOfferLogin, setShowOfferLogin] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({ name: "", phone: "", email: "", course: "", message: "" });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const { toast } = useToast();
  const testimonialRef = useRef<ReturnType<typeof setInterval>>();

  // Auto-scroll testimonials
  useEffect(() => {
    testimonialRef.current = setInterval(() => setTestimonialIdx(p => (p + 1) % testimonials.length), 4000);
    return () => clearInterval(testimonialRef.current);
  }, []);

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

  const seoSchema = generateInstituteSchema(institute);

  // Filter courses based on selected target
  const filteredCourses = selectedTarget
    ? courses.filter((c: any) => {
        const target = selectedTarget.toLowerCase();
        const name = c.name.toLowerCase();
        return name.includes(target.split(" ")[0]) || name.includes(target);
      })
    : courses;

  const displayCourses = filteredCourses.length > 0 ? filteredCourses : courses;

  const handleGetBestOffer = () => {
    if (!user) {
      setShowOfferLogin(true);
      return;
    }
    setDiscountClaimed(true);
    toast({ title: "🎉 Best Offer Unlocked!", description: "Use code MBAHUB25 for 25% off. Show this code during enrollment." });
  };

  const handleDownloadPDF = () => {
    const content = [
      `${institute.name} - Course Details`,
      `Location: ${institute.city}, ${institute.state}`,
      `Rating: ${institute.rating}/5`,
      `Success Rate: ${institute.success_rate}%`,
      `\nCOURSES:`,
      ...courses.flatMap((c: any) => [
        `\n${c.name}`, `Duration: ${c.duration} | Fees: ₹${Number(c.fees).toLocaleString()}`,
        `Batch: ${c.batch_info || "N/A"}`, `Description: ${c.description || "N/A"}`,
        ...(c.curriculum || []).map((item: string) => `  ✓ ${item}`),
      ]),
      `\nFACULTY:`,
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

  const toggleCompare = (courseId: string) => {
    setCompareSelection(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : prev.length < 3 ? [...prev, courseId] : prev);
  };

  const compareCourses = courses.filter((c: any) => compareSelection.includes(c.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="hero-gradient py-10 md:py-14 relative overflow-hidden">
        {institute.banner_url && (
          <img src={institute.banner_url} alt={`${institute.name} banner`} className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="container mx-auto px-4 relative z-10">
          <Link to={`/category/${categorySlug}`} className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4 mb-3">
              {institute.logo_url ? (
                <img src={institute.logo_url} alt={`${institute.name} logo`} className="w-14 h-14 rounded-xl object-contain bg-white p-1 flex-shrink-0" />
              ) : null}
              <div>
                <Badge className="mb-2 bg-primary-foreground/20 text-primary-foreground border-none">{categoryName.toUpperCase()} COACHING</Badge>
                <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">{institute.name}</h1>
              </div>
            </div>
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
        {/* Target Selection */}
        {!selectedTarget && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="border-primary/30 bg-secondary/30">
              <CardContent className="pt-6">
                <h3 className="font-heading font-semibold text-foreground text-lg mb-3">🎯 What are you targeting?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select your target to see relevant courses only</p>
                <div className="flex flex-wrap gap-2">
                  {["CAT 2025", "CAT 2026", "XAT 2026", "GMAT", "GRE", "Mock Tests", "GD/PI Preparation"].map((t) => (
                    <Button key={t} variant="outline" size="sm" onClick={() => {
                      setSelectedTarget(t);
                      const rc = courses.find((c: any) => c.name.toLowerCase().includes(t.split(" ")[0].toLowerCase()));
                      if (rc) setExpandedCourse(rc.id);
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
            <Button variant="ghost" size="sm" onClick={() => { setSelectedTarget(null); setExpandedCourse(null); }} className="text-xs text-muted-foreground">Change</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
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

            {/* Courses - Detailed */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="font-heading">
                  {selectedTarget ? `Courses for ${selectedTarget}` : `All Courses (${courses.length})`}
                  {selectedTarget && filteredCourses.length === 0 && <span className="text-sm font-normal text-muted-foreground ml-2">— showing all courses</span>}
                </CardTitle>
                <div className="flex gap-2">
                  {compareSelection.length >= 2 && (
                    <Button size="sm" variant="default" className="gap-1" onClick={() => setShowCompare(!showCompare)}>
                      <Columns2 className="w-4 h-4" /> Compare ({compareSelection.length})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadPDF}><Download className="w-4 h-4" /> Brochure</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Course comparison */}
                <AnimatePresence>
                  {showCompare && compareCourses.length >= 2 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                      <div className="bg-secondary/30 rounded-lg p-4 border border-primary/30">
                        <h4 className="font-heading font-semibold text-foreground mb-3">Course Comparison</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead><tr className="bg-muted/50">
                              <th className="text-left py-2 px-3 font-semibold text-foreground border-b border-border">Feature</th>
                              {compareCourses.map((c: any) => <th key={c.id} className="text-left py-2 px-3 font-semibold text-primary border-b border-border">{c.name}</th>)}
                            </tr></thead>
                            <tbody>
                              {[
                                { label: "Duration", key: "duration" },
                                { label: "Fees", key: "fees", format: (v: any) => `₹${Number(v).toLocaleString()}` },
                                { label: "Batch", key: "batch_info" },
                                { label: "Curriculum Items", key: "curriculum", format: (v: any) => `${(v || []).length} topics` },
                              ].map(row => (
                                <tr key={row.label} className="border-b border-border">
                                  <td className="py-2 px-3 font-medium text-foreground">{row.label}</td>
                                  {compareCourses.map((c: any) => (
                                    <td key={c.id} className="py-2 px-3 text-muted-foreground">{row.format ? row.format(c[row.key]) : (c[row.key] || "N/A")}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Course Cards */}
                <div className="space-y-3">
                  {displayCourses.map((course: any) => {
                    const isExpanded = expandedCourse === course.id;
                    return (
                      <div key={course.id} className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center gap-2 p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={compareSelection.includes(course.id)}
                            onCheckedChange={() => toggleCompare(course.id)}
                            className="flex-shrink-0"
                          />
                          <button onClick={() => setExpandedCourse(isExpanded ? null : course.id)} className="flex-1 flex items-center justify-between text-left">
                            <div className="flex-1">
                              <h4 className="font-heading font-semibold text-foreground">{course.name}</h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</span>
                                <span className="font-heading font-bold text-primary">₹{Number(course.fees).toLocaleString()}</span>
                                {course.batch_info && <span className="text-xs">{course.batch_info}</span>}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                          </button>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="p-4 bg-card space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground">Duration</div><div className="font-semibold text-foreground text-sm">{course.duration}</div></div>
                                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground">Batch Info</div><div className="font-semibold text-foreground text-sm">{course.batch_info || "N/A"}</div></div>
                                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground">Fees</div><div className="font-semibold text-foreground text-sm">₹{Number(course.fees).toLocaleString()}</div></div>
                                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground">Mode</div><div className="font-semibold text-foreground text-sm">{institute.mode}</div></div>
                                </div>
                                {course.description && <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>}

                                {/* Deliverables */}
                                <div>
                                  <h5 className="font-heading font-semibold text-foreground text-sm mb-2">What You Get</h5>
                                  <div className="grid sm:grid-cols-2 gap-1.5">
                                    {[
                                      "Complete Study Material",
                                      "Live & Recorded Lectures",
                                      "Sectional Mock Tests",
                                      "Full-Length Mock Tests",
                                      "Doubt Clearing Sessions",
                                      "Performance Analytics",
                                      "Interview Preparation",
                                      "Mentor Support",
                                    ].map((d, i) => (
                                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />{d}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {(course.curriculum || []).length > 0 && (
                                  <div>
                                    <h5 className="font-heading font-semibold text-foreground text-sm mb-2">Curriculum</h5>
                                    <div className="space-y-1.5">
                                      {(course.curriculum as string[]).map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                          <span className="text-muted-foreground">{item}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button size="sm">Enquire Now</Button>
                                  <Button size="sm" variant="outline" className="gap-1" onClick={handleGetBestOffer}>
                                    <Tag className="w-3.5 h-3.5" /> Get Best Offer
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

            {/* Faculty */}
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
                                  {f.specialization && <Badge variant="secondary" className="text-xs">{f.specialization}</Badge>}
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

            {/* Auto-scroll Testimonials */}
            <Card>
              <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Quote className="w-5 h-5 text-primary" /> Student Testimonials</CardTitle></CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-xl bg-secondary/30 p-6 min-h-[160px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={testimonialIdx}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="flex items-center gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < testimonials[testimonialIdx].rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <p className="text-muted-foreground leading-relaxed italic mb-3">"{testimonials[testimonialIdx].text}"</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-xs font-bold">
                          {testimonials[testimonialIdx].name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{testimonials[testimonialIdx].name}</div>
                          <div className="text-xs text-muted-foreground">{testimonials[testimonialIdx].batch}</div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="absolute bottom-3 right-4 flex gap-1">
                    {testimonials.map((_, i) => (
                      <button key={i} onClick={() => setTestimonialIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === testimonialIdx ? "bg-primary scale-125" : "bg-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
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

          {/* Sidebar */}
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

            {/* Get Best Offer */}
            <Card className="border-primary/30 bg-secondary/50">
              <CardContent className="pt-6 text-center">
                <Tag className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Get Best Offer</h4>
                <p className="text-sm text-muted-foreground mb-1">{institute.discount}</p>
                {institute.offer && <p className="text-xs text-primary mb-4">{institute.offer}</p>}
                {!discountClaimed ? (
                  <>
                    <Button className="w-full gap-1" onClick={handleGetBestOffer}>
                      {user ? <Tag className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {user ? "Get Best Offer" : "Login to Get Best Offer"}
                    </Button>
                    <LoginRequiredDialog open={showOfferLogin && !user} onOpenChange={setShowOfferLogin} message="Sign in or create an account to unlock exclusive offers and coupon codes." />
                  </>
                ) : (
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm font-semibold text-primary">Code: MBAHUB25</p>
                    <p className="text-xs text-muted-foreground mt-1">25% off — show during enrollment</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Enquiry */}
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
