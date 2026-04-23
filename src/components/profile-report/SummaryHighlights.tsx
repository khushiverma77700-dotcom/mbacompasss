import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, AlertTriangle, Target, Award, GraduationCap,
  Briefcase, IndianRupee, Calendar, Trophy, Percent, Clock, BarChart3, Gauge,
} from "lucide-react";

interface Props {
  text: string;
  name?: string;
}

type Tone = "success" | "warning" | "info" | "primary" | "accent";

interface Pointer {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}

interface Stat {
  label: string;
  value: string;
  context: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
}

/* ───────── Stat extraction (regex over the raw text) ───────── */
const extractStats = (raw: string): Stat[] => {
  const stats: Stat[] = [];
  const seen = new Set<string>();
  const push = (s: Stat) => {
    const key = `${s.label}:${s.value}`;
    if (!seen.has(key)) { seen.add(key); stats.push(s); }
  };

  // Profile score like "7.4/10"
  const score = raw.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (score) push({
    label: "Profile Score", value: `${score[1]}/10`,
    context: "Overall MBA-readiness", tone: "primary", icon: Gauge,
  });

  // Percentages tied to academics: "98% in 12th", "78% in graduation"
  const pctCtx = [...raw.matchAll(/(\d{1,3})\s*%\s*(?:in|score|marks?)?\s*(12th|10th|graduation|grad)/gi)];
  pctCtx.forEach((m) => {
    const grade = /12/.test(m[2]) ? "12th Grade" : /10/.test(m[2]) ? "10th Grade" : "Graduation";
    push({
      label: grade, value: `${m[1]}%`,
      context: parseInt(m[1]) >= 85 ? "Strong academic record" : parseInt(m[1]) >= 70 ? "Solid foundation" : "Needs improvement",
      tone: parseInt(m[1]) >= 85 ? "success" : parseInt(m[1]) >= 70 ? "info" : "warning",
      icon: GraduationCap,
    });
  });

  // CAT percentile target: "90-95+" or "95+ percentile"
  const cat = raw.match(/(\d{2,3}(?:[-–]\d{2,3})?\+?)\s*(?:percentile|%ile)/i);
  if (cat) push({
    label: "Target CAT", value: cat[1].includes("+") ? cat[1] : `${cat[1]}+`,
    context: "Percentile to aim for", tone: "primary", icon: Target,
  });

  // Work experience: "15 months of valuable work experience"
  const wex = raw.match(/(\d+)\s*months?\s*(?:of\s*)?(?:valuable\s*)?(?:work\s*experience|wo?rk\s*ex)/i);
  if (wex) push({
    label: "Work Experience", value: `${wex[1]} mo`,
    context: parseInt(wex[1]) >= 24 ? "Ideal range for IIMs" : parseInt(wex[1]) >= 12 ? "Healthy work-ex" : "Below avg work-ex",
    tone: parseInt(wex[1]) >= 24 ? "success" : parseInt(wex[1]) >= 12 ? "info" : "warning",
    icon: Briefcase,
  });

  // Fee budget: "₹15 Lakhs"
  const fee = raw.match(/₹?\s*(\d+(?:\.\d+)?)\s*Lakhs?\s*(?:fee|budget)/i);
  if (fee) push({
    label: "Fee Budget", value: `₹${fee[1]} L`,
    context: "Investment ceiling", tone: "accent", icon: IndianRupee,
  });

  // ROI: "800% 5-year ROI"
  const roi = raw.match(/(\d+(?:,\d+)?)\s*%\s*(?:5-year\s*)?ROI/i);
  if (roi) push({
    label: "Projected ROI", value: `${roi[1]}%`,
    context: "5-year return on fees", tone: "success", icon: TrendingUp,
  });

  // Payback: "2.2 months"
  const pb = raw.match(/payback\s*(?:period\s*)?(?:of\s*)?(?:just\s*)?(\d+(?:\.\d+)?)\s*(months?|years?)/i);
  if (pb) push({
    label: "Payback Period", value: `${pb[1]} ${pb[2].replace(/s$/, "")}`,
    context: "Time to recover fees", tone: "success", icon: Clock,
  });

  // Time until exam: "7 months until the exam"
  const tex = raw.match(/(\d+)\s*months?\s*(?:until|to|before|left for)\s*(?:the\s*)?exam/i);
  if (tex) push({
    label: "Prep Window", value: `${tex[1]} mo`,
    context: "Time until exam day",
    tone: parseInt(tex[1]) >= 6 ? "info" : "warning",
    icon: Calendar,
  });

  // Category boost: "15-25 points"
  const cat2 = raw.match(/(\d+[-–]\d+)\s*points?/i);
  if (cat2) push({
    label: "Category Boost", value: `-${cat2[1]} pts`,
    context: "Cutoff relaxation", tone: "success", icon: Percent,
  });

  return stats.slice(0, 6); // max 6 stats
};

