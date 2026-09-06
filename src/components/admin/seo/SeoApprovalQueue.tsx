// Live approval queue: every pending recommendation with a real before/after
// diff preview, approve / reject / apply actions, and stage counters for
// Injected + Measured that move the instant an action lands.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Syringe, ThumbsDown, Trophy, Wand2, Radio,
} from "lucide-react";
import { fmtInt, safeText, agoText } from "@/lib/seoSafeRender";
import { LiveDot, RawPayloadDrawer } from "./SeoSafeUi";
import { FxCounter, BurstOnIncrease } from "./SeoLiveFx";
import { useSeoMotion } from "./SeoMotion";
import { useSeoRealtime } from "@/hooks/useSeoRealtime";

const PRIORITY_TONE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-sky-100 text-sky-800 border-sky-200",
  low: "bg-muted text-muted-foreground",
};

const DiffPreview = ({ before, after }: { before: unknown; after: unknown }) => {
  const b = safeText(before, "(empty)");
  const a = safeText(after, "(no generated value)");
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <div className="rounded-md border border-red-200 bg-red-50/60 p-2">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">Current</div>
        <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-red-900">{b}</p>
        <div className="mt-1 text-xs text-red-700/70">{b === "(empty)" ? "" : `${b.length} chars`}</div>
      </div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Proposed</div>
        <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-emerald-900">{a}</p>
        <div className="mt-1 text-xs text-emerald-700/70">
          {a === "(no generated value)" ? "needs a human edit" : `${a.length} chars`}
        </div>
      </div>
    </div>
  );
};

const StageCard = ({
  icon: Icon, label, value, tone, live,
}: { icon: any; label: string; value: number | null; tone: string; live: boolean }) => (
  <BurstOnIncrease value={value}>
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 opacity-70" />
        <LiveDot live={live} tone="emerald" />
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        <FxCounter value={value} format={(v) => fmtInt(v, "0")} />
      </div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  </BurstOnIncrease>
);

