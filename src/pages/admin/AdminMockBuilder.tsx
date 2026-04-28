import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, Loader2, BookOpen } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import MathContent from "@/components/mock/MathContent";
import { stripQuestionPrefix, stripOptionPrefix } from "@/lib/cleanQuestionHtml";

type Section = {
  id: string;
  test_id: string;
  code: "VARC" | "DILR" | "QA";
  name: string;
  duration_minutes: number;
  total_questions: number;
  sort_order: number;
};

type Passage = {
  id: string;
  section_id: string;
  title: string | null;
  content_html: string;
  sort_order: number;
};

type Question = {
  id: string;
  section_id: string;
  passage_id: string | null;
  question_number: number;
  question_type: "mcq" | "tita";
  question_html: string;
  positive_marks: number;
  negative_marks: number;
  difficulty: "easy" | "medium" | "hard";
  topic: string | null;
  tita_correct_answers: string[] | null;
  tita_numeric_tolerance: number | null;
  explanation_html: string | null;
};

type OptionRow = { id?: string; option_label: string; option_html: string; is_correct: boolean; sort_order: number };

const emptyQuestion = (section_id: string, nextNumber: number): Partial<Question> & { options: OptionRow[]; passage_id: string | null } => ({
  section_id,
  passage_id: null,
  question_number: nextNumber,
  question_type: "mcq",
  question_html: "",
  positive_marks: 3,
  negative_marks: 1,
  difficulty: "medium",
  topic: "",
  tita_correct_answers: [],
  tita_numeric_tolerance: null,
  explanation_html: "",
  options: ["A", "B", "C", "D"].map((label, i) => ({ option_label: label, option_html: "", is_correct: false, sort_order: i })),
});

