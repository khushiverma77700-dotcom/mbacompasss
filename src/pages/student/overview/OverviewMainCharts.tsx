import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, CalendarDays, Timer, Trophy } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, Legend,
  ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

type Props = {
  strengthMatrix: any[];
  outcomeData: { name: string; value: number; color: string }[];
  accuracy: number;
  weekdayPerf: any[];
  paceTrend: any[];
  bestVsAvg: any[];
};

function OverviewMainCharts({ strengthMatrix, outcomeData, accuracy, weekdayPerf, paceTrend, bestVsAvg }: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Strength / Weakness Quadrant */}
      <Card className="p-5 border-sky-100/70">
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-sky-600" /> Strength vs Effort Matrix
          </h2>
          <Badge variant="secondary" className="text-xs">By section</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Top-right = mastered. Bottom-right = high effort, low accuracy — focus here.
        </p>
        {strengthMatrix.length === 0 ? (
          <div className="h-56 grid place-items-center text-sm text-muted-foreground">No sectional data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 30% 92%)" />
              <XAxis type="number" dataKey="x" name="Avg attempted" tick={{ fontSize: 11, fill: "hsl(215 16% 45%)" }} />
              <YAxis type="number" dataKey="y" name="Accuracy" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215 16% 45%)" }} />
              <ZAxis type="number" dataKey="z" range={[80, 400]} />
              <ReferenceLine y={60} stroke="hsl(160 60% 50%)" strokeDasharray="4 4" />
              <RTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-xs">
                      <div className="font-semibold">{d.name}</div>
                      <div>Accuracy: <b>{d.y}%</b></div>
                      <div>Avg attempted: <b>{d.x}</b></div>
                    </div>
                  );
                }}
              />
              <Scatter data={strengthMatrix} fill="hsl(200 95% 50%)">
                {strengthMatrix.map((d, i) => (
                  <Cell key={i} fill={d.y >= 60 ? "hsl(160 70% 45%)" : d.y >= 40 ? "hsl(40 95% 55%)" : "hsl(0 75% 60%)"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {strengthMatrix.slice(0, 6).map((s) => (
            <span key={s.name} className="text-xs px-2 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-slate-700">
              <b>{s.short}</b> · {s.name}
            </span>
          ))}
        </div>
      </Card>

      {/* Question Outcome Donut */}
      <Card className="p-5 border-sky-100/70">
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Question Outcome Mix
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Aggregate of every question you've attempted across submitted mocks.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3} stroke="white" strokeWidth={2}>
                {outcomeData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <RTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const total = outcomeData.reduce((s, x) => s + x.value, 0) || 1;
                  return (
                    <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-xs">
                      <div className="font-semibold" style={{ color: d.color }}>{d.name}</div>
                      <div>{d.value} questions · {Math.round((d.value / total) * 100)}%</div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {outcomeData.map((d) => {
              const total = outcomeData.reduce((s, x) => s + x.value, 0) || 1;
              return (
                <div key={d.name} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                      <span className="font-medium">{d.name}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(d.value / total) * 100}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground pt-1">
              Overall accuracy: <b className="text-slate-800">{accuracy}%</b>
            </div>
          </div>
        </div>
      </Card>

      {/* Day-of-week performance */}
      <Card className="p-5 border-sky-100/70">
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <CalendarDays className="h-4 w-4 text-sky-600" /> Best Day to Attempt
        </h2>
        <p className="text-xs text-muted-foreground mb-3">Average score % and accuracy by weekday of submission.</p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={weekdayPerf} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="weekdayFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(200 95% 55%)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(200 95% 55%)" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 30% 92%)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(215 16% 45%)" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215 16% 45%)" }} />
            <RTooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-xs">
                    <div className="font-semibold">{label}</div>
                    <div>Score %: <b>{d.pct}</b></div>
                    <div>Accuracy: <b>{d.accuracy}%</b></div>
                    <div>Mocks: {d.count}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="pct" name="Score %" fill="url(#weekdayFill)" radius={[6, 6, 0, 0]} barSize={22} />
            <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="hsl(160 70% 42%)" strokeWidth={2} dot={{ r: 3 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Pace Trend */}
      <Card className="p-5 border-sky-100/70">
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <Timer className="h-4 w-4 text-sky-600" /> Pace Trend (sec / question)
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Time spent per attempted question across your last 10 mocks. Lower with stable accuracy = sharper exam temperament.
        </p>
        {paceTrend.length === 0 ? (
          <div className="h-48 grid place-items-center text-sm text-muted-foreground">No timed data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={paceTrend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(265 80% 60%)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(265 80% 60%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 30% 92%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215 16% 45%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 45%)" }} />
              <RTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-xs">
                      <div className="font-semibold">{label}</div>
                      <div>Sec/Q: <b>{d.secPerQ}</b></div>
                      <div>Accuracy: <b>{d.accuracy}%</b></div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="secPerQ" name="Sec / Q" stroke="hsl(265 80% 55%)" fill="url(#paceFill)" strokeWidth={2} />
              <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="hsl(160 70% 42%)" strokeWidth={2} dot={{ r: 2 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Best vs Avg Percentile per section */}
      {bestVsAvg.length > 0 && (
        <Card className="p-5 border-sky-100/70 lg:col-span-2">
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" /> Best vs Average Percentile
            </h2>
            <Badge variant="secondary" className="text-xs">Per section</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            The gap between your peak and average reveals how much headroom you still have in each section.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(220, bestVsAvg.length * 44)}>
            <ComposedChart layout="vertical" data={bestVsAvg} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 30% 92%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215 16% 45%)" }} />
              <YAxis type="category" dataKey="short" width={48} tick={{ fontSize: 11, fill: "hsl(215 16% 35%)", fontWeight: 600 }} />
              <ReferenceLine x={90} stroke="hsl(160 70% 42%)" strokeDasharray="4 4" />
              <RTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-xs">
                      <div className="font-semibold">{d.name}</div>
                      <div>Best percentile: <b>{d.best}</b></div>
                      <div>Avg percentile: <b>{d.avg}</b></div>
                      <div>Headroom: <b>{Math.max(0, d.best - d.avg)}</b></div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avg" name="Avg %ile" fill="hsl(200 95% 60%)" radius={[0, 6, 6, 0]} barSize={14} />
              <Bar dataKey="best" name="Best %ile" fill="hsl(265 80% 60%)" radius={[0, 6, 6, 0]} barSize={14} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

export default memo(OverviewMainCharts);
