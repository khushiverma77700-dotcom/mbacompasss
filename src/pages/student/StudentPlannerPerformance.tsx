import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, CalendarRange, CheckCircle2, Flame, Clock, Target,
  TrendingUp, Activity, Trophy,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { format, subDays } from "date-fns";

type Range = "7d" | "30d" | "90d" | "custom";

const CATEGORY_COLOR: Record<string, string> = {
  mock: "#0ea5e9", sectional: "#10b981", varc: "#f59e0b",
  qa: "#8b5cf6", dilr: "#ec4899", revision: "#14b8a6",
  gk: "#f97316", custom: "#6366f1",
};
const CATEGORY_LABEL: Record<string, string> = {
  mock: "Full Mock", sectional: "Sectional", varc: "VARC",
  qa: "Quant", dilr: "DILR", revision: "Revision", gk: "GK / Reading", custom: "Custom",
};

interface Task {
  scheduled_date: string;
  status: string;
  category: string;
  estimated_minutes: number;
  actual_minutes: number | null;
  completed_at: string | null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const dateStr = (d: Date) => d.toISOString().slice(0, 10);

export default function StudentPlannerPerformance() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 14));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = dateStr(subDays(new Date(), 120));
      const { data } = await supabase
        .from("student_planner_tasks")
        .select("scheduled_date, status, category, estimated_minutes, actual_minutes, completed_at")
        .eq("user_id", user.id)
        .gte("scheduled_date", since)
        .order("scheduled_date", { ascending: true });
      setTasks((data ?? []) as Task[]);
      setLoading(false);
    })();
  }, [user]);

  // Range bounds
  const { from, to } = useMemo(() => {
    if (range === "custom" && customFrom && customTo) {
      return { from: dateStr(customFrom), to: dateStr(customTo) };
    }
    const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
    return { from: dateStr(subDays(new Date(), days)), to: todayStr() };
  }, [range, customFrom, customTo]);

  const inRange = useMemo(
    () => tasks.filter((t) => t.scheduled_date >= from && t.scheduled_date <= to),
    [tasks, from, to],
  );

  // KPIs
  const planned = inRange.length;
  const done = inRange.filter((t) => t.status === "completed").length;
  const completionPct = planned ? Math.round((done / planned) * 100) : 0;
  const focusMins = inRange
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + (t.actual_minutes ?? t.estimated_minutes), 0);

  // Streak math (over all loaded tasks)
  const { current: currentStreak, longest: longestStreak, activeDays } = useMemo(() => {
    const doneByDay: Record<string, boolean> = {};
    tasks.forEach((t) => {
      if (t.status === "completed") doneByDay[t.scheduled_date] = true;
    });
    // current
    let cur = 0;
    const d = new Date();
    while (true) {
      if (doneByDay[dateStr(d)]) { cur++; d.setDate(d.getDate() - 1); } else break;
    }
    // longest
    const dates = Object.keys(doneByDay).sort();
    let longest = 0, run = 0, prev: Date | null = null;
    for (const ds of dates) {
      const cd = new Date(ds + "T00:00:00");
      if (prev && cd.getTime() - prev.getTime() === 86400000) run++;
      else run = 1;
      longest = Math.max(longest, run);
      prev = cd;
    }
    // active days in range
    const setRange = new Set(Object.keys(doneByDay).filter((d) => d >= from && d <= to));
    return { current: cur, longest, activeDays: setRange.size };
  }, [tasks, from, to]);

  // Trend chart data — one row per day in range
  const trend = useMemo(() => {
    const out: { date: string; planned: number; done: number; mins: number }[] = [];
    const startD = new Date(from + "T00:00:00");
    const endD = new Date(to + "T00:00:00");
    const totalDays = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startD);
      d.setDate(startD.getDate() + i);
      const ds = dateStr(d);
      const dayTasks = inRange.filter((t) => t.scheduled_date === ds);
      const dayDone = dayTasks.filter((t) => t.status === "completed");
      out.push({
        date: format(d, totalDays > 31 ? "d MMM" : "d/M"),
        planned: dayTasks.length,
        done: dayDone.length,
        mins: dayDone.reduce((s, x) => s + (x.actual_minutes ?? x.estimated_minutes), 0),
      });
    }
    return out;
  }, [inRange, from, to]);

  // Category mix
  const catMix = useMemo(() => {
    const map: Record<string, number> = {};
    inRange.forEach((t) => {
      if (t.status !== "completed") return;
      map[t.category] = (map[t.category] ?? 0) + (t.actual_minutes ?? t.estimated_minutes);
    });
    return Object.entries(map)
      .map(([k, v]) => ({ name: CATEGORY_LABEL[k] ?? k, value: v, color: CATEGORY_COLOR[k] ?? "#6366f1" }))
      .sort((a, b) => b.value - a.value);
  }, [inRange]);

  // Best & hardest weekday (over all tasks, by completion %)
  const weekdayStats = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ planned: 0, done: 0 }));
    tasks.forEach((t) => {
      const dow = new Date(t.scheduled_date + "T00:00:00").getDay();
      buckets[dow].planned++;
      if (t.status === "completed") buckets[dow].done++;
    });
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const rows = buckets.map((b, i) => ({
      day: labels[i],
      pct: b.planned ? Math.round((b.done / b.planned) * 100) : 0,
      planned: b.planned,
    })).filter((r) => r.planned > 0);
    if (!rows.length) return { best: null, worst: null, rows: [] };
    const sorted = [...rows].sort((a, b) => b.pct - a.pct);
    return { best: sorted[0], worst: sorted[sorted.length - 1], rows };
  }, [tasks]);

  // 12-week heatmap (all loaded tasks)
  const heatmap = useMemo(() => {
    const cells: { date: string; mins: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const ds = dateStr(d);
      const mins = tasks
        .filter((t) => t.scheduled_date === ds && t.status === "completed")
        .reduce((s, x) => s + (x.actual_minutes ?? x.estimated_minutes), 0);
      cells.push({ date: ds, mins });
    }
    return cells;
  }, [tasks]);
  const heatColor = (m: number) =>
    m === 0 ? "bg-muted" :
    m < 30 ? "bg-sky-200 dark:bg-sky-500/30" :
    m < 60 ? "bg-sky-400 dark:bg-sky-500/50" :
    m < 120 ? "bg-sky-500 dark:bg-sky-500/70" : "bg-sky-700 dark:bg-sky-400";

  if (loading) return <div className="text-muted-foreground">Loading performance…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <Link to="/student/day-planner" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to planner
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <Activity className="h-6 w-6 text-sky-600" />
            Planner Performance
          </h1>
          <p className="text-sm text-muted-foreground">
            Track consistency, completion rate and where your study time goes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList>
              <TabsTrigger value="7d">Week</TabsTrigger>
              <TabsTrigger value="30d">Month</TabsTrigger>
              <TabsTrigger value="90d">Quarter</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
          {range === "custom" && (
            <div className="flex items-center gap-1.5">
              <DatePopover label="From" value={customFrom} onChange={setCustomFrom} />
              <DatePopover label="To" value={customTo} onChange={setCustomTo} />
            </div>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Completion" value={`${completionPct}%`} hint={`${done} of ${planned} tasks`} />
        <Kpi icon={<Flame className="h-4 w-4 text-orange-500" />} label="Current streak" value={`${currentStreak}d`} hint={`Best ${longestStreak}d`} />
        <Kpi icon={<Trophy className="h-4 w-4 text-violet-500" />} label="Active days" value={`${activeDays}`} hint="In selected range" />
        <Kpi icon={<Clock className="h-4 w-4 text-sky-500" />} label="Focus time" value={`${Math.round(focusMins / 60 * 10) / 10}h`} hint={`${focusMins} min total`} />
        <Kpi icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Tasks/day avg" value={planned ? (planned / Math.max(trend.length, 1)).toFixed(1) : "0"} hint="Planned daily" />
      </div>

      {/* Trend + focus */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Planned vs completed</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="planned" stroke="hsl(var(--muted-foreground))" fill="url(#gPlan)" />
              <Area type="monotone" dataKey="done" stroke="#0ea5e9" fill="url(#gDone)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Focus minutes per day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="mins" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Time by subject</h3>
          {catMix.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Complete some tasks to see your subject mix.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={catMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {catMix.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v} min`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Weekday completion %</h3>
          {weekdayStats.rows.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Not enough data yet.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekdayStats.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="pct" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {weekdayStats.best && weekdayStats.worst && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="text-emerald-600">Strongest: <b>{weekdayStats.best.day} ({weekdayStats.best.pct}%)</b></span>
                  <span className="text-rose-600">Hardest: <b>{weekdayStats.worst.day} ({weekdayStats.worst.pct}%)</b></span>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* 12-week heatmap */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-sky-600" /> Consistency heatmap (last 12 weeks)
        </h3>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
          {heatmap.map((c) => (
            <div
              key={c.date}
              title={`${c.date} • ${c.mins} min`}
              className={cn("h-3.5 w-3.5 rounded-sm shrink-0", heatColor(c.mins))}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          Less
          <span className="h-3 w-3 rounded-sm bg-muted" />
          <span className="h-3 w-3 rounded-sm bg-sky-200 dark:bg-sky-500/30" />
          <span className="h-3 w-3 rounded-sm bg-sky-400 dark:bg-sky-500/50" />
          <span className="h-3 w-3 rounded-sm bg-sky-500 dark:bg-sky-500/70" />
          <span className="h-3 w-3 rounded-sm bg-sky-700 dark:bg-sky-400" />
          More
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">{icon}<div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div></div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function DatePopover({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <CalendarRange className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">{label}: {value ? format(value, "d MMM") : "—"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
