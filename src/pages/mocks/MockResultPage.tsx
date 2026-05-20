import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ChevronRight, Trophy } from "lucide-react";
import { toast } from "sonner";

import KPIGrid from "@/components/mock/report/KPIGrid";
import ComparisonPanel from "@/components/mock/report/ComparisonPanel";
import SectionWiseCards, { SectionRow } from "@/components/mock/report/SectionWiseCards";
import QuestionLevelTable, { QRow } from "@/components/mock/report/QuestionLevelTable";
import TimeManagementCharts from "@/components/mock/report/TimeManagementCharts";
import StrategyClassifier from "@/components/mock/report/StrategyClassifier";
import DifficultyAnalysis, { DiffRow } from "@/components/mock/report/DifficultyAnalysis";
import PeerBenchmark from "@/components/mock/report/PeerBenchmark";
import StrengthsWeaknesses, { TopicRow } from "@/components/mock/report/StrengthsWeaknesses";
import ProgressTrend, { TrendPoint } from "@/components/mock/report/ProgressTrend";
import AIAnalysisPanel from "@/components/mock/report/AIAnalysisPanel";
import { isStudentMode, mockLeaderboardPath, mockReviewPath, studentBackToMocksPath } from "@/lib/studentModeNav";

export default function MockResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [peerAttempts, setPeerAttempts] = useState<any[]>([]);
  const [historyAttempts, setHistoryAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: a } = await supabase.from("mock_attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!a) { navigate(isStudentMode() ? studentBackToMocksPath() : "/mocks", { replace: true }); return; }
      const [{ data: t }, { data: secs }, { data: rsp }, { data: peers }] = await Promise.all([
        supabase.from("mock_tests").select("*").eq("id", a.test_id).maybeSingle(),
        supabase.from("mock_sections").select("*").eq("test_id", a.test_id).order("sort_order"),
        supabase.from("mock_responses").select("*").eq("attempt_id", a.id),
        supabase.from("mock_attempts")
          .select("id, user_id, total_score, max_score, accuracy, percentile, total_attempted, total_correct")
          .eq("test_id", a.test_id).in("status", ["submitted", "auto_submitted"]),
      ]);
      const qIds = (rsp ?? []).map((r: any) => r.question_id);
      let qs: any[] = [];
      if (qIds.length) {
        const { data: qd } = await supabase
          .from("mock_questions")
          .select("id, section_id, question_number, topic, subtopic, difficulty, question_type, positive_marks")
          .in("id", qIds);
        qs = qd ?? [];
      }
      setAttempt(a);
      setTest(t);
      setSections(secs ?? []);
      setResponses(rsp ?? []);
      setQuestions(qs);
      setPeerAttempts(peers ?? []);

      // Progress history (same exam_code, same user, last 5)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && t?.exam_code) {
        const { data: hist } = await supabase.from("mock_attempts")
          .select("id, total_score, max_score, accuracy, percentile, submitted_at, test_id, mock_tests!inner(exam_code, name)")
          .eq("user_id", user.id)
          .in("status", ["submitted", "auto_submitted"])
          .eq("mock_tests.exam_code", t.exam_code)
          .order("submitted_at", { ascending: false })
          .limit(5);
        setHistoryAttempts((hist ?? []).reverse());
      }
      setLoading(false);
    })();
  }, [attemptId, navigate]);

  // ==== Derived data ====
  const sectionalScores: Record<string, any> = attempt?.sectional_scores ?? {};
  const topicBreakdown: Record<string, any> = attempt?.topic_breakdown ?? {};
  const qById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const sectionRows: SectionRow[] = useMemo(() => {
    return sections.map((sec) => {
      const ss = sectionalScores[sec.id] || {};
      const total = sec.total_questions || 0;
      const attempted = ss.attempted ?? 0;
      const correct = ss.correct ?? 0;
      const incorrect = ss.incorrect ?? 0;
      // section time
      const timeSec = responses
        .filter((r) => r.section_id === sec.id)
        .reduce((a, r) => a + Number(r.time_spent_seconds ?? 0), 0);
      const idealSec = (sec.duration_minutes ?? 0) * 60;
      return {
        id: sec.id,
        code: sec.code || sec.name,
        name: sec.name,
        score: ss.score ?? 0,
        max: ss.max ?? (total * (sec.positive_marks ?? 3)),
        attempted, correct, incorrect,
        unattempted: Math.max(0, total - attempted),
        timeSec, idealSec,
      };
    });
  }, [sections, sectionalScores, responses]);

  const topicRows: TopicRow[] = useMemo(() =>
    Object.entries(topicBreakdown).map(([topic, t]: any) => ({
      topic,
      attempted: t.attempted ?? 0,
      correct: t.correct ?? 0,
      accuracy: t.attempted ? Math.round((t.correct / t.attempted) * 100) : 0,
    })).sort((a, b) => b.attempted - a.attempted), [topicBreakdown]);

  const difficultyRows: DiffRow[] = useMemo(() => {
    const m: Record<string, { attempted: number; correct: number; total: number }> = {};
    for (const q of questions) {
      const d = (q.difficulty || "unknown");
      if (!m[d]) m[d] = { attempted: 0, correct: 0, total: 0 };
      m[d].total += 1;
    }
    for (const r of responses) {
      const q = qById.get(r.question_id);
      if (!q) continue;
      const d = q.difficulty || "unknown";
      if (!m[d]) m[d] = { attempted: 0, correct: 0, total: 0 };
      if (r.status === "answered" || r.status === "answered_marked") {
        m[d].attempted += 1;
        if (r.is_correct) m[d].correct += 1;
      }
    }
    return ["easy", "moderate", "hard", "unknown"]
      .filter((k) => m[k])
      .map((k) => ({
        difficulty: k.charAt(0).toUpperCase() + k.slice(1),
        attempted: m[k].attempted,
        correct: m[k].correct,
        total: m[k].total,
        accuracy: m[k].attempted ? Math.round((m[k].correct / m[k].attempted) * 100) : 0,
      }));
  }, [responses, questions, qById]);

  const qRows: QRow[] = useMemo(() => {
    const sectionMap = new Map(sections.map((s) => [s.id, s.code || s.name]));
    return responses
      .map((r, i) => {
        const q = qById.get(r.question_id);
        const status: QRow["status"] =
          r.is_correct === true ? "correct" :
          r.is_correct === false ? "incorrect" : "skipped";
        const time = Number(r.time_spent_seconds ?? 0);
        const tags: string[] = [];
        const ideal = (q?.difficulty === "easy" ? 60 : q?.difficulty === "hard" ? 150 : 100);
        if (status === "incorrect" && time < 30) tags.push("silly mistake");
        if (status === "incorrect" && time > ideal * 1.5) tags.push("conceptual");
        if (status === "skipped" && q?.difficulty === "easy") tags.push("missed easy");
        if (status === "correct" && time > ideal * 1.5) tags.push("slow win");
        return {
          qNum: q?.question_number ?? i + 1,
          sectionCode: sectionMap.get(r.section_id) || "—",
          difficulty: q?.difficulty || "unknown",
          topic: q?.topic ?? null,
          status,
          timeSec: time,
          idealSec: ideal,
          tags,
        };
      })
      .sort((a, b) => a.qNum - b.qNum);
  }, [responses, qById, sections]);

  // Time management
  const perSectionTime = useMemo(() => sectionRows.map((s) => {
    const corr = responses.filter((r) => r.section_id === s.id && r.is_correct === true).reduce((a, r) => a + Number(r.time_spent_seconds ?? 0), 0);
    const wrong = responses.filter((r) => r.section_id === s.id && r.is_correct === false).reduce((a, r) => a + Number(r.time_spent_seconds ?? 0), 0);
    const skipped = responses.filter((r) => r.section_id === s.id && r.is_correct === null).reduce((a, r) => a + Number(r.time_spent_seconds ?? 0), 0);
    return {
      name: s.code,
      correctTime: Math.round(corr / 60),
      wrongTime: Math.round(wrong / 60),
      skippedTime: Math.round(skipped / 60),
    };
  }), [sectionRows, responses]);

  const histogram = useMemo(() => {
    const buckets = [
      { bucket: "0-30s", min: 0, max: 30, count: 0 },
      { bucket: "30-60s", min: 30, max: 60, count: 0 },
      { bucket: "1-2m", min: 60, max: 120, count: 0 },
      { bucket: "2-3m", min: 120, max: 180, count: 0 },
      { bucket: "3-5m", min: 180, max: 300, count: 0 },
      { bucket: "5m+", min: 300, max: 99999, count: 0 },
    ];
    responses.forEach((r) => {
      const t = Number(r.time_spent_seconds ?? 0);
      if (t === 0) return;
      const b = buckets.find((x) => t >= x.min && t < x.max);
      if (b) b.count++;
    });
    return buckets.map(({ bucket, count }) => ({ bucket, count }));
  }, [responses]);

  const speedAcc = useMemo(() => {
    const win = 5;
    const seq = qRows.map((r) => ({ t: r.timeSec, c: r.status === "correct" ? 1 : 0, attempted: r.status !== "skipped" ? 1 : 0 }));
    const out: Array<{ idx: number; speedSec: number; accuracy: number }> = [];
    for (let i = win - 1; i < seq.length; i++) {
      const slice = seq.slice(i - win + 1, i + 1);
      const totT = slice.reduce((a, x) => a + x.t, 0);
      const totC = slice.reduce((a, x) => a + x.c, 0);
      const totA = slice.reduce((a, x) => a + x.attempted, 0);
      out.push({
        idx: i + 1,
        speedSec: Math.round(totT / win),
        accuracy: totA ? Math.round((totC / totA) * 100) : 0,
      });
    }
    return out;
  }, [qRows]);

  // Peer stats
  const peerStats = useMemo(() => {
    if (peerAttempts.length < 2) return null;
    const scores = peerAttempts.map((p: any) => Number(p.total_score ?? 0)).sort((a, b) => b - a);
    const top10 = scores[Math.max(0, Math.floor(scores.length * 0.1) - 1)] ?? scores[0];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const topper = scores[0];
    const scatter = peerAttempts.map((p: any) => ({
      attempts: Number(p.total_attempted ?? 0),
      accuracy: Number(p.accuracy ?? 0),
      isMe: p.id === attempt?.id,
    }));
    return {
      myScore: Number(attempt?.total_score ?? 0),
      myAccuracy: Number(attempt?.accuracy ?? 0),
      myAttempts: Number(attempt?.total_attempted ?? 0),
      avg, top10, topper, count: scores.length, scatter,
    };
  }, [peerAttempts, attempt]);

  // Strategy
  const totalQuestions = useMemo(() => sections.reduce((a, s) => a + (s.total_questions || 0), 0), [sections]);
  const attemptRate = totalQuestions > 0 ? Math.round((Number(attempt?.total_attempted ?? 0) / totalQuestions) * 100) : 0;
  const sectionStrategyPoints = sectionRows.map((s) => ({
    name: s.code,
    attemptRate: (s.attempted + s.unattempted) > 0 ? Math.round((s.attempted / (s.attempted + s.unattempted)) * 100) : 0,
    accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
  }));

  // Progress trend
  const trendPoints: TrendPoint[] = useMemo(() => historyAttempts.map((h: any, i: number) => ({
    label: `M${i + 1}`,
    score: Number(h.total_score ?? 0),
    accuracy: Number(h.accuracy ?? 0),
    percentile: Number(h.percentile ?? 0),
  })), [historyAttempts]);

  const totalTimeSec = useMemo(() => responses.reduce((a, r) => a + Number(r.time_spent_seconds ?? 0), 0), [responses]);
  const allowedTimeSec = (test?.total_duration_minutes ?? 0) * 60;

  async function downloadPDF() {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = (html2canvasMod as any).default ?? html2canvasMod;
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH; let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`${test?.name?.replace(/[^a-z0-9]/gi, "_") || "mock"}_report.pdf`);
      toast.success("Report downloaded");
    } catch (e: any) {
      toast.error("PDF export failed", { description: e?.message });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!attempt) return <div className="p-8">Not found</div>;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-sky-50/30 min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link
            to={isStudentMode() ? studentBackToMocksPath() : "/mocks"}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> {isStudentMode() ? "Back to dashboard" : "All mocks"}
          </Link>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={downloadPDF} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" />
              {downloading ? "Preparing PDF…" : "Download Full Report"}
            </Button>
            <Button variant="outline" onClick={() => navigate(mockReviewPath(attempt.id))}>
              Question Review
            </Button>
            {test?.slug && (
              <Button variant="outline" onClick={() => navigate(mockLeaderboardPath(test.slug))}>
                Leaderboard
              </Button>
            )}
          </div>
        </div>

        <div ref={reportRef} className="space-y-6 bg-white p-4 md:p-6 rounded-xl border">
          {/* Header */}
          <Card className="p-6 bg-gradient-to-br from-sky-50 via-white to-white border-sky-200">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <Badge variant="secondary" className="mb-2">
                  {test?.category?.replace("_", " ").toUpperCase() || "MOCK TEST"} · {test?.exam_code}
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{test?.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Detailed performance report · {new Date(attempt.submitted_at ?? attempt.created_at).toLocaleString()}
                </p>
                {attempt.auto_submitted_reason && (
                  <Badge variant="destructive" className="mt-3">Auto-submitted: {attempt.auto_submitted_reason}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sky-700">
                <Trophy className="h-6 w-6" />
                <div className="text-3xl font-bold">{attempt.percentile ?? 0}<span className="text-sm font-normal text-muted-foreground"> %ile</span></div>
              </div>
            </div>
          </Card>

          {/* 1. Overall summary */}
          <Section title="1. Overall Performance Summary">
            <KPIGrid data={{
              totalScore: Number(attempt.total_score ?? 0),
              maxScore: Number(attempt.max_score ?? 0),
              percentile: Number(attempt.percentile ?? 0),
              accuracy: Number(attempt.accuracy ?? 0),
              attempted: Number(attempt.total_attempted ?? 0),
              totalQuestions,
              timeUsedSec: totalTimeSec,
              totalTimeSec: allowedTimeSec,
            }} />
          </Section>

          {/* 2. Performance comparison */}
          <Section title="2. Performance Comparison">
            <ComparisonPanel stats={peerStats} />
          </Section>

          {/* 3. Section-wise */}
          <Section title="3. Section-Wise Analysis">
            <SectionWiseCards rows={sectionRows} />
          </Section>

          {/* 4. Question-level */}
          <Section title="4. Question-Level Analysis">
            <QuestionLevelTable rows={qRows} />
          </Section>

          {/* 5. Time management */}
          <Section title="5. Time Management">
            <TimeManagementCharts perSection={perSectionTime} histogram={histogram} speedAcc={speedAcc} />
          </Section>

          {/* 6. Strategy */}
          <Section title="6. Attempt Strategy">
            <StrategyClassifier
              attemptRate={attemptRate}
              accuracy={Number(attempt.accuracy ?? 0)}
              sectionPoints={sectionStrategyPoints}
            />
          </Section>

          {/* 7. Difficulty */}
          <Section title="7. Difficulty Analysis">
            <DifficultyAnalysis rows={difficultyRows} />
          </Section>

          {/* 8. Peer benchmarking */}
          <Section title="8. Peer Benchmarking">
            <PeerBenchmark stats={peerStats ? { myScore: peerStats.myScore, avg: peerStats.avg, top10: peerStats.top10, topper: peerStats.topper } : null} />
          </Section>

          {/* 9. Strengths & Weaknesses */}
          <Section title="9. Strengths & Weaknesses">
            <StrengthsWeaknesses topics={topicRows} />
          </Section>

          {/* 10. Progress */}
          <Section title="10. Progress Tracking">
            <ProgressTrend points={trendPoints} />
          </Section>

          {/* AI Analysis (manual) */}
          <Section title="AI Deep Analysis (Optional)">
            <AIAnalysisPanel attemptId={attempt.id} />
          </Section>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            Report generated by MBA Compass · {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground/90">{title}</h2>
      {children}
    </section>
  );
}
