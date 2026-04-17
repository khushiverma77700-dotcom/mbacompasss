import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, MousePointerClick, Sparkles } from "lucide-react";

interface Props {
  message?: string;
  variant?: "inline" | "banner";
  tone?: "primary" | "emerald" | "violet";
}

/**
 * Animated nudge prompting users to click other tabs.
 * Uses pulsing pointer + sliding arrow + shimmer.
 */
const TabHint: React.FC<Props> = ({
  message = "Click other tabs to explore deeper insights",
  variant = "banner",
  tone = "primary",
}) => {
  const tones = {
    primary: {
      bg: "from-primary/10 via-blue-50 to-primary/5",
      border: "border-primary/25",
      text: "text-primary",
      dot: "bg-primary",
      shimmer: "via-primary/20",
    },
    emerald: {
      bg: "from-emerald-50 via-emerald-50/60 to-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      shimmer: "via-emerald-200/40",
    },
    violet: {
      bg: "from-violet-50 via-violet-50/60 to-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
      dot: "bg-violet-500",
      shimmer: "via-violet-200/40",
    },
  }[tone];

  if (variant === "inline") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`inline-flex items-center gap-2 text-[11px] font-semibold ${tones.text}`}
      >
        <motion.span
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.span>
        {message}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`relative overflow-hidden rounded-xl border ${tones.border} bg-gradient-to-r ${tones.bg} px-4 py-2.5 mt-3 flex items-center justify-between gap-3`}
    >
      {/* Shimmer sweep */}
      <motion.div
        aria-hidden
        className={`absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent ${tones.shimmer} to-transparent pointer-events-none`}
        animate={{ x: ["0%", "400%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="flex items-center gap-2.5 relative z-[1]">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className={`w-7 h-7 rounded-full ${tones.dot} text-white flex items-center justify-center shadow-sm`}
        >
          <MousePointerClick className="w-3.5 h-3.5" />
        </motion.div>
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${tones.text} flex items-center gap-1.5`}>
            <Sparkles className="w-3 h-3" /> Tip
          </span>
          <span className="text-[11px] md:text-xs text-foreground/80 font-medium leading-tight">
            {message}
          </span>
        </div>
      </div>

      {/* Bouncing arrows pointing to tabs */}
      <div className="flex items-center gap-1 relative z-[1]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ x: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
            className={`${tones.text}`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

export default TabHint;
