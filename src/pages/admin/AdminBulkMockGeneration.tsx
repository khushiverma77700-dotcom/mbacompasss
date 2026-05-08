import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Pencil, Pause, Play, RefreshCw, Send, Layers } from "lucide-react";

type ExamCode = "CAT" | "NMAT" | "XAT" | "SNAP" | "IIFT" | "CMAT" | "MAT";
type Category = "full_length" | "sectional" | "topic" | "daily" | "practice";
type Level = "easy" | "moderate" | "hard" | "mixed";

const EXAM_SECTIONS: Record<ExamCode, { code: string; name: string }[]> = {
  CAT:  [{ code: "VARC", name: "VARC" }, { code: "DILR", name: "DILR" }, { code: "QA", name: "QA" }],
  NMAT: [{ code: "LS", name: "Language Skills" }, { code: "QS", name: "Quantitative Skills" }, { code: "LR", name: "Logical Reasoning" }],
  XAT:  [{ code: "VALR", name: "Verbal & Logical Ability" }, { code: "DM", name: "Decision Making" }, { code: "QADI", name: "Quantitative Ability & DI" }, { code: "GK", name: "GK" }],
  SNAP: [{ code: "GE", name: "General English" }, { code: "QADS", name: "Quantitative & DI" }, { code: "AR", name: "Analytical & Logical Reasoning" }],
  IIFT: [{ code: "VARC", name: "Verbal Ability & RC" }, { code: "QA", name: "Quantitative Analysis" }, { code: "DILR", name: "Data Interpretation & LR" }, { code: "GK", name: "GK" }],
  CMAT: [{ code: "QADI", name: "Quantitative Techniques" }, { code: "LR", name: "Logical Reasoning" }, { code: "LC", name: "Language Comprehension" }, { code: "GA", name: "General Awareness" }, { code: "IE", name: "Innovation & Entrepreneurship" }],
  MAT:  [{ code: "LC", name: "Language Comprehension" }, { code: "MS", name: "Mathematical Skills" }, { code: "DA", name: "Data Analysis" }, { code: "ICR", name: "Intelligence & Critical Reasoning" }, { code: "IGE", name: "Indian & Global Environment" }],
};

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "full_length", label: "Full-Length Mock" },
  { value: "sectional", label: "Sectional Mock" },
  { value: "topic", label: "Topic-wise Mock" },
  { value: "daily", label: "Daily Quiz" },
  { value: "practice", label: "Practice Set" },
];
const LEVELS: { value: Level; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

type Draft = {
  tempId: string;
  exam_code: ExamCode;
  category: Category;
  level: Level;
  section_code: string;
  topic: string;
  questions_per_set: number;
  sets: number;
  test_name_prefix: string;
};

const newDraft = (): Draft => ({
  tempId: crypto.randomUUID(),
  exam_code: "CAT",
  category: "sectional",
  level: "moderate",
  section_code: "VARC",
  topic: "",
  questions_per_set: 20,
  sets: 1,
  test_name_prefix: "",
});

const STATUS_TONE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  processing: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  needs_review: "bg-amber-100 text-amber-900",
};