/* ───────── Sentence classifier for pointers ───────── */
const classify = (sentence: string): Pointer => {
  const s = sentence.toLowerCase();
  if (/(excellent|impressive|strong|advantage|distinguishing|leverag|exceptional|outstanding|great|provides? a significant)/.test(s))
    return { tone: "success", icon: Award, title: "Strength", text: sentence };
  if (/(concern|lack|weak|risk|issue|gap|low|below|behind|areas? for|critical)/.test(s))
    return { tone: "warning", icon: AlertTriangle, title: "Risk Area", text: sentence };
  if (/(aim for|should|target|focus|recommend|need to|must|strategy|secure admission)/.test(s))
    return { tone: "primary", icon: Target, title: "Action Plan", text: sentence };
  if (/(roi|fee|budget|salary|payback|lakhs|₹|cost|investment|financially)/.test(s))
    return { tone: "accent", icon: IndianRupee, title: "Financial Outlook", text: sentence };
  if (/(month|year|exam|deadline|prep|time|until)/.test(s))
    return { tone: "info", icon: Calendar, title: "Timeline", text: sentence };
  if (/(percentile|score|cat|xat|gmat|grade|10th|12th|graduat)/.test(s))
    return { tone: "info", icon: BarChart3, title: "Academic Profile", text: sentence };
  if (/(iim|fms|college|institut|admission|admit)/.test(s))
    return { tone: "primary", icon: Trophy, title: "College Strategy", text: sentence };
  return { tone: "info", icon: TrendingUp, title: "Insight", text: sentence };
};

const toneStyles: Record<Tone, { card: string; border: string; iconBg: string; iconColor: string; valueColor: string; bar: string; chip: string }> = {
  success: {
    card: "bg-gradient-to-br from-emerald-50 to-emerald-50/40 dark:from-emerald-950/30 dark:to-emerald-950/10",
    border: "border-emerald-200 dark:border-emerald-900",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    valueColor: "text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  warning: {
    card: "bg-gradient-to-br from-amber-50 to-amber-50/40 dark:from-amber-950/30 dark:to-amber-950/10",
    border: "border-amber-200 dark:border-amber-900",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-700 dark:text-amber-400",
    valueColor: "text-amber-700 dark:text-amber-400",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  primary: {
    card: "bg-gradient-to-br from-blue-50 to-blue-50/40 dark:from-blue-950/30 dark:to-blue-950/10",
    border: "border-blue-200 dark:border-blue-900",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-700 dark:text-blue-400",
    valueColor: "text-blue-700 dark:text-blue-400",
    bar: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  info: {
    card: "bg-gradient-to-br from-slate-50 to-slate-50/40 dark:from-slate-900/40 dark:to-slate-900/20",
    border: "border-slate-200 dark:border-slate-800",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-700 dark:text-slate-300",
    valueColor: "text-slate-800 dark:text-slate-200",
    bar: "bg-slate-400",
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  accent: {
    card: "bg-gradient-to-br from-violet-50 to-violet-50/40 dark:from-violet-950/30 dark:to-violet-950/10",
    border: "border-violet-200 dark:border-violet-900",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    iconColor: "text-violet-700 dark:text-violet-400",
    valueColor: "text-violet-700 dark:text-violet-400",
    bar: "bg-violet-500",
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
};

const splitIntoSentences = (raw: string): string[] => {
  const cleaned = raw.replace(/^["“”']+|["“”']+$/g, "").trim();
  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z₹0-9])/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 12);
};

export const SummaryHighlights = ({ text, name }: Props) => {
  if (!text) return null;
  const stats = extractStats(text);
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0 && stats.length === 0) return null;

  const pointers = sentences.map(classify);
  const firstName = name?.split(" ")[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Executive Snapshot{firstName ? ` • ${firstName}` : ""}
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30" />
      </div>

      {/* ───── KEY STATS STRIP ───── */}
      {stats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key Numbers from Your Profile
            </p>
            <span className="text-[10px] font-medium text-muted-foreground">
              {stats.length} metric{stats.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((stat, i) => {
              const styles = toneStyles[stat.tone];
              const Icon = stat.icon;
              return (
                <motion.div
                  key={`${stat.label}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  className={`relative overflow-hidden rounded-2xl border-2 ${styles.border} ${styles.card} p-4 text-left shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 ${styles.bar}`} />
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg ${styles.iconBg} ${styles.iconColor} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold leading-none ${styles.valueColor} mb-1.5`}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {stat.context}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── EXPLANATORY POINTERS ───── */}
      {pointers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What This Means for You
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
            {pointers.map((p, i) => {
              const styles = toneStyles[p.tone];
              const Icon = p.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
                  className={`relative overflow-hidden rounded-xl border ${styles.border} ${styles.card} p-4`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bar}`} />
                  <div className="flex items-start gap-3 pl-2">
                    <div className={`shrink-0 w-9 h-9 rounded-lg ${styles.iconBg} ${styles.iconColor} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${styles.chip}`}>
                        {p.title}
                      </span>
                      <p className="text-sm leading-relaxed text-foreground/90">{p.text}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryHighlights;
