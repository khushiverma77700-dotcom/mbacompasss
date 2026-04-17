import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Quote, ChevronDown, ChevronUp, Zap, CheckCircle2, AlertCircle,
  TrendingUp, Target, Lightbulb, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PolarAngleAxis,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*  Smart text → structured-visual extractors                                 */
/* -------------------------------------------------------------------------- */

/** Pull out monetary / percentage / time-based highlight metrics. */
function extractStats(text: string) {
  if (!text) return [];
  const patterns: { rx: RegExp; label: (m: string) => string; tone: string }[] = [
    { rx: /₹\s?[\d.,]+\s?(?:Cr|Crores?)/gi, label: () => "Investment", tone: "amber" },
    { rx: /₹\s?[\d.,]+\s?LPA/gi, label: () => "Salary", tone: "emerald" },
    { rx: /₹\s?[\d.,]+\s?(?:L|Lakhs?|K)/gi, label: () => "Amount", tone: "primary" },
    { rx: /\b\d+(?:\.\d+)?\s?(?:years?|yrs?)\b/gi, label: () => "Period", tone: "blue" },
    { rx: /\b\d+(?:\.\d+)?\s?months?\b/gi, label: () => "Timeline", tone: "blue" },
    { rx: /\b\d+(?:\.\d+)?\s?%/g, label: () => "Rate", tone: "violet" },
    { rx: /\b\d+x\b/gi, label: () => "Multiple", tone: "rose" },
  ];
  const seen = new Set<string>();
  const stats: { value: string; label: string; tone: string }[] = [];
  patterns.forEach(({ rx, label, tone }) => {
    const matches = text.match(rx) || [];
    matches.forEach((m) => {
      const v = m.trim();
      if (!seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        stats.push({ value: v, label: label(v), tone });
      }
    });
  });
  return stats.slice(0, 6);
}

/** Heuristic: classify a sentence as positive / cautionary / neutral. */
function classifySentence(s: string): "positive" | "warning" | "neutral" {
  const lower = s.toLowerCase();
  const positive = /\b(strong|excellent|great|advantage|recommend|fits|favor|opportunity|best|edge|profitable|good|ideal|solid|leverage|jump|gain|growth|payback)\b/;
  const warning = /\b(risk|caution|concern|weak|gap|drop|low|expensive|stretch|red flag|might not|hesitate|don'?t|avoid|worry|loss|delay|drawback)\b/;
  if (positive.test(lower) && !warning.test(lower)) return "positive";
  if (warning.test(lower)) return "warning";
  return "neutral";
}

/** Split a paragraph into compact takeaways with sentiment tags. */
function extractTakeaways(text: string) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 240)
    .slice(0, 6)
    .map((s) => ({ text: s, sentiment: classifySentence(s) }));
}

/* -------------------------------------------------------------------------- */
/*  Theme tokens                                                              */
/* -------------------------------------------------------------------------- */

interface Props {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  accent?: "primary" | "emerald" | "amber" | "rose" | "blue" | "violet";
  chart?: "growth" | "milestones" | "risk-meter" | "score-bar" | "donut" | "sparkline" | "comparison" | "none";
  chartData?: any;
  badge?: { label: string; tone?: "emerald" | "amber" | "rose" | "blue" | "primary" };
}

const ACCENT: Record<string, { bg: string; text: string; border: string; chip: string; ring: string; glow: string }> = {
  primary: { bg: "bg-primary/5", text: "text-primary", border: "border-primary/20", chip: "bg-primary/10 text-primary", ring: "ring-primary/30", glow: "shadow-primary/15" },
  emerald: { bg: "bg-emerald-50/50", text: "text-emerald-600", border: "border-emerald-200/60", chip: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-300/40", glow: "shadow-emerald-200/30" },
  amber:   { bg: "bg-amber-50/50",   text: "text-amber-600",   border: "border-amber-200/60",   chip: "bg-amber-100 text-amber-700",   ring: "ring-amber-300/40",   glow: "shadow-amber-200/30" },
  rose:    { bg: "bg-rose-50/50",    text: "text-rose-600",    border: "border-rose-200/60",    chip: "bg-rose-100 text-rose-700",     ring: "ring-rose-300/40",    glow: "shadow-rose-200/30" },
  blue:    { bg: "bg-blue-50/50",    text: "text-blue-600",    border: "border-blue-200/60",    chip: "bg-blue-100 text-blue-700",     ring: "ring-blue-300/40",    glow: "shadow-blue-200/30" },
  violet:  { bg: "bg-violet-50/50",  text: "text-violet-600",  border: "border-violet-200/60",  chip: "bg-violet-100 text-violet-700", ring: "ring-violet-300/40",  glow: "shadow-violet-200/30" },
};

const SENT: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string; dot: string }> = {
  positive: { icon: CheckCircle2, bg: "bg-emerald-50/60", text: "text-emerald-700", border: "border-emerald-200/60", dot: "bg-emerald-500" },
  warning:  { icon: AlertCircle,  bg: "bg-amber-50/60",   text: "text-amber-700",   border: "border-amber-200/60",   dot: "bg-amber-500" },
  neutral:  { icon: ArrowRight,   bg: "bg-blue-50/60",    text: "text-blue-700",    border: "border-blue-200/60",    dot: "bg-blue-500" },
};

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