const AdminMockBuilder = () => {
  const { testId } = useParams<{ testId: string }>();
  const { toast } = useToast();

  const [test, setTest] = useState<any | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  const [passages, setPassages] = useState<Passage[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Question editor dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<any>(null);
  const [editorSaving, setEditorSaving] = useState(false);

  // Passage editor dialog state
  const [passageOpen, setPassageOpen] = useState(false);
  const [passageState, setPassageState] = useState<{ id?: string; section_id: string; title: string; content_html: string } | null>(null);

  // Bulk import dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchAll = async () => {
    if (!testId) return;
    setLoading(true);
    const [{ data: t }, { data: secs }] = await Promise.all([
      supabase.from("mock_tests").select("*").eq("id", testId).maybeSingle(),
      supabase.from("mock_sections").select("*").eq("test_id", testId).order("sort_order"),
    ]);
    setTest(t);
    setSections((secs ?? []) as Section[]);
    if ((secs ?? []).length && !activeSectionId) setActiveSectionId((secs as Section[])[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [testId]);

  // Fetch passages + questions for active section
  useEffect(() => {
    if (!activeSectionId) { setPassages([]); setQuestions([]); return; }
    (async () => {
      const [{ data: ps }, { data: qs }] = await Promise.all([
        supabase.from("mock_passages").select("*").eq("section_id", activeSectionId).order("sort_order"),
        supabase.from("mock_questions").select("*").eq("section_id", activeSectionId).order("question_number"),
      ]);
      setPassages((ps ?? []) as Passage[]);
      setQuestions((qs ?? []) as Question[]);
    })();
  }, [activeSectionId]);

  const activeSection = useMemo(() => sections.find(s => s.id === activeSectionId), [sections, activeSectionId]);

  // ---------------- Section CRUD ----------------
  const addSection = async (code: "VARC" | "DILR" | "QA") => {
    if (sections.find(s => s.code === code)) { toast({ title: `${code} already exists` }); return; }
    const sort = sections.length;
    const defaults: Record<string, { name: string }> = {
      VARC: { name: "Verbal Ability & Reading Comprehension" },
      DILR: { name: "Data Interpretation & Logical Reasoning" },
      QA: { name: "Quantitative Aptitude" },
    };
    const { error } = await supabase.from("mock_sections").insert({
      test_id: testId, code, name: defaults[code].name, duration_minutes: 40, total_questions: 22, sort_order: sort,
    });
    if (error) { toast({ title: "Add section failed", description: error.message, variant: "destructive" }); return; }
    fetchAll();
  };

  const updateSection = async (id: string, patch: Partial<Section>) => {
    const { error } = await supabase.from("mock_sections").update(patch).eq("id", id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  // ---------------- Passage CRUD ----------------
  const openPassage = (p?: Passage) => {
    if (!activeSectionId) return;
    setPassageState({
      id: p?.id, section_id: activeSectionId,
      title: p?.title ?? "", content_html: p?.content_html ?? "",
    });
    setPassageOpen(true);
  };
  const savePassage = async () => {
    if (!passageState) return;
    const payload = { section_id: passageState.section_id, title: passageState.title || null, content_html: passageState.content_html, sort_order: passages.length };
    if (passageState.id) {
      const { error } = await supabase.from("mock_passages").update(payload).eq("id", passageState.id);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("mock_passages").insert(payload);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    }
    setPassageOpen(false); setPassageState(null);
    const { data: ps } = await supabase.from("mock_passages").select("*").eq("section_id", activeSectionId).order("sort_order");
    setPassages((ps ?? []) as Passage[]);
    toast({ title: "Passage saved" });
  };
  const deletePassage = async (id: string) => {
    if (!confirm("Delete this passage? Linked questions will lose the link but stay.")) return;
    await supabase.from("mock_passages").delete().eq("id", id);
    setPassages(prev => prev.filter(p => p.id !== id));
  };

  // ---------------- Question CRUD ----------------
  const nextQuestionNumber = useMemo(() => (questions.length ? Math.max(...questions.map(q => q.question_number)) + 1 : 1), [questions]);

  const openNewQuestion = () => {
    if (!activeSectionId) return;
    setEditorState(emptyQuestion(activeSectionId, nextQuestionNumber));
    setEditorOpen(true);
  };
  const openEditQuestion = async (q: Question) => {
    const { data: opts } = await supabase.from("mock_question_options").select("*").eq("question_id", q.id).order("sort_order");
    setEditorState({
      ...q,
      tita_correct_answers: q.tita_correct_answers ?? [],
      options: q.question_type === "mcq"
        ? (opts ?? []).map((o: any) => ({ id: o.id, option_label: o.option_label, option_html: o.option_html, is_correct: o.is_correct, sort_order: o.sort_order }))
        : [],
    });
    setEditorOpen(true);
  };

  const saveQuestion = async () => {
    if (!editorState) return;
    if (!editorState.question_html?.trim()) { toast({ title: "Question content is required", variant: "destructive" }); return; }
    if (editorState.question_type === "mcq") {
      const correctCount = (editorState.options as OptionRow[]).filter(o => o.is_correct).length;
      if (correctCount !== 1) { toast({ title: "MCQ must have exactly 1 correct option", variant: "destructive" }); return; }
      if ((editorState.options as OptionRow[]).some(o => !o.option_html.trim())) { toast({ title: "All option texts required", variant: "destructive" }); return; }
    } else {
      const answers = (editorState.tita_correct_answers as string[]).filter(a => a.trim());
      if (answers.length === 0) { toast({ title: "TITA needs at least 1 correct answer", variant: "destructive" }); return; }
    }
    setEditorSaving(true);
    const qPayload: any = {
      section_id: editorState.section_id,
      passage_id: editorState.passage_id || null,
      question_number: editorState.question_number,
      question_type: editorState.question_type,
      question_html: editorState.question_html,
      positive_marks: Number(editorState.positive_marks) || 3,
      negative_marks: Number(editorState.negative_marks) || 0,
      difficulty: editorState.difficulty,
      topic: editorState.topic || null,
      tita_correct_answers: editorState.question_type === "tita" ? (editorState.tita_correct_answers as string[]).filter(a => a.trim()) : [],
      tita_numeric_tolerance: editorState.question_type === "tita" ? (editorState.tita_numeric_tolerance ?? null) : null,
      explanation_html: editorState.explanation_html || null,
    };

    let questionId = editorState.id as string | undefined;
    if (questionId) {
      const { error } = await supabase.from("mock_questions").update(qPayload).eq("id", questionId);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setEditorSaving(false); return; }
      // Replace options
      await supabase.from("mock_question_options").delete().eq("question_id", questionId);
    } else {
      const { data, error } = await supabase.from("mock_questions").insert(qPayload).select("id").single();
      if (error || !data) { toast({ title: "Save failed", description: error?.message, variant: "destructive" }); setEditorSaving(false); return; }
      questionId = data.id;
    }

    if (editorState.question_type === "mcq" && questionId) {
      const opts = (editorState.options as OptionRow[]).map(o => ({
        question_id: questionId, option_label: o.option_label, option_html: o.option_html, is_correct: o.is_correct, sort_order: o.sort_order,
      }));
      const { error: oerr } = await supabase.from("mock_question_options").insert(opts);
      if (oerr) { toast({ title: "Options save failed", description: oerr.message, variant: "destructive" }); setEditorSaving(false); return; }
    }

    setEditorSaving(false); setEditorOpen(false); setEditorState(null);
    toast({ title: "Question saved" });
    const { data: qs } = await supabase.from("mock_questions").select("*").eq("section_id", activeSectionId).order("question_number");
    setQuestions((qs ?? []) as Question[]);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("mock_questions").delete().eq("id", id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // ---------------- Bulk import (JSON or CSV) ----------------
  const handleBulkImport = async () => {
    if (!activeSectionId) return;
    setBulkBusy(true);
    try {
      let rows: any[] = [];
      const trimmed = bulkText.trim();
      if (!trimmed) throw new Error("Paste JSON array or CSV first");
      if (trimmed.startsWith("[")) {
        rows = JSON.parse(trimmed);
      } else {
        // CSV: question_html,option_a,option_b,option_c,option_d,correct_label,topic,difficulty,positive_marks,negative_marks
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
        const header = lines[0].split(",").map(h => h.trim().toLowerCase());
        rows = lines.slice(1).map(line => {
          const cols = line.split(",");
          const obj: any = {};
          header.forEach((h, i) => { obj[h] = (cols[i] ?? "").trim(); });
          return obj;
        });
      }

      let n = nextQuestionNumber;
      for (const row of rows) {
        const isMcq = (row.question_type ?? "mcq").toLowerCase() === "mcq";
        const qPayload: any = {
          section_id: activeSectionId,
          question_number: row.question_number ? parseInt(row.question_number) : n++,
          question_type: isMcq ? "mcq" : "tita",
          question_html: row.question_html ?? row.question ?? "",
          positive_marks: row.positive_marks ? parseFloat(row.positive_marks) : 3,
          negative_marks: row.negative_marks ? parseFloat(row.negative_marks) : (isMcq ? 1 : 0),
          difficulty: (row.difficulty ?? "medium").toLowerCase(),
          topic: row.topic ?? null,
          tita_correct_answers: !isMcq ? (Array.isArray(row.tita_correct_answers) ? row.tita_correct_answers : String(row.correct_answer ?? "").split("|").filter(Boolean)) : [],
          explanation_html: row.explanation_html ?? row.explanation ?? null,
        };
        const { data: created, error } = await supabase.from("mock_questions").insert(qPayload).select("id").single();
        if (error || !created) throw new Error(error?.message ?? "Insert failed");
        if (isMcq) {
          const opts: OptionRow[] = [];
          if (Array.isArray(row.options)) {
            row.options.forEach((o: any, i: number) => opts.push({
              option_label: o.label ?? String.fromCharCode(65 + i),
              option_html: o.html ?? o.text ?? "",
              is_correct: !!o.is_correct,
              sort_order: i,
            }));
          } else {
            const correctLabel = String(row.correct_label ?? row.answer ?? "A").toUpperCase();
            ["a", "b", "c", "d"].forEach((k, i) => {
              const html = row[`option_${k}`] ?? "";
              if (html) opts.push({ option_label: k.toUpperCase(), option_html: html, is_correct: correctLabel === k.toUpperCase(), sort_order: i });
            });
          }
          if (opts.filter(o => o.is_correct).length !== 1) throw new Error(`Question ${qPayload.question_number}: needs exactly 1 correct option`);
          await supabase.from("mock_question_options").insert(opts.map(o => ({ ...o, question_id: created.id })));
        }
      }

      toast({ title: `Imported ${rows.length} questions` });
      setBulkOpen(false); setBulkText("");
      const { data: qs } = await supabase.from("mock_questions").select("*").eq("section_id", activeSectionId).order("question_number");
      setQuestions((qs ?? []) as Question[]);
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!test) return <div>Test not found. <Link to="/admin/mock-tests" className="text-primary underline">Back</Link></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/admin/mock-tests"><ArrowLeft className="w-4 h-4 mr-1" /> All Mock Tests</Link>
          </Button>
          <h1 className="font-heading text-2xl font-bold">{test.name}</h1>
          <p className="text-sm text-muted-foreground">{test.total_duration_minutes} min · {test.test_type.replace("_", " ")} · {test.pricing_type === "free" ? "Free" : `₹${test.price_inr}`}</p>
        </div>
      </div>

      {/* Section tabs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Sections</CardTitle>
          <div className="flex gap-2">
            {(["VARC", "DILR", "QA"] as const).filter(c => !sections.find(s => s.code === c)).map(c => (
              <Button key={c} variant="outline" size="sm" onClick={() => addSection(c)}><Plus className="w-3.5 h-3.5 mr-1" />{c}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {sections.length === 0 && <p className="text-sm text-muted-foreground">No sections yet — add one above.</p>}
          {sections.length > 0 && (
            <Tabs value={activeSectionId} onValueChange={setActiveSectionId}>
              <TabsList>
                {sections.map(s => (
                  <TabsTrigger key={s.id} value={s.id}>{s.code} <span className="text-xs ml-1.5 text-muted-foreground">({s.duration_minutes}m)</span></TabsTrigger>
                ))}
              </TabsList>
              {sections.map(s => (
                <TabsContent key={s.id} value={s.id} className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Section name</Label>
                      <Input value={s.name} onChange={(e) => setSections(prev => prev.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))} onBlur={(e) => updateSection(s.id, { name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Duration (minutes)</Label>
                      <Input type="number" value={s.duration_minutes} onChange={(e) => setSections(prev => prev.map(x => x.id === s.id ? { ...x, duration_minutes: parseInt(e.target.value) || 0 } : x))} onBlur={(e) => updateSection(s.id, { duration_minutes: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">Target question count</Label>
                      <Input type="number" value={s.total_questions} onChange={(e) => setSections(prev => prev.map(x => x.id === s.id ? { ...x, total_questions: parseInt(e.target.value) || 0 } : x))} onBlur={(e) => updateSection(s.id, { total_questions: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {activeSection && (
        <>
          {/* Passages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" /> Passages / DILR Sets</CardTitle>
              <Button size="sm" onClick={() => openPassage()}><Plus className="w-3.5 h-3.5 mr-1" /> Add Passage</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {passages.length === 0 && <p className="text-sm text-muted-foreground">No passages yet. Optional — only needed for RC and DILR sets.</p>}
              {passages.map(p => (
                <div key={p.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm">{p.title || "Untitled passage"}</div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openPassage(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deletePassage(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <MathContent html={p.content_html} className="prose prose-sm max-w-none mt-2 text-muted-foreground line-clamp-3" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Questions <span className="text-muted-foreground font-normal text-sm">({questions.length} of target {activeSection.total_questions})</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Upload className="w-3.5 h-3.5 mr-1" /> Bulk Import</Button>
                <Button size="sm" onClick={openNewQuestion}><Plus className="w-3.5 h-3.5 mr-1" /> Add Question</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
              {questions.map(q => (
                <div key={q.id} className="border border-border rounded-lg p-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">Q{q.question_number}</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">{q.question_type}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>
                        {q.topic && <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>}
                        {q.passage_id && <Badge variant="outline" className="text-[10px]">linked passage</Badge>}
                      </div>
                      <MathContent html={q.question_html} className="prose prose-sm max-w-none line-clamp-2" />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEditQuestion(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Question editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editorState?.id ? "Edit" : "Add"} Question</DialogTitle></DialogHeader>
          {editorState && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs">Q #</Label>
                  <Input type="number" value={editorState.question_number} onChange={(e) => setEditorState({ ...editorState, question_number: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={editorState.question_type} onValueChange={(v: "mcq" | "tita") => setEditorState({ ...editorState, question_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="tita">TITA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Difficulty</Label>
                  <Select value={editorState.difficulty} onValueChange={(v: any) => setEditorState({ ...editorState, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">+ Marks</Label>
                  <Input type="number" step="0.5" value={editorState.positive_marks} onChange={(e) => setEditorState({ ...editorState, positive_marks: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">- Marks</Label>
                  <Input type="number" step="0.5" value={editorState.negative_marks} onChange={(e) => setEditorState({ ...editorState, negative_marks: parseFloat(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Topic</Label>
                  <Input value={editorState.topic ?? ""} onChange={(e) => setEditorState({ ...editorState, topic: e.target.value })} placeholder="e.g. Algebra, RC, LR Sets" />
                </div>
                <div>
                  <Label className="text-xs">Linked Passage (optional)</Label>
                  <Select value={editorState.passage_id ?? "none"} onValueChange={(v) => setEditorState({ ...editorState, passage_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {passages.map(p => (<SelectItem key={p.id} value={p.id}>{p.title || `Passage ${p.id.slice(0, 8)}`}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Question (use $...$ for inline math, $$...$$ for block)</Label>
                <RichTextEditor content={editorState.question_html} onChange={(html) => setEditorState({ ...editorState, question_html: html })} />
              </div>

              {editorState.question_type === "mcq" ? (
                <div className="space-y-2">
                  <Label className="text-xs">Options (mark exactly one as correct)</Label>
                  {(editorState.options as OptionRow[]).map((o, i) => (
                    <div key={i} className="flex items-start gap-2 border border-border rounded-md p-2">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <Badge variant="outline" className="w-7 h-7 flex items-center justify-center text-xs">{o.option_label}</Badge>
                        <input type="radio" checked={o.is_correct} onChange={() => {
                          const next = (editorState.options as OptionRow[]).map((x, j) => ({ ...x, is_correct: i === j }));
                          setEditorState({ ...editorState, options: next });
                        }} />
                      </div>
                      <Textarea rows={2} value={o.option_html} onChange={(e) => {
                        const next = [...editorState.options]; next[i] = { ...next[i], option_html: e.target.value };
                        setEditorState({ ...editorState, options: next });
                      }} placeholder={`Option ${o.option_label}`} className="flex-1 text-sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Acceptable answers (one per line — case-insensitive)</Label>
                  <Textarea
                    rows={3}
                    value={(editorState.tita_correct_answers as string[]).join("\n")}
                    onChange={(e) => setEditorState({ ...editorState, tita_correct_answers: e.target.value.split(/\n/).map((s: string) => s.trim()).filter(Boolean) })}
                    placeholder={"42\n42.0"}
                  />
                  <Label className="text-xs">Numeric tolerance ± (optional, for numeric answers)</Label>
                  <Input type="number" step="0.01" value={editorState.tita_numeric_tolerance ?? ""} onChange={(e) => setEditorState({ ...editorState, tita_numeric_tolerance: e.target.value === "" ? null : parseFloat(e.target.value) })} />
                </div>
              )}

              <div>
                <Label className="text-xs mb-1.5 block">Explanation / Solution</Label>
                <RichTextEditor content={editorState.explanation_html ?? ""} onChange={(html) => setEditorState({ ...editorState, explanation_html: html })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditorOpen(false); setEditorState(null); }}>Cancel</Button>
            <Button onClick={saveQuestion} disabled={editorSaving}>
              {editorSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passage editor dialog */}
      <Dialog open={passageOpen} onOpenChange={setPassageOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{passageState?.id ? "Edit" : "Add"} Passage</DialogTitle></DialogHeader>
          {passageState && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title (optional)</Label>
                <Input value={passageState.title} onChange={(e) => setPassageState({ ...passageState, title: e.target.value })} placeholder="RC Passage 1" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Content (use $...$ / $$...$$ for math)</Label>
                <RichTextEditor content={passageState.content_html} onChange={(html) => setPassageState({ ...passageState, content_html: html })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassageOpen(false)}>Cancel</Button>
            <Button onClick={savePassage}>Save Passage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk import dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Import Questions</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Paste either a <strong>JSON array</strong> of question objects, or a <strong>CSV</strong>.
              Inline math: <code className="bg-muted px-1 rounded">$x^2$</code>, block math: <code className="bg-muted px-1 rounded">$$\\frac{"{a}"}{"{b}"}$$</code>.
            </p>
            <details className="bg-muted/40 rounded p-2">
              <summary className="cursor-pointer font-medium text-xs">CSV header format</summary>
              <pre className="text-[10px] mt-2 whitespace-pre-wrap">question_html,option_a,option_b,option_c,option_d,correct_label,topic,difficulty,positive_marks,negative_marks</pre>
            </details>
            <details className="bg-muted/40 rounded p-2">
              <summary className="cursor-pointer font-medium text-xs">JSON example</summary>
              <pre className="text-[10px] mt-2 whitespace-pre-wrap">{`[
  {
    "question_html": "<p>If $x+2=5$ then $x$ = ?</p>",
    "question_type": "mcq",
    "topic": "Algebra",
    "difficulty": "easy",
    "options": [
      { "label": "A", "html": "1", "is_correct": false },
      { "label": "B", "html": "2", "is_correct": false },
      { "label": "C", "html": "3", "is_correct": true },
      { "label": "D", "html": "4", "is_correct": false }
    ],
    "explanation_html": "<p>Subtract 2 from both sides.</p>"
  }
]`}</pre>
            </details>
            <Textarea rows={12} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Paste JSON array or CSV here…" className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={bulkBusy}>
              {bulkBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMockBuilder;
