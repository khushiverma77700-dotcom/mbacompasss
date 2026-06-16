import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Sparkles, CheckCircle2, XCircle, Loader2, Pause, Play, RotateCw, ExternalLink, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slugify";

type RowStatus = "pending" | "processing" | "succeeded" | "failed" | "skipped";
interface Row {
  index: number;
  name: string;
  city?: string;
  state?: string;
  status: RowStatus;
  step?: string;
  instituteId?: string;
  slug?: string;
  error?: string;
}

const LS_KEY = "admin_bulk_coaching_state_v1";
const CONCURRENCY = 2;

const normalizeName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

const parseLine = (raw: string): { name: string; city?: string; state?: string } | null => {
  const line = raw.trim();
  if (!line) return null;
  // Supports "Name", "Name, City", "Name | City | State", "Name - City"
  const parts = line.split(/\s*[|,]\s*|\s+-\s+/);
  const name = parts[0]?.trim();
  if (!name) return null;
  return { name, city: parts[1]?.trim() || undefined, state: parts[2]?.trim() || undefined };
};

const statusBadge = (s: RowStatus) =>
  ({
    pending: "bg-muted text-muted-foreground border-border",
    processing: "bg-blue-100 text-blue-800 border-blue-300",
    succeeded: "bg-emerald-100 text-emerald-800 border-emerald-300",
    failed: "bg-red-100 text-red-800 border-red-300",
    skipped: "bg-amber-100 text-amber-800 border-amber-300",
  }[s]);

