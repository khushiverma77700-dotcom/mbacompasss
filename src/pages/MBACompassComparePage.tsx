import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, ArrowLeft, GraduationCap, Star, Trash2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { CompassCompareProvider, useCompassCompare } from "@/contexts/CompassCompareContext";

interface Course {
  id: string; title: string; slug: string; subtitle: string | null;
  exam_focus: string[] | null; mode: string | null; level: string | null;
  duration_weeks: number | null; validity_months: number | null;
  price: number | null; original_price: number | null;
  thumbnail_url: string | null; rating: number | null;
  full_mocks_count: number | null; sectional_mocks_count: number | null;
  topic_tests_count: number | null; total_video_hours: number | null;
  total_practice_questions: number | null; live_classes_count: number | null;
  has_ai_study_planner: boolean; has_ai_tools: boolean; has_daily_test: boolean; has_daily_mocks: boolean;
  has_cat_planner: boolean; has_sectional_tests: boolean; has_topic_tests: boolean;
  has_previous_year_papers: boolean; has_personalized_hub: boolean;
  has_mentorship_1on1: boolean; has_doubt_resolution: boolean;
  has_recorded_lectures: boolean; has_live_classes: boolean;
  has_performance_analytics: boolean; has_leaderboard_access: boolean;
  has_mock_analysis: boolean; has_study_material: boolean;
  has_ai_insights: boolean;
  has_gd_pi_prep: boolean; has_percentile_predictor: boolean;
  has_certificate: boolean; has_lifetime_access: boolean;
}

const ROWS: { group: string; rows: { key: keyof Course | string; label: string; type: "bool" | "text" | "num" | "money" }[] }[] = [
  {
    group: "Overview",
    rows: [
      { key: "price", label: "Price", type: "money" },
      { key: "original_price", label: "Original price", type: "money" },
      { key: "duration_weeks", label: "Duration (weeks)", type: "num" },
      { key: "validity_months", label: "Validity (months)", type: "num" },
      { key: "mode", label: "Mode", type: "text" },
      { key: "level", label: "Level", type: "text" },
      { key: "rating", label: "Rating", type: "num" },
    ],
  },
    {
      group: "Mocks & Tests",
      rows: [
        { key: "full_mocks_count", label: "Full-length mocks", type: "num" },
        { key: "sectional_mocks_count", label: "Sectional mocks", type: "num" },
        { key: "topic_tests_count", label: "Topic tests", type: "num" },
        { key: "has_daily_test", label: "Daily Test", type: "bool" },
        { key: "has_daily_mocks", label: "Daily Mocks", type: "bool" },
        { key: "has_sectional_tests", label: "Sectional tests", type: "bool" },
        { key: "has_topic_tests", label: "Topic-wise tests", type: "bool" },
        { key: "has_previous_year_papers", label: "Previous Year Papers", type: "bool" },
        { key: "has_personalized_hub", label: "Personalized Mock Hub", type: "bool" },
        { key: "has_mock_analysis", label: "Detailed mock analysis", type: "bool" },
        { key: "has_leaderboard_access", label: "Leaderboard access", type: "bool" },
      ],
    },
  {
    group: "AI & Smart Tools",
    rows: [
      { key: "has_ai_study_planner", label: "AI Study Planner", type: "bool" },
      { key: "has_ai_tools", label: "AI Tools", type: "bool" },
      { key: "has_cat_planner", label: "CAT Planner", type: "bool" },
      { key: "has_percentile_predictor", label: "Percentile Predictor", type: "bool" },
      { key: "has_performance_analytics", label: "Performance Analytics", type: "bool" },
    ],
  },
  {
    group: "Learning",
    rows: [
      { key: "live_classes_count", label: "Live classes count", type: "num" },
      { key: "total_video_hours", label: "Recorded video hours", type: "num" },
      { key: "total_practice_questions", label: "Practice questions", type: "num" },
      { key: "has_live_classes", label: "Live classes included", type: "bool" },
      { key: "has_recorded_lectures", label: "Recorded lectures", type: "bool" },
      { key: "has_study_material", label: "Study material (PDFs)", type: "bool" },
      { key: "has_doubt_resolution", label: "Doubt resolution", type: "bool" },
      { key: "has_mentorship_1on1", label: "1:1 Mentorship", type: "bool" },
    ],
  },
  {
    group: "Extras",
    rows: [
      { key: "has_gd_pi_prep", label: "GD-PI preparation", type: "bool" },
      { key: "has_certificate", label: "Completion certificate", type: "bool" },
      { key: "has_lifetime_access", label: "Lifetime access", type: "bool" },
    ],
  },
];

