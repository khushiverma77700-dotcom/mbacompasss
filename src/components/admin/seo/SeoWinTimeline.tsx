// Win Event Timeline — every recorded metric change as a searchable event with
// before/after values and a timestamp. Selecting an event replays its animation
// (counters travel from the "before" value to the "after" value).

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight, ArrowUpRight, History, MousePointerClick, Play, RefreshCw, Search, Syringe, Trophy,
} from "lucide-react";
import { fmtInt, fmtDec, safeText, agoText, fmtWhen } from "@/lib/seoSafeRender";
import { LiveDot, RawPayloadDrawer } from "./SeoSafeUi";
import { FxCounter } from "./SeoLiveFx";
import { useSeoMotion } from "./SeoMotion";
import { useSeoRealtime } from "@/hooks/useSeoRealtime";

type EventKind = "clicks" | "ranking" | "ctr" | "keyword" | "change";

interface WinEvent {
  id: string;
  kind: EventKind;
  title: string;
  subject: string;
  metric: string;
  before: number | null;
  after: number | null;
  unit: "clicks" | "position" | "pct" | "none";
  lowerIsBetter: boolean;
  at: string | null;
  note?: string | null;
  raw: unknown;
}

const KIND_META: Record<EventKind, { label: string; icon: any; cls: string }> = {
  clicks: { label: "Clicks", icon: MousePointerClick, cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ranking: { label: "Ranking", icon: ArrowUpRight, cls: "bg-sky-100 text-sky-800 border-sky-200" },
  ctr: { label: "CTR", icon: Trophy, cls: "bg-violet-100 text-violet-800 border-violet-200" },
  keyword: { label: "Keyword", icon: Search, cls: "bg-amber-100 text-amber-800 border-amber-200" },
  change: { label: "Injected change", icon: Syringe, cls: "bg-slate-100 text-slate-800 border-slate-200" },
};

const fmtVal = (v: number | null, unit: WinEvent["unit"]) => {
  if (v == null) return "—";
  if (unit === "clicks") return fmtInt(v, "0");
  if (unit === "position") return fmtDec(v, 2);
  if (unit === "pct") return `${fmtDec(v, 2)}%`;
  return fmtDec(v, 2);
};

export default function SeoWinTimeline() {
  const m = useSeoMotion();
  const [wins, setWins] = useState<any>(null);
  const [impact, setImpact] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<EventKind | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const [updated, setUpdated] = useState<string | null>(null);

  const call = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("seo-intel-control", { body: { action, ...extra } });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error(safeText((data as any).error));
    return data as any;
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [w, i] = await Promise.all([call("wins_report"), call("impact_report")]);
      setWins(w); setImpact(i); setErr(null); setUpdated(new Date().toISOString());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [call]);

  useEffect(() => { load(); }, [load]);
  const rt = useSeoRealtime(() => load(), ["seo_intel_experiments", "seo_intel_pages", "seo_intel_keywords"]);

  const events = useMemo<WinEvent[]>(() => {
    const out: WinEvent[] = [];

    for (const p of (wins?.page_wins ?? []) as any[]) {
      const subject = String(p.title ?? p.path ?? "page");
      if (p.click_delta != null && Number(p.click_delta) > 0) {
        out.push({
          id: `pc-${p.path}`, kind: "clicks", title: "Page gained clicks", subject,
          metric: "Clicks", before: p.prev_clicks ?? null, after: p.clicks ?? null,
          unit: "clicks", lowerIsBetter: false, at: p.updated_at ?? null, note: p.path, raw: p,
        });
      }
      if (p.position_gain != null && Number(p.position_gain) > 0) {
        out.push({
          id: `pp-${p.path}`, kind: "ranking", title: "Page moved up in Google", subject,
          metric: "Average position", before: p.prev_avg_position ?? null, after: p.avg_position ?? null,
          unit: "position", lowerIsBetter: true, at: p.updated_at ?? null, note: p.path, raw: p,
        });
      }
      if (p.ctr_pct != null && Number(p.ctr_pct) > 0) {
        out.push({
          id: `pr-${p.path}`, kind: "ctr", title: "Page CTR improved", subject,
          metric: "CTR", before: p.prev_ctr == null ? null : Number(p.prev_ctr) * 100,
          after: p.ctr == null ? null : Number(p.ctr) * 100,
          unit: "pct", lowerIsBetter: false, at: p.updated_at ?? null, note: p.path, raw: p,
        });
      }
    }

    for (const k of (wins?.keyword_wins ?? []) as any[]) {
      out.push({
        id: `kw-${k.keyword}-${k.target_path ?? ""}`, kind: "keyword",
        title: k.entered_top3 ? "Keyword entered the top 3" : k.entered_top10 ? "Keyword entered page 1" : "Keyword moved up",
        subject: String(k.keyword ?? "keyword"), metric: "Position",
        before: k.previous_position ?? null, after: k.current_position ?? null,
        unit: "position", lowerIsBetter: true, at: k.checked_at ?? null, note: k.target_path, raw: k,
      });
    }

    for (const e of (impact?.experiments ?? []) as any[]) {
      out.push({
        id: `ex-${e.id}`, kind: "change", title: `Change applied · ${safeText(e.change_type, "edit")}`,
        subject: String(e.path ?? e.keyword ?? "site"), metric: "Position after change",
        before: e.baseline_position == null ? null : Number(e.baseline_position),
        after: e.measured_position == null ? (e.current_position == null ? null : Number(e.current_position)) : Number(e.measured_position),
        unit: "position", lowerIsBetter: true,
        at: e.changed_on ?? e.created_at ?? null,
        note: `${safeText(e.change_summary, "")} ${e.outcome ? `· outcome ${safeText(e.outcome)}` : "· awaiting measurement"}`,
        raw: e,
      });
    }

    return out.sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
  }, [wins, impact]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) =>
      (kind === "all" || e.kind === kind) &&
      (!needle || [e.title, e.subject, e.metric, e.note].some((v) => String(v ?? "").toLowerCase().includes(needle))));
  }, [events, q, kind]);

  const active = useMemo(() => filtered.find((e) => e.id === selected) ?? filtered[0] ?? null, [filtered, selected]);
  const delta = active && active.before != null && active.after != null
    ? Number((active.after - active.before).toFixed(4)) : null;
  const improved = delta == null ? null : active!.lowerIsBetter ? delta < 0 : delta > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-emerald-600" />
              Win event timeline
              <LiveDot live={rt.connected} tone={rt.connected ? "emerald" : "muted"} />
            </CardTitle>
            <CardDescription>
              Every recorded metric change with its before and after value. Pick an event to replay it.
              {" "}{fmtInt(events.length, "0")} events · synced {agoText(updated)}.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <RawPayloadDrawer title="wins_report + impact_report" payload={{ wins, impact }} />
            <Button size="sm" variant="outline" disabled={busy} onClick={load}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {err && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{safeText(err)}</div>}

        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events by page, keyword or metric…" className="h-9 max-w-sm" />
          {(["all", "clicks", "ranking", "ctr", "keyword", "change"] as const).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k as any)}>
              {k === "all" ? "All" : KIND_META[k as EventKind].label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <ScrollArea className="h-[520px] rounded-md border">
            <div className="divide-y">
              {filtered.map((e) => {
                const meta = KIND_META[e.kind];
                const isActive = active?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => { setSelected(e.id); setReplay((r) => r + 1); }}
                    className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${isActive ? "bg-emerald-50/70" : ""}`}
                  >
                    <span className={`mt-0.5 rounded-md border p-1.5 ${meta.cls}`}>
                      <meta.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{e.title}</span>
                        <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{e.subject}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {e.metric}: {fmtVal(e.before, e.unit)} → {fmtVal(e.after, e.unit)} · {agoText(e.at)}
                      </span>
                    </span>
                  </button>
                );
              })}
              {!filtered.length && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {busy ? "Building the timeline…" : "No recorded events match this filter yet."}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {active && (
                <motion.div
                  key={`${active.id}-${replay}`}
                  initial={{ opacity: 0, scale: m.intensity > 0 ? 0.97 : 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: m.dur(0.3) }}
                  className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4"
                >
                  {m.intensity > 0 && (
                    <motion.span
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                      animate={{ x: ["0%", "420%"] }}
                      transition={{ duration: m.dur(1.6), repeat: m.repeat, ease: "linear" }}
                    />
                  )}
                  <div className="relative">
                    <Badge variant="outline" className={`text-[10px] ${KIND_META[active.kind].cls}`}>
                      {KIND_META[active.kind].label}
                    </Badge>
                    <h4 className="mt-2 text-sm font-semibold">{active.title}</h4>
                    <p className="truncate text-xs text-muted-foreground">{active.subject}</p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md border bg-card p-2">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Before</div>
                        <div className="font-mono text-lg font-semibold tabular-nums">{fmtVal(active.before, active.unit)}</div>
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                        <div className="text-[10px] uppercase tracking-wide text-emerald-700">After</div>
                        <div className="font-mono text-lg font-semibold tabular-nums text-emerald-800">
                          <FxCounter
                            value={active.after}
                            from={active.before ?? undefined}
                            replay={replay}
                            format={(v) => fmtVal(v, active.unit)}
                          />
                        </div>
                      </div>
                    </div>

                    {delta != null && (
                      <div className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${improved ? "text-emerald-700" : "text-red-700"}`}>
                        {improved ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {active.lowerIsBetter
                          ? `${fmtDec(Math.abs(delta), 2)} places ${improved ? "better" : "worse"}`
                          : `${improved ? "+" : ""}${fmtVal(delta, active.unit)}`}
                      </div>
                    )}

                    <p className="mt-2 text-[11px] text-muted-foreground">Recorded {fmtWhen(active.at)}</p>
                    {active.note && <p className="mt-1 break-words text-[11px] text-muted-foreground">{safeText(active.note)}</p>}

                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setReplay((r) => r + 1)}>
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Replay animation
                      </Button>
                      <RawPayloadDrawer title="Event record" payload={active.raw} label="Raw event" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!active && (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                Select an event to replay it.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
