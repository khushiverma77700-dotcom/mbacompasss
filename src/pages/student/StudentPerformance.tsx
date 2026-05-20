import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ensureStudentMode, mockResultPath } from "@/lib/studentModeNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useStudentPerformance } from "@/hooks/useStudentPerformance";

export default function StudentPerformance() {
  // Single source of truth — same engine used by Overview, Mocks, etc.
  const { submitted, loading } = useStudentPerformance();
  // Sort chronologically (the hook returns newest first)
  const attempts = useMemo(() => submitted.slice().reverse(), [submitted]);

  const trend = useMemo(
    () =>
      attempts.map((x, i) => ({
        name: `M${i + 1}`,
        percentile: Number(x.percentile || 0),
        score: Number(x.total_score || 0),
        accuracy: Number(x.accuracy || 0),
      })),
    [attempts]
  );

  const sectionalAvg = useMemo(() => {
    const sums: Record<string, { score: number; max: number; attempts: number }> = {};
    attempts.forEach((a) => {
      const s = (a.sectional_scores as any) || {};
      Object.entries(s).forEach(([code, v]: any) => {
        if (!sums[code]) sums[code] = { score: 0, max: 0, attempts: 0 };
        sums[code].score += Number(v?.score || 0);
        sums[code].max += Number(v?.max || v?.max_score || 0);
        sums[code].attempts += 1;
      });
    });
    const safe = (n: number) => (Number.isFinite(n) ? n : 0);
    return Object.entries(sums).map(([code, v]) => ({
      section: code,
      score: v.attempts > 0 ? Math.round(safe(v.score / v.attempts)) : 0,
      max: v.attempts > 0 ? Math.round(safe(v.max / v.attempts)) : 0,
    }));
  }, [attempts]);

  const radarData = useMemo(
    () =>
      sectionalAvg.map((s) => ({
        section: s.section,
        you: s.max ? Math.round((s.score / s.max) * 100) : 0,
        topper: 85,
      })),
    [sectionalAvg]
  );

  const correctVsIncorrect = useMemo(() => {
    const c = attempts.reduce((s, x) => s + (x.total_correct || 0), 0);
    const i = attempts.reduce((s, x) => s + (x.total_incorrect || 0), 0);
    const a = attempts.reduce((s, x) => s + (x.total_attempted || 0), 0);
    return [
      { name: "Correct", value: c },
      { name: "Incorrect", value: i },
      { name: "Skipped", value: Math.max(0, a - c - i) },
    ];
  }, [attempts]);

  if (loading) return <div className="text-muted-foreground">Loading performance…</div>;

  if (attempts.length === 0)
    return (
      <Card className="p-10 text-center">
        <h2 className="text-lg font-semibold mb-2">No completed mocks yet</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Submit your first mock to unlock detailed performance analytics, percentile trends, and AI insights.
        </p>
        <Link to="/student/mocks">
          <Button>Go to My Mocks</Button>
        </Link>
      </Card>
    );

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Performance Analytics</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">AI-powered insights across {attempts.length} completed mock{attempts.length > 1 ? "s" : ""}.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Percentile trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="p1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis domain={[0, 100]} fontSize={10} />
              <Tooltip />
              <Area type="monotone" dataKey="percentile" stroke="#0284c7" fill="url(#p1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Score & accuracy</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="score" stroke="#0284c7" strokeWidth={2} />
              <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Section-wise average</h2>
          {sectionalAvg.length === 0 ? (
            <div className="text-sm text-muted-foreground">No section data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectionalAvg} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="section" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="score" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-3 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">You vs Top performers</h2>
          {radarData.length === 0 ? (
            <div className="text-sm text-muted-foreground">No section data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e0f2fe" />
                <PolarAngleAxis dataKey="section" fontSize={10} />
                <PolarRadiusAxis fontSize={9} domain={[0, 100]} />
                <Radar name="You" dataKey="you" stroke="#0284c7" fill="#0284c7" fillOpacity={0.4} />
                <Radar name="Top performers" dataKey="topper" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-3 sm:p-5 lg:col-span-2">
          <h2 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Correct vs Incorrect vs Skipped</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={correctVsIncorrect} layout="vertical" margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis type="number" fontSize={10} />
              <YAxis type="category" dataKey="name" fontSize={11} width={70} />
              <Tooltip />
              <Bar dataKey="value" fill="#0284c7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-3 sm:p-5">
        <h2 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Mock-by-mock breakdown</h2>

        {/* Mobile: card list */}
        <div className="sm:hidden space-y-2">
          {attempts.slice().reverse().map((a) => (
            <Link
              key={a.id}
              to={mockResultPath(a.id)}
              onClick={ensureStudentMode}
              onPointerDown={ensureStudentMode}
              className="block rounded-lg border border-border/60 bg-card/50 p-3 active:bg-accent/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{a.test?.name ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-sky-700">{a.percentile ?? 0}<span className="text-[10px] font-normal text-muted-foreground"> %ile</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 text-[11px]">
                <div>
                  <div className="text-muted-foreground">Score</div>
                  <div className="font-semibold">{a.total_score ?? 0}/{a.max_score ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Accuracy</div>
                  <div className="font-semibold">{a.accuracy ?? 0}%</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 pr-3">Mock</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">%ile</th>
                <th className="py-2 pr-3">Accuracy</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {attempts.slice().reverse().map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{a.test?.name ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2 pr-3">{a.total_score ?? 0}/{a.max_score ?? 0}</td>
                  <td className="py-2 pr-3 font-semibold text-sky-700">{a.percentile ?? 0}</td>
                  <td className="py-2 pr-3">{a.accuracy ?? 0}%</td>
                  <td className="py-2 pr-3">
                    <Link to={mockResultPath(a.id)} onClick={ensureStudentMode} onPointerDown={ensureStudentMode} className="text-sky-700 hover:underline text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
