import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles, Target, Flame, Zap, Brain, CheckCircle2, Plus, Trash2,
  Trophy, Calendar, BookOpenCheck, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SECTIONS = ["QA", "VARC", "DILR"] as const;
const TASK_TEMPLATES = [
  { section: "QA", task_type: "practice", title: "20 QA practice questions", target_value: 20, duration_minutes: 45 },
  { section: "VARC", task_type: "rc", title: "2 RC passages", target_value: 2, duration_minutes: 35 },
  { section: "DILR", task_type: "set", title: "1 LR set", target_value: 1, duration_minutes: 30 },
  { section: "Mock", task_type: "sectional", title: "Sectional test (40 min)", target_value: 1, duration_minutes: 40 },
];

export default function StudentGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [weak, setWeak] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    target_percentile: 99, attempt_year: 2026, daily_hours: 3,
    current_level: "Intermediate", strong_sections: [] as string[], weak_sections: [] as string[],
    target_colleges: "" as string,
  });
  const [goalForm, setGoalForm] = useState({ title: "", goal_type: "weekly", target_value: 5, unit: "mocks", due_date: "" });

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    if (!user) return;
    const [{ data: pf }, { data: g }, { data: tk }, { data: wk }, { data: at }] = await Promise.all([
      supabase.from("student_study_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("student_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("student_daily_tasks").select("*").eq("user_id", user.id).eq("task_date", today).order("created_at", { ascending: true }),
      supabase.from("student_weak_topics").select("*").eq("user_id", user.id).order("level", { ascending: true }),
      supabase.from("mock_attempts").select("submitted_at, status, percentile").eq("user_id", user.id)
        .in("status", ["submitted", "auto_submitted"]).order("submitted_at", { ascending: false }).limit(60),
    ]);
    setProfile(pf);
    setGoals(g ?? []);
    setTasks(tk ?? []);
    setWeak(wk ?? []);
    setAttempts(at ?? []);
    if (pf) setForm({
      target_percentile: Number(pf.target_percentile ?? 99),
      attempt_year: Number(pf.attempt_year ?? 2026),
      daily_hours: Number(pf.daily_hours ?? 3),
      current_level: pf.current_level ?? "Intermediate",
      strong_sections: pf.strong_sections ?? [],
      weak_sections: pf.weak_sections ?? [],
      target_colleges: (pf.target_colleges ?? []).join(", "),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Streak: distinct days in last 30 days
  const streak = useMemo(() => {
    const days = new Set<string>();
    for (const a of attempts) if (a.submitted_at) days.add(new Date(a.submitted_at).toDateString());
    // longest consecutive streak ending today
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (days.has(d.toDateString())) s++;
      else if (i > 0) break;
    }
    return s;
  }, [attempts]);

  const lastPercentile = attempts[0]?.percentile ? Number(attempts[0].percentile) : null;
  const target = Number(form.target_percentile || 0);
  const gap = target && lastPercentile != null ? +(target - lastPercentile).toFixed(1) : null;

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      target_percentile: form.target_percentile,
      attempt_year: form.attempt_year,
      daily_hours: form.daily_hours,
      current_level: form.current_level,
      strong_sections: form.strong_sections,
      weak_sections: form.weak_sections,
      target_colleges: form.target_colleges.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const { error } = profile
      ? await supabase.from("student_study_profile").update(payload).eq("user_id", user.id)
      : await supabase.from("student_study_profile").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Profile saved" });
    load();
  };

  const generateAIPlan = async (mode: "plan" | "insight") => {
    if (!profile && mode === "plan") {
      toast({ title: "Save your profile first", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("student-ai-insights", { body: { mode } });
    setAiLoading(false);
    if (error) return toast({ title: "AI failed", description: error.message, variant: "destructive" });
    if ((data as any)?.error) return toast({ title: "AI", description: (data as any).error, variant: "destructive" });
    toast({ title: mode === "plan" ? "AI plan generated" : "AI insights ready" });
    load();
  };

  const seedTodayTasks = async () => {
    if (!user) return;
    if (tasks.length > 0) return;
    const rows = TASK_TEMPLATES.map((t) => ({ user_id: user.id, task_date: today, ...t }));
    await supabase.from("student_daily_tasks").insert(rows);
    load();
  };

  const toggleTask = async (id: string, value: boolean) => {
    await supabase.from("student_daily_tasks").update({
      is_completed: value, completed_at: value ? new Date().toISOString() : null,
    }).eq("id", id);
    load();
  };

  const addGoal = async () => {
    if (!user || !goalForm.title.trim()) return;
    await supabase.from("student_goals").insert({
      user_id: user.id, title: goalForm.title.trim(),
      goal_type: goalForm.goal_type, target_value: goalForm.target_value,
      unit: goalForm.unit, due_date: goalForm.due_date || null,
    });
    setGoalForm({ title: "", goal_type: "weekly", target_value: 5, unit: "mocks", due_date: "" });
    load();
  };

  const updateGoalProgress = async (id: string, v: number) => {
    await supabase.from("student_goals").update({ current_value: Math.max(0, v) }).eq("id", id);
    load();
  };
  const completeGoal = async (id: string) => {
    await supabase.from("student_goals").update({ is_completed: true }).eq("id", id);
    load();
  };
  const deleteGoal = async (id: string) => {
    await supabase.from("student_goals").delete().eq("id", id);
    load();
  };

  const todayProgress = tasks.length ? Math.round((tasks.filter((t) => t.is_completed).length / tasks.length) * 100) : 0;
  const aiPlan = profile?.ai_plan as any;
  const aiInsights = profile?.ai_insights as any;
  const activeGoals = goals.filter((g) => !g.is_completed);
  const doneGoals = goals.filter((g) => g.is_completed);

  if (loading) return <div className="text-muted-foreground">Loading planner…</div>;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="p-6 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white border-0 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-sky-100">CAT Score Improvement Engine</div>
            <h1 className="text-2xl md:text-3xl font-bold">99%ile Planner + Tracker</h1>
            <p className="text-sky-100 mt-1 text-sm">
              {target ? `Target: ${target}%ile` : "Set your target percentile to unlock the planner."}
              {gap != null && (gap > 0 ? ` • ${gap} %ile to go` : ` • Ahead of target`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1">
                <Flame className="h-3.5 w-3.5" /> Streak
              </div>
              <div className="text-2xl font-bold">{streak} days</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/80">Today</div>
              <div className="text-2xl font-bold">{todayProgress}%</div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile"><Target className="h-3 w-3 mr-1" />Goal Setup</TabsTrigger>
          <TabsTrigger value="plan"><Brain className="h-3 w-3 mr-1" />AI Study Plan</TabsTrigger>
          <TabsTrigger value="today"><Zap className="h-3 w-3 mr-1" />Today's Sprint</TabsTrigger>
          <TabsTrigger value="weak"><BookOpenCheck className="h-3 w-3 mr-1" />Weak Topics</TabsTrigger>
          <TabsTrigger value="goals"><Trophy className="h-3 w-3 mr-1" />My Goals</TabsTrigger>
        </TabsList>

        {/* GOAL SETUP */}
        <TabsContent value="profile" className="mt-4">
          <Card className="p-6">
            <h2 className="font-semibold text-lg mb-1">Tell us about your prep</h2>
            <p className="text-sm text-muted-foreground mb-4">
              We'll personalise your daily plan, weak-topic focus and percentile predictor based on this.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Target CAT Percentile</Label>
                <Input type="number" min={50} max={100} value={form.target_percentile}
                  onChange={(e) => setForm({ ...form, target_percentile: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Attempt Year</Label>
                <Select value={String(form.attempt_year)} onValueChange={(v) => setForm({ ...form, attempt_year: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">CAT 2026</SelectItem>
                    <SelectItem value="2027">CAT 2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Daily study hours</Label>
                <Input type="number" min={0.5} max={12} step={0.5} value={form.daily_hours}
                  onChange={(e) => setForm({ ...form, daily_hours: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Current Level</Label>
                <Select value={form.current_level} onValueChange={(v) => setForm({ ...form, current_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Target colleges (comma separated)</Label>
                <Input value={form.target_colleges} onChange={(e) => setForm({ ...form, target_colleges: e.target.value })}
                  placeholder="IIM A, IIM B, FMS Delhi, MDI" />
              </div>
              <div>
                <Label className="mb-2 block">Strong sections</Label>
                <div className="flex gap-3">
                  {SECTIONS.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.strong_sections.includes(s)}
                        onCheckedChange={(c) => setForm({
                          ...form,
                          strong_sections: c ? [...form.strong_sections, s] : form.strong_sections.filter((x) => x !== s),
                        })} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Weak sections</Label>
                <div className="flex gap-3">
                  {SECTIONS.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.weak_sections.includes(s)}
                        onCheckedChange={(c) => setForm({
                          ...form,
                          weak_sections: c ? [...form.weak_sections, s] : form.weak_sections.filter((x) => x !== s),
                        })} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</Button>
              <Button variant="outline" onClick={() => generateAIPlan("plan")} disabled={aiLoading || !profile} className="gap-1">
                <Sparkles className="h-4 w-4" /> {aiLoading ? "Generating…" : "Generate AI plan"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* AI PLAN */}
        <TabsContent value="plan" className="mt-4 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-sky-600" /> AI-generated study plan</h2>
                <p className="text-xs text-muted-foreground">Personalised to your target, level and recent mocks.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateAIPlan("insight")} disabled={aiLoading} className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Insights
                </Button>
                <Button size="sm" onClick={() => generateAIPlan("plan")} disabled={aiLoading} className="gap-1">
                  <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? "animate-spin" : ""}`} /> Regenerate
                </Button>
              </div>
            </div>
            {!aiPlan ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No plan yet. Save your profile and click "Generate AI plan".
              </div>
            ) : (
              <div className="space-y-4">
                {aiPlan.summary && (
                  <div className="p-3 rounded-md bg-sky-50 border border-sky-100 text-sm font-medium text-sky-900">
                    {aiPlan.summary}
                  </div>
                )}
                {aiPlan.predicted_percentile != null && (
                  <div className="flex items-center gap-3 text-sm">
                    <Badge className="bg-emerald-500">Predicted</Badge>
                    <span className="font-semibold">{aiPlan.predicted_percentile}%ile</span>
                    <span className="text-muted-foreground">if you follow this for 60 days</span>
                  </div>
                )}
                {aiPlan.weekly_split && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(aiPlan.weekly_split).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-lg border border-sky-100 bg-white">
                        <div className="text-xs font-semibold text-sky-700 uppercase">{k}</div>
                        <div className="text-sm mt-1">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(aiPlan.daily_template) && (
                  <div>
                    <div className="font-medium text-sm mb-2">Weekly template</div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-2">
                      {aiPlan.daily_template.map((d: any, i: number) => (
                        <div key={i} className="p-2 rounded border border-sky-100 bg-sky-50/50">
                          <div className="text-xs font-bold mb-1">{d.day}</div>
                          <div className="space-y-1">
                            {(d.tasks || []).map((t: any, j: number) => (
                              <div key={j} className="text-[11px] text-muted-foreground">
                                <span className="font-medium text-sky-800">{t.section}</span> · {t.title}
                                {t.minutes ? ` (${t.minutes}m)` : ""}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(aiPlan.focus_topics) && aiPlan.focus_topics.length > 0 && (
                  <div>
                    <div className="font-medium text-sm mb-2">Focus topics</div>
                    <div className="flex flex-wrap gap-1.5">
                      {aiPlan.focus_topics.map((t: string, i: number) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {Array.isArray(aiInsights?.insights) && aiInsights.insights.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-sky-600" /> Personalised insights
              </h2>
              <ul className="space-y-2 text-sm">
                {aiInsights.insights.map((i: string, idx: number) => (
                  <li key={idx} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        {/* TODAY */}
        <TabsContent value="today" className="mt-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-sky-600" /> Today's Sprint</h2>
                <p className="text-xs text-muted-foreground">{new Date().toDateString()} • {tasks.filter((t) => t.is_completed).length}/{tasks.length} done</p>
              </div>
              {tasks.length === 0 && (
                <Button onClick={seedTodayTasks} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Generate today's tasks
                </Button>
              )}
            </div>
            {tasks.length > 0 && <Progress value={todayProgress} className="h-2 mb-4" />}
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No tasks yet for today. Click the button above to generate the standard CAT sprint.
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-sky-100 hover:bg-sky-50/50 cursor-pointer">
                    <Checkbox checked={t.is_completed} onCheckedChange={(v) => toggleTask(t.id, !!v)} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${t.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {t.section && <Badge variant="outline" className="text-[10px]">{t.section}</Badge>}
                        {t.duration_minutes && <span>{t.duration_minutes} min</span>}
                        {t.target_value && <span>· target {t.target_value}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* WEAK TOPICS HEATMAP */}
        <TabsContent value="weak" className="mt-4">
          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <BookOpenCheck className="h-4 w-4 text-sky-600" /> Weak Topic Heatmap
            </h2>
            {weak.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Your weak topics will appear here as you complete mocks and review wrong answers.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-xs mb-3">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 bg-rose-500 rounded-full" /> Weak</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 bg-amber-500 rounded-full" /> Improving</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 bg-emerald-500 rounded-full" /> Strong</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {weak.map((w) => (
                    <div key={w.id}
                      className={`text-xs px-2 py-3 rounded-md border text-center ${
                        w.level === "red" ? "bg-rose-100 text-rose-800 border-rose-200"
                        : w.level === "yellow" ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                      title={`${w.section} • ${w.accuracy ?? 0}% accuracy`}>
                      <div className="font-semibold truncate">{w.topic}</div>
                      <div className="text-[10px] opacity-80">{w.section}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* MY GOALS */}
        <TabsContent value="goals" className="mt-4 space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Add a custom goal</h2>
            <div className="grid sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="e.g. Take 5 mocks this week" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={goalForm.goal_type} onValueChange={(v) => setGoalForm({ ...goalForm, goal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target</Label>
                <Input type="number" value={goalForm.target_value} onChange={(e) => setGoalForm({ ...goalForm, target_value: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={goalForm.due_date} onChange={(e) => setGoalForm({ ...goalForm, due_date: e.target.value })} />
              </div>
            </div>
            <Button onClick={addGoal} disabled={!goalForm.title.trim()} className="mt-3 gap-1">
              <Plus className="h-4 w-4" /> Add goal
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Active ({activeGoals.length})</h2>
            {activeGoals.length === 0 ? (
              <div className="text-sm text-muted-foreground">No active goals.</div>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((g) => {
                  const pct = g.target_value
                    ? Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100)) : 0;
                  return (
                    <div key={g.id} className="border border-sky-100 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div>
                          <div className="font-medium">{g.title}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {g.goal_type} · {g.current_value || 0}/{g.target_value} {g.unit}
                            {g.due_date && ` · due ${new Date(g.due_date).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => updateGoalProgress(g.id, Number(g.current_value || 0) - 1)}>−</Button>
                          <Button size="sm" variant="outline" onClick={() => updateGoalProgress(g.id, Number(g.current_value || 0) + 1)}>+</Button>
                          <Button size="sm" variant="ghost" onClick={() => completeGoal(g.id)} title="Complete">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteGoal(g.id)}>
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {doneGoals.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold mb-3">Completed ({doneGoals.length})</h2>
              <div className="space-y-2">
                {doneGoals.map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                    <span className="line-through text-muted-foreground">{g.title}</span>
                    <Button size="sm" variant="ghost" onClick={() => deleteGoal(g.id)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
