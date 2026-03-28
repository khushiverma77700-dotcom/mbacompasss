import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Clock, Users, Award, BookOpen, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { institutes } from "@/data/mockData";

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const institute = institutes.find((i) => i.slug === slug);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient py-12">
        <div className="container mx-auto px-4">
          <Link to={`/category/${institute.category}`} className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground border-none">
              {institute.category.toUpperCase()}
            </Badge>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              {institute.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-primary-foreground/80 text-sm">
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
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{institute.description}</p>
              </CardContent>
            </Card>

            {/* Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Courses Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {institute.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div>
                        <h4 className="font-heading font-semibold text-foreground">{course.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</span>
                          <Badge variant="secondary" className="text-xs">{course.mode}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 text-right">
                        <div className="font-heading font-bold text-primary text-lg">{course.fees}</div>
                        <Button size="sm" variant="outline" className="mt-1">Enquire</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Faculty */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Faculty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {institute.faculty.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                        {f.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{f.name}</h4>
                        <p className="text-xs text-muted-foreground">{f.subject} · {f.experience}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    { icon: Users, label: "Students Enrolled", value: institute.students },
                    { icon: Award, label: "Success Rate", value: institute.successRate },
                    { icon: BookOpen, label: "Courses", value: String(institute.courses.length) },
                    { icon: Star, label: "Rating", value: `${institute.rating}/5` },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                        <div className="font-heading font-bold text-foreground">{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6">Get Free Counselling</Button>
                <Button variant="outline" className="w-full mt-2">Download Brochure</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h4 className="font-heading font-semibold text-foreground mb-3">Quick Enquiry</h4>
                <form className="space-y-3">
                  <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Your Name" />
                  <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Phone Number" />
                  <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Email" />
                  <Button className="w-full" type="button">Submit Enquiry</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutePage;
