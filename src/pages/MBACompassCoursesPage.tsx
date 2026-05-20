import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MultiSelectTags from "@/components/admin/MultiSelectTags";
import {
  GraduationCap, Clock, Sparkles, CheckCircle2, ArrowRight, Star, Users, Target, Flame, BookOpen,
  Search, GitCompare, X, Award, Zap, Filter,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { CompassCompareProvider, useCompassCompare } from "@/contexts/CompassCompareContext";
import { toast } from "sonner";

const EXAM_OPTIONS = [
  { value: "CAT", label: "CAT" },
  { value: "XAT", label: "XAT" },
  { value: "GMAT", label: "GMAT" },
  { value: "SNAP", label: "SNAP" },
  { value: "NMAT", label: "NMAT" },
  { value: "IIFT", label: "IIFT" },
  { value: "CMAT", label: "CMAT" },
  { value: "MAT", label: "MAT" },
];

interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  exam_focus: string[] | null;
  mode: string | null;
  level: string | null;
  duration_weeks: number | null;
  price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  features: any;
  highlights: any;
  thumbnail_url: string | null;
  enroll_url: string | null;
  is_featured: boolean;
  rating: number | null;
  reviews_count: number | null;
  total_students_enrolled: number | null;
  full_mocks_count: number | null;
  sectional_mocks_count: number | null;
  total_video_hours: number | null;
  has_ai_study_planner: boolean;
  has_ai_tools: boolean;
  has_daily_test: boolean;
  has_daily_mocks: boolean;
  has_cat_planner: boolean;
  has_sectional_tests: boolean;
  has_previous_year_papers: boolean;
  has_personalized_hub: boolean;
  has_mentorship_1on1: boolean;
  has_live_classes: boolean;
  has_lifetime_access: boolean;
  has_ai_insights: boolean;
}

const formatINR = (n: number | null) => n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function MBACompassCoursesPage() {
  return (
    <CompassCompareProvider>
      <CoursesInner />
    </CompassCompareProvider>
  );
}

