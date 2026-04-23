import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Target, Award, GraduationCap, Briefcase, IndianRupee, Calendar, Trophy } from "lucide-react";

interface Props {
  text: string;
  name?: string;
}

type Tone = "success" | "warning" | "info" | "primary" | "accent";

interface Pointer {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

// Heuristic classifier — picks tone + icon based on keywords in the sentence.
const classify = (sentence: string): Pointer => {
  const s = sentence.toLowerCase();

  if (/(excellent|impressive|strong|advantage|distinguishing|leverag|exceptional|outstanding|great)/.test(s))
    return { tone: "success", icon: Award, text: sentence };
  if (/(concern|lack|weak|risk|issue|gap|low|below|behind|critical|areas? for)/.test(s))
    return { tone: "warning", icon: AlertTriangle, text: sentence };
  if (/(aim for|should|target|focus|recommend|need to|must|strategy|plan)/.test(s))
    return { tone: "primary", icon: Target, text: sentence };
  if (/(roi|fee|budget|salary|payback|lakhs|₹|cost|investment)/.test(s))
    return { tone: "accent", icon: IndianRupee, text: sentence };
  if (/(month|year|exam|deadline|prep|time|until)/.test(s))
    return { tone: "info", icon: Calendar, text: sentence };
  if (/(percentile|score|cat|xat|gmat|grade|10th|12th|graduat)/.test(s))
    return { tone: "info", icon: GraduationCap, text: sentence };
  if (/(work|experience|job|career|cfa|certif)/.test(s))
    return { tone: "success", icon: Briefcase, text: sentence };
  if (/(iim|fms|college|institut|admission|admit)/.test(s))
    return { tone: "primary", icon: Trophy, text: sentence };

  return { tone: "info", icon: TrendingUp, text: sentence };
};

const toneStyles: Record<Tone, { bg: string; border: string; iconBg: string; iconColor: string; accent: string }> = {
  success: {
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-900",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    accent: "before:bg-emerald-500",
  },
  warning: {
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-700 dark:text-amber-400",
    accent: "before:bg-amber-500",
  },
  primary: {
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-900",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-700 dark:text-blue-400",
    accent: "before:bg-blue-500",
  },
  info: {
    bg: "bg-slate-50/60 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-800",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-700 dark:text-slate-300",
    accent: "before:bg-slate-400",
  },
  accent: {
    bg: "bg-violet-50/60 dark:bg-violet-950/20",
    border: "border-violet-200 dark:border-violet-900",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    iconColor: "text-violet-700 dark:text-violet-400",
    accent: "before:bg-violet-500",
  },
};

const splitIntoSentences = (raw: string): string[] => {
  const cleaned = raw.replace(/^[\\"“”']+|[\\"“”']+$/g, "").trim();
  // Split on sentence boundary; keep punctuation. Filter tiny fragments.
  const parts = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z₹0-9])/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 12);
  return parts;
};

export const SummaryHighlights = ({ text, name }: Props) => {
  if (!text) return null;
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return null;

  const pointers = sentences.map(classify);
  const firstName = name?.split(" ")[0];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header strip */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Executive Snapshot{firstName ? ` • ${firstName}` : ""}
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30" />
      </div>

      {/* Pointer grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
        {pointers.map((p, i) => {
          const styles = toneStyles[p.tone];
          const Icon = p.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`relative overflow-hidden rounded-xl border ${styles.border} ${styles.bg} p-4 pl-5 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${styles.accent}`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-9 h-9 rounded-lg ${styles.iconBg} ${styles.iconColor} flex items-center justify-center`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-sm leading-relaxed text-foreground/90 pt-1">{p.text}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SummaryHighlights;
