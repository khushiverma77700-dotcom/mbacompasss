import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Filter, ArrowDownAZ, Calendar, Trophy, Eye, Brain, Download } from "lucide-react";
import { ensureStudentMode, mockAttemptPath, mockResultPath } from "@/lib/studentModeNav";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Completed", auto_submitted: "Auto-submitted",
  in_progress: "In progress", abandoned: "Abandoned",
};

type SortKey = "date_desc" | "date_asc" | "score_desc" | "score_asc" | "percentile_desc" | "accuracy_desc";

export default function StudentAttempts() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [exam, setExam] = useState<string>("all");
  const [status, setStatus] = useState<string>("submitted");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [minScore, setMinScore] = useState<string>("");
  const [maxScore, setMaxScore] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("date_desc");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("mock_attempts")
        .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted, accuracy, sectional_scores, time_spent_seconds, test:mock_tests(name, slug, exam_code, category, test_type)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });
      setAttempts(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const examOptions = useMemo(() => {
    const set = new Set<string>();
    attempts.forEach(a => a.test?.exam_code && set.add(a.test.exam_code));
    return Array.from(set).sort();
  }, [attempts]);

  const filtered = useMemo(() => {
    let list = attempts.slice();
    if (status !== "all") {
      if (status === "submitted") list = list.filter(a => a.status === "submitted" || a.status === "auto_submitted");
      else list = list.filter(a => a.status === status);
    }
    if (exam !== "all") list = list.filter(a => a.test?.exam_code === exam);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(a => (a.test?.name ?? "").toLowerCase().includes(ql));
    }
    if (from) list = list.filter(a => a.started_at >= from);
    if (to) list = list.filter(a => a.started_at <= `${to}T23:59:59`);
    if (minScore) list = list.filter(a => Number(a.total_score ?? 0) >= Number(minScore));
    if (maxScore) list = list.filter(a => Number(a.total_score ?? 0) <= Number(maxScore));

    const cmp = (a: any, b: any, k: string, dir: 1 | -1) =>
      ((Number(a[k] ?? 0) - Number(b[k] ?? 0)) * dir);
    switch (sort) {
      case "date_asc": list.sort((a,b)=>new Date(a.started_at).getTime()-new Date(b.started_at).getTime()); break;
      case "date_desc": list.sort((a,b)=>new Date(b.started_at).getTime()-new Date(a.started_at).getTime()); break;
      case "score_desc": list.sort((a,b)=>cmp(a,b,"total_score",-1)); break;
      case "score_asc": list.sort((a,b)=>cmp(a,b,"total_score",1)); break;
      case "percentile_desc": list.sort((a,b)=>cmp(a,b,"percentile",-1)); break;
      case "accuracy_desc": list.sort((a,b)=>cmp(a,b,"accuracy",-1)); break;
    }
    return list;
  }, [attempts, q, exam, status, from, to, minScore, maxScore, sort]);

  // Group by exam_code (sectioned wise)
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(a => {
      const k = a.test?.exam_code || "Other";
      (g[k] ||= []).push(a);
    });
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const totals = useMemo(() => {
    const s = filtered.filter(a => a.status === "submitted" || a.status === "auto_submitted");
    const score = s.reduce((x,a)=>x+Number(a.total_score||0),0);
    const max = s.reduce((x,a)=>x+Number(a.max_score||0),0);
    const pct = s.length ? Math.round(s.reduce((x,a)=>x+Number(a.percentile||0),0)/s.length*10)/10 : 0;
    const acc = s.length ? Math.round(s.reduce((x,a)=>x+Number(a.accuracy||0),0)/s.length) : 0;
    return { count: s.length, score, max, pct, acc };
  }, [filtered]);

  const exportCsv = () => {
    const rows = [
      ["Date","Mock","Exam","Status","Score","Max","%","Percentile","Accuracy","Attempted","Correct"],
      ...filtered.map(a => [
        new Date(a.started_at).toISOString().slice(0,10),
        a.test?.name ?? "",
        a.test?.exam_code ?? "",
        STATUS_LABEL[a.status] ?? a.status,
        a.total_score ?? "",
        a.max_score ?? "",
        a.max_score ? Math.round((Number(a.total_score||0)/Number(a.max_score))*100) : "",
        a.percentile ?? "",
        a.accuracy ?? "",
        a.total_attempted ?? "",
        a.total_correct ?? "",
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mock-attempts-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setQ(""); setExam("all"); setStatus("submitted"); setFrom(""); setTo("");
    setMinScore(""); setMaxScore(""); setSort("date_desc");
  };

  if (loading) return <div className="text-muted-foreground">Loading attempts…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="h-6 w-6 text-sky-600" /> Previous Attempts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All mocks you've attempted, grouped by exam with full filters.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Attempts (filtered)" value={totals.count} />
        <Tile label="Avg Percentile" value={totals.pct} />
        <Tile label="Avg Accuracy" value={`${totals.acc}%`} />
        <Tile label="Total Score" value={`${totals.score} / ${totals.max}`} />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Filter className="h-4 w-4 text-sky-600" /> Filters</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="text-xs text-muted-foreground">Search mock name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. CAT Mock 5" className="pl-8" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Exam</label>
            <Select value={exam} onValueChange={setExam}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All exams</SelectItem>
                {examOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="submitted">Completed</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min score</label>
            <Input type="number" value={minScore} onChange={e => setMinScore(e.target.value)} placeholder="e.g. 80" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max score</label>
            <Input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)} placeholder="e.g. 200" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownAZ className="h-3 w-3" /> Sort by</label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest first</SelectItem>
                <SelectItem value="date_asc">Oldest first</SelectItem>
                <SelectItem value="score_desc">Highest score</SelectItem>
                <SelectItem value="score_asc">Lowest score</SelectItem>
                <SelectItem value="percentile_desc">Highest percentile</SelectItem>
                <SelectItem value="accuracy_desc">Best accuracy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={reset} className="w-full">Reset filters</Button>
          </div>
        </div>
      </Card>

      {/* Grouped results */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Trophy className="h-10 w-10 mx-auto text-sky-300 mb-3" />
          <div className="font-medium">No attempts match these filters</div>
          <div className="text-sm text-muted-foreground mt-1">Try widening the date range or clearing filters.</div>
        </Card>
      ) : (
        grouped.map(([code, list]) => (
          <Card key={code} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-100">{code}</Badge>
                <span className="text-sm text-muted-foreground font-normal">{list.length} attempt{list.length>1?"s":""}</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Mock</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Score</th>
                    <th className="py-2 pr-3 text-right">%ile</th>
                    <th className="py-2 pr-3 text-right">Accuracy</th>
                    <th className="py-2 pr-3 text-right">Attempted</th>
                    <th className="py-2 pr-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-sky-50/30">
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        {new Date(a.started_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 pr-3 truncate max-w-xs">{a.test?.name ?? "Mock"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary" className={
                          a.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-100"
                          : a.status === "abandoned" ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {a.status === "in_progress" ? "—" : <>{a.total_score ?? 0}<span className="text-muted-foreground">/{a.max_score ?? 0}</span></>}
                      </td>
                      <td className="py-2 pr-3 text-right">{a.percentile ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{a.accuracy != null ? `${a.accuracy}%` : "—"}</td>
                      <td className="py-2 pr-3 text-right">{a.total_attempted ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex justify-end gap-1">
                          {a.status === "in_progress" ? (
                            <Link to={mockAttemptPath(a.id)} onClick={ensureStudentMode} onPointerDown={ensureStudentMode}><Button size="sm">Resume</Button></Link>
                          ) : (
                            <>
                              <Link to={mockResultPath(a.id)} onClick={ensureStudentMode} onPointerDown={ensureStudentMode}><Button size="sm" variant="outline" className="gap-1"><Eye className="h-3 w-3" />Result</Button></Link>
                              <Link to={`/student/analysis/${a.id}`}><Button size="sm" variant="ghost" className="gap-1"><Brain className="h-3 w-3" />AI</Button></Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: any }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-bold text-sky-700">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}