const NarrativeBlock: React.FC<Props> = ({
  title,
  icon: Icon,
  text,
  accent = "primary",
  chart = "none",
  chartData,
  badge,
}) => {
  const stats = useMemo(() => extractStats(text), [text]);
  const takeaways = useMemo(() => extractTakeaways(text), [text]);
  const a = ACCENT[accent];
  const [showRaw, setShowRaw] = useState(false);

  if (!text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`overflow-hidden border ${a.border} shadow-lg ${a.glow} relative`}>
        {/* Animated decorative gradient orb */}
        <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full ${a.bg} blur-3xl pointer-events-none opacity-70`} />
        <motion.div
          aria-hidden
          className={`absolute -bottom-16 -left-10 w-40 h-40 rounded-full ${a.bg} blur-3xl pointer-events-none opacity-50`}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <CardContent className="p-0 relative">
          {/* ── HEADER STRIP ───────────────────────────────────────────── */}
          <div className={`flex items-center justify-between px-5 md:px-6 py-4 ${a.bg} border-b ${a.border} relative`}>
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -8, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className={`w-10 h-10 rounded-xl ${a.chip} flex items-center justify-center ring-2 ${a.ring}`}
              >
                <Icon className={`w-4 h-4 ${a.text}`} />
              </motion.div>
              <div>
                <h3 className="font-bold text-foreground text-sm md:text-base leading-tight">{title}</h3>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Zap className="w-2.5 h-2.5" /> AI personalized • Live insight
                </p>
              </div>
            </div>
            {badge && (
              <Badge className={`${ACCENT[badge.tone || "primary"].chip} font-semibold`}>
                {badge.label}
              </Badge>
            )}
          </div>

          {/* ── ANIMATED KPI STRIP ─────────────────────────────────────── */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border/40">
              {stats.map((s, i) => {
                const tone = ACCENT[s.tone] || a;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ y: -2 }}
                    className="bg-card px-3 py-3 group cursor-default"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${tone.text.replace("text-", "bg-")}`} />
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                    </div>
                    <p className={`text-base md:text-lg font-bold ${tone.text} group-hover:scale-105 transition-transform origin-left`}>
                      {s.value}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="p-5 md:p-6 grid lg:grid-cols-5 gap-5 relative">
            {/* ── KEY TAKEAWAYS (left) ─────────────────────────────────── */}
            <div className={`${chart !== "none" ? "lg:col-span-3" : "lg:col-span-5"} space-y-4`}>
              {takeaways.length >= 2 && (
                <div className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Sparkles className={`w-3 h-3 ${a.text}`} /> Key Takeaways
                  </p>
                  <div className="space-y-2">
                    {takeaways.map((t, i) => {
                      const s = SENT[t.sentiment];
                      const SentIcon = s.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.07 }}
                          whileHover={{ x: 3 }}
                          className={`flex gap-3 p-3 rounded-xl ${s.bg} border ${s.border} relative overflow-hidden`}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.dot}`} />
                          <SentIcon className={`w-4 h-4 ${s.text} mt-0.5 shrink-0`} />
                          <p className="text-xs md:text-[13px] text-foreground/90 leading-relaxed">{t.text}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle for raw narrative — hidden by default */}
              <button
                onClick={() => setShowRaw((v) => !v)}
                className={`w-full mt-2 text-[11px] font-semibold ${a.text} hover:underline flex items-center justify-center gap-1.5 py-2 rounded-lg ${a.bg} border ${a.border}`}
              >
                <Quote className="w-3 h-3" />
                {showRaw ? "Hide full advisor narrative" : "Read full advisor narrative"}
                {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showRaw && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-line border-l-2 ${a.border} pl-3 italic`}>
                    {text}
                  </p>
                </motion.div>
              )}
            </div>

            {/* ── VISUALIZATION SIDE (right) ───────────────────────────── */}
            {chart !== "none" && (
              <div className="lg:col-span-2">
                <ChartRenderer variant={chart} data={chartData} accent={accent} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Chart renderer                                                            */
/* -------------------------------------------------------------------------- */

const ChartRenderer: React.FC<{ variant: string; data: any; accent: string }> = ({ variant, data, accent }) => {
  const a = ACCENT[accent];

  if (variant === "growth" && data?.length > 0) {
    return (
      <div className={`${a.bg} rounded-xl p-3 h-full border ${a.border}`}>
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Trajectory
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${accent}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="x" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <RechartsTooltip />
            <Area type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2.5} fill={`url(#grad-${accent})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (variant === "milestones" && data?.length > 0) {
    return (
      <div className={`${a.bg} rounded-xl p-4 h-full border ${a.border}`}>
        <p className="text-[10px] uppercase text-muted-foreground mb-3 font-semibold flex items-center gap-1">
          <Target className="w-3 h-3" /> Career Milestones
        </p>
        <div className="space-y-3 relative">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
          {data.map((m: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 relative"
            >
              <div className={`w-9 h-9 rounded-full ${a.chip} flex items-center justify-center text-[10px] font-bold shrink-0 ring-4 ring-background z-10`}>
                {m.year}
              </div>
              <div className="flex-1 min-w-0 bg-card border border-border rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-foreground truncate">{m.role}</p>
                <p className={`text-[11px] ${a.text} font-bold`}>₹{m.salary} LPA</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "risk-meter") {
    const score = data?.score || 50;
    const color = score < 33 ? "hsl(160 70% 45%)" : score < 66 ? "hsl(40 90% 55%)" : "hsl(0 70% 60%)";
    const label = score < 33 ? "Low Risk" : score < 66 ? "Moderate Risk" : "High Risk";
    return (
      <div className={`${a.bg} rounded-xl p-4 h-full flex flex-col items-center justify-center border ${a.border}`}>
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold">Risk Meter</p>
        <ResponsiveContainer width="100%" height={170}>
          <RadialBarChart innerRadius="62%" outerRadius="100%" data={[{ value: score, fill: color }]} startAngle={180} endAngle={0}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold -mt-14"
          style={{ color }}
        >
          {score}
        </motion.p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-7 font-semibold">{label}</p>
      </div>
    );
  }

  if (variant === "score-bar" && data?.length > 0) {
    return (
      <div className={`${a.bg} rounded-xl p-3 h-full border ${a.border}`}>
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold">Tier Breakdown</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
            <RechartsTooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (variant === "donut" && data?.length > 0) {
    const COLORS = ["hsl(var(--primary))", "hsl(160 70% 45%)", "hsl(40 90% 55%)", "hsl(280 60% 60%)", "hsl(0 70% 60%)"];
    return (
      <div className={`${a.bg} rounded-xl p-3 h-full border ${a.border}`}>
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold">Distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              animationDuration={900}
            >
              {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {data.map((d: any, i: number) => (
            <span key={i} className="flex items-center gap-1 text-[10px] text-foreground/70">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {d.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "sparkline" && data?.length > 0) {
    return (
      <div className={`${a.bg} rounded-xl p-3 h-full border ${a.border} flex flex-col`}>
        <p className="text-[10px] uppercase text-muted-foreground mb-1 font-semibold">Trend</p>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="x" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <RechartsTooltip />
            <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} animationDuration={900} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (variant === "comparison" && data?.length > 0) {
    return (
      <div className={`${a.bg} rounded-xl p-3 h-full border ${a.border}`}>
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold flex items-center gap-1">
          <Lightbulb className="w-3 h-3" /> Side-by-Side
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <RechartsTooltip />
            <Bar dataKey="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={900} />
            <Bar dataKey="b" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

export default NarrativeBlock;
