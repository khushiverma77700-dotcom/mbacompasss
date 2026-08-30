import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ArrowRight, Sparkles, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Target, MessageSquare, FileText, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  long_tail_keywords: string[] | null;
  related_queries: string[] | null;
  keyword_density: Record<string, number> | null;
  full_content_before: string | null;
  full_content_after: string | null;
  content_word_count_before: number | null;
  content_word_count_after: number | null;
  aeo_notes: string | null;
  geo_notes: string | null;
  readability_score: number | null;
  score_before: number | null;
  score_after: number | null;
  error: string | null;
  attempts: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  applied?: boolean;
  applied_at?: string | null;
  discarded?: boolean;
  discarded_at?: string | null;
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
          <p className="text-xs uppercase text-red-700 font-semibold mb-1">Before</p>
          <p className="text-slate-700 break-words whitespace-pre-wrap">{before || <span className="italic text-slate-400">(empty)</span>}</p>
        </div>
        <div className="rounded border border-green-200 bg-green-50/50 p-2 text-xs">
          <p className="text-xs uppercase text-green-700 font-semibold mb-1">After</p>
          <p className="text-slate-800 break-words whitespace-pre-wrap">{after || <span className="italic text-slate-400">(empty)</span>}</p>
        </div>
      </div>
    </div>
  );
}

