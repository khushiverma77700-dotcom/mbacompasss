import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Trophy, Lock, Sparkles, ChevronDown, ChevronUp, TrendingUp,
  Crown, Medal, Award, Target, Users, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ensureStudentMode, mockResultPath } from "@/lib/studentModeNav";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

type Attempt = {
  id: string;
  test_id: string;
  total_score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  test?: { name?: string; exam_code?: string; test_type?: string } | null;
};

type LeaderRow = { rank: number; name: string; score: number; is_self?: boolean; is_real?: boolean };

type RankResult = {
  locked: boolean;
  unlocks_at?: string;
  projected_air?: number;
  air_bucket?: string;
  projected_percentile?: number;
  students_ahead?: number;
  students_behind?: number;
  topper_score?: number;
  difficulty?: string;
  sectional?: Record<string, any>;
  pool_size?: number;
  real_pool_size?: number;
  leaderboard?: { top: LeaderRow[]; window: LeaderRow[]; my_rank: number; pool_size: number };
  reason?: string;
  message?: string;
};

function fmtCountdown(target: string) {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "Unlocking…";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function useProjectedAir(attemptId: string) {
  const [data, setData] = useState<RankResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: res, error: err } = await supabase.functions.invoke("projected-air", {
          body: { attempt_id: attemptId },
        });
        if (!alive) return;
        if (err) { setError(err.message || "Could not load rank"); return; }
        setData((res as RankResult) ?? null);
      } catch (e: any) {
        if (alive) setError(e?.message || "Could not load rank");
      }
    })();
    return () => { alive = false; };
  }, [attemptId]);
  return { data, error };
}

function Podium({ top }: { top: LeaderRow[] }) {
  const [r1, r2, r3] = [top[0], top[1], top[2]];
  const seat = (r: LeaderRow | undefined, h: string, ring: string, icon: any, accent: string) => {
    const Icon = icon;
    if (!r) return <div />;
    return (
      <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div className={cn("w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center shadow-sm", ring)}>
          <Icon className={cn("h-5 w-5", accent)} />
        </div>
        <div className="text-[11px] font-semibold truncate max-w-full text-center">{r.name}</div>
        <div className="text-[10px] text-muted-foreground">AIR {r.rank}</div>
        <div className={cn("w-full rounded-t-md bg-gradient-to-t flex items-end justify-center text-white font-bold text-xs pb-1", h)}>
          {r.score.toFixed(0)}
        </div>
      </div>
    );
  };
  return (
    <div className="grid grid-cols-3 gap-2 items-end">
      {seat(r2, "h-12 from-slate-300 to-slate-400", "border-slate-300", Medal, "text-slate-500")}
      {seat(r1, "h-16 from-amber-300 to-amber-500", "border-amber-400", Crown, "text-amber-600")}
      {seat(r3, "h-10 from-orange-300 to-orange-500", "border-orange-400", Award, "text-orange-600")}
    </div>
  );
}

