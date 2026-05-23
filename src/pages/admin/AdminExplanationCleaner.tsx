import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Play, Square, RefreshCw, Sparkles, Clock,
  CheckCircle2, AlertTriangle, DollarSign, Coins, Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  explanationCleaner,
  type CleanerScope,
  type CleanerState,
  PRICING,
} from "@/lib/explanationCleanerRunner";

type Test = { id: string; name: string; exam_code: string };
type Section = { id: string; name: string; code: string; test_id: string };
type Topic = { topic: string; n: number };

type BrowseStatus = "pending" | "done";
type Row = {
  id: string;
  topic: string | null;
  explanation_html: string | null;
  mock_sections: { test_id: string; name: string; code: string } | null;
};

export default function AdminExplanationCleaner() {
  const [tests, setTests] = useState<Test[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [scope, setScope] = useState<CleanerScope>("all");
  const [testId, setTestId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [topic, setTopic] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [force, setForce] = useState(false);
  const [batchSize, setBatchSize] = useState(20);

  // live runner state
  const [rs, setRs] = useState<CleanerState>(explanationCleaner.getState());
  useEffect(() => { const u = explanationCleaner.subscribe(setRs); return () => { u; }; }, []);

  // hydrate from previously-running config if any
  useEffect(() => {
    const c = rs.config;
    if (c) {
      setScope(c.scope);
      setTestId(c.test_id ?? "");
      setSectionId(c.section_id ?? "");
      setTopic(c.topic ?? "");
      setQuestionId(c.question_id ?? "");
      setForce(c.force);
      setBatchSize(c.batchSize);
    }
    // eslint-disable-next-line
  }, []);

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

  const config = useMemo(() => ({
    scope, force, batchSize,
    test_id: scope === "test" || scope === "topic" ? testId || undefined : undefined,
    section_id: scope === "section" ? sectionId || undefined : undefined,
    topic: scope === "topic" ? topic || undefined : undefined,
    question_id: scope === "question" ? questionId || undefined : undefined,
  }), [scope, testId, sectionId, topic, questionId, force, batchSize]);

  // refresh stats whenever scope changes (and we're not running)
  useEffect(() => {
    if (!rs.running) explanationCleaner.refreshStats(config);
    // eslint-disable-next-line
  }, [config.scope, config.test_id, config.section_id, config.topic, config.question_id, config.force]);

  const start = (opts: { pendingOnly?: boolean } = {}) => {
    if (scope === "test" && !testId) return toast.error("Pick a mock test");
    if (scope === "section" && !sectionId) return toast.error("Pick a section");
    if (scope === "topic" && !topic) return toast.error("Pick a topic");
    if (scope === "question" && !questionId) return toast.error("Paste a question id");
    explanationCleaner.start({ ...config, force: opts.pendingOnly ? false : config.force });
  };
  // "Run ALL" always = pending only, never re-cleans already-done (saves cost)
  const startPendingOnly = () => start({ pendingOnly: true });

  // Browse panel
  const [browseStatus, setBrowseStatus] = useState<BrowseStatus | "failed">("pending");
  const [browseRows, setBrowseRows] = useState<Row[]>([]);
  const [browseCount, setBrowseCount] = useState<number | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  const loadBrowse = async () => {
    if (browseStatus === "failed") {
      // local failed list from this session
      setBrowseRows(rs.errors.map((e) => ({
        id: e.id, topic: null, explanation_html: null, mock_sections: null,
      })));
      setBrowseCount(rs.errors.length);
      return;
    }
    setBrowseLoading(true);
    let q = supabase
      .from("mock_questions")
      .select("id, topic, explanation_html, mock_sections!inner(test_id, name, code)", { count: "exact" })
      .not("explanation_html", "is", null)
      .neq("explanation_html", "");

    if (browseStatus === "pending") {
      q = q.not("explanation_html", "ilike", "%<h4>%");
    } else {
      q = q.ilike("explanation_html", "%<h4>%");
    }
    if (scope === "test" && testId) q = q.eq("mock_sections.test_id", testId);
    if (scope === "section" && sectionId) q = q.eq("section_id", sectionId);
    if (scope === "topic") {
      if (topic) q = q.ilike("topic", topic);
      if (testId) q = q.eq("mock_sections.test_id", testId);
    }
    if (scope === "question" && questionId) q = q.eq("id", questionId);

    const { data, count, error } = await q.order("id").limit(50);
    if (error) toast.error(error.message);
    setBrowseRows((data as any[]) ?? []);
    setBrowseCount(count ?? null);
    setBrowseLoading(false);
  };

  useEffect(() => { loadBrowse(); /* eslint-disable-next-line */ }, [browseStatus, scope, testId, sectionId, topic, questionId, rs.errors.length, rs.processed]);

  // derived metrics
  const done = Math.max(0, rs.total - rs.remaining);
  const pct = rs.total > 0 ? Math.round((done / rs.total) * 100) : 0;
  const elapsed = rs.startTs ? (Date.now() - rs.startTs) / 1000 : 0;
  const rate = elapsed > 0 && rs.processed > 0 ? rs.processed / elapsed : 0;
  const etaSec = rate > 0 && rs.remaining > 0 ? Math.round(rs.remaining / rate) : null;
  const etaText = etaSec == null ? "—" : etaSec < 60 ? `${etaSec}s` : etaSec < 3600 ? `${Math.round(etaSec / 60)} min` : `${(etaSec / 3600).toFixed(1)} h`;
  const projectedCost = rate > 0 && rs.processed > 0
    ? (rs.costUsd / rs.processed) * rs.remaining
    : 0;
  const totalProjected = rs.costUsd + projectedCost;

  // keep ticking for live ETA even between batches
  const [, force2] = useState(0);
  useEffect(() => {
    if (!rs.running) return;
    const i = setInterval(() => force2((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [rs.running]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* HERO STATUS */}
      <div className="rounded-xl border-2 border-sky-300 bg-gradient-to-r from-sky-50 to-blue-50 p-4 flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-sky-600 shrink-0" />
        <div className="flex-1 text-sm">
          <div className="font-semibold text-sky-900">
            {rs.running ? "Cleanup running in the background" : (rs.total > 0 ? "Ready to clean" : "Idle — nothing messy detected")}
          </div>
          <div className="text-sky-700">
            {rs.running
              ? `${done}/${rs.total} done · ${rs.remaining} left · ETA ${etaText} · est. $${totalProjected.toFixed(3)} total`
              : "You can switch tabs, browse the admin, even close this page — but to keep the loop alive keep this browser tab open."}
          </div>
        </div>
        {!rs.running
          ? <Button onClick={() => start()} className="bg-sky-600 hover:bg-sky-700"><Play className="h-4 w-4 mr-2" />Start</Button>
          : <Button onClick={() => explanationCleaner.stop()} variant="destructive"><Square className="h-4 w-4 mr-2" />Stop</Button>}
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-sky-600" /> Explanation Cleaner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rewrites messy mock explanations into clean structured HTML with proper LaTeX. The cleanup engine runs in the background and survives tab switches inside the admin.
          </p>
        </div>
        <Button onClick={() => explanationCleaner.refreshStats(config)} variant="outline" disabled={rs.running}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh stats
        </Button>
      </div>

      {/* SCOPE */}
      <Card>
        <CardHeader><CardTitle>1. Choose what to clean</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Scope</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(["all","test","section","topic","question"] as CleanerScope[]).map((s) => (
                <Button key={s} size="sm" variant={scope === s ? "default" : "outline"} onClick={() => setScope(s)} disabled={rs.running}>
                  {s === "all" ? "All mocks" : s === "test" ? "Mock-wise" : s === "section" ? "Section-wise" : s === "topic" ? "Topic-wise" : "Single question"}
                </Button>
              ))}
            </div>
          </div>

          {(scope === "test" || scope === "section" || scope === "topic") && (
            <div>
              <Label>Mock test{scope === "topic" ? " (optional)" : ""}</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background" value={testId} onChange={(e) => { setTestId(e.target.value); setSectionId(""); setTopic(""); }} disabled={rs.running}>
                <option value="">{scope === "topic" ? "Any mock" : "— Pick a mock —"}</option>
                {tests.map((t) => <option key={t.id} value={t.id}>{t.exam_code} — {t.name}</option>)}
              </select>
            </div>
          )}

          {scope === "section" && testId && (
            <div>
              <Label>Section</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={rs.running}>
                <option value="">— Pick a section —</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
          )}

          {scope === "topic" && (
            <div>
              <Label>Topic</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={rs.running}>
                <option value="">— Pick a topic —</option>
                {topics.map((t) => <option key={t.topic} value={t.topic}>{t.topic} ({t.n})</option>)}
              </select>
            </div>
          )}

          {scope === "question" && (
            <div>
              <Label>Question ID (uuid)</Label>
              <Input value={questionId} onChange={(e) => setQuestionId(e.target.value.trim())} placeholder="e.g. 9f3c…" disabled={rs.running} />
            </div>
          )}

          <div>
            <Label>Status filter</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant={!force ? "default" : "outline"} onClick={() => setForce(false)} disabled={rs.running}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600" /> Pending only
              </Button>
              <Button size="sm" variant={force ? "default" : "outline"} onClick={() => setForce(true)} disabled={rs.running}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> All (re-clean done too)
              </Button>
              <span className="text-xs text-muted-foreground self-center ml-2">
                {force ? "Will rewrite every question in scope, even ones already formatted." : "Skips questions already containing structured headers."}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Label>Batch size (1–40, parallel AI calls)</Label>
              <Input type="number" min={1} max={40} value={batchSize} onChange={(e) => setBatchSize(Math.min(40, Math.max(1, Number(e.target.value) || 20)))} disabled={rs.running} />
              <p className="text-xs text-muted-foreground mt-1">Runner loops automatically until everything in scope is done.</p>
            </div>
            <div className="flex items-end">
              <Button onClick={() => start()} disabled={rs.running} size="lg" className="bg-emerald-600 hover:bg-emerald-700 w-full">
                <Play className="h-4 w-4 mr-2" /> Run ALL at once ({rs.total > 0 ? `${rs.total} questions` : "scan & start"})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADVANCED PROGRESS + COST */}
      <Card className="border-sky-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>2. Progress & Cost</span>
            {rs.running && <Badge className="bg-emerald-600 hover:bg-emerald-600 animate-pulse">LIVE</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Stat icon={<Sparkles className="h-4 w-4" />} label="Total" value={rs.total} />
            <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Done" value={done} accent="emerald" />
            <Stat icon={<Loader2 className={`h-4 w-4 text-sky-600 ${rs.running ? "animate-spin" : ""}`} />} label="Remaining" value={rs.remaining} accent="sky" />
            <Stat icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Failed" value={rs.failed} accent="amber" />
            <Stat icon={<Clock className="h-4 w-4" />} label="ETA" value={etaText} />
            <Stat icon={<Coins className="h-4 w-4 text-violet-600" />} label="Tokens" value={`${formatK(rs.promptTokens)}/${formatK(rs.completionTokens)}`} accent="violet" />
            <Stat icon={<DollarSign className="h-4 w-4 text-emerald-700" />} label="Cost so far" value={`$${rs.costUsd.toFixed(3)}`} accent="emerald" />
          </div>

          {/* Fancy progress bar */}
          <div className="space-y-1">
            <div className="relative h-4 rounded-full overflow-hidden bg-slate-100 border">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              {rs.running && (
                <div
                  className="absolute inset-y-0 w-1/4 bg-white/30 blur-sm -skew-x-12 animate-[shimmer_1.6s_linear_infinite]"
                  style={{ left: `${Math.max(0, pct - 10)}%` }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700 mix-blend-difference">
                {pct}% · {done}/{rs.total}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
              <span>
                {rs.processed} processed this run · {rate ? rate.toFixed(2) : "0.00"} q/sec
                {projectedCost > 0 && (
                  <> · projected remaining ≈ <strong>${projectedCost.toFixed(3)}</strong> · total ≈ <strong>${totalProjected.toFixed(3)}</strong></>
                )}
              </span>
              {rs.running && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> running in background</span>}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Pricing model: Gemini 2.5 Flash · ${PRICING.PRICE_IN_PER_M}/M input · ${PRICING.PRICE_OUT_PER_M}/M output (estimate)
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {!rs.running ? (
              <>
                <Button onClick={() => start()} size="lg" className="bg-sky-600 hover:bg-sky-700">
                  <Play className="h-4 w-4 mr-2" />Start cleaning ({rs.total > 0 ? rs.total : "scan & run"})
                </Button>
                {(rs.processed > 0 || rs.failed > 0) && (
                  <Button onClick={() => explanationCleaner.reset()} variant="ghost" size="lg">Reset counters</Button>
                )}
              </>
            ) : (
              <Button onClick={() => explanationCleaner.stop()} variant="destructive" size="lg">
                <Square className="h-4 w-4 mr-2" />Stop
              </Button>
            )}
          </div>

          {rs.log.length > 0 && (
            <div className="mt-2 max-h-48 overflow-auto rounded border bg-slate-50 p-3 text-xs font-mono space-y-1">
              {rs.log.slice(0, 30).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BROWSE / FILTER */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2"><Filter className="h-5 w-5" />3. Browse questions by status</span>
            <div className="flex gap-1">
              {(["pending","done","failed"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={browseStatus === s ? "default" : "outline"}
                  onClick={() => setBrowseStatus(s)}
                >
                  {s === "pending" && <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600" />}
                  {s === "done" && <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />}
                  {s === "failed" && <AlertTriangle className="h-3.5 w-3.5 mr-1 text-rose-600" />}
                  {s === "pending" ? "Pending" : s === "done" ? "Already done" : "Failed (this run)"}
                  {browseStatus === s && browseCount != null && <Badge variant="secondary" className="ml-2">{browseCount}</Badge>}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={loadBrowse} disabled={browseLoading}>
                <RefreshCw className={`h-4 w-4 ${browseLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {browseStatus === "failed" && rs.errors.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">No failures in this session 🎉</div>
          )}
          {browseStatus !== "failed" && (browseRows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {browseLoading ? "Loading…" : `No ${browseStatus} questions in current scope.`}
            </div>
          ) : null)}

          {browseStatus === "failed" && rs.errors.length > 0 && (
            <div className="space-y-2">
              {rs.errors.map((e, i) => (
                <div key={i} className="rounded border bg-rose-50 border-rose-200 px-3 py-2 text-xs">
                  <div className="font-mono text-rose-700">{e.id}</div>
                  <div className="text-rose-900">{e.message}</div>
                </div>
              ))}
            </div>
          )}

          {browseStatus !== "failed" && browseRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-2 py-2">Question ID</th>
                    <th className="px-2 py-2">Section</th>
                    <th className="px-2 py-2">Topic</th>
                    <th className="px-2 py-2">Preview</th>
                    <th className="px-2 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {browseRows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-slate-50">
                      <td className="px-2 py-2 font-mono text-[10px] truncate max-w-[140px]">{r.id}</td>
                      <td className="px-2 py-2">{r.mock_sections?.code ?? "—"}</td>
                      <td className="px-2 py-2">{r.topic ?? "—"}</td>
                      <td className="px-2 py-2 max-w-[400px] truncate text-muted-foreground">
                        {stripTags(r.explanation_html ?? "").slice(0, 120)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {browseStatus === "pending"
                          ? <Badge variant="outline" className="border-amber-400 text-amber-700">Pending</Badge>
                          : <Badge variant="outline" className="border-emerald-400 text-emerald-700">Done</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {browseCount != null && browseCount > browseRows.length && (
                <div className="text-[11px] text-muted-foreground pt-2 text-center">
                  Showing first {browseRows.length} of {browseCount}.
                </div>
              )}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground border-t pt-3 mt-3">
            "Pending" = explanation has no <code>&lt;h4&gt;</code> headers. "Done" = already has structured headers. Filter respects the scope you picked above.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: "emerald" | "sky" | "amber" | "violet" }) {
  const ring = accent === "emerald" ? "border-emerald-200 bg-emerald-50/40"
    : accent === "sky" ? "border-sky-200 bg-sky-50/40"
    : accent === "amber" ? "border-amber-200 bg-amber-50/40"
    : accent === "violet" ? "border-violet-200 bg-violet-50/40"
    : "bg-card";
  return (
    <div className={`rounded-lg border p-3 ${ring}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-bold mt-1 truncate">{value}</div>
    </div>
  );
}

function formatK(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
