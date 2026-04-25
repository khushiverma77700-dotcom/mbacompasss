import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Upload, Sparkles, FileSpreadsheet, Download, AlertCircle,
  CheckCircle2, XCircle, Loader2, Copy, ExternalLink, Pause, Ban, RotateCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CsvRow {
  name: string;
  city: string;
  state: string;
  primaryKeyword: string;
  type?: string;
  tier?: string;
  category?: string;
  slug?: string;
}

interface RowState {
  index: number;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: "pending" | "processing" | "duplicate" | "succeeded" | "failed";
  step?: string;
  collegeId?: string;
  finalSlug?: string;
  error?: string;
}

interface JobState {
  id: string;
  status: string;
  total_rows: number;
  duplicates_skipped: number;
  completed: number;
  succeeded: number;
  failed: number;
  rows: RowState[];
  current_activity: string | null;
  started_at: string | null;
  finished_at: string | null;
}

const REQUIRED = ["name", "city", "state", "primaryKeyword"];
const OPTIONAL = ["type", "tier", "category", "slug"];

const SAMPLE_CSV = `name,city,state,primaryKeyword,type,tier,category,slug
IIM Bangalore,Bangalore,Karnataka,IIM Bangalore admission 2026,IIM,Tier 1,IIM,
XLRI Jamshedpur,Jamshedpur,Jharkhand,XLRI Jamshedpur PGDM,Private,Tier 1,Non-IIM,
SPJIMR Mumbai,Mumbai,Maharashtra,SPJIMR Mumbai PGDM admission,Private,Tier 1,Non-IIM,
`;

function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must have a header row and at least one data row"] };
  }
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur); cur = "";
      } else { cur += ch; }
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const header = splitLine(lines[0]).map(h => h.trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => { idx[h] = i; });

  const missing = REQUIRED.filter(r => !(r in idx));
  if (missing.length) errors.push(`Missing required columns: ${missing.join(", ")}`);

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const get = (k: string) => (idx[k] !== undefined ? (cols[idx[k]] || "").trim() : "");
    const r: CsvRow = {
      name: get("name"),
      city: get("city"),
      state: get("state"),
      primaryKeyword: get("primaryKeyword"),
      type: get("type") || undefined,
      tier: get("tier") || undefined,
      category: get("category") || undefined,
      slug: get("slug") || undefined,
    };
    if (!r.name) { errors.push(`Row ${i + 1}: missing name`); continue; }
    if (!r.city) { errors.push(`Row ${i + 1}: missing city (${r.name})`); continue; }
    if (!r.state) { errors.push(`Row ${i + 1}: missing state (${r.name})`); continue; }
    if (!r.primaryKeyword) { errors.push(`Row ${i + 1}: missing primaryKeyword (${r.name})`); continue; }
    rows.push(r);
  }
  return { rows, errors };
}

const statusBadge = (s: RowState["status"]) => {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground border-border",
    processing: "bg-blue-100 text-blue-800 border-blue-300",
    duplicate: "bg-amber-100 text-amber-800 border-amber-300",
    succeeded: "bg-emerald-100 text-emerald-800 border-emerald-300",
    failed: "bg-red-100 text-red-800 border-red-300",
    cancelled: "bg-orange-100 text-orange-800 border-orange-300",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    running: "bg-blue-100 text-blue-800 border-blue-300",
  };
  return map[s] || map.pending;
};

