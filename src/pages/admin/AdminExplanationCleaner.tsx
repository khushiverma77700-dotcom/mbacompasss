import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Square, RefreshCw, Sparkles, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Test = { id: string; name: string; exam_code: string };
type Section = { id: string; name: string; code: string; test_id: string };
type Topic = { topic: string; n: number };
type Scope = "all" | "test" | "section" | "topic" | "question";

export default function AdminExplanationCleaner() {
  const [tests, setTests] = useState<Test[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [scope, setScope] = useState<Scope>("all");
  const [testId, setTestId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [topic, setTopic] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [force, setForce] = useState(false);
  const [batchSize, setBatchSize] = useState(20);

  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const [processed, setProcessed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [startTs, setStartTs] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("mock_tests").select("id, name, exam_code").order("created_at", { ascending: false }).limit(1000)
      .then(({ data }) => setTests((data as Test[]) ?? []));
  }, []);

  useEffect(() => {
    if (!testId) { setSections([]); setSectionId(""); return; }
    supabase.from("mock_sections").select("id, name, code, test_id").eq("test_id", testId).order("sort_order")
      .then(({ data }) => setSections((data as Section[]) ?? []));
  }, [testId]);

  useEffect(() => {
    // distinct topics, optionally scoped to test/section
    let q = supabase.from("mock_questions").select("topic, section_id, mock_sections!inner(test_id)").not("topic", "is", null).limit(5000);
    if (sectionId) q = q.eq("section_id", sectionId);
    else if (testId) q = q.eq("mock_sections.test_id", testId);
    q.then(({ data }) => {
      const counts = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const t = (r.topic || "").trim();
        if (!t) return;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      });
      setTopics([...counts.entries()].map(([topic, n]) => ({ topic, n })).sort((a, b) => b.n - a.n));
    });
  }, [testId, sectionId]);

  const filters = useMemo(() => {
    const f: any = { force };
    if (scope === "test") f.test_id = testId || undefined;
    if (scope === "section") { f.section_id = sectionId || undefined; }
    if (scope === "topic") { f.topic = topic || undefined; if (testId) f.test_id = testId; }
    if (scope === "question") f.question_id = questionId || undefined;
    return f;
  }, [scope, testId, sectionId, topic, questionId, force]);

  const refreshStats = async () => {
    const { data, error } = await supabase.functions.invoke("reformat-explanations", { body: { mode: "stats", ...filters } });
    if (error) { toast.error(error.message); return; }
    setRemaining(data?.remaining ?? 0);
    setTotal(data?.total ?? 0);
  };

  useEffect(() => { refreshStats(); /* eslint-disable-next-line */ }, [scope, testId, sectionId, topic, questionId, force]);

  const runLoop = async () => {
    if (scope === "test" && !testId) return toast.error("Pick a mock test");
    if (scope === "section" && !sectionId) return toast.error("Pick a section");
    if (scope === "topic" && !topic) return toast.error("Pick a topic");
    if (scope === "question" && !questionId) return toast.error("Paste a question id");

    setRunning(true);
    stopRef.current = false;
    setProcessed(0); setFailed(0); setLog([]);
    setStartTs(Date.now());
    await refreshStats();

    while (!stopRef.current) {
      const { data, error } = await supabase.functions.invoke("reformat-explanations", {
        body: { mode: "process", batch_size: batchSize, ...filters },
      });
      if (error) { toast.error(error.message); setLog((l) => [`Error: ${error.message}`, ...l].slice(0, 50)); break; }
      const p = data?.processed ?? 0;
      const f = data?.failed ?? 0;
      setProcessed((x) => x + p);
      setFailed((x) => x + f);
      setRemaining(data?.remaining ?? 0);
      setLog((l) => [`Batch +${p} ok, ${f} failed, ${data?.remaining ?? 0} left`, ...l].slice(0, 50));
      if (data?.done || (p === 0 && f === 0)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    setRunning(false);
    toast.success("Cleanup finished");
  };

  const stop = () => { stopRef.current = true; };

  const done = Math.max(0, total - remaining);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const elapsed = startTs ? (Date.now() - startTs) / 1000 : 0;
  const rate = elapsed > 0 && processed > 0 ? processed / elapsed : 0; // q/sec
  const etaSec = rate > 0 && remaining > 0 ? Math.round(remaining / rate) : null;
  const etaText = etaSec == null ? "—" : etaSec < 60 ? `${etaSec}s` : etaSec < 3600 ? `${Math.round(etaSec / 60)} min` : `${(etaSec / 3600).toFixed(1)} h`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-sky-600" /> Explanation Cleaner</h1>
          <p className="text-sm text-muted-foreground mt-1">Auto-rewrites every messy mock explanation into clean, structured HTML with proper LaTeX. Pick a scope and hit Start — the loop runs in this tab and keeps going until 0 are left.</p>
        </div>
        <Button onClick={refreshStats} variant="outline" disabled={running}><RefreshCw className="h-4 w-4 mr-2" />Refresh stats</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Choose what to clean</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Scope</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(["all","test","section","topic","question"] as Scope[]).map((s) => (
                <Button key={s} size="sm" variant={scope === s ? "default" : "outline"} onClick={() => setScope(s)} disabled={running}>
                  {s === "all" ? "All mocks" : s === "test" ? "Mock-wise" : s === "section" ? "Section-wise" : s === "topic" ? "Topic-wise" : "Single question"}
                </Button>
              ))}
            </div>
          </div>

          {(scope === "test" || scope === "section" || scope === "topic") && (
            <div>
              <Label>Mock test{scope === "topic" ? " (optional)" : ""}</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background" value={testId} onChange={(e) => { setTestId(e.target.value); setSectionId(""); setTopic(""); }} disabled={running}>
                <option value="">{scope === "topic" ? "Any mock" : "— Pick a mock —"}</option>
                {tests.map((t) => <option key={t.id} value={t.id}>{t.exam_code} — {t.name}</option>)}
              </select>
            </div>
          )}

          {scope === "section" && testId && (
            <div>
              <Label>Section</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={running}>
                <option value="">— Pick a section —</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
          )}

          {scope === "topic" && (
            <div>
              <Label>Topic</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={running}>
                <option value="">— Pick a topic —</option>
                {topics.map((t) => <option key={t.topic} value={t.topic}>{t.topic} ({t.n})</option>)}
              </select>
            </div>
          )}

          {scope === "question" && (
            <div>
              <Label>Question ID (uuid)</Label>
              <Input value={questionId} onChange={(e) => setQuestionId(e.target.value.trim())} placeholder="e.g. 9f3c…" disabled={running} />
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div>
              <Label>Batch size (1–40)</Label>
              <Input type="number" min={1} max={40} value={batchSize} onChange={(e) => setBatchSize(Math.min(40, Math.max(1, Number(e.target.value) || 20)))} disabled={running} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={running} />
                Force re-format (even already-clean ones)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Progress</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Stat icon={<Sparkles className="h-4 w-4" />} label="Total" value={total} />
            <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Done" value={done} />
            <Stat icon={<Loader2 className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />} label="Remaining" value={remaining} />
            <Stat icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Failed" value={failed} />
            <Stat icon={<Clock className="h-4 w-4" />} label="ETA" value={etaText} />
          </div>
          <Progress value={pct} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{pct}% complete · {processed} processed this run · {rate ? rate.toFixed(2) : "0.00"} q/sec</span>
            {running && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> running — keep this tab open</span>}
          </div>

          <div className="flex gap-2 pt-1">
            {!running ? (
              <Button onClick={runLoop} disabled={total === 0 && !force} size="lg" className="bg-sky-600 hover:bg-sky-700">
                <Play className="h-4 w-4 mr-2" />Start cleaning ({total} questions)
              </Button>
            ) : (
              <Button onClick={stop} variant="destructive" size="lg"><Square className="h-4 w-4 mr-2" />Stop</Button>
            )}
          </div>

          {log.length > 0 && (
            <div className="mt-2 max-h-64 overflow-auto rounded border bg-slate-50 p-3 text-xs font-mono space-y-1">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-3">
            Detection: an explanation is considered "messy" if it doesn't contain any <code>&lt;h4&gt;</code> section headers. Force mode reformats every explanation in scope regardless. The rewriter preserves all numbers, formulas, SVG diagrams and final answers.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
