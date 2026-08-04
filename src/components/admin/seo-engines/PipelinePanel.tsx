import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw, Workflow, Radio } from "lucide-react";
import { fmtDate, invokeEngine, scoreBadge, statusVariant } from "./shared";

const PipelinePanel = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [ingest, setIngest] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: q }, { data: runs }, { data: s }] = await Promise.all([
      supabase.from("seo_pipeline_queue").select("*").order("created_at", { ascending: false }).limit(150),
      supabase.from("gsc_ingest_runs").select("*").order("created_at", { ascending: false }).limit(1),
      supabase.from("seo_engine_settings").select("*").eq("id", true).maybeSingle(),
    ]);
    setQueue(q ?? []);
    setIngest(runs?.[0] ?? null);
    setSettings(s ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runIngest = async () => {
    setBusy("ingest");
    try {
      const pages = await invokeEngine<any>("gsc-ingest", { stage: "pages" });
      toast.success(`${pages.pages} page rows ingested.`);
      const q = await invokeEngine<any>("gsc-ingest", { stage: "queries", run_id: pages.run_id, site_url: pages.site_url });
      toast.success(`${q.queries} keyword rows ingested.`);
      const h = await invokeEngine<any>("gsc-ingest", { stage: "health", run_id: pages.run_id, site_url: pages.site_url });
      toast.success(`${h.pages_updated} pages updated with live performance signals.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signal ingestion failed.");
    } finally {
      setBusy("");
    }
  };

  const drainQueue = async () => {
    setBusy("queue");
    try {
      let total = 0;
      for (let i = 0; i < 10; i++) {
        const res = await invokeEngine<any>("seo-pipeline-worker", { limit: 5 });
        total += res.processed ?? 0;
        if (!res.processed) break;
      }
      toast.success(total ? `${total} pages processed through the pipeline.` : "Queue is already empty.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pipeline run failed.");
    } finally {
      setBusy("");
    }
  };

  const runOne = async () => {
    if (!path.trim().startsWith("/")) {
      toast.error("Enter a page path starting with /");
      return;
    }
    setBusy("one");
    try {
      const res = await invokeEngine<any>("seo-pipeline-worker", { path: path.trim() });
      const first = res.results?.[0];
      if (first?.error) toast.error(first.error);
      else toast.success(`Health score ${first?.health} with ${first?.issues} issues found.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pipeline run failed.");
    } finally {
      setBusy("");
    }
  };

  const saveSetting = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("seo_engine_settings").update(patch).eq("id", true);
    if (error) toast.error(error.message);
    else {
      setSettings({ ...settings, ...patch });
      toast.success("Automation settings saved.");
    }
  };

  const pending = queue.filter((q) => q.status === "queued" || q.status === "processing").length;
  const failed = queue.filter((q) => q.status === "failed").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4" /> Search Console &amp; Analytics ingestion</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pulls live clicks, impressions, CTR and average position (current vs previous 28 days) plus keyword-level rows. Every engine and health score reads this data.
            </p>
          </div>
          <Button onClick={runIngest} disabled={!!busy}>
            {busy === "ingest" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Ingest signals
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Last ingest", value: fmtDate(ingest?.created_at) },
            { label: "Status", value: ingest?.status ?? "never run" },
            { label: "Page rows", value: ingest?.pages_ingested ?? 0 },
            { label: "Keyword rows", value: ingest?.queries_ingested ?? 0 },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-sm font-medium">{String(s.value)}</p>
            </div>
          ))}
          {ingest?.error && <p className="text-xs text-destructive sm:col-span-4">{ingest.error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Workflow className="h-4 w-4" /> Post-publish pipeline</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Every newly published page is queued automatically and scored for content quality, duplication, schema validity, entity coverage and decay monitoring.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="/college/iim-ahmedabad" value={path} onChange={(e) => setPath(e.target.value)} className="w-56" />
            <Button variant="outline" onClick={runOne} disabled={!!busy}>Run one page</Button>
            <Button onClick={drainQueue} disabled={!!busy}>
              {busy === "queue" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Process queue
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Waiting in queue</p><p className="text-2xl font-semibold">{pending}</p></div>
          <div><p className="text-xs text-muted-foreground">Completed (recent)</p><p className="text-2xl font-semibold">{queue.filter((q) => q.status === "completed").length}</p></div>
          <div><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-semibold">{failed}</p></div>
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader><CardTitle className="text-base">Automation policy</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "postpublish_enabled", label: "Auto-run pipeline on new pages" },
              { key: "intent_enabled", label: "Intent splitting enabled" },
              { key: "decay_enabled", label: "Decay recovery enabled" },
              { key: "entity_enabled", label: "Entity stacking enabled" },
              { key: "auto_apply_safe_actions", label: "Auto-apply safe actions (links, schema, FAQs)" },
            ].map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-md border p-3">
                <Label className="text-sm">{s.label}</Label>
                <Switch
                  checked={Boolean(settings[s.key])}
                  onCheckedChange={(v) => saveSetting({ [s.key]: v })}
                />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="text-sm">Decay click-drop threshold (%)</Label>
              <Input
                type="number"
                className="w-24"
                value={settings.decay_click_drop_pct ?? 25}
                onChange={(e) => setSettings({ ...settings, decay_click_drop_pct: Number(e.target.value) })}
                onBlur={() => saveSetting({ decay_click_drop_pct: settings.decay_click_drop_pct })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline history</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Page</TableHead><TableHead>Event</TableHead>
              <TableHead>Health</TableHead><TableHead>Schema</TableHead><TableHead>Duplicate</TableHead>
              <TableHead>Status</TableHead><TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {queue.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="text-xs">{fmtDate(q.created_at)}</TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="text-sm truncate">{q.page_name ?? q.path}</p>
                    <p className="text-xs text-muted-foreground truncate">{q.path}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline">{q.event}</Badge></TableCell>
                  <TableCell>{q.health_score != null ? scoreBadge(q.health_score) : "—"}</TableCell>
                  <TableCell>{q.schema_valid == null ? "—" : q.schema_valid ? "valid" : <Badge variant="destructive">invalid</Badge>}</TableCell>
                  <TableCell>{q.duplication_found ? <Badge variant="destructive">yes</Badge> : "no"}</TableCell>
                  <TableCell><Badge variant={statusVariant(q.status) as never}>{q.status}</Badge></TableCell>
                  <TableCell className="max-w-[240px] text-xs text-muted-foreground truncate">
                    {q.error ?? q.result?.issues?.[0] ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!queue.length && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nothing queued yet — new pages appear here automatically as they are published.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PipelinePanel;
