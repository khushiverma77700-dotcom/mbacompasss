import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bookmark, BookmarkCheck, CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import MathContent from "@/components/mock/MathContent";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isStudentMode, studentBackToMocksPath } from "@/lib/studentModeNav";

export default function MockReviewPage() {
  const { attemptId } = useParams();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [passages, setPassages] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string>("");
  const [activeQuestion, setActiveQuestion] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: a } = await supabase.from("mock_attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!a) {
        setLoading(false);
        return;
      }
      const [{ data: t }, { data: s }, { data: rs }] = await Promise.all([
        supabase.from("mock_tests").select("*").eq("id", a.test_id).maybeSingle(),
        supabase.from("mock_sections").select("*").eq("test_id", a.test_id).order("sort_order"),
        supabase.from("mock_responses").select("*").eq("attempt_id", a.id),
      ]);
      const sectionIds = (s ?? []).map((x: any) => x.id);
      const [{ data: qs }, { data: ps }] = await Promise.all([
        supabase
          .from("mock_questions")
          .select("id, section_id, passage_id, question_number, question_type, question_html, positive_marks, negative_marks, tita_correct_answers, explanation_html, solution_video_url, topic")
          .in("section_id", sectionIds)
          .order("question_number"),
        supabase.from("mock_passages").select("*").in("section_id", sectionIds).order("sort_order"),
      ]);
      const qIds = (qs ?? []).map((q: any) => q.id);
      const { data: opts } = qIds.length
        ? await supabase.from("mock_question_options").select("*").in("question_id", qIds).order("sort_order")
        : { data: [] };
      const respMap: Record<string, any> = {};
      for (const r of rs ?? []) respMap[r.question_id] = r;
      const bmMap: Record<string, string> = {};
      if (user && qIds.length) {
        const { data: bms } = await supabase
          .from("mock_bookmarks")
          .select("id, question_id")
          .eq("user_id", user.id)
          .in("question_id", qIds);
        for (const b of bms ?? []) bmMap[b.question_id] = b.id;
      }
      setAttempt(a);
      setTest(t);
      setSections(s ?? []);
      setQuestions((qs ?? []) as any);
      setOptions((opts ?? []) as any);
      setPassages((ps ?? []) as any);
      setResponses(respMap);
      setBookmarks(bmMap);
      const firstSection = s?.[0]?.id ?? "";
      setActiveSection(firstSection);
      const firstQ = (qs ?? []).find((q: any) => q.section_id === firstSection);
      if (firstQ) setActiveQuestion(firstQ.id);
      setLoading(false);
    })();
  }, [attemptId, user]);

  const sectionQs = useMemo(() => questions.filter((q) => q.section_id === activeSection), [questions, activeSection]);
  const currentQ = useMemo(() => questions.find((q) => q.id === activeQuestion), [questions, activeQuestion]);
  const currentOpts = useMemo(() => options.filter((o) => o.question_id === activeQuestion), [options, activeQuestion]);
  const currentPassage = currentQ?.passage_id ? passages.find((p) => p.id === currentQ.passage_id) : null;
  const currentResp = currentQ ? responses[currentQ.id] : null;
  const correctOption = currentOpts.find((o) => o.is_correct);

  const toggleBookmark = async () => {
    if (!user || !currentQ) {
      toast.error("Please sign in to bookmark");
      return;
    }
    const existing = bookmarks[currentQ.id];
    if (existing) {
      await supabase.from("mock_bookmarks").delete().eq("id", existing);
      setBookmarks((prev) => {
        const c = { ...prev };
        delete c[currentQ.id];
        return c;
      });
      toast.success("Bookmark removed");
    } else {
      const { data } = await supabase
        .from("mock_bookmarks")
        .insert({ user_id: user.id, question_id: currentQ.id })
        .select("id")
        .maybeSingle();
      if (data) setBookmarks((prev) => ({ ...prev, [currentQ.id]: data.id }));
      toast.success("Bookmarked");
    }
  };

  const switchSection = (sid: string) => {
    setActiveSection(sid);
    const firstQ = questions.find((q) => q.section_id === sid);
    if (firstQ) setActiveQuestion(firstQ.id);
  };
  const goPrev = () => {
    const idx = sectionQs.findIndex((q) => q.id === activeQuestion);
    if (idx > 0) setActiveQuestion(sectionQs[idx - 1].id);
  };
  const goNext = () => {
    const idx = sectionQs.findIndex((q) => q.id === activeQuestion);
    if (idx >= 0 && idx < sectionQs.length - 1) setActiveQuestion(sectionQs[idx + 1].id);
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading review…</div>;
  if (!attempt) return <div className="p-8">Attempt not found</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link to={isStudentMode() ? studentBackToMocksPath() : "/dashboard/mocks"} className="text-sm text-muted-foreground hover:underline">← {isStudentMode() ? "Back to dashboard" : "My Mocks"}</Link>
          <h1 className="text-2xl font-bold mt-1">{test?.name} — Review</h1>
        </div>
        <Link to={`/mocks/result/${attempt.id}`}><Button variant="outline">View Score Summary</Button></Link>
      </header>

      <Tabs value={activeSection} onValueChange={switchSection}>
        <TabsList className="flex-wrap">
          {sections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>
          ))}
        </TabsList>

        {sections.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
              <Card className="p-5">
                {currentQ ? (
                  <>
                    <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground flex-wrap gap-2">
                      <span>Question {currentQ.question_number} · {currentQ.topic ?? "—"}</span>
                      <div className="flex items-center gap-2">
                        <ResponseStatusBadge resp={currentResp} />
                        <Button size="sm" variant="ghost" onClick={toggleBookmark}>
                          {bookmarks[currentQ.id] ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {currentPassage && (
                      <div className="bg-slate-50 border rounded-md p-3 mb-4 max-h-60 overflow-auto">
                        {currentPassage.title && <div className="font-semibold mb-1">{currentPassage.title}</div>}
                        <MathContent html={currentPassage.content_html} className="prose prose-sm max-w-none" />
                      </div>
                    )}

                    <MathContent html={currentQ.question_html} className="prose prose-sm max-w-none mb-4" />

                    {currentQ.question_type === "mcq" ? (
                      <div className="space-y-2 mb-4">
                        {currentOpts.map((o) => {
                          const picked = currentResp?.selected_option_id === o.id;
                          const correct = o.is_correct;
                          return (
                            <div
                              key={o.id}
                              className={cn(
                                "flex items-start gap-3 p-3 border rounded-md",
                                correct && "border-green-600 bg-green-50",
                                picked && !correct && "border-red-500 bg-red-50",
                              )}
                            >
                              <span className="font-semibold">{o.option_label}.</span>
                              <div className="flex-1">
                                <MathContent html={o.option_html} className="inline prose prose-sm max-w-none" />
                              </div>
                              {correct && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                              {picked && !correct && <XCircle className="h-5 w-5 text-red-500" />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2 mb-4">
                        <div className="border rounded-md p-3 text-sm">
                          <span className="text-muted-foreground">Your answer: </span>
                          <strong>{currentResp?.tita_answer ?? "—"}</strong>
                          {currentResp?.is_correct === true && <CheckCircle2 className="inline h-4 w-4 text-green-600 ml-2" />}
                          {currentResp?.is_correct === false && <XCircle className="inline h-4 w-4 text-red-500 ml-2" />}
                        </div>
                        <div className="border rounded-md p-3 text-sm bg-green-50">
                          <span className="text-muted-foreground">Accepted answer(s): </span>
                          <strong>{(currentQ.tita_correct_answers ?? []).join(", ") || "—"}</strong>
                        </div>
                      </div>
                    )}

                    {currentQ.explanation_html && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-2">Explanation</h3>
                        <MathContent html={currentQ.explanation_html} className="prose prose-sm max-w-none" />
                      </div>
                    )}
                    {currentQ.solution_video_url && (
                      <a
                        href={currentQ.solution_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-sm hover:underline mt-2 inline-block"
                      >
                        Watch video solution →
                      </a>
                    )}

                    <div className="flex justify-between mt-5">
                      <Button variant="outline" size="sm" onClick={goPrev}><ChevronLeft className="h-4 w-4" />Previous</Button>
                      <div className="text-xs text-muted-foreground self-center">
                        +{currentQ.positive_marks} / −{currentQ.negative_marks} · Marks awarded: <strong>{currentResp?.marks_awarded ?? 0}</strong>
                      </div>
                      <Button size="sm" onClick={goNext}>Next<ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No question</p>
                )}
              </Card>

              <Card className="p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Palette</div>
                <div className="grid grid-cols-5 gap-2">
                  {sectionQs.map((q, i) => {
                    const r = responses[q.id];
                    const picked = !!(r?.selected_option_id || (r?.tita_answer ?? "").trim());
                    const correct = r?.is_correct === true;
                    const wrong = r?.is_correct === false;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setActiveQuestion(q.id)}
                        className={cn(
                          "h-8 w-8 rounded text-xs font-semibold border",
                          correct && "bg-green-600 text-white border-green-700",
                          wrong && "bg-red-500 text-white border-red-600",
                          !picked && "bg-white",
                          q.id === activeQuestion && "ring-2 ring-primary",
                        )}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs mt-3 space-y-1">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 bg-green-600 rounded inline-block" />Correct</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 bg-red-500 rounded inline-block" />Wrong</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 bg-white border rounded inline-block" />Skipped</div>
                </div>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResponseStatusBadge({ resp }: { resp: any }) {
  if (!resp || resp.status === "not_visited" || resp.status === "not_answered") {
    return <Badge variant="outline"><MinusCircle className="h-3 w-3 mr-1" />Skipped</Badge>;
  }
  if (resp.is_correct) return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Correct</Badge>;
  if (resp.is_correct === false) return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Wrong</Badge>;
  return <Badge variant="secondary">Answered</Badge>;
}
