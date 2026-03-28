import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Star, MapPin, Clock, Users, Award, BookOpen, ArrowLeft, Download, Tag, ChevronLeft, ChevronRight, TrendingUp, GraduationCap, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { institutes } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const institute = institutes.find((i) => i.slug === slug);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [discountClaimed, setDiscountClaimed] = useState(false);
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

  const handleClaimDiscount = () => {
    setDiscountClaimed(true);
    toast({
      title: "Discount Claimed!",
      description: "You've unlocked 10% off. Use code MBA10 during enrollment.",
    });
  };

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Download Started",
      description: `Course details for ${institute.name} will be downloaded shortly.`,
    });
  };

  const nextTestimonial = () => setTestimonialIndex((prev) => (prev + 1) % institute.testimonials.length);
  const prevTestimonial = () => setTestimonialIndex((prev) => (prev - 1 + institute.testimonials.length) % institute.testimonials.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient py-10 md:py-12">
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
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">About {institute.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-4">{institute.description}</p>
                {institute.highlights.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {institute.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Courses with Comparison Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading">Courses Offered</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </CardHeader>
              <CardContent>
                {/* Course comparison table */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Course</th>
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Mode</th>
                        <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Batch Size</th>
                        <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Fees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {institute.courses.map((course) => (
                        <tr key={course.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 font-medium text-foreground">{course.name}</td>
                          <td className="py-3 px-3 text-muted-foreground">{course.duration}</td>
                          <td className="py-3 px-3"><Badge variant="secondary" className="text-xs">{course.mode}</Badge></td>
                          <td className="py-3 px-3 text-muted-foreground">{course.batchSize}</td>
                          <td className="py-3 px-3 text-right font-heading font-bold text-primary">{course.fees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Detailed course cards */}
                <div className="space-y-4">
                  {institute.courses.map((course) => (
                    <div key={course.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                        <div>
                          <h4 className="font-heading font-semibold text-foreground">{course.name}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</span>
                            <Badge variant="secondary" className="text-xs">{course.mode}</Badge>
                            <span className="text-xs">Starts: {course.startDate}</span>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 text-right">
                          <div className="font-heading font-bold text-primary text-lg">{course.fees}</div>
                          <Button size="sm" variant="outline" className="mt-1">Enquire Now</Button>
                        </div>
                      </div>
                      {course.curriculum.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {course.curriculum.map((item, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-normal">{item}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Faculty */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Faculty Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {institute.faculty.map((f, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="w-14 h-14 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                        {f.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{f.name}</h4>
                        <p className="text-sm text-primary font-medium">{f.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">{f.qualification}</p>
                        <p className="text-xs text-muted-foreground">{f.experience} experience</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Results Section */}
            {institute.results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Results & Achievements</CardTitle>
                </CardHeader>
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

                  {/* Visual bars */}
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Selection Rate Trend</h4>
                    {institute.results.map((r) => {
                      const rate = Math.round((r.selections / r.totalStudents) * 100);
                      return (
                        <div key={r.year} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-10">{r.year}</span>
                          <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${rate}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full hero-gradient rounded-full"
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground w-10">{rate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testimonials Slider */}
            {institute.testimonials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Student Testimonials</CardTitle>
                </CardHeader>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{institute.testimonials[testimonialIndex].name}</p>
                            <p className="text-sm text-primary">{institute.testimonials[testimonialIndex].exam} - {institute.testimonials[testimonialIndex].score}</p>
                          </div>
                          <Badge variant="secondary">{institute.testimonials[testimonialIndex].year}</Badge>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {institute.testimonials.length > 1 && (
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <Button variant="outline" size="sm" onClick={prevTestimonial} className="w-8 h-8 p-0">
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {testimonialIndex + 1} / {institute.testimonials.length}
                        </span>
                        <Button variant="outline" size="sm" onClick={nextTestimonial} className="w-8 h-8 p-0">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
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
                <p className="text-sm text-muted-foreground mb-4">{institute.discount}</p>
                {!discountClaimed ? (
                  <Button className="w-full" onClick={handleClaimDiscount}>
                    Get 10% Discount
                  </Button>
                ) : (
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm font-semibold text-primary">Discount Code: MBA10</p>
                    <p className="text-xs text-muted-foreground mt-1">Show this code during enrollment</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Enquiry */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-heading font-semibold text-foreground mb-3">Quick Enquiry</h4>
                <form className="space-y-3">
                  <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Your Name" />
                  <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Phone Number" />
                  <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Email" />
                  <select className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-muted-foreground">
                    <option value="">Select Course</option>
                    {institute.courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Button className="w-full" type="button">Submit Enquiry</Button>
                </form>
              </CardContent>
            </Card>

            {/* Compare CTA */}
            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Compare Courses</h4>
                <p className="text-sm text-muted-foreground mb-4">Compare this institute with others side by side</p>
                <Link to="/compare">
                  <Button variant="outline" className="w-full">Go to Compare</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutePage;
