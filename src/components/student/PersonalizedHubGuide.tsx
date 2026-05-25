import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles, BookOpen, Timer, PlayCircle, CheckCircle2, BarChart3,
  ArrowRight, ArrowLeft, Rocket, Brain, Target, Zap, FileText,
  Activity, Trophy, X, Pause, Play, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "personalizedHubGuideSeen_v2";

type Step = {
  id: string;
  badge: string;
  title: string;
  desc: string;
  accent: string;
  Illustration: React.FC;
};

// ---------- Illustrations ----------

const WelcomeIllustration = () => (
  <div className="relative h-full w-full grid place-items-center">
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="relative h-32 w-32 rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 shadow-2xl shadow-fuchsia-500/40 grid place-items-center text-white"
    >
      <Brain className="h-14 w-14" />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-3xl border-2 border-white/40"
      />
    </motion.div>
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <motion.div
        key={i}
        className="absolute h-1.5 w-1.5 rounded-full bg-fuchsia-400/70"
        animate={{
          x: [0, Math.cos((i * Math.PI) / 4) * 110],
          y: [0, Math.sin((i * Math.PI) / 4) * 110],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
    <Sparkles className="absolute top-4 right-6 h-5 w-5 text-amber-400 animate-pulse" />
    <Sparkles className="absolute bottom-6 left-6 h-4 w-4 text-fuchsia-400 animate-pulse" />
  </div>
);

const ExamPickIllustration = () => {
  const exams = ["CAT", "XAT", "NMAT", "SNAP", "IIFT", "CMAT", "MAT"];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % exams.length), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-full w-full grid place-items-center p-6">
      <div className="flex flex-wrap gap-2 justify-center max-w-[260px]">
        {exams.map((e, i) => (
          <motion.div
            key={e}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: active === i ? 1.08 : 1,
            }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
            className={cn(
              "px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors shadow-sm",
              active === i
                ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white border-transparent shadow-lg shadow-sky-500/40"
                : "bg-white text-sky-700 border-sky-100"
            )}
          >
            {e}
          </motion.div>
        ))}
      </div>
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> {exams[active]} selected
      </motion.div>
    </div>
  );
};