const AdminBulkCreateColleges = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [parsed, setParsed] = useState<CsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [csvName, setCsvName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobState[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  // Load most recent job on mount so refresh / tab-switch resumes view
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bulk_college_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (data && data.length) {
        setRecentJobs(data as any);
        const active = data.find((j: any) => j.status === "running" || j.status === "pending");
        if (active) setJob(active as any);
      }
    })();
  }, []);

  // Poll active job
  useEffect(() => {
    if (!job || (job.status !== "running" && job.status !== "pending")) {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const { data } = await supabase
        .from("bulk_college_jobs").select("*").eq("id", job.id).maybeSingle();
      if (data) setJob(data as any);
    }, 2000);
    return () => {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [job?.id, job?.status]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvName(f.name);
    const text = await f.text();
    const { rows, errors } = parseCsv(text);
    setParsed(rows);
    setParseErrors(errors);
    if (errors.length) {
      toast({ title: "CSV had issues", description: errors.slice(0, 3).join(" • "), variant: "destructive" });
    } else {
      toast({ title: "CSV parsed", description: `${rows.length} valid rows ready to upload` });
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "colleges-bulk-sample.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const startJob = async () => {
    if (!parsed.length) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-college-create", {
        body: { action: "create", rows: parsed },
      });
      if (error) throw error;
      toast({
        title: "Job started",
        description: `Generating ${parsed.length - (data?.duplicates || 0)} colleges in background. ${data?.duplicates || 0} duplicates will be skipped.`,
      });
      // Fetch the just-created job
      const { data: jobRow } = await supabase
        .from("bulk_college_jobs").select("*").eq("id", data.job_id).maybeSingle();
      if (jobRow) setJob(jobRow as any);
      setParsed([]); setCsvName(""); if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast({ title: "Failed to start job", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = job ? Math.round((job.completed / Math.max(job.total_rows, 1)) * 100) : 0;
  const isActive = job?.status === "running" || job?.status === "pending";

  const cancelJob = async (jobId: string) => {
    if (!confirm("Cancel this job? Rows already processed will keep their results.")) return;
    const { error } = await supabase
      .from("bulk_college_jobs")
      .update({ status: "cancelled", current_activity: "Cancelling…" })
      .eq("id", jobId);
    if (error) {
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cancelling…", description: "Worker will stop after the current row." });
  };

  const restartJob = async (jobId: string) => {
    if (!confirm("Restart this job? All pending/failed/cancelled rows will be re-queued.")) return;
    const { data: j, error: fetchErr } = await supabase
      .from("bulk_college_jobs").select("rows").eq("id", jobId).maybeSingle();
    if (fetchErr || !j) {
      toast({ title: "Restart failed", description: fetchErr?.message || "Job not found", variant: "destructive" });
      return;
    }
    const resetRows = ((j.rows as unknown) as RowState[]).map(r =>
      r.status === "succeeded" || r.status === "duplicate"
        ? r
        : { ...r, status: "pending" as const, step: undefined, error: undefined }
    );
    await supabase.from("bulk_college_jobs").update({
      rows: resetRows as any,
      status: "pending",
      current_activity: "Restarting…",
      finished_at: null,
    }).eq("id", jobId);

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("bulk-college-create", {
      body: { action: "resume", job_id: jobId },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      toast({ title: "Restart failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Job restarted", description: "Pending rows are being processed again." });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/colleges")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Colleges
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold flex items-center gap-2 justify-end">
            <Sparkles className="h-6 w-6 text-primary" /> Bulk Create Colleges (AI)
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV — the AI generates each college automatically, in the background.
          </p>
        </div>
      </div>

      {/* CSV format guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> CSV Format
          </CardTitle>
          <CardDescription>
            Required columns must be present in the header row. AI will research and fill everything else
            (description, fees, placements, recruiters, SEO, FAQs, etc.) — same as the manual generator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Required columns
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED.map(r => (
                  <Badge key={r} className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/15">
                    {r}
                  </Badge>
                ))}
              </div>
              <ul className="text-xs text-muted-foreground mt-3 space-y-1">
                <li><code className="font-mono">name</code> — Full college name (e.g. "IIM Bangalore")</li>
                <li><code className="font-mono">city</code> — City (e.g. "Bangalore")</li>
                <li><code className="font-mono">state</code> — State (e.g. "Karnataka")</li>
                <li><code className="font-mono">primaryKeyword</code> — Main SEO keyword</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Optional columns
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {OPTIONAL.map(r => (
                  <Badge key={r} variant="outline" className="border-border">{r}</Badge>
                ))}
              </div>
              <ul className="text-xs text-muted-foreground mt-3 space-y-1">
                <li><code className="font-mono">type</code> — IIM / Private / Government / Deemed / Autonomous / University</li>
                <li><code className="font-mono">tier</code> — Tier 1 / Tier 2 / Tier 3 / Tier 4</li>
                <li><code className="font-mono">category</code> — IIM / Non-IIM</li>
                <li><code className="font-mono">slug</code> — URL slug (auto-generated from name if blank)</li>
              </ul>
            </div>
          </div>

          <div className="bg-muted/50 rounded p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Sample CSV</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                  navigator.clipboard.writeText(SAMPLE_CSV);
                  toast({ title: "Sample copied to clipboard" });
                }}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={downloadSample}>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              </div>
            </div>
            <pre className="font-mono text-[11px] overflow-x-auto whitespace-pre">{SAMPLE_CSV}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      {!isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload your CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
              <Button onClick={() => fileRef.current?.click()} variant="outline">
                <Upload className="h-4 w-4 mr-2" /> Choose CSV file
              </Button>
              {csvName && (
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> {csvName}
                  <Badge variant="secondary" className="ml-1">{parsed.length} rows</Badge>
                </span>
              )}
            </div>

            {parseErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-destructive font-semibold">
                  <AlertCircle className="h-3.5 w-3.5" /> {parseErrors.length} issue(s) in CSV
                </div>
                {parseErrors.slice(0, 8).map((e, i) => (
                  <div key={i} className="text-destructive/90">• {e}</div>
                ))}
                {parseErrors.length > 8 && (
                  <div className="text-destructive/70">…and {parseErrors.length - 8} more</div>
                )}
              </div>
            )}

            {parsed.length > 0 && (
              <>
                <div className="border rounded overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-semibold">#</th>
                          <th className="text-left p-2 font-semibold">Name</th>
                          <th className="text-left p-2 font-semibold">City</th>
                          <th className="text-left p-2 font-semibold">State</th>
                          <th className="text-left p-2 font-semibold">Primary Keyword</th>
                          <th className="text-left p-2 font-semibold">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.slice(0, 100).map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            <td className="p-2 font-medium">{r.name}</td>
                            <td className="p-2">{r.city}</td>
                            <td className="p-2">{r.state}</td>
                            <td className="p-2 text-muted-foreground truncate max-w-[200px]">{r.primaryKeyword}</td>
                            <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.type || "Private"}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsed.length > 100 && (
                    <div className="bg-muted/50 text-xs text-muted-foreground p-2 text-center">
                      Showing first 100 of {parsed.length} rows
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setParsed([]); setCsvName(""); if (fileRef.current) fileRef.current.value = ""; }}>
                    Clear
                  </Button>
                  <Button onClick={startJob} disabled={submitting || parsed.length === 0}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Start AI Generation ({parsed.length} colleges)
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live progress */}
      {job && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                {isActive
                  ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  : job.status === "completed"
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <Pause className="h-4 w-4 text-muted-foreground" />}
                Bulk Job — {job.status}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">{job.completed} / {job.total_rows}</span>
                <span className="text-emerald-600 font-medium">✓ {job.succeeded} done</span>
                {job.failed > 0 && <span className="text-destructive font-medium">✕ {job.failed} failed</span>}
                {job.duplicates_skipped > 0 && <span className="text-amber-600 font-medium">⊘ {job.duplicates_skipped} duplicate</span>}
                <span className="font-bold text-primary text-base">{progressPct}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              {isActive && (
                <Button size="sm" variant="destructive" onClick={() => cancelJob(job.id)}>
                  <Ban className="h-3.5 w-3.5 mr-1.5" /> Cancel
                </Button>
              )}
              {!isActive && (job.failed > 0 || job.completed < job.total_rows - job.duplicates_skipped) && (
                <Button size="sm" variant="outline" onClick={() => restartJob(job.id)}>
                  <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Restart pending/failed
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPct} className="h-3" />

            {job.current_activity && isActive && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="font-medium text-foreground">{job.current_activity}</span>
              </p>
            )}

            {!isActive && job.status === "completed" && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                ✓ All done. {job.succeeded} colleges created, {job.failed} failed, {job.duplicates_skipped} duplicates skipped.
              </div>
            )}

            <div className="text-[11px] text-muted-foreground">
              💡 You can switch tabs or close this page — the job runs in the background. Come back anytime to check progress.
            </div>

            {/* Per-row breakdown */}
            <div className="border rounded overflow-hidden bg-background">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-2 font-semibold w-10">#</th>
                      <th className="text-left p-2 font-semibold">College</th>
                      <th className="text-left p-2 font-semibold">Location</th>
                      <th className="text-left p-2 font-semibold">Status</th>
                      <th className="text-left p-2 font-semibold">Stage / Note</th>
                      <th className="text-left p-2 font-semibold w-16">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(job.rows || []).map((r) => (
                      <tr key={r.index} className="border-t hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{r.index + 1}</td>
                        <td className="p-2 font-medium">{r.name}</td>
                        <td className="p-2 text-muted-foreground">{r.city}, {r.state}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={`text-[10px] ${statusBadge(r.status)}`}>
                            {r.status === "processing" && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline" />}
                            {r.status === "succeeded" && <CheckCircle2 className="h-2.5 w-2.5 mr-1 inline" />}
                            {r.status === "failed" && <XCircle className="h-2.5 w-2.5 mr-1 inline" />}
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {r.error ? <span className="text-destructive">{r.error}</span> : (r.step || "—")}
                        </td>
                        <td className="p-2">
                          {r.status === "succeeded" && r.collegeId && (
                            <a
                              href={`/admin/colleges`}
                              className="text-primary hover:underline inline-flex items-center gap-1"
                              title="Open in Manage Colleges"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent jobs */}
      {recentJobs.length > 0 && !isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {recentJobs.map(j => (
                <button
                  key={j.id}
                  onClick={() => setJob(j)}
                  className="w-full text-left flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusBadge(j.status as any)}>{j.status}</Badge>
                    <span className="text-muted-foreground">
                      {new Date((j as any).created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{j.succeeded}/{j.total_rows}</span>
                    {j.failed > 0 && <span className="text-destructive">✕{j.failed}</span>}
                    {j.duplicates_skipped > 0 && <span className="text-amber-600">⊘{j.duplicates_skipped}</span>}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBulkCreateColleges;
