import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Download, Loader2, CheckCircle2, XCircle, Clock, PlayCircle,
  Sparkles, RotateCcw, Trash2, FileSpreadsheet, ExternalLink,
} from "lucide-react";
import { EXAM_BATCHES } from "@/lib/examSections";

interface Row {
  exam_name: string;
  exam_category: string;
  exam_year: string;
  official_website: string;
  sort_order: string;
}

interface Job {
  id: string;
  exam_name: string;
  exam_year: number | null;
  exam_category: string | null;
  official_website: string | null;
  status: string;
  step: string | null;
  steps_done: number;
  steps_total: number;
  error: string | null;
  tokens_used: number;
  published_slug: string | null;
  batch_id: string | null;
  batch_label: string | null;
  created_at: string;
  log: any;
}

const TEMPLATE = `Exam Name,Category,Exam Year,Official Exam Link
CAT,MBA Entrance,2026,https://iimcat.ac.in
XAT,MBA Entrance,2026,https://xatonline.in
NMAT,MBA Entrance,2026,https://www.nmat.org.in
`;

const STATUS_META: Record<string, { icon: JSX.Element; className: string; label: string }> = {
  queued: { icon: <Clock className="w-3.5 h-3.5" />, className: "bg-muted text-muted-foreground", label: "Waiting" },
  running: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, className: "bg-primary/10 text-primary", label: "Generating" },
  completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-emerald-500/10 text-emerald-600", label: "Generated" },
  published: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-emerald-500/10 text-emerald-600", label: "Published" },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, className: "bg-destructive/10 text-destructive", label: "Failed" },
};