const formatINR = (n: number | null) => n == null || !n ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function MBACompassComparePage() {
  return (
    <CompassCompareProvider>
      <CompareInner />
    </CompassCompareProvider>
  );
}

function CompareInner() {
  const compare = useCompassCompare();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (compare.ids.length === 0) { setCourses([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("mba_compass_courses")
        .select("*")
        .in("id", compare.ids);
      // Preserve original order
      const ordered = compare.ids.map((id) => (data ?? []).find((c) => c.id === id)).filter(Boolean) as Course[];
      setCourses(ordered);
      setLoading(false);
    })();
  }, [compare.ids]);

  const renderCell = (c: Course, key: string, type: string) => {
    const val = (c as any)[key];
    if (type === "bool") return val
      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
      : <X className="h-5 w-5 text-slate-300 mx-auto" />;
    if (type === "money") return <span className="font-semibold">{formatINR(val)}</span>;
    if (type === "num") return val ? <span className="font-medium">{val}</span> : <span className="text-muted-foreground">—</span>;
    if (key === "mode" || key === "level") return val ? <span className="capitalize">{val}</span> : <span className="text-muted-foreground">—</span>;
    return val ?? <span className="text-muted-foreground">—</span>;
  };

  return (
    <>
      <SEOHead
        title="Compare MBA Compass Courses — Side-by-side"
        description="Compare features, mocks count, AI tools, mentorship and pricing across MBA Compass courses to choose the best fit for your CAT prep."
        canonical="https://mbacompass.in/mba-compass/compare"
      />

      <section className="container mx-auto px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/mba-compass"><ArrowLeft className="h-4 w-4 mr-1" /> Back to all courses</Link>
        </Button>

        <h1 className="text-2xl md:text-4xl font-bold text-gray-900">Compare programs side by side</h1>
        <p className="text-muted-foreground mt-1">Pick your perfect program by features, mocks, mentorship and pricing.</p>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Loading…</div>
        ) : courses.length === 0 ? (
          <Card className="mt-8 p-12 text-center">
            <GraduationCap className="h-10 w-10 mx-auto text-sky-500 mb-3" />
            <h3 className="font-semibold">No courses selected yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Add 2 or 3 courses from the catalog to compare.</p>
            <Button asChild className="bg-sky-600 hover:bg-sky-700"><Link to="/mba-compass">Browse courses</Link></Button>
          </Card>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground w-48 sticky left-0 bg-white z-10"></th>
                  {courses.map((c) => (
                    <th key={c.id} className="px-2 align-top">
                      <Card className="p-3 border-sky-100 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="aspect-video w-full bg-sky-50 rounded overflow-hidden">
                            {c.thumbnail_url
                              ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full grid place-items-center"><GraduationCap className="h-8 w-8 text-sky-400" /></div>}
                          </div>
                        </div>
                        <Link to={`/mba-compass/${c.slug}`} className="block mt-2 font-semibold text-gray-900 hover:text-sky-700 text-sm">{c.title}</Link>
                        {c.rating ? (
                          <div className="flex items-center gap-1 mt-1 text-xs">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-medium">{c.rating.toFixed(1)}</span>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(c.exam_focus ?? []).slice(0, 3).map((e) => <Badge key={e} variant="outline" className="text-[10px] border-sky-200 text-sky-700 bg-sky-50">{e}</Badge>)}
                        </div>
                        <Button size="sm" variant="ghost" className="mt-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 w-full" onClick={() => compare.remove(c.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </Card>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((group) => (
                  <>
                    <tr key={`g-${group.group}`}>
                      <td colSpan={courses.length + 1} className="pt-4 pb-1 px-2">
                        <div className="text-xs font-bold text-sky-700 uppercase tracking-wide">{group.group}</div>
                      </td>
                    </tr>
                    {group.rows.map((r) => (
                      <tr key={r.key as string}>
                        <td className="text-xs text-gray-700 py-2 px-3 sticky left-0 bg-white">{r.label}</td>
                        {courses.map((c) => (
                          <td key={c.id} className="text-center text-sm py-2 px-3 bg-sky-50/30 rounded">
                            {renderCell(c, r.key as string, r.type)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              {courses.map((c) => (
                <Button key={c.id} asChild className="bg-sky-600 hover:bg-sky-700">
                  <Link to={`/mba-compass/${c.slug}`}>Enroll in {c.title}</Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