export default function AdminBulkMockGeneration() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editor, setEditor] = useState<Draft>(newDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [batchLabel, setBatchLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("builder");

  const sectionsForExam = EXAM_SECTIONS[editor.exam_code] ?? [];
  const sectionRequired = editor.category !== "full_length";
  const topicRequired = editor.category === "topic";

  useEffect(() => {
    if (sectionRequired && !sectionsForExam.find((s) => s.code === editor.section_code)) {
      setEditor((e) => ({ ...e, section_code: sectionsForExam[0]?.code ?? "" }));
    }
  }, [editor.exam_code, editor.category]);

  const addDraft = () => {
    if (sectionRequired && !editor.section_code) {
      toast.error("Pick a section");
      return;
    }
    if (topicRequired && !editor.topic.trim()) {
      toast.error("Topic is required for topic-wise mock");
      return;
    }
    const clean: Draft = {
      ...editor,
      tempId: editingId ?? crypto.randomUUID(),
      section_code: editor.category === "full_length" ? "" : editor.section_code,
      topic: editor.topic.trim(),
      test_name_prefix: editor.test_name_prefix.trim(),
    };
    setDrafts((d) => {
      if (editingId) return d.map((x) => (x.tempId === editingId ? clean : x));
      return [...d, clean];
    });
    setEditor(newDraft());
    setEditingId(null);
  };

  const editDraft = (d: Draft) => {
    setEditor(d);
    setEditingId(d.tempId);
  };
  const dupDraft = (d: Draft) => setDrafts((arr) => [...arr, { ...d, tempId: crypto.randomUUID() }]);
  const removeDraft = (id: string) =>
    setDrafts((arr) => arr.filter((x) => x.tempId !== id));

  const submitBatch = async () => {
    if (!drafts.length) {
      toast.error("Add at least one mock to the queue");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-mock-worker", {
        body: {
          label: batchLabel || null,
          items: drafts.map((d) => ({
            exam_code: d.exam_code,
            category: d.category,
            level: d.level,
            section_code: d.category === "full_length" ? null : d.section_code,
            topic: d.topic || null,
            questions_per_set: d.questions_per_set,
            sets: d.sets,
            test_name_prefix: d.test_name_prefix || null,
          })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Queued ${drafts.length} mock${drafts.length > 1 ? "s" : ""} — generation started in background`);
      setDrafts([]);
      setBatchLabel("");
      setTab("queue");
    } catch (e: any) {
      toast.error(e?.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const totalQueued = useMemo(
    () => drafts.reduce((s, d) => s + d.questions_per_set * d.sets, 0),
    [drafts],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-5 w-5 text-sky-600" /> Bulk AI Mock Generation
        </h1>
        <p className="text-sm text-muted-foreground">
          Queue many mock generation requests at once. The system will generate questions in the background and add finished mocks to the database automatically.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="builder">Queue Composer</TabsTrigger>
          <TabsTrigger value="queue">Generation Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{editingId ? "Edit Request" : "Add Mock Request"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Exam</Label>
                  <Select value={editor.exam_code} onValueChange={(v) => setEditor({ ...editor, exam_code: v as ExamCode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(EXAM_SECTIONS) as ExamCode[]).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mock Type</Label>
                  <Select value={editor.category} onValueChange={(v) => setEditor({ ...editor, category: v as Category })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={editor.level} onValueChange={(v) => setEditor({ ...editor, level: v as Level })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {sectionRequired && (
                  <div>
                    <Label>Section</Label>
                    <Select value={editor.section_code} onValueChange={(v) => setEditor({ ...editor, section_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sectionsForExam.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className={sectionRequired ? "" : "sm:col-span-1"}>
                  <Label>Topic / Category {topicRequired && <span className="text-rose-600">*</span>}</Label>
                  <Input
                    placeholder={topicRequired ? "e.g. Arithmetic, Para-jumbles, Caselet DI" : "(optional)"}
                    value={editor.topic}
                    onChange={(e) => setEditor({ ...editor, topic: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Questions per set</Label>
                  <Input type="number" min={1} max={200} value={editor.questions_per_set}
                    onChange={(e) => setEditor({ ...editor, questions_per_set: Math.max(1, parseInt(e.target.value) || 1) })} />
                </div>
                <div>
                  <Label>Number of sets (1-10)</Label>
                  <Input type="number" min={1} max={10} value={editor.sets}
                    onChange={(e) => setEditor({ ...editor, sets: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Test name prefix (optional)</Label>
                  <Input placeholder="e.g. CAT Booster Series" value={editor.test_name_prefix}
                    onChange={(e) => setEditor({ ...editor, test_name_prefix: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={addDraft} className="bg-sky-600 hover:bg-sky-700">
                  <Plus className="h-4 w-4 mr-1" />
                  {editingId ? "Update Request" : "Add to Queue"}
                </Button>
                {editingId && (
                  <Button variant="ghost" onClick={() => { setEditor(newDraft()); setEditingId(null); }}>Cancel edit</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Drafts ({drafts.length})</span>
                <span className="text-xs font-normal text-muted-foreground">Total questions: {totalQueued}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.length === 0 && (
                <p className="text-sm text-muted-foreground">No drafts yet. Add mock requests above, then submit them all together.</p>
              )}
              {drafts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-sky-50">
                      <tr>
                        <th className="p-2 text-left">Exam</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Section</th>
                        <th className="p-2 text-left">Topic</th>
                        <th className="p-2 text-left">Difficulty</th>
                        <th className="p-2 text-right">Q × Sets</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((d) => (
                        <tr key={d.tempId} className="border-b">
                          <td className="p-2 font-medium">{d.exam_code}</td>
                          <td className="p-2 capitalize">{d.category.replace("_", " ")}</td>
                          <td className="p-2">{d.section_code || "—"}</td>
                          <td className="p-2 max-w-[180px] truncate">{d.topic || "—"}</td>
                          <td className="p-2 capitalize">{d.level}</td>
                          <td className="p-2 text-right">{d.questions_per_set} × {d.sets}</td>
                          <td className="p-2 text-right whitespace-nowrap">
                            <Button size="icon" variant="ghost" onClick={() => editDraft(d)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => dupDraft(d)}><Copy className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => removeDraft(d.tempId)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {drafts.length > 0 && (
                <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end pt-2">
                  <div>
                    <Label>Batch label (optional)</Label>
                    <Input value={batchLabel} onChange={(e) => setBatchLabel(e.target.value)} placeholder="e.g. CAT Boost Sprint — Week 12" />
                  </div>
                  <Button onClick={submitBatch} disabled={submitting} className="bg-sky-600 hover:bg-sky-700">
                    <Send className="h-4 w-4 mr-1" />
                    {submitting ? "Submitting…" : `Submit ${drafts.length} request${drafts.length > 1 ? "s" : ""}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <QueueDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueueDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: reqs }, { data: itms }] = await Promise.all([
      supabase.from("bulk_mock_requests").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("bulk_mock_request_items").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setRequests(reqs ?? []);
    setItems(itms ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const reconcileTick = () => {
      supabase.functions.invoke("bulk-mock-worker", { body: { reconcile: true } }).catch(() => {});
    };
    reconcileTick();
    const t1 = setInterval(load, 4000);
    const t2 = setInterval(reconcileTick, 6000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const togglePause = async (item: any) => {
    const { error } = await supabase
      .from("bulk_mock_request_items")
      .update({ paused: !item.paused })
      .eq("id", item.id);
    if (error) toast.error(error.message); else load();
  };

  const retryItem = async (item: any) => {
    const { error } = await supabase
      .from("bulk_mock_request_items")
      .update({ status: "pending", paused: false, error_message: null, generation_id: null })
      .eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    const { data, error: fnErr } = await supabase.functions.invoke("bulk-mock-worker", { body: { resume_id: item.id } });
    if (fnErr) toast.error(fnErr.message);
    else if ((data as any)?.error) toast.error((data as any).error);
    else { toast.success("Re-dispatched"); load(); }
  };

  const deleteItem = async (item: any) => {
    if (!confirm("Delete this queued request?")) return;
    const { error } = await supabase.from("bulk_mock_request_items").delete().eq("id", item.id);
    if (error) toast.error(error.message); else load();
  };

  const itemsByRequest = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const it of items) {
      const arr = m.get(it.request_id) ?? [];
      arr.push(it);
      m.set(it.request_id, arr);
    }
    return m;
  }, [items]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading queue…</p>;
  if (!requests.length) return <p className="text-sm text-muted-foreground">No bulk requests yet. Create one in the Queue Composer tab.</p>;

  return (
    <div className="space-y-5">
      {requests.map((r) => {
        const its = itemsByRequest.get(r.id) ?? [];
        const done = its.filter((i) => i.status === "completed").length;
        return (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                <span>
                  {r.label || `Batch ${r.id.slice(0, 8)}`}
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge className={STATUS_TONE[r.status] ?? STATUS_TONE.pending}>{r.status}</Badge>
                  <span className="text-xs text-muted-foreground">{done}/{its.length} completed</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sky-50">
                  <tr>
                    <th className="p-2 text-left">Exam</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Section</th>
                    <th className="p-2 text-left">Topic</th>
                    <th className="p-2 text-left">Difficulty</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Progress</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {its.map((it) => {
                    const pct = it.total_requested > 0
                      ? Math.min(100, Math.round((it.total_generated / it.total_requested) * 100))
                      : 0;
                    return (
                      <tr key={it.id} className="border-b align-top">
                        <td className="p-2 font-medium">{it.exam_code}</td>
                        <td className="p-2 capitalize">{it.category.replace("_", " ")}</td>
                        <td className="p-2">{it.section_code || "—"}</td>
                        <td className="p-2 max-w-[180px] truncate" title={it.topic ?? ""}>{it.topic || "—"}</td>
                        <td className="p-2 capitalize">{it.level}</td>
                        <td className="p-2">
                          <Badge className={STATUS_TONE[it.status] ?? STATUS_TONE.pending}>
                            {it.status.replace("_", " ")}
                          </Badge>
                          {it.paused && <Badge className="ml-1 bg-amber-100 text-amber-900">paused</Badge>}
                          {it.error_message && (
                            <div className="text-[11px] text-rose-700 mt-1 max-w-[240px]">{it.error_message}</div>
                          )}
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <div className="text-xs">{it.total_generated}/{it.total_requested}</div>
                          <div className="w-24 h-1.5 bg-sky-100 rounded mt-1 overflow-hidden">
                            <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          {(it.status === "pending" || it.paused) && (
                            <Button size="icon" variant="ghost" title={it.paused ? "Resume" : "Pause"} onClick={() => togglePause(it)}>
                              {it.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                            </Button>
                          )}
                          {(it.status === "failed" || it.status === "needs_review") && (
                            <Button size="icon" variant="ghost" title="Retry" onClick={() => retryItem(it)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {it.status !== "processing" && (
                            <Button size="icon" variant="ghost" title="Delete" onClick={() => deleteItem(it)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
