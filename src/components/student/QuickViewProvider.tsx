import { createContext, useCallback, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Volume2, Bookmark, Loader2, CheckCircle2, GraduationCap, Sparkles,
  Briefcase, Mail, MessageSquare, Star, RotateCcw, BookmarkCheck, Calculator,
  BookOpen, Sigma, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MathExpression } from "@/components/formulas/MathExpression";
import { MathInlineText } from "@/components/formulas/MathInlineText";

type Ctx = {
  openWord: (slug: string) => void;
  openFormula: (slug: string) => void;
};

const QuickViewCtx = createContext<Ctx | null>(null);

export function useQuickView() {
  const ctx = useContext(QuickViewCtx);
  if (!ctx) throw new Error("useQuickView must be used inside QuickViewProvider");
  return ctx;
}
export const useOpenWord = () => useQuickView().openWord;
export const useOpenFormula = () => useQuickView().openFormula;

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [wordSlug, setWordSlug] = useState<string | null>(null);
  const [formulaSlug, setFormulaSlug] = useState<string | null>(null);

  const value = useMemo<Ctx>(() => ({
    openWord: (s) => setWordSlug(s),
    openFormula: (s) => setFormulaSlug(s),
  }), []);

  return (
    <QuickViewCtx.Provider value={value}>
      {children}
      <WordDialog slug={wordSlug} onClose={() => setWordSlug(null)} />
      <FormulaDialog slug={formulaSlug} onClose={() => setFormulaSlug(null)} />
    </QuickViewCtx.Provider>
  );
}