export default function SeoApprovalQueue({ onChanged }: { onChanged?: () => void }) {
  const motionCfg = useSeoMotion();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  // optimistic bumps so Injected / Measured move the instant you act
  const [bump, setBump] = useState({ injected: 0, measured: 0 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);


  const call = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data: res, error } = await supabase.functions.invoke("seo-intel-control", { body: { action, ...extra } });
    if (error) throw new Error(error.message);
    if ((res as any)?.error) throw new Error(safeText((res as any).error));
    return res as any;
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [queue, feed] = await Promise.all([call("approval_queue"), call("research_feed", { hours: 24 })]);
      setData({ queue, feed });
      setErr(null);
      setUpdated(new Date().toISOString());
      setBump({ injected: 0, measured: 0 });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [call]);

  useEffect(() => { load(); }, [load]);
  const rt = useSeoRealtime(() => load(), ["seo_intel_recommendations", "seo_intel_experiments"], { enabled: true });

  useEffect(() => {
    const t = setInterval(load, motionCfg.pollMs * 3);
    return () => clearInterval(t);
  }, [load, motionCfg.pollMs]);

  const pending: any[] = useMemo(() => data?.queue?.pending ?? [], [data]);
  const approved: any[] = useMemo(() => data?.queue?.approved ?? [], [data]);
  const applied: any[] = useMemo(() => data?.queue?.applied ?? [], [data]);
  const changes: any[] = useMemo(() => data?.feed?.changes ?? [], [data]);

  const measured = changes.filter((c) => c.outcome && String(c.outcome) !== "pending").length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = [...pending, ...approved];
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.path, r.keyword, r.change_type, r.problem, r.recommended_change, r.after_value, r.before_value]
        .some((v) => String(v ?? "").toLowerCase().includes(needle)));
  }, [pending, approved, q]);

  const act = async (rec: any, action: "approve" | "reject" | "apply") => {
    setActing(`${rec.id}-${action}`);
    try {
      await call("rec_action", { id: rec.id, act: action });
      if (action === "apply") setBump((b) => ({ ...b, injected: b.injected + 1, measured: b.measured }));
      toast.success(
        action === "apply" ? "Change injected into the page and baselined for measurement"
          : action === "approve" ? "Approved — queued as a task"
            : "Rejected",
      );
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActing(null);
    }
  };

  /* ── selection + bulk actions ─────────────────────────────────────────── */
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allShownSelected = filtered.length > 0 && filtered.every((r: any) => selected.has(String(r.id)));
  const toggleAllShown = () =>
    setSelected(allShownSelected ? new Set<string>() : new Set(filtered.map((r: any) => String(r.id))));

  const bulk = async (action: "approve" | "reject" | "apply", scope: "selected" | "all") => {
    const ids = scope === "selected" ? [...selected] : [];
    if (scope === "selected" && !ids.length) { toast.error("Select at least one recommendation first."); return; }
    setBulkBusy(`${action}-${scope}`);
    try {
      const res = await call("bulk_rec_action", scope === "selected" ? { act: action, ids } : { act: action, max: 2000 });
      const done = Number(res?.processed ?? res?.applied_now ?? 0);
      const queued = Number(res?.queued ?? 0);
      if (action === "apply") setBump((b) => ({ ...b, injected: b.injected + done }));
      toast.success(
        action === "apply"
          ? `${done} change(s) written now${queued ? `, ${queued} handed to the engine` : ""}`
          : `${done} recommendation(s) ${action === "approve" ? "approved" : "rejected"}`,
      );
      setSelected(new Set());
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBulkBusy(null);
    }
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                Approval queue
                <Badge variant="outline" className="gap-1 text-xs">
                  <Radio className={`h-3 w-3 ${rt.connected ? "text-emerald-600" : "text-muted-foreground"}`} />
                  {rt.connected ? "streaming" : "polling"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Every pending change with its exact before/after diff. Approving creates a task; applying writes the
                change and starts measuring it. Synced {agoText(updated)}.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RawPayloadDrawer title="approval_queue" payload={data} />
              <Button size="sm" variant="outline" disabled={busy} onClick={load}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{safeText(err)}</div>}

          <div className="grid gap-2 sm:grid-cols-4">
            <StageCard icon={ClipboardCheck} label="Awaiting review" value={pending.length} tone="border-amber-200 bg-amber-50/70 text-amber-900" live={pending.length > 0} />
            <StageCard icon={CheckCircle2} label="Approved, ready" value={approved.length} tone="border-sky-200 bg-sky-50/70 text-sky-900" live={approved.length > 0} />
            <StageCard icon={Syringe} label="Injected into pages" value={applied.length + bump.injected} tone="border-emerald-200 bg-emerald-50/70 text-emerald-900" live={applied.length > 0} />
            <StageCard icon={Trophy} label="Measured outcomes" value={measured + bump.measured} tone="border-violet-200 bg-violet-50/70 text-violet-900" live={measured > 0} />
          </div>

          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by page, keyword, change type or proposed text…"
            className="h-9"
          />

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
            <Button size="sm" variant="outline" onClick={toggleAllShown}>
              {allShownSelected ? "Clear selection" : "Select all shown"}
            </Button>
            <Badge variant="secondary">{selected.size} selected</Badge>
            <div className="h-5 w-px bg-border" />
            <Button size="sm" variant="outline" disabled={!!bulkBusy} onClick={() => bulk("approve", "selected")}>
              {bulkBusy === "approve-selected" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
              Approve selected
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!!bulkBusy} onClick={() => bulk("apply", "selected")}>
              {bulkBusy === "apply-selected" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
              Apply selected
            </Button>
            <Button size="sm" variant="ghost" disabled={!!bulkBusy} onClick={() => bulk("reject", "selected")}>
              {bulkBusy === "reject-selected" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />}
              Reject selected
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button size="sm" variant="outline" disabled={!!bulkBusy} onClick={() => bulk("approve", "all")}>
              {bulkBusy === "approve-all" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
              Approve all pending
            </Button>
            <Button size="sm" variant="outline" disabled={!!bulkBusy} onClick={() => bulk("apply", "all")}>
              {bulkBusy === "apply-all" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
              Apply everything safe
            </Button>
          </div>



          <ScrollArea className="h-[560px] rounded-md border">
            <div className="divide-y">
              <AnimatePresence initial={false}>
                {filtered.map((rec: any) => {
                  const isOpen = open === rec.id;
                  return (
                    <motion.div
                      key={String(rec.id)}
                      layout={motionCfg.intensity > 0}
                      initial={{ opacity: 0, y: motionCfg.intensity > 0 ? 8 : 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: motionCfg.dur(0.25) }}
                      className="p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <input
                          type="checkbox"
                          aria-label="Select this recommendation"
                          className="mt-1.5 h-4 w-4 shrink-0 accent-emerald-600"
                          checked={selected.has(String(rec.id))}
                          onChange={() => toggle(String(rec.id))}
                        />
                        <button

                          className="min-w-0 flex-1 text-left"
                          onClick={() => setOpen(isOpen ? null : String(rec.id))}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${PRIORITY_TONE[String(rec.priority ?? "low")] ?? PRIORITY_TONE.low}`}>
                              {safeText(rec.priority, "low")}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">{safeText(rec.change_type, "change")}</Badge>
                            {rec.status === "approved" && <Badge className="bg-sky-600 text-xs">approved</Badge>}
                            {rec.can_auto_apply && (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs text-emerald-800">
                                auto-appliable
                              </Badge>
                            )}
                            <span className="truncate font-mono text-xs text-muted-foreground">{safeText(rec.path, "site-wide")}</span>
                          </div>
                          <p className="mt-1 text-sm font-medium">{safeText(rec.recommended_change ?? rec.problem)}</p>
                          <p className="text-xs text-muted-foreground">
                            keyword {safeText(rec.keyword, "—")} · confidence {safeText(rec.confidence, "—")} · created {agoText(rec.created_at)}
                          </p>
                        </button>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {rec.status !== "approved" && (
                            <Button size="sm" variant="outline" disabled={!!acting} onClick={() => act(rec, "approve")}>
                              {acting === `${rec.id}-approve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              <span className="ml-1.5">Approve</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={!!acting || !rec.can_auto_apply}
                            title={rec.can_auto_apply ? "Write this change to the page now" : "Needs a human edit — approve it to create a task"}
                            onClick={() => act(rec, "apply")}
                          >
                            {acting === `${rec.id}-apply` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                            <span className="ml-1.5">Apply</span>
                          </Button>
                          <Button size="sm" variant="ghost" disabled={!!acting} onClick={() => act(rec, "reject")}>
                            {acting === `${rec.id}-reject` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: motionCfg.dur(0.25) }}
                            className="overflow-hidden pt-3"
                          >
                            <DiffPreview before={rec.before_value} after={rec.after_value} />
                            {rec.problem && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                <span className="font-semibold">Why:</span> {safeText(rec.problem)}
                              </p>
                            )}
                            {rec.evidence && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                <span className="font-semibold">Evidence:</span> {safeText(rec.evidence)}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!filtered.length && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {busy ? "Loading the queue…" : "Nothing waiting for approval right now."}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
