import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Search, Clock, CheckCircle2, Play, Trophy, FileText, ShoppingBag,
  Lock, Sparkles, Calendar, BookOpen, Layers, Target, Repeat, History,
} from "lucide-react";
import UpgradeDialog from "@/components/student/UpgradeDialog";

const EXAM_FILTERS = ["All", "CAT", "XAT", "NMAT", "SNAP", "IIFT", "CMAT", "MAT", "TISSNET"];

type TypeKey = "full_length" | "sectional" | "topic_wise" | "practice_set" | "attempted";

const TYPE_TABS: { key: TypeKey; label: string; icon: any }[] = [
  { key: "full_length",  label: "Full Length",   icon: Layers },
  { key: "sectional",    label: "Sectional",     icon: Target },
  { key: "topic_wise",   label: "Topic-wise",    icon: BookOpen },
  { key: "practice_set", label: "Practice Sets", icon: Repeat },
  { key: "attempted",    label: "Attempted",     icon: History },
];

// Map a URL slug → fixed test type. Used by /student/mocks/full-length etc.
const SLUG_TO_TYPE: Record<string, TypeKey> = {
  "full-length": "full_length",
  "sectional": "sectional",
  "topic-wise": "topic_wise",
  "practice": "practice_set",
  "attempted": "attempted",
};

const TYPE_TITLES: Record<TypeKey, { title: string; subtitle: string }> = {
  full_length:  { title: "Full Length Mocks",  subtitle: "Exam-day simulations across all sections." },
  sectional:    { title: "Sectional Mocks",    subtitle: "Single-section drills to fix weak areas." },
  topic_wise:   { title: "Topic-wise Tests",   subtitle: "Bite-sized practice on specific topics." },
  practice_set: { title: "Practice Sets",      subtitle: "Mixed question banks for daily practice." },
  attempted:    { title: "Previous Attempts",  subtitle: "Every mock you've submitted with results." },
};

type Test = {
  id: string;
  name: string;
  slug: string;
  total_duration_minutes: number | null;
  difficulty: string | null;
  exam_code: string | null;
  category: string | null;
  test_type: string | null;
  is_live: boolean | null;
  scheduled_start_at: string | null;
  launch_date: string | null;
  banner_url: string | null;
  is_published: boolean | null;
};

type Enrollment = { id: string; test_id: string; source: string; expires_at: string | null; admin_notes: string | null };

type Attempt = {
  id: string; test_id: string; status: string; started_at: string | null; submitted_at: string | null;
  total_score: number | null; max_score: number | null; percentile: number | null;
  total_correct: number | null; total_attempted: number | null;
};

interface StudentMocksProps {
  fixedType?: TypeKey;
}

