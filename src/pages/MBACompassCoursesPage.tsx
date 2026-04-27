import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  GraduationCap, Clock, Sparkles, CheckCircle2, ArrowRight, Star, Users, Target, Flame, BookOpen,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  exam_focus: string[] | null;
  mode: string | null;
  duration_weeks: number | null;
  price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  features: any;
  highlights: any;
  thumbnail_url: string | null;
  banner_url: string | null;
  enroll_url: string | null;
  brochure_url: string | null;
  is_featured: boolean;
}

const formatINR = (n: number | null) =>
  n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function MBACompassCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mba_compass_courses")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order");
      setCourses((data ?? []) as Course[]);
      setLoading(false);
    })();
  }, []);

  const filtered = tab === "all" ? courses : courses.filter((c) => (c.exam_focus ?? []).includes(tab));

  return (
    <>
      <SEOHead
        title="MBA Compass Courses — CAT, XAT & GMAT Coaching Programs"
        description="Explore MBA Compass paid programs — full-stack CAT/XAT/GMAT coaching with AI Study Planner, mocks, mentorship and percentile forecasting."
        canonical="https://mbacompass.in/mba-compass"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-sky-50 via-white to-blue-50 pt-12 pb-10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-10 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <Badge className="bg-sky-100 text-sky-700 border-sky-200 mb-3">MBA Compass Programs</Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              Choose the path that takes you to your <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">dream B-school</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-3">
              Curated by 99-percentilers and ex-IIM mentors. Every program ships with the AI Study Planner, sectional mocks, weekly mentorship and a personalised percentile roadmap.
            </p>
            <div className="flex flex-wrap gap-3 mt-5 text-sm">
              <Pill icon={<Users className="h-4 w-4" />} label="2,400+ aspirants enrolled" />
              <Pill icon={<Star className="h-4 w-4 text-amber-500" />} label="4.8/5 average rating" />
              <Pill icon={<Target className="h-4 w-4 text-emerald-600" />} label="78% above 95%ile" />
            </div>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="container mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All Programs</TabsTrigger>
            <TabsTrigger value="CAT">CAT</TabsTrigger>
            <TabsTrigger value="XAT">XAT</TabsTrigger>
            <TabsTrigger value="GMAT">GMAT</TabsTrigger>
            <TabsTrigger value="SNAP">SNAP</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-6">
            {loading ? (
              <div className="text-muted-foreground">Loading programs…</div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <GraduationCap className="h-10 w-10 mx-auto text-sky-500 mb-3" />
                <h3 className="font-semibold">New programs launching soon</h3>
                <p className="text-sm text-muted-foreground mt-1">Check back shortly — admissions open monthly.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* What's included */}
      <section className="bg-gradient-to-br from-white to-sky-50/40 py-14">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-2">Every MBA Compass program includes</h2>
          <p className="text-center text-muted-foreground mb-8">A complete prep ecosystem — not just classes.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Sparkles, t: "AI Study Planner", d: "Auto-generated daily tasks, weak-topic radar, percentile forecast." },
              { icon: BookOpen, t: "Concept Library", d: "300+ video lessons + practice sets across QA, VARC, DILR." },
              { icon: Target, t: "Adaptive Mocks", d: "Full mocks + sectionals with deep AI analysis." },
              { icon: Flame, t: "1:1 Mentorship", d: "Weekly mentorship calls with 99%ilers & IIM alumni." },
            ].map((f, i) => (
              <Card key={i} className="p-5 border-sky-100 hover:shadow-md transition">
                <f.icon className="h-6 w-6 text-sky-600 mb-3" />
                <div className="font-semibold text-gray-900">{f.t}</div>
                <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sky-100 text-xs text-gray-700 shadow-sm">
      {icon}{label}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const features: string[] = Array.isArray(course.features) ? course.features.slice(0, 5) : [];
  const highlights: string[] = Array.isArray(course.highlights) ? course.highlights.slice(0, 3) : [];
  const hasDiscount = course.original_price && course.price && course.original_price > course.price;
  const discount = course.discount_percent ?? (hasDiscount
    ? Math.round((1 - (course.price! / course.original_price!)) * 100)
    : null);

  return (
    <Card className="overflow-hidden border-sky-100 hover:shadow-lg transition group flex flex-col">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-sky-100 to-blue-100">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <GraduationCap className="h-12 w-12 text-sky-400" />
          </div>
        )}
        {course.is_featured && (
          <Badge className="absolute top-3 left-3 bg-amber-500 hover:bg-amber-500 text-white border-0">
            <Star className="h-3 w-3 mr-1 fill-white" /> Featured
          </Badge>
        )}
        {discount && discount > 0 && (
          <Badge className="absolute top-3 right-3 bg-rose-500 hover:bg-rose-500 text-white border-0">
            {discount}% OFF
          </Badge>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(course.exam_focus ?? []).slice(0, 3).map((e) => (
            <Badge key={e} variant="outline" className="text-[10px] border-sky-200 text-sky-700 bg-sky-50">{e}</Badge>
          ))}
          {course.mode && <Badge variant="outline" className="text-[10px] capitalize">{course.mode}</Badge>}
        </div>

        <h3 className="font-semibold text-gray-900 group-hover:text-sky-700 transition line-clamp-2">{course.title}</h3>
        {course.subtitle && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.subtitle}</p>}

        {highlights.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {highlights.map((h, i) => (
              <div key={i} className="text-[10px] bg-sky-50/60 rounded-md px-2 py-1.5 border border-sky-100 text-sky-700 font-medium">
                {h}
              </div>
            ))}
          </div>
        )}

        {features.length > 0 && (
          <ul className="space-y-1.5 mt-3 text-sm">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-700 text-xs">{f}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between">
          <div>
            {course.duration_weeks && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" /> {course.duration_weeks} weeks
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">{formatINR(course.price)}</span>
              {hasDiscount && <span className="text-xs text-muted-foreground line-through">{formatINR(course.original_price)}</span>}
            </div>
          </div>
          <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700">
            {course.enroll_url ? (
              <a href={course.enroll_url} target="_blank" rel="noopener noreferrer">
                Enroll <ArrowRight className="h-4 w-4 ml-1" />
              </a>
            ) : (
              <Link to={`/mba-compass/${course.slug}`}>Details <ArrowRight className="h-4 w-4 ml-1" /></Link>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