function LeaderTable({ rows, label }: { rows: LeaderRow[]; label: string }) {
  if (!rows?.length) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="rounded-lg border border-sky-100 overflow-hidden">
        {rows.map((r) => (
          <div
            key={`${r.rank}-${r.name}`}
            className={cn(
              "grid grid-cols-[50px_1fr_70px] items-center px-2.5 py-1.5 text-xs border-b last:border-0",
              r.is_self ? "bg-sky-100 font-semibold text-sky-900" : "bg-white"
            )}
          >
            <div className="font-mono text-[11px]">
              {r.rank <= 3 ? (
                <span className="inline-flex items-center gap-1">
                  {r.rank === 1 && <Crown className="h-3 w-3 text-amber-500" />}
                  {r.rank === 2 && <Medal className="h-3 w-3 text-slate-400" />}
                  {r.rank === 3 && <Award className="h-3 w-3 text-orange-500" />}
                  #{r.rank}
                </span>
              ) : <>#{r.rank}</>}
            </div>
            <div className="truncate flex items-center gap-1.5">
              {r.name}
              {r.is_self && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">You</Badge>}
            </div>
            <div className="text-right font-mono tabular-nums">{r.score.toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-sky-100 bg-white p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-bold", accent ?? "text-foreground")}>{value}</div>
    </div>
  );
}

function AttemptCard({ attempt }: { attempt: Attempt }) {
  const { data, error } = useProjectedAir(attempt.id);
  const [open, setOpen] = useState(false);

  const submittedFmt = attempt.submitted_at
    ? new Date(attempt.submitted_at).toLocaleDateString()
    : "—";

  if (error) {
    return (
      <Card className="p-4 border-amber-200 bg-amber-50/50">
        <div className="font-semibold text-sm truncate">{attempt.test?.name ?? "Mock"}</div>
        <div className="text-[11px] text-amber-700 mt-1">Projected AIR temporarily unavailable. {error}</div>
      </Card>
    );
  }
  if (!data) return <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>;

  if (data.locked) {
    return (
      <Card className="p-4 border-sky-100 bg-gradient-to-br from-white to-sky-50/40">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-semibold truncate">{attempt.test?.name ?? "Mock"}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Submitted {submittedFmt} · Score {attempt.total_score ?? 0}/{attempt.max_score ?? 0}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sky-700">
            <Lock className="h-4 w-4" />
            <div className="text-sm font-semibold">
              Unlocks in {data.unlocks_at ? fmtCountdown(data.unlocks_at) : "7 days"}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          All India Rank is finalized 7 days after submission, once the benchmark cohort is locked.
        </p>
      </Card>
    );
  }

  const lb = data.leaderboard;
  const sectional = Object.entries(data.sectional ?? {});

  return (
    <Card className="p-4 border-sky-100">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold truncate">{attempt.test?.name ?? "Mock"}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Submitted {submittedFmt} · Score {attempt.total_score ?? 0}/{attempt.max_score ?? 0} · {data.difficulty}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your All India Rank</div>
          <div className="text-3xl font-extrabold text-sky-700 leading-none">
            #{data.projected_air?.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            out of {data.pool_size?.toLocaleString()} aspirants
          </div>
        </div>
      </div>

      {/* Position bar — visualize where the student stands */}
      {data.pool_size && data.projected_air ? (
        <div className="mt-3 rounded-lg border border-sky-100 bg-gradient-to-r from-amber-50 via-white to-sky-50 p-2.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Topper</span>
            <span className="font-semibold text-sky-800">
              You stand at position {data.projected_air.toLocaleString()} of {data.pool_size.toLocaleString()}
            </span>
            <span>Last</span>
          </div>
          <div className="relative h-2 rounded-full bg-sky-100 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-sky-500 to-emerald-500"
              style={{ width: `${Math.min(100, Math.max(2, ((data.pool_size - data.projected_air) / data.pool_size) * 100))}%` }}
            />
            <div
              className="absolute -top-1 h-4 w-1 bg-sky-900 rounded"
              style={{ left: `calc(${Math.min(100, Math.max(0, ((data.projected_air - 1) / Math.max(1, data.pool_size - 1)) * 100))}% - 2px)` }}
              title={`Rank #${data.projected_air}`}
            />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        <Stat label="Percentile" value={`${data.projected_percentile?.toFixed(2)}%ile`} accent="text-emerald-600" />
        <Stat label="Students Ahead" value={(data.students_ahead ?? 0).toLocaleString()} />
        <Stat label="Students Behind" value={(data.students_behind ?? 0).toLocaleString()} />
        <Stat label="Gap from Topper" value={`${Math.max(0, Number(data.topper_score ?? 0) - Number(attempt.total_score ?? 0)).toFixed(0)}`} />
      </div>

      {lb?.top?.length ? (
        <div className="mt-4 rounded-lg bg-gradient-to-br from-amber-50 via-white to-sky-50 border border-amber-100 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Crown className="h-3.5 w-3.5 text-amber-600" />
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Top 3 Rankers</div>
          </div>
          <Podium top={lb.top.slice(0, 3)} />
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-[11px] text-sky-700 hover:underline inline-flex items-center gap-1"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {open ? "Hide" : "Show"} full leaderboard & sectional AIR
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {lb && (
            <div className="grid md:grid-cols-2 gap-3">
              <LeaderTable rows={lb.top} label="Top 10 Nationally" />
              <LeaderTable rows={lb.window} label="Around You (±5)" />
            </div>
          )}

          {sectional.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sectional Projected AIR</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {sectional.map(([k, v]: any) => (
                  <div key={k} className="rounded border border-sky-100 bg-sky-50/40 p-2">
                    <div className="text-[11px] font-semibold text-sky-800">{v.section ?? k}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {v.air_bucket} · {v.projected_percentile?.toFixed(1)}% · {v.difficulty}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/40">
        <Badge variant="secondary" className="text-[10px]">
          Benchmark pool: {data.pool_size?.toLocaleString()} aspirants ({data.real_pool_size} real)
        </Badge>
        <Link
          to={mockResultPath(attempt.id)}
          onClick={ensureStudentMode}
          onPointerDown={ensureStudentMode}
          className="text-[11px] text-sky-700 hover:underline"
        >
          View full report →
        </Link>
      </div>
    </Card>
  );
}

export default function AllIndiaRankTab({ attempts }: { attempts: Attempt[] }) {
  // AIR only for full-length mocks, and only the FIRST submitted attempt per test
  const sorted = useMemo(() => {
    const fullLength = attempts.filter(
      (a) => !!a.submitted_at && (a.test?.test_type ?? "full_length") === "full_length"
    );
    // Keep earliest submitted attempt per test_id
    const firstByTest = new Map<string, Attempt>();
    fullLength
      .slice()
      .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
      .forEach((a) => {
        if (!firstByTest.has(a.test_id)) firstByTest.set(a.test_id, a);
      });
    // Display newest first
    return Array.from(firstByTest.values()).sort(
      (a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime()
    );
  }, [attempts]);

  // Exam filter — only exams the student has actually attempted (== purchased)
  const examOptions = useMemo(() => {
    const set = new Map<string, number>();
    sorted.forEach((a) => {
      const k = (a.test?.exam_code || "GEN").toUpperCase();
      set.set(k, (set.get(k) ?? 0) + 1);
    });
    return Array.from(set.entries()).map(([code, count]) => ({ code, count }));
  }, [sorted]);

  const [exam, setExam] = useState<string>("ALL");
  const filtered = useMemo(
    () => (exam === "ALL" ? sorted : sorted.filter((a) => (a.test?.exam_code || "GEN").toUpperCase() === exam)),
    [sorted, exam]
  );

  // Fetch ranks for all visible attempts to compute KPIs + cumulative chart
  const [rankMap, setRankMap] = useState<Record<string, RankResult>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = filtered.map((a) => a.id);
      const results = await Promise.all(
        ids.map(async (id) => {
          if (rankMap[id]) return [id, rankMap[id]] as const;
          try {
            const { data } = await supabase.functions.invoke("projected-air", { body: { attempt_id: id } });
            return [id, data as RankResult] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      if (!alive) return;
      setRankMap((prev) => {
        const next = { ...prev };
        results.forEach(([id, v]) => { if (v) next[id] = v; });
        return next;
      });
    })();
    return () => { alive = false; };
  }, [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const unlockedAttempts = filtered.filter((a) => {
    const r = rankMap[a.id];
    return r && !r.locked && r.projected_air;
  });

  // KPIs across unlocked attempts
  const kpis = useMemo(() => {
    if (unlockedAttempts.length === 0) {
      return { bestAir: "—", avgAir: "—", avgPctile: "—", topper: "—" };
    }
    const airs = unlockedAttempts.map((a) => rankMap[a.id].projected_air!);
    const pcts = unlockedAttempts.map((a) => rankMap[a.id].projected_percentile ?? 0);
    const bestAir = Math.min(...airs);
    const avgAir = Math.round(airs.reduce((s, x) => s + x, 0) / airs.length);
    const avgPctile = +(pcts.reduce((s, x) => s + x, 0) / pcts.length).toFixed(1);
    return {
      bestAir: bestAir.toLocaleString(),
      avgAir: avgAir.toLocaleString(),
      avgPctile: `${avgPctile}%`,
      topper: `${unlockedAttempts.length}/${filtered.length}`,
    };
  }, [unlockedAttempts, rankMap, filtered.length]);

  // Cumulative trend (oldest → newest)
  const trend = useMemo(() => {
    const chrono = unlockedAttempts.slice().reverse();
    let bestSoFar = Infinity;
    let pctSum = 0;
    return chrono.map((a, i) => {
      const r = rankMap[a.id];
      const air = r.projected_air ?? 0;
      bestSoFar = Math.min(bestSoFar, air);
      pctSum += r.projected_percentile ?? 0;
      return {
        name: `M${i + 1}`,
        air,
        bestAir: bestSoFar,
        percentile: +(r.projected_percentile ?? 0).toFixed(1),
        avgPercentile: +(pctSum / (i + 1)).toFixed(1),
        score: a.total_score ?? 0,
      };
    });
  }, [unlockedAttempts, rankMap]);

  return (
    <div className="space-y-4">
      {/* HERO */}
      <Card className="p-4 bg-gradient-to-br from-sky-50 via-white to-amber-50/40 border-sky-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-700" />
              <h3 className="font-bold text-base">National Ranking Engine</h3>
              <Badge variant="secondary" className="text-[10px]">AI-powered</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-md">
              Projected All India Rank benchmarked against a 2,000-aspirant pool. Stable seed — never changes on refresh.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 min-w-[280px]">
            <Stat label="Best AIR" value={kpis.bestAir} accent="text-amber-600" />
            <Stat label="Avg AIR" value={kpis.avgAir} accent="text-sky-700" />
            <Stat label="Avg %ile" value={kpis.avgPctile} accent="text-emerald-600" />
            <Stat label="Unlocked" value={kpis.topper} />
          </div>
        </div>
      </Card>

      {/* EXAM FILTER (purchased only — derived from attempts) */}
      {examOptions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground mr-1">Exam:</span>
          <button
            onClick={() => setExam("ALL")}
            className={cn(
              "text-[11px] px-2.5 py-1 rounded-full border transition",
              exam === "ALL" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-sky-200 hover:bg-sky-50"
            )}
          >
            All ({sorted.length})
          </button>
          {examOptions.map((o) => (
            <button
              key={o.code}
              onClick={() => setExam(o.code)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition",
                exam === o.code ? "bg-sky-600 text-white border-sky-600" : "bg-white border-sky-200 hover:bg-sky-50"
              )}
            >
              {o.code} ({o.count})
            </button>
          ))}
        </div>
      )}

      {/* CUMULATIVE CHARTS */}
      {trend.length >= 2 && (
        <div className="grid lg:grid-cols-2 gap-3">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-4 w-4 text-sky-700" />
              <h4 className="font-semibold text-sm">AIR Progression</h4>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} reversed />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="air" stroke="#0284c7" strokeWidth={2} name="AIR (per mock)" />
                <Line type="monotone" dataKey="bestAir" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" name="Best AIR (cumulative)" />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-1">Lower is better. Dashed line = your personal best so far.</p>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h4 className="font-semibold text-sm">Percentile Trend</h4>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="pctFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="percentile" stroke="#10b981" fill="url(#pctFill)" strokeWidth={2} name="Percentile" />
                <Line type="monotone" dataKey="avgPercentile" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 3" name="Avg %ile" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* MOCK-WISE CARDS */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="h-6 w-6 mx-auto text-sky-600 mb-2" />
          <div className="text-sm font-semibold">No submitted mocks yet{exam !== "ALL" ? ` for ${exam}` : ""}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Submit a mock to unlock your Projected All India Rank in 7 days.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-sky-700" />
            <h4 className="font-semibold text-sm">Mock-wise Analysis</h4>
            <Badge variant="secondary" className="text-[10px] ml-1">{filtered.length} mocks</Badge>
          </div>
          {filtered.map((a) => <AttemptCard key={a.id} attempt={a} />)}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center pt-1">
        <Users className="h-3 w-3" /> Stable seeded benchmark — rankings do not change on refresh.
      </div>
    </div>
  );
}
