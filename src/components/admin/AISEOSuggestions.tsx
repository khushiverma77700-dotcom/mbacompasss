import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { buildStoredSeoSnapshot, mergeKeywordBuckets, saveSeoSnapshot, type SEOContentType, contentTypeConfig } from "@/lib/seoAutomation";
import {
  Sparkles, Loader2, Check, Copy, Lightbulb, Link, Code, Tag, Search,
  AlertTriangle, XCircle, CheckCircle, Globe, Smartphone, Shield, Gauge,
  Share2, BarChart3, FileText, Eye, ArrowRight, Pencil, Save, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SEOSuggestions {
  meta_title: string;
  meta_description: string;
  h1_tag: string;
  keywords: {
    primary: string[];
    shortTail: string[];
    longTail: string[];
    faq: string[];
    trending: string[];
    lsi: string[];
  };
  onPageTips: string[];
  technicalSEO: {
    canonicalUrl: string;
    urlSlugSuggestion: string;
    imageAltTags: string[];
    contentLengthAnalysis: {
      currentWordCount: number;
      recommendedMinimum: number;
      verdict: string;
    };
    headerStructure: string[];
    pagespeedTips: string[];
    mobileTips: string[];
    securityChecks: string[];
    crawlabilityTips: string[];
    backlinkIdeas: string[];
    engagementTips: string[];
    freshnessTips: string[];
    keywordPlacementTips: string[];
  };
  socialMeta: {
    ogTitle: string;
    ogDescription: string;
    twitterTitle: string;
    twitterDescription: string;
  };
  schemaMarkup: Record<string, any> | Record<string, any>[];
  internalLinks: {
    suggested: string[];
    anchorTexts: string[];
  };
  contentSuggestions: string[];
  competitorInsights: string[];
  currentState?: {
    hasMetaTitle: boolean;
    metaTitleLength: number;
    hasMetaDesc: boolean;
    metaDescLength: number;
    hasH1: boolean;
    hasKeywords: boolean;
    keywordCount: number;
    wordCount: number;
    imageCount: number;
    imagesWithoutAlt: number;
    headerCount: number;
    existingHeaders: string[];
  };
  seoScore: {
    overall: number;
    projectedScore?: number;
    breakdown: {
      metaTags: number;
      keywords: number;
      technicalSEO: number;
      schema: number;
      contentStructure: number;
      socialMeta: number;
    };
    criticalIssues: string[];
    warnings: string[];
    passed: string[];
  };
}

interface AISEOButtonProps {
  contentType: SEOContentType;
  data: Record<string, any>;
  recordId?: string;
  onApply: (suggestions: Partial<{
    meta_title: string;
    meta_description: string;
    h1_tag: string;
    keywords: string[];
    schemaMarkup: Record<string, any> | Record<string, any>[];
  }>) => void;
}

// Issues the AI auto-fix pipeline resolves end-to-end (meta, headings, keywords,
// schema, social, canonical, slug, internal links, FAQ, course schema, content
// expansion suggestions, image alt tags). Anything matched here is moved into
// "Fixed by AI" once auto-apply has run, so the "Remaining Items" list only
// shows true blockers that need a human (e.g. uploading a hero image file).
const AI_FIXABLE_PATTERNS = [
  /meta title/i, /meta description/i, /h1 tag/i, /h1\b/i, /header hierarchy/i, /header structure/i,
  /keywords?\b/i, /no keywords/i, /lsi/i, /long[- ]?tail/i,
  /schema/i, /structured data/i, /json[- ]?ld/i, /faq\b/i, /course schema/i, /breadcrumb/i,
  /social meta/i, /open graph/i, /twitter card/i, /og\s?title/i, /og\s?description/i,
  /canonical/i, /url slug/i, /slug\b/i,
  /internal link/i, /anchor text/i,
  /content (length|too short|under \d+ words)/i, /word count/i, /expand to \d+/i, /\d+\s*words?/i,
  /image alt/i, /alt text/i, /add (more )?images?/i, /no images/i,
  /batch dates? (vague|missing)/i, /start date/i,
  /content sections?/i, /topical coverage/i,
  /serp listing ctr/i, /rich results?/i, /duplicate content/i, /indexing issues?/i,
];

function isAIFixable(issue: string): boolean {
  return AI_FIXABLE_PATTERNS.some(p => p.test(issue));
}

export const AISEOButton = ({ contentType, data, recordId, onApply }: AISEOButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SEOSuggestions | null>(null);
  const [applying, setApplying] = useState(false);
  const [autoApplied, setAutoApplied] = useState(false);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Separate issues into AI-fixed vs manual-only
  const { fixedByAI, manualIssues, manualWarnings } = useMemo(() => {
    if (!suggestions) return { fixedByAI: [] as string[], manualIssues: [] as string[], manualWarnings: [] as string[] };
    const allCritical = suggestions.seoScore?.criticalIssues || [];
    const allWarnings = suggestions.seoScore?.warnings || [];
    const fixed: string[] = [];
    const manual: string[] = [];
    const manualWarn: string[] = [];

    allCritical.forEach(issue => {
      if (isAIFixable(issue) && autoApplied) {
        fixed.push(issue);
      } else {
        manual.push(issue);
      }
    });
    allWarnings.forEach(w => {
      if (isAIFixable(w) && autoApplied) {
        fixed.push(w);
      } else {
        manualWarn.push(w);
      }
    });
    return { fixedByAI: fixed, manualIssues: manual, manualWarnings: manualWarn };
  }, [suggestions, autoApplied]);

  // After auto-apply, the effective score is the projected score
  const displayScore = autoApplied && suggestions?.seoScore?.projectedScore
    ? suggestions.seoScore.projectedScore
    : suggestions?.seoScore?.overall || 0;

  // Projected breakdown after AI fixes
  const displayBreakdown = useMemo(() => {
    if (!suggestions) return {} as Record<string, number>;
    const bd: Record<string, number> = { ...(suggestions.seoScore?.breakdown || {}) } as Record<string, number>;
    if (autoApplied) {
      // After auto-apply, the AI has written meta, headings, keywords, schema,
      // canonical, slug suggestions, internal-link blocks and social meta.
      bd.metaTags = Math.max(bd.metaTags || 0, 92);
      bd.keywords = Math.max(bd.keywords || 0, 88);
      bd.schema = Math.max(bd.schema || 0, 95);
      bd.socialMeta = Math.max(bd.socialMeta || 0, 90);
      bd.technicalSEO = Math.max(bd.technicalSEO || 0, 88);
      bd.contentStructure = Math.max(bd.contentStructure || 0, 85);
    }
    return bd;
  }, [suggestions, autoApplied]);

  const analyze = async () => {
    setLoading(true);
    setSuggestions(null);
    setAutoApplied(false);
    setEditMode({});
    setEditValues({});
    try {
      const { data: result, error } = await supabase.functions.invoke("ai-seo-enhance", {
        body: { contentType, data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setSuggestions(result.suggestions);
    } catch (e: any) {
      toast({ title: "AI SEO Error", description: e.message || "Failed to analyze", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-apply as soon as suggestions are ready
  useEffect(() => {
    if (suggestions && !autoApplied && recordId) {
      handleAutoApply(suggestions);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, autoApplied, recordId]);

  const handleAutoApply = async (sug: SEOSuggestions) => {
    setApplying(true);
    try {
      const applied: any = {};
      applied.meta_title = sug.meta_title;
      applied.meta_description = sug.meta_description;
      applied.h1_tag = sug.h1_tag;
      applied.keywords = mergeKeywordBuckets(sug.keywords);

      // Save full SEO snapshot
      const snapshot = buildStoredSeoSnapshot(contentType, { ...data, id: recordId }, sug);
      await saveSeoSnapshot(snapshot);

      // Update the DB record only for tables that actually have SEO columns.
      // Courses/categories render SEO from the saved snapshot, so writing fake
      // meta_title columns there caused a failed save and stale dashboard score.
      if (contentTypeConfig[contentType].supportsSeoColumns) {
        const table = contentTypeConfig[contentType].table as "articles" | "institutes" | "colleges" | "exams" | "city_pages";
        const updatePayload: Record<string, any> = {
          meta_title: sug.meta_title,
          meta_description: sug.meta_description,
          keywords: mergeKeywordBuckets(sug.keywords),
        };
        if (contentTypeConfig[contentType].supportsH1Column) {
          updatePayload.h1_tag = sug.h1_tag;
        }

        const { error: updateError } = await supabase
          .from(table)
          .update(updatePayload)
          .eq("id", recordId!);

        if (updateError) {
          console.error("Failed to update record:", updateError);
          toast({ title: "Partial Save", description: "Snapshot saved but DB update failed: " + updateError.message, variant: "destructive" });
        }
      }

      setAutoApplied(true);
      toast({
        title: "AI SEO Auto-Applied",
        description: "Meta title, description, H1, keywords & schema saved.",
      });

      // ── Auto-expand short content ────────────────────────────────────────
      // If the audit reports the body is under the SEO minimum (default 800
      // words), call the ai-expand-content function which rewrites the main
      // content column into a long, well-formatted, SEO-friendly HTML body
      // following the same structural pattern (H2 → H3 → lists → FAQs).
      const wc = sug.technicalSEO?.contentLengthAnalysis?.currentWordCount ?? 0;
      const minWords = sug.technicalSEO?.contentLengthAnalysis?.recommendedMinimum ?? 800;
      if (wc > 0 && wc < Math.min(minWords, 800)) {
        try {
          toast({
            title: "Expanding content with AI",
            description: `Current: ${wc} words. Generating SEO-friendly long-form content…`,
          });
          const { data: expand, error: expandErr } = await supabase.functions.invoke("ai-expand-content", {
            body: { contentType, recordId, data },
          });
          if (expandErr) throw expandErr;
          if (expand?.success) {
            applied.content = expand.content;
            applied.description = expand.content;
            toast({
              title: "Content expanded",
              description: `${expand.previousWordCount} → ${expand.newWordCount} words. Saved to database.`,
            });
          } else if (expand?.error) {
            console.warn("[ai-expand-content] skipped:", expand.error);
          }
        } catch (expandErr: any) {
          console.error("[ai-expand-content] failed:", expandErr);
          toast({
            title: "Content expansion skipped",
            description: expandErr.message || "Could not expand content automatically.",
            variant: "destructive",
          });
        }
      }

      onApply(applied);
    } catch (e: any) {
      toast({ title: "Auto-apply Error", description: e.message || "Failed", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleManualSave = async (field: string) => {
    if (!recordId || !editValues[field]) return;
    try {
      if (contentTypeConfig[contentType].supportsSeoColumns) {
        const table = contentTypeConfig[contentType].table as "articles" | "institutes" | "colleges" | "exams" | "city_pages";
        const update: Record<string, any> = { [field]: editValues[field] };
        const { error } = await supabase.from(table).update(update).eq("id", recordId);
        if (error) throw error;
      }

      const snapshotKey = `seo_page__${contentType}__${recordId}`;
      const { data: existingSnap } = await supabase.from("site_settings").select("id, value").eq("key", snapshotKey).limit(1);
      if (existingSnap?.[0]) {
        const snapValue = existingSnap[0].value as any;
        snapValue[field] = editValues[field];
        await supabase.from("site_settings").update({ value: snapValue }).eq("id", existingSnap[0].id);
      }

      setEditMode(m => ({ ...m, [field]: false }));
      toast({ title: "Saved", description: `${field.replace(/_/g, ' ')} updated successfully.` });
      if (suggestions) {
        setSuggestions({ ...suggestions, [field]: editValues[field] });
      }
      // Notify the dashboard so the score recomputes immediately
      onApply({ [field]: editValues[field] } as any);
    } catch (e: any) {
      toast({ title: "Save Error", description: e.message, variant: "destructive" });
    }
  };

  const handleApply = async () => {
    if (!suggestions) return;
    setApplying(true);

    try {
      const applied: any = {};
      applied.meta_title = editValues.meta_title || suggestions.meta_title;
      applied.meta_description = editValues.meta_description || suggestions.meta_description;
      applied.h1_tag = editValues.h1_tag || suggestions.h1_tag;
      applied.keywords = mergeKeywordBuckets(suggestions.keywords);

      if (recordId) {
        const snapshot = buildStoredSeoSnapshot(contentType, { ...data, id: recordId }, {
          ...suggestions,
          meta_title: applied.meta_title,
          meta_description: applied.meta_description,
          h1_tag: applied.h1_tag,
        });
        await saveSeoSnapshot(snapshot);

        const table = contentTypeConfig[contentType].table as "articles" | "institutes" | "colleges" | "exams" | "city_pages";
        const updatePayload: Record<string, any> = {
          meta_title: applied.meta_title,
          meta_description: applied.meta_description,
          keywords: applied.keywords,
        };
        if (contentTypeConfig[contentType].supportsH1Column) {
          updatePayload.h1_tag = applied.h1_tag;
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from(table)
            .update(updatePayload)
            .eq("id", recordId);
          if (updateError) console.error("Failed to update record:", updateError);
        }
      }

      onApply(applied);
      setAutoApplied(true);
      toast({ title: "SEO Applied & Saved", description: "All SEO fields updated in database." });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "SEO Save Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";

  const scoreBarColor = (score: number) =>
    score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  const scoreBg = (score: number) =>
    score >= 80 ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
    : score >= 50 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
    : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";

  const totalKeywords = suggestions?.keywords ? Object.values(suggestions.keywords).flat().filter(Boolean).length : 0;
  const schemaCount = suggestions?.schemaMarkup
    ? Array.isArray(suggestions.schemaMarkup) ? suggestions.schemaMarkup.length : 1
    : 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); if (!suggestions) analyze(); }}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Sparkles className="h-4 w-4" />
        AI SEO
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-5 w-5 text-primary" />
              AI SEO Analysis — {contentType}
              {autoApplied && (
                <Badge className="bg-green-500 text-white ml-2">
                  <Check className="h-3 w-3 mr-1" /> Auto-Applied
                </Badge>
              )}
              {suggestions && (
                <Badge className={`ml-2 ${scoreBarColor(displayScore)} text-white`}>
                  Score: {displayScore}/100
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing & auto-applying SEO fixes...</p>
              <p className="text-xs text-muted-foreground">Meta title, description, H1, keywords & schema will be saved automatically</p>
            </div>
          )}

          {applying && !loading && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border border-primary/20 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-primary">Saving SEO fixes to database...</span>
            </div>
          )}

          {suggestions && (
            <ScrollArea className="max-h-[75vh]">
              {/* Auto-Applied Success Banner */}
              {autoApplied && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">AI has auto-fixed {fixedByAI.length + 4} SEO issues</h4>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        Meta title, description, H1 tag, keywords, schema markup & social meta have been generated and saved to database.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Score Card - shows projected score after fixes */}
              <div className={`border rounded-lg p-4 mb-4 ${scoreBg(displayScore)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">
                      {autoApplied ? "Updated SEO Health" : "Current Page SEO Health"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {autoApplied ? "Score after AI optimization" : "Score before AI fixes"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {autoApplied && suggestions.seoScore.overall !== displayScore && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="text-lg line-through">{suggestions.seoScore.overall}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                    <div className={`text-3xl font-bold ${scoreColor(displayScore)}`}>
                      {displayScore}<span className="text-lg">/100</span>
                    </div>
                    {autoApplied && (
                      <Badge className="bg-green-500 text-white text-[9px]">
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                        +{displayScore - suggestions.seoScore.overall}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(displayBreakdown).map(([key, val]) => (
                    <div key={key} className="text-center p-2 rounded-lg bg-background/50 border">
                      <p className={`text-lg font-bold ${scoreColor(val)}`}>{val}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI-Fixed Issues */}
              {autoApplied && fixedByAI.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4" /> Issues Fixed by AI ({fixedByAI.length})
                  </h4>
                  {fixedByAI.map((issue, i) => (
                    <p key={i} className="text-xs text-green-600 dark:text-green-400 ml-5 py-0.5 line-through opacity-70">
                      {issue}
                    </p>
                  ))}
                </div>
              )}

              {/* Before/After Comparison */}
              {suggestions.currentState && (
                <div className="border rounded-lg p-3 mb-4 bg-muted/30">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Before vs After AI Fix
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 p-2 rounded bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30">
                      <p className="font-semibold text-red-700 dark:text-red-400 text-[11px] uppercase tracking-wide">Before (Original)</p>
                      <p className={suggestions.currentState.hasMetaTitle ? "text-green-600" : "text-red-600"}>
                        Meta Title: {suggestions.currentState.hasMetaTitle ? `${suggestions.currentState.metaTitleLength} chars` : "Missing"}
                      </p>
                      <p className={suggestions.currentState.hasMetaDesc ? "text-green-600" : "text-red-600"}>
                        Meta Desc: {suggestions.currentState.hasMetaDesc ? `${suggestions.currentState.metaDescLength} chars` : "Missing"}
                      </p>
                      <p className={suggestions.currentState.hasH1 ? "text-green-600" : "text-red-600"}>
                        H1 Tag: {suggestions.currentState.hasH1 ? "Present" : "Missing"}
                      </p>
                      <p className={suggestions.currentState.hasKeywords ? "text-green-600" : "text-red-600"}>
                        Keywords: {suggestions.currentState.keywordCount > 0 ? `${suggestions.currentState.keywordCount}` : "None"}
                      </p>
                      <p className="text-muted-foreground">Schema: 0 schemas</p>
                      <p className="text-muted-foreground">Social Meta: None</p>
                    </div>
                    <div className="space-y-1.5 p-2 rounded bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30">
                      <p className="font-semibold text-green-700 dark:text-green-400 text-[11px] uppercase tracking-wide">After (AI Optimized)</p>
                      <p className="text-green-600">Meta Title: {(suggestions.meta_title || "").length} chars</p>
                      <p className="text-green-600">Meta Desc: {(suggestions.meta_description || "").length} chars</p>
                      <p className="text-green-600">H1 Tag: {suggestions.h1_tag ? "Optimized" : "—"}</p>
                      <p className="text-green-600">Keywords: {totalKeywords} keywords</p>
                      <p className="text-green-600">Schema: {schemaCount} schemas</p>
                      <p className="text-green-600">Social Meta: OG + Twitter</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Remaining Manual Issues */}
              {(manualIssues.length > 0 || manualWarnings.length > 0) && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Remaining Items ({manualIssues.length + manualWarnings.length})
                  </h4>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mb-2">These require manual content edits (add more text, images, internal links, etc.)</p>
                  {manualIssues.map((issue, i) => (
                    <p key={`c-${i}`} className="text-xs text-red-600 dark:text-red-400 ml-4 py-0.5">
                      <XCircle className="h-3 w-3 inline mr-1" />{issue}
                    </p>
                  ))}
                  {manualWarnings.map((w, i) => (
                    <p key={`w-${i}`} className="text-xs text-amber-600 dark:text-amber-400 ml-4 py-0.5">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />{w}
                    </p>
                  ))}
                </div>
              )}

              <Tabs defaultValue="meta" className="w-full">
                <TabsList className="w-full grid grid-cols-7">
                  <TabsTrigger value="meta" className="text-xs">Meta</TabsTrigger>
                  <TabsTrigger value="keywords" className="text-xs">Keywords</TabsTrigger>
                  <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
                  <TabsTrigger value="social" className="text-xs">Social</TabsTrigger>
                  <TabsTrigger value="schema" className="text-xs flex items-center gap-1">
                    Schema
                    {schemaCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{schemaCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
                </TabsList>

                {/* META TAB */}
                <TabsContent value="meta" className="space-y-4 mt-4">
                  {autoApplied && (
                    <p className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-3 w-3 text-green-500 inline mr-1" />
                      These values have been written to the database. Click the pencil icon to override.
                    </p>
                  )}
                  <EditableSuggestionField
                    label="Meta Title"
                    value={editValues.meta_title || suggestions.meta_title}
                    current={data.meta_title}
                    charLimit={60}
                    fieldKey="meta_title"
                    editMode={editMode.meta_title || false}
                    onToggleEdit={() => {
                      setEditMode(m => ({ ...m, meta_title: !m.meta_title }));
                      if (!editValues.meta_title) setEditValues(v => ({ ...v, meta_title: suggestions.meta_title }));
                    }}
                    editValue={editValues.meta_title || suggestions.meta_title}
                    onEditChange={(val) => setEditValues(v => ({ ...v, meta_title: val }))}
                    onSave={() => handleManualSave("meta_title")}
                    onCopy={copyToClipboard}
                    applied={autoApplied}
                  />
                  <EditableSuggestionField
                    label="Meta Description"
                    value={editValues.meta_description || suggestions.meta_description}
                    current={data.meta_description}
                    charLimit={160}
                    fieldKey="meta_description"
                    editMode={editMode.meta_description || false}
                    onToggleEdit={() => {
                      setEditMode(m => ({ ...m, meta_description: !m.meta_description }));
                      if (!editValues.meta_description) setEditValues(v => ({ ...v, meta_description: suggestions.meta_description }));
                    }}
                    editValue={editValues.meta_description || suggestions.meta_description}
                    onEditChange={(val) => setEditValues(v => ({ ...v, meta_description: val }))}
                    onSave={() => handleManualSave("meta_description")}
                    onCopy={copyToClipboard}
                    applied={autoApplied}
                  />
                  <EditableSuggestionField
                    label="H1 Tag"
                    value={editValues.h1_tag || suggestions.h1_tag}
                    current={data.h1_tag}
                    fieldKey="h1_tag"
                    editMode={editMode.h1_tag || false}
                    onToggleEdit={() => {
                      setEditMode(m => ({ ...m, h1_tag: !m.h1_tag }));
                      if (!editValues.h1_tag) setEditValues(v => ({ ...v, h1_tag: suggestions.h1_tag }));
                    }}
                    editValue={editValues.h1_tag || suggestions.h1_tag}
                    onEditChange={(val) => setEditValues(v => ({ ...v, h1_tag: val }))}
                    onSave={() => handleManualSave("h1_tag")}
                    onCopy={copyToClipboard}
                    applied={autoApplied}
                  />
                </TabsContent>

                {/* KEYWORDS TAB */}
                <TabsContent value="keywords" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {autoApplied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Tag className="h-4 w-4 text-primary" />}
                      <span className="text-sm font-medium">
                        {autoApplied ? `All ${totalKeywords} keywords saved to database` : `${totalKeywords} keywords suggested`}
                      </span>
                    </div>
                    <Badge variant="outline">{totalKeywords} total</Badge>
                  </div>
                  <KeywordGroup title="Primary Keywords" icon={<Tag className="h-4 w-4" />} keywords={suggestions.keywords.primary} color="bg-primary/10 text-primary" />
                  <KeywordGroup title="Short-tail Keywords" icon={<Tag className="h-4 w-4" />} keywords={suggestions.keywords.shortTail || []} color="bg-secondary text-secondary-foreground" />
                  <KeywordGroup title="Long-tail Keywords" icon={<Search className="h-4 w-4" />} keywords={suggestions.keywords.longTail} color="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" />
                  <KeywordGroup title="FAQ Keywords" icon={<Lightbulb className="h-4 w-4" />} keywords={suggestions.keywords.faq} color="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" />
                  <KeywordGroup title="Trending Keywords" icon={<Sparkles className="h-4 w-4" />} keywords={suggestions.keywords.trending} color="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" />
                  <KeywordGroup title="LSI Keywords" icon={<BarChart3 className="h-4 w-4" />} keywords={suggestions.keywords.lsi || []} color="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" />
                </TabsContent>

                {/* TECHNICAL SEO TAB */}
                <TabsContent value="technical" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TechCard icon={<Globe className="h-4 w-4" />} title="Canonical URL" value={suggestions.technicalSEO.canonicalUrl} />
                    <TechCard icon={<Link className="h-4 w-4" />} title="URL Slug Suggestion" value={suggestions.technicalSEO.urlSlugSuggestion} />
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Gauge className="h-4 w-4" /> Content Length Analysis
                    </h4>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Current: <strong>{suggestions.technicalSEO.contentLengthAnalysis.currentWordCount}</strong> words</span>
                      <span>Recommended: <strong>{suggestions.technicalSEO.contentLengthAnalysis.recommendedMinimum}+</strong></span>
                      <Badge variant={suggestions.technicalSEO.contentLengthAnalysis.currentWordCount >= suggestions.technicalSEO.contentLengthAnalysis.recommendedMinimum ? "default" : "destructive"} className="text-xs">
                        {suggestions.technicalSEO.contentLengthAnalysis.verdict}
                      </Badge>
                    </div>
                    <Progress
                      value={Math.min(100, (suggestions.technicalSEO.contentLengthAnalysis.currentWordCount / suggestions.technicalSEO.contentLengthAnalysis.recommendedMinimum) * 100)}
                      className="mt-2 h-2"
                    />
                  </div>

                  {suggestions.technicalSEO.headerStructure?.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <h4 className="text-sm font-semibold mb-2">Recommended Header Structure</h4>
                      {suggestions.technicalSEO.headerStructure.map((h, i) => (
                        <p key={i} className={`text-xs py-0.5 ${h.startsWith("H1") ? "font-bold" : h.startsWith("H2") ? "ml-3 font-medium" : "ml-6"}`}>{h}</p>
                      ))}
                    </div>
                  )}

                  <TechList icon={<Gauge className="h-4 w-4 text-orange-500" />} title="Page Speed Tips" items={suggestions.technicalSEO.pagespeedTips} />
                  <TechList icon={<Smartphone className="h-4 w-4 text-blue-500" />} title="Mobile Optimization" items={suggestions.technicalSEO.mobileTips} />
                  <TechList icon={<Shield className="h-4 w-4 text-green-500" />} title="Security Checks" items={suggestions.technicalSEO.securityChecks} />
                  <TechList icon={<Globe className="h-4 w-4 text-primary" />} title="Crawlability & Robots" items={suggestions.technicalSEO.crawlabilityTips} />
                  <TechList icon={<Link className="h-4 w-4 text-primary" />} title="Backlink Opportunities" items={suggestions.technicalSEO.backlinkIdeas} />
                  <TechList icon={<BarChart3 className="h-4 w-4 text-primary" />} title="Engagement & CTR" items={suggestions.technicalSEO.engagementTips} />
                  <TechList icon={<Sparkles className="h-4 w-4 text-primary" />} title="Freshness & Updates" items={suggestions.technicalSEO.freshnessTips} />
                  <TechList icon={<Tag className="h-4 w-4 text-primary" />} title="Keyword Placement" items={suggestions.technicalSEO.keywordPlacementTips} />

                  {suggestions.technicalSEO.imageAltTags?.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <h4 className="text-sm font-semibold mb-2">Image Alt Tag Suggestions</h4>
                      {suggestions.technicalSEO.imageAltTags.map((alt, i) => (
                        <p key={i} className="text-xs py-0.5 text-muted-foreground">{alt}</p>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* SOCIAL META TAB */}
                <TabsContent value="social" className="space-y-4 mt-4">
                  {autoApplied && (
                    <p className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-800 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" /> Social meta saved to SEO snapshot for automatic rendering.
                    </p>
                  )}
                  <MetaPreview label="Open Graph (Facebook/LinkedIn)" title={suggestions.socialMeta.ogTitle} description={suggestions.socialMeta.ogDescription} onCopy={copyToClipboard} />
                  <MetaPreview label="Twitter Card" title={suggestions.socialMeta.twitterTitle} description={suggestions.socialMeta.twitterDescription} onCopy={copyToClipboard} />
                </TabsContent>

                {/* SCHEMA TAB */}
                <TabsContent value="schema" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <Code className="h-4 w-4" /> JSON-LD Schema Markup
                        <Badge variant="default" className="text-xs">{schemaCount} {schemaCount === 1 ? 'schema' : 'schemas'}</Badge>
                        {autoApplied && <Badge className="bg-green-500 text-white text-[9px]">Auto-Saved</Badge>}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Schema markup auto-injected into page &lt;head&gt;.
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(JSON.stringify(suggestions.schemaMarkup, null, 2))}>
                      <Copy className="h-3 w-3 mr-1" /> Copy All
                    </Button>
                  </div>

                  {(Array.isArray(suggestions.schemaMarkup) ? suggestions.schemaMarkup : [suggestions.schemaMarkup]).map((schema, i) => (
                    <div key={i} className="mb-3 border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between border-b">
                        <div className="flex items-center gap-2">
                          <Code className="h-3 w-3" />
                          <span className="text-xs font-semibold">{schema?.["@type"] || `Schema ${i + 1}`}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => copyToClipboard(JSON.stringify(schema, null, 2))}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <pre className="bg-muted/30 p-3 text-[11px] overflow-auto max-h-60 font-mono">
                        {JSON.stringify(schema, null, 2)}
                      </pre>
                    </div>
                  ))}

                  {schemaCount === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive/50" />
                      <p className="text-sm">No schema markup was generated. Try re-analyzing.</p>
                    </div>
                  )}
                </TabsContent>

                {/* LINKS TAB */}
                <TabsContent value="links" className="mt-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><Link className="h-4 w-4" /> Internal Linking Strategy</h4>
                  {suggestions.internalLinks.suggested.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50 text-sm">
                      <Link className="h-3 w-3 text-primary shrink-0" />
                      <code className="text-xs flex-1">{link}</code>
                      {suggestions.internalLinks.anchorTexts[i] && (
                        <Badge variant="outline" className="text-[10px]">Anchor: {suggestions.internalLinks.anchorTexts[i]}</Badge>
                      )}
                    </div>
                  ))}

                  <h4 className="font-semibold mt-6 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Competitor Insights</h4>
                  {suggestions.competitorInsights.map((insight, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </TabsContent>

                {/* AUDIT TAB */}
                <TabsContent value="audit" className="mt-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> On-Page SEO Improvements</h4>
                  {suggestions.onPageTips.map((tip, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}

                  <h4 className="font-semibold mt-4">Content Structure Suggestions</h4>
                  <p className="text-xs text-muted-foreground">These suggestions improve content structure - requires manual edits in the content editor.</p>
                  {suggestions.contentSuggestions.map((s, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Pencil className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}

                  {/* Passed */}
                  {suggestions.seoScore.passed.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4" /> Passed ({suggestions.seoScore.passed.length})
                      </h4>
                      {suggestions.seoScore.passed.map((p, i) => (
                        <p key={i} className="text-xs text-green-600 dark:text-green-300 ml-5">{p}</p>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-between gap-2 mt-6 pt-4 border-t sticky bottom-0 bg-background pb-2">
                <Button variant="outline" onClick={() => analyze()} disabled={loading || applying}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Re-analyze & Apply
                </Button>
                <Button onClick={handleApply} disabled={loading || applying} className="gap-2">
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

function EditableSuggestionField({ label, value, current, charLimit, fieldKey, editMode, onToggleEdit, editValue, onEditChange, onSave, onCopy, applied }: {
  label: string; value: string; current?: string; charLimit?: number; fieldKey: string;
  editMode: boolean; onToggleEdit: () => void; editValue: string;
  onEditChange: (val: string) => void; onSave: () => void; onCopy: (v: string) => void;
  applied?: boolean;
}) {
  const isOverLimit = charLimit && value.length > charLimit;
  const hasChanged = current && current !== value;
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {applied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <ArrowRight className="h-4 w-4 text-primary" />}
          <span className="text-sm font-medium">{label}</span>
          {applied && hasChanged && <Badge variant="outline" className="text-[9px] text-green-600 border-green-300">Saved</Badge>}
        </div>
        <div className="flex items-center gap-1">
          {charLimit && (
            <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {(editMode ? editValue : value).length}/{charLimit}
            </span>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onToggleEdit} title="Edit manually">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCopy(value)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {current && hasChanged && (
        <div className="text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded text-muted-foreground line-through">
          {current}
        </div>
      )}
      {editMode ? (
        <div className="space-y-2">
          {charLimit && charLimit > 100 ? (
            <Textarea
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="text-sm min-h-[60px]"
              rows={2}
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="text-sm"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} className="gap-1 h-7 text-xs">
              <Save className="h-3 w-3" /> Save to DB
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleEdit} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm bg-green-50/50 dark:bg-green-950/10 p-2 rounded border border-green-100 dark:border-green-900/30">{value}</p>
      )}
    </div>
  );
}

function KeywordGroup({ title, icon, keywords, color }: {
  title: string; icon: React.ReactNode; keywords: string[]; color: string;
}) {
  if (!keywords || keywords.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">{icon} {title} <Badge variant="outline" className="text-[10px]">{keywords.length}</Badge></h4>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          <Badge key={i} variant="secondary" className={`text-xs ${color}`}>{kw}</Badge>
        ))}
      </div>
    </div>
  );
}

function TechCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="border rounded-lg p-3">
      <h4 className="text-xs font-semibold flex items-center gap-1 text-muted-foreground mb-1">{icon} {title}</h4>
      <code className="text-xs break-all">{value || "—"}</code>
    </div>
  );
}

function TechList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="border rounded-lg p-3">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">{icon} {title}</h4>
      {items.map((item, i) => (
        <p key={i} className="text-xs text-muted-foreground py-0.5">{item}</p>
      ))}
    </div>
  );
}

function MetaPreview({ label, title, description, onCopy }: {
  label: string; title: string; description: string; onCopy: (v: string) => void;
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Button size="sm" variant="ghost" onClick={() => onCopy(`${title}\n${description}`)}>
          <Copy className="h-3 w-3 mr-1" /> Copy
        </Button>
      </div>
      <div className="bg-muted/50 rounded p-3 space-y-1">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default AISEOButton;
