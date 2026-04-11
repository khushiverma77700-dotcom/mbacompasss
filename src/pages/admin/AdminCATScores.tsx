import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator, Download, Search, Users, TrendingUp, Target, Award,
  BarChart3, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

interface CATSubmission {
  id: string;
  candidate_name: string;
  application_no: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  total_score: number;
  max_score: number;
  estimated_percentile: number;
  total_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
  negative_marks: number;
  varc_score: number;
  varc_attempted: number;
  varc_correct: number;
  varc_incorrect: number;
  varc_accuracy: number;
  dilr_score: number;
  dilr_attempted: number;
  dilr_correct: number;
  dilr_incorrect: number;
  dilr_accuracy: number;
  qa_score: number;
  qa_attempted: number;
  qa_correct: number;
  qa_incorrect: number;
  qa_accuracy: number;
  sections_data: any;
  questions_data: any;
  created_at: string;
  test_date: string | null;
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const AdminCATScores = () => {
  const [submissions, setSubmissions] = useState<CATSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CATSubmission | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 25;

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("cat_score_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      setSubmissions((data as any[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter(
      (s) =>
        s.candidate_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
    );
  }, [submissions, search]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const stats = useMemo(() => {
    if (!submissions.length) return null;
    const scores = submissions.map((s) => s.total_score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const avgAccuracy = submissions.reduce((a, b) => a + (b.accuracy || 0), 0) / submissions.length;
    return { total: submissions.length, avg: avg.toFixed(1), highest, lowest, avgAccuracy: avgAccuracy.toFixed(1) };
  }, [submissions]);

  // Score distribution histogram
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { label: "<0", min: -999, max: 0 },
      { label: "0-25", min: 0, max: 25 },
      { label: "25-50", min: 25, max: 50 },
      { label: "50-75", min: 50, max: 75 },
      { label: "75-100", min: 75, max: 100 },
      { label: "100-130", min: 100, max: 130 },
      { label: "130-160", min: 130, max: 160 },
      { label: "160+", min: 160, max: 999 },
    ];
    return ranges.map((r) => ({
      range: r.label,
      count: submissions.filter((s) => s.total_score >= r.min && s.total_score < r.max).length,
    }));
  }, [submissions]);

  // Section averages
  const sectionAvg = useMemo(() => {
    if (!submissions.length) return [];
    const n = submissions.length;
    return [
      {
        section: "VARC",
        avgScore: parseFloat((submissions.reduce((a, b) => a + (b.varc_score || 0), 0) / n).toFixed(1)),
        avgAccuracy: parseFloat((submissions.reduce((a, b) => a + (b.varc_accuracy || 0), 0) / n).toFixed(1)),
      },
      {
        section: "DILR",
        avgScore: parseFloat((submissions.reduce((a, b) => a + (b.dilr_score || 0), 0) / n).toFixed(1)),
        avgAccuracy: parseFloat((submissions.reduce((a, b) => a + (b.dilr_accuracy || 0), 0) / n).toFixed(1)),
      },
      {
        section: "QA",
        avgScore: parseFloat((submissions.reduce((a, b) => a + (b.qa_score || 0), 0) / n).toFixed(1)),
        avgAccuracy: parseFloat((submissions.reduce((a, b) => a + (b.qa_accuracy || 0), 0) / n).toFixed(1)),
      },
    ];
  }, [submissions]);

  // Daily trends
  const dailyTrends = useMemo(() => {
    const byDate: Record<string, { count: number; totalScore: number }> = {};
    submissions.forEach((s) => {
      const d = new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (!byDate[d]) byDate[d] = { count: 0, totalScore: 0 };
      byDate[d].count++;
      byDate[d].totalScore += s.total_score;
    });
    return Object.entries(byDate)
      .slice(-14)
      .map(([date, v]) => ({ date, count: v.count, avgScore: parseFloat((v.totalScore / v.count).toFixed(1)) }));
  }, [submissions]);

  const downloadCSV = () => {
    const headers = [
      "Name", "Email", "Phone", "State", "Test Date", "Total Score", "Max Score", "Percentile",
      "Total Qs", "Attempted", "Correct", "Incorrect", "Accuracy%", "Negative Marks",
      "VARC Score", "VARC Acc%", "DILR Score", "DILR Acc%", "QA Score", "QA Acc%", "Date",
    ];
    const rows = filtered.map((s) => [
      s.candidate_name, s.email || "", s.phone || "", s.state || "", s.test_date || "",
      s.total_score, s.max_score, s.estimated_percentile,
      s.total_questions, s.attempted, s.correct, s.incorrect, s.accuracy?.toFixed(1), s.negative_marks,
      s.varc_score, s.varc_accuracy?.toFixed(1), s.dilr_score, s.dilr_accuracy?.toFixed(1),
      s.qa_score, s.qa_accuracy?.toFixed(1), new Date(s.created_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cat-scores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="w-6 h-6" /> CAT Score Submissions
        </h1>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Students", value: stats.total, icon: Users, color: "text-blue-500" },
            { label: "Avg Score", value: stats.avg, icon: TrendingUp, color: "text-emerald-500" },
            { label: "Highest Score", value: stats.highest, icon: Award, color: "text-amber-500" },
            { label: "Lowest Score", value: stats.lowest, icon: Target, color: "text-red-500" },
            { label: "Avg Accuracy", value: `${stats.avgAccuracy}%`, icon: BarChart3, color: "text-purple-500" },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Section-wise Avg Score & Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectionAvg}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="section" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="avgScore" name="Avg Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgAccuracy" name="Avg Accuracy %" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Submissions & Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="count" name="Submissions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="avgScore" name="Avg Score" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Percentile</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-center">VARC</TableHead>
                <TableHead className="text-center">DILR</TableHead>
                <TableHead className="text-center">QA</TableHead>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.candidate_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell className="text-sm">{s.phone || "—"}</TableCell>
                  <TableCell className="text-center font-bold">{s.total_score}</TableCell>
                  <TableCell className="text-center">{s.estimated_percentile}</TableCell>
                  <TableCell className="text-center">{s.accuracy?.toFixed(1)}%</TableCell>
                  <TableCell className="text-center text-blue-600">{s.varc_score}</TableCell>
                  <TableCell className="text-center text-emerald-600">{s.dilr_score}</TableCell>
                  <TableCell className="text-center text-amber-600">{s.qa_score}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No submissions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              {filtered.length} total • Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Score Details — {selected?.candidate_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Name", selected.candidate_name],
                  ["Email", selected.email || "—"],
                  ["Phone", selected.phone || "—"],
                  ["State", selected.state || "—"],
                  ["Test Date", selected.test_date || "—"],
                  ["Application No", selected.application_no || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="text-muted-foreground">{k}: </span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Score", value: `${selected.total_score}/${selected.max_score}`, color: "text-blue-600" },
                  { label: "Percentile", value: selected.estimated_percentile, color: "text-purple-600" },
                  { label: "Accuracy", value: `${selected.accuracy?.toFixed(1)}%`, color: "text-emerald-600" },
                ].map((c) => (
                  <Card key={c.label}>
                    <CardContent className="pt-3 pb-2 px-3 text-center">
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Attempted</TableHead>
                    <TableHead className="text-center">Correct</TableHead>
                    <TableHead className="text-center">Incorrect</TableHead>
                    <TableHead className="text-center">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { s: "VARC", sc: selected.varc_score, at: selected.varc_attempted, co: selected.varc_correct, inc: selected.varc_incorrect, ac: selected.varc_accuracy },
                    { s: "DILR", sc: selected.dilr_score, at: selected.dilr_attempted, co: selected.dilr_correct, inc: selected.dilr_incorrect, ac: selected.dilr_accuracy },
                    { s: "QA", sc: selected.qa_score, at: selected.qa_attempted, co: selected.qa_correct, inc: selected.qa_incorrect, ac: selected.qa_accuracy },
                  ].map((r) => (
                    <TableRow key={r.s}>
                      <TableCell className="font-medium">{r.s}</TableCell>
                      <TableCell className="text-center font-bold">{r.sc}</TableCell>
                      <TableCell className="text-center">{r.at}</TableCell>
                      <TableCell className="text-center text-emerald-600">{r.co}</TableCell>
                      <TableCell className="text-center text-red-600">{r.inc}</TableCell>
                      <TableCell className="text-center">{r.ac?.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-center font-bold">{selected.total_score}</TableCell>
                    <TableCell className="text-center font-bold">{selected.attempted}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600">{selected.correct}</TableCell>
                    <TableCell className="text-center font-bold text-red-600">{selected.incorrect}</TableCell>
                    <TableCell className="text-center font-bold">{selected.accuracy?.toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="text-xs text-muted-foreground">
                Negative marks: -{selected.negative_marks} • Submitted: {new Date(selected.created_at).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCATScores;
