import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertTriangle, CheckCircle, XCircle, Loader2, Sparkles, Shield, Eye,
  FileText, Code, Link2, Globe, Tag, Search, Image, Zap, MonitorSmartphone,
  Lock, ArrowRight, RefreshCw, Check, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  contentTypeConfig, saveSeoSnapshot, buildStoredSeoSnapshot,
  mergeKeywordBuckets, type SEOContentType,
} from "@/lib/seoAutomation";

// ── Checklist Categories ──
interface AuditCheckItem {
  id: string;
  label: string;
  category: "technical" | "onpage" | "content" | "internal_linking";
  status: "pass" | "warn" | "fail" | "pending";
  detail: string;
  autoFixAvailable: boolean;
  fixDescription?: string;
  fixValue?: any;
}

interface AuditResult {
  pageId: string;
  pageName: string;
  contentType: SEOContentType;
  slug: string;
  overallScore: number;
  checks: AuditCheckItem[];
  fixes: Record<string, any>;
  currentValues: Record<string, any>;
  suggestedValues: Record<string, any>;
}

interface SEOFullAuditProps {
  rows: Array<{
    key: string; id: string; contentType: SEOContentType; name: string;
    slug?: string; item: Record<string, any>; snapshot: any;
  }>;
  onRefresh: () => void;
}

const CATEGORIES = {
  technical: { label: "🧠 Technical SEO", icon: Shield },
  onpage: { label: "🏷️ On-Page SEO", icon: FileText },
  content: { label: "✍️ Content SEO", icon: Tag },
  internal_linking: { label: "🔗 Internal Linking", icon: Link2 },
};

const categoryOrder: Array<keyof typeof CATEGORIES> = ["technical", "onpage", "content", "internal_linking"];

