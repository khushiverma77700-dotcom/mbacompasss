import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Plus, Lightbulb, ListChecks, Flame, BarChart3, Award,
  ArrowRight, ArrowLeft, CheckCircle2, Clock, Target, Zap, Trophy,
  CalendarDays, BookOpen, Brain, X, Play, Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DayPlannerAnimatedTour
 * ----------------------
 * A rich, animated, multi-step product tour for the Day Planner. Each step
 * shows a contextual *animated illustration* (mock task card, suggestion
 * cards sliding in, animated streak flame, growing analytics chart, etc.)
 * so the student can SEE what each feature does — not just read about it.
 *
 * Features:
 *  - Framer-motion slide transitions between steps with direction-aware easing
 *  - Animated progress dots + thin progress bar
 *  - Auto-play toggle (advances every ~5.5s)
 *  - Keyboard navigation (←/→, Esc)
 *  - Per-step illustration with looping micro-animations
 */

type Step = {
  id: string;
  badge: string;
  title: string;
  desc: string;
  accent: string; // tailwind gradient classes
  Illustration: React.FC;
};

// ----------- Illustrations -----------

const FloatingCalendar = () => (
  <div className="relative h-full w-full grid place-items-center">
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="relative h-36 w-36 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-2xl shadow-sky-500/40 ring-1 ring-white/30 flex flex-col items-center justify-center text-white"
    >
      <CalendarDays className="h-10 w-10 mb-1" />
      <div className="text-3xl font-extrabold leading-none">{new Date().getDate()}</div>
      <div className="text-xs uppercase tracking-widest opacity-80 mt-1">
        {new Date().toLocaleDateString(undefined, { month: "short" })}
      </div>
    </motion.div>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <motion.div
        key={i}
        className="absolute h-2 w-2 rounded-full bg-sky-400/70"
        initial={{ x: 0, y: 0, opacity: 0 }}
        animate={{
          x: [0, Math.cos((i * Math.PI) / 3) * 90],
          y: [0, Math.sin((i * Math.PI) / 3) * 90],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
      />
    ))}
    <Sparkles className="absolute top-4 right-6 h-5 w-5 text-amber-400 animate-pulse" />
    <Sparkles className="absolute bottom-6 left-6 h-4 w-4 text-sky-400 animate-pulse" />
  </div>
);

const AddTaskIllustration = () => (
  <div className="relative h-full w-full grid place-items-center">
    <motion.button
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 shadow-lg shadow-sky-500/40"
    >
      <Plus className="h-3.5 w-3.5" /> Add Task
    </motion.button>
    <motion.div
      key="task-card"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-[78%] rounded-2xl bg-white shadow-xl border border-sky-100 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-600 grid place-items-center shrink-0">
          <Target className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-gray-900">Sectional · QA — 30 mins</div>
            <span className="text-xs font-bold uppercase tracking-wider rounded-full bg-rose-100 text-rose-700 px-2 py-0.5">High</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> 6:30 PM · Today · Auto rollover
          </div>
          <div className="mt-3 flex gap-1.5">
            {["Time", "Priority", "Repeat", "Link mock"].map((chip) => (
              <motion.span
                key={chip}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + ["Time", "Priority", "Repeat", "Link mock"].indexOf(chip) * 0.12 }}
                className="text-xs rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5"
              >
                {chip}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  </div>
);

const SuggestionsIllustration = () => (
  <div className="relative h-full w-full overflow-hidden grid place-items-center">
    <div className="absolute top-2 left-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
      <Lightbulb className="h-3.5 w-3.5" /> Smart Suggestions for you
    </div>
    <div className="w-[88%] space-y-2 mt-6">
      {[
        { icon: Brain, label: "Revise: Time–Speed–Distance", tone: "violet" },
        { icon: BookOpen, label: "1 RC passage — Philosophy", tone: "emerald" },
        { icon: Target, label: "10 LR puzzles (medium)", tone: "sky" },
      ].map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.18, duration: 0.55, ease: "easeOut" }}
          className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2 shadow-xs"
        >
          <div className={cn("h-8 w-8 rounded-lg grid place-items-center", {
            "bg-violet-100 text-violet-600": s.tone === "violet",
            "bg-emerald-100 text-emerald-600": s.tone === "emerald",
            "bg-sky-100 text-sky-600": s.tone === "sky",
          })}>
            <s.icon className="h-4 w-4" />
          </div>
          <div className="text-xs font-medium text-gray-800 flex-1">{s.label}</div>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
            className="rounded-full bg-sky-600 text-white p-1"
          >
            <Plus className="h-3 w-3" />
          </motion.div>
        </motion.div>
      ))}
    </div>
  </div>
);

