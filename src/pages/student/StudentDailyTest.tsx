import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Clock, CheckCircle2, ArrowRight, Flame, Sparkles, Lock, ListChecks, Gauge, TrendingUp, Trophy, Target, AlertCircle, CalendarClock, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEnrolledBundleFeatures } from "@/hooks/useEnrolledBundleFeatures";
import UpgradeDialog from "@/components/student/UpgradeDialog";

interface Today {
  assignment_id: string; assigned_date: string; test_id: string; title: string; note: string | null;
  test_name: string; test_slug: string; exam_code: string | null; duration: number | null;
  my_progress_id: string | null; my_attempt_id: string | null; completed_at: string | null;
}

export default function StudentDailyTest() {
  const { user } = useAuth();
  const { isEnabled, loading: featLoading } = useEnrolledBundleFeatures();
  const dailyEnabled = isEnabled("daily_tests");
  const [today, setToday] = useState<Today | null>(null);
  const [todayMeta, setTodayMeta] = useState<{ qCount: number; difficulty: string | null }>({ qCount: 0, difficulty: null });
  const [todayAttempt, setTodayAttempt] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [examFilter, setExamFilter] = useState<string>("All");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const [{ data: t }, { data: hist }, { data: prog }] = await Promise.all([
      supabase.rpc("get_today_daily_test"),
      supabase.from("daily_test_assignments")
        .select("id, assigned_date, title, note, test:mock_tests(id, name, slug, total_duration_minutes, difficulty, exam_code)")
        .gte("assigned_date", cutoff)
        .lte("assigned_date", future)
        .order("assigned_date", { ascending: false })
        .limit(120),
      supabase.from("student_daily_test_progress")
        .select("assigned_date, attempt_id, completed_at")
        .eq("user_id", user.id)
        .order("assigned_date", { ascending: false })
        .limit(180),
    ]);

    const todayRow = (t as any[])?.[0] ?? null;
    setToday(todayRow);

    if (todayRow?.test_id) {
      const { data: secs } = await supabase.from("mock_sections").select("total_questions").eq("test_id", todayRow.test_id);
      const { data: m } = await supabase.from("mock_tests").select("difficulty").eq("id", todayRow.test_id).maybeSingle();
      const q = (secs ?? []).reduce((acc: number, s: any) => acc + (s.total_questions || 0), 0);
      setTodayMeta({ qCount: q, difficulty: (m as any)?.difficulty ?? null });
    }

    const progByDate: Record<string, any> = {};
    (prog ?? []).forEach((p: any) => { progByDate[p.assigned_date] = p; });

    if (todayRow && !todayRow.completed_at) {
      const { data: att } = await supabase.from("mock_attempts")
        .select("id, submitted_at, status")
        .eq("user_id", user.id)
        .eq("test_id", todayRow.test_id)
        .in("status", ["submitted", "auto_submitted"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (att?.id) {
        await supabase.from("student_daily_test_progress").upsert({
          user_id: user.id,
          assigned_date: todayRow.assigned_date,
          test_id: todayRow.test_id,
          attempt_id: att.id,
          completed_at: att.submitted_at ?? new Date().toISOString(),
        }, { onConflict: "user_id,assigned_date" });
        todayRow.completed_at = att.submitted_at;
        todayRow.my_attempt_id = att.id;
        progByDate[todayRow.assigned_date] = { assigned_date: todayRow.assigned_date, attempt_id: att.id, completed_at: att.submitted_at };
      }
    }

    const merged = (hist ?? []).map((h: any) => ({ ...h, progress: progByDate[h.assigned_date] ?? null }));
    setHistory(merged);

    // Pull last 5 attempts to power improvement dashboard (accuracy trend)
    const attemptIds = (prog ?? []).map((p: any) => p.attempt_id).filter(Boolean).slice(0, 10);
    if (attemptIds.length) {
      const { data: atts } = await supabase.from("mock_attempts")
        .select("id, total_score, max_score, accuracy, total_correct, total_incorrect, total_attempted, submitted_at")
        .in("id", attemptIds)
        .order("submitted_at", { ascending: false });
      setRecentAttempts(atts ?? []);
    } else {
      setRecentAttempts([]);
    }

    // current streak
    let s = 0;
    const dt = new Date();
    while (true) {
      const key = dt.toISOString().slice(0, 10);
      if (progByDate[key]?.completed_at) { s += 1; dt.setDate(dt.getDate() - 1); } else break;
    }
    setStreak(s);

    // longest streak (scan)
    const dates = (prog ?? []).filter((p: any) => p.completed_at).map((p: any) => p.assigned_date).sort();
    let cur = 0, longest = 0, prev: Date | null = null;
    for (const d of dates) {
      const cd = new Date(d);
      if (prev && (cd.getTime() - prev.getTime()) === 86400000) cur += 1; else cur = 1;
      longest = Math.max(longest, cur);
      prev = cd;
    }
    setLongestStreak(longest);

    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const improvement = useMemo(() => {
    if (recentAttempts.length === 0) return null;
    const sorted = [...recentAttempts].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    const last = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const avgAccuracy = sorted.reduce((acc, a) => acc + (Number(a.accuracy) || 0), 0) / sorted.length;
    const delta = prev && last ? Number(last.accuracy ?? 0) - Number(prev.accuracy ?? 0) : 0;
    return {
      latest: last,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      delta: Math.round(delta * 10) / 10,
      attempts: sorted,
    };
  }, [recentAttempts]);

  const examOptions = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h: any) => h.test?.exam_code && set.add(h.test.exam_code));
    return Array.from(set).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (examFilter === "All") return history;
    return history.filter((h: any) => h.test?.exam_code === examFilter);
  }, [history, examFilter]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => filteredHistory.filter(h => h.assigned_date > todayKey).sort((a, b) => a.assigned_date.localeCompare(b.assigned_date)), [filteredHistory, todayKey]);
  const missed = useMemo(() => filteredHistory.filter(h => h.assigned_date < todayKey && !h.progress?.completed_at), [filteredHistory, todayKey]);
  const completed = useMemo(() => filteredHistory.filter(h => h.progress?.completed_at), [filteredHistory]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-sky-600" /> Daily Test
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Build the daily habit. A fresh mock every day, picked for you.</p>
      </div>

      {!featLoading && !dailyEnabled && (
        <Card className="p-4 border-amber-200 bg-amber-50/60 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 grid place-items-center shrink-0">
              <Lock className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <div className="font-semibold text-amber-900">Daily Tests are not included in your course</div>
              <p className="text-xs text-amber-800/80 mt-0.5">
                You can preview the schedule below, but attempting daily tests requires a course that includes this feature.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setUpgradeOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Upgrade to unlock
          </Button>
        </Card>
      )}

      {/* Today */}
      {!today ? (
        <Card className="p-6 border-sky-100 bg-sky-50/40 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-sky-400 mb-2" />
          <div className="font-semibold">No daily test scheduled for today</div>
          <p className="text-sm text-muted-foreground mt-1">Check back tomorrow — your mentor schedules one new mock every day.</p>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white border-0 shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm text-sky-100 mb-1">{new Date(today.assigned_date).toDateString()} • Today's challenge</div>
              <h2 className="text-xl md:text-2xl font-bold">{today.title}</h2>
              <div className="text-sky-100 text-sm mt-1 flex flex-wrap items-center gap-3">
                {todayMeta.qCount > 0 && (
                  <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{todayMeta.qCount} questions</span>
                )}
                {todayMeta.difficulty && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 capitalize gap-1">
                    <Gauge className="h-3 w-3" /> {todayMeta.difficulty}
                  </Badge>
                )}
                {today.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {today.duration} min</span>}
              </div>
              {today.note && <p className="text-sky-100 text-xs mt-2 max-w-xl">{today.note}</p>}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {today.completed_at ? (
                <>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</Badge>
                  {today.my_attempt_id && (
                    <Link to={`/student/daily-test/report/${today.my_attempt_id}`}>
                      <Button size="lg" variant="secondary">View detailed report <ArrowRight className="h-4 w-4 ml-1" /></Button>
                    </Link>
                  )}
                </>
              ) : dailyEnabled ? (
                <Link to={`/mocks/${today.test_slug}`}>
                  <Button size="lg" variant="secondary" className="gap-2">Start daily test <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              ) : (
                <Button size="lg" variant="secondary" className="gap-2" onClick={() => setUpgradeOpen(true)}>
                  <Lock className="h-4 w-4" /> Locked — Upgrade
                </Button>
              )}
            </div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <Stat label="Daily streak" value={`${streak}d`} icon={<Flame className="h-3.5 w-3.5" />} />
            <Stat label="Tests done" value={history.filter(h => h.progress?.completed_at).length} />
            <Stat label="This week" value={history.filter(h => {
              if (!h.progress?.completed_at) return false;
              const d = new Date(h.assigned_date);
              const diff = (Date.now() - d.getTime()) / 86400000;
              return diff < 7;
            }).length} />
          </div>
        </Card>
      )}

      {/* Streak / Improvement Dashboard */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase font-semibold text-orange-700 tracking-wider">Streak System</div>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-700">{streak} <span className="text-base font-normal text-muted-foreground">days</span></div>
          <div className="text-xs text-muted-foreground mt-1">Longest streak: <b>{longestStreak} days</b></div>
          <Progress value={Math.min(100, (streak / Math.max(longestStreak, 7)) * 100)} className="h-2 mt-3" />
          <div className="text-[11px] text-muted-foreground mt-2">
            {streak === 0 ? "Attempt today's test to start a streak." : streak < 3 ? "Great start — keep it going for a 3-day badge." : streak < 7 ? "On fire — 7 days unlocks a Flame badge." : "Legendary consistency."}
          </div>
        </Card>

        <Card className="p-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase font-semibold text-emerald-700 tracking-wider">Avg Accuracy</div>
            <Target className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-700">
            {improvement ? `${improvement.avgAccuracy}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {improvement?.delta != null && improvement.delta !== 0 && (
              <span className={improvement.delta > 0 ? "text-emerald-600" : "text-rose-600"}>
                {improvement.delta > 0 ? "▲" : "▼"} {Math.abs(improvement.delta)}% vs previous
              </span>
            )}
            {!improvement && "Submit a test to see your trend"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-3">Across last {recentAttempts.length || 0} attempts</div>
        </Card>

        <Card className="p-4 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase font-semibold text-sky-700 tracking-wider">Improvement Trend</div>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </div>
          {improvement && improvement.attempts.length > 0 ? (
            <div className="flex items-end gap-1 h-16 mt-2">
              {improvement.attempts.slice(-7).map((a: any, i: number) => {
                const acc = Number(a.accuracy) || 0;
                return (
                  <div key={i} className="flex-1 bg-sky-500/80 rounded-t" style={{ height: `${Math.max(8, acc)}%` }} title={`${acc}% on ${new Date(a.submitted_at).toLocaleDateString()}`} />
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-3">Your accuracy chart will appear after your first attempt.</div>
          )}
          <div className="text-[11px] text-muted-foreground mt-2">Last 7 attempts</div>
        </Card>
      </div>

      {/* History with filters */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-sky-600" /> Daily Test Schedule</h2>
          <div className="flex items-center gap-2">
            {examOptions.length > 0 && (
              <Select value={examFilter} onValueChange={setExamFilter}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white">
                  <SelectValue placeholder="Filter exam" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Exams</SelectItem>
                  {examOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-xs text-muted-foreground">{completed.length} completed · {missed.length} missed · {upcoming.length} upcoming</span>
          </div>
        </div>

        <Tabs defaultValue="missed" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="missed" className="gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Missed
              {missed.length > 0 && <Badge variant="secondary" className="ml-1 bg-rose-100 text-rose-700 border-0 h-4 px-1.5 text-[10px]">{missed.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> Upcoming
              {upcoming.length > 0 && <Badge variant="secondary" className="ml-1 bg-sky-100 text-sky-700 border-0 h-4 px-1.5 text-[10px]">{upcoming.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Done
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="missed" className="mt-4">
            <HistoryList rows={missed} emptyText="No missed tests. Great job staying consistent!" dailyEnabled={dailyEnabled} setUpgradeOpen={setUpgradeOpen} />
          </TabsContent>
          <TabsContent value="upcoming" className="mt-4">
            <HistoryList rows={upcoming} emptyText="No upcoming tests scheduled yet." dailyEnabled={dailyEnabled} setUpgradeOpen={setUpgradeOpen} isUpcoming />
          </TabsContent>
          <TabsContent value="completed" className="mt-4">
            <HistoryList rows={completed} emptyText="No completed tests yet." dailyEnabled={dailyEnabled} setUpgradeOpen={setUpgradeOpen} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <HistoryList rows={history} emptyText="No daily tests have been scheduled yet." dailyEnabled={dailyEnabled} setUpgradeOpen={setUpgradeOpen} />
          </TabsContent>
        </Tabs>
      </Card>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureLabel="Daily Tests" />
    </div>
  );
}

function Stat({ label, value, icon }: any) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
      <div className="text-[10px] uppercase tracking-wider text-white/80 flex items-center gap-1">{icon} {label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function HistoryList({ rows, emptyText, dailyEnabled, setUpgradeOpen, isUpcoming }: { rows: any[]; emptyText: string; dailyEnabled: boolean; setUpgradeOpen: (b: boolean) => void; isUpcoming?: boolean }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-muted-foreground py-6 text-center">{emptyText}</div>;
  }
  return (
    <div className="divide-y">
      {rows.map(h => {
        const completed = !!h.progress?.completed_at;
        return (
          <div key={h.assigned_date} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg grid place-items-center text-xs font-bold ${completed ? "bg-emerald-100 text-emerald-700" : isUpcoming ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"}`}>
                {new Date(h.assigned_date).getDate()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{h.title || h.test?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(h.assigned_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  {h.test?.total_duration_minutes && <> · {h.test.total_duration_minutes} min</>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {completed ? (
                <>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">Completed</Badge>
                  {h.progress.attempt_id && (
                    <Link to={`/student/daily-test/report/${h.progress.attempt_id}`}>
                      <Button size="sm" variant="outline">View report</Button>
                    </Link>
                  )}
                </>
              ) : isUpcoming ? (
                <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-100">Scheduled</Badge>
              ) : (
                h.test?.slug && (
                  dailyEnabled ? (
                    <Link to={`/mocks/${h.test.slug}`}>
                      <Button size="sm" variant="outline">Attempt now</Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setUpgradeOpen(true)} className="gap-1">
                      <Lock className="h-3 w-3" /> Locked
                    </Button>
                  )
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
