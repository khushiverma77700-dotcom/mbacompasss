import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Loader2, CheckCircle2, XCircle, Clock, PlayCircle,
  ChevronRight, Trash2, RotateCcw,
} from "lucide-react";
import ExamSectionsEditor from "@/components/admin/ExamSectionsEditor";
import { EXAM_BATCHES, parseSections, type ExamSections, type ExamSource } from "@/lib/examSections";

interface Job {
  id: string;
  exam_name: string;
  exam_year: number | null;
  official_website: string | null;
  exam_category: string | null;
  notes: string | null;
  exam_id: string | null;
  sort_order: number | null;
  mode: string;
  status: string;
  step: string | null;
  steps_done: number;
  steps_total: number;
  log: any[];
  result: any;
  sources: any;
  error: string | null;
  tokens_used: number;
  created_at: string;
}

const STATUS_META: Record<string, { icon: React.JSX.Element; className: string; label: string }> = {
  queued: { icon: <Clock className="w-3.5 h-3.5" />, className: "bg-muted text-muted-foreground", label: "Queued" },
  running: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, className: "bg-primary/10 text-primary", label: "Running" },
  completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-emerald-500/10 text-emerald-600", label: "Ready for review" },
  published: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-emerald-500/10 text-emerald-600", label: "Published" },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, className: "bg-destructive/10 text-destructive", label: "Failed" },
};

interface Props {
  /** Optional: pre-seed the dialog to enrich an existing exam. */
  onPublished?: () => void;
}

