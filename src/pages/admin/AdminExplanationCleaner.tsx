import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Square, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Test = { id: string; name: string; exam_code: string };

export default function AdminExplanationCleaner() {
  const [tests, setTests] = useState<Test[]>([]);
  const [testId, setTestId] = useState<string>("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const stopRef = useState<{ s: boolean }>({ s: false })[0];
  const [processed, setProcessed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(15);

  useEffect(() => {
    supabase.from("mock_tests").select("id, name, exam_code").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setTests((data as Test[]) ?? []));
  }, []);

  const refreshCount = async () => {
    const { data, error } = await supabase.functions.invoke("reformat-explanations", {
      body: { mode: "count", test_id: testId || undefined },
    });
    if (error) { toast.error(error.message); return; }
    setRemaining(data?.remaining ?? 0);
    if (total === 0) setTotal(data?.remaining ?? 0);
  };

  useEffect(() => { refreshCount(); /* eslint-disable-next-line */ }, [testId]);

  const runLoop = async () => {
    setRunning(true);
    stopRef.s = false;
    setProcessed(0); setFailed(0); setLog([]);
    await refreshCount();
    setTotal(remaining ?? 0);

    while (!stopRef.s) {
      const { data, error } = await supabase.functions.invoke("reformat-explanations", {
        body: { mode: "process", test_id: testId || undefined, batch_size: batchSize },
      });
      if (error) { toast.error(error.message); setLog((l) => [`Error: ${error.message}`, ...l].slice(0, 30)); break; }
      const p = data?.processed ?? 0;
      const f = data?.failed ?? 0;
      setProcessed((x) => x + p);
      setFailed((x) => x + f);
      setRemaining(data?.remaining ?? 0);
      setLog((l) => [`Batch: +${p} ok, ${f} failed, ${data?.remaining ?? 0} left`, ...l].slice(0, 30));
      if (data?.done || (p === 0 && f === 0)) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    setRunning(false);
    toast.success("Cleanup loop finished");
  };

  const stop = () => { stopRef.s = true; };

  const pct = total > 0 ? Math.round(((total - (remaining ?? 0)) / total) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-sky-600" /> Explanation Cleaner</h1>
        <p className="text-sm text-muted-foreground mt-1">Rewrites messy wall-of-text mock explanations into clean, structured HTML with proper math formatting. Original logic, numbers and answers are preserved.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Run cleanup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Scope</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background" value={testId} onChange={(e) => { setTestId(e.target.value); setTotal(0); }} disabled={running}>
                <option value="">All mocks (every test)</option>
                {tests.map((t) => <option key={t.id} value={t.id}>{t.exam_code} — {t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Batch size (1–40)</Label>
              <Input type="number" min={1} max={40} value={batchSize} onChange={(e) => setBatchSize(Math.min(40, Math.max(1, Number(e.target.value) || 15)))} disabled={running} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={refreshCount} variant="outline" disabled={running}><RefreshCw className="h-4 w-4 mr-2" />Recount</Button>
              {!running ? (
                <Button onClick={runLoop} disabled={(remaining ?? 0) === 0}><Play className="h-4 w-4 mr-2" />Start</Button>
              ) : (
                <Button onClick={stop} variant="destructive"><Square className="h-4 w-4 mr-2" />Stop</Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-2 items-center">
                <Badge variant="outline">Remaining: {remaining ?? "…"}</Badge>
                <Badge variant="outline" className="text-emerald-700 border-emerald-200">Done: {processed}</Badge>
                {failed > 0 && <Badge variant="outline" className="text-red-700 border-red-200">Failed: {failed}</Badge>}
              </div>
              {running && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Working…</span>}
            </div>
            <Progress value={pct} />
            <div className="text-xs text-muted-foreground">{pct}% complete</div>
          </div>

          {log.length > 0 && (
            <div className="mt-2 max-h-64 overflow-auto rounded border bg-slate-50 p-3 text-xs font-mono space-y-1">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-3">
            Tip: leave this tab open while it runs. It only touches explanations that aren't already structured (no <code>&lt;h4&gt;</code> blocks). You can re-run safely.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
