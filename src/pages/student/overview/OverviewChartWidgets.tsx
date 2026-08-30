import { memo } from "react";
import { Flame } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, RadialBarChart, RadialBar, BarChart,
} from "recharts";

export const MiniTrendChart = memo(function MiniTrendChart({ data, barKey, lineKey, max, target }: { data: any[]; barKey: string; lineKey?: string; max?: number; target?: number }) {
  const rows = data.slice(-12);
  if (rows.length === 0) {
    return (
      <div className="h-[260px] w-full rounded-lg border border-border bg-card/60 grid place-items-center text-xs text-muted-foreground">
        No data yet — submit a mock to see your trend
      </div>
    );
  }
  const isPct = max === 100;
  const fmt = (v: any) => `${typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(1)) : v}${isPct ? "%" : ""}`;
  const gradId = `g-${barKey}-${lineKey ?? "n"}`;
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.85} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis domain={max ? [0, max] : ["auto", "auto"]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}${isPct ? "%" : ""}`} />
          <RTooltip
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "0 8px 24px -8px rgba(2,132,199,0.25)" }}
            formatter={(v: any, n: any) => [fmt(v), n === barKey ? "This mock" : "Running average"]}
            labelFormatter={(l) => `Mock ${l}`}
          />
          {target && target > 0 && (
            <ReferenceLine y={target} stroke="hsl(var(--primary))" strokeDasharray="6 6" label={{ value: `Target ${target}${isPct ? "%" : ""}`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }} />
          )}
          <Bar dataKey={barKey} fill={`url(#${gradId})`} radius={[6, 6, 0, 0]} maxBarSize={42} />
          {lineKey && (
            <Line type="monotone" dataKey={lineKey} stroke="hsl(190 90% 35%)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(190 90% 35%)" }} activeDot={{ r: 5 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export const MiniDistribution = memo(function MiniDistribution({ data }: { data: any[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="g-dist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
          <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: any) => [`${v} mock${Number(v) === 1 ? "" : "s"}`, "Count"]} />
          <Bar dataKey="count" fill="url(#g-dist)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const OverallPerformanceRadar = memo(function OverallPerformanceRadar({ data }: { data: { metric: string; value: number }[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 18, bottom: 8, left: 18 }}>
          <defs>
            <linearGradient id="g-radar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
              <stop offset="100%" stopColor="hsl(190 90% 45%)" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
          <Radar dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g-radar)" fillOpacity={0.85} />
          <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: any) => [`${v}/100`, "Score"]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const XpProgress = memo(function XpProgress({ xp, level, streak, rank }: { xp: number; level: number; streak: number; rank: number | null }) {
  const needed = level * 250;
  const current = xp % needed || (xp > 0 ? xp : 0);
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 0;
  const ringData = [{ name: "xp", value: pct, fill: "hsl(38 95% 55%)" }];
  return (
    <div className="space-y-3">
      <div className="h-[160px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={ringData} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Level</div>
            <div className="text-3xl font-bold text-amber-600 leading-none">{level}</div>
            <div className="text-xs text-muted-foreground mt-1">{current}/{needed} XP</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total XP</div>
          <div className="text-sm font-bold text-amber-700 tabular-nums">{xp.toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-lg bg-rose-50 border border-rose-100 p-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Streak</div>
          <div className="text-sm font-bold text-rose-600 tabular-nums inline-flex items-center gap-1">
            <Flame className="h-3 w-3" /> {streak}d
          </div>
        </div>
        <div className="rounded-lg bg-sky-50 border border-sky-100 p-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Rank</div>
          <div className="text-sm font-bold text-sky-700 tabular-nums">{rank ? `#${rank}` : "—"}</div>
        </div>
      </div>
    </div>
  );
});
