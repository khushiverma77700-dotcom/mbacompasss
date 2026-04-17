import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Quote } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line, PolarAngleAxis,
} from "recharts";

/** Extract the first 3-5 highlight metrics from a paragraph (₹X L, X%, X years, X LPA, etc.) */
function extractStats(text: string) {
  if (!text) return [];
  const patterns: { rx: RegExp; label: (m: string) => string }[] = [
    { rx: /₹\s?[\d.,]+\s?(?:L|Lakhs?|LPA|Cr|Crores?|K)/gi, label: (m) => /LPA/i.test(m) ? "Salary" : /Cr/i.test(m) ? "Investment" : "Amount" },
    { rx: /\b\d+(?:\.\d+)?\s?(?:years?|yrs?|months?)\b/gi, label: (m) => /month/i.test(m) ? "Timeline" : "Period" },
    { rx: /\b\d+(?:\.\d+)?\s?%/g, label: () => "Rate" },
    { rx: /\b\d+x\b/gi, label: () => "Multiple" },
  ];
  const seen = new Set<string>();
  const stats: { value: string; label: string }[] = [];
  patterns.forEach(({ rx, label }) => {
    const matches = text.match(rx) || [];
    matches.forEach((m) => {
      const v = m.trim();
      if (!seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        stats.push({ value: v, label: label(v) });
      }
    });
  });
  return stats.slice(0, 5);
}

/** Split a long paragraph into 3-5 short "key takeaway" sentences */
function extractTakeaways(text: string) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 220)
    .slice(0, 5);
}

interface Props {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  accent?: "primary" | "emerald" | "amber" | "rose" | "blue" | "violet";
  /** Chart variant to render alongside the text */
  chart?: "growth" | "milestones" | "risk-meter" | "score-bar" | "none";
  chartData?: any;
  /** Optional badge value (e.g., "Risk Level: High") */
  badge?: { label: string; tone?: "emerald" | "amber" | "rose" | "blue" | "primary" };
}

const ACCENT: Record<string, { bg: string; text: string; border: string; chip: string }> = {
  primary: { bg: "bg-primary/5", text: "text-primary", border: "border-primary/20", chip: "bg-primary/10 text-primary" },
  emerald: { bg: "bg-emerald-50/40", text: "text-emerald-600", border: "border-emerald-200/60", chip: "bg-emerald-100 text-emerald-700" },
  amber: { bg: "bg-amber-50/40", text: "text-amber-600", border: "border-amber-200/60", chip: "bg-amber-100 text-amber-700" },
  rose: { bg: "bg-rose-50/40", text: "text-rose-600", border: "border-rose-200/60", chip: "bg-rose-100 text-rose-700" },
  blue: { bg: "bg-blue-50/40", text: "text-blue-600", border: "border-blue-200/60", chip: "bg-blue-100 text-blue-700" },
  violet: { bg: "bg-violet-50/40", text: "text-violet-600", border: "border-violet-200/60", chip: "bg-violet-100 text-violet-700" },
};

const NarrativeBlock: React.FC<Props> = ({ title, icon: Icon, text, accent = "primary", chart = "none", chartData, badge }) => {
  const stats = useMemo(() => extractStats(text), [text]);
  const takeaways = useMemo(() => extractTakeaways(text), [text]);
  const a = ACCENT[accent];

  if (!text) return null;

  return (
    <Card className={`overflow-hidden border ${a.border}`}>
      <CardContent className="p-0">
        {/* Header strip */}
        <div className={`flex items-center justify-between px-6 py-4 ${a.bg} border-b ${a.border}`}>
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-lg ${a.chip} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${a.text}`} />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm md:text-base">{title}</h3>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AI personalized analysis</p>
            </div>
          </div>
          {badge && (
            <Badge className={ACCENT[badge.tone || "primary"].chip}>{badge.label}</Badge>
          )}
        </div>

        {/* Stat strip */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border/40">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card px-4 py-3"
              >
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className={`text-base md:text-lg font-bold ${a.text}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="p-6 grid md:grid-cols-5 gap-5">
          {/* Narrative + takeaways */}
          <div className={`${chart !== "none" ? "md:col-span-3" : "md:col-span-5"} space-y-4`}>
            {takeaways.length >= 3 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Key Takeaways
                </p>
                <div className="space-y-2">
                  {takeaways.map((t, i) => (
                    <div key={i} className={`flex gap-2 p-3 rounded-lg ${a.bg} border ${a.border}`}>
                      <span className={`text-xs font-bold ${a.text} mt-0.5`}>{i + 1}</span>
                      <p className="text-xs text-foreground/90 leading-relaxed">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-primary hover:underline flex items-center gap-1">
                <Quote className="w-3 h-3" /> Read full advisor narrative
              </summary>
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-line border-l-2 border-primary/30 pl-3">
                {text}
              </p>
            </details>
          </div>

          {/* Visualization side */}
          {chart !== "none" && (
            <div className="md:col-span-2">
              <ChartRenderer variant={chart} data={chartData} accent={accent} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ChartRenderer: React.FC<{ variant: string; data: any; accent: string }> = ({ variant, data, accent }) => {
  const a = ACCENT[accent];

  if (variant === "growth" && data?.length > 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-3 h-full">
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold">Trajectory</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${accent}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="x" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <RechartsTooltip />
            <Area type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#grad-${accent})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (variant === "milestones" && data?.length > 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-4 h-full">
        <p className="text-[10px] uppercase text-muted-foreground mb-3 font-semibold">Career Milestones</p>
        <div className="space-y-3">
          {data.map((m: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-full ${a.chip} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                {m.year}
              </div>
              <div className="flex-1 min-w-0">
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
    const label = score < 33 ? "Low" : score < 66 ? "Moderate" : "High";
    return (
      <div className="bg-muted/30 rounded-lg p-4 h-full flex flex-col items-center justify-center">
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold">Risk Meter</p>
        <ResponsiveContainer width="100%" height={170}>
          <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ value: score, fill: color }]} startAngle={180} endAngle={0}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="text-2xl font-bold -mt-12" style={{ color }}>{score}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-6">{label} Risk</p>
      </div>
    );
  }

  if (variant === "score-bar" && data?.length > 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-3 h-full">
        <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold">Breakdown</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
            <RechartsTooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

export default NarrativeBlock;