const CompleteXPIllustration = () => {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setChecked((c) => !c), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-full w-full grid place-items-center">
      <motion.div
        animate={{ scale: checked ? 1.02 : 1 }}
        className={cn(
          "w-[72%] rounded-2xl border p-4 flex items-center gap-3 shadow-md transition-colors",
          checked ? "bg-emerald-50 border-emerald-200" : "bg-white border-sky-100"
        )}
      >
        <motion.button
          animate={{ scale: checked ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.5 }}
          className={cn(
            "h-8 w-8 rounded-full grid place-items-center border-2 shrink-0",
            checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-sky-300"
          )}
        >
          <AnimatePresence>
            {checked && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <CheckCircle2 className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        <div className="flex-1">
          <div className={cn("text-sm font-semibold", checked && "line-through text-emerald-700")}>
            Full Mock · CAT Mock 12
          </div>
          <div className="text-xs text-muted-foreground">3:00 PM · 180 mins</div>
        </div>
      </motion.div>
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ duration: 0.9 }}
            className="absolute inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 shadow-lg"
          >
            <Zap className="h-3.5 w-3.5" /> +25 XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StreakIllustration = () => (
  <div className="relative h-full w-full grid place-items-center">
    <motion.div
      animate={{ scale: [1, 1.08, 1], rotate: [-2, 2, -2] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      className="relative grid place-items-center"
    >
      <div className="absolute inset-0 rounded-full bg-orange-400/40 blur-2xl scale-150" />
      <div className="relative h-28 w-28 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 grid place-items-center shadow-2xl shadow-orange-500/40">
        <Flame className="h-14 w-14 text-white drop-shadow-lg" />
      </div>
      <div className="absolute -bottom-2 bg-white rounded-full px-3 py-1 text-xs font-bold text-orange-600 shadow-md border border-orange-100">
        12-day streak
      </div>
    </motion.div>
    <div className="absolute top-3 left-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Trophy className="h-3.5 w-3.5 text-amber-500" /> Longest: 27 days
    </div>
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className="absolute h-1.5 w-1.5 rounded-full bg-amber-400"
        style={{ top: "55%", left: "50%" }}
        animate={{
          x: [0, (i - 2) * 18, (i - 2) * 30],
          y: [0, -40 - i * 8, -90 - i * 5],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18 }}
      />
    ))}
  </div>
);

