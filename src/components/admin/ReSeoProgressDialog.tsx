import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReseoItem {
  id: string;
  page_type: string;
  slug: string;
  url: string;
  page_name: string | null;
  status: string;
  stage: string | null;
  old_primary_keyword: string | null;
  new_primary_keyword: string | null;
  secondary_keyword: string | null;
  search_intent: string | null;
  rewrite_applied: boolean | null;
  score_before: number | null;
  score_after: number | null;
  error: string | null;
  attempts: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  runId: string | null;
  onCompleted?: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  reading: "Reading page",
  researching: "Researching competitors + keywords",
  generating: "Picking primary keyword & building SEO layers",
  saving: "Saving optimized SEO",
  done: "Done",
};

const stageColor = (s: string) => {
  if (s === "done") return "bg-green-500";
  if (s === "failed") return "bg-red-500";
  if (s === "running") return "bg-blue-500";
  return "bg-slate-300";
};

export default function ReSeoProgressDialog({ open, onOpenChange, runId, onCompleted }: Props) {
  const [run, setRun] = useState<any>(null);
  const [items, setItems] = useState<ReseoItem[]>([]);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!open || !runId) return;
    notifiedRef.current = false;
    let cancelled = false;

    const tick = async () => {
      const { data, error } = await supabase.functions.invoke("seo-reoptimize", {
        method: "GET" as any,
        body: undefined,
        // supabase-js doesn't natively support GET query params via invoke; call via fetch
      } as any).catch(() => ({ data: null, error: null } as any));

      // Fallback via direct fetch (invoke uses POST). Use direct URL with anon key.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const resp = await fetch(
          `https://mttoiqruzzxooveooldo.supabase.co/functions/v1/seo-reoptimize?run_id=${runId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!resp.ok) return;
        const j = await resp.json();
        if (cancelled) return;
        setRun(j.run);
        setItems(j.items || []);
        if (j.run?.status === "completed" && !notifiedRef.current) {
          notifiedRef.current = true;
          onCompleted?.();
        }
      } catch { /* ignore */ }
    };

    tick();
    const iv = setInterval(tick, 2500);
    return () => { cancelled = true; clearInterval(iv); };
  }, [open, runId, onCompleted]);

  const totals = useMemo(() => {
    const total = run?.total_items || items.length || 0;
    const done = items.filter((i) => i.status === "done").length;
    const failed = items.filter((i) => i.status === "failed").length;
    const running = items.filter((i) => i.status === "running").length;
    const queued = items.filter((i) => i.status === "queued").length;
    return { total, done, failed, running, queued, pct: total ? Math.round(((done + failed) / total) * 100) : 0 };
  }, [items, run]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Re-SEO Live Monitor
          </DialogTitle>
          <DialogDescription>
            Each page: read → research → pick ONE primary keyword → metadata + schema + additive AEO block (existing content preserved) → save. Runs in background — safe to close, work continues on the server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-3">
              <Badge variant="secondary">Total {totals.total}</Badge>
              <Badge className="bg-blue-500">Running {totals.running}</Badge>
              <Badge className="bg-slate-500">Queued {totals.queued}</Badge>
              <Badge className="bg-green-500">Done {totals.done}</Badge>
              {totals.failed > 0 && <Badge className="bg-red-500">Failed {totals.failed}</Badge>}
            </div>
            <span className="font-semibold">{totals.pct}%</span>
          </div>
          <Progress value={totals.pct} />

          <ScrollArea className="h-[420px] rounded-[0.25rem] border">
            <div className="divide-y">
              {items.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground text-center">Loading queue…</div>
              )}
              {items.map((it) => (
                <div key={it.id} className="p-3 flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${stageColor(it.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{it.page_name || it.slug}</span>
                      <Badge variant="outline" className="text-xs">{it.page_type}</Badge>
                      {it.rewrite_applied && <Badge className="text-xs bg-amber-500">content added</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{it.url}</div>
                    {it.status === "running" && it.stage && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />{STAGE_LABEL[it.stage] || it.stage}
                      </div>
                    )}
                    {(it.old_primary_keyword || it.new_primary_keyword) && (
                      <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground line-through">{it.old_primary_keyword || "(none)"}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-green-700">{it.new_primary_keyword || "…"}</span>
                        {it.secondary_keyword && (
                          <span className="text-slate-500">+ {it.secondary_keyword}</span>
                        )}
                      </div>
                    )}
                    {it.error && (
                      <div className="text-xs text-red-600 mt-1">{it.error}</div>
                    )}
                  </div>
                  <div className="text-xs text-right">
                    {it.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {it.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                    {it.score_after != null && (
                      <div className="text-slate-600 mt-1">
                        {it.score_before ?? "—"} → <strong>{it.score_after}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
