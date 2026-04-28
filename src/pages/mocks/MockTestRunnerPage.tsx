import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MathContent from "@/components/mock/MathContent";
import MockCalculator from "@/components/mock/MockCalculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Flag, Bookmark, ChevronLeft, ChevronRight, AlertTriangle, LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";

const isMobileDevice = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;

type ResponseStatus =
  | "not_visited"
  | "not_answered"
  | "answered"
  | "marked"
  | "answered_marked";

interface Section {
  id: string;
  code: string;
  name: string;
  duration_minutes: number;
  sort_order: number;
}
interface Passage {
  id: string;
  section_id: string;
  title: string | null;
  content_html: string;
}
interface Option {
  id: string;
  question_id: string;
  option_label: string;
  option_html: string;
  sort_order: number;
}
interface Question {
  id: string;
  section_id: string;
  passage_id: string | null;
  question_number: number;
  question_type: "mcq" | "tita";
  question_html: string;
  positive_marks: number;
  negative_marks: number;
}
interface ResponseRow {
  id?: string;
  question_id: string;
  section_id: string;
  selected_option_id: string | null;
  tita_answer: string | null;
  status: ResponseStatus;
  visit_count: number;
}

const MAX_TAB_SWITCHES = 3;

function fmt(seconds: number) {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MockTestRunnerPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseRow>>({});
  const [loading, setLoading] = useState(true);
  const [currentSectionId, setCurrentSectionId] = useState<string>("");
  const [currentQuestionId, setCurrentQuestionId] = useState<string>("");
  const [now, setNow] = useState(Date.now());
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(isMobileDevice);

  const submitRef = useRef(false);
  const violationToastShown = useRef(false);

  useEffect(() => {
    const onResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- LOAD ----------
  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: a } = await supabase
        .from("mock_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();
      if (!a) {
        toast.error("Attempt not found");
        navigate("/mocks");
        return;
      }
      if (a.status !== "in_progress") {
        navigate(`/mocks/result/${a.id}`);
        return;
      }
      const { data: s } = await supabase
        .from("mock_sections")
        .select("*")
        .eq("test_id", a.test_id)
        .order("sort_order");
      const sectionIds = (s ?? []).map((x: any) => x.id);
      const [{ data: qs }, { data: ps }, { data: rs }] = await Promise.all([
        supabase
          .from("mock_questions")
          .select("id, section_id, passage_id, question_number, question_type, question_html, positive_marks, negative_marks")
          .in("section_id", sectionIds)
          .order("question_number"),
        supabase.from("mock_passages").select("*").in("section_id", sectionIds).order("sort_order"),
        supabase.from("mock_responses").select("*").eq("attempt_id", a.id),
      ]);
      const qIds = (qs ?? []).map((q: any) => q.id);
      const { data: opts } = qIds.length
        ? await supabase
            .from("mock_question_options")
            .select("*")
            .in("question_id", qIds)
            .order("sort_order")
        : { data: [] as Option[] };

      setAttempt(a);
      setSections(s ?? []);
      setQuestions((qs ?? []) as Question[]);
      setOptions((opts ?? []) as Option[]);
      setPassages((ps ?? []) as Passage[]);

      const respMap: Record<string, ResponseRow> = {};
      for (const r of rs ?? []) respMap[r.question_id] = r as ResponseRow;
      setResponses(respMap);

      const startSection = a.current_section_id ?? (s?.[0]?.id ?? "");
      setCurrentSectionId(startSection);
      const firstQ = (qs ?? []).find((q: any) => q.section_id === startSection);
      if (firstQ) setCurrentQuestionId(firstQ.id);
      setLoading(false);
    })();
  }, [attemptId, navigate]);

  // ---------- TIMER tick ----------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---------- ANTI-CHEAT ----------
  const handleAutoSubmit = useCallback(async (reason: string) => {
    if (submitRef.current) return;
    submitRef.current = true;
    setSubmitting(true);
    toast.error(`Auto-submitting: ${reason}`);
    try {
      await supabase.functions.invoke("mock-submit-attempt", {
        body: { attempt_id: attemptId, reason },
      });
    } catch {}
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }
    navigate(`/mocks/result/${attemptId}`);
  }, [attemptId, navigate]);

  useEffect(() => {
    if (loading) return;
    const onVis = () => {
      if (document.hidden) {
        setViolations((v) => {
          const nv = v + 1;
          supabase
            .from("mock_attempts")
            .update({ tab_switch_count: nv })
            .eq("id", attemptId)
            .then(() => {});
          if (nv >= MAX_TAB_SWITCHES) {
            handleAutoSubmit("tab switching");
          } else if (!violationToastShown.current) {
            toast.warning(`Warning ${nv}/${MAX_TAB_SWITCHES}: do not switch tabs`);
          }
          return nv;
        });
      }
    };
    const onFsChange = () => {
      if (isMobile) return; // skip fullscreen tracking on mobile
      if (!document.fullscreenElement) {
        setViolations((v) => {
          const nv = v + 1;
          supabase
            .from("mock_attempts")
            .update({ fullscreen_exits: nv })
            .eq("id", attemptId)
            .then(() => {});
          if (nv >= MAX_TAB_SWITCHES) {
            handleAutoSubmit("exited fullscreen");
          } else {
            toast.warning(`Fullscreen exited (${nv}/${MAX_TAB_SWITCHES}). Re-enter to continue.`);
            // try to re-enter
            document.documentElement.requestFullscreen().catch(() => {});
          }
          return nv;
        });
      }
    };
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockCopy = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("copy", blockCopy);
    document.addEventListener("paste", blockCopy);
    document.addEventListener("cut", blockCopy);
    window.addEventListener("beforeunload", (e) => {
      e.preventDefault();
      e.returnValue = "";
    });
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("paste", blockCopy);
      document.removeEventListener("cut", blockCopy);
    };
  }, [loading, attemptId, handleAutoSubmit, isMobile]);

  // ---------- DERIVED ----------
  const sectionQuestions = useMemo(
    () => questions.filter((q) => q.section_id === currentSectionId),
    [questions, currentSectionId],
  );
  const currentQuestion = useMemo(
    () => questions.find((q) => q.id === currentQuestionId),
    [questions, currentQuestionId],
  );
  const currentPassage = useMemo(
    () => currentQuestion?.passage_id ? passages.find((p) => p.id === currentQuestion.passage_id) : null,
    [currentQuestion, passages],
  );
  const currentOptions = useMemo(
    () => options.filter((o) => o.question_id === currentQuestionId),
    [options, currentQuestionId],
  );
  const currentSection = sections.find((s) => s.id === currentSectionId);

  const sectionDeadline = attempt?.section_deadlines?.[currentSectionId]
    ? new Date(attempt.section_deadlines[currentSectionId]).getTime()
    : 0;
  const overallDeadline = attempt?.overall_deadline
    ? new Date(attempt.overall_deadline).getTime()
    : 0;
  const sectionRemaining = Math.floor((sectionDeadline - now) / 1000);
  const overallRemaining = Math.floor((overallDeadline - now) / 1000);

  // Auto-submit when overall expires
  useEffect(() => {
    if (loading || submitRef.current) return;
    if (overallDeadline > 0 && overallRemaining <= 0) {
      handleAutoSubmit("time expired");
    }
  }, [overallRemaining, overallDeadline, loading, handleAutoSubmit]);

  // Auto-advance section when section deadline expires
  useEffect(() => {
    if (loading || submitRef.current) return;
    if (sectionDeadline > 0 && sectionRemaining <= 0) {
      const idx = sections.findIndex((s) => s.id === currentSectionId);
      const next = sections[idx + 1];
      if (next) {
        toast.info(`${currentSection?.code} time over. Moving to ${next.code}.`);
        switchSection(next.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionRemaining]);

  // ---------- AUTO-SAVE ----------
  const persistResponse = useCallback(
    async (qid: string, patch: Partial<ResponseRow>) => {
      const q = questions.find((qq) => qq.id === qid);
      if (!q || !attemptId) return;
      const existing = responses[qid];
      const merged: ResponseRow = {
        ...(existing ?? {
          question_id: qid,
          section_id: q.section_id,
          selected_option_id: null,
          tita_answer: null,
          status: "not_visited",
          visit_count: 0,
        }),
        ...patch,
      };
      setResponses((prev) => ({ ...prev, [qid]: merged }));
      await supabase
        .from("mock_responses")
        .upsert(
          {
            attempt_id: attemptId,
            question_id: qid,
            section_id: q.section_id,
            selected_option_id: merged.selected_option_id,
            tita_answer: merged.tita_answer,
            status: merged.status,
            visit_count: merged.visit_count,
            last_updated_at: new Date().toISOString(),
            first_visited_at: existing?.id ? undefined : new Date().toISOString(),
          },
          { onConflict: "attempt_id,question_id" },
        );
    },
    [attemptId, questions, responses],
  );

  // Mark visited on question change
  useEffect(() => {
    if (!currentQuestionId) return;
    const r = responses[currentQuestionId];
    if (!r) {
      persistResponse(currentQuestionId, {
        status: "not_answered",
        visit_count: 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId]);

  // ---------- ACTIONS ----------
  const switchSection = (sid: string) => {
    setCurrentSectionId(sid);
    const firstQ = questions.find((q) => q.section_id === sid);
    if (firstQ) setCurrentQuestionId(firstQ.id);
    supabase.from("mock_attempts").update({ current_section_id: sid }).eq("id", attemptId).then(() => {});
  };

  const goToQuestion = (qid: string) => {
    setCurrentQuestionId(qid);
    setPaletteOpen(false);
  };

  const goNext = () => {
    const idx = sectionQuestions.findIndex((q) => q.id === currentQuestionId);
    if (idx >= 0 && idx < sectionQuestions.length - 1) {
      goToQuestion(sectionQuestions[idx + 1].id);
    }
  };
  const goPrev = () => {
    const idx = sectionQuestions.findIndex((q) => q.id === currentQuestionId);
    if (idx > 0) goToQuestion(sectionQuestions[idx - 1].id);
  };

  const handleAnswer = (optId: string | null, tita?: string) => {
    if (!currentQuestion) return;
    const wasMarked = responses[currentQuestion.id]?.status === "marked" || responses[currentQuestion.id]?.status === "answered_marked";
    persistResponse(currentQuestion.id, {
      selected_option_id: currentQuestion.question_type === "mcq" ? optId : null,
      tita_answer: currentQuestion.question_type === "tita" ? (tita ?? "") : null,
      status: wasMarked ? "answered_marked" : "answered",
    });
  };

  const handleClear = () => {
    if (!currentQuestion) return;
    persistResponse(currentQuestion.id, {
      selected_option_id: null,
      tita_answer: null,
      status: "not_answered",
    });
  };

  const handleMarkReview = () => {
    if (!currentQuestion) return;
    const r = responses[currentQuestion.id];
    const answered = r?.selected_option_id || (r?.tita_answer ?? "").trim().length > 0;
    persistResponse(currentQuestion.id, {
      status: answered ? "answered_marked" : "marked",
    });
    goNext();
  };

  const handleSaveNext = () => {
    goNext();
  };

  const handleManualSubmit = async () => {
    if (!confirm("Submit the entire test now? You cannot change answers after this.")) return;
    submitRef.current = true;
    setSubmitting(true);
    try {
      await supabase.functions.invoke("mock-submit-attempt", {
        body: { attempt_id: attemptId },
      });
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      navigate(`/mocks/result/${attemptId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  // ---------- RENDER ----------
  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading test…</div>;
  }

  return (
    <div className="fixed inset-0 bg-white text-slate-900 flex flex-col select-none">
      {/* Top bar */}
      <header className="bg-slate-900 text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <div className="font-semibold text-xs sm:text-sm truncate">CAT Mock Test</div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          {violations > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-amber-300">
              <AlertTriangle className="h-4 w-4" /> {violations}/{MAX_TAB_SWITCHES}
            </span>
          )}
          <span className="whitespace-nowrap">
            <span className="hidden sm:inline">Total: </span>
            <strong className="font-mono">{fmt(overallRemaining)}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="lg:hidden inline-flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-xs font-medium"
            aria-label="Open question palette"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Palette</span>
          </button>
        </div>
      </header>

      {/* Section tabs */}
      <div className="bg-slate-100 border-b px-2 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        {sections.map((s) => {
          const remaining = attempt?.section_deadlines?.[s.id]
            ? Math.floor((new Date(attempt.section_deadlines[s.id]).getTime() - now) / 1000)
            : 0;
          const expired = remaining <= 0;
          const isCurrent = s.id === currentSectionId;
          return (
            <button
              key={s.id}
              disabled={expired}
              onClick={() => switchSection(s.id)}
              className={cn(
                "shrink-0 px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium border transition",
                isCurrent ? "bg-primary text-primary-foreground border-primary" : "bg-white",
                expired && "opacity-50 cursor-not-allowed line-through",
              )}
            >
              <span className="sm:hidden">{s.code}</span>
              <span className="hidden sm:inline">{s.name}</span>
              <span className="font-mono ml-1.5 sm:ml-2">{fmt(remaining)}</span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question + passage */}
        <div className="flex-1 overflow-auto min-w-0">
          {currentPassage ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:h-full">
              <div className="p-4 sm:p-5 lg:overflow-auto border-b lg:border-b-0 lg:border-r bg-slate-50">
                {currentPassage.title && <h3 className="font-semibold mb-2">{currentPassage.title}</h3>}
                <MathContent html={currentPassage.content_html} className="prose prose-sm max-w-none break-words" />
              </div>
              <div className="p-4 sm:p-5 lg:overflow-auto">
                <QuestionPanel
                  question={currentQuestion}
                  options={currentOptions}
                  response={currentQuestion ? responses[currentQuestion.id] : undefined}
                  onAnswer={handleAnswer}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 max-w-3xl">
              <QuestionPanel
                question={currentQuestion}
                options={currentOptions}
                response={currentQuestion ? responses[currentQuestion.id] : undefined}
                onAnswer={handleAnswer}
              />
            </div>
          )}
        </div>

        {/* Palette - desktop sidebar */}
        <aside className="hidden lg:flex w-64 border-l bg-slate-50 flex-col">
          <PaletteContent
            currentSection={currentSection}
            sectionQuestions={sectionQuestions}
            responses={responses}
            currentQuestionId={currentQuestionId}
            goToQuestion={goToQuestion}
            handleManualSubmit={handleManualSubmit}
            submitting={submitting}
          />
        </aside>

        {/* Palette - mobile drawer */}
        {paletteOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setPaletteOpen(false)}
            />
            <aside className="absolute right-0 top-0 bottom-0 w-[85%] max-w-xs bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right">
              <div className="flex items-center justify-between p-3 border-b bg-white">
                <span className="text-sm font-semibold">Question Palette</span>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(false)}
                  className="p-1.5 rounded hover:bg-slate-100"
                  aria-label="Close palette"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <PaletteContent
                currentSection={currentSection}
                sectionQuestions={sectionQuestions}
                responses={responses}
                currentQuestionId={currentQuestionId}
                goToQuestion={goToQuestion}
                handleManualSubmit={handleManualSubmit}
                submitting={submitting}
              />
            </aside>
          </div>
        )}
      </div>

      {/* Action bar */}
      <footer
        className="border-t bg-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 flex-wrap"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2 order-2 sm:order-1 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleMarkReview}>
            <Bookmark className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Mark & Next</span>
            <span className="sm:hidden ml-1">Mark</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleClear}>
            Clear
          </Button>
        </div>
        <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none" onClick={handleSaveNext}>
            <span>Save & Next</span> <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-block h-4 w-4 rounded border-slate-300", color)} />
      <span>{label}</span>
    </div>
  );
}

function QuestionPanel({
  question,
  options,
  response,
  onAnswer,
}: {
  question?: Question;
  options: Option[];
  response?: ResponseRow;
  onAnswer: (optId: string | null, tita?: string) => void;
}) {
  if (!question) return <p className="text-muted-foreground">No question</p>;
  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm text-slate-600">
        <span>Question {question.question_number}</span>
        <span>+{question.positive_marks} / −{question.negative_marks}</span>
      </div>
      <MathContent html={question.question_html} className="prose prose-sm max-w-none mb-5" />

      {question.question_type === "mcq" ? (
        <div className="space-y-2">
          {options.map((o) => (
            <label
              key={o.id}
              className={cn(
                "flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-slate-50",
                response?.selected_option_id === o.id && "border-primary bg-primary/5",
              )}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={response?.selected_option_id === o.id}
                onChange={() => onAnswer(o.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <span className="font-semibold mr-2">{o.option_label}.</span>
                <MathContent html={o.option_html} className="inline prose prose-sm max-w-none" />
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium block mb-2">Your answer:</label>
          <input
            type="text"
            value={response?.tita_answer ?? ""}
            onChange={(e) => onAnswer(null, e.target.value)}
            className="border rounded-md px-3 py-2 w-full max-w-xs"
            placeholder="Type your answer"
          />
        </div>
      )}
    </div>
  );
}

function PaletteContent({
  currentSection,
  sectionQuestions,
  responses,
  currentQuestionId,
  goToQuestion,
  handleManualSubmit,
  submitting,
}: {
  currentSection?: Section;
  sectionQuestions: Question[];
  responses: Record<string, ResponseRow>;
  currentQuestionId: string;
  goToQuestion: (qid: string) => void;
  handleManualSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <>
      <div className="p-3 border-b text-xs font-semibold uppercase text-slate-600">
        {currentSection?.code} — Question Palette
      </div>
      <div className="p-3 grid grid-cols-5 gap-2 overflow-auto flex-1">
        {sectionQuestions.map((q, i) => {
          const r = responses[q.id];
          const status = r?.status ?? "not_visited";
          return (
            <button
              key={q.id}
              onClick={() => goToQuestion(q.id)}
              className={cn(
                "h-10 w-10 rounded text-xs font-semibold border relative",
                status === "answered" && "bg-green-600 text-white border-green-700",
                status === "not_answered" && "bg-red-500 text-white border-red-600",
                status === "marked" && "bg-purple-600 text-white border-purple-700",
                status === "answered_marked" && "bg-purple-600 text-white border-purple-700",
                status === "not_visited" && "bg-white border-slate-300",
                q.id === currentQuestionId && "ring-2 ring-primary ring-offset-1",
              )}
            >
              {i + 1}
              {status === "answered_marked" && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border border-white" />
              )}
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t text-xs space-y-1.5">
        <Legend color="bg-green-600" label="Answered" />
        <Legend color="bg-red-500" label="Not Answered" />
        <Legend color="bg-purple-600" label="Marked for review" />
        <Legend color="bg-white border" label="Not Visited" />
      </div>
      <div className="p-3 border-t">
        <Button onClick={handleManualSubmit} disabled={submitting} className="w-full" variant="destructive">
          {submitting ? "Submitting…" : "Submit Test"}
        </Button>
      </div>
    </>
  );
}
