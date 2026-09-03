import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Target, Layers, Gauge, Timer, Sparkles, CheckCircle2, Loader2,
} from "lucide-react";

interface Step {
  key: string;
  icon: any;
  title: string;
  detail: string;
}

interface Props {
  open: boolean;
  examCode: string;
  sections: string[];
  difficulty: string;
  numQuestions: number;
}

/**
 * Full-screen, explanatory overlay shown while a personalized mock is being
 * generated. Walks the student through what the AI is doing in real time so
 * the wait feels meaningful instead of opaque.
 */
export default function PersonalizedMockGeneratingOverlay({
  open, examCode, sections, difficulty, numQuestions,
}: Props) {
  const steps: Step[] = [
    {
      key: "profile",
      icon: Brain,
      title: "Analyzing your learning profile",
      detail: `Reviewing your recent ${examCode} attempts, weak topics and accuracy trends.`,
    },
    {
      key: "topics",
      icon: Target,
      title: "Mapping focus topics",
      detail: `Prioritising sections you picked: ${sections.slice(0, 3).join(", ")}${sections.length > 3 ? "…" : ""}.`,
    },
    {
      key: "curate",
      icon: Layers,
      title: "Curating fresh questions",
      detail: `Selecting ${numQuestions} unseen questions from the personalized bank.`,
    },
    {
      key: "calibrate",
      icon: Gauge,
      title: "Calibrating difficulty",
      detail: `Balancing the paper for "${difficulty}" mode so it stretches you the right amount.`,
    },
    {
      key: "timing",
      icon: Timer,
      title: "Setting smart timing",
      detail: `Auto-allocating ${numQuestions} minute${numQuestions === 1 ? "" : "s"} based on question mix.`,
    },
    {
      key: "finalize",
      icon: Sparkles,
      title: "Finalising your personalized mock",
      detail: "Compiling the paper and preparing the runner. Almost there…",
    },
  ];

  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) { setIdx(0); setCompleted(new Set()); return; }
    let i = 0;
    const tick = () => {
      setCompleted((s) => new Set(s).add(i));
      i = Math.min(i + 1, steps.length - 1);
      setIdx(i);
    };
    // advance through steps, slowing down on the last one to feel natural
    const timers: number[] = [];
    [1200, 1400, 1600, 1700, 1800].forEach((d, k) => {
      timers.push(window.setTimeout(tick, [0, 1200, 2600, 4200, 5900, 7700][k + 1]));
    });
    return () => { timers.forEach(clearTimeout); };
  }, [open]);

  if (!open) return null;

  const progress = Math.min(100, Math.round(((idx + 1) / steps.length) * 100));

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm grid place-items-center px-4 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-sky-100"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-sky-50 via-white to-blue-50 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-sky-200/50 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-lg shadow-sky-500/30"
            >
              <Sparkles className="h-6 w-6" />
            </motion.div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-700">Building your mock</div>
              <h3 className="text-lg font-bold text-slate-900 truncate">
                {examCode} · {numQuestions} Qs · {difficulty}
              </h3>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative mt-5 h-2 rounded-full bg-sky-100 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 via-blue-500 to-sky-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-white/40 blur-xs"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
            <span>Step {Math.min(idx + 1, steps.length)} of {steps.length}</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-2.5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isDone = completed.has(i) && i < idx;
            const isActive = i === idx;
            const isPending = i > idx;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: isPending ? 0.45 : 1,
                  x: 0,
                }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  isActive
                    ? "border-sky-300 bg-sky-50/70 shadow-xs"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-slate-100 bg-white"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-500/30"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </motion.div>
                  ) : (
                    <Icon className="h-4.5 w-4.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold ${isActive ? "text-sky-900" : isDone ? "text-emerald-800" : "text-slate-700"}`}>
                    {s.title}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 leading-snug">{s.detail}</div>
                </div>
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="shrink-0 self-center"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="px-6 pb-5 pt-1 text-center text-xs text-slate-500">
          Keep this window open — your personalized mock will load automatically.
        </div>
      </motion.div>
    </div>
  );
}
