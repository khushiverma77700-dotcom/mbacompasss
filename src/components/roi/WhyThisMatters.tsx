import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, type LucideIcon } from "lucide-react";

type Tone = "blue" | "emerald" | "violet" | "amber" | "rose";

interface Props {
  icon: LucideIcon;
  title: string;
  purpose: string;
  bullets: string[];
  tone?: Tone;
}

const TONES: Record<Tone, { grad: string; border: string; chip: string; icon: string; dot: string; text: string }> = {
  blue:    { grad: "from-blue-50 via-blue-50/60 to-white",       border: "border-blue-200",    chip: "bg-blue-100 text-blue-700",       icon: "bg-blue-500",    dot: "text-blue-500",    text: "text-blue-700" },
  emerald: { grad: "from-emerald-50 via-emerald-50/60 to-white", border: "border-emerald-200", chip: "bg-emerald-100 text-emerald-700", icon: "bg-emerald-500", dot: "text-emerald-500", text: "text-emerald-700" },
  violet:  { grad: "from-violet-50 via-violet-50/60 to-white",   border: "border-violet-200",  chip: "bg-violet-100 text-violet-700",   icon: "bg-violet-500",  dot: "text-violet-500",  text: "text-violet-700" },
  amber:   { grad: "from-amber-50 via-amber-50/60 to-white",     border: "border-amber-200",   chip: "bg-amber-100 text-amber-700",     icon: "bg-amber-500",   dot: "text-amber-500",   text: "text-amber-700" },
  rose:    { grad: "from-rose-50 via-rose-50/60 to-white",       border: "border-rose-200",    chip: "bg-rose-100 text-rose-700",       icon: "bg-rose-500",    dot: "text-rose-500",    text: "text-rose-700" },
};

const WhyThisMatters: React.FC<Props> = ({ icon: Icon, title, purpose, bullets, tone = "blue" }) => {
  const t = TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border ${t.border} bg-gradient-to-br ${t.grad} p-4 md:p-5 shadow-sm`}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl ${t.icon} text-white flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${t.chip}`}>Why this matters</span>
            <h3 className="text-sm md:text-base font-bold text-foreground">{title}</h3>
          </div>
          <p className="text-xs md:text-sm text-foreground/80 font-medium leading-relaxed mb-2.5">
            {purpose}
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] md:text-xs text-foreground/75 leading-snug">
                <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${t.dot}`} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default WhyThisMatters;
