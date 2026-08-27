import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import {
  auditExamSections,
  completenessScore,
  type Gap,
} from "@/lib/examCompleteness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";

type ExamRow = {
  id: string;
  name: string;
  slug: string | null;
  exam_year: number | null;
  official_website: string | null;
  sections: Record<string, unknown> | null;
  updated_at: string | null;
};

type Audited = ExamRow & { gaps: Gap[]; score: number; keys: string[] };

type Item = {
  id: string;
  exam_id: string;
  exam_name: string;
  status: string;
  step: string | null;
  gaps_before: number | null;
  gaps_after: number | null;
  fields_filled: number | null;
  passes: number | null;
  tokens_used: number | null;
  attempts: number | null;
  error: string | null;
  log: { at?: string; level?: string; message?: string }[] | null;
  updated_at: string | null;
};

const statusTone: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
};

export default function AdminExamCompleteness() {
  const [exams, setExams] = useState<Audited[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const pollRef = useRef<number | null>(null);

  const audit = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAllRows<ExamRow>((from, to) =>
        supabase
          .from("exams")
          .select("id,name,slug,exam_year,official_website,sections,updated_at")
          .order("name")
          .range(from, to),
      );
      const audited = rows.map((exam) => {
        const gaps = auditExamSections(exam.sections as Record<string, unknown> | null);
        return {
          ...exam,
          gaps,
          score: completenessScore(gaps),
          keys: [...new Set(gaps.map((g) => g.key))],
        };
      });
      audited.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
      setExams(audited);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("exam_backfill_items")
      .select(
        "id,exam_id,exam_name,status,step,gaps_before,gaps_after,fields_filled,passes,tokens_used,attempts,error,log,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setItems((data || []) as unknown as Item[]);
  }, []);

  useEffect(() => {
    audit();
    loadItems();
  }, [audit, loadItems]);

  // Live view: poll while anything is in flight (survives a closed browser
  // server-side, this is only the display layer).
  const active = items.filter((i) => i.status === "queued" || i.status === "running");
  useEffect(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (!active.length) return;
    pollRef.current = window.setInterval(() => {
      loadItems();
    }, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [active.length, loadItems]);

  const kickWorker = async (concurrency: number) => {
    const { error } = await supabase.functions.invoke("exam-backfill-worker", {
      body: { concurrency },
    });
    if (error) throw new Error(error.message);
  };

  const enqueue = async (targets: Audited[], label: string) => {
    if (!targets.length) {
      toast.info("Nothing to fix — every exam page is complete.");
      return;
    }
    setBusy(label);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: job, error: jobErr } = await supabase
        .from("exam_backfill_jobs")
        .insert({
          label,
          status: "running",
          total: targets.length,
          created_by: user?.user?.id ?? null,
        })
        .select("id")
        .single();
      if (jobErr) throw new Error(jobErr.message);

      const { error: itemsErr } = await supabase.from("exam_backfill_items").insert(
        targets.map((t) => ({
          job_id: job.id,
          exam_id: t.id,
          exam_name: t.name,
          exam_slug: t.slug,
          exam_year: t.exam_year,
          official_website: t.official_website,
          status: "queued",
          step: "Queued",
          gaps: t.gaps.slice(0, 80) as unknown as never,
          gaps_before: t.gaps.length,
        })),
      );
      if (itemsErr) throw new Error(itemsErr.message);

      await kickWorker(Math.min(12, Math.max(2, targets.length)));
      toast.success(`Queued ${targets.length} exam${targets.length > 1 ? "s" : ""} for gap-fill.`);
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the run");
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? exams.filter((e) => e.name.toLowerCase().includes(q)) : exams;
  }, [exams, query]);

  const incomplete = exams.filter((e) => e.gaps.length > 0);
  const avgScore = exams.length
    ? Math.round(exams.reduce((a, e) => a + e.score, 0) / exams.length)
    : 0;
  const itemByExam = new Map(items.map((i) => [i.exam_id, i]));
  const doneCount = items.filter((i) => i.status === "completed").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Exam Completeness Engine | Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam Completeness Engine</h1>
          <p className="text-sm text-muted-foreground">
            Field-level audit of every exam page. Missing facts are re-researched from official
            sources and filled in automatically — runs keep going with the browser closed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={audit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Audit all
          </Button>
          <Button
            onClick={() => enqueue(incomplete, `Fix all exams · ${new Date().toLocaleString()}`)}
            disabled={!!busy || loading || !incomplete.length}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Fix all exams ({incomplete.length})
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Exams audited", value: exams.length },
          { label: "Average completeness", value: `${avgScore}%` },
          { label: "Incomplete pages", value: incomplete.length },
          { label: "In flight now", value: active.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Live gap-fill progress
              <span className="text-sm font-normal text-muted-foreground">
                {doneCount} complete · {active.length} running · {failedCount} failed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={items.length ? (doneCount / items.length) * 100 : 0} />
            <ScrollArea className="max-h-[360px] pr-3">
              <Accordion type="multiple" className="space-y-2">
                {items.map((i) => (
                  <AccordionItem key={i.id} value={i.id} className="rounded-lg border px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex w-full flex-wrap items-center gap-2 text-left">
                        <Badge className={statusTone[i.status] || "bg-muted"}>{i.status}</Badge>
                        <span className="font-medium">{i.exam_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {i.step || "—"}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          gaps {i.gaps_before ?? "—"} → {i.gaps_after ?? "—"} · pass {i.passes ?? 0}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      {i.error && (
                        <p className="mb-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                          {i.error}
                        </p>
                      )}
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {(i.log || []).slice().reverse().map((l, idx) => (
                          <li key={idx}>
                            <span className="text-foreground/60">
                              {l.at ? new Date(l.at).toLocaleTimeString() : ""}
                            </span>{" "}
                            <span
                              className={
                                l.level === "error"
                                  ? "text-destructive"
                                  : l.level === "warn"
                                    ? "text-amber-600"
                                    : l.level === "success"
                                      ? "text-emerald-600"
                                      : ""
                              }
                            >
                              {l.message}
                            </span>
                          </li>
                        ))}
                        {!(i.log || []).length && <li>No log entries yet.</li>}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Per-exam completeness</CardTitle>
          <Input
            placeholder="Search exams…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Auditing every exam page…
            </p>
          )}
          {!loading && !filtered.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">No exams found.</p>
          )}
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((exam) => {
              const live = itemByExam.get(exam.id);
              return (
                <AccordionItem key={exam.id} value={exam.id} className="rounded-lg border px-3">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex w-full flex-wrap items-center gap-3 text-left">
                      {exam.gaps.length ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                      <span className="font-medium">
                        {exam.name}
                        {exam.exam_year ? ` ${exam.exam_year}` : ""}
                      </span>
                      <Badge variant="outline">{exam.score}% complete</Badge>
                      {exam.gaps.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {exam.gaps.length} issues in {exam.keys.length} modules
                        </span>
                      )}
                      {live && (
                        <Badge className={statusTone[live.status] || "bg-muted"}>{live.status}</Badge>
                      )}
                      <div className="ml-auto w-28">
                        <Progress value={exam.score} />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!busy || !exam.gaps.length}
                        onClick={() => enqueue([exam], `Fix ${exam.name}`)}
                      >
                        <Wand2 className="mr-2 h-3.5 w-3.5" /> Fix this exam
                      </Button>
                      {exam.slug && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/exam/${exam.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-3.5 w-3.5" /> View page
                          </Link>
                        </Button>
                      )}
                    </div>
                    {exam.gaps.length ? (
                      <ul className="space-y-1 text-xs">
                        {exam.gaps.map((g, idx) => (
                          <li key={idx} className="flex gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{g.key}</code>
                            <span className="text-muted-foreground">{g.detail}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-600">
                        Every module on this page has real, non-placeholder values.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
