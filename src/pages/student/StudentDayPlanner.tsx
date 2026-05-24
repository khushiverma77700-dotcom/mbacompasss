import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CalendarDays, CheckCircle2, Clock, Plus, Flame, Trophy, Target,
  Trash2, Play, Pause, BookOpen, Brain, FileText, Repeat, Sparkles,
  TrendingUp, Activity, Edit3, ArrowRight, ArrowRightCircle, SkipForward,
  BarChart3, HelpCircle, X, Lightbulb, ListChecks, Zap, Award,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PlannerTaskDialog, { TaskFormValue } from "@/components/student/PlannerTaskDialog";
import PlannerSuggestions from "@/components/student/PlannerSuggestions";
import { Recurrence, addDays, fmtDate, fmtFullDate, todayStr, describeRecurrence } from "@/lib/plannerRecurrence";

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
  recurrence: Recurrence;
  recurrence_days: number[];
  recurrence_until: string | null;
  series_id: string | null;
  linked_action: string | null;
  linked_ref: string | null;
  rolled_over_from: string | null;
  auto_rollover: boolean;
  original_date: string | null;
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

const PRIORITY_COLOR: Record<string, string> = {
  high:   "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  low:    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
};

const ROLLOVER_KEY = "planner_rollover_date";

export default function StudentDayPlanner() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<{ streak_days: number; longest_streak: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [skipDialog, setSkipDialog] = useState<Task | null>(null);
  const [showGuide, setShowGuide] = useState(false);

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
      supabase.from("student_rewards").select("streak_days, longest_streak").eq("user_id", user.id).maybeSingle(),
    ]);
    setTasks((t ?? []) as Task[]);
    setRewards(r as any);
    setLoading(false);
  };

  // First mount per day: rollover stale pending tasks + materialise upcoming recurrences
  useEffect(() => {
    if (!user) return;
    const today = todayStr();
    const stamp = typeof window !== "undefined" ? localStorage.getItem(ROLLOVER_KEY) : today;
    (async () => {
      if (stamp !== today) {
        try {
          await supabase.rpc("rollover_planner_tasks", { _user_id: user.id });
          await supabase.rpc("materialize_recurring_tasks", { _user_id: user.id });
        } catch (e) {
          // non-fatal
        }
        try { localStorage.setItem(ROLLOVER_KEY, today); } catch {}
      }
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const today = todayStr();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const todayTasks    = useMemo(() => tasks.filter((t) => t.scheduled_date === today), [tasks, today]);
  const yesterdayTasks= useMemo(() => tasks.filter((t) => t.scheduled_date === yesterday), [tasks, yesterday]);
  const tomorrowTasks = useMemo(() => tasks.filter((t) => t.scheduled_date === tomorrow), [tasks, tomorrow]);

  const completedToday = todayTasks.filter((t) => t.status === "completed").length;
  const todayPct = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const pendingToday = todayTasks.filter((t) => t.status !== "completed").length;
  const focusToday = todayTasks
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + (t.actual_minutes ?? t.estimated_minutes), 0);

  // ---------- Mutations ----------

  const upsertTask = async (v: TaskFormValue): Promise<void> => {
    if (!user) return;
    const series_id =
      v.recurrence === "none" ? null
      : (editing?.series_id ?? crypto.randomUUID());

    const payload: any = {
      user_id: user.id,
      title: v.title,
      description: v.description,
      category: v.category,
      priority: v.priority,
      scheduled_date: v.scheduled_date,
      scheduled_start_time: v.scheduled_start_time,
      estimated_minutes: v.estimated_minutes,
      recurrence: v.recurrence,
      recurrence_days: v.recurrence_days,
      recurrence_until: v.recurrence_until,
      auto_rollover: v.auto_rollover,
      linked_action: v.linked_action,
      linked_ref: v.linked_ref,
      series_id,
    };

    if (editing) {
      const { error } = await supabase.from("student_planner_tasks").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Task updated");
      setEditing(null);
    } else {
      payload.original_date = v.scheduled_date;
      payload.status = "pending";
      const { error } = await supabase.from("student_planner_tasks").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(v.recurrence === "none" ? "Task added" : "Recurring task scheduled");
    }

    if (v.recurrence !== "none") {
      try { await supabase.rpc("materialize_recurring_tasks", { _user_id: user.id }); } catch {}
    }
    load();
  };

  const setStatus = async (task: Task, status: string) => {
    const patch: any = { status };
    if (status === "completed") {
      patch.completed_at = new Date().toISOString();
      patch.actual_minutes = task.actual_minutes ?? task.estimated_minutes;
    } else if (status === "pending") {
      patch.completed_at = null;
    }
    const { error } = await supabase.from("student_planner_tasks").update(patch).eq("id", task.id);
    if (error) return toast.error(error.message);
    if (status === "completed") {
      try {
        await supabase.rpc("award_student_rewards", {
          _user_id: user!.id, _coins: 5, _xp: 20, _activity_today: true,
        });
      } catch {}
      toast.success("Nice! +20 XP");
    }
    load();
  };

  const moveToToday = async (task: Task) => {
    const { error } = await supabase
      .from("student_planner_tasks")
      .update({ scheduled_date: todayStr(), rolled_over_from: task.scheduled_date })
      .eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success("Moved to today");
    load();
  };

  const moveToTomorrow = async (task: Task) => {
    const { error } = await supabase
      .from("student_planner_tasks")
      .update({ scheduled_date: addDays(task.scheduled_date, 1) })
      .eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success("Pushed to tomorrow");
    load();
  };

  const skipPermanently = async (task: Task) => {
    if (task.series_id) {
      // Skip this single occurrence in the series
      await supabase.from("student_planner_skips").insert({
        user_id: user!.id, series_id: task.series_id, skipped_date: task.scheduled_date,
      });
    }
    await supabase.from("student_planner_tasks").delete().eq("id", task.id);
    toast.success("Skipped");
    setSkipDialog(null);
    load();
  };

  const deleteSeries = async (task: Task) => {
    if (!task.series_id) {
      await supabase.from("student_planner_tasks").delete().eq("id", task.id);
    } else {
      await supabase
        .from("student_planner_tasks")
        .delete()
        .eq("user_id", user!.id)
        .eq("series_id", task.series_id);
    }
    toast.success("Series removed");
    setSkipDialog(null);
    load();
  };

  const removeOne = async (task: Task) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("student_planner_tasks").delete().eq("id", task.id);
    load();
  };

  if (loading) return <div className="text-muted-foreground">Loading your planner…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-sky-600" /> My Day Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {fmtFullDate(today)} · plan, track and stay consistent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/student/day-planner/performance">
            <Button variant="outline" size="sm" className="gap-1.5">
              <TrendingUp className="h-4 w-4" /> Performance
            </Button>
          </Link>
          <Button onClick={() => { setEditing(null); setOpenCreate(true); }} className="bg-sky-600 hover:bg-sky-700">
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Today done" value={`${completedToday}/${todayTasks.length}`} hint={`${todayPct}%`} progress={todayPct} />
        <Kpi icon={<Clock className="h-4 w-4 text-sky-500" />} label="Pending today" value={String(pendingToday)} hint={pendingToday ? "Tap to complete" : "All clear"} />
        <Kpi icon={<Flame className="h-4 w-4 text-orange-500" />} label="Streak" value={`${rewards?.streak_days ?? 0}d`} hint={`Best ${rewards?.longest_streak ?? 0}d`} />
        <Kpi icon={<Activity className="h-4 w-4 text-violet-500" />} label="Today focus" value={`${Math.round(focusToday / 60 * 10) / 10}h`} hint={`${focusToday} min`} />
        <Kpi icon={<Trophy className="h-4 w-4 text-amber-500" />} label="Tomorrow" value={String(tomorrowTasks.length)} hint="Planned ahead" />
      </div>

      {/* Smart suggestions */}
      <PlannerSuggestions
        existingTitles={todayTasks.map((t) => t.title)}
        onAdded={load}
      />

      {/* Day tabs */}
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="yesterday">
            Yesterday
            {yesterdayTasks.filter((t) => t.status !== "completed").length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">
                {yesterdayTasks.filter((t) => t.status !== "completed").length} missed
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="today">
            Today
            {pendingToday > 0 && (
              <Badge className="ml-1.5 h-4 text-[10px] bg-sky-500 text-white">{pendingToday}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tomorrow">Tomorrow ({tomorrowTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="yesterday" className="space-y-2 mt-4">
          {yesterdayTasks.length === 0 ? (
            <EmptyDay label="Nothing scheduled yesterday." />
          ) : (
            <>
              {yesterdayTasks.filter((t) => t.status !== "completed").map((t) => (
                <TaskCard
                  key={t.id} task={t}
                  onStatus={setStatus}
                  onEdit={(task) => { setEditing(task); setOpenCreate(true); }}
                  onDelete={removeOne}
                  onSkip={(task) => setSkipDialog(task)}
                  extraActions={
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => moveToToday(t)}>
                      <ArrowRightCircle className="h-3 w-3" /> Move to today
                    </Button>
                  }
                />
              ))}
              {yesterdayTasks.filter((t) => t.status === "completed").length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Show {yesterdayTasks.filter((t) => t.status === "completed").length} completed
                  </summary>
                  <div className="space-y-2 mt-2">
                    {yesterdayTasks.filter((t) => t.status === "completed").map((t) => (
                      <TaskCard key={t.id} task={t} onStatus={setStatus} onEdit={() => {}} onDelete={removeOne} onSkip={() => {}} compact />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="today" className="space-y-2 mt-4">
          {todayTasks.length === 0 ? (
            <EmptyDay label="No tasks for today yet." onAdd={() => { setEditing(null); setOpenCreate(true); }} />
          ) : (
            <>
              {/* Pending first */}
              {todayTasks.filter((t) => t.status !== "completed").map((t) => (
                <TaskCard
                  key={t.id} task={t}
                  onStatus={setStatus}
                  onEdit={(task) => { setEditing(task); setOpenCreate(true); }}
                  onDelete={removeOne}
                  onSkip={(task) => setSkipDialog(task)}
                  extraActions={
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={() => moveToTomorrow(t)}>
                      <ArrowRightCircle className="h-3 w-3" /> Tomorrow
                    </Button>
                  }
                />
              ))}
              {todayTasks.filter((t) => t.status === "completed").length > 0 && (
                <div className="pt-3 mt-2 border-t border-dashed border-border space-y-2">
                  <div className="text-xs text-muted-foreground">Completed today</div>
                  {todayTasks.filter((t) => t.status === "completed").map((t) => (
                    <TaskCard key={t.id} task={t} onStatus={setStatus} onEdit={() => {}} onDelete={removeOne} onSkip={() => {}} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="tomorrow" className="space-y-2 mt-4">
          {tomorrowTasks.length === 0 ? (
            <EmptyDay label="Nothing planned for tomorrow." onAdd={() => { setEditing({ ...({} as Task), scheduled_date: tomorrow } as any); setOpenCreate(true); }} addLabel="Plan tomorrow" />
          ) : (
            tomorrowTasks.map((t) => (
              <TaskCard
                key={t.id} task={t}
                onStatus={setStatus}
                onEdit={(task) => { setEditing(task); setOpenCreate(true); }}
                onDelete={removeOne}
                onSkip={(task) => setSkipDialog(task)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create / edit dialog */}
      <PlannerTaskDialog
        open={openCreate}
        onOpenChange={(v) => { setOpenCreate(v); if (!v) setEditing(null); }}
        initial={editing ? {
          id: editing.id,
          title: editing.title ?? "",
          description: editing.description,
          category: editing.category,
          priority: editing.priority,
          scheduled_date: editing.scheduled_date,
          scheduled_start_time: editing.scheduled_start_time,
          estimated_minutes: editing.estimated_minutes,
          recurrence: (editing.recurrence ?? "none") as Recurrence,
          recurrence_days: editing.recurrence_days ?? [],
          recurrence_until: editing.recurrence_until,
          auto_rollover: editing.auto_rollover ?? true,
          linked_action: editing.linked_action,
          linked_ref: editing.linked_ref,
        } : undefined}
        onSubmit={upsertTask}
      />

      {/* Skip / series dialog */}
      <AlertDialog open={!!skipDialog} onOpenChange={(o) => !o && setSkipDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>What should we do with this task?</AlertDialogTitle>
            <AlertDialogDescription>
              {skipDialog?.series_id
                ? "This is part of a recurring series. Choose how to skip it."
                : "Choose how to remove this task."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => skipDialog && moveToTomorrow(skipDialog).then(() => setSkipDialog(null))}
            >
              <ArrowRightCircle className="h-4 w-4 text-sky-600" />
              <div className="text-left">
                <div className="text-sm font-medium">Move to next day</div>
                <div className="text-[11px] text-muted-foreground">Push this task forward by one day</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => skipDialog && skipPermanently(skipDialog)}
            >
              <SkipForward className="h-4 w-4 text-amber-600" />
              <div className="text-left">
                <div className="text-sm font-medium">Skip just this day</div>
                <div className="text-[11px] text-muted-foreground">
                  {skipDialog?.series_id ? "Removes this occurrence; future ones still appear" : "Removes this single task"}
                </div>
              </div>
            </Button>
            {skipDialog?.series_id && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-rose-600 border-rose-200"
                onClick={() => skipDialog && deleteSeries(skipDialog)}
              >
                <Trash2 className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">End the whole series</div>
                  <div className="text-[11px] text-muted-foreground">Removes this and all future occurrences</div>
                </div>
              </Button>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function Kpi({ icon, label, value, hint, progress }: { icon: React.ReactNode; label: string; value: string; hint?: string; progress?: number }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">{icon}<div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div></div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      {typeof progress === "number" && <Progress value={progress} className="h-1 mt-2" />}
    </Card>
  );
}

function EmptyDay({ label, onAdd, addLabel = "Add a task" }: { label: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <Card className="p-8 text-center">
      <CalendarDays className="h-8 w-8 mx-auto text-sky-500 mb-2" />
      <div className="text-sm text-muted-foreground mb-3">{label}</div>
      {onAdd && (
        <Button size="sm" onClick={onAdd} className="bg-sky-600 hover:bg-sky-700">
          <Plus className="h-3.5 w-3.5 mr-1" /> {addLabel}
        </Button>
      )}
    </Card>
  );
}

function actionLink(linked_action: string | null, linked_ref: string | null): string | null {
  if (!linked_action) return null;
  if (linked_action === "daily_test")       return "/student/daily-test";
  if (linked_action === "personalized_hub") return "/student/personalized-hub";
  if (linked_action === "mocks")            return "/student/mocks/full-length";
  if (linked_action === "mock" && linked_ref) return `/mocks/${linked_ref}`;
  return null;
}

interface CardProps {
  task: Task;
  onStatus: (t: Task, s: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onSkip: (t: Task) => void;
  extraActions?: React.ReactNode;
  compact?: boolean;
}

function TaskCard({ task, onStatus, onEdit, onDelete, onSkip, extraActions, compact }: CardProps) {
  const cat = CATEGORIES.find((c) => c.value === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const Icon = cat.icon;
  const done = task.status === "completed";
  const inProgress = task.status === "in_progress";
  const isPending = task.status === "pending";
  const recLabel = describeRecurrence(task.recurrence, task.recurrence_days);
  const link = actionLink(task.linked_action, task.linked_ref);

  return (
    <Card
      className={`p-3 sm:p-4 transition-shadow ${
        done ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20"
             : isPending ? "hover:shadow-sm border-l-4 border-l-sky-500"
             : "hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatus(task, done ? "pending" : "completed")}
          className={`mt-0.5 h-5 w-5 rounded-full border-2 grid place-items-center transition shrink-0 ${
            done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-sky-500"
          }`}
          aria-label="Toggle complete"
        >
          {done && <CheckCircle2 className="h-4 w-4 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </div>
              {task.description && !compact && (
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</div>
              )}
            </div>
            {!compact && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(task)} className="text-muted-foreground hover:text-sky-600 p-1" title="Edit">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(task)} className="text-muted-foreground hover:text-rose-600 p-1" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="outline" className="text-[10px] gap-1" style={{ borderColor: cat.color, color: cat.color }}>
              <Icon className="h-3 w-3" /> {cat.label}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLOR[task.priority] ?? ""}`}>{task.priority}</Badge>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> {fmtDate(task.scheduled_date)}
              {task.scheduled_start_time && ` · ${task.scheduled_start_time.slice(0, 5)}`}
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {task.estimated_minutes}m
            </span>
            {recLabel && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Repeat className="h-3 w-3" /> {recLabel}
              </Badge>
            )}
            {task.rolled_over_from && task.rolled_over_from !== task.scheduled_date && (
              <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                Rolled over
              </Badge>
            )}
            {inProgress && <Badge variant="outline" className="text-[10px] bg-sky-100 text-sky-700 border-sky-200">In progress</Badge>}
          </div>

          {!done && !compact && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {link && (
                <Link to={link}>
                  <Button size="sm" className="h-7 px-2 text-xs bg-sky-600 hover:bg-sky-700 gap-1">
                    <Sparkles className="h-3 w-3" /> Open
                    <ArrowRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </Link>
              )}
              {!inProgress ? (
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => onStatus(task, "in_progress")}>
                  <Play className="h-3 w-3" /> Start timer
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => onStatus(task, "pending")}>
                  <Pause className="h-3 w-3" /> Pause
                </Button>
              )}
              {extraActions}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => onSkip(task)}>
                Skip…
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