function CoursesInner() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [priceMax, setPriceMax] = useState<number>(0);
  const [sort, setSort] = useState<string>("featured");

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

  const filtered = useMemo(() => {
    let out = courses;
    if (tab !== "all") out = out.filter((c) => (c.exam_focus ?? []).includes(tab));
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((c) => c.title.toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q));
    }
    if (mode !== "all") out = out.filter((c) => c.mode === mode);
    if (level !== "all") out = out.filter((c) => c.level === level);
    if (priceMax > 0) out = out.filter((c) => (c.price ?? 0) <= priceMax);
    out = [...out];
    if (sort === "price_low") out.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sort === "price_high") out.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (sort === "rating") out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return out;
  }, [courses, tab, search, mode, level, priceMax, sort]);

  return (
    <>
      <SEOHead
        title="MBA Compass Courses — CAT, XAT & GMAT Coaching Programs"
        description="Explore MBA Compass paid programs — full-stack CAT/XAT/GMAT coaching with AI Study Planner, mocks, mentorship and percentile forecasting. Compare and pick your best fit."
        canonical="https://mbacompass.in/mba-compass"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-sky-50 via-white to-blue-50 pt-12 pb-10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-10 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <Badge className="bg-sky-100 text-sky-700 border-sky-200 mb-3">MBA Compass Programs</Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              Find the program that turns you into a <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">99-percentiler</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-3">
              Filter, compare and choose from our in-house programs. Every program includes the AI Study Planner, full-length mocks, sectional tests, mentorship and detailed analytics.
            </p>
            <div className="flex flex-wrap gap-3 mt-5 text-sm">
              <Pill icon={<Users className="h-4 w-4" />} label="2,400+ aspirants enrolled" />
              <Pill icon={<Star className="h-4 w-4 text-amber-500" />} label="4.8/5 average rating" />
              <Pill icon={<Target className="h-4 w-4 text-emerald-600" />} label="78% above 95%ile" />
            </div>
          </div>
        </div>
      </section>

      {/* Filters bar */}
      <section className="container mx-auto px-4 py-6">
        <Card className="p-4 border-sky-100">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select className="h-10 rounded-md border px-3 text-sm bg-white" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="all">Any mode</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <select className="h-10 rounded-md border px-3 text-sm bg-white" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="all">Any level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <select className="h-10 rounded-md border px-3 text-sm bg-white" value={priceMax} onChange={(e) => setPriceMax(parseInt(e.target.value))}>
                <option value={0}>Any price</option>
                <option value={5000}>Under ₹5K</option>
                <option value={15000}>Under ₹15K</option>
                <option value={30000}>Under ₹30K</option>
                <option value={50000}>Under ₹50K</option>
              </select>
              <select className="h-10 rounded-md border px-3 text-sm bg-white" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured first</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
                <option value="rating">Highest rated</option>
              </select>
            </div>
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="mt-5">
          <TabsList className="flex-wrap h-auto bg-sky-50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="CAT">CAT</TabsTrigger>
            <TabsTrigger value="XAT">XAT</TabsTrigger>
            <TabsTrigger value="GMAT">GMAT</TabsTrigger>
            <TabsTrigger value="SNAP">SNAP</TabsTrigger>
            <TabsTrigger value="NMAT">NMAT</TabsTrigger>
            <TabsTrigger value="IIFT">IIFT</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-6">
            <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> {filtered.length === 1 ? "course" : "courses"}
            </div>
            {loading ? (
              <div className="text-muted-foreground">Loading programs…</div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <GraduationCap className="h-10 w-10 mx-auto text-sky-500 mb-3" />
                <h3 className="font-semibold">No courses match your filters</h3>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting the filters or clearing search.</p>
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

      <CompareBar />
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
  const compare = useCompassCompare();
  const inCompare = compare.has(course.id);
  const features: string[] = Array.isArray(course.features) ? course.features.slice(0, 4) : [];
  const highlights: string[] = Array.isArray(course.highlights) ? course.highlights.slice(0, 3) : [];
  const hasDiscount = course.original_price && course.price && course.original_price > course.price;
  const discount = course.discount_percent ?? (hasDiscount
    ? Math.round((1 - (course.price! / course.original_price!)) * 100) : null);

  // Quick feature icons row
  const quickFeatures = [
    course.has_ai_study_planner && { icon: Sparkles, label: "AI Planner" },
    course.has_live_classes && { icon: Zap, label: "Live" },
    course.has_mentorship_1on1 && { icon: Users, label: "1:1 Mentor" },
    course.has_lifetime_access && { icon: Award, label: "Lifetime" },
  ].filter(Boolean) as { icon: any; label: string }[];

  const toggleCompare = () => {
    if (inCompare) compare.remove(course.id);
    else if (!compare.add(course.id)) toast.error("You can compare up to 3 courses");
  };

  return (
    <Card className="overflow-hidden border-sky-100 hover:shadow-xl hover:-translate-y-0.5 transition group flex flex-col">
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
        <button
          onClick={toggleCompare}
          className={`absolute bottom-3 right-3 px-2.5 py-1.5 rounded-full text-xs font-medium shadow-md flex items-center gap-1 transition
            ${inCompare ? "bg-emerald-500 text-white" : "bg-white/95 text-sky-700 hover:bg-white"}`}
        >
          <GitCompare className="h-3.5 w-3.5" /> {inCompare ? "Added" : "Compare"}
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(course.exam_focus ?? []).slice(0, 3).map((e) => (
            <Badge key={e} variant="outline" className="text-[10px] border-sky-200 text-sky-700 bg-sky-50">{e}</Badge>
          ))}
          {course.mode && <Badge variant="outline" className="text-[10px] capitalize">{course.mode}</Badge>}
          {course.level && <Badge variant="outline" className="text-[10px] capitalize text-violet-700 border-violet-200 bg-violet-50">{course.level}</Badge>}
        </div>

        <Link to={`/mba-compass/${course.slug}`}>
          <h3 className="font-semibold text-gray-900 group-hover:text-sky-700 transition line-clamp-2">{course.title}</h3>
        </Link>
        {course.subtitle && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.subtitle}</p>}

        {course.rating ? (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-gray-900">{course.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({course.reviews_count ?? 0} reviews)</span>
            {course.total_students_enrolled ? <span className="text-muted-foreground">• {course.total_students_enrolled.toLocaleString("en-IN")} enrolled</span> : null}
          </div>
        ) : null}

        {highlights.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {highlights.map((h, i) => (
              <div key={i} className="text-[10px] bg-sky-50/60 rounded-md px-2 py-1.5 border border-sky-100 text-sky-700 font-medium">
                {h}
              </div>
            ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] text-center">
          {(course.full_mocks_count ?? 0) > 0 && <Stat n={`${course.full_mocks_count}`} l="Full Mocks" />}
          {(course.sectional_mocks_count ?? 0) > 0 && <Stat n={`${course.sectional_mocks_count}`} l="Sectionals" />}
          {(course.total_video_hours ?? 0) > 0 && <Stat n={`${course.total_video_hours}h`} l="Videos" />}
        </div>

        {quickFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {quickFeatures.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                <f.icon className="h-3 w-3" /> {f.label}
              </span>
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

        <div className="mt-auto pt-4 flex items-end justify-between border-t border-sky-50 mt-4">
          <div>
            {course.duration_weeks ? (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" /> {course.duration_weeks} weeks
              </div>
            ) : null}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">{formatINR(course.price)}</span>
              {hasDiscount && <span className="text-xs text-muted-foreground line-through">{formatINR(course.original_price)}</span>}
            </div>
          </div>
          <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700">
            <Link to={`/mba-compass/${course.slug}`}>View <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="bg-white border border-sky-100 rounded-md py-1">
      <div className="font-bold text-sky-700 text-sm">{n}</div>
      <div className="text-muted-foreground">{l}</div>
    </div>
  );
}

function CompareBar() {
  const compare = useCompassCompare();
  if (compare.ids.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100%-2rem)]">
      <Card className="shadow-2xl border-sky-200 bg-white px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-sky-600" />
          <span className="text-sm font-medium">{compare.ids.length} selected for comparison</span>
        </div>
        <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700" disabled={compare.ids.length < 2}>
          <Link to="/mba-compass/compare">Compare now</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={compare.clear}>
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      </Card>
    </div>
  );
}