/* ---------- shared header ---------- */
function DialogTopBar({ onClose, title }: { onClose: () => void; title?: string }) {
  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <button
        onClick={onClose}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 active:scale-95 transition"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      {title && <span className="truncate text-sm font-semibold text-slate-700 flex-1 text-center px-2">{title}</span>}
      <button
        onClick={onClose}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ============== WORD DIALOG ============== */
function WordDialog({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [word, setWord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!slug) { setWord(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("vocab_words").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      setWord(data);
      if (data && user) {
        const [{ data: bm }, { data: prog }] = await Promise.all([
          supabase.from("vocab_bookmarks").select("id").eq("user_id", user.id).eq("word_id", data.id).maybeSingle(),
          supabase.from("vocab_progress").select("is_read").eq("user_id", user.id).eq("word_id", data.id).maybeSingle(),
        ]);
        if (cancelled) return;
        setBookmarked(!!bm);
        setIsRead(!!prog?.is_read);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, user]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    speechSynthesis.speak(u);
  };

  const toggleBookmark = async () => {
    if (!user || !word) return;
    if (bookmarked) {
      await supabase.from("vocab_bookmarks").delete().eq("user_id", user.id).eq("word_id", word.id);
      setBookmarked(false);
    } else {
      await supabase.from("vocab_bookmarks").insert({ user_id: user.id, word_id: word.id });
      setBookmarked(true);
      toast({ title: "Saved" });
    }
  };

  const markLearned = async () => {
    if (!user || !word) return;
    setMarking(true);
    await supabase.rpc("vocab_mark_read", { _word_id: word.id, _read: true });
    await supabase.rpc("award_vocab_xp", { _xp: 5, _activity_today: true });
    setIsRead(true);
    toast({ title: "+5 XP", description: "Marked as read" });
    setMarking(false);
  };

  const syllables = word?.pronunciation_syllables ? word.pronunciation_syllables.split(/[-·•\s]+/).filter(Boolean) : [];

  return (
    <Dialog open={!!slug} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        <DialogTopBar onClose={onClose} title={word?.word} />

        {loading || !word ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-600" /></div>
        ) : (
          <div className="space-y-5">
            {/* Hero */}
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="border-0 bg-sky-100 text-sky-700 hover:bg-sky-100">
                  <Sparkles className="mr-1 h-3 w-3" /> {word.category?.replace("_", " ") || "Word"}
                </Badge>
                {word.difficulty && <Badge variant="outline" className="border-sky-200 capitalize text-sky-700">{word.difficulty}</Badge>}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 break-words">{word.word}</h1>
                <Button variant="ghost" size="icon" onClick={() => speak(word.word)} aria-label="Pronounce" className="h-9 w-9 rounded-full text-sky-600 hover:bg-sky-50">
                  <Volume2 className="h-4 w-4" />
                </Button>
                {word.part_of_speech && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] italic text-slate-600">{word.part_of_speech}</span>
                )}
              </div>

              {syllables.length > 0 && (
                <button onClick={() => speak(word.word)} className="mt-3 inline-flex flex-wrap items-center gap-1.5">
                  {syllables.map((p: string, i: number) => (
                    <span key={i} className="rounded-md border border-sky-200 bg-sky-50/70 px-2 py-0.5 text-xs font-mono font-semibold text-sky-700">{p}</span>
                  ))}
                  <Volume2 className="ml-1 h-3 w-3 text-sky-600" />
                </button>
              )}

              {Array.isArray(word.exam_appearances) && word.exam_appearances.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-sky-600" />
                  <span className="text-[11px] font-medium text-slate-600">Appeared in</span>
                  {word.exam_appearances.map((e: string) => (
                    <Badge key={e} className="border-0 bg-white text-[10px] text-sky-700 shadow-sm hover:bg-white">{e}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant={bookmarked ? "default" : "outline"} size="sm" onClick={toggleBookmark} className="gap-1">
                  <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />{bookmarked ? "Saved" : "Save"}
                </Button>
                <Button
                  size="sm"
                  onClick={markLearned}
                  disabled={marking || isRead}
                  variant={isRead ? "secondary" : "default"}
                  className={`gap-1 ${!isRead ? "bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95" : ""}`}
                >
                  {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {isRead ? "Read" : "Mark Read"}
                </Button>
              </div>
            </div>

            {/* Meanings */}
            <div className="grid gap-3 sm:grid-cols-3">
              <MeaningCard label="English">{word.meaning}</MeaningCard>
              <MeaningCard label="हिन्दी">{word.meaning_hindi || "—"}</MeaningCard>
              <MeaningCard label="Hinglish" italic>{word.hinglish_meaning || "—"}</MeaningCard>
            </div>

            {/* Syn/Ant */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Synonyms</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(word.synonyms || []).length
                    ? word.synonyms.map((s: string) => <Badge key={s} variant="outline" className="border-sky-200 text-sky-700">{s}</Badge>)
                    : <span className="text-xs text-slate-400">—</span>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600">Antonyms</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(word.antonyms || []).length
                    ? word.antonyms.map((s: string) => <Badge key={s} variant="outline" className="border-rose-200 text-rose-600">{s}</Badge>)
                    : <span className="text-xs text-slate-400">—</span>}
                </div>
              </div>
            </div>

            {/* Examples tabs */}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">In Context</div>
                <h3 className="font-heading text-base sm:text-lg font-semibold text-slate-900">Example Sentences</h3>
              </div>
              <Tabs defaultValue="business">
                <TabsList className="flex h-auto w-full gap-1 overflow-x-auto bg-slate-100 p-1 justify-start">
                  <TabsTrigger value="business" className="gap-1 whitespace-nowrap data-[state=active]:bg-white"><Briefcase className="h-3.5 w-3.5" /> Business</TabsTrigger>
                  <TabsTrigger value="interview" className="gap-1 whitespace-nowrap data-[state=active]:bg-white"><MessageSquare className="h-3.5 w-3.5" /> Interview</TabsTrigger>
                  <TabsTrigger value="email" className="gap-1 whitespace-nowrap data-[state=active]:bg-white"><Mail className="h-3.5 w-3.5" /> Email/WAT</TabsTrigger>
                </TabsList>
                <TabsContent value="business" className="pt-3">
                  <ExampleBlock text={word.example_business} />
                </TabsContent>
                <TabsContent value="interview" className="pt-3">
                  <ExampleBlock text={word.example_interview} />
                </TabsContent>
                <TabsContent value="email" className="pt-3">
                  <ExampleBlock text={word.example_email} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MeaningCard({ label, italic, children }: any) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <p className={`mt-1.5 text-[14px] leading-relaxed text-slate-800 ${italic ? "italic" : ""}`}>{children}</p>
    </div>
  );
}

function ExampleBlock({ text }: { text?: string }) {
  if (!text) return <p className="text-sm text-slate-500">No example for this context yet.</p>;
  return (
    <blockquote className="rounded-xl border-l-2 border-sky-400 bg-sky-50/50 px-4 py-3 text-[14px] italic leading-relaxed text-slate-800">
      "{text}"
    </blockquote>
  );
}

/* ============== FORMULA DIALOG ============== */
function FormulaDialog({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formula, setFormula] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) { setFormula(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: f } = await supabase.from("quant_formulas").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      setFormula(f);
      if (f && user) {
        const { data: p } = await supabase.from("quant_formula_progress")
          .select("*").eq("user_id", user.id).eq("formula_id", f.id).maybeSingle();
        if (!cancelled) setProgress(p);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, user]);

  const upsertProgress = async (patch: any) => {
    if (!user || !formula) { toast({ title: "Sign in to save progress" }); return; }
    const next = { user_id: user.id, formula_id: formula.id, status: progress?.status || "none", bookmarked: progress?.bookmarked || false, ...patch };
    await supabase.from("quant_formula_progress").upsert(next, { onConflict: "user_id,formula_id" });
    setProgress(next);
    if (patch.status === "completed") {
      await supabase.rpc("award_quant_xp", { _xp: 8, _activity_today: true });
      toast({ title: "+8 XP", description: "Formula completed" });
    } else {
      toast({ title: "Saved" });
    }
  };

  return (
    <Dialog open={!!slug} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl p-4 sm:p-6 w-screen h-[100dvh] max-h-[100dvh] rounded-none sm:w-auto sm:h-auto sm:max-h-[92vh] sm:rounded-lg overflow-y-auto overflow-x-hidden">
        <DialogTopBar onClose={onClose} title={formula?.name} />


        {loading || !formula ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-600" /></div>
        ) : (
          <div className="space-y-5">
            {/* Hero */}
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4 sm:p-5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
                <Calculator className="h-3 w-3" /> {formula.topic_slug?.replace(/-/g, " ")}
              </div>
              <h1 className="font-heading mt-2 text-xl sm:text-2xl font-bold text-slate-900">{formula.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="border-sky-200 text-sky-700">{formula.difficulty}</Badge>
                {formula.is_high_weightage && <Badge className="border-0 bg-amber-100 text-amber-800"><Star className="mr-0.5 h-3 w-3 fill-current" /> Important</Badge>}
                {formula.is_shortcut && <Badge className="border-0 bg-violet-100 text-violet-700">⚡ Shortcut</Badge>}
                {(formula.exam_tags || []).map((e: string) => (
                  <Badge key={e} className="border-0 bg-sky-100 text-sky-700 hover:bg-sky-100"><GraduationCap className="mr-0.5 h-3 w-3" />{e}</Badge>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-slate-900/95 p-4 ring-1 ring-slate-800 overflow-x-auto">
                <MathExpression tex={formula.expression_latex} plain={formula.expression} className="text-lg sm:text-xl text-sky-100" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant={progress?.bookmarked ? "default" : "outline"} size="sm" onClick={() => upsertProgress({ bookmarked: !progress?.bookmarked })}>
                  <BookmarkCheck className="mr-1 h-4 w-4" /> {progress?.bookmarked ? "Saved" : "Save"}
                </Button>
                <Button variant={progress?.status === "revise_later" ? "default" : "outline"} size="sm" onClick={() => upsertProgress({ status: progress?.status === "revise_later" ? "none" : "revise_later" })}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Revise
                </Button>
                <Button size="sm" disabled={progress?.status === "completed"} onClick={() => upsertProgress({ status: "completed", last_revised_at: new Date().toISOString() })} className="bg-gradient-to-r from-sky-600 to-blue-600">
                  <CheckCircle2 className="mr-1 h-4 w-4" /> {progress?.status === "completed" ? "Done" : "Complete"}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="explain" className="space-y-3">
              <TabsList className="flex h-auto w-full gap-1 overflow-x-auto bg-slate-100 p-1 justify-start">
                <TabsTrigger value="explain" className="whitespace-nowrap data-[state=active]:bg-white">Explanation</TabsTrigger>
                <TabsTrigger value="derive" className="whitespace-nowrap data-[state=active]:bg-white">Derivation</TabsTrigger>
                <TabsTrigger value="examples" className="whitespace-nowrap data-[state=active]:bg-white">Examples</TabsTrigger>
                <TabsTrigger value="shortcuts" className="whitespace-nowrap data-[state=active]:bg-white">Shortcuts</TabsTrigger>
                <TabsTrigger value="mistakes" className="whitespace-nowrap data-[state=active]:bg-white">Mistakes</TabsTrigger>
              </TabsList>

              <TabsContent value="explain">
                <div className="rounded-xl border border-slate-200 p-4">
                  <MathInlineText as="div" text={formula.explanation} className="leading-relaxed text-slate-700" />
                </div>
              </TabsContent>

              <TabsContent value="derive">
                <div className="rounded-xl border border-slate-200 p-4">
                  <MathInlineText as="div" text={formula.derivation || "Derivation not provided for this formula yet."} className="whitespace-pre-line leading-relaxed text-slate-700" />
                </div>
              </TabsContent>

              <TabsContent value="examples">
                <div className="space-y-3">
                  {(formula.examples || []).length === 0 && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No worked examples yet.</div>}
                  {(formula.examples || []).map((ex: any, i: number) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-sky-700">Example {i + 1}</div>
                      <MathInlineText as="p" text={ex.problem} className="mt-1 font-medium text-slate-900" />
                      <ol className="ml-5 mt-2 list-decimal space-y-1 text-sm text-slate-700">
                        {(ex.steps || []).map((s: string, j: number) => <MathInlineText as="li" key={j} text={s} />)}
                      </ol>
                      {ex.answer !== undefined && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                          Answer: <MathInlineText text={String(ex.answer ?? "")} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="shortcuts">
                <div className="rounded-xl border border-slate-200 p-4">
                  {(formula.shortcuts || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No shortcuts listed.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(formula.shortcuts || []).map((s: string, i: number) => (
                        <li key={i} className="flex gap-2 rounded-lg bg-violet-50 p-3 text-sm text-slate-800">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="mistakes">
                <div className="rounded-xl border border-slate-200 p-4">
                  {(formula.common_mistakes || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No common mistakes listed.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(formula.common_mistakes || []).map((m: string, i: number) => (
                        <li key={i} className="flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-slate-800">⚠️ {m}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