const ExamAIGenerator = ({ onPublished }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [creating, setCreating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [editorSections, setEditorSections] = useState<ExamSections | null>(null);
  const [form, setForm] = useState({
    exam_name: "", exam_year: String(new Date().getFullYear()),
    official_website: "", exam_category: "", notes: "", sort_order: "",
  });
  const pollRef = useRef<number | null>(null);

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from("exam_generation_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    if (data) setJobs(data as unknown as Job[]);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Live polling while any job is in flight (jobs run server-side, so closing
  // the browser never kills them — reopening simply resumes this view).
  useEffect(() => {
    const inFlight = jobs.some((j) => ["queued", "running"].includes(j.status));
    if (!inFlight) {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(fetchJobs, 4000);
    return () => {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [jobs, fetchJobs]);

  const kickWorker = async () => {
    await supabase.functions.invoke("exam-generation-worker", { body: {} }).catch(() => {});
  };

  const queueJob = async () => {
    if (!form.exam_name.trim()) {
      toast({ title: "Exam name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("exam_generation_jobs").insert({
        exam_name: form.exam_name.trim(),
        exam_year: form.exam_year ? Number(form.exam_year) : null,
        official_website: form.official_website.trim() || null,
        exam_category: form.exam_category.trim() || null,
        notes: form.notes.trim() || null,
        sort_order: form.sort_order ? Number(form.sort_order) : null,
        created_by: auth?.user?.id ?? null,
        steps_total: EXAM_BATCHES.length,
      });
      if (error) throw error;
      toast({ title: "Generation queued", description: "Runs in the background — you can close this tab." });
      setOpen(false);
      setForm({ exam_name: "", exam_year: String(new Date().getFullYear()), official_website: "", exam_category: "", notes: "", sort_order: "" });
      await fetchJobs();
      kickWorker();
    } catch (e: any) {
      toast({ title: "Could not queue", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setCreating(false);
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
    if (!confirm("Delete this generation job?")) return;
    await supabase.from("exam_generation_jobs").delete().eq("id", job.id);
    if (activeJobId === job.id) { setActiveJobId(null); setEditorSections(null); }
    fetchJobs();
  };

  const activeJob = jobs.find((j) => j.id === activeJobId) || null;

  const openReview = (job: Job) => {
    setActiveJobId(job.id);
    setEditorSections(parseSections(job.result?.sections));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Sparkles className="w-4 h-4" /> AI Create Exam
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => { kickWorker(); toast({ title: "Worker woken up" }); }}>
          <PlayCircle className="w-4 h-4" /> Resume pending jobs
        </Button>
        <span className="text-xs text-muted-foreground">
          Type only exam name + year — research, all page modules and SEO are generated from official sources.
        </span>
      </div>

      {jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">AI generation console</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {jobs.map((job) => {
              const meta = STATUS_META[job.status] ?? STATUS_META.queued;
              const pct = Math.round(((job.steps_done || 0) / (job.steps_total || 4)) * 100);
              const lastLogs = (Array.isArray(job.log) ? job.log : []).slice(-4);
              return (
                <div key={job.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                      {meta.icon}{meta.label}
                    </span>
                    <span className="font-semibold text-sm text-foreground">
                      {job.exam_name}{job.exam_year ? ` ${job.exam_year}` : ""}
                    </span>
                    <Badge variant="secondary" className="text-xs">{job.steps_done}/{job.steps_total} groups</Badge>
                    {job.tokens_used > 0 && <Badge variant="outline" className="text-xs">{job.tokens_used.toLocaleString()} tokens</Badge>}
                    <div className="ml-auto flex items-center gap-1">
                      {job.status === "completed" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openReview(job)}>
                          Review & publish <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {job.status === "failed" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => retry(job)}>
                          <RotateCcw className="w-3.5 h-3.5" /> Retry
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(job)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5 mt-2" />
                  {job.step && <p className="text-xs text-muted-foreground mt-2">{job.step}</p>}
                  {job.error && <p className="text-xs text-destructive mt-1">{job.error}</p>}
                  {lastLogs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {lastLogs.map((entry: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="font-mono shrink-0">
                            {new Date(entry.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <span className={entry.level === "error" ? "text-destructive" : entry.level === "success" ? "text-emerald-600" : ""}>
                            {entry.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {activeJob && editorSections && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Review — {activeJob.exam_name}{activeJob.exam_year ? ` ${activeJob.exam_year}` : ""}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setActiveJobId(null); setEditorSections(null); }}>Close</Button>
          </CardHeader>
          <CardContent>
            <ExamSectionsEditor
              examName={activeJob.exam_name}
              examYear={activeJob.exam_year}
              officialWebsite={activeJob.official_website}
              examCategory={activeJob.exam_category}
              sections={editorSections}
              sources={(Array.isArray(activeJob.sources) ? activeJob.sources : []) as ExamSource[]}
              existingExamId={activeJob.exam_id}
              sortOrder={activeJob.sort_order ?? null}
              onSectionsChange={setEditorSections}
              onPublished={async (examId) => {
                await supabase.from("exam_generation_jobs")
                  .update({ status: "published", exam_id: examId })
                  .eq("id", activeJob.id);
                setActiveJobId(null); setEditorSections(null);
                fetchJobs();
                onPublished?.();
              }}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>AI Create Exam Page</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Exam name *</Label>
                <Input placeholder="e.g. CAT" value={form.exam_name} onChange={(e) => setForm({ ...form, exam_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Year</Label>
                <Input inputMode="numeric" value={form.exam_year} onChange={(e) => setForm({ ...form, exam_year: e.target.value.replace(/\D/g, "") })} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sort order (listing position)</Label>
              <Input
                inputMode="numeric"
                placeholder="e.g. 1 (lower shows first on /exam)"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Official website (optional)</Label>
              <Input placeholder="https://iimcat.ac.in" value={form.official_website} onChange={(e) => setForm({ ...form, official_website: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Category (optional — auto-detected)</Label>
              <Input placeholder="Management / Engineering / Law / Government" value={form.exam_category} onChange={(e) => setForm({ ...form, exam_category: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Extra instructions (optional)</Label>
              <Textarea rows={3} placeholder="Anything the AI should emphasise or avoid" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">
              Research is restricted to the official exam / conducting-body sources. Unverified values are left blank and those modules stay hidden on the live page.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={queueJob} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Start generation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamAIGenerator;
