import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Sparkles, ExternalLink, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string | null;
  pageName?: string | null;
}

interface Item {
  id: string;
  run_id: string;
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
  before_snapshot: any;
  after_snapshot: any;
  competitors: any;
  score_before: number | null;
  score_after: number | null;
  error: string | null;
  attempts: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

const STATUS_TONE: Record<string, string> = {
  done: "bg-green-500",
  running: "bg-blue-500",
  queued: "bg-slate-400",
  failed: "bg-red-500",
};

function Diff({ label, before, after }: { label: string; before?: string; after?: string }) {
  if (!before && !after) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded border border-red-200 bg-red-50/50 p-2 text-xs">
          <p className="text-[10px] uppercase text-red-700 font-semibold mb-1">Before</p>
          <p className="text-slate-700 break-words">{before || <span className="italic text-slate-400">(empty)</span>}</p>
        </div>
        <div className="rounded border border-green-200 bg-green-50/50 p-2 text-xs">
          <p className="text-[10px] uppercase text-green-700 font-semibold mb-1">After</p>
          <p className="text-slate-800 break-words">{after || <span className="italic text-slate-400">(empty)</span>}</p>
        </div>
      </div>
    </div>
  );
}

export default function ReSeoReportDialog({ open, onOpenChange, slug, pageName }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!open || !slug) return;
    setLoading(true);
    setActiveIdx(0);
    (async () => {
      const { data } = await supabase
        .from("seo_reoptimization_items")
        .select("*")
        .eq("slug", slug)
        .order("created_at", { ascending: false })
        .limit(15);
      setItems((data || []) as any);
      setLoading(false);
    })();
  }, [open, slug]);

  const active = items[activeIdx];
  const before = active?.before_snapshot || {};
  const after = active?.after_snapshot || {};
  const competitors: any[] = Array.isArray(active?.competitors) ? active!.competitors : [];
  const scoreDelta = (active?.score_after ?? 0) - (active?.score_before ?? 0);

  const issuesFixed: string[] = [];
  if (active?.status === "done") {
    if (!before.title && after.title) issuesFixed.push("Meta title generated");
    else if (before.title !== after.title) issuesFixed.push("Meta title rewritten");
    if (!before.description && after.description) issuesFixed.push("Meta description generated");
    else if (before.description !== after.description) issuesFixed.push("Meta description rewritten");
    if (!before.h1 && after.h1) issuesFixed.push("H1 added");
    else if (before.h1 !== after.h1) issuesFixed.push("H1 rewritten");
    if ((after.outline?.length || 0) > 0) issuesFixed.push(`${after.outline.length} H2/H3 sections drafted`);
    if ((after.faq_count || 0) > 0) issuesFixed.push(`${after.faq_count} FAQ Q&A pairs generated`);
    if (active.rewrite_applied) issuesFixed.push("Intro content rewritten to match keyword intent");
    if (active.new_primary_keyword && active.new_primary_keyword !== active.old_primary_keyword) {
      issuesFixed.push(`Primary keyword switched from "${active.old_primary_keyword || "(none)"}" to "${active.new_primary_keyword}"`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Re-SEO Report
          </DialogTitle>
          <DialogDescription>
            Detailed before/after report for <span className="font-mono">{pageName || slug}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !active ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No Re-SEO run has processed this page yet. Click <strong>Re-SEO</strong> on the row to start one.
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-4">
              {items.length > 1 && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {items.map((it, i) => (
                    <button
                      key={it.id}
                      onClick={() => setActiveIdx(i)}
                      className={`px-2 py-1 rounded border ${i === activeIdx ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                    >
                      {new Date(it.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {it.status}
                    </button>
                  ))}
                </div>
              )}

              {/* Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STATUS_TONE[active.status] || "bg-slate-400"}`} />
                      Status: <span className="capitalize">{active.status}</span>
                      {active.rewrite_applied && <Badge className="bg-amber-500 text-white text-[10px]">Content rewritten</Badge>}
                    </CardTitle>
                    <a href={active.url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                      Visit page <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4 text-xs">
                  <div><p className="text-muted-foreground">Last Re-SEO</p><p className="font-medium">{active.finished_at ? new Date(active.finished_at).toLocaleString("en-IN") : active.started_at ? new Date(active.started_at).toLocaleString("en-IN") : "—"}</p></div>
                  <div><p className="text-muted-foreground">Optimized by</p><p className="font-medium">AI (single-keyword pipeline)</p></div>
                  <div>
                    <p className="text-muted-foreground">Score</p>
                    <p className="font-medium">
                      {active.score_before ?? "—"} <ArrowRight className="inline h-3 w-3" /> <span className="text-green-700">{active.score_after ?? "—"}</span>
                      {active.score_after != null && active.score_before != null && (
                        <span className={`ml-1 ${scoreDelta >= 0 ? "text-green-600" : "text-red-600"}`}>({scoreDelta >= 0 ? "+" : ""}{scoreDelta})</span>
                      )}
                    </p>
                  </div>
                  <div><p className="text-muted-foreground">Search intent</p><p className="font-medium capitalize">{active.search_intent || "—"}</p></div>
                </CardContent>
              </Card>

              {/* Keywords */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Keyword decision</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">Primary:</span>
                    <span className="line-through text-slate-500">{active.old_primary_keyword || "(none)"}</span>
                    <ArrowRight className="h-3 w-3" />
                    <Badge className="bg-green-600 text-white">{active.new_primary_keyword || "—"}</Badge>
                  </div>
                  {active.secondary_keyword && (
                    <div className="flex items-center gap-2"><span className="text-muted-foreground">Secondary:</span><Badge variant="outline">{active.secondary_keyword}</Badge></div>
                  )}
                </CardContent>
              </Card>

              {/* Content diff */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Content updates</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Diff label="Meta title" before={before.title} after={after.title} />
                  <Diff label="Meta description" before={before.description} after={after.description} />
                  <Diff label="H1" before={before.h1} after={after.h1} />
                  {after.outline?.length ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">New H2/H3 outline</p>
                      <ul className="text-xs space-y-1 list-disc pl-5">
                        {after.outline.slice(0, 12).map((h: any, i: number) => (
                          <li key={i}><span className="text-slate-400 mr-1 uppercase text-[9px]">{h.level}</span>{h.text}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {after.faq_count > 0 && (
                    <p className="text-xs text-muted-foreground"><CheckCircle2 className="inline h-3 w-3 text-green-500 mr-1" />Generated {after.faq_count} FAQ pairs (visible on live page)</p>
                  )}
                </CardContent>
              </Card>

              {/* Issues fixed */}
              {issuesFixed.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Issues fixed & improvements</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      {issuesFixed.map((f, i) => (
                        <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" /><span>{f}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Competitors */}
              {competitors.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Top competitors analyzed</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      {competitors.map((c: any, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-slate-500">{i + 1}.</span>
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{c.title || c.url}</a>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Error */}
              {active.status === "failed" && active.error && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-700"><XCircle className="h-4 w-4" /> Failure reason</CardTitle></CardHeader>
                  <CardContent><p className="text-xs text-red-800 whitespace-pre-wrap">{active.error}</p><p className="text-[11px] text-red-600 mt-1">Attempts: {active.attempts}</p></CardContent>
                </Card>
              )}

              {/* Remaining recommendations */}
              {active.status === "done" && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Remaining recommendations</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1 list-disc pl-5 text-slate-700">
                      <li>Publish 2–3 supporting internal links to this page from related hubs.</li>
                      <li>Add 1 original image with descriptive ALT text using the primary keyword.</li>
                      <li>Request re-indexing in Google Search Console for the updated URL.</li>
                      {scoreDelta < 15 && <li>Consider a manual edit pass to deepen the intro or add unique data points.</li>}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
