import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { buildStoredSeoSnapshot, mergeKeywordBuckets, saveSeoSnapshot, type SEOContentType } from "@/lib/seoAutomation";
import {
  Sparkles, Loader2, Check, Copy, Lightbulb, Link, Code, Tag, Search,
  AlertTriangle, XCircle, CheckCircle, Globe, Smartphone, Shield, Gauge,
  Share2, BarChart3,
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
  schemaMarkup: Record<string, any>;
  internalLinks: {
    suggested: string[];
    anchorTexts: string[];
  };
  contentSuggestions: string[];
  competitorInsights: string[];
  seoScore: {
    overall: number;
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
  }>) => void;
}

export const AISEOButton = ({ contentType, data, onApply }: AISEOButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SEOSuggestions | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    meta_title: true, meta_description: true, h1_tag: true, keywords: true,
  });
  const { toast } = useToast();

  const analyze = async () => {
    setLoading(true);
    setSuggestions(null);
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

  const handleApply = async () => {
    if (!suggestions) return;
    const applied: any = {};
    if (selected.meta_title) applied.meta_title = suggestions.meta_title;
    if (selected.meta_description) applied.meta_description = suggestions.meta_description;
    if (selected.h1_tag) applied.h1_tag = suggestions.h1_tag;
    if (selected.keywords) {
      applied.keywords = mergeKeywordBuckets(suggestions.keywords);
    }

    try {
      if (recordId) {
        await saveSeoSnapshot(
          buildStoredSeoSnapshot(contentType, { ...data, id: recordId }, suggestions),
        );
      }

      onApply(applied);
      toast({
        title: "SEO Applied",
        description: recordId
          ? "SEO fields updated and schema/technical SEO saved for automatic page rendering."
          : "Selected SEO fields updated. Save this record to keep future SEO automation in sync.",
      });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "SEO Save Error", description: e.message || "Failed to save SEO snapshot", variant: "destructive" });
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
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Comprehensive AI SEO Analysis
              {suggestions && (
                <Badge className={`ml-2 ${scoreBarColor(suggestions.seoScore.overall)} text-white`}>
                  Score: {suggestions.seoScore.overall}/100
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Deep SEO research in progress — analyzing keywords, schema, technical SEO...</p>
            </div>
          )}

          {suggestions && (
            <ScrollArea className="max-h-[75vh]">
              {/* SEO Score Overview */}
              <div className="grid grid-cols-6 gap-2 mb-4">
                {Object.entries(suggestions.seoScore.breakdown).map(([key, val]) => (
                  <div key={key} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className={`text-lg font-bold ${scoreColor(val)}`}>{val}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                ))}
              </div>

              {/* Critical Issues Banner */}
              {suggestions.seoScore.criticalIssues.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-semibold text-destructive flex items-center gap-1 mb-1">
                    <XCircle className="h-4 w-4" /> {suggestions.seoScore.criticalIssues.length} Critical Issues
                  </h4>
                  {suggestions.seoScore.criticalIssues.map((issue, i) => (
                    <p key={i} className="text-xs text-destructive/80 ml-5">• {issue}</p>
                  ))}
                </div>
              )}

              <Tabs defaultValue="meta" className="w-full">
                <TabsList className="w-full grid grid-cols-7">
                  <TabsTrigger value="meta" className="text-xs">Meta</TabsTrigger>
                  <TabsTrigger value="keywords" className="text-xs">Keywords</TabsTrigger>
                  <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
                  <TabsTrigger value="social" className="text-xs">Social</TabsTrigger>
                  <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
                  <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
                </TabsList>

                {/* META TAB */}
                <TabsContent value="meta" className="space-y-4 mt-4">
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    ℹ️ Only meta titles, descriptions, and headers are modified. Your core content remains untouched.
                  </p>
                  <SuggestionField
                    label="Meta Title"
                    value={suggestions.meta_title}
                    charLimit={60}
                    checked={selected.meta_title}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, meta_title: !!v }))}
                    onCopy={copyToClipboard}
                  />
                  <SuggestionField
                    label="Meta Description"
                    value={suggestions.meta_description}
                    charLimit={155}
                    checked={selected.meta_description}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, meta_description: !!v }))}
                    onCopy={copyToClipboard}
                  />
                  <SuggestionField
                    label="H1 Tag"
                    value={suggestions.h1_tag}
                    checked={selected.h1_tag}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, h1_tag: !!v }))}
                    onCopy={copyToClipboard}
                  />
                </TabsContent>

                {/* KEYWORDS TAB */}
                <TabsContent value="keywords" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={selected.keywords}
                      onCheckedChange={(v) => setSelected(s => ({ ...s, keywords: !!v }))}
                    />
                    <span className="text-sm font-medium">Apply all keywords to form</span>
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

                  {/* Content Length */}
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Gauge className="h-4 w-4" /> Content Length Analysis
                    </h4>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Current: <strong>{suggestions.technicalSEO.contentLengthAnalysis.currentWordCount}</strong> words</span>
                      <span>Recommended: <strong>{suggestions.technicalSEO.contentLengthAnalysis.recommendedMinimum}+</strong></span>
                      <Badge variant={suggestions.technicalSEO.contentLengthAnalysis.verdict === "excellent" ? "default" : "destructive"} className="text-xs">
                        {suggestions.technicalSEO.contentLengthAnalysis.verdict}
                      </Badge>
                    </div>
                    <Progress
                      value={Math.min(100, (suggestions.technicalSEO.contentLengthAnalysis.currentWordCount / suggestions.technicalSEO.contentLengthAnalysis.recommendedMinimum) * 100)}
                      className="mt-2 h-2"
                    />
                  </div>

                  {/* Header Structure */}
                  <div className="border rounded-lg p-3">
                    <h4 className="text-sm font-semibold mb-2">Recommended Header Structure</h4>
                    {suggestions.technicalSEO.headerStructure.map((h, i) => (
                      <p key={i} className={`text-xs py-0.5 ${h.startsWith("H1") ? "font-bold" : h.startsWith("H2") ? "ml-3 font-medium" : "ml-6"}`}>{h}</p>
                    ))}
                  </div>

                  {/* Speed */}
                  <TechList icon={<Gauge className="h-4 w-4 text-orange-500" />} title="Page Speed Tips" items={suggestions.technicalSEO.pagespeedTips} />
                  <TechList icon={<Smartphone className="h-4 w-4 text-blue-500" />} title="Mobile Optimization" items={suggestions.technicalSEO.mobileTips} />
                  <TechList icon={<Shield className="h-4 w-4 text-green-500" />} title="Security Checks" items={suggestions.technicalSEO.securityChecks} />
                  <TechList icon={<Globe className="h-4 w-4 text-primary" />} title="Crawlability, Sitemap & Robots" items={suggestions.technicalSEO.crawlabilityTips} />
                  <TechList icon={<Link className="h-4 w-4 text-primary" />} title="Backlink Opportunities" items={suggestions.technicalSEO.backlinkIdeas} />
                  <TechList icon={<BarChart3 className="h-4 w-4 text-primary" />} title="Engagement & CTR Improvements" items={suggestions.technicalSEO.engagementTips} />
                  <TechList icon={<Sparkles className="h-4 w-4 text-primary" />} title="Freshness & Update Plan" items={suggestions.technicalSEO.freshnessTips} />
                  <TechList icon={<Tag className="h-4 w-4 text-primary" />} title="Short-tail & Long-tail Placement" items={suggestions.technicalSEO.keywordPlacementTips} />

                  {/* Image Alt Tags */}
                  {suggestions.technicalSEO.imageAltTags.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <h4 className="text-sm font-semibold mb-2">Image Alt Tag Suggestions</h4>
                      {suggestions.technicalSEO.imageAltTags.map((alt, i) => (
                        <p key={i} className="text-xs py-0.5 text-muted-foreground">• {alt}</p>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* SOCIAL META TAB */}
                <TabsContent value="social" className="space-y-4 mt-4">
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex items-center gap-1">
                    <Share2 className="h-3 w-3" /> Social meta tags optimize how your page appears when shared on Facebook, Twitter, LinkedIn etc.
                  </p>
                  <MetaPreview label="Open Graph (Facebook/LinkedIn)" title={suggestions.socialMeta.ogTitle} description={suggestions.socialMeta.ogDescription} onCopy={copyToClipboard} />
                  <MetaPreview label="Twitter Card" title={suggestions.socialMeta.twitterTitle} description={suggestions.socialMeta.twitterDescription} onCopy={copyToClipboard} />
                </TabsContent>

                {/* SCHEMA TAB */}
                <TabsContent value="schema" className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold flex items-center gap-2"><Code className="h-4 w-4" /> JSON-LD Schema (Production-Ready)</h4>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(JSON.stringify(suggestions.schemaMarkup, null, 2))}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    This schema is automatically generated for your {contentType} page and is auto-saved for live page rendering when this item already exists.
                  </p>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-80 font-mono">
                    {JSON.stringify(suggestions.schemaMarkup, null, 2)}
                  </pre>
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
                  {/* On-Page Tips */}
                  <h4 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> On-Page SEO Improvements</h4>
                  {suggestions.onPageTips.map((tip, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}

                  <h4 className="font-semibold mt-4">Content Structure Suggestions</h4>
                  <p className="text-xs text-muted-foreground">These suggestions improve content structure without changing your existing text.</p>
                  {suggestions.contentSuggestions.map((s, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}

                  {/* Warnings */}
                  {suggestions.seoScore.warnings.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                        <AlertTriangle className="h-4 w-4" /> Warnings ({suggestions.seoScore.warnings.length})
                      </h4>
                      {suggestions.seoScore.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-600 dark:text-amber-300 ml-5">• {w}</p>
                      ))}
                    </div>
                  )}

                  {/* Passed */}
                  {suggestions.seoScore.passed.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4" /> Passed ({suggestions.seoScore.passed.length})
                      </h4>
                      {suggestions.seoScore.passed.map((p, i) => (
                        <p key={i} className="text-xs text-green-600 dark:text-green-300 ml-5">✓ {p}</p>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t sticky bottom-0 bg-background pb-2">
                <Button variant="outline" onClick={() => analyze()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Re-analyze
                </Button>
                <Button onClick={handleApply} className="gap-2">
                  <Check className="h-4 w-4" /> Apply SEO Fields Only
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

function SuggestionField({ label, value, charLimit, checked, onCheckedChange, onCopy }: {
  label: string; value: string; charLimit?: number; checked: boolean;
  onCheckedChange: (v: boolean | "indeterminate") => void; onCopy: (v: string) => void;
}) {
  const isOverLimit = charLimit && value.length > charLimit;
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {charLimit && (
            <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {value.length}/{charLimit}
            </span>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCopy(value)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className="text-sm bg-muted/50 p-2 rounded">{value}</p>
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
        <p key={i} className="text-xs text-muted-foreground py-0.5">• {item}</p>
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
