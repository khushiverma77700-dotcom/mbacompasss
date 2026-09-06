// Website SEO health meter — one accurate, explainable number for the whole site.
//
// Everything here is read from the engine's own tables through the
// `health_meter` control action: average health across scored pages, average
// AEO score, how much it moved since the last capture, how many fixes are
// applied, how many recommendations are still pending, and the measured score
// gain per applied fix. Nothing is estimated in the UI.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Activity, ArrowDownRight, ArrowUpRight, Camera, Gauge, Loader2, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Snapshot {
  avg_health: number | null;
  avg_aeo: number | null;
  pages_scored: number;
  pages_total: number;
  pages_below_70: number;
  issues_open: number;
  applied_total: number;
  pending_total: number;
  pending_new: number;
  pending_review: number;
  pending_approved: number;
  rejected_total: number;
  applied_24h: number;
  delta_health: number | null;
  measured_fixes: number;
  avg_score_gain_per_fix: number | null;
  by_page_type: Record<string, { pages: number; avg_health: number | null; avg_aeo: number | null }>;
}

interface HistoryRow {
  captured_at: string;
  avg_health: number | null;
  avg_aeo: number | null;
  applied_total: number | null;
  pending_total: number | null;
  reason: string | null;
}

const band = (score: number | null) => {
  if (score == null) return { label: "Not scored yet", cls: "bg-muted text-muted-foreground" };
  if (score >= 85) return { label: "Excellent", cls: "bg-emerald-100 text-emerald-800" };
  if (score >= 70) return { label: "Good", cls: "bg-sky-100 text-sky-800" };
  if (score >= 55) return { label: "Needs work", cls: "bg-amber-100 text-amber-800" };
  return { label: "Poor", cls: "bg-red-100 text-red-800" };
};

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-lg border border-border bg-background/60 p-3">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-[1.375rem] font-semibold leading-tight">{value}</p>
    {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
  </div>
);

export default function SeoHealthMeter() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [busy, setBusy] = useState<"load" | "capture" | null>("load");

  const load = useCallback(async (capture = false) => {
    setBusy(capture ? "capture" : "load");
    try {
      const { data, error } = await supabase.functions.invoke("seo-intel-control", {
        body: { action: "health_meter", capture },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(String((data as any).error));
      setSnap((data as any).snapshot as Snapshot);
      setHistory(((data as any).history ?? []) as HistoryRow[]);
      if (capture) toast.success("Health score captured — this becomes the new baseline for the next change.");
    } catch (e) {
      toast.error((e as Error).message || "Could not read the health score");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const health = snap?.avg_health ?? null;
  const tone = band(health);
  const chart = history.map((h) => ({
    at: new Date(h.captured_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    health: h.avg_health == null ? null : Number(h.avg_health),
    aeo: h.avg_aeo == null ? null : Number(h.avg_aeo),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" /> Website SEO health
            </CardTitle>
            <CardDescription>
              Average of every scored page on the site, recalculated from the engine's own page data. It only moves when a page's
              score actually changes, and every capture records what caused the move.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => load(false)}>
              {busy === "load" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1.5">Refresh</span>
            </Button>
            <Button size="sm" disabled={!!busy} onClick={() => load(true)}>
              {busy === "capture" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span className="ml-1.5">Capture</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current overall score</p>
              <p className="text-[2.25rem] font-semibold leading-none">{health == null ? "—" : health.toFixed(1)}</p>
            </div>
            <Badge className={tone.cls}>{tone.label}</Badge>
            {snap?.delta_health != null && (
              <span className={`flex items-center gap-1 text-sm ${snap.delta_health >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {snap.delta_health >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {snap.delta_health >= 0 ? "+" : ""}{snap.delta_health.toFixed(2)} since the last capture
              </span>
            )}
          </div>
          <Progress value={health ?? 0} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Average AEO / answer-engine score" value={snap?.avg_aeo == null ? "—" : snap.avg_aeo.toFixed(1)} hint="Answer-first, FAQ and schema readiness" />
            <Stat label="Pages scored" value={`${snap?.pages_scored ?? 0} of ${snap?.pages_total ?? 0}`} hint={`${snap?.pages_below_70 ?? 0} still below 70`} />
            <Stat label="Fixes applied" value={String(snap?.applied_total ?? 0)} hint={`${snap?.applied_24h ?? 0} in the last 24 hours`} />
            <Stat label="Recommendations pending" value={String(snap?.pending_total ?? 0)} hint={`${snap?.pending_new ?? 0} new · ${snap?.pending_review ?? 0} in review · ${snap?.pending_approved ?? 0} approved`} />
            <Stat label="Open page issues" value={String(snap?.issues_open ?? 0)} hint="Counted from each page's stored issue list" />
            <Stat label="Measured fixes" value={String(snap?.measured_fixes ?? 0)} hint="Fixes whose page was re-scored afterwards" />
            <Stat
              label="Average score gain per fix"
              value={snap?.avg_score_gain_per_fix == null ? "—" : `${snap.avg_score_gain_per_fix >= 0 ? "+" : ""}${snap.avg_score_gain_per_fix.toFixed(2)}`}
              hint="From the measured before/after page scores"
            />
            <Stat label="Rejected" value={String(snap?.rejected_total ?? 0)} hint="Recommendations you turned down" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[1.375rem]">
            <Activity className="h-5 w-5 text-primary" /> Score over time
          </CardTitle>
          <CardDescription>Each point is a capture, with the reason recorded alongside it.</CardDescription>
        </CardHeader>
        <CardContent>
          {chart.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Capture the score at least twice to see the trend. Capturing writes today's number so improvement can be proved later.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="at" tick={{ fontSize: 14 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 14 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="health" name="SEO health" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
                  <Area type="monotone" dataKey="aeo" name="AEO score" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted) / 0.4)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[1.375rem]">Where the score comes from</CardTitle>
          <CardDescription>Average health and AEO score per page family, so a change is always traceable to a group of pages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(snap?.by_page_type ?? {})
            .sort((a, b) => b[1].pages - a[1].pages)
            .map(([type, v]) => (
              <div key={type} className="rounded-lg border border-border p-3">
                <p className="font-medium">{type}</p>
                <p className="text-sm text-muted-foreground">
                  {v.pages} page(s) · health {v.avg_health == null ? "—" : v.avg_health.toFixed(1)} · AEO {v.avg_aeo == null ? "—" : v.avg_aeo.toFixed(1)}
                </p>
              </div>
            ))}
          {!Object.keys(snap?.by_page_type ?? {}).length && (
            <p className="text-sm text-muted-foreground">No page data collected yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
