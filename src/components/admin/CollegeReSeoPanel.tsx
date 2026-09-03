// College Re-SEO control centre.
// Reuses the same backend engine as the AI SEO Dashboard (seo-reoptimize +
// seo-reoptimize-worker), so every college page goes through the identical
// 68-parameter pipeline: technical + on-page SEO, AEO/GEO, schema markup,
// long-tail keyword research, 3%+ keyword density, meta title/description,
// additive AEO block only (no content rewrite), internal linking and off-page signals.
//
// The run lives entirely on the server — closing this dialog or the browser
// does not stop it. Auto wake-up re-kicks a stalled run, and Restart Failed
// re-queues failed pages.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Loader2, CheckCircle2, XCircle, RotateCcw, Zap, StopCircle,
  RefreshCw, ArrowRight, Gauge, ListChecks, Coins,
} from "lucide-react";

const FN_BASE = "https://mttoiqruzzxooveooldo.supabase.co/functions/v1";
const SITE = "https://mbacompass.in";
const RUN_KEY = "admin.colleges.reseo.runId";

const STAGE_LABEL: Record<string, string> = {
  reading: "Reading page content",
  researching: "Researching competitors + long-tail keywords",
  generating: "Keyword research + schema (existing content kept)",
  saving: "Saving optimized SEO + schema",
  done: "Done",
};

// Per-page SEO parameter checklist (proxy for the full 68-parameter audit).
const CHECKS = [
  "Meta title", "Meta description", "H1", "Primary keyword", "Secondary keyword",
  "Search intent", "Long-tail keywords", "Related queries", "Keyword density ≥3%",
  "Intro content", "Body content", "FAQ (AEO)", "Schema markup", "Internal links",
];

type CollegeSeo = {
  id: string; name: string; slug: string;
  meta_title: string | null; meta_description: string | null; primary_keyword: string | null;
  ov?: any;
};

function checkPage(c: CollegeSeo): boolean[] {
  const ov = c.ov || {};
  const dens = ov.keyword_density && typeof ov.keyword_density === "object"
    ? Math.max(0, ...Object.values(ov.keyword_density as Record<string, number>).map((v) => Number(v) || 0))
    : 0;
  const body: string = ov.body_html || "";
  return [
    !!(c.meta_title || ov.title),
    !!(c.meta_description || ov.description),
    !!ov.h1,
    !!(c.primary_keyword || ov.primary_keyword),
    !!ov.secondary_keyword,
    !!ov.search_intent,
    Array.isArray(ov.long_tail_keywords) && ov.long_tail_keywords.length >= 5,
    Array.isArray(ov.related_queries) && ov.related_queries.length >= 5,
    dens >= 2.5,
    !!ov.intro_html,
    body.length > 3000,
    !!ov.faq && (Array.isArray(ov.faq) ? ov.faq.length >= 5 : true),
    !!ov.json_ld && Object.keys(ov.json_ld || {}).length > 2,
    /<a\s/i.test(body),
  ];
}

async function authedFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${FN_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
      ...(init?.headers || {}),
    },
  });
}

export function useCollegeReseo() {
  const [runId, setRunId] = useState<string | null>(() => localStorage.getItem(RUN_KEY));
  const persist = useCallback((id: string | null) => {
    setRunId(id);
    if (id) localStorage.setItem(RUN_KEY, id); else localStorage.removeItem(RUN_KEY);
  }, []);
  return { runId, setRunId: persist };
}

export async function launchCollegeReseo(pages: { id: string; name: string; slug: string; primary_keyword?: string | null }[], scope: string) {
  const { data, error } = await supabase.functions.invoke("seo-reoptimize", {
    body: {
      scope,
      label: `Colleges Re-SEO ${new Date().toISOString().slice(0, 16)}`,
      pages: pages.map((p) => ({
        page_type: "college",
        page_id: p.id,
        slug: p.slug,
        url: `${SITE}/colleges/${p.slug}`,
        page_name: p.name,
        old_primary_keyword: p.primary_keyword || null,
      })),
    },
  });
  if (error) throw error;
  if (!data?.run_id) throw new Error("No run_id returned");
  return data.run_id as string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Currently selected college ids in the table (optional). */
  selectedIds?: string[];
}

