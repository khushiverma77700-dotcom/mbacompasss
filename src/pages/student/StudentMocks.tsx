import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Search, Clock, CheckCircle2, Play, Trophy, FileText, ShoppingBag,
  Lock, Sparkles, Calendar, BookOpen, Layers, Target, Repeat, History,
  TrendingUp, Award, Flame, BarChart3, Zap, ChevronRight,
} from "lucide-react";
import UpgradeDialog from "@/components/student/UpgradeDialog";
import { ensureStudentMode, mockAttemptPath, mockIntroPath, mockLeaderboardPath, mockResultPath, mockReviewPath } from "@/lib/studentModeNav";

const EXAM_FILTERS = ["All", "CAT", "XAT", "NMAT", "SNAP", "IIFT", "CMAT", "MAT", "TISSNET"];

const studentMockLinkProps = {
  onClick: ensureStudentMode,
  onPointerDown: ensureStudentMode,
};

type TypeKey = "full_length" | "sectional" | "topic_wise" | "practice_set" | "attempted";

const TYPE_TABS: { key: TypeKey; label: string; icon: any; gradient: string }[] = [
  { key: "full_length",  label: "Full Length",   icon: Layers,   gradient: "from-sky-500 to-blue-600" },
  { key: "sectional",    label: "Sectional",     icon: Target,   gradient: "from-violet-500 to-purple-600" },
  { key: "topic_wise",   label: "Topic-wise",    icon: BookOpen, gradient: "from-emerald-500 to-teal-600" },
  { key: "practice_set", label: "Practice Sets", icon: Repeat,   gradient: "from-amber-500 to-orange-600" },
  { key: "attempted",    label: "Attempted",     icon: History,  gradient: "from-rose-500 to-pink-600" },
];

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
  topic: string | null;
  is_live: boolean | null;
  scheduled_start_at: string | null;
  launch_date: string | null;
  banner_url: string | null;
  is_published: boolean | null;
  sort_order: number | null;
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

