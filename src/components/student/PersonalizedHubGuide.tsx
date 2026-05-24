import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, BookOpen, SlidersHorizontal, Timer, PlayCircle,
  CheckCircle2, BarChart3, ArrowRight, ArrowLeft, Rocket,
} from "lucide-react";

const STORAGE_KEY = "personalizedHubGuideSeen_v1";

type Step = {
  title: string;
  subtitle: string;
  body: React.ReactNode;
  demo: React.ReactNode;
};

function ExamPickDemo() {
  const exams = ["CAT", "XAT", "NMAT", "SNAP", "IIFT"];
  return (
    <div className="relative h-44 rounded-xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 overflow-hidden flex items-center justify-center">
      <div className="flex gap-2 flex-wrap justify-center px-4">
        {exams.map((e, i) => (
          <div
            key={e}
            className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold text-sky-700 shadow-sm animate-fade-in"
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
          >
            {e}
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-3 right-3 h-9 rounded-md border-2 border-sky-400 bg-sky-50/60 flex items-center px-3 text-xs font-medium text-sky-800 animate-pulse">
        <CheckCircle2 className="h-4 w-4 mr-2" /> CAT selected
      </div>
    </div>
  );
}

function SectionsDemo() {
  const items = [
    { label: "Quant", on: true },
    { label: "VARC", on: true },
    { label: "LRDI", on: false },
  ];
  return (
    <div className="h-44 rounded-xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 p-4 flex flex-col gap-2 justify-center">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg border bg-white text-sm animate-fade-in ${
            it.on ? "border-sky-300 ring-1 ring-sky-200" : ""
          }`}
          style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}
        >
          <span className={`h-4 w-4 rounded border flex items-center justify-center ${it.on ? "bg-sky-600 border-sky-600" : "border-gray-300"}`}>
            {it.on && <CheckCircle2 className="h-3 w-3 text-white" />}
          </span>
          <span className="font-medium">{it.label}</span>
          {it.on && <Badge variant="secondary" className="ml-auto text-[10px]">Included</Badge>}
        </div>
      ))}
    </div>
  );
}

function DifficultyDemo() {
  return (
    <div className="h-44 rounded-xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 p-4 flex flex-col justify-center gap-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Easy</span><span>Medium</span><span>Hard</span><span>Mixed</span>
      </div>
      <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
        <div className="h-full w-2/3 bg-gradient-to-r from-sky-400 to-sky-600 animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[5, 10, 15, 20].map((n, i) => (
          <div
            key={n}
            className={`text-center py-2 rounded-md border text-sm font-semibold animate-fade-in ${
              n === 15 ? "bg-sky-600 text-white border-sky-600" : "bg-white"
            }`}
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
          >
            {n}Q
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-sky-800">
        <Timer className="h-3 w-3" /> Duration auto = 1 min / question
      </div>
    </div>
  );
}

function AttemptDemo() {
  return (
    <div className="h-44 rounded-xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">Q3 of 15</span>
        <span className="flex items-center gap-1 text-sky-700"><Timer className="h-3 w-3" /> 12:48</span>
      </div>
      <div className="p-2 rounded-md bg-white border text-xs">
        If x + y = 10 and xy = 21, find x² + y²
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["58", "62", "79", "100"].map((o, i) => (
          <div
            key={o}
            className={`text-xs px-2 py-1.5 rounded border bg-white animate-fade-in ${
              o === "58" ? "border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold" : ""
            }`}
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
          >
            {String.fromCharCode(65 + i)}. {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportDemo() {
  return (
    <div className="h-44 rounded-xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 p-4 flex flex-col gap-2 justify-center">
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Score", v: "42", c: "text-sky-700" },
          { l: "Accuracy", v: "78%", c: "text-emerald-600" },
          { l: "Time", v: "11m", c: "text-sky-700" },
        ].map((s, i) => (
          <div
            key={s.l}
            className="p-2 rounded-lg border bg-white text-center animate-fade-in"
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
          >
            <div className="text-[10px] text-muted-foreground">{s.l}</div>
            <div className={`text-lg font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 200 50" className="w-full h-12">
        <polyline
          fill="none"
          stroke="#0284c7"
          strokeWidth="2"
          points="0,40 30,32 60,36 90,22 120,26 150,14 180,10 200,6"
          strokeDasharray="400"
          strokeDashoffset="400"
          style={{ animation: "dash 1.4s ease-out forwards" }}
        />
        <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
      </svg>
    </div>
  );
}

const STEPS: Step[] = [
  {
    title: "Welcome to Personalized Mock Hub",
    subtitle: "AI-built mocks, tailored to you",
    body: (
      <p>
        Generate <b>unlimited mini-mocks</b> for CAT, XAT, NMAT, SNAP, IIFT, CMAT & MAT —
        each one freshly created from our AI question bank so you never repeat the same set.
      </p>
    ),
    demo: <ExamPickDemo />,
  },
  {
    title: "Step 1 · Pick your exam",
    subtitle: "Choose what you're targeting",
    body: (
      <p>
        Select the exam you want to practice. Sections automatically load based on the exam's
        official paper pattern.
      </p>
    ),
    demo: <ExamPickDemo />,
  },
  {
    title: "Step 2 · Choose sections",
    subtitle: "Focus on what matters today",
    body: (
      <p>
        Tick one or more sections. Want only Quant today? Just pick Quant. Want full-length
        practice? Pick them all.
      </p>
    ),
    demo: <SectionsDemo />,
  },
  {
    title: "Step 3 · Difficulty & length",
    subtitle: "Set the challenge level",
    body: (
      <p>
        Pick Easy / Medium / Hard / Mixed and decide how many questions you want (5–50).
        Duration is auto-set to <b>1 minute per question</b>.
      </p>
    ),
    demo: <DifficultyDemo />,
  },
  {
    title: "Step 4 · Attempt the mock",
    subtitle: "Real exam feel, no distractions",
    body: (
      <p>
        Hit <b>Generate Mock</b> and you'll enter a timed test. Navigate, mark for review, and
        submit when done — your progress is saved automatically.
      </p>
    ),
    demo: <AttemptDemo />,
  },
  {
    title: "Step 5 · See your report",
    subtitle: "Learn from every attempt",
    body: (
      <p>
        Get instant scoring, accuracy %, solutions and a trend chart across all your previous
        mocks — so you can spot weak areas fast.
      </p>
    ),
    demo: <ReportDemo />,
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
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) {
      localStorage.setItem(STORAGE_KEY, "1");
      onClose?.();
    }
  };

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-sky-600 to-sky-500 px-5 py-4 text-white">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-white flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" /> {s.title}
            </DialogTitle>
            <p className="text-sky-100 text-sm">{s.subtitle}</p>
          </DialogHeader>
          <div className="mt-3 flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {s.demo}
          <div className="text-sm text-foreground/80 leading-relaxed">{s.body}</div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-0 flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === 0 ? handleClose(false) : setStep(step - 1))}
          >
            {step === 0 ? "Skip" : (<><ArrowLeft className="h-4 w-4 mr-1" />Back</>)}
          </Button>
          <div className="text-xs text-muted-foreground self-center">
            {step + 1} / {STEPS.length}
          </div>
          {isLast ? (
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={() => handleClose(false)}>
              <Rocket className="h-4 w-4 mr-1" /> Let's go
            </Button>
          ) : (
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={() => setStep(step + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { STORAGE_KEY as PERSONALIZED_HUB_GUIDE_KEY };
