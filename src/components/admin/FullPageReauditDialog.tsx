/**
 * Re-audit the FULL page (parent record + all sub-sections / courses / faculty)
 * after content has been authored. Produces ONE unified meta title, meta
 * description, H1, keyword set, schema and canonical for the entire page.
 *
 * - Colleges:  pulls college + every college_sections row
 * - Institutes: pulls institute + every course + every faculty profile
 *
 * Synthesises a single `pageData.content` blob so the existing
 * `auto-seo-engine` (`mode: "full_audit"`) judges the WHOLE page rather than
 * just the bare parent row.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, XCircle, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildStoredSeoSnapshot,
  mergeKeywordBuckets,
  saveSeoSnapshot,
  type SEOContentType,
  type SEOSuggestionsPayload,
} from "@/lib/seoAutomation";

type EntityKind = "college" | "institute";

interface AuditCheck {
  id: string;
  label: string;
  category: "technical" | "onpage" | "content" | "internal_linking";
  status: "pass" | "warn" | "fail" | "pending";
  detail: string;
  autoFixAvailable: boolean;
  fixDescription?: string;
}

interface AuditResult {
  pageId: string;
  pageName: string;
  contentType: SEOContentType;
  slug: string;
  overallScore: number;
  checks: AuditCheck[];
  currentValues: Record<string, any>;
  suggestedValues: Record<string, any>;
}

interface Props {
  kind: EntityKind;
  entityId: string;
  entityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: () => void;
}

const stripHtml = (s?: string) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Pull the parent + all child rows and flatten into a single content blob. */
async function gatherFullPageData(kind: EntityKind, entityId: string) {
  if (kind === "college") {
    const { data: college, error } = await supabase.from("colleges").select("*").eq("id", entityId).maybeSingle();
    if (error || !college) throw new Error(error?.message || "College not found");

    const { data: sections } = await supabase
      .from("college_sections")
      .select("section_type, title, content, data, sort_order")
      .eq("college_id", entityId)
      .order("sort_order", { ascending: true });

    const sectionText = (sections || [])
      .map((s) => {
        const dataText = s.data ? JSON.stringify(s.data) : "";
        return `## ${s.title || s.section_type}\n${stripHtml(s.content || "")}\n${stripHtml(dataText)}`;
      })
      .join("\n\n");

    const fullContent = [
      stripHtml(college.description),
      stripHtml(college.admission_process),
      sectionText,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      contentType: "college" as SEOContentType,
      pageData: { ...college, content: fullContent },
      sectionCount: sections?.length || 0,
      childLabel: `${sections?.length || 0} content section${(sections?.length || 0) === 1 ? "" : "s"}`,
    };
  }

  // institute
  const { data: institute, error } = await supabase.from("institutes").select("*").eq("id", entityId).maybeSingle();
  if (error || !institute) throw new Error(error?.message || "Institute not found");

  const [{ data: courses }, { data: faculty }] = await Promise.all([
    supabase
      .from("courses")
      .select("name, description, duration, fees, mode, eligibility, highlights, curriculum")
      .eq("institute_id", entityId),
    supabase
      .from("faculty")
      .select("name, designation, qualification, experience, specialization, bio")
      .eq("institute_id", entityId),
  ]);

  const coursesText = (courses || [])
    .map(
      (c) =>
        `## Course: ${c.name}\nMode: ${c.mode || ""} • Duration: ${c.duration || ""} • Fees: ${c.fees ?? ""}\nEligibility: ${c.eligibility || ""}\n${stripHtml(c.description)}\nHighlights: ${(c.highlights || []).join(", ")}\nCurriculum: ${(c.curriculum || []).join(", ")}`,
    )
    .join("\n\n");

  const facultyText = (faculty || [])
    .map(
      (f) =>
        `## Faculty: ${f.name} (${f.designation || ""})\n${f.qualification || ""} • ${f.experience || ""} • ${f.specialization || ""}\n${stripHtml(f.bio)}`,
    )
    .join("\n\n");

  const fullContent = [stripHtml(institute.description), coursesText, facultyText].filter(Boolean).join("\n\n");

  return {
    contentType: "institute" as SEOContentType,
    pageData: { ...institute, content: fullContent },
    sectionCount: (courses?.length || 0) + (faculty?.length || 0),
    childLabel: `${courses?.length || 0} course${(courses?.length || 0) === 1 ? "" : "s"} • ${faculty?.length || 0} faculty`,
  };
}