const AdminBulkCreateCoachingInstitutes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [defaultCity, setDefaultCity] = useState("");
  const [defaultState, setDefaultState] = useState("");
  const [instituteType, setInstituteType] = useState<"city" | "hybrid">("hybrid");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);

  // Restore previous session view (read-only resume of last result table)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.rows)) setRows(s.rows);
        if (typeof s.instituteType === "string") setInstituteType(s.instituteType);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ rows, instituteType })); } catch {}
  }, [rows, instituteType]);

  const metrics = useMemo(() => {
    const succeeded = rows.filter(r => r.status === "succeeded").length;
    const failed = rows.filter(r => r.status === "failed").length;
    const processing = rows.filter(r => r.status === "processing").length;
    const pending = rows.filter(r => r.status === "pending").length;
    const total = rows.length;
    const completed = succeeded + failed;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { succeeded, failed, processing, pending, total, completed, pct };
  }, [rows]);

  const parsedPreview = useMemo(() => {
    return input.split("\n").map(parseLine).filter(Boolean) as { name: string; city?: string; state?: string }[];
  }, [input]);

  const buildQueue = () => {
    const items = parsedPreview;
    if (!items.length) return;
    const seen = new Set<string>();
    const queue: Row[] = [];
    items.forEach((it, i) => {
      const k = it.name.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      queue.push({
        index: i,
        name: it.name,
        city: it.city || defaultCity || undefined,
        state: it.state || defaultState || undefined,
        status: "pending",
      });
    });
    setRows(queue);
    return queue;
  };

  const processOne = async (row: Row, updateRow: (patch: Partial<Row>) => void) => {
    try {
      updateRow({ status: "processing", step: "researching with AI" });
      const brief = {
        name: row.name,
        city: row.city || undefined,
        state: row.state || undefined,
        primaryKeyword: `${row.name} coaching${row.city ? ` in ${row.city}` : ""}`,
        secondaryKeywords: [],
        instituteType: (row.city ? "city" : instituteType) as "city" | "hybrid",
        mode: row.city ? "Offline" : "Hybrid",
      };
      const { data, error } = await supabase.functions.invoke("ai-coaching-institute-generate", { body: brief });
      if (error) throw new Error(error.message || "AI generation failed");
      if ((data as any)?.error) throw new Error((data as any).error);
      const basic = (data as any).basic || {};
      const sections = (data as any).sections || {};

      updateRow({ step: "saving institute" });

      let baseSlug = (basic.slug || slugify(basic.name || row.name)).slice(0, 80);
      // Avoid slug collision
      const { data: existing } = await supabase.from("institutes").select("id").eq("slug", baseSlug).maybeSingle();
      const finalSlug = existing?.id ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug;

      const { data: ins, error: insErr } = await supabase
        .from("institutes")
        .insert({
          name: basic.name || row.name,
          slug: finalSlug,
          institute_type: brief.instituteType,
          city: basic.city || row.city || null,
          state: basic.state || row.state || null,
          description: basic.description || null,
          website: basic.website || null,
          phone: basic.phone || null,
          email: basic.email || null,
          meta_title: basic.meta_title || null,
          meta_description: basic.meta_description || null,
          rating: basic.rating || 0,
          students_count: basic.students_count || 0,
          success_rate: basic.success_rate || 0,
          sections,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);

      updateRow({ status: "succeeded", step: "done", instituteId: ins.id, slug: finalSlug, error: undefined });
    } catch (e: any) {
      updateRow({ status: "failed", step: "error", error: e?.message || String(e) });
    }
  };

  const runQueue = async (queue: Row[]) => {
    setRunning(true);
    cancelRef.current = false;
    pauseRef.current = false;

    const indices = queue.map((r, i) => ({ r, i })).filter(x => x.r.status === "pending").map(x => x.i);
    let cursor = 0;

    const updateRowAt = (i: number, patch: Partial<Row>) => {
      setRows(prev => {
        const next = [...prev];
        next[i] = { ...next[i], ...patch };
        return next;
      });
      // also mutate the working copy so workers see latest
      queue[i] = { ...queue[i], ...patch };
    };

    const worker = async () => {
      while (true) {
        if (cancelRef.current) return;
        while (pauseRef.current) {
          await new Promise(r => setTimeout(r, 500));
          if (cancelRef.current) return;
        }
        const myIdx = indices[cursor++];
        if (myIdx === undefined) return;
        await processOne(queue[myIdx], (patch) => updateRowAt(myIdx, patch));
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, indices.length) }, worker);
    await Promise.all(workers);
    setRunning(false);
  };

  const start = async () => {
    const q = buildQueue();
    if (!q || !q.length) {
      toast({ title: "Add at least one institute name", variant: "destructive" });
      return;
    }
    toast({ title: "Bulk generation started", description: `Generating ${q.length} institutes…` });
    await runQueue(q);
    toast({ title: "Bulk generation finished" });
  };

  const retryFailed = async () => {
    const failedIdx = rows.map((r, i) => ({ r, i })).filter(x => x.r.status === "failed").map(x => x.i);
    if (!failedIdx.length) {
      toast({ title: "Nothing to retry" });
      return;
    }
    const queue = [...rows];
    failedIdx.forEach(i => { queue[i] = { ...queue[i], status: "pending", error: undefined, step: undefined }; });
    setRows(queue);
    await runQueue(queue);
  };

  const clearAll = () => {
    if (running) return;
    if (!confirm("Clear the bulk queue? (Generated institutes stay in the database.)")) return;
    setRows([]);
    setInput("");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/coaching-institutes")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Coaching Institutes
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold flex items-center gap-2 justify-end">
            <Sparkles className="h-6 w-6 text-primary" /> Bulk Generate Coaching Institutes (AI)
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste one coaching name per line. AI researches and fills the entire profile.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
          <CardDescription>
            One per line. Optional location after a comma or pipe.
            Examples: <code className="font-mono text-xs">IMS Learning Resources</code> or
            {" "}<code className="font-mono text-xs">Career Launcher | Delhi | Delhi</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={running}
            placeholder={`IMS Learning Resources\nCareer Launcher | Delhi | Delhi\nTIME Hyderabad, Hyderabad\nByju's Classes`}
            className="font-mono text-sm min-h-[180px]"
          />
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Default City (optional)</Label>
              <Input value={defaultCity} onChange={(e) => setDefaultCity(e.target.value)} placeholder="e.g. Mumbai" disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Default State (optional)</Label>
              <Input value={defaultState} onChange={(e) => setDefaultState(e.target.value)} placeholder="e.g. Maharashtra" disabled={running} />
            </div>
            <div>
              <Label className="text-xs">Default Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(["hybrid", "city"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    disabled={running}
                    onClick={() => setInstituteType(t)}
                    className={`border rounded-md p-2 text-xs font-medium capitalize ${instituteType === t ? "border-primary bg-primary/5 text-primary" : ""}`}
                  >
                    {t === "hybrid" ? "Hybrid" : "City-wise"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {parsedPreview.length} institute{parsedPreview.length === 1 ? "" : "s"} parsed from input.
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={running || (!rows.length && !input)}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
              {!running ? (
                <Button onClick={start} disabled={!parsedPreview.length}>
                  <Sparkles className="h-4 w-4 mr-1" /> Start Bulk Generation
                </Button>
              ) : (
                <>
                  {!pauseRef.current ? (
                    <Button variant="outline" onClick={() => { pauseRef.current = true; toast({ title: "Pausing after current rows…" }); }}>
                      <Pause className="h-4 w-4 mr-1" /> Pause
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => { pauseRef.current = false; }}>
                      <Play className="h-4 w-4 mr-1" /> Resume
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => { cancelRef.current = true; }}>
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {running ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
                  {running ? "Generating…" : "Queue"}
                </CardTitle>
                <CardDescription>
                  {metrics.completed} / {metrics.total} processed · ✓ {metrics.succeeded} · ✕ {metrics.failed}
                  {metrics.processing > 0 && <> · ⟳ {metrics.processing} active</>}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {metrics.failed > 0 && !running && (
                  <Button variant="outline" size="sm" onClick={retryFailed}>
                    <RotateCw className="h-4 w-4 mr-1" /> Retry {metrics.failed} failed
                  </Button>
                )}
              </div>
            </div>
            <Progress value={metrics.pct} className="h-2 mt-3" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                      {r.step && <> · {r.step}</>}
                      {r.error && <span className="text-destructive"> · {r.error}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={statusBadge(r.status)}>
                    {r.status === "processing" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    {r.status === "succeeded" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {r.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                    {r.status}
                  </Badge>
                  {r.instituteId && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={`/admin/coaching-institutes/${r.instituteId}`} target="_blank" rel="noreferrer">
                        Edit <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBulkCreateCoachingInstitutes;
