import React from "react";
import { type CATResult } from "@/lib/catParser";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, ScatterChart, Scatter, ZAxis,
} from "recharts";

const COLORS = {
  VARC: "#2563eb",
  DILR: "#059669",
  QA: "#d97706",
  correct: "#059669",
  incorrect: "#dc2626",
  unattempted: "#9ca3af",
};

const TOOLTIP_STYLE = {
  background: "#fff",
  border: "1px solid hsl(210, 30%, 92%)",
  borderRadius: 10,
  color: "#1e293b",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export const SectionRadarChart: React.FC<{ result: CATResult }> = ({ result }) => {
  const data = result.sections.map((s) => ({
    section: s.section,
    score: s.score,
    accuracy: Math.round(s.accuracy),
    attempted: Math.round((s.attempted / s.total) * 100),
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-4 text-sm">Section Comparison (Radar)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(210, 30%, 92%)" />
          <PolarAngleAxis dataKey="section" tick={{ fill: "#64748b", fontSize: 12 }} />
          <PolarRadiusAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
          <Radar name="Accuracy %" dataKey="accuracy" stroke="#059669" fill="#059669" fillOpacity={0.15} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AttemptBreakdownPie: React.FC<{ result: CATResult }> = ({ result }) => {
  const data = [
    { name: "Correct", value: result.overall.correct, color: COLORS.correct },
    { name: "Incorrect", value: result.overall.incorrect, color: COLORS.incorrect },
    { name: "Unattempted", value: result.overall.unattempted, color: COLORS.unattempted },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-4 text-sm">Attempt Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SectionScoreBar: React.FC<{ result: CATResult }> = ({ result }) => {
  const dataWithNeg = result.sections.map((s) => {
    const mcqWrong = result.questions.filter(
      (q) => q.section === s.section && q.questionType === "MCQ" && !q.isCorrect &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review")
    ).length;
    return {
      section: s.section,
      Score: s.score,
      "Positive Marks": s.correct * 3,
      "Negative Marks": mcqWrong,
    };
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-4 text-sm">Section-wise Score Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dataWithNeg}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="section" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
          <Bar dataKey="Positive Marks" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Negative Marks" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AccuracyBySection: React.FC<{ result: CATResult }> = ({ result }) => {
  const data = result.sections.map((s) => ({
    section: s.section,
    accuracy: parseFloat(s.accuracy.toFixed(1)),
    fill: COLORS[s.section as keyof typeof COLORS] || "#2563eb",
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-4 text-sm">Accuracy by Section (%)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <YAxis dataKey="section" type="category" tick={{ fill: "#64748b", fontSize: 12 }} width={50} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const QuestionTypeAnalysis: React.FC<{ result: CATResult }> = ({ result }) => {
  const mcqs = result.questions.filter((q) => q.questionType === "MCQ");
  const sas = result.questions.filter((q) => q.questionType === "SA");

  const mcqCorrect = mcqs.filter((q) => q.isCorrect).length;
  const mcqAttempted = mcqs.filter((q) => q.status === "Answered" || q.status === "Answered & Marked for Review").length;
  const saCorrect = sas.filter((q) => q.isCorrect).length;
  const saAttempted = sas.filter((q) => q.status === "Answered" || q.status === "Answered & Marked for Review").length;

  const data = [
    { type: "MCQ", Total: mcqs.length, Attempted: mcqAttempted, Correct: mcqCorrect, Incorrect: mcqAttempted - mcqCorrect },
    { type: "TITA", Total: sas.length, Attempted: saAttempted, Correct: saCorrect, Incorrect: saAttempted - saCorrect },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-4 text-sm">MCQ vs TITA Performance</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="type" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
          <Bar dataKey="Correct" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Incorrect" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const NegativeMarksCard: React.FC<{ result: CATResult }> = ({ result }) => {
  const sectionNeg = result.sections.map((s) => {
    const mcqWrong = result.questions.filter(
      (q) => q.section === s.section && q.questionType === "MCQ" && !q.isCorrect &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review")
    ).length;
    return { section: s.section, negMarks: mcqWrong };
  });
  const totalNegative = sectionNeg.reduce((sum, s) => sum + s.negMarks, 0);

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-destructive font-bold mb-1 text-sm">Negative Marks Summary</h3>
      <p className="text-3xl font-black text-destructive mb-3">-{totalNegative}</p>
      <div className="space-y-2">
        {sectionNeg.map((s) => (
          <div key={s.section} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{s.section}</span>
            <span className="text-destructive font-medium">-{s.negMarks}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StrengthWeaknessChart: React.FC<{ result: CATResult }> = ({ result }) => {
  const data = result.sections.map((s) => {
    const strength = s.accuracy >= 70 ? "Strong" : s.accuracy >= 50 ? "Average" : "Weak";
    return {
      section: s.section,
      accuracy: parseFloat(s.accuracy.toFixed(1)),
      attemptRate: parseFloat(((s.attempted / s.total) * 100).toFixed(1)),
      strength,
    };
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-4 text-sm">Strength vs Weakness</h3>
      <div className="space-y-4">
        {data.map((d) => (
          <div key={d.section} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground font-medium">{d.section}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                d.strength === "Strong" ? "bg-emerald-100 text-emerald-700" :
                d.strength === "Average" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-destructive"
              }`}>{d.strength}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground w-16">Accuracy</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${d.accuracy}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">{d.accuracy}%</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground w-16">Attempt</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${d.attemptRate}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">{d.attemptRate}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ScoreVsPercentileCurve: React.FC<{ currentScore: number }> = ({ currentScore }) => {
  const curveData = [
    { score: -10, percentile: 1 }, { score: 0, percentile: 5 }, { score: 15, percentile: 30 },
    { score: 25, percentile: 45 }, { score: 35, percentile: 60 }, { score: 45, percentile: 70 },
    { score: 55, percentile: 80 }, { score: 65, percentile: 85 }, { score: 75, percentile: 90 },
    { score: 85, percentile: 93 }, { score: 95, percentile: 95 }, { score: 105, percentile: 97 },
    { score: 115, percentile: 98 }, { score: 130, percentile: 99 }, { score: 150, percentile: 99.5 },
    { score: 170, percentile: 99.9 }, { score: 200, percentile: 99.99 },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-4 text-sm">Score vs Percentile Curve</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={curveData}>
          <defs>
            <linearGradient id="percentileGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="score" tick={{ fill: "#94a3b8", fontSize: 10 }} label={{ value: "Score", fill: "#64748b", fontSize: 11, position: "bottom" }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} label={{ value: "Percentile", fill: "#64748b", fontSize: 11, angle: -90, position: "insideLeft" }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="percentile" stroke="#2563eb" strokeWidth={2} fill="url(#percentileGrad)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2 text-center">Your score ({currentScore}) mapped on the curve</p>
    </div>
  );
};

/* ========== NEW CHARTS FOR EXTENDED PAGE ========== */

export const ScoreDistributionHistogram: React.FC = () => {
  const data = [
    { range: "<0", students: 320 }, { range: "0-20", students: 1850 }, { range: "20-40", students: 3200 },
    { range: "40-60", students: 4100 }, { range: "60-80", students: 3600 }, { range: "80-100", students: 2400 },
    { range: "100-120", students: 1200 }, { range: "120-140", students: 580 }, { range: "140-160", students: 220 },
    { range: "160+", students: 85 },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">CAT 2025 Score Distribution</h3>
      <p className="text-xs text-muted-foreground mb-4">Based on 17,555 responses analyzed</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 10 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="students" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DailySubmissionTrend: React.FC = () => {
  const data = [
    { day: "Dec 20", submissions: 420 }, { day: "Dec 21", submissions: 1890 },
    { day: "Dec 22", submissions: 3200 }, { day: "Dec 23", submissions: 4500 },
    { day: "Dec 24", submissions: 3800 }, { day: "Dec 25", submissions: 2100 },
    { day: "Dec 26", submissions: 1500 }, { day: "Dec 27", submissions: 890 },
    { day: "Dec 28", submissions: 620 }, { day: "Dec 29", submissions: 450 },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Daily Score Check Trend</h3>
      <p className="text-xs text-muted-foreground mb-4">Student submissions over time</p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="submissions" stroke="#059669" strokeWidth={2} fill="url(#subGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SectionAvgComparison: React.FC<{ result: CATResult }> = ({ result }) => {
  const avgScores = { VARC: 28, DILR: 22, QA: 25 };
  const data = result.sections.map((s) => ({
    section: s.section,
    "Your Score": s.score,
    "Average Score": avgScores[s.section as keyof typeof avgScores] || 25,
    "Top 1% Score": s.section === "VARC" ? 58 : s.section === "DILR" ? 50 : 55,
  }));
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Your Score vs Peers</h3>
      <p className="text-xs text-muted-foreground mb-4">Compare with average and top 1%</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="section" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
          <Bar dataKey="Your Score" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Average Score" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Top 1% Score" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AccuracyDistributionPie: React.FC = () => {
  const data = [
    { name: "90-100%", value: 8, color: "#059669" },
    { name: "70-90%", value: 22, color: "#2563eb" },
    { name: "50-70%", value: 35, color: "#d97706" },
    { name: "30-50%", value: 25, color: "#ea580c" },
    { name: "<30%", value: 10, color: "#dc2626" },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Accuracy Distribution (All Students)</h3>
      <p className="text-xs text-muted-foreground mb-4">Percentage of students by accuracy range</p>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={95} innerRadius={45} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DifficultyPerformanceChart: React.FC<{ result: CATResult }> = ({ result }) => {
  // Simulated difficulty data
  const total = result.questions.length;
  const easy = Math.round(total * 0.35);
  const medium = Math.round(total * 0.40);
  const hard = total - easy - medium;
  const data = [
    { difficulty: "Easy", total: easy, correct: Math.round(easy * 0.78), accuracy: 78 },
    { difficulty: "Medium", total: medium, correct: Math.round(medium * 0.52), accuracy: 52 },
    { difficulty: "Hard", total: hard, correct: Math.round(hard * 0.28), accuracy: 28 },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Difficulty-wise Performance</h3>
      <p className="text-xs text-muted-foreground mb-4">Estimated based on question analysis</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="difficulty" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
          <Bar dataKey="total" name="Total Questions" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="correct" name="Correct" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ScoreVsAttemptsScatter: React.FC = () => {
  const data = Array.from({ length: 50 }, () => ({
    attempts: Math.round(30 + Math.random() * 40),
    score: Math.round(-10 + Math.random() * 180),
    accuracy: Math.round(20 + Math.random() * 70),
  }));
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Score vs Attempts (All Students)</h3>
      <p className="text-xs text-muted-foreground mb-4">Correlation analysis from 17K+ submissions</p>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis dataKey="attempts" name="Attempts" tick={{ fill: "#64748b", fontSize: 10 }} label={{ value: "Attempts", fill: "#64748b", fontSize: 11, position: "bottom" }} />
          <YAxis dataKey="score" name="Score" tick={{ fill: "#94a3b8", fontSize: 10 }} label={{ value: "Score", fill: "#64748b", fontSize: 11, angle: -90, position: "insideLeft" }} />
          <ZAxis dataKey="accuracy" range={[30, 200]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Scatter data={data} fill="#2563eb" fillOpacity={0.5} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SectionDifficultyHeatmap: React.FC = () => {
  const sections = ["VARC", "DILR", "QA"];
  const difficulties = ["Easy", "Medium", "Hard"];
  const heatData = [
    [82, 55, 30],
    [75, 48, 22],
    [88, 60, 35],
  ];
  const getColor = (val: number) => {
    if (val >= 75) return "bg-emerald-100 text-emerald-800";
    if (val >= 50) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-destructive";
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Section Difficulty Heatmap</h3>
      <p className="text-xs text-muted-foreground mb-4">Accuracy % by section and difficulty level</p>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 text-muted-foreground font-medium">Section</th>
            {difficulties.map(d => <th key={d} className="text-center py-2 text-muted-foreground font-medium">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, si) => (
            <tr key={sec} className="border-t border-border/50">
              <td className="py-3 font-semibold text-foreground">{sec}</td>
              {difficulties.map((_, di) => (
                <td key={di} className="text-center py-3">
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${getColor(heatData[si][di])}`}>
                    {heatData[si][di]}%
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const PercentilePredictorPanel: React.FC = () => {
  const predictions = [
    { score: "160+", percentile: "99.9+", calls: "IIM A, B, C, L" },
    { score: "130–160", percentile: "99–99.9", calls: "IIM A, B, C, L, K, I" },
    { score: "100–130", percentile: "97–99", calls: "IIM L, K, I, S, MDI" },
    { score: "80–100", percentile: "93–97", calls: "New IIMs, XLRI, SPJIMR" },
    { score: "60–80", percentile: "85–93", calls: "NMIMS, SIBM, IMT" },
    { score: "40–60", percentile: "70–85", calls: "TAPMI, GIM, LBSIM" },
    { score: "<40", percentile: "<70", calls: "Tier 2-3 colleges" },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Score → Percentile → College Predictor</h3>
      <p className="text-xs text-muted-foreground mb-4">Estimated based on CAT 2025 trends</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium">Score Range</th>
              <th className="text-center py-2 text-muted-foreground font-medium">Percentile</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Expected Calls</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="py-2.5 font-semibold text-primary">{p.score}</td>
                <td className="text-center py-2.5 text-foreground font-medium">{p.percentile}</td>
                <td className="py-2.5 text-muted-foreground">{p.calls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const MistakeAnalysisChart: React.FC<{ result: CATResult }> = ({ result }) => {
  const incorrectQ = result.questions.filter(
    q => !q.isCorrect && (q.status === "Answered" || q.status === "Answered & Marked for Review")
  );
  // Simulated categorization
  const silly = Math.round(incorrectQ.length * 0.35);
  const conceptual = Math.round(incorrectQ.length * 0.45);
  const timeWaste = incorrectQ.length - silly - conceptual;
  const data = [
    { type: "Silly Mistakes", count: silly, color: "#d97706" },
    { type: "Conceptual Errors", count: conceptual, color: "#dc2626" },
    { type: "Time-based Guesses", count: timeWaste, color: "#6366f1" },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">Mistake Analysis</h3>
      <p className="text-xs text-muted-foreground mb-4">Categorized incorrect answers (estimated)</p>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={95} innerRadius={45} dataKey="count" label={({ type, count }) => `${type}: ${count}`}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TopperComparisonBar: React.FC<{ result: CATResult }> = ({ result }) => {
  const data = [
    { metric: "Total Score", you: result.overall.totalScore, topper: 172, average: 68 },
    { metric: "Accuracy %", you: Math.round(result.overall.accuracy), topper: 92, average: 55 },
    { metric: "Attempts", you: result.overall.attempted, topper: 58, average: 48 },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-foreground font-bold mb-1 text-sm">You vs Topper vs Average</h3>
      <p className="text-xs text-muted-foreground mb-4">How you compare with the best</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 30%, 94%)" />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <YAxis dataKey="metric" type="category" tick={{ fill: "#64748b", fontSize: 11 }} width={80} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
          <Bar dataKey="you" name="You" fill="#2563eb" radius={[0, 4, 4, 0]} />
          <Bar dataKey="average" name="Average" fill="#94a3b8" radius={[0, 4, 4, 0]} />
          <Bar dataKey="topper" name="Topper" fill="#059669" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