/** Minimal RFC4180-ish CSV parser (handles quoted cells and commas inside them). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(cell); cell = ""; continue; }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const AdminBulkExams = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [queueing, setQueueing] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const fetchJobs = useCallback(async (id?: string | null) => {
    const target = id ?? batchId;
    if (!target) return;
    const { data } = await supabase
      .from("exam_generation_jobs")
      .select("*")
      .eq("batch_id", target)
      .order("created_at", { ascending: true });
    if (data) setJobs(data as unknown as Job[]);
  }, [batchId]);

  // Resume the most recent bulk batch on load so progress survives a reload.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("exam_generation_jobs")
        .select("batch_id, batch_label")
        .not("batch_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      const last = data?.[0] as any;
      if (last?.batch_id) {
        setBatchId(last.batch_id);
        setFileName(last.batch_label || "");
        fetchJobs(last.batch_id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inFlight = jobs.some((j) => ["queued", "running"].includes(j.status));

  useEffect(() => {
    if (!batchId) return;
    if (!inFlight) {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(() => fetchJobs(), 4000);
    return () => {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [batchId, inFlight, fetchJobs]);

/** Fans the queue out across parallel workers so many exams generate at once. */
const PARALLEL_WORKERS = 12;
const kickWorker = () =>
  supabase.functions
    .invoke("exam-generation-worker", { body: { concurrency: PARALLEL_WORKERS } })
    .catch(() => {});


  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-exam-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast({ title: "Empty CSV", description: "Add at least one exam row below the header.", variant: "destructive" });
      return;
    }
    const header = parsed[0].map((h) => h.trim().toLowerCase());
    const idx = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
    const iName = idx("exam name", "name");
    const iCat = idx("category");
    const iYear = idx("year");
    const iLink = idx("link", "website", "url");
    if (iName === -1) {
      toast({ title: "Missing 'Exam Name' column", variant: "destructive" });
      return;
    }
    const out: Row[] = [];
    for (const r of parsed.slice(1)) {
      const name = (r[iName] ?? "").trim();
      if (!name) continue;
      out.push({
        exam_name: name,
        exam_category: iCat > -1 ? (r[iCat] ?? "").trim() : "",
        exam_year: iYear > -1 ? (r[iYear] ?? "").trim() : "",
        official_website: iLink > -1 ? (r[iLink] ?? "").trim() : "",
      });
    }
    if (!out.length) {
      toast({ title: "No valid rows found", variant: "destructive" });
      return;
    }
    setRows(out);
    setFileName(file.name);
    toast({ title: `${out.length} exams parsed`, description: "Review the list, then start bulk generation." });
  };

  const startBatch = async () => {
    if (!rows.length) return;
    setQueueing(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const newBatch = crypto.randomUUID();
      const payload = rows.map((r, i) => ({
        exam_name: r.exam_name,
        exam_year: r.exam_year && !Number.isNaN(Number(r.exam_year)) ? Number(r.exam_year) : null,
        exam_category: r.exam_category || null,
        official_website: r.official_website || null,
        sort_order: i + 1,
        batch_id: newBatch,
        batch_label: fileName || "Bulk upload",
        auto_publish: true,
        created_by: auth?.user?.id ?? null,
        steps_total: EXAM_BATCHES.length,
      }));
      const { error } = await supabase.from("exam_generation_jobs").insert(payload as any);
      if (error) throw error;
      setBatchId(newBatch);
      setRows([]);
      if (fileRef.current) fileRef.current.value = "";
      await fetchJobs(newBatch);
      kickWorker();
      toast({ title: "Bulk generation started", description: `${payload.length} exams queued — runs in the background.` });
    } catch (e: any) {
      toast({ title: "Could not start", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setQueueing(false);
    }
  };

  const retry = async (job: Job) => {
    await supabase.from("exam_generation_jobs")
      .update({ status: "queued", attempts: 0, error: null, worker_lock_until: null })
      .eq("id", job.id);
    await fetchJobs();
    kickWorker();
  };

  const remove = async (job: Job) => {
    if (!confirm(`Remove ${job.exam_name} from this batch?`)) return;
    await supabase.from("exam_generation_jobs").delete().eq("id", job.id);
    fetchJobs();
  };

  const stats = useMemo(() => {
    const total = jobs.length;
    const ok = jobs.filter((j) => ["completed", "published"].includes(j.status)).length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const done = ok + failed;
    const runningJobs = jobs.filter((j) => j.status === "running");
    const running = runningJobs[0] || null;

    const tokens = jobs.reduce((s, j) => s + (j.tokens_used || 0), 0);
    // Partial credit for the exam currently mid-flight, so the bar always moves.
    const fractional = jobs.reduce((s, j) => {
      if (["completed", "published", "failed"].includes(j.status)) return s + 1;
      if (j.status === "running") return s + (j.steps_done || 0) / (j.steps_total || 4);
      return s;
    }, 0);
    return {
      total, ok, failed, done,
      remaining: total - done,
      pct: total ? Math.round((fractional / total) * 100) : 0,
      running, runningJobs, tokens,
    };
  }, [jobs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Bulk Exam Module Creator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV of exams — every row is researched from official sources, generated module by module and published automatically, one exam after another.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" /> Step 1 — Upload CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" /> Download template
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" /> Choose CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            {fileName && <Badge variant="secondary" className="text-xs">{fileName}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            Columns: <span className="font-mono">Exam Name, Category, Exam Year, Official Exam Link</span>
          </p>

          {rows.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Official Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.exam_name}-${i}`}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.exam_name}</TableCell>
                        <TableCell className="text-sm">{r.exam_category || "—"}</TableCell>
                        <TableCell className="text-sm">{r.exam_year || "—"}</TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-[240px]">{r.official_website || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-3 border-t border-border flex flex-wrap items-center gap-2">
                <Button onClick={startBatch} disabled={queueing} className="gap-2">
                  {queueing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Start bulk generation ({rows.length})
                </Button>
                <Button variant="ghost" onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = ""; }}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                {inFlight
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                Step 2 — Generation progress
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { kickWorker(); toast({ title: "Worker woken up" }); }}>
                  <PlayCircle className="w-3.5 h-3.5" /> Resume batch
                </Button>
                <Button size="sm" variant="ghost" onClick={() => fetchJobs()}>Refresh</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total uploaded", value: stats.total, cls: "text-foreground" },
                { label: "Completed", value: stats.ok, cls: "text-emerald-600" },
                { label: "Failed", value: stats.failed, cls: stats.failed ? "text-destructive" : "text-muted-foreground" },
                { label: "Remaining", value: stats.remaining, cls: "text-primary" },
                { label: "Progress", value: `${stats.pct}%`, cls: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div>
              <Progress value={stats.pct} className="h-2.5" />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
                <span>
                  {stats.runningJobs.length
                    ? <>Generating in parallel ({stats.runningJobs.length} of up to {PARALLEL_WORKERS} workers): <span className="font-semibold text-foreground">{stats.runningJobs.map((j) => j.exam_name).join(", ")}</span></>
                    : inFlight ? `Starting ${PARALLEL_WORKERS} parallel workers…` : "Batch finished."}
                </span>
                <span>{stats.done} of {stats.total} exams{stats.tokens ? ` · ${stats.tokens.toLocaleString()} tokens` : ""}</span>

              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Modules</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job, i) => {
                    const meta = STATUS_META[job.status] ?? STATUS_META.queued;
                    const pct = Math.round(((job.steps_done || 0) / (job.steps_total || 4)) * 100);
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{job.exam_name}{job.exam_year ? ` ${job.exam_year}` : ""}</div>
                          <div className="text-[11px] text-muted-foreground">{job.exam_category || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                            {meta.icon}{meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <Progress value={pct} className="h-1.5" />
                          <span className="text-[11px] text-muted-foreground">{job.steps_done}/{job.steps_total}</span>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          {job.error
                            ? <span className="text-xs text-destructive">{job.error}</span>
                            : <span className="text-xs text-muted-foreground">{job.step || "—"}</span>}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {job.published_slug && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={`/exam/${job.published_slug}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          )}
                          {job.status === "failed" && (
                            <Button size="sm" variant="ghost" onClick={() => retry(job)}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => remove(job)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBulkExams;
