import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  AreaChart, Area, ComposedChart, Line,
} from "recharts";
import { PieChart as PieIcon, BarChart3, TrendingUp, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { normalizeProb, type CollegeRow, type ScoreBreakdown } from "@/lib/profileScoring";

interface Props {
  breakdown?: ScoreBreakdown;
  rows?: CollegeRow[];
  profileScore?: number;
}

/* ─── Professional palette (HSL-ish hex) ───────────────────── */
const PALETTE = {
  emerald: "#10b981",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
  cyan: "#06b6d4",
  indigo: "#6366f1",
};

const TIER_COLORS: Record<string, string> = {
  Dream: PALETTE.violet,
  Target: PALETTE.blue,
  Safe: PALETTE.emerald,
};

const PROB_BANDS = [
  { label: "Very High", min: 80, color: PALETTE.emerald },
  { label: "High", min: 60, color: PALETTE.cyan },
  { label: "Moderate", min: 40, color: PALETTE.amber },
  { label: "Low", min: 20, color: PALETTE.rose },
  { label: "Very Low", min: 0, color: PALETTE.slate },
];

/* ─── Custom tooltip ───────────────────────────────────────── */
const CustomTip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload?: { name?: string } }>; label?: string | number }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur p-2.5 shadow-lg text-xs">
      {label !== undefined && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export const AdvancedCharts = ({ breakdown, rows, profileScore }: Props) => {
  if (!breakdown && !rows?.length) return null;

  /* ── 1. Score Composition Donut ── */
  const compositionData = breakdown ? [
    { name: "Academics", value: breakdown.academics_score || 0, color: PALETTE.blue },
    { name: "Work Ex", value: breakdown.work_experience_score || 0, color: PALETTE.emerald },
    { name: "Diversity", value: breakdown.diversity_score || 0, color: PALETTE.violet },
    { name: "Consistency", value: breakdown.profile_consistency_score || 0, color: PALETTE.cyan },
    { name: "Leadership", value: breakdown.leadership_potential_score || 0, color: PALETTE.amber },
    ...(breakdown.extracurricular_score ? [{ name: "Extra-curricular", value: breakdown.extracurricular_score, color: PALETTE.rose }] : []),
  ].filter(d => d.value > 0) : [];

  /* ── 2. Tier Distribution + avg admission % ── */
  const tierMap = new Map<string, { count: number; probSum: number }>();
  rows?.forEach((r) => {
    const t = r.tier || "Other";
    const existing = tierMap.get(t) || { count: 0, probSum: 0 };
    tierMap.set(t, { count: existing.count + 1, probSum: existing.probSum + normalizeProb(r.your_admission_probability) });
  });
  const tierData = Array.from(tierMap.entries()).map(([tier, v]) => ({
    tier,
    count: v.count,
    avgProb: Math.round(v.probSum / v.count),
    color: TIER_COLORS[tier] || PALETTE.slate,
  })).sort((a, b) => (a.tier === "Dream" ? -1 : b.tier === "Dream" ? 1 : a.tier === "Target" ? -1 : 1));

  /* ── 3. Top 8 Colleges: Fees vs Avg Package ── */
  const topColleges = (rows || [])
    .slice()
    .sort((a, b) => (b.avg_package_lakhs || 0) - (a.avg_package_lakhs || 0))
    .slice(0, 8)
    .map((c) => ({
      name: c.college_name.length > 14 ? c.college_name.slice(0, 12) + "…" : c.college_name,
      fullName: c.college_name,
      Fees: c.avg_fees_lakhs,
      "Avg Package": c.avg_package_lakhs,
      ROI: c.avg_fees_lakhs > 0 ? Math.round((c.avg_package_lakhs / c.avg_fees_lakhs) * 100) / 100 : 0,
    }));

  /* ── 4. Admission probability funnel ── */
  const bandCounts = PROB_BANDS.map(b => ({ ...b, count: 0 }));
  rows?.forEach((r) => {
    const p = normalizeProb(r.your_admission_probability);
    const idx = bandCounts.findIndex(b => p >= b.min);
    if (idx >= 0) bandCounts[idx].count++;
  });
  const funnelData = bandCounts.filter(b => b.count > 0).map(b => ({
    band: b.label,
    count: b.count,
    color: b.color,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* ───── 1. Score Composition Donut ───── */}
      {compositionData.length > 0 && (
        <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-card dark:from-blue-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="w-5 h-5 text-blue-600" /> Profile Score Composition
            </CardTitle>
            <CardDescription>How each pillar contributes to your overall {profileScore ?? ""}/10 score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compositionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                  >
                    {compositionData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Each slice = score (out of 10) on that dimension. Larger slices = your stronger pillars.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ───── 2. Tier Distribution ───── */}
      {tierData.length > 0 && (
        <Card className="border-2 border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50/50 to-card dark:from-violet-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-5 h-5 text-violet-600" /> College Tier Distribution
            </CardTitle>
            <CardDescription>Count of Dream / Target / Safe colleges and your average admission chance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tierData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: "Colleges", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: "Avg Chance %", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar yAxisId="left" dataKey="count" name="Colleges" radius={[8, 8, 0, 0]}>
                    {tierData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 700 }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="avgProb" name="Avg Chance %" stroke={PALETTE.amber} strokeWidth={3} dot={{ fill: PALETTE.amber, r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ───── 3. Top 8 Fees vs Package ───── */}
      {topColleges.length > 0 && (
        <Card className="border-2 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-card dark:from-emerald-950/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-emerald-600" /> Fees vs Average Package — Top 8 Colleges
            </CardTitle>
            <CardDescription>Compare investment (fees in ₹L) against the typical placement package (LPA)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topColleges} margin={{ top: 20, right: 20, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: "₹ Lakhs / LPA", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
                  <Tooltip content={<CustomTip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Fees" fill={PALETTE.rose} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Avg Package" fill={PALETTE.emerald} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Bigger green-to-red gap = better ROI. Hover any bar for exact figures.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ───── 4. Admission Probability Distribution ───── */}
      {funnelData.length > 0 && (
        <Card className="border-2 border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-card dark:from-amber-950/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-amber-600" /> Admission Probability Distribution
            </CardTitle>
            <CardDescription>How your shortlisted colleges spread across chance bands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={funnelData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="funnelFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.amber} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={PALETTE.amber} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="band" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTip />} />
                  <Area type="monotone" dataKey="count" name="Colleges" stroke={PALETTE.amber} strokeWidth={3} fill="url(#funnelFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              {funnelData.map((b) => (
                <div key={b.band} className="rounded-lg border border-border p-2 text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: b.color }} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{b.band}</p>
                  <p className="text-lg font-bold">{b.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default AdvancedCharts;