function DensityBar({ kw, pct, target }: { kw: string; pct: number; target?: boolean }) {
  const inRange = pct >= 2.5 && pct <= 3.5;
  const tone = target
    ? inRange ? "bg-green-500" : pct > 3.5 ? "bg-red-500" : "bg-amber-500"
    : "bg-blue-400";
  const width = Math.min(100, (pct / 5) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium truncate max-w-[60%]" title={kw}>{kw}{target && <span className="ml-1 text-xs text-slate-500">(primary • target 2.5–3.5%)</span>}</span>
        <span className={target ? (inRange ? "text-green-700 font-semibold" : "text-red-600 font-semibold") : "text-slate-600"}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full rounded bg-slate-100 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function ReSeoReportDialog({ open, onOpenChange, slug, pageName }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [actionLoading, setActionLoading] = useState<null | "apply" | "discard">(null);
  const { toast } = useToast();

  const reload = async () => {
    if (!slug) return;
    const { data } = await supabase
      .from("seo_reoptimization_items")
      .select("*")
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(15);
    setItems((data || []) as any);
  };

  useEffect(() => {
    if (!open || !slug) return;
    setLoading(true);
    setActiveIdx(0);
    (async () => { await reload(); setLoading(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slug]);


  const active = items[activeIdx];
  const isPreview = !!active && active.status === "done" && active.applied === false && active.discarded === false;
  const wasDiscarded = !!active?.discarded;

  const handleApply = async () => {
    if (!active) return;
    setActionLoading("apply");
    try {
      const { data, error } = await supabase.functions.invoke("seo-reoptimize", {
        body: { action: "apply", item_id: active.id },
      });
      if (error) throw error;
      const first = (data as any)?.results?.[0];
      if (first?.error) throw new Error(first.error);
      toast({ title: "Changes applied", description: "The proposed SEO updates are now live." });
      await reload();
    } catch (e: any) {
      toast({ title: "Apply failed", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscard = async () => {
    if (!active) return;
    setActionLoading("discard");
    try {
      const { error } = await supabase.functions.invoke("seo-reoptimize", {
        body: { action: "discard", item_id: active.id },
      });
      if (error) throw error;
      toast({ title: "Preview discarded", description: "The proposed changes were not applied." });
      await reload();
    } catch (e: any) {
      toast({ title: "Discard failed", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const before = active?.before_snapshot || {};
  const after = active?.after_snapshot || {};
  const competitors: any[] = Array.isArray(active?.competitors) ? active!.competitors : [];
  const scoreDelta = (active?.score_after ?? 0) - (active?.score_before ?? 0);
  const density = active?.keyword_density || {};
  const longTail = active?.long_tail_keywords || [];
  const relatedQ = active?.related_queries || [];

  const densityEntries = useMemo(() => Object.entries(density).sort(([, a], [, b]) => (b as number) - (a as number)), [density]);
  const primaryDensity = active?.new_primary_keyword ? (density[active.new_primary_keyword] ?? 0) : 0;

  const issuesFixed: string[] = [];
  if (active?.status === "done") {
    if (before.title !== after.title) issuesFixed.push("Meta title rewritten");
    if (before.description !== after.description) issuesFixed.push("Meta description rewritten");
    if (before.h1 !== after.h1) issuesFixed.push("H1 rewritten");
    if ((after.outline?.length || 0) > 0) issuesFixed.push(`${after.outline.length} H2/H3 sections drafted`);
    if ((after.faq_count || 0) > 0) issuesFixed.push(`${after.faq_count} FAQ Q&A pairs generated`);
    if ((active.content_word_count_after || 0) > (active.content_word_count_before || 0))
      issuesFixed.push(`Body content expanded from ${active.content_word_count_before || 0} → ${active.content_word_count_after || 0} words`);
    if (primaryDensity >= 2.5 && primaryDensity <= 3.5) issuesFixed.push(`Primary keyword density in ideal range (${primaryDensity.toFixed(1)}%)`);
    if (longTail.length) issuesFixed.push(`${longTail.length} long-tail keywords woven in`);
    if (relatedQ.length) issuesFixed.push(`${relatedQ.length} "People also ask" queries targeted`);
    if (active.new_primary_keyword && active.new_primary_keyword !== active.old_primary_keyword) {
      issuesFixed.push(`Primary keyword: "${active.old_primary_keyword || "(none)"}" → "${active.new_primary_keyword}"`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Re-SEO Report
          </DialogTitle>
          <DialogDescription>
            Detailed AEO + SEO + GEO before/after report for <span className="font-mono">{pageName || slug}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !active ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No Re-SEO run has processed this page yet. Select it and click <strong>Run Re-SEO</strong>.
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

              {/* Preview / Apply banner */}
              {isPreview && (
                <Card className="border-amber-300 bg-amber-50/60">
                  <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-2">
                      <Eye className="h-4 w-4 text-amber-700 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Preview — changes not yet applied</p>
                        <p className="text-xs text-amber-800">Review the before/after diff below, then choose to apply or discard. Nothing on the live page has changed.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={handleDiscard} disabled={!!actionLoading}>
                        {actionLoading === "discard" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                        Discard
                      </Button>
                      <Button size="sm" onClick={handleApply} disabled={!!actionLoading} className="bg-green-600 hover:bg-green-700 text-white">
                        {actionLoading === "apply" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                        Apply changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {active.applied && active.applied_at && (
                <div className="rounded border border-green-200 bg-green-50/60 px-3 py-2 text-xs text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Applied {new Date(active.applied_at).toLocaleString("en-IN")}
                </div>
              )}
              {wasDiscarded && (
                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Preview discarded {active.discarded_at ? new Date(active.discarded_at).toLocaleString("en-IN") : ""}
                </div>
              )}

              {/* Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STATUS_TONE[active.status] || "bg-slate-400"}`} />
                      Status: <span className="capitalize">{active.status}</span>
                      {active.rewrite_applied && <Badge className="bg-amber-500 text-white text-xs">Content added</Badge>}
                    </CardTitle>
                    <a href={active.url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                      Visit page <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-5 text-xs">
                  <div><p className="text-muted-foreground">Last Re-SEO</p><p className="font-medium">{active.finished_at ? new Date(active.finished_at).toLocaleString("en-IN") : "—"}</p></div>
                  <div><p className="text-muted-foreground">SEO Score</p><p className="font-medium">{active.score_before ?? "—"} <ArrowRight className="inline h-3 w-3" /> <span className="text-green-700">{active.score_after ?? "—"}</span> {active.score_after != null && active.score_before != null && (<span className={`ml-1 ${scoreDelta >= 0 ? "text-green-600" : "text-red-600"}`}>({scoreDelta >= 0 ? "+" : ""}{scoreDelta})</span>)}</p></div>
                  <div><p className="text-muted-foreground">Word count</p><p className="font-medium">{active.content_word_count_before ?? 0} <ArrowRight className="inline h-3 w-3" /> <span className="text-green-700">{active.content_word_count_after ?? 0}</span></p></div>
                  <div><p className="text-muted-foreground">Readability</p><p className="font-medium">{active.readability_score ?? "—"}/100</p></div>
                  <div><p className="text-muted-foreground">Search intent</p><p className="font-medium capitalize">{active.search_intent || "—"}</p></div>
                </CardContent>
              </Card>

              {/* Keywords + Density */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Keyword strategy & density</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">Primary:</span>
                    {active.old_primary_keyword && <span className="line-through text-slate-500">{active.old_primary_keyword}</span>}
                    {active.old_primary_keyword && <ArrowRight className="h-3 w-3" />}
                    <Badge className="bg-green-600 text-white">{active.new_primary_keyword || "—"}</Badge>
                    {active.secondary_keyword && (<><span className="text-muted-foreground ml-3">Secondary:</span><Badge variant="outline">{active.secondary_keyword}</Badge></>)}
                  </div>

                  {densityEntries.length > 0 && (
                    <div className="grid gap-2 md:grid-cols-2 mt-2">
                      {densityEntries.map(([kw, pct]) => (
                        <DensityBar key={kw} kw={kw} pct={pct as number} target={kw === active.new_primary_keyword} />
                      ))}
                    </div>
                  )}

                  {longTail.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Long-tail keywords used</p>
                      <div className="flex flex-wrap gap-1">
                        {longTail.map((k) => <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>)}
                      </div>
                    </div>
                  )}

                  {relatedQ.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Most-searched queries targeted</p>
                      <ul className="space-y-0.5">
                        {relatedQ.map((q, i) => <li key={i} className="text-xs text-slate-700">• {q}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Content diff — tabs */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Content changes</CardTitle></CardHeader>
                <CardContent>
                  <Tabs defaultValue="meta">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="meta" className="text-xs">Meta / H1</TabsTrigger>
                      <TabsTrigger value="body" className="text-xs">Full body</TabsTrigger>
                      <TabsTrigger value="outline" className="text-xs">Outline & FAQ</TabsTrigger>
                      <TabsTrigger value="assets" className="text-xs">ALT & Links</TabsTrigger>
                    </TabsList>

                    <TabsContent value="meta" className="space-y-3 mt-3">
                      <Diff label="Meta title" before={before.title} after={after.title} />
                      <Diff label="Meta description" before={before.description} after={after.description} />
                      <Diff label="H1" before={before.h1} after={after.h1} />
                    </TabsContent>

                    <TabsContent value="body" className="space-y-3 mt-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded border border-red-200 bg-red-50/50 p-3 text-xs">
                          <p className="text-xs uppercase text-red-700 font-semibold mb-1">Before ({active.content_word_count_before ?? 0} words)</p>
                          <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap text-slate-700" dangerouslySetInnerHTML={{ __html: (active.full_content_before || before.body_html || "<span class='italic text-slate-400'>(empty)</span>") }} />
                        </div>
                        <div className="rounded border border-green-200 bg-green-50/50 p-3 text-xs">
                          <p className="text-xs uppercase text-green-700 font-semibold mb-1">After ({active.content_word_count_after ?? 0} words • AEO/SEO/GEO optimized, original content kept)</p>
                          <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap text-slate-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: (active.full_content_after || after.body_html || "<span class='italic text-slate-400'>(empty)</span>") }} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="outline" className="space-y-3 mt-3">
                      {after.outline?.length ? (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">New H2/H3 outline</p>
                          <ul className="text-xs space-y-1 list-disc pl-5">
                            {after.outline.map((h: any, i: number) => (
                              <li key={i}><span className="text-slate-400 mr-1 uppercase text-xs">{h.level}</span>{h.text}</li>
                            ))}
                          </ul>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">No outline generated.</p>}
                      {Array.isArray(after.faq) && after.faq.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-3">FAQ Q&A</p>
                          <div className="space-y-2">
                            {after.faq.map((f: any, i: number) => (
                              <div key={i} className="rounded border p-2 bg-slate-50/40">
                                <p className="text-xs font-medium text-slate-800">Q: {f.question}</p>
                                <p className="text-xs text-slate-600 mt-1">A: {f.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="assets" className="space-y-3 mt-3">
                      {after.alt_text_suggestions?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Image ALT suggestions</p>
                          <ul className="text-xs space-y-1 list-disc pl-5">
                            {after.alt_text_suggestions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                      {after.internal_link_suggestions?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Internal link suggestions</p>
                          <ul className="text-xs space-y-1 list-disc pl-5">
                            {after.internal_link_suggestions.map((l: any, i: number) => <li key={i}><span className="font-medium">{l.anchor}</span> → <span className="text-slate-500 font-mono">{l.url}</span></li>)}
                          </ul>
                        </div>
                      )}
                      {after.eeat_notes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">E-E-A-T notes</p>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap">{after.eeat_notes}</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* AEO + GEO */}
              {(active.aeo_notes || active.geo_notes) && (
                <div className="grid gap-3 md:grid-cols-2">
                  {active.aeo_notes && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">AEO — Answer Engine Optimization</CardTitle></CardHeader>
                      <CardContent><p className="text-xs text-slate-700 whitespace-pre-wrap">{active.aeo_notes}</p></CardContent>
                    </Card>
                  )}
                  {active.geo_notes && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">GEO — Generative Engine Optimization</CardTitle></CardHeader>
                      <CardContent><p className="text-xs text-slate-700 whitespace-pre-wrap">{active.geo_notes}</p></CardContent>
                    </Card>
                  )}
                </div>
              )}

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

              {active.status === "failed" && active.error && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-700"><XCircle className="h-4 w-4" /> Failure reason</CardTitle></CardHeader>
                  <CardContent><p className="text-xs text-red-800 whitespace-pre-wrap">{active.error}</p><p className="text-xs text-red-600 mt-1">Attempts: {active.attempts}</p></CardContent>
                </Card>
              )}

              {active.status === "done" && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Remaining recommendations</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1 list-disc pl-5 text-slate-700">
                      <li>Publish 2–3 supporting internal links to this page from related hubs.</li>
                      <li>Add 1 original image with descriptive ALT text using the primary keyword.</li>
                      <li>Request re-indexing in Google Search Console for the updated URL.</li>
                      {primaryDensity > 3.5 && <li className="text-red-600">Primary keyword density is above 3.5% — consider reducing occurrences slightly.</li>}
                      {primaryDensity < 2.5 && primaryDensity > 0 && <li className="text-amber-600">Primary keyword density is below 2.5% — add 1-2 natural occurrences.</li>}
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
