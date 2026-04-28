import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle2, ArrowRight, Flame, Sparkles, Lock } from "lucide-react";
import { useEnrolledBundleFeatures } from "@/hooks/useEnrolledBundleFeatures";
import UpgradeDialog from "@/components/student/UpgradeDialog";

interface Today {
  assignment_id: string; assigned_date: string; test_id: string; title: string; note: string | null;
  test_name: string; test_slug: string; exam_code: string | null; duration: number | null;
  my_progress_id: string | null; my_attempt_id: string | null; completed_at: string | null;
}
interface HistoryRow {
  assigned_date: string; title: string | null; test:{ name: string; slug: string } | null;
  progress?: { completed_at: string | null; attempt_id: string | null } | null;
}

export default function StudentDailyTest() {
  const { user } = useAuth();
  const { isEnabled, loading: featLoading } = useEnrolledBundleFeatures();
  const dailyEnabled = isEnabled("daily_tests");
  const [today, setToday] = useState<Today | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [{ data: t }, { data: hist }, { data: prog }] = await Promise.all([
      supabase.rpc("get_today_daily_test"),
      supabase.from("daily_test_assignments")
        .select("id, assigned_date, title, note, test:mock_tests(name, slug, exam_code, total_duration_minutes)")
        .lte("assigned_date", todayStr)
        .gte("assigned_date", cutoff)
        .order("assigned_date", { ascending: false })
        .limit(30),
      supabase.from("student_daily_test_progress")
        .select("assigned_date, attempt_id, completed_at")
        .eq("user_id", user.id)
        .order("assigned_date", { ascending: false })
        .limit(60),
    ]);

    const todayRow = (t as any[])?.[0] ?? null;
    setToday(todayRow);

    const progByDate: Record<string, any> = {};
    (prog ?? []).forEach((p: any) => { progByDate[p.assigned_date] = p; });

    // Auto-mark today's test complete if user already has a submitted attempt for that test
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

    // streak: consecutive days back from today with completion
    let s = 0;
    const dt = new Date();
    while (true) {
      const key = dt.toISOString().slice(0, 10);
      const p = progByDate[key];
      if (p?.completed_at) { s += 1; dt.setDate(dt.getDate() - 1); }
      else break;
    }
    setStreak(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-sky-600" /> Daily Test
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Build the daily habit. A fresh mock every day, picked for you.</p>
      </div>

      {/* Locked banner */}
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
                <span>{today.test_name}</span>
                {today.exam_code && <Badge variant="secondary" className="bg-white/20 text-white border-0">{today.exam_code}</Badge>}
                {today.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {today.duration} min</span>}
              </div>
              {today.note && <p className="text-sky-100 text-xs mt-2 max-w-xl">{today.note}</p>}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {today.completed_at ? (
                <>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</Badge>
                  {today.my_attempt_id && (
                    <Link to={`/mocks/result/${today.my_attempt_id}`}>
                      <Button size="lg" variant="secondary">View result <ArrowRight className="h-4 w-4 ml-1" /></Button>
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

      {/* Calendar / history */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Last 30 days</h2>
          <span className="text-xs text-muted-foreground">{history.filter(h => h.progress?.completed_at).length} of {history.length} done</span>
        </div>
        {history.length === 0 ? (
          <div className="text-sm text-muted-foreground">No daily tests have been scheduled yet.</div>
        ) : (
          <div className="divide-y">
            {history.map(h => (
              <div key={h.assigned_date} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center text-xs font-bold ${
                    h.progress?.completed_at ? "bg-emerald-100 text-emerald-700" : "bg-sky-50 text-sky-700"
                  }`}>
                    {new Date(h.assigned_date).getDate()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{h.title || h.test?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.assigned_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      {h.test?.exam_code && <> · {h.test.exam_code}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {h.progress?.completed_at ? (
                    <>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">Completed</Badge>
                      {h.progress.attempt_id && (
                        <Link to={`/mocks/result/${h.progress.attempt_id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      )}
                    </>
                  ) : (
                    h.test?.slug && (
                      dailyEnabled ? (
                        <Link to={`/mocks/${h.test.slug}`}>
                          <Button size="sm" variant="outline">Attempt</Button>
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
            ))}
          </div>
        )}
      </Card>
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
