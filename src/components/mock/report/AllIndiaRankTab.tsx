import { useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Award, BarChart3, Target, Trophy, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useMockBenchmarks } from "@/hooks/useMockBenchmarks";
import { ensureStudentMode, mockResultPath } from "@/lib/studentModeNav";

type Attempt = {
  id: string;
  test_id: string;
  total_score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  test?: { name?: string; exam_code?: string; test_type?: string } | null;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function AllIndiaRankTab({ attempts }: { attempts: Attempt[] }) {
  const firstAttempts = useMemo(() => {
    const map = new Map<string, Attempt>();
    attempts
      .filter((attempt) => attempt.submitted_at && (attempt.test?.test_type ?? "full_length") === "full_length")
      .slice()
      .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
      .forEach((attempt) => { if (!map.has(attempt.test_id)) map.set(attempt.test_id, attempt); });
    return [...map.values()].sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime());
  }, [attempts]);

  const { data: benchmarks = {}, isLoading } = useMockBenchmarks(firstAttempts.map((attempt) => attempt.test_id));
  const exams = useMemo(() => [...new Set(firstAttempts.map((attempt) => (attempt.test?.exam_code || "GEN").toUpperCase()))], [firstAttempts]);
  const [exam, setExam] = useState("ALL");
  const filtered = exam === "ALL" ? firstAttempts : firstAttempts.filter((attempt) => (attempt.test?.exam_code || "GEN").toUpperCase() === exam);
  const ranked = filtered.filter((attempt) => benchmarks[attempt.test_id]?.my_rank != null);
  const percentiles = ranked.map((attempt) => Number(benchmarks[attempt.test_id].my_percentile));
  const totalVerified = filtered.reduce((sum, attempt) => sum + Number(benchmarks[attempt.test_id]?.verified_students ?? 0), 0);
  const trend = ranked.slice().reverse().map((attempt, index) => ({
    name: `M${index + 1}`,
    percentile: Number(benchmarks[attempt.test_id].my_percentile ?? 0),
  }));

  if (!firstAttempts.length) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Complete a full-length mock to unlock verified cohort rankings.</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /><h3 className="text-lg font-bold">Verified Competition Board</h3></div>
              <p className="mt-1 max-w-xl text-sm text-slate-300">Ranks use one first completed attempt per student. Retakes cannot inflate participation or improve competitive standing.</p>
            </div>
            <Badge className="w-fit border-sky-500/30 bg-sky-500/15 text-sky-100">Live verified cohorts</Badge>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Verified entries" value={totalVerified.toLocaleString()} />
            <Metric label="Ranked mocks" value={`${ranked.length}/${filtered.length}`} />
            <Metric label="Best rank" value={ranked.length ? `#${Math.min(...ranked.map((a) => Number(benchmarks[a.test_id].my_rank)))}` : "Pending"} />
            <Metric label="Avg percentile" value={percentiles.length ? `${(percentiles.reduce((a, b) => a + b, 0) / percentiles.length).toFixed(1)}%ile` : "Pending"} />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {["ALL", ...exams].map((code) => <button key={code} onClick={() => setExam(code)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${exam === code ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{code === "ALL" ? `All (${firstAttempts.length})` : code}</button>)}
      </div>

      {trend.length > 1 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-sky-700" /> Verified percentile trend</div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Area type="monotone" dataKey="percentile" stroke="#0284c7" fill="#e0f2fe" strokeWidth={2} /></AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((attempt) => {
          const benchmark = benchmarks[attempt.test_id];
          const count = Number(benchmark?.verified_students ?? 0);
          return (
            <Card key={attempt.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{attempt.test?.name ?? "Mock"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString("en-IN") : "—"} · Score {attempt.total_score ?? 0}/{attempt.max_score ?? 0}</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800"><Users className="h-3.5 w-3.5" /> {count.toLocaleString()} verified student{count === 1 ? "" : "s"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Your rank" value={benchmark?.my_rank ? `#${benchmark.my_rank}` : "Pending"} />
                  <Metric label="Percentile" value={benchmark?.my_percentile == null ? "Pending" : `${Number(benchmark.my_percentile).toFixed(2)}`} />
                  <Metric label="Cohort avg" value={benchmark ? Number(benchmark.cohort_average).toFixed(1) : "—"} />
                  <Metric label="Top 10%" value={benchmark ? Number(benchmark.top_10_score).toFixed(1) : "—"} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="h-3.5 w-3.5" /> Difficulty: {benchmark?.difficulty ?? "Calculating"}{benchmark?.is_provisional ? " · Provisional until 30 verified students" : ""}</div>
                <Link to={mockResultPath(attempt.id)} onClick={ensureStudentMode} onPointerDown={ensureStudentMode} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"><Award className="h-3.5 w-3.5" /> Full report</Link>
              </div>
            </Card>
          );
        })}
      </div>
      {isLoading && <p className="text-center text-xs text-muted-foreground">Loading verified benchmarks…</p>}
      <p className="text-center text-xs text-muted-foreground">Participation counts include actual unique students only; no generated aspirants are displayed.</p>
    </div>
  );
}