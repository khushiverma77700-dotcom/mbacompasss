import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EXAMS } from "@/data/personalizedExams";
import { Sparkles, Loader2, Play, X, RotateCw, Clock, DollarSign } from "lucide-react";

const DIFFS = ["easy", "moderate", "difficult"] as const;
const COST_PER_QUESTION = 0.004; // USD, gpt-4o approx
const SECS_PER_QUESTION = 4;     // rough server throughput estimate

type Row = {
  exam_code: string;
  section: string;
  difficulty: string;
  existing_count: number;
  qty: number;
};

type ItemRow = {
  id: string;
  exam_code: string;
  section: string;
  difficulty: string;
  requested_count: number;
  generated_count: number;
  failed_count: number;
  status: string;
  current_step: string | null;
  last_error: string | null;
  attempts: number;
  updated_at: string;
};

type JobRow = {
  id: string;
  status: string;
  total_requested: number;
  total_generated: number;
  total_failed: number;
  created_at: string;
  finished_at: string | null;
};

export default function PersonalizedBulkQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<JobRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [resuming, setResuming] = useState(false);

  // Build the matrix + load existing counts (paginated — PostgREST caps at 1000/row)
  const loadMatrix = async () => {
    setLoading(true);
    const PAGE = 1000;
    const map: Record<string, number> = {};
    let from = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from("personalized_questions")
        .select("exam_code, section, difficulty")
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const r of data) {
        const k = `${r.exam_code}|${r.section}|${r.difficulty}`;
        map[k] = (map[k] ?? 0) + 1;
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const built: Row[] = [];
    for (const e of EXAMS) {
      for (const s of e.sections) {
        for (const d of DIFFS) {
          built.push({
            exam_code: e.code,
            section: s,
            difficulty: d,
            existing_count: map[`${e.code}|${s}|${d}`] ?? 0,
            qty: 0,
          });
        }
      }
    }
    // preserve any qty the admin already typed
    setRows((prev) => {
      const qmap = new Map(prev.map((r) => [`${r.exam_code}|${r.section}|${r.difficulty}`, r.qty]));
      return built.map((r) => ({ ...r, qty: qmap.get(`${r.exam_code}|${r.section}|${r.difficulty}`) ?? 0 }));
    });
    setLoading(false);
  };

  // Load most recent active or last job + its items
  const loadActiveJob = async () => {
    const { data: jobs } = await supabase
      .from("personalized_bulk_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    const job = (jobs?.[0] as JobRow | undefined) ?? null;
    setActiveJob(job);
    if (job) {
      const { data: its } = await supabase
        .from("personalized_bulk_items")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: true });
      setItems((its as ItemRow[]) ?? []);
    } else {
      setItems([]);
    }
  };

  useEffect(() => {
    loadMatrix();
    loadActiveJob();
  }, []);

  // Poll while a job is running
  useEffect(() => {
    if (!activeJob || activeJob.status !== "running") return;
    const t = setInterval(() => {
      loadActiveJob();
      loadMatrix();
    }, 3000);
    return () => clearInterval(t);
  }, [activeJob?.id, activeJob?.status]);

  const totalRequested = useMemo(() => rows.reduce((s, r) => s + (r.qty || 0), 0), [rows]);
  const totalCost = totalRequested * COST_PER_QUESTION;
  const totalEtaMin = Math.ceil((totalRequested * SECS_PER_QUESTION) / 60);

  const updateQty = (idx: number, qty: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, qty: Math.max(0, qty) } : r));
  };

  const fillAll = (n: number) => {
    setRows((prev) => prev.map((r) => ({ ...r, qty: n })));
  };

  const submit = async () => {
    const items = rows
      .filter((r) => r.qty > 0)
      .map((r) => ({
        exam_code: r.exam_code,
        section: r.section,
        difficulty: r.difficulty,
        existing_count: r.existing_count,
        requested_count: r.qty,
      }));
    if (!items.length) return toast.error("Add a quantity to at least one row");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("personalized-bulk-worker", {
        body: { action: "create", items },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Queued ${(data as any).total_requested} questions across ${(data as any).total_items} buckets`);
      fillAll(0);
      loadActiveJob();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to queue");
    } finally {
      setSubmitting(false);
    }
  };

  const resume = async () => {
    if (!activeJob) return;
    setResuming(true);
    try {
      await supabase.functions.invoke("personalized-bulk-worker", {
        body: { action: "resume", job_id: activeJob.id },
      });
      toast.success("Worker kicked");
      loadActiveJob();
    } finally {
      setResuming(false);
    }
  };

  const cancel = async () => {
    if (!activeJob || !confirm("Cancel remaining items in this job?")) return;
    await supabase.functions.invoke("personalized-bulk-worker", {
      body: { action: "cancel", job_id: activeJob.id },
    });
    loadActiveJob();
  };

  const jobPct = activeJob && activeJob.total_requested > 0
    ? Math.round((activeJob.total_generated / activeJob.total_requested) * 100)
    : 0;
  const jobPending = activeJob ? activeJob.total_requested - activeJob.total_generated : 0;
  const jobCostSoFar = (activeJob?.total_generated ?? 0) * COST_PER_QUESTION;
  const jobCostTotal = (activeJob?.total_requested ?? 0) * COST_PER_QUESTION;
  const jobEtaMin = jobPending > 0 ? Math.ceil((jobPending * SECS_PER_QUESTION) / 60) : 0;

  return (
    <div className="space-y-5">
      {/* Active job progress — always visible while running */}
      {activeJob && (
        <Card className={activeJob.status === "running" ? "border-sky-300 bg-sky-50/40" : "border-emerald-200 bg-emerald-50/30"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {activeJob.status === "running"
                  ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                  : <Sparkles className="h-4 w-4 text-emerald-600" />}
                <span>{activeJob.status === "running" ? "Generation in progress" : "Last batch complete"}</span>
                <Badge variant="outline" className="text-xs">{activeJob.status}</Badge>
              </div>
              <div className="flex gap-2">
                {activeJob.status === "running" && (
                  <>
                    <Button size="sm" variant="outline" onClick={resume} disabled={resuming}>
                      <RotateCw className={`h-3 w-3 mr-1 ${resuming ? "animate-spin" : ""}`} />Kick
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancel}>
                      <X className="h-3 w-3 mr-1" />Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={jobPct} className="h-3" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
              <Pill label="Done" value={`${activeJob.total_generated}`} tone="ok" />
              <Pill label="Pending" value={`${jobPending}`} />
              <Pill label="Failed (will retry)" value={`${activeJob.total_failed}`} tone={activeJob.total_failed ? "bad" : undefined} />
              <Pill label="Cost" value={`$${jobCostSoFar.toFixed(2)} / $${jobCostTotal.toFixed(2)}`} icon={<DollarSign className="h-3 w-3" />} />
              <Pill label="ETA" value={jobEtaMin > 0 ? `~${jobEtaMin} min` : "—"} icon={<Clock className="h-3 w-3" />} />
            </div>

            <div className="text-xs text-muted-foreground">
              {jobPct}% complete · Background worker runs every minute and auto-retries stuck items after 1–2 min, even if you close this tab.
            </div>

            <div className="border rounded max-h-72 overflow-y-auto bg-white">
              <table className="w-full text-xs">
                <thead className="bg-sky-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Exam</th>
                    <th className="p-2 text-left">Section</th>
                    <th className="p-2 text-left">Diff</th>
                    <th className="p-2 text-right">Progress</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const pct = it.requested_count ? Math.round((it.generated_count / it.requested_count) * 100) : 0;
                    return (
                      <tr key={it.id} className="border-b">
                        <td className="p-2 font-medium">{it.exam_code}</td>
                        <td className="p-2">{it.section}</td>
                        <td className="p-2 capitalize">{it.difficulty}</td>
                        <td className="p-2 text-right">
                          <span className="font-mono">{it.generated_count}/{it.requested_count}</span>
                          <span className="text-muted-foreground ml-2">{pct}%</span>
                        </td>
                        <td className="p-2">
                          <span className={
                            it.status === "completed" ? "text-emerald-600" :
                            it.status === "processing" ? "text-sky-600" :
                            it.status === "failed" ? "text-rose-600" : "text-amber-600"
                          }>
                            {it.status}
                          </span>
                          {it.current_step && <span className="text-muted-foreground ml-1">· {it.current_step}</span>}
                          {it.last_error && <div className="text-rose-600 text-xs truncate max-w-xs" title={it.last_error}>err: {it.last_error}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Composer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-sky-600" />Bulk Queue — Generate any amount in the background</span>
            <div className="flex gap-2 text-xs">
              <Button size="sm" variant="outline" onClick={() => fillAll(10)}>Fill all 10</Button>
              <Button size="sm" variant="outline" onClick={() => fillAll(25)}>Fill all 25</Button>
              <Button size="sm" variant="ghost" onClick={() => fillAll(0)}>Clear</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <Pill label="To Generate" value={totalRequested.toString()} tone="ok" />
            <Pill label="Buckets" value={rows.filter((r) => r.qty > 0).length.toString()} />
            <Pill label="Est. Cost" value={`$${totalCost.toFixed(2)}`} icon={<DollarSign className="h-3 w-3" />} />
            <Pill label="Est. Time" value={totalEtaMin > 0 ? `~${totalEtaMin} min` : "—"} icon={<Clock className="h-3 w-3" />} />
          </div>

          <div className="border rounded max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-sky-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Exam</th>
                    <th className="p-2 text-left">Section</th>
                    <th className="p-2 text-left">Difficulty</th>
                    <th className="p-2 text-right">Existing</th>
                    <th className="p-2 text-right w-32">Quantity to Add</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.exam_code}|${r.section}|${r.difficulty}`} className="border-b hover:bg-sky-50/40">
                      <td className="p-2 font-medium">{r.exam_code}</td>
                      <td className="p-2">{r.section}</td>
                      <td className="p-2 capitalize">{r.difficulty}</td>
                      <td className={`p-2 text-right font-semibold ${r.existing_count < 10 ? "text-amber-700" : "text-emerald-700"}`}>
                        {r.existing_count}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          value={r.qty || ""}
                          onChange={(e) => updateQty(i, parseInt(e.target.value) || 0)}
                          className="h-8 text-right"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Button
            onClick={submit}
            disabled={submitting || totalRequested === 0}
            className="bg-sky-600 hover:bg-sky-700 w-full sm:w-auto"
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Queue {totalRequested} Questions
          </Button>
          <p className="text-xs text-muted-foreground">
            Jobs run in the background. You can close this tab — a cron worker resumes any stuck items automatically every minute.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Pill({ label, value, tone, icon }: { label: string; value: string; tone?: "ok" | "bad"; icon?: React.ReactNode }) {
  const color = tone === "ok" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-sky-700";
  return (
    <div className="px-3 py-2 rounded-lg border border-sky-100 bg-white">
      <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}