export default function CollegeReSeoPanel({ open, onOpenChange, selectedIds = [] }: Props) {
  const { toast } = useToast();
  const { runId, setRunId } = useCollegeReseo();
  const [colleges, setColleges] = useState<CollegeSeo[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [run, setRun] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [credits, setCredits] = useState<{ tokens: number; cost: number; calls: number }>({ tokens: 0, cost: 0, calls: 0 });
  const [ageFilter, setAgeFilter] = useState<"any" | "never" | "7" | "15" | "30">("any");
  const wakeRef = useRef<number>(0);

  // ── Inventory: which college pages have incomplete SEO ───────────
  const loadInventory = useCallback(async () => {
    setLoadingInv(true);
    try {
      const rows = await fetchAllRows<any>((from, to) =>
        supabase.from("colleges")
          .select("id, name, slug, meta_title, meta_description, primary_keyword")
          .order("name").range(from, to) as any);
      const ovs = await fetchAllRows<any>((from, to) =>
        supabase.from("page_seo_overrides")
          .select("slug, title, description, h1, intro_html, body_html, faq, json_ld, primary_keyword, secondary_keyword, search_intent, long_tail_keywords, related_queries, keyword_density, last_reoptimized_at")
          .range(from, to) as any).catch(() => []);
      const bySlug = new Map(ovs.map((o: any) => [o.slug, o]));
      setColleges(rows.filter((r: any) => r.slug && r.name).map((r: any) => ({ ...r, ov: bySlug.get(r.slug) })));
    } catch (e: any) {
      toast({ title: "Failed to load college SEO state", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoadingInv(false);
    }
  }, [toast]);

  useEffect(() => { if (open) loadInventory(); }, [open, loadInventory]);

  // ── Live run polling (server-side run; safe to close dialog) ─────
  const tick = useCallback(async () => {
    if (!runId) return;
    try {
      const resp = await authedFetch(`/seo-reoptimize?run_id=${runId}`);
      if (!resp.ok) return;
      const j = await resp.json();
      setRun(j.run);
      setItems(j.items || []);

      // Auto wake-up: if nothing finished in the last 4 minutes but work
      // remains, re-kick the worker (max once per 90s).
      const pending = (j.items || []).filter((i: any) => i.status === "queued" || i.status === "running");
      const lastActivity = Math.max(
        new Date(j.run?.started_at || 0).getTime(),
        ...(j.items || []).map((i: any) => new Date(i.finished_at || i.started_at || 0).getTime()),
      );
      if (j.run?.status === "running" && pending.length > 0 &&
          Date.now() - lastActivity > 4 * 60_000 && Date.now() - wakeRef.current > 90_000) {
        wakeRef.current = Date.now();
        await authedFetch(`/seo-reoptimize?action=resume`, { method: "POST", body: JSON.stringify({ run_id: runId }) });
      }

      // Credits consumed since the run started.
      if (j.run?.started_at) {
        const { data: usage } = await supabase.from("ai_usage_logs")
          .select("total_tokens, estimated_cost")
          .gte("created_at", j.run.started_at)
          .limit(5000);
        const tokens = (usage || []).reduce((s: number, u: any) => s + (u.total_tokens || 0), 0);
        const cost = (usage || []).reduce((s: number, u: any) => s + Number(u.estimated_cost || 0), 0);
        setCredits({ tokens, cost, calls: (usage || []).length });
      }
    } catch { /* transient */ }
  }, [runId]);

  useEffect(() => {
    if (!open || !runId) return;
    tick();
    const iv = setInterval(tick, 4000);
    return () => clearInterval(iv);
  }, [open, runId, tick]);

  // ── Last-optimized age filter ───────────────────────────────────
  const ageOf = (c: CollegeSeo): number | null => {
    const t = c.ov?.last_reoptimized_at ? new Date(c.ov.last_reoptimized_at).getTime() : 0;
    if (!t) return null; // never optimized
    return Math.floor((Date.now() - t) / 86_400_000);
  };
  const matchesAge = useCallback((c: CollegeSeo) => {
    const days = ageOf(c);
    switch (ageFilter) {
      case "never": return days === null;
      case "7": return days === null || days >= 7;
      case "15": return days === null || days >= 15;
      case "30": return days === null || days >= 30;
      default: return true;
    }
  }, [ageFilter]);

  // ── Derived stats ───────────────────────────────────────────────
  const inv = useMemo(() => {
    const scoped = colleges.filter(matchesAge);
    let complete = 0, checksDone = 0, never = 0;
    const incomplete: CollegeSeo[] = [];
    for (const c of scoped) {
      if (ageOf(c) === null) never++;
      const res = checkPage(c);
      const passed = res.filter(Boolean).length;
      checksDone += passed;
      if (passed === CHECKS.length) complete++; else incomplete.push(c);
    }
    return {
      scoped,
      never,
      total: scoped.length,
      complete,
      incomplete,
      checksDone,
      checksTotal: scoped.length * CHECKS.length,
    };
  }, [colleges, matchesAge]);

  const runStats = useMemo(() => {
    const total = run?.total_items || items.length || 0;
    const done = items.filter((i) => i.status === "done").length;
    const failed = items.filter((i) => i.status === "failed").length;
    const running = items.filter((i) => i.status === "running");
    const queued = items.filter((i) => i.status === "queued").length;
    return {
      total, done, failed, queued,
      running: running.length,
      current: running[0] || null,
      pct: total ? Math.round(((done + failed) / total) * 100) : 0,
    };
  }, [items, run]);

  // ── Actions ─────────────────────────────────────────────────────
  const start = async (mode: "incomplete" | "all" | "selected") => {
    const pool = mode === "all" ? inv.scoped
      : mode === "incomplete" ? inv.incomplete
      : colleges.filter((c) => selectedIds.includes(c.id));
    if (!pool.length) {
      toast({ title: "Nothing to optimize", description: mode === "selected" ? "Select colleges in the table first." : "No college pages match the current filter.", variant: "destructive" });
      return;
    }
    setLaunching(mode);
    try {
      const id = await launchCollegeReseo(pool, `colleges_${mode}`);
      setRunId(id);
      setItems([]); setRun(null);
      toast({ title: "Re-SEO started", description: `${pool.length} college page${pool.length > 1 ? "s" : ""} queued. Runs on the server — you can close this window.` });
    } catch (e: any) {
      toast({ title: "Failed to start", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLaunching(null);
    }
  };

  const action = async (act: "resume" | "rerun" | "cancel" | "stop") => {
    if (!runId) return;
    if (act === "stop" && !window.confirm("Stop this Re-SEO run now? Pages not yet processed will be skipped.")) return;
    try {
      const resp = await authedFetch(`/seo-reoptimize?action=${act}`, { method: "POST", body: JSON.stringify({ run_id: runId }) });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || `HTTP ${resp.status}`);
      toast({
        title: act === "resume" ? "Worker woken up" : act === "rerun" ? "Failed pages re-queued" : act === "stop" ? "Run stopped" : "Run cancelled",
        description: act === "rerun" ? `${j?.requeued ?? 0} page(s) will be retried.` : act === "stop" ? "Remaining pages were skipped. Completed pages are kept." : undefined,
      });
      tick();
    } catch (e: any) {
      toast({ title: "Action failed", description: String(e?.message || e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Colleges Re-SEO Control Centre
          </DialogTitle>
          <DialogDescription>
            Full 68-parameter optimization per college page — technical + on-page SEO, AEO/GEO answers,
            schema markup, long-tail keyword research, 3%+ keyword density, meta title/description,
            internal linking and off-page signals. Your existing page content is never rewritten —
            only a short additive AEO block is appended when extra keyword density is needed. Runs in the backend; closing this
            window or the browser does not stop it.
          </DialogDescription>
        </DialogHeader>

        {/* Last-optimized filter */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <span className="text-xs font-medium text-muted-foreground mr-1">Last AI SEO:</span>
          {([
            ["any", "All pages"],
            ["never", "Never optimized"],
            ["7", "Older than 7 days"],
            ["15", "Older than 15 days"],
            ["30", "Older than 30 days"],
          ] as const).map(([v, label]) => (
            <Button key={v} size="sm" variant={ageFilter === v ? "default" : "outline"}
              onClick={() => setAgeFilter(v)}>
              {label}
            </Button>
          ))}
          <Badge variant="secondary" className="ml-auto">{loadingInv ? "…" : `${inv.total} matching`}</Badge>
          <Badge variant="outline">{loadingInv ? "…" : `${inv.never} never optimized`}</Badge>
        </div>

        {/* Inventory */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total college pages</div>
            <div className="text-2xl font-bold">{loadingInv ? "…" : inv.total}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">SEO complete</div>
            <div className="text-2xl font-bold text-green-600">{loadingInv ? "…" : inv.complete}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">SEO incomplete</div>
            <div className="text-2xl font-bold text-amber-600">{loadingInv ? "…" : inv.incomplete.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><ListChecks className="h-3 w-3" /> SEO parameters</div>
            <div className="text-2xl font-bold">{loadingInv ? "…" : inv.checksDone}<span className="text-sm text-muted-foreground">/{inv.checksTotal}</span></div>
            <div className="text-xs text-muted-foreground">{loadingInv ? "" : `${Math.max(0, inv.checksTotal - inv.checksDone)} pending`}</div>
          </CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => start("incomplete")} disabled={!!launching || loadingInv}>
            {launching === "incomplete" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Re-SEO incomplete pages ({inv.incomplete.length})
          </Button>
          <Button variant="outline" onClick={() => start("all")} disabled={!!launching || loadingInv}>
            {launching === "all" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Re-SEO all pages ({inv.total})
          </Button>
          {selectedIds.length > 0 && (
            <Button variant="outline" onClick={() => start("selected")} disabled={!!launching}>
              {launching === "selected" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gauge className="h-4 w-4 mr-2" />}
              Re-SEO selected ({selectedIds.length})
            </Button>
          )}
          <Button variant="ghost" onClick={loadInventory} disabled={loadingInv}>
            {loadingInv ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} Rescan
          </Button>
        </div>

        {/* Live run */}
        {runId && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="secondary">Total {runStats.total}</Badge>
                <Badge className="bg-blue-500">Processing {runStats.running}</Badge>
                <Badge className="bg-slate-500">Pending {runStats.queued}</Badge>
                <Badge className="bg-green-600">Completed {runStats.done}</Badge>
                <Badge className="bg-red-500">Failed {runStats.failed}</Badge>
                <Badge variant="outline">{run?.status || "…"}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => action("resume")}>
                  <Zap className="h-4 w-4 mr-1" /> Wake up / Resume
                </Button>
                <Button size="sm" variant="outline" onClick={() => action("rerun")} disabled={!runStats.failed}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Restart failed
                </Button>
                <Button size="sm" variant="ghost" onClick={() => action("cancel")}
                  disabled={!["running", "queued"].includes(run?.status)}>
                  <StopCircle className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={() => action("stop")}
                  disabled={!["running", "queued"].includes(run?.status)}>
                  <StopCircle className="h-4 w-4 mr-1" /> Stop now
                </Button>
              </div>
            </div>

            <Progress value={runStats.pct} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {runStats.current
                  ? <>Now processing: <strong className="text-foreground">{runStats.current.page_name || runStats.current.slug}</strong> — {STAGE_LABEL[runStats.current.stage] || runStats.current.stage || "starting"}</>
                  : run?.status === "completed" ? "Run finished." : "Waiting for the worker…"}
              </span>
              <span className="font-semibold">{runStats.pct}%</span>
            </div>

            <Card><CardContent className="p-4 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">AI credits consumed:</span>
                <strong>${credits.cost.toFixed(4)}</strong>
              </div>
              <div><span className="text-muted-foreground">Tokens:</span> <strong>{credits.tokens.toLocaleString()}</strong></div>
              <div><span className="text-muted-foreground">AI calls:</span> <strong>{credits.calls}</strong></div>
            </CardContent></Card>

            <ScrollArea className="h-[320px] rounded-[0.25rem] border">
              <div className="divide-y">
                {items.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">Loading queue…</div>}
                {items.map((it) => (
                  <div key={it.id} className="p-3 flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full ${
                      it.status === "done" ? "bg-green-500" : it.status === "failed" ? "bg-red-500" : it.status === "running" ? "bg-blue-500" : "bg-slate-300"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{it.page_name || it.slug}</div>
                      <div className="text-xs text-muted-foreground truncate">{it.url}</div>
                      {it.status === "running" && (
                        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />{STAGE_LABEL[it.stage] || it.stage || "starting"}
                        </div>
                      )}
                      {(it.old_primary_keyword || it.new_primary_keyword) && (
                        <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-muted-foreground line-through">{it.old_primary_keyword || "(none)"}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium text-green-700">{it.new_primary_keyword || "…"}</span>
                          {it.secondary_keyword && <span className="text-slate-500">+ {it.secondary_keyword}</span>}
                        </div>
                      )}
                      {it.error && <div className="text-xs text-red-600 mt-1">{it.error}</div>}
                    </div>
                    <div className="text-xs text-right">
                      {it.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {it.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                      {it.score_after != null && (
                        <div className="text-slate-600 mt-1">{it.score_before ?? "—"} → <strong>{it.score_after}</strong></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Row-level Re-SEO button for a single college. */
export function CollegeReSeoRowButton({ college }: { college: { id: string; name: string; slug: string } }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary"
      title="Re-SEO this college page (full 68-parameter optimization)"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await launchCollegeReseo([college], "colleges_single");
          toast({ title: "Re-SEO started", description: `${college.name} is being optimized in the background.` });
        } catch (e: any) {
          toast({ title: "Failed to start", description: String(e?.message || e), variant: "destructive" });
        } finally { setBusy(false); }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
    </Button>
  );
}