const SEOFullAudit = ({ rows, onRefresh }: SEOFullAuditProps) => {
  const [selectedType, setSelectedType] = useState<"all" | SEOContentType>("all");
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvedFixes, setApprovedFixes] = useState<Record<string, Set<string>>>({}); // pageId -> set of check ids
  const [applyingPageId, setApplyingPageId] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const { toast } = useToast();

  const targetRows = rows.filter(r => {
    if (r.key.startsWith("static:")) return false;
    return selectedType === "all" || r.contentType === selectedType;
  });

  const runFullAudit = useCallback(async () => {
    setLoading(true);
    setAuditResults([]);
    setApprovedFixes({});

    try {
      // Process in batches of 5
      const pagesToAudit = targetRows.slice(0, 30);
      const results: AuditResult[] = [];

      for (let i = 0; i < pagesToAudit.length; i += 5) {
        const batch = pagesToAudit.slice(i, i + 5);
        const batchResults = await Promise.all(
          batch.map(async (row) => {
            try {
              const { data, error } = await supabase.functions.invoke("auto-seo-engine", {
                body: {
                  mode: "full_audit",
                  contentType: row.contentType,
                  pageId: row.id,
                  pageData: row.item,
                },
              });
              if (error) throw error;
              return data as AuditResult;
            } catch (e: any) {
              // Return a minimal result on error
              return {
                pageId: row.id,
                pageName: row.name,
                contentType: row.contentType,
                slug: row.slug || "",
                overallScore: 0,
                checks: [{ id: "error", label: "Audit Failed", category: "technical" as const, status: "fail" as const, detail: e.message, autoFixAvailable: false }],
                fixes: {},
                currentValues: {},
                suggestedValues: {},
              } as AuditResult;
            }
          })
        );
        results.push(...batchResults);
      }

      setAuditResults(results);
      toast({
        title: "Full SEO Audit Complete",
        description: `Audited ${results.length} pages. Avg score: ${Math.round(results.reduce((s, r) => s + r.overallScore, 0) / Math.max(results.length, 1))}%`,
      });
    } catch (e: any) {
      toast({ title: "Audit failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [targetRows, toast]);

  const toggleApproval = (pageId: string, checkId: string) => {
    setApprovedFixes(prev => {
      const next = { ...prev };
      const set = new Set(next[pageId] || []);
      if (set.has(checkId)) set.delete(checkId);
      else set.add(checkId);
      next[pageId] = set;
      return next;
    });
  };

  const approveAllForPage = (pageId: string, result: AuditResult) => {
    const fixableChecks = result.checks.filter(c => c.autoFixAvailable && c.status !== "pass");
    setApprovedFixes(prev => ({
      ...prev,
      [pageId]: new Set(fixableChecks.map(c => c.id)),
    }));
  };

  const rejectAllForPage = (pageId: string) => {
    setApprovedFixes(prev => ({ ...prev, [pageId]: new Set() }));
  };

  const approveAllPages = () => {
    const next: Record<string, Set<string>> = {};
    for (const result of auditResults) {
      const fixable = result.checks.filter(c => c.autoFixAvailable && c.status !== "pass");
      if (fixable.length > 0) {
        next[result.pageId] = new Set(fixable.map(c => c.id));
      }
    }
    setApprovedFixes(next);
    toast({ title: "All pages approved", description: `Approved fixes for ${Object.keys(next).length} pages.` });
  };

  const makeAllLive = async () => {
    const pagesWithApprovals = auditResults.filter(r => (approvedFixes[r.pageId]?.size || 0) > 0);
    if (pagesWithApprovals.length === 0) {
      toast({ title: "No fixes approved", description: "Approve fixes on at least one page first.", variant: "destructive" });
      return;
    }

    setApplyingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const result of pagesWithApprovals) {
      try {
        await makeLive(result, true);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setApplyingAll(false);
    toast({
      title: `✅ Bulk Apply Complete`,
      description: `${successCount} pages updated${failCount > 0 ? `, ${failCount} failed` : ""}.`,
    });
    onRefresh();
  };

  const makeLive = async (result: AuditResult, silent = false) => {
    const approved = approvedFixes[result.pageId];
    if (!approved?.size) {
      if (!silent) toast({ title: "No fixes approved", description: "Approve at least one fix before making live." });
      return;
    }

    setApplyingPageId(result.pageId);
    try {
      const update: Record<string, any> = {};
      const suggested = result.suggestedValues;

      // Apply approved fixes to DB
      for (const checkId of approved) {
        switch (checkId) {
          case "meta_title":
            if (suggested.meta_title) update.meta_title = suggested.meta_title;
            break;
          case "meta_description":
            if (suggested.meta_description) update.meta_description = suggested.meta_description;
            break;
          case "h1_tag":
            if (suggested.h1_tag && contentTypeConfig[result.contentType].supportsH1Column)
              update.h1_tag = suggested.h1_tag;
            break;
          case "keywords":
          case "keyword_density":
          case "lsi_keywords":
          case "keyword_in_heading":
          case "keyword_first_100":
            if (suggested.keywords?.length) update.keywords = suggested.keywords;
            break;
          case "slug":
            if (suggested.slug) update.slug = suggested.slug;
            break;
        }
      }

      // Update the DB record
      if (Object.keys(update).length > 0) {
        const { error } = await supabase
          .from(contentTypeConfig[result.contentType].table as any)
          .update(update)
          .eq("id", result.pageId);
        if (error) throw error;
      }

      // Build and save SEO snapshot with all AI-generated data
      if (suggested.snapshot) {
        const snapshot = {
          ...suggested.snapshot,
          contentType: result.contentType,
          recordId: result.pageId,
          slug: result.slug,
          generatedAt: new Date().toISOString(),
        };
        const snapshotKey = `seo_page__${result.contentType}__${result.pageId}`;
        const { data: existingSnap } = await supabase
          .from("site_settings")
          .select("id")
          .eq("key", snapshotKey)
          .limit(1);

        if (existingSnap?.[0]?.id) {
          await supabase.from("site_settings").update({ value: snapshot as any }).eq("id", existingSnap[0].id);
        } else {
          await supabase.from("site_settings").insert({ key: snapshotKey, value: snapshot as any });
        }
      }

      toast({ title: "✅ Changes Applied Live!", description: `${approved.size} fixes applied to "${result.pageName}".` });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Apply failed", description: e.message, variant: "destructive" });
    } finally {
      setApplyingPageId(null);
    }
  };

  const overallStats = auditResults.length > 0 ? {
    avgScore: Math.round(auditResults.reduce((s, r) => s + r.overallScore, 0) / auditResults.length),
    totalChecks: auditResults.reduce((s, r) => s + r.checks.length, 0),
    passed: auditResults.reduce((s, r) => s + r.checks.filter(c => c.status === "pass").length, 0),
    warnings: auditResults.reduce((s, r) => s + r.checks.filter(c => c.status === "warn").length, 0),
    failed: auditResults.reduce((s, r) => s + r.checks.filter(c => c.status === "fail").length, 0),
    fixable: auditResults.reduce((s, r) => s + r.checks.filter(c => c.autoFixAvailable && c.status !== "pass").length, 0),
  } : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Full SEO Audit & Auto-Fix
          </CardTitle>
          <CardDescription>
            Comprehensive audit against 60+ SEO checkpoints. AI analyzes each page, identifies issues, generates fixes.
            Review changes → Approve → Make Live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Content Type</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types ({targetRows.length} pages)</SelectItem>
                  {(Object.keys(contentTypeConfig) as SEOContentType[]).map(ct => {
                    const count = rows.filter(r => r.contentType === ct && !r.key.startsWith("static:")).length;
                    return <SelectItem key={ct} value={ct}>{contentTypeConfig[ct].label} ({count})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runFullAudit} disabled={loading} size="lg">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Run Full Audit ({Math.min(targetRows.length, 30)} pages)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Audits up to 30 pages per run across Technical SEO, On-Page SEO, Content SEO & Internal Linking.
            Each check gets ✅ Pass / ⚠️ Warning / ❌ Fail. Auto-fixes are generated for failed items.
          </p>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      {overallStats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className={`text-2xl font-bold ${overallStats.avgScore >= 80 ? "text-green-600" : overallStats.avgScore >= 55 ? "text-amber-600" : "text-red-600"}`}>
                {overallStats.avgScore}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-foreground">{auditResults.length}</p>
              <p className="text-xs text-muted-foreground">Pages Audited</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{overallStats.passed}</p>
              <p className="text-xs text-muted-foreground">Checks Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{overallStats.warnings}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">{overallStats.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">{overallStats.fixable}</p>
              <p className="text-xs text-muted-foreground">Auto-Fixable</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Results */}
      {auditResults.map((result) => {
        const isExpanded = expandedPage === result.pageId;
        const approved = approvedFixes[result.pageId] || new Set();
        const fixableCount = result.checks.filter(c => c.autoFixAvailable && c.status !== "pass").length;
        const passCount = result.checks.filter(c => c.status === "pass").length;
        const failCount = result.checks.filter(c => c.status === "fail").length;
        const warnCount = result.checks.filter(c => c.status === "warn").length;

        return (
          <Card key={result.pageId} className={`transition-all ${approved.size > 0 ? "border-primary/50" : ""}`}>
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedPage(isExpanded ? null : result.pageId)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    result.overallScore >= 80 ? "bg-green-100 text-green-700" :
                    result.overallScore >= 55 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {result.overallScore}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{result.pageName}</p>
                    <p className="text-xs text-muted-foreground">/{result.slug} · {contentTypeConfig[result.contentType]?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1">
                    <Badge className="bg-green-100 text-green-700 text-[10px]">{passCount}✅</Badge>
                    {warnCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">{warnCount}⚠️</Badge>}
                    {failCount > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{failCount}❌</Badge>}
                  </div>
                  {fixableCount > 0 && (
                    <Badge variant="outline" className="text-[10px] border-primary text-primary">
                      {fixableCount} fixable
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {/* Approve / Reject Buttons */}
                {fixableCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium flex-1">
                      {approved.size} of {fixableCount} fixes approved
                    </span>
                    <Button size="sm" variant="outline" onClick={() => approveAllForPage(result.pageId, result)}>
                      <Check className="h-3 w-3 mr-1" /> Approve All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectAllForPage(result.pageId)}>
                      <X className="h-3 w-3 mr-1" /> Reject All
                    </Button>
                    <Button
                      size="sm"
                      disabled={approved.size === 0 || applyingPageId === result.pageId}
                      onClick={() => makeLive(result)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {applyingPageId === result.pageId ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3 mr-1" />
                      )}
                      Make Live ({approved.size})
                    </Button>
                  </div>
                )}

                {/* Checks by Category */}
                {categoryOrder.map(cat => {
                  const catChecks = result.checks.filter(c => c.category === cat);
                  if (catChecks.length === 0) return null;
                  const CatIcon = CATEGORIES[cat].icon;

                  return (
                    <div key={cat}>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <CatIcon className="h-4 w-4" /> {CATEGORIES[cat].label}
                        <span className="text-muted-foreground font-normal">
                          ({catChecks.filter(c => c.status === "pass").length}/{catChecks.length} passed)
                        </span>
                      </h4>
                      <div className="space-y-1.5">
                        {catChecks.map(check => {
                          const isApproved = approved.has(check.id);
                          return (
                            <div
                              key={check.id}
                              className={`flex items-start gap-2 p-2 rounded-md text-sm transition-colors ${
                                isApproved ? "bg-primary/5 border border-primary/20" :
                                check.status === "fail" ? "bg-red-50/50" :
                                check.status === "warn" ? "bg-amber-50/50" : ""
                              }`}
                            >
                              {check.autoFixAvailable && check.status !== "pass" ? (
                                <Checkbox
                                  checked={isApproved}
                                  onCheckedChange={() => toggleApproval(result.pageId, check.id)}
                                  className="mt-0.5"
                                />
                              ) : (
                                <div className="w-4 mt-0.5">
                                  {check.status === "pass" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                  {check.status === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                  {check.status === "fail" && <XCircle className="h-4 w-4 text-red-500" />}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{check.label}</span>
                                <p className="text-xs text-muted-foreground">{check.detail}</p>
                                {check.autoFixAvailable && check.status !== "pass" && check.fixDescription && (
                                  <p className="text-xs text-primary mt-1">
                                    🔧 Fix: {check.fixDescription}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Current vs Suggested Preview */}
                {(result.suggestedValues.meta_title || result.suggestedValues.meta_description) && (
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Preview: Current → Suggested
                    </h4>
                    {result.suggestedValues.meta_title && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Meta Title</p>
                        <div className="grid gap-1">
                          <p className="text-xs line-through text-red-500">{result.currentValues.meta_title || "(empty)"}</p>
                          <p className="text-xs text-green-600 font-medium">{result.suggestedValues.meta_title} ({result.suggestedValues.meta_title.length} chars)</p>
                        </div>
                      </div>
                    )}
                    {result.suggestedValues.meta_description && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Meta Description</p>
                        <div className="grid gap-1">
                          <p className="text-xs line-through text-red-500">{result.currentValues.meta_description || "(empty)"}</p>
                          <p className="text-xs text-green-600 font-medium">{result.suggestedValues.meta_description} ({result.suggestedValues.meta_description.length} chars)</p>
                        </div>
                      </div>
                    )}
                    {result.suggestedValues.keywords?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Keywords ({result.suggestedValues.keywords.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {result.suggestedValues.keywords.slice(0, 15).map((kw: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Empty State */}
      {!loading && auditResults.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready for Full SEO Audit</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Run a comprehensive audit checking 60+ SEO requirements including Technical SEO,
              On-Page optimization, Content quality, and Internal Linking strategy.
              AI will auto-generate fixes for all failed checks.
            </p>
            <Button onClick={runFullAudit} disabled={loading}>
              <Sparkles className="h-4 w-4 mr-2" /> Start Full Audit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SEOFullAudit;