const SectionsIllustration = () => {
  const items = [
    { label: "Quant (QA)", icon: Target, tone: "violet" },
    { label: "VARC", icon: BookOpen, tone: "emerald" },
    { label: "LRDI", icon: Activity, tone: "sky" },
  ];
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setChecked((prev) => {
        const next = [...prev];
        next[i % 3] = !next[i % 3];
        i++;
        return next;
      });
    }, 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-full w-full grid place-items-center p-6">
      <div className="w-full max-w-[260px] space-y-2">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white transition-all",
              checked[i] ? "border-sky-300 ring-2 ring-sky-100 shadow-md" : "border-gray-200"
            )}
          >
            <div className={cn("h-8 w-8 rounded-lg grid place-items-center", {
              "bg-violet-100 text-violet-600": it.tone === "violet",
              "bg-emerald-100 text-emerald-600": it.tone === "emerald",
              "bg-sky-100 text-sky-600": it.tone === "sky",
            })}>
              <it.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800 flex-1">{it.label}</span>
            <motion.div
              animate={{ scale: checked[i] ? [1, 1.3, 1] : 1 }}
              className={cn(
                "h-5 w-5 rounded-md border-2 grid place-items-center transition-colors",
                checked[i] ? "bg-sky-600 border-sky-600 text-white" : "border-gray-300"
              )}
            >
              {checked[i] && <CheckCircle2 className="h-3.5 w-3.5" />}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const DifficultyIllustration = () => {
  const levels = ["Easy", "Medium", "Hard", "Mixed"];
  const [active, setActive] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % 4), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-full w-full grid place-items-center p-6">
      <div className="w-full max-w-[280px] space-y-4">
        <div className="grid grid-cols-4 gap-1.5">
          {levels.map((l, i) => (
            <button
              key={l}
              className={cn(
                "text-[11px] font-bold py-2 rounded-lg border transition-all",
                active === i
                  ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white border-transparent shadow"
                  : "bg-white text-gray-600 border-gray-200"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span className="font-semibold">Questions</span>
            <span className="font-bold text-sky-600">15Q</span>
          </div>
          <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500"
              animate={{ width: ["20%", "70%", "45%", "85%", "50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-2.5 py-1">
          <Timer className="h-3 w-3" /> Auto: 1 min / question
        </div>
      </div>
    </div>
  );
};

const GenerateIllustration = () => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 3), 1400);
    return () => clearInterval(t);
  }, []);
  const labels = ["Picking questions…", "Calibrating difficulty…", "Mock ready!"];
  return (
    <div className="relative h-full w-full grid place-items-center p-6">
      <div className="relative h-28 w-28">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-sky-200 border-t-sky-600"
        />
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-lg"
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="absolute bottom-6 text-xs font-semibold text-gray-700"
        >
          {labels[phase]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const AttemptIllustration = () => {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      setSelected((s) => (s === null ? 0 : s === 3 ? 0 : s + 1));
    }, 900);
    return () => clearInterval(t);
  }, []);
  const options = ["58", "62", "79", "100"];
  return (
    <div className="relative h-full w-full grid place-items-center p-5">
      <div className="w-full max-w-[280px] rounded-xl bg-white border border-gray-200 shadow-md p-3 space-y-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-gray-700">Q3 / 15</span>
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-flex items-center gap-1 text-sky-700 font-semibold"
          >
            <Timer className="h-3 w-3" /> 12:48
          </motion.span>
        </div>
        <div className="rounded-md bg-sky-50/50 border border-sky-100 p-2 text-xs text-gray-800">
          If x + y = 10 and xy = 21, find x² + y²
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {options.map((o, i) => (
            <motion.div
              key={o}
              animate={{ scale: selected === i ? 1.04 : 1 }}
              className={cn(
                "text-xs px-2 py-1.5 rounded-md border transition-colors",
                selected === i
                  ? o === "58"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold"
                    : "border-sky-300 bg-sky-50 text-sky-700"
                  : "bg-white border-gray-200 text-gray-600"
              )}
            >
              {String.fromCharCode(65 + i)}. {o}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReportIllustration = () => (
  <div className="relative h-full w-full grid place-items-center p-5">
    <div className="w-full max-w-[280px] rounded-xl bg-white border border-sky-100 shadow-md p-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Score", v: "42", c: "from-sky-500 to-blue-600" },
          { l: "Accuracy", v: "78%", c: "from-emerald-500 to-teal-600" },
          { l: "Time", v: "11m", c: "from-violet-500 to-fuchsia-600" },
        ].map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="rounded-lg border bg-white p-2 text-center"
          >
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className={cn("text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-br", s.c)}>
              {s.v}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="rounded-lg bg-gradient-to-br from-sky-50 to-violet-50 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-700 inline-flex items-center gap-1">
            <BarChart3 className="h-3 w-3 text-rose-500" /> Trend (8 attempts)
          </span>
          <span className="text-[10px] font-bold text-emerald-600">+34% ↑</span>
        </div>
        <svg viewBox="0 0 200 50" className="w-full h-10">
          <defs>
            <linearGradient id="rep-grad" x1="0" x2="1">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <motion.polyline
            fill="none"
            stroke="url(#rep-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            points="0,42 28,36 56,38 84,24 112,28 140,16 168,12 200,6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          {[0, 28, 56, 84, 112, 140, 168, 200].map((x, i) => {
            const y = [42, 36, 38, 24, 28, 16, 12, 6][i];
            return (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r="2.5"
                fill="#0ea5e9"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 * i + 0.6 }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  </div>
);

// ---------- Steps ----------

const STEPS: Step[] = [
  {
    id: "welcome",
    badge: "Welcome",
    title: "AI-built mocks, made just for you",
    desc: "Personalized Mock Hub generates fresh CAT / XAT / NMAT / SNAP / IIFT / CMAT / MAT mocks on demand — no two sets ever repeat. Let's take a quick tour.",
    accent: "from-violet-500 via-fuchsia-500 to-rose-500",
    Illustration: WelcomeIllustration,
  },
  {
    id: "exam",
    badge: "Step 1 of 6",
    title: "Pick your target exam",
    desc: "Choose one of 7 supported exams. The sections, time limits and difficulty distribution automatically follow that exam's official paper pattern.",
    accent: "from-sky-500 to-blue-600",
    Illustration: ExamPickIllustration,
  },
  {
    id: "sections",
    badge: "Step 2 of 6",
    title: "Choose your sections",
    desc: "Want a Quant-only drill today? Tick just Quant. Need full-length practice? Pick all three. The AI builds the mock around exactly what you select.",
    accent: "from-emerald-500 to-teal-600",
    Illustration: SectionsIllustration,
  },
  {
    id: "difficulty",
    badge: "Step 3 of 6",
    title: "Difficulty & length, your call",
    desc: "Pick Easy / Medium / Hard / Mixed and choose 5–50 questions. Duration auto-sets to 1 minute per question — just like the real test.",
    accent: "from-amber-500 to-orange-500",
    Illustration: DifficultyIllustration,
  },
  {
    id: "generate",
    badge: "Step 4 of 6",
    title: "Tap Generate. AI does the rest.",
    desc: "Our AI hand-picks questions from the question bank, calibrates difficulty, and serves you a fresh test in seconds. No repeats. Ever.",
    accent: "from-violet-500 to-fuchsia-600",
    Illustration: GenerateIllustration,
  },
  {
    id: "attempt",
    badge: "Step 5 of 6",
    title: "Real exam feel",
    desc: "Timed test interface with navigation, mark-for-review and auto-save. Submit when done — your attempt is locked in instantly.",
    accent: "from-cyan-500 to-sky-600",
    Illustration: AttemptIllustration,
  },
  {
    id: "report",
    badge: "Step 6 of 6",
    title: "See your report & trend",
    desc: "Instant score, accuracy, time-per-section, full solutions and a trend chart across all your previous mocks — spot weak areas fast.",
    accent: "from-rose-500 to-pink-600",
    Illustration: ReportIllustration,
  },
];

export default function PersonalizedHubGuide({
  forceOpen,
  onClose,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [autoPlay, setAutoPlay] = useState(true);

  // Open: when forced, or first-time visit.
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setIndex(0);
      setDirection(1);
      setAutoPlay(true);
      return;
    }
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, [forceOpen]);

  // Auto-advance.
  useEffect(() => {
    if (!open || !autoPlay) return;
    const t = setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 6000);
    return () => clearTimeout(t);
  }, [index, autoPlay, open]);

  // Keyboard nav.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { setDirection(1); setIndex((i) => Math.min(STEPS.length - 1, i + 1)); }
      if (e.key === "ArrowLeft")  { setDirection(-1); setIndex((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    onClose?.();
  };

  const step = STEPS[index];
  const Illust = step.Illustration;
  const isLast = index === STEPS.length - 1;
  const progress = useMemo(() => ((index + 1) / STEPS.length) * 100, [index]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
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
            onClick={handleClose}
            className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-500 hover:text-gray-800 shadow ring-1 ring-gray-200"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="grid md:grid-cols-2 min-h-[440px]">
            {/* Left: animated illustration */}
            <div className={cn("relative overflow-hidden bg-gradient-to-br p-6", step.accent)}>
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.55), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.45), transparent 40%)",
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
                  <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full bg-gradient-to-r", step.accent)}>
                    <Sparkles className="h-3 w-3" /> {step.badge}
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-[26px] font-extrabold text-gray-900 leading-tight">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm sm:text-[15px] text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>

                  {isLast && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-800 flex items-start gap-2"
                    >
                      <Trophy className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                      <span><strong>Pro tip:</strong> Run a 10-question Hard QA drill every morning. Compounding gains in 2 weeks.</span>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="mt-6 flex items-center justify-center gap-1.5">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); setAutoPlay(false); }}
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
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleClose}
                      className="gap-1.5 text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                      <Rocket className="h-3.5 w-3.5" /> Let's go
                    </Button>
                  )}
                </div>
              </div>

              <button
                onClick={handleClose}
                className="mt-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors self-center"
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

export { STORAGE_KEY as PERSONALIZED_HUB_GUIDE_KEY };