const TabsFlowIllustration = () => {
  const tabs = ["Yesterday", "Today", "Tomorrow"];
  const [active, setActive] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % 3), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-full w-full grid place-items-center">
      <div className="w-[82%] space-y-3">
        <div className="relative grid grid-cols-3 gap-1 p-1 rounded-xl bg-sky-50 border border-sky-100">
          {tabs.map((t, i) => (
            <button
              key={t}
              className={cn(
                "relative z-10 text-xs font-semibold py-1.5 rounded-lg transition-colors",
                active === i ? "text-white" : "text-sky-700"
              )}
            >
              {t}
            </button>
          ))}
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm"
            style={{ width: "calc(33.333% - 0.25rem)", left: `calc(${active * 33.333}% + 0.125rem)` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-1.5"
          >
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2 rounded-lg bg-white border border-gray-100 px-3 py-2">
                <div className="h-4 w-4 rounded-full border-2 border-sky-300" />
                <div className="h-2 rounded-full bg-gray-100 flex-1" style={{ width: `${60 + n * 8}%` }} />
                <div className="text-xs text-muted-foreground">{30 * n}m</div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const PerformanceIllustration = () => {
  const bars = [40, 62, 55, 78, 70, 88, 95];
  return (
    <div className="relative h-full w-full grid place-items-center">
      <div className="w-[82%] rounded-2xl bg-white border border-sky-100 p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-rose-500" /> Last 7 days
          </div>
          <div className="text-xs text-emerald-600 font-semibold">+22% ↑</div>
        </div>
        <div className="flex items-end justify-between gap-1.5 h-24">
          {bars.map((v, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${v}%` }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
              className="flex-1 rounded-md bg-gradient-to-t from-sky-500 to-violet-400"
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5 text-xs text-muted-foreground text-center">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
      </div>
    </div>
  );
};

// ----------- Steps -----------

const STEPS: Step[] = [
  {
    id: "welcome",
    badge: "Welcome",
    title: "Your personal CAT war-room",
    desc: "The Day Planner turns 'I'll figure it out' into a structured daily attack plan. Let's take a 60-second tour so you can plan smarter from today itself.",
    accent: "from-sky-500 via-blue-500 to-indigo-600",
    Illustration: FloatingCalendar,
  },
  {
    id: "add",
    badge: "Step 1 of 6",
    title: "Add a task in 5 seconds",
    desc: "Tap Add Task to schedule any study block — Mock, Sectional, Revision, RC, VARC, Quant. Set time, priority and even recurrence (every Mon / Wed / Fri).",
    accent: "from-sky-500 to-cyan-500",
    Illustration: AddTaskIllustration,
  },
  {
    id: "suggestions",
    badge: "Step 2 of 6",
    title: "AI suggests, you click",
    desc: "Personalised study suggestions appear on top of your planner based on your weak areas and upcoming mocks. One click adds them — zero typing.",
    accent: "from-amber-500 to-orange-500",
    Illustration: SuggestionsIllustration,
  },
  {
    id: "tabs",
    badge: "Step 3 of 6",
    title: "Yesterday · Today · Tomorrow",
    desc: "Jump across days with one tap. Plan tomorrow tonight, recover yesterday's misses, and stay laser-focused on today — all from one screen.",
    accent: "from-violet-500 to-fuchsia-500",
    Illustration: TabsFlowIllustration,
  },
  {
    id: "complete",
    badge: "Step 4 of 6",
    title: "Tick off. Earn XP. Repeat.",
    desc: "Every completed task earns XP, builds your streak, and feeds your performance graph. Missed tasks auto-roll over so nothing slips.",
    accent: "from-emerald-500 to-teal-500",
    Illustration: CompleteXPIllustration,
  },
  {
    id: "streak",
    badge: "Step 5 of 6",
    title: "Keep your streak alive",
    desc: "Complete at least one task daily. Your current streak and longest streak sit on top of the dashboard — consistency beats intensity, always.",
    accent: "from-orange-500 to-rose-500",
    Illustration: StreakIllustration,
  },
  {
    id: "performance",
    badge: "Step 6 of 6",
    title: "Track. Adjust. Win.",
    desc: "Open Planner Performance to see completion %, time-per-subject, weak-day patterns and trends across weeks. Spot what's working — double down.",
    accent: "from-rose-500 to-pink-500",
    Illustration: PerformanceIllustration,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DayPlannerAnimatedTour({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setDirection(1);
      setAutoPlay(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !autoPlay) return;
    const t = setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 6000);
    return () => clearTimeout(t);
  }, [index, autoPlay, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { setDirection(1); setIndex((i) => Math.min(STEPS.length - 1, i + 1)); }
      if (e.key === "ArrowLeft")  { setDirection(-1); setIndex((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const step = STEPS[index];
  const Illust = step.Illustration;
  const isLast = index === STEPS.length - 1;
  const progress = useMemo(() => ((index + 1) / STEPS.length) * 100, [index]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className="relative rounded-2xl overflow-hidden bg-white shadow-2xl ring-1 ring-sky-100">
          {/* Top progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-100/60 z-20">
            <motion.div
              className={cn("h-full bg-gradient-to-r", step.accent)}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-500 hover:text-gray-800 shadow-sm ring-1 ring-gray-200"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="grid md:grid-cols-2 min-h-[440px]">
            {/* Left: animated illustration */}
            <div className={cn("relative overflow-hidden bg-gradient-to-br p-6", step.accent)}>
              <div className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.4), transparent 40%)",
                }}
              />
              <div className="relative h-full w-full rounded-2xl bg-white/85 backdrop-blur-sm ring-1 ring-white/40 overflow-hidden min-h-[300px]">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step.id}
                    custom={direction}
                    initial={{ opacity: 0, x: direction * 40, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -direction * 40, scale: 0.96 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <Illust />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right: copy + controls */}
            <div className="flex flex-col p-6 sm:p-8">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id + "-copy"}
                  custom={direction}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35 }}
                  className="flex-1"
                >
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full bg-gradient-to-r", step.accent)}>
                    <Sparkles className="h-3 w-3" /> {step.badge}
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm sm:text-sm text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>

                  {isLast && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-800 flex items-start gap-2"
                    >
                      <Award className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                      <span><strong>Pro tip:</strong> Plan tomorrow tonight. 5 minutes of planning saves an hour of confusion.</span>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="mt-6 flex items-center justify-center gap-1.5">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                    aria-label={`Go to step ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-8 bg-sky-600" : "w-2 bg-gray-300 hover:bg-gray-400"
                    )}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="mt-5 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoPlay((a) => !a)}
                  className="text-xs text-muted-foreground gap-1.5"
                >
                  {autoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {autoPlay ? "Pause" : "Auto-play"}
                </Button>

                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setDirection(-1); setIndex((i) => Math.max(0, i - 1)); setAutoPlay(false); }}
                      className="gap-1.5"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                  )}
                  {!isLast ? (
                    <Button
                      size="sm"
                      onClick={() => { setDirection(1); setIndex((i) => Math.min(STEPS.length - 1, i + 1)); setAutoPlay(false); }}
                      className={cn("gap-1.5 text-white bg-gradient-to-r", step.accent)}
                    >
                      Next <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={onClose}
                      className="gap-1.5 text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                      Let's plan <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors self-center"
              >
                Skip tour
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