const difficultyTone = (d: string | null) => {
  const k = (d ?? "").toLowerCase();
  if (k.includes("easy")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (k.includes("hard")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (k.includes("mod") || k.includes("med")) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
};

export default function StudentMocks({ fixedType: fixedTypeProp }: StudentMocksProps = {}) {
  const { user } = useAuth();
  const params = useParams();
  const location = useLocation();
  const fixedType: TypeKey | null = useMemo(() => {
    if (fixedTypeProp) return fixedTypeProp;
    const last = location.pathname.split("/").pop() ?? "";
    return SLUG_TO_TYPE[last] ?? null;
  }, [fixedTypeProp, location.pathname, params]);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tests, setTests] = useState<Record<string, Test>>({});
  const [bundleOrder, setBundleOrder] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [examFilter, setExamFilter] = useState<string>("All");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [topicFilter, setTopicFilter] = useState<string>("All");
  const [sectionFilter, setSectionFilter] = useState<string>("All");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: e }, { data: a }, { data: c }, { data: bi }] = await Promise.all([
        supabase
          .from("mock_enrollments")
          .select("id, test_id, source, expires_at, admin_notes, test:mock_tests(id, name, slug, total_duration_minutes, difficulty, exam_code, category, test_type, topic, is_live, scheduled_start_at, launch_date, banner_url, is_published, sort_order)")
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("mock_attempts")
          .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false }),
        supabase
          .from("mock_tests")
          .select("id, name, slug, total_duration_minutes, difficulty, exam_code, category, test_type, topic, is_live, scheduled_start_at, launch_date, banner_url, is_published, sort_order")
          .or("is_published.eq.true,is_live.eq.true")
          .order("sort_order", { ascending: true })
          .order("name"),
        supabase
          .from("mock_bundle_items")
          .select("test_id, sort_order")
          .order("sort_order"),
      ]);

      const enr: Enrollment[] = [];
      const tMap: Record<string, Test> = {};
      (e ?? []).forEach((row: any) => {
        enr.push({ id: row.id, test_id: row.test_id, source: row.source, expires_at: row.expires_at, admin_notes: row.admin_notes });
        if (row.test) tMap[row.test.id] = row.test;
      });
      (c ?? []).forEach((t: any) => { if (!tMap[t.id]) tMap[t.id] = t; });

      // Build min sort_order per test across all bundles
      const orderMap: Record<string, number> = {};
      (bi ?? []).forEach((row: any) => {
        const cur = orderMap[row.test_id];
        const so = row.sort_order ?? 9999;
        if (cur === undefined || so < cur) orderMap[row.test_id] = so;
      });

      setEnrollments(enr);
      setAttempts((a ?? []) as Attempt[]);
      setTests(tMap);
      setBundleOrder(orderMap);
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
    if (k === "topic" || k === "topic_wise") return "topic_wise";
    if (k === "full_length" || k === "sectional" || k === "practice_set") return k as TypeKey;
    return "full_length";
  };

  // Distinct sections across all topic-wise tests (for the section filter on the Topic-wise tab)
  const sectionChips = useMemo(() => {
    const s = new Set<string>();
    Object.values(tests).forEach((t) => {
      if (getKind(t) === "topic_wise" && matchesExam(t)) {
        const sec = (t.category || "").trim().toUpperCase();
        if (sec) s.add(sec);
      }
    });
    return Array.from(s).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests, examFilter]);

  // Distinct topics across all topic-wise tests (filtered by section if set)
  const topicChips = useMemo(() => {
    const s = new Set<string>();
    Object.values(tests).forEach((t) => {
      if (getKind(t) !== "topic_wise") return;
      if (!matchesExam(t)) return;
      if (sectionFilter !== "All" && (t.category || "").trim().toUpperCase() !== sectionFilter) return;
      if (t.topic && t.topic.trim()) s.add(t.topic.trim());
    });
    return Array.from(s).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests, examFilter, sectionFilter]);

  // Reset topic when section changes and current topic isn't available
  useEffect(() => {
    if (topicFilter !== "All" && !topicChips.includes(topicFilter)) setTopicFilter("All");
  }, [topicChips, topicFilter]);

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
      .filter((t) => {
        if (typeKey !== "topic_wise" || topicFilter === "All") return true;
        return (t.topic || "").trim() === topicFilter;
      })
      .filter((t) => {
        if (typeKey !== "topic_wise" || sectionFilter === "All") return true;
        return (t.category || "").trim().toUpperCase() === sectionFilter;
      })
      .filter((t) => {
        if (t.is_published) return true;
        // Live-only (unpublished) mocks stay hidden until scheduled time passes.
        if (t.is_live && t.scheduled_start_at && new Date(t.scheduled_start_at).getTime() <= Date.now()) return true;
        return false;
      })
      .sort((a, b) => {
        const examRank = (t: Test) => {
          const code = (t.exam_code || t.category || "").toUpperCase();
          const order = ["CAT", "XAT", "NMAT", "SNAP", "IIFT", "CMAT", "MAT"];
          const idx = order.findIndex((x) => code.includes(x));
          return idx === -1 ? 999 : idx;
        };
        const ar = examRank(a);
        const br = examRank(b);
        if (ar !== br) return ar - br;
        const aso = a.sort_order ?? 9999;
        const bso = b.sort_order ?? 9999;
        if (aso !== bso) return aso - bso;
        const ao = bundleOrder[a.id] ?? 9999;
        const bo = bundleOrder[b.id] ?? 9999;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });

    return list.map((t) => ({
      test: t,
      owned: enrolledTestIds.has(t.id),
      inProgress: attemptedByTest[t.id]?.find((x) => x.status === "in_progress") ?? null,
      latestSubmitted: attemptedByTest[t.id]?.find((x) => x.status === "submitted" || x.status === "auto_submitted") ?? null,
    }));
  };

  // Stats for hero strip
  const stats = useMemo(() => {
    const submitted = attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
    const totalUnlocked = enrolledTestIds.size;
    const totalAttempted = new Set(submitted.map((a) => a.test_id)).size;
    const avgPercentile = submitted.length
      ? Math.round(submitted.reduce((s, a) => s + (a.percentile ?? 0), 0) / submitted.length)
      : 0;
    const bestPercentile = submitted.length
      ? Math.max(...submitted.map((a) => a.percentile ?? 0))
      : 0;
    return { totalUnlocked, totalAttempted, avgPercentile, bestPercentile, submittedCount: submitted.length };
  }, [attempts, enrolledTestIds]);

  if (!user) return <div className="text-muted-foreground">Please sign in.</div>;
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-gradient-to-r from-sky-100 to-blue-100 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const heading = fixedType ? TYPE_TITLES[fixedType] : { title: "My Mocks", subtitle: "Track your prep, sharpen weak areas, and conquer exam day." };
  const completion = stats.totalUnlocked > 0 ? Math.round((stats.totalAttempted / stats.totalUnlocked) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 text-white p-4 sm:p-8 shadow-lg">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/15 backdrop-blur text-[10px] sm:text-[11px] font-medium mb-2 sm:mb-3">
              <Zap className="h-3 w-3" /> Mock Test Hub
            </div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight leading-tight">{heading.title}</h1>
            <p className="text-xs sm:text-base text-sky-100 mt-1 max-w-xl">{heading.subtitle}</p>
          </div>
          <Link to="/courses" className="shrink-0">
            <Button size="sm" className="gap-1.5 bg-white text-sky-700 hover:bg-sky-50 shadow-md sm:h-10 sm:px-4 sm:text-sm">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Browse </span>Courses
            </Button>
          </Link>
        </div>

        {/* Stat tiles */}
        <div className="relative mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatTile icon={Layers} label="Unlocked" value={stats.totalUnlocked} />
          <StatTile icon={CheckCircle2} label="Attempted" value={stats.totalAttempted} />
          <StatTile icon={TrendingUp} label="Avg %ile" value={stats.avgPercentile} />
          <StatTile icon={Trophy} label="Best %ile" value={stats.bestPercentile} />
        </div>

        {stats.totalUnlocked > 0 && (
          <div className="relative mt-3 sm:mt-4">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-sky-100 mb-1.5">
              <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> Course completion</span>
              <span className="font-semibold text-white">{completion}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Filter row */}
      <Card className="p-3 sm:p-4 border-sky-100/60">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search mocks…"
              className="pl-9 h-10 bg-white text-sm"
            />
          </div>
          <div className="-mx-1 px-1 overflow-x-auto sm:overflow-visible">
            <div className="flex sm:flex-wrap gap-1.5 min-w-max sm:min-w-0">
              {EXAM_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setExamFilter(f)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    examFilter === f
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {fixedType ? (
        fixedType === "attempted" ? (
          <AttemptedGrid items={buildBucket("attempted") as any} />
        ) : fixedType === "topic_wise" ? (
          <TopicWiseView
            items={buildBucket("topic_wise") as any}
            allTopicWise={Object.values(tests).filter((t) => getKind(t) === "topic_wise" && matchesExam(t))}
            attemptedByTest={attemptedByTest}
            enrolledTestIds={enrolledTestIds}
            sections={sectionChips}
            sectionFilter={sectionFilter}
            onSectionChange={setSectionFilter}
            topics={topicChips}
            topicFilter={topicFilter}
            onTopicChange={setTopicFilter}
            examFilter={examFilter}
            onUpgrade={() => setUpgradeOpen(true)}
          />
        ) : (
          <BucketGrid
            items={buildBucket(fixedType) as any}
            typeLabel={TYPE_TITLES[fixedType].title}
            examFilter={examFilter}
            onUpgrade={() => setUpgradeOpen(true)}
          />
        )
      ) : (
        <Tabs defaultValue="full_length" className="w-full">
          <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
            <TabsList className="inline-flex h-auto bg-slate-100/70 p-1 gap-1">
              {TYPE_TABS.map((t) => {
                const Icon = t.icon;
                const count = buildBucket(t.key).length;
                return (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    className="gap-1.5 px-2.5 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-sky-700 rounded-md text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="font-medium">{t.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 data-[state=active]:bg-sky-100 text-slate-600">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {TYPE_TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4 sm:mt-5">
              {t.key === "attempted" ? (
                <AttemptedGrid items={buildBucket("attempted") as any} />
              ) : (
                <>
                  {t.key === "topic_wise" && topicChips.length > 0 && (
                    <TopicChipStrip topics={topicChips} value={topicFilter} onChange={setTopicFilter} />
                  )}
                  <BucketGrid
                    items={buildBucket(t.key) as any}
                    typeLabel={t.label}
                    examFilter={examFilter}
                    onUpgrade={() => setUpgradeOpen(true)}
                  />
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureLabel="this mock" />
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 p-2.5 sm:p-3 hover:bg-white/20 transition-colors">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-sky-100 mb-0.5 sm:mb-1">
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {label}
      </div>
      <div className="text-lg sm:text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function TopicChipStrip({ topics, value, onChange }: { topics: string[]; value: string; onChange: (v: string) => void }) {
  const all = ["All", ...topics];
  return (
    <div className="mb-3 -mx-1 px-1 overflow-x-auto scrollbar-none">
      <div className="flex gap-1.5 min-w-max items-center">
        <span className="text-[11px] font-semibold text-slate-500 mr-1 shrink-0">Topic:</span>
        {all.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
              value === t
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

type LockInfo =
  | { kind: "scheduled"; unlocksAt: Date; label: string }
  | { kind: "soon"; label: string }
  | null;

function getLockInfo(t: Test): LockInfo {
  const launch = t.launch_date ? new Date(t.launch_date) : null;
  const sched = t.scheduled_start_at ? new Date(t.scheduled_start_at) : null;
  const future = [launch, sched].filter((d): d is Date => !!d && d.getTime() > Date.now());
  if (future.length > 0) {
    const earliest = future.sort((a, b) => a.getTime() - b.getTime())[0];
    return {
      kind: "scheduled",
      unlocksAt: earliest,
      label: earliest.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      }),
    };
  }
  // Published but flagged as live without a date → "to be launched soon"
  if (t.is_live && !sched && !launch) {
    return { kind: "soon", label: "To be launched soon" };
  }
  return null;
}

function useCountdown(target: Date | null): string {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return "";
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "Unlocking…";
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function BucketGrid({
  items, typeLabel, examFilter, onUpgrade,
}: {
  items: { test: Test; owned: boolean; inProgress: Attempt | null; latestSubmitted: Attempt | null }[];
  typeLabel: string; examFilter: string; onUpgrade: () => void;
}) {
  if (!items.length) {
    return (
      <Card className="p-10 text-center border-dashed border-2 border-sky-100 bg-gradient-to-br from-sky-50/40 to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sky-100 mb-3">
          <Lock className="h-7 w-7 text-sky-600" />
        </div>
        <div className="font-semibold text-base">
          No {typeLabel}{examFilter !== "All" ? ` (${examFilter})` : ""} mocks yet
        </div>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
          Unlock these mocks by upgrading to a course bundle that includes them.
        </p>
        <Link to="/courses">
          <Button className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
            <ShoppingBag className="h-4 w-4" /> Browse Courses
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <MockCardItem
          key={item.test.id}
          item={item}
          onUpgrade={onUpgrade}
        />
      ))}
    </div>
  );
}

function MockCardItem({
  item, onUpgrade,
}: {
  item: { test: Test; owned: boolean; inProgress: Attempt | null; latestSubmitted: Attempt | null };
  onUpgrade: () => void;
}) {
  const { test, owned, inProgress, latestSubmitted } = item;
  const lock = getLockInfo(test);
  const countdown = useCountdown(lock?.kind === "scheduled" ? lock.unlocksAt : null);
  const pct = latestSubmitted?.percentile ?? null;
  const accuracy = latestSubmitted?.total_attempted
    ? Math.round(((latestSubmitted.total_correct ?? 0) / latestSubmitted.total_attempted) * 100)
    : null;

  return (
    <Card
      className={`group relative overflow-hidden p-0 flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        !owned ? "border-sky-100" : "border-slate-200"
      }`}
    >
      {/* top accent bar */}
      <div
        className={`h-1.5 w-full ${
          !owned
            ? "bg-gradient-to-r from-slate-200 to-slate-300"
            : lock
            ? "bg-gradient-to-r from-amber-400 to-orange-500"
            : latestSubmitted
            ? "bg-gradient-to-r from-emerald-400 to-teal-500"
            : inProgress
            ? "bg-gradient-to-r from-sky-400 to-blue-500"
            : "bg-gradient-to-r from-violet-400 to-purple-500"
        }`}
      />

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {test.exam_code && (
                <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700 bg-sky-50">
                  {test.exam_code}
                </Badge>
              )}
            </div>
            <div className="font-semibold leading-tight text-[15px] line-clamp-2">{test.name}</div>
          </div>
          {!owned && (
            <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500">
              <Lock className="h-3.5 w-3.5" />
            </div>
          )}
          {owned && lock && (
            <Badge className="shrink-0 text-[10px] bg-amber-500 hover:bg-amber-500 gap-0.5">
              <Sparkles className="h-3 w-3" /> {lock.kind === "scheduled" ? "Scheduled" : "Soon"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {test.total_duration_minutes ?? "—"} min
          </span>
        </div>

        {owned && lock && (
          <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-3 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              {lock.kind === "scheduled" ? "To be unlocked on" : "Status"}
            </div>
            <div className="text-sm font-semibold text-amber-900 leading-tight">{lock.label}</div>
            {lock.kind === "scheduled" && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-700/90">
                <Clock className="h-3 w-3" /> Unlocks in <span className="font-semibold">{countdown}</span>
              </div>
            )}
          </div>
        )}

        {owned && latestSubmitted && pct != null && !lock && (
          <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-emerald-700 inline-flex items-center gap-1">
                <Award className="h-3 w-3" /> Last Attempt
              </span>
              <span className="text-lg font-bold text-emerald-700 leading-none">{pct}<span className="text-xs">%ile</span></span>
            </div>
            <Progress value={pct} className="h-1.5 bg-emerald-100" />
            <div className="flex justify-between mt-2 text-[11px] text-emerald-700/80">
              <span>Score {latestSubmitted.total_score ?? 0}/{latestSubmitted.max_score ?? 0}</span>
              {accuracy != null && <span>Accuracy {accuracy}%</span>}
            </div>
          </div>
        )}

        {owned && inProgress && !latestSubmitted && !lock && (
          <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-2.5 mb-3 text-xs text-sky-700 font-medium inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Attempt in progress — resume now
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {!owned ? (
            <Button
              size="sm"
              className="w-full gap-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-sm"
              onClick={onUpgrade}
            >
              <Sparkles className="h-3.5 w-3.5" /> Upgrade to unlock
            </Button>
          ) : lock ? (
            <Button size="sm" disabled className="w-full gap-1">
              <Lock className="h-3.5 w-3.5" />
              {lock.kind === "scheduled" ? `Unlocks in ${countdown}` : "Coming soon"}
            </Button>
          ) : inProgress ? (
            <Link to={mockAttemptPath(inProgress.id)} className="flex-1" {...studentMockLinkProps}>
              <Button size="sm" className="w-full gap-1 bg-sky-600 hover:bg-sky-700">
                <Clock className="h-3.5 w-3.5" /> Resume Attempt
              </Button>
            </Link>
          ) : latestSubmitted ? (
            <div className="w-full flex flex-col gap-2">
              <div className="flex gap-2">
                <Link to={mockResultPath(latestSubmitted.id)} className="flex-1" {...studentMockLinkProps}>
                  <Button size="sm" variant="outline" className="w-full gap-1">
                    <BarChart3 className="h-3.5 w-3.5" /> Report
                  </Button>
                </Link>
                <Link to={mockReviewPath(latestSubmitted.id)} className="flex-1" {...studentMockLinkProps}>
                  <Button size="sm" variant="outline" className="w-full gap-1">
                    <FileText className="h-3.5 w-3.5" /> Review
                  </Button>
                </Link>
              </div>
              {test.slug && (
                <Link to={mockIntroPath(test.slug)} className="w-full" {...studentMockLinkProps}>
                  <Button size="sm" className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700">
                    <Play className="h-3.5 w-3.5" /> Retake Mock
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            test.slug && (
              <Link to={mockIntroPath(test.slug)} className="flex-1" {...studentMockLinkProps}>
                <Button size="sm" className="w-full gap-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
                  <Play className="h-3.5 w-3.5" /> Start Mock
                  <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </Card>
  );
}

function AttemptedGrid({ items }: { items: { test: Test; attempt: Attempt }[] }) {
  if (!items.length) {
    return (
      <Card className="p-10 text-center border-dashed border-2 border-sky-100 bg-gradient-to-br from-sky-50/40 to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sky-100 mb-3">
          <History className="h-7 w-7 text-sky-600" />
        </div>
        <div className="font-semibold">No mocks attempted yet</div>
        <p className="text-sm text-muted-foreground mt-1">Once you submit a mock it will appear here with detailed results.</p>
      </Card>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(({ test, attempt }) => {
        const pct = attempt.percentile ?? 0;
        const accuracy = attempt.total_attempted
          ? Math.round(((attempt.total_correct ?? 0) / attempt.total_attempted) * 100)
          : 0;
        const tone = pct >= 90 ? "from-emerald-500 to-teal-600" : pct >= 70 ? "from-sky-500 to-blue-600" : pct >= 50 ? "from-amber-500 to-orange-600" : "from-rose-500 to-pink-600";

        return (
          <Card key={attempt.id} className="overflow-hidden p-0 flex flex-col hover:shadow-lg transition-all hover:-translate-y-0.5">
            <div className={`bg-gradient-to-br ${tone} text-white p-4`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="text-[11px] opacity-90 mb-0.5">{test.exam_code ?? "Mock"}</div>
                  <div className="font-semibold leading-tight line-clamp-2">{test.name}</div>
                </div>
                <Trophy className="h-5 w-5 opacity-80 shrink-0" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-90">Percentile</div>
                  <div className="text-3xl font-bold leading-none">{pct}</div>
                </div>
                <div className="text-right text-xs opacity-90">
                  <div>Score {attempt.total_score ?? 0}/{attempt.max_score ?? 0}</div>
                  <div>Accuracy {accuracy}%</div>
                </div>
              </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <div className="text-[11px] text-muted-foreground mb-3 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Submitted {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </div>
              <div className="mt-auto flex gap-2">
                <Link to={mockResultPath(attempt.id)} className="flex-1" {...studentMockLinkProps}>
                  <Button size="sm" variant="outline" className="w-full gap-1"><FileText className="h-3.5 w-3.5" /> Result</Button>
                </Link>
                <Link to={mockReviewPath(attempt.id)} className="flex-1" {...studentMockLinkProps}>
                  <Button size="sm" className="w-full gap-1 bg-sky-600 hover:bg-sky-700"><CheckCircle2 className="h-3.5 w-3.5" /> Review</Button>
                </Link>
                {test.slug && (
                  <Link to={mockLeaderboardPath(test.slug)} {...studentMockLinkProps}>
                    <Button size="sm" variant="ghost" title="Leaderboard"><Trophy className="h-4 w-4" /></Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
