import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CalendarDays, CheckCircle2, Clock, Plus, Flame, Coins, Trophy, Target,
  Trash2, Play, Pause, BookOpen, Brain, FileText, Repeat, Sparkles, TrendingUp, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  estimated_minutes: number;
  actual_minutes: number | null;
  status: string;
  completed_at: string | null;
  notes: string | null;
}

interface Rewards {
  coins: number; xp: number; level: number;
  streak_days: number; longest_streak: number; total_mocks_completed: number;
}

const CATEGORIES = [
  { value: "mock", label: "Full Mock", icon: FileText, color: "#0ea5e9" },
  { value: "sectional", label: "Sectional", icon: BookOpen, color: "#10b981" },
  { value: "varc", label: "VARC", icon: Brain, color: "#f59e0b" },
  { value: "qa", label: "Quant (QA)", icon: Target, color: "#8b5cf6" },
  { value: "dilr", label: "DILR", icon: Activity, color: "#ec4899" },
  { value: "revision", label: "Revision", icon: Repeat, color: "#14b8a6" },
  { value: "gk", label: "GK / Reading", icon: BookOpen, color: "#f97316" },
  { value: "custom", label: "Custom", icon: Sparkles, color: "#6366f1" },
];

const PRIORITIES = [
  { value: "high", label: "High", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "low", label: "Low", color: "bg-sky-100 text-sky-700 border-sky-200" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function StudentDayPlanner() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  // form state
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fCategory, setFCategory] = useState("custom");
  const [fPriority, setFPriority] = useState("medium");
  const [fDate, setFDate] = useState(todayStr());
  const [fTime, setFTime] = useState("");
  const [fMinutes, setFMinutes] = useState(30);

  const load = async () => {
    if (!user) return;
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase
        .from("student_planner_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("scheduled_date", { ascending: false })
        .order("scheduled_start_time", { ascending: true, nullsFirst: false })
        .limit(500),
      supabase.from("student_rewards").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setTasks((t ?? []) as Task[]);
    setRewards(r as Rewards | null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const resetForm = () => {
    setFTitle(""); setFDesc(""); setFCategory("custom"); setFPriority("medium");
    setFDate(todayStr()); setFTime(""); setFMinutes(30);
  };

  const createTask = async () => {
    if (!user || !fTitle.trim()) return toast.error("Please add a title");
    const { error } = await supabase.from("student_planner_tasks").insert({
      user_id: user.id,
      title: fTitle.trim(),
      description: fDesc.trim() || null,
      category: fCategory,
      priority: fPriority,
      scheduled_date: fDate,
      scheduled_start_time: fTime || null,
      estimated_minutes: fMinutes,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Task added to your planner");
    setOpenCreate(false); resetForm(); load();
  };

  const setStatus = async (task: Task, status: string) => {
    const patch: any = { status };
    if (status === "completed") {
      patch.completed_at = new Date().toISOString();
      patch.actual_minutes = task.actual_minutes ?? task.estimated_minutes;
    }
    const { error } = await supabase.from("student_planner_tasks").update(patch).eq("id", task.id);
    if (error) return toast.error(error.message);
    if (status === "completed") {
      // Award rewards: 5 coins + 20 XP per task
      try {
        await supabase.rpc("award_student_rewards", {
          _user_id: user!.id, _coins: 5, _xp: 20, _activity_today: true,
        });
      } catch {}
      toast.success("Nice! +20 XP, +5 coins");
    }
    load();
  };

  const removeTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("student_planner_tasks").delete().eq("id", id);
    load();
  };

  // ---------- Analytics ----------
  const today = todayStr();
  const todayTasks = useMemo(() => tasks.filter((t) => t.scheduled_date === today), [tasks, today]);
  const upcoming = useMemo(() => tasks.filter((t) => t.scheduled_date > today && t.status !== "completed"), [tasks, today]);
  const completedToday = todayTasks.filter((t) => t.status === "completed").length;
  const todayCompletion = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  // 14-day completion trend
  const trend14 = useMemo(() => {
    const days: { date: string; planned: number; done: number; mins: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayTasks = tasks.filter((t) => t.scheduled_date === ds);
      const done = dayTasks.filter((t) => t.status === "completed");
      days.push({
        date: fmtDate(ds),
        planned: dayTasks.length,
        done: done.length,
        mins: done.reduce((s, x) => s + (x.actual_minutes ?? x.estimated_minutes), 0),
      });
    }
    return days;
  }, [tasks]);

  // Subject distribution (last 30 days, completed)
  const subjectDist = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const cs = cutoff.toISOString().slice(0, 10);
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status !== "completed" || t.scheduled_date < cs) continue;
      map[t.category] = (map[t.category] ?? 0) + (t.actual_minutes ?? t.estimated_minutes);
    }
    return CATEGORIES
      .map((c) => ({ name: c.label, value: map[c.value] ?? 0, color: c.color }))
      .filter((x) => x.value > 0);
  }, [tasks]);

  // Productivity score: completion rate * consistency * focus mins
  const last7 = trend14.slice(-7);
  const completionRate = last7.length
    ? Math.round(
        (last7.reduce((s, d) => s + (d.planned ? d.done / d.planned : 0), 0) / last7.length) * 100
      )
    : 0;
  const totalMins7 = last7.reduce((s, d) => s + d.mins, 0);
  const activeDays7 = last7.filter((d) => d.done > 0).length;
  const productivity = Math.min(
    100,
    Math.round(completionRate * 0.5 + (activeDays7 / 7) * 30 + Math.min(20, totalMins7 / 30))
  );

  // Heatmap (12 weeks)
  const heatmap = useMemo(() => {
    const cells: { date: string; mins: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const mins = tasks
        .filter((t) => t.scheduled_date === ds && t.status === "completed")
        .reduce((s, x) => s + (x.actual_minutes ?? x.estimated_minutes), 0);
      cells.push({ date: ds, mins });
    }
    return cells;
  }, [tasks]);
  const heatColor = (m: number) =>
    m === 0 ? "bg-slate-100" :
    m < 30 ? "bg-sky-200" :
    m < 60 ? "bg-sky-400" :
    m < 120 ? "bg-sky-500" : "bg-sky-700";

  if (loading) return <div className="text-muted-foreground">Loading your planner…</div>;

  const xp = rewards?.xp ?? 0;
  const level = rewards?.level ?? 1;
  const xpProgress = Math.min(100, ((xp % 500) / 500) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-sky-600" />
            My Day Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan tasks, track focus time, build streaks. Earn XP & coins as you complete them.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700">
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add a task to your planner</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Task title *</Label>
                <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="e.g. CAT VARC sectional - 1 hour" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={fCategory} onValueChange={setFCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={fPriority} onValueChange={setFPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
                </div>
                <div>
                  <Label>Start time</Label>
                  <Input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} />
                </div>
                <div>
                  <Label>Minutes</Label>
                  <Input type="number" min={5} max={600} value={fMinutes} onChange={(e) => setFMinutes(parseInt(e.target.value) || 30)} />
                </div>
              </div>
              <Button className="w-full bg-sky-600 hover:bg-sky-700" onClick={createTask}>Add to planner</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatTile icon={<Flame className="h-5 w-5 text-orange-500" />} label="Streak" value={`${rewards?.streak_days ?? 0}d`} sub={`Best ${rewards?.longest_streak ?? 0}d`} />
        <StatTile icon={<Coins className="h-5 w-5 text-amber-500" />} label="Coins" value={rewards?.coins ?? 0} sub="Earned" />
        <StatTile icon={<Trophy className="h-5 w-5 text-violet-500" />} label="Level" value={level} sub={`${xp % 500}/500 XP`} progress={xpProgress} />
        <StatTile icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} label="Today" value={`${completedToday}/${todayTasks.length}`} sub={`${todayCompletion}% done`} progress={todayCompletion} />
        <StatTile icon={<Clock className="h-5 w-5 text-sky-500" />} label="7d Focus" value={`${Math.round(totalMins7 / 60 * 10) / 10}h`} sub={`${activeDays7}/7 active`} />
        <StatTile icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="Productivity" value={`${productivity}`} sub="Out of 100" progress={productivity} />
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({todayTasks.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="all">All tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3">
          {todayTasks.length === 0 ? (
            <EmptyState onAdd={() => setOpenCreate(true)} />
          ) : todayTasks.map((t) => <TaskCard key={t.id} task={t} onStatus={setStatus} onDelete={removeTask} />)}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0
            ? <Card className="p-8 text-center text-muted-foreground">Nothing scheduled ahead. Plan your week!</Card>
            : upcoming.map((t) => <TaskCard key={t.id} task={t} onStatus={setStatus} onDelete={removeTask} />)}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-2">14-day plan vs done</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend14}>
                  <defs>
                    <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="planned" stroke="#94a3b8" fill="url(#gPlan)" />
                  <Area type="monotone" dataKey="done" stroke="#0ea5e9" fill="url(#gDone)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-2">Focus minutes (14 days)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="mins" fill="#0ea5e9" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-2">Time by subject (last 30 days)</h3>
              {subjectDist.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Complete tasks to see your subject mix
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={subjectDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                      {subjectDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v} min`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Consistency heatmap (12 weeks)</h3>
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                {heatmap.map((c) => (
                  <div
                    key={c.date}
                    title={`${c.date} • ${c.mins} min`}
                    className={`h-3.5 w-3.5 rounded-sm ${heatColor(c.mins)}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                Less
                <span className="h-3 w-3 rounded-sm bg-slate-100" />
                <span className="h-3 w-3 rounded-sm bg-sky-200" />
                <span className="h-3 w-3 rounded-sm bg-sky-400" />
                <span className="h-3 w-3 rounded-sm bg-sky-500" />
                <span className="h-3 w-3 rounded-sm bg-sky-700" />
                More
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {tasks.length === 0
            ? <EmptyState onAdd={() => setOpenCreate(true)} />
            : tasks.map((t) => <TaskCard key={t.id} task={t} onStatus={setStatus} onDelete={removeTask} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({ icon, label, value, sub, progress }: { icon: React.ReactNode; label: string; value: any; sub?: string; progress?: number }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">{icon}<div className="text-xs text-muted-foreground">{label}</div></div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      {typeof progress === "number" && <Progress value={progress} className="h-1 mt-2" />}
    </Card>
  );
}

function TaskCard({ task, onStatus, onDelete }: { task: Task; onStatus: (t: Task, s: string) => void; onDelete: (id: string) => void }) {
  const cat = CATEGORIES.find((c) => c.value === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const pri = PRIORITIES.find((p) => p.value === task.priority) ?? PRIORITIES[1];
  const Icon = cat.icon;
  const done = task.status === "completed";
  return (
    <Card className={`p-4 transition ${done ? "bg-emerald-50/50 border-emerald-200" : "hover:shadow-sm"}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatus(task, done ? "pending" : "completed")}
          className={`mt-1 h-5 w-5 rounded-full border-2 grid place-items-center transition ${done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-sky-500"}`}
          aria-label="Toggle complete"
        >
          {done && <CheckCircle2 className="h-4 w-4 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : "text-gray-900"}`}>
                {task.title}
              </div>
              {task.description && <div className="text-xs text-muted-foreground mt-0.5">{task.description}</div>}
            </div>
            <button onClick={() => onDelete(task.id)} className="text-muted-foreground hover:text-rose-600 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px] gap-1" style={{ borderColor: cat.color, color: cat.color }}>
              <Icon className="h-3 w-3" /> {cat.label}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${pri.color}`}>{pri.label}</Badge>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> {fmtDate(task.scheduled_date)}
              {task.scheduled_start_time && ` • ${task.scheduled_start_time.slice(0,5)}`}
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {task.estimated_minutes}m
            </span>
            {!done && task.status === "in_progress" && (
              <Badge className="text-[10px] bg-sky-100 text-sky-700 border-sky-200" variant="outline">In progress</Badge>
            )}
          </div>
        </div>
        {!done && (
          <div className="flex flex-col gap-1 shrink-0">
            {task.status !== "in_progress" ? (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onStatus(task, "in_progress")}>
                <Play className="h-3 w-3 mr-1" /> Start
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onStatus(task, "pending")}>
                <Pause className="h-3 w-3 mr-1" /> Pause
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="p-10 text-center">
      <CalendarDays className="h-10 w-10 mx-auto text-sky-500 mb-3" />
      <h3 className="font-semibold">No tasks yet</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">Plan your study day — add mocks, sectionals, revision blocks.</p>
      <Button onClick={onAdd} className="bg-sky-600 hover:bg-sky-700"><Plus className="h-4 w-4 mr-2" /> Add your first task</Button>
    </Card>
  );
}