export default function StudentMocks({ fixedType: fixedTypeProp }: StudentMocksProps = {}) {
  const { user } = useAuth();
  const params = useParams();
  const location = useLocation();
  // Resolve a fixed type either from props or from the URL slug.
  const fixedType: TypeKey | null = useMemo(() => {
    if (fixedTypeProp) return fixedTypeProp;
    const last = location.pathname.split("/").pop() ?? "";
    return SLUG_TO_TYPE[last] ?? null;
  }, [fixedTypeProp, location.pathname, params]);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tests, setTests] = useState<Record<string, Test>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [examFilter, setExamFilter] = useState<string>("All");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: e }, { data: a }, { data: c }] = await Promise.all([
        supabase
          .from("mock_enrollments")
          .select("id, test_id, source, expires_at, admin_notes, test:mock_tests(id, name, slug, total_duration_minutes, difficulty, exam_code, category, test_type, is_live, scheduled_start_at, launch_date, banner_url, is_published)")
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("mock_attempts")
          .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false }),
        supabase
          .from("mock_tests")
          .select("id, name, slug, total_duration_minutes, difficulty, exam_code, category, test_type, is_live, scheduled_start_at, launch_date, banner_url, is_published")
          .eq("is_published", true)
          .order("name"),
      ]);

      const enr: Enrollment[] = [];
      const tMap: Record<string, Test> = {};
      (e ?? []).forEach((row: any) => {
        enr.push({ id: row.id, test_id: row.test_id, source: row.source, expires_at: row.expires_at, admin_notes: row.admin_notes });
        if (row.test) tMap[row.test.id] = row.test;
      });
      (c ?? []).forEach((t: any) => { if (!tMap[t.id]) tMap[t.id] = t; });

      setEnrollments(enr);
      setAttempts((a ?? []) as Attempt[]);
      setTests(tMap);
      setLoading(false);
    })();
  }, [user]);

  const enrolledTestIds = useMemo(() => new Set(enrollments.map((e) => e.test_id)), [enrollments]);
  const attemptedByTest = useMemo(() => {
    const m: Record<string, Attempt[]> = {};
    attempts.forEach((a) => { (m[a.test_id] = m[a.test_id] || []).push(a); });
    return m;
  }, [attempts]);

  const matchesExam = (t: Test) => {
    if (examFilter === "All") return true;
    const code = (t.exam_code || t.category || "").toUpperCase();
    return code.includes(examFilter);
  };
  const matchesQuery = (t: Test) => !q || t.name.toLowerCase().includes(q.toLowerCase());

  const getKind = (t: Test): TypeKey | null => {
    const k = (t.test_type || "").toLowerCase();
    if (k === "full_length" || k === "sectional" || k === "topic_wise" || k === "practice_set") return k as TypeKey;
    return "full_length";
  };

  const buildBucket = (typeKey: TypeKey) => {
    if (typeKey === "attempted") {
      const items: { test: Test; attempt: Attempt }[] = [];
      attempts
        .filter((a) => a.status === "submitted" || a.status === "auto_submitted")
        .forEach((a) => {
          const t = tests[a.test_id];
          if (t && matchesExam(t) && matchesQuery(t)) items.push({ test: t, attempt: a });
        });
      const seen = new Set<string>();
      return items.filter((i) => {
        if (seen.has(i.test.id)) return false;
        seen.add(i.test.id); return true;
      });
    }

    const list = Object.values(tests)
      .filter((t) => getKind(t) === typeKey)
      .filter(matchesExam)
      .filter(matchesQuery)
      .filter((t) => t.is_published !== false);

    return list.map((t) => ({
      test: t,
      owned: enrolledTestIds.has(t.id),
      inProgress: attemptedByTest[t.id]?.find((x) => x.status === "in_progress") ?? null,
      latestSubmitted: attemptedByTest[t.id]?.find((x) => x.status === "submitted" || x.status === "auto_submitted") ?? null,
    }));
  };

  if (!user) return <div className="text-muted-foreground">Please sign in.</div>;
  if (loading) return <div className="text-muted-foreground">Loading mocks…</div>;

  // Header content varies based on whether we're filtered to one type or showing all.
  const heading = fixedType ? TYPE_TITLES[fixedType] : { title: "My Mocks", subtitle: "Structured by format and exam — locked mocks are part of bundles you haven't unlocked yet." };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{heading.title}</h1>
          <p className="text-sm text-muted-foreground">{heading.subtitle}</p>
        </div>
        <Link to="/courses">
          <Button className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Browse Courses
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mocks…" className="pl-9" />
        </div>
      </div>

      {/* Exam chip filter */}
      <div className="flex flex-wrap gap-1.5">
        {EXAM_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setExamFilter(f)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              examFilter === f
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-card text-foreground border-border hover:bg-accent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* If a fixed type is set, render just that bucket. Otherwise show tabs. */}
      {fixedType ? (
        fixedType === "attempted" ? (
          <AttemptedGrid items={buildBucket("attempted") as any} />
        ) : (
          <BucketGrid
            items={buildBucket(fixedType) as any}
            typeLabel={TYPE_TITLES[fixedType].title}
            examFilter={examFilter}
            onUpgrade={() => setUpgradeOpen(true)}
          />
        )
      ) : (
        <Tabs defaultValue="full_length">
          <TabsList className="flex-wrap h-auto">
            {TYPE_TABS.map((t) => {
              const Icon = t.icon;
              const count = buildBucket(t.key).length;
              return (
                <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" /> {t.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TYPE_TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              {t.key === "attempted" ? (
                <AttemptedGrid items={buildBucket("attempted") as any} />
              ) : (
                <BucketGrid
                  items={buildBucket(t.key) as any}
                  typeLabel={t.label}
                  examFilter={examFilter}
                  onUpgrade={() => setUpgradeOpen(true)}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureLabel="this mock" />
    </div>
  );
}

function comingSoon(t: Test): string | null {
  const launch = t.launch_date ? new Date(t.launch_date) : null;
  const sched = t.scheduled_start_at ? new Date(t.scheduled_start_at) : null;
  const future = [launch, sched].filter((d): d is Date => !!d && d.getTime() > Date.now());
  if (future.length === 0) return null;
  const earliest = future.sort((a, b) => a.getTime() - b.getTime())[0];
  return earliest.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function BucketGrid({
  items, typeLabel, examFilter, onUpgrade,
}: {
  items: { test: Test; owned: boolean; inProgress: Attempt | null; latestSubmitted: Attempt | null }[];
  typeLabel: string; examFilter: string; onUpgrade: () => void;
}) {
  if (!items.length) {
    return (
      <Card className="p-8 text-center">
        <Lock className="h-8 w-8 text-sky-500 mx-auto mb-3" />
        <div className="font-medium">
          No {typeLabel}{examFilter !== "All" ? ` (${examFilter})` : ""} mocks in your active courses yet.
        </div>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Upgrade your course to access this section.</p>
        <Link to="/courses">
          <Button className="gap-2"><ShoppingBag className="h-4 w-4" /> Browse Courses</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(({ test, owned, inProgress, latestSubmitted }) => {
        const soon = comingSoon(test);
        return (
          <Card key={test.id} className={`p-4 flex flex-col relative ${!owned ? "border-sky-100" : ""}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold leading-tight">{test.name}</div>
              {!owned && <Badge variant="outline" className="shrink-0 text-[10px] gap-0.5"><Lock className="h-3 w-3" /> Locked</Badge>}
              {owned && soon && <Badge className="shrink-0 text-[10px] bg-amber-500 hover:bg-amber-500"><Sparkles className="h-3 w-3 mr-0.5" /> Coming Soon</Badge>}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
              {test.exam_code && <div>{test.exam_code}</div>}
              <div>{test.total_duration_minutes ?? "—"} min · {test.difficulty ?? "—"}</div>
              {soon && <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Launches {soon}</div>}
            </div>

            {owned && latestSubmitted && latestSubmitted.total_score != null && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2 mb-2 text-xs">
                <div className="flex justify-between"><span>Score</span><span className="font-semibold">{latestSubmitted.total_score}/{latestSubmitted.max_score}</span></div>
                <div className="flex justify-between"><span>Percentile</span><span className="font-semibold">{latestSubmitted.percentile ?? 0}</span></div>
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              {!owned ? (
                <Button size="sm" className="w-full gap-1" onClick={onUpgrade}>
                  <Sparkles className="h-3 w-3" /> Upgrade to unlock
                </Button>
              ) : soon ? (
                <Button size="sm" disabled className="w-full gap-1">
                  <Calendar className="h-3 w-3" /> Coming Soon
                </Button>
              ) : inProgress ? (
                <Link to={`/mocks/attempt/${inProgress.id}`} className="flex-1">
                  <Button size="sm" className="w-full gap-1"><Clock className="h-3 w-3" /> Resume</Button>
                </Link>
              ) : latestSubmitted ? (
                <>
                  <Link to={`/mocks/result/${latestSubmitted.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full gap-1"><FileText className="h-3 w-3" /> Result</Button>
                  </Link>
                  <Link to={`/mocks/${test.slug}`} className="flex-1">
                    <Button size="sm" className="w-full gap-1"><Play className="h-3 w-3" /> Retake</Button>
                  </Link>
                </>
              ) : (
                test.slug && (
                  <Link to={`/mocks/${test.slug}`} className="flex-1">
                    <Button size="sm" className="w-full gap-1"><Play className="h-3 w-3" /> Start</Button>
                  </Link>
                )
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function AttemptedGrid({ items }: { items: { test: Test; attempt: Attempt }[] }) {
  if (!items.length) {
    return (
      <Card className="p-8 text-center">
        <History className="h-8 w-8 text-sky-500 mx-auto mb-3" />
        <div className="font-medium">No mocks attempted yet.</div>
        <p className="text-sm text-muted-foreground mt-1">Once you submit a mock it will appear here with your result.</p>
      </Card>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(({ test, attempt }) => (
        <Card key={attempt.id} className="p-4 flex flex-col">
          <div className="font-semibold leading-tight mb-1">{test.name}</div>
          <div className="text-xs text-muted-foreground mb-3">
            {test.exam_code ?? "—"} · Submitted {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : "—"}
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2 mb-3 text-xs grid grid-cols-2 gap-y-1">
            <span>Score</span><span className="text-right font-semibold">{attempt.total_score ?? 0}/{attempt.max_score ?? 0}</span>
            <span>Percentile</span><span className="text-right font-semibold">{attempt.percentile ?? 0}</span>
            <span>Accuracy</span><span className="text-right font-semibold">{attempt.total_attempted ? Math.round(((attempt.total_correct ?? 0) / attempt.total_attempted) * 100) : 0}%</span>
          </div>
          <div className="mt-auto flex gap-2">
            <Link to={`/mocks/result/${attempt.id}`} className="flex-1">
              <Button size="sm" variant="outline" className="w-full gap-1"><FileText className="h-3 w-3" /> Result</Button>
            </Link>
            <Link to={`/mocks/review/${attempt.id}`} className="flex-1">
              <Button size="sm" className="w-full gap-1"><CheckCircle2 className="h-3 w-3" /> Review</Button>
            </Link>
            {test.slug && (
              <Link to={`/mocks/leaderboard/${test.slug}`}>
                <Button size="sm" variant="ghost"><Trophy className="h-4 w-4" /></Button>
              </Link>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