const STATUS_ICON: Record<AuditCheck["status"], JSX.Element> = {
  pass: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  fail: <XCircle className="w-4 h-4 text-rose-600" />,
  pending: <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />,
};

const CATEGORY_LABEL: Record<AuditCheck["category"], string> = {
  technical: "🧠 Technical SEO",
  onpage: "🏷️ On-Page SEO",
  content: "✍️ Content SEO",
  internal_linking: "🔗 Internal Linking",
};

const FullPageReauditDialog = ({ kind, entityId, entityName, open, onOpenChange, onApplied }: Props) => {
  const { toast } = useToast();
  const [stage, setStage] = useState<"idle" | "gathering" | "auditing" | "ready" | "applying" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof gatherFullPageData>> | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());

  const reset = () => {
    setStage("idle");
    setResult(null);
    setBundle(null);
    setApproved(new Set());
    setProgress(0);
  };

  const runAudit = async () => {
    try {
      setStage("gathering");
      setProgress(15);
      const b = await gatherFullPageData(kind, entityId);
      setBundle(b);

      setStage("auditing");
      setProgress(50);
      const { data, error } = await supabase.functions.invoke("auto-seo-engine", {
        body: {
          mode: "full_audit",
          contentType: b.contentType,
          pageId: entityId,
          pageData: b.pageData,
        },
      });
      if (error) throw error;

      const r = data as AuditResult;
      setResult(r);

      // Default-approve every fixable, non-passing check
      setApproved(new Set(r.checks.filter((c) => c.autoFixAvailable && c.status !== "pass").map((c) => c.id)));
      setProgress(100);
      setStage("ready");
    } catch (e: any) {
      toast({ title: "Audit failed", description: e?.message || "Could not run full-page audit", variant: "destructive" });
      setStage("idle");
      setProgress(0);
    }
  };

  const toggle = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyFixes = async () => {
    if (!result || !bundle) return;
    setStage("applying");
    try {
      const s = result.suggestedValues || {};
      const table = kind === "college" ? "colleges" : "institutes";
      const update: Record<string, any> = {};

      // Only write the unified single-source-of-truth fields the user opted into.
      const want = (id: string) => approved.has(id);
      if (want("meta_title") && s.meta_title) update.meta_title = s.meta_title;
      if (want("meta_description") && s.meta_description) update.meta_description = s.meta_description;
      if (want("h1_tag") && s.h1_tag) update.h1_tag = s.h1_tag;
      if ((want("keywords") || want("keyword_density") || want("lsi_keywords")) && Array.isArray(s.keywords)) {
        update.keywords = s.keywords;
      }
      if (want("slug") && s.slug) update.slug = s.slug;

      if (Object.keys(update).length > 0) {
        const { error } = await (supabase as any).from(table).update(update).eq("id", entityId);
        if (error) throw error;
      }

      // Persist the unified SEO snapshot (canonical + schema + social + internal links).
      // We always store this so the front-end SEOHead has a single source of truth
      // covering the whole page (including sections).
      const snapshot = buildStoredSeoSnapshot(
        bundle.contentType,
        { ...bundle.pageData, ...update, slug: update.slug || bundle.pageData.slug },
        {
          meta_title: update.meta_title ?? s.meta_title ?? bundle.pageData.meta_title ?? null,
          meta_description: update.meta_description ?? s.meta_description ?? bundle.pageData.meta_description ?? null,
          h1_tag: update.h1_tag ?? s.h1_tag ?? bundle.pageData.h1_tag ?? null,
          keywords: { primary: (update.keywords ?? s.keywords ?? bundle.pageData.keywords ?? []) as string[] },
          technicalSEO: s.technicalSEO ?? null,
          socialMeta: s.socialMeta ?? null,
          schemaMarkup: s.schemaMarkup ?? null,
          internalLinks: s.internalLinks ?? null,
          contentSuggestions: s.contentSuggestions ?? [],
          competitorInsights: s.competitorInsights ?? [],
          onPageTips: s.onPageTips ?? [],
        } as SEOSuggestionsPayload,
      );
      // ensure merged keyword list is reflected
      snapshot.keywords = mergeKeywordBuckets(snapshot.keywordBuckets);
      await saveSeoSnapshot(snapshot);

      toast({
        title: "Full-page SEO applied",
        description: `${entityName}: unified meta, keywords and schema saved across ${bundle.childLabel}.`,
      });
      setStage("done");
      onApplied?.();
    } catch (e: any) {
      toast({ title: "Apply failed", description: e?.message || "Could not apply fixes", variant: "destructive" });
      setStage("ready");
    }
  };

  const grouped = result
    ? (["technical", "onpage", "content", "internal_linking"] as const).map((cat) => ({
        cat,
        items: result.checks.filter((c) => c.category === cat),
      }))
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Re-audit Full Page — {entityName}
          </DialogTitle>
          <DialogDescription>
            Audits the parent record together with every {kind === "college" ? "section (fees, placements, cutoffs, FAQs…)" : "course and faculty profile"} and produces ONE unified meta title, description, H1, keyword set and schema for the entire page.
          </DialogDescription>
        </DialogHeader>

        {stage === "idle" && (
          <div className="py-6 space-y-3 text-sm text-muted-foreground">
            <p>This re-runs the full SEO audit against the complete authored page (not just the bare record).</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Single meta title + description targeted at the page's primary keyword</li>
              <li>Unified keyword set across all sections</li>
              <li>Page-level H1, slug and canonical</li>
              <li>Schema covering the whole page (incl. FAQs from sections)</li>
            </ul>
            <Button onClick={runAudit} className="mt-4">
              <Sparkles className="w-4 h-4 mr-2" /> Start full re-audit
            </Button>
          </div>
        )}

        {(stage === "gathering" || stage === "auditing") && (
          <div className="py-10 space-y-3">
            <p className="text-sm text-muted-foreground">
              {stage === "gathering" ? "Gathering all sections + content…" : "Running full-page SEO audit…"}
            </p>
            <Progress value={progress} />
          </div>
        )}

        {result && (stage === "ready" || stage === "applying" || stage === "done") && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
              <div>
                <div className="text-xs text-muted-foreground">Overall page score</div>
                <div className="text-2xl font-bold">{result.overallScore}%</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Audited content</div>
                <div className="text-sm font-medium">{bundle?.childLabel}</div>
              </div>
            </div>

            <ScrollArea className="flex-1 pr-2">
              <Accordion type="multiple" defaultValue={["technical", "onpage", "content"]}>
                {grouped.map(({ cat, items }) =>
                  items.length === 0 ? null : (
                    <AccordionItem key={cat} value={cat}>
                      <AccordionTrigger className="text-sm">
                        {CATEGORY_LABEL[cat]}
                        <Badge variant="outline" className="ml-2">
                          {items.filter((i) => i.status === "pass").length}/{items.length} pass
                        </Badge>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {items.map((c) => (
                            <div key={c.id} className="flex items-start gap-3 p-2 border rounded-md">
                              <div className="pt-0.5">{STATUS_ICON[c.status]}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground">{c.label}</div>
                                <div className="text-xs text-muted-foreground">{c.detail}</div>
                                {c.autoFixAvailable && c.fixDescription && (
                                  <div className="text-xs mt-1 text-primary">→ {c.fixDescription}</div>
                                )}
                              </div>
                              {c.autoFixAvailable && c.status !== "pass" && (
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <Checkbox
                                    checked={approved.has(c.id)}
                                    onCheckedChange={() => toggle(c.id)}
                                    disabled={stage === "applying" || stage === "done"}
                                  />
                                  Apply
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ),
                )}
              </Accordion>

              {result.suggestedValues && Object.keys(result.suggestedValues).length > 0 && (
                <div className="mt-4 border rounded-lg p-3 bg-muted/20">
                  <div className="text-sm font-medium mb-2">Proposed unified values</div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    {result.suggestedValues.meta_title && (
                      <div>
                        <strong className="text-foreground">Meta title:</strong> {result.suggestedValues.meta_title}
                      </div>
                    )}
                    {result.suggestedValues.meta_description && (
                      <div>
                        <strong className="text-foreground">Meta description:</strong> {result.suggestedValues.meta_description}
                      </div>
                    )}
                    {result.suggestedValues.h1_tag && (
                      <div>
                        <strong className="text-foreground">H1:</strong> {result.suggestedValues.h1_tag}
                      </div>
                    )}
                    {Array.isArray(result.suggestedValues.keywords) && result.suggestedValues.keywords.length > 0 && (
                      <div>
                        <strong className="text-foreground">Keywords:</strong>{" "}
                        {result.suggestedValues.keywords.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-muted-foreground">
                {approved.size} fix{approved.size === 1 ? "" : "es"} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={stage === "applying"}>
                  Close
                </Button>
                {stage !== "done" ? (
                  <Button onClick={applyFixes} disabled={stage === "applying" || approved.size === 0}>
                    {stage === "applying" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Apply unified SEO
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Applied
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FullPageReauditDialog;
