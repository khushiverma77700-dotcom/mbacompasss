import React from "react";
import { type CATResult } from "@/lib/catParser";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from "recharts";

const COLORS = {
  VARC: "#3b82f6",
  DILR: "#10b981",
  QA: "#f59e0b",
  correct: "#10b981",
  incorrect: "#ef4444",
  unattempted: "#6b7280",
};

export const SectionRadarChart: React.FC<{ result: CATResult }> = ({ result }) => {
  const data = result.sections.map((s) => ({
    section: s.section,
    score: s.score,
    accuracy: Math.round(s.accuracy),
    attempted: Math.round((s.attempted / s.total) * 100),
  }));

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-4 text-sm">Section Comparison (Radar)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="section" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <PolarRadiusAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          <Radar name="Accuracy %" dataKey="accuracy" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-4 text-sm">Attempt Breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-4 text-sm">Section-wise Score Breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dataWithNeg}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="section" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
          <Bar dataKey="Positive Marks" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Negative Marks" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AccuracyBySection: React.FC<{ result: CATResult }> = ({ result }) => {
  const data = result.sections.map((s) => ({
    section: s.section,
    accuracy: parseFloat(s.accuracy.toFixed(1)),
    fill: COLORS[s.section as keyof typeof COLORS] || "#3b82f6",
  }));

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-4 text-sm">Accuracy by Section (%)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <YAxis dataKey="section" type="category" tick={{ fill: "#9ca3af", fontSize: 12 }} width={50} />
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
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
    {
      type: "MCQ",
      Total: mcqs.length,
      Attempted: mcqAttempted,
      Correct: mcqCorrect,
      Incorrect: mcqAttempted - mcqCorrect,
    },
    {
      type: "TITA",
      Total: sas.length,
      Attempted: saAttempted,
      Correct: saCorrect,
      Incorrect: saAttempted - saCorrect,
    },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-4 text-sm">MCQ vs TITA Performance</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="type" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
          <Bar dataKey="Correct" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Incorrect" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const NegativeMarksCard: React.FC<{ result: CATResult }> = ({ result }) => {
  const totalNegative = result.sections.reduce((sum, s) => {
    const mcqWrong = result.questions.filter(
      (q) => q.section === s.section && q.questionType === "MCQ" && !q.isCorrect &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review")
    ).length;
    return sum + mcqWrong;
  }, 0);

  const sectionNeg = result.sections.map((s) => {
    const mcqWrong = result.questions.filter(
      (q) => q.section === s.section && q.questionType === "MCQ" && !q.isCorrect &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review")
    ).length;
    return { section: s.section, negMarks: mcqWrong, color: COLORS[s.section as keyof typeof COLORS] || "#6b7280" };
  });

  return (
    <div className="bg-gradient-to-br from-red-600/10 to-red-900/5 border border-red-500/20 rounded-2xl p-5">
      <h3 className="text-red-400 font-bold mb-1 text-sm">Negative Marks Summary</h3>
      <p className="text-3xl font-black text-red-400 mb-3">-{totalNegative}</p>
      <div className="space-y-2">
        {sectionNeg.map((s) => (
          <div key={s.section} className="flex justify-between text-sm">
            <span className="text-gray-400">{s.section}</span>
            <span className="text-red-400 font-medium">-{s.negMarks}</span>
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-4 text-sm">Strength vs Weakness</h3>
      <div className="space-y-4">
        {data.map((d) => (
          <div key={d.section} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300 font-medium">{d.section}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                d.strength === "Strong" ? "bg-emerald-500/20 text-emerald-400" :
                d.strength === "Average" ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              }`}>{d.strength}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-16">Accuracy</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.accuracy}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">{d.accuracy}%</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-16">Attempt</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${d.attemptRate}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">{d.attemptRate}%</span>
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-4 text-sm">Score vs Percentile Curve</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={curveData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="score" tick={{ fill: "#6b7280", fontSize: 10 }} label={{ value: "Score", fill: "#6b7280", fontSize: 11, position: "bottom" }} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} label={{ value: "Percentile", fill: "#6b7280", fontSize: 11, angle: -90, position: "insideLeft" }} />
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
          <Line type="monotone" dataKey="percentile" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          {/* Current score marker */}
          <Line
            type="monotone"
            data={[{ score: currentScore, percentile: 0 }, { score: currentScore, percentile: 100 }]}
            dataKey="percentile"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">Your score ({currentScore}) shown as dashed line</p>
    </div>
  );
};
