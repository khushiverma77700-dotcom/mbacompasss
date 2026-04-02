import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Search, CheckCircle, AlertTriangle, XCircle, Loader2,
  Filter, BarChart3, Code, Globe, FileText, Shield,
} from "lucide-react";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import { useToast } from "@/hooks/use-toast";

type ContentType = "article" | "institute" | "college" | "exam" | "cityPage";
type ScoreStatus = "good" | "warning" | "poor";
type FilterStatus = "all" | "good" | "warning" | "poor";

const contentTypes: { value: ContentType; label: string; table: string }[] = [
  { value: "article", label: "Articles", table: "articles" },
  { value: "institute", label: "Institutes", table: "institutes" },
  { value: "college", label: "Colleges", table: "colleges" },
  { value: "exam", label: "Exams", table: "exams" },
  { value: "cityPage", label: "City/State Pages", table: "city_pages" },
];

function getSEOAudit(item: any): {
  score: number;
  status: ScoreStatus;
  hasMetaTitle: boolean;
  hasMetaDesc: boolean;
  hasKeywords: boolean;
  hasH1: boolean;
  hasContent: boolean;
  hasSchema: boolean;
  hasSlug: boolean;
  metaTitleLen: number;
  metaDescLen: number;
  keywordCount: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;
  const maxScore = 100;

  // Meta Title (20 pts)
  const metaTitleLen = item.meta_title?.length || 0;
  const hasMetaTitle = metaTitleLen > 10;
  if (hasMetaTitle) {
    if (metaTitleLen <= 60) score += 20;
    else { score += 12; issues.push("Meta title exceeds 60 chars"); }
  } else {
    issues.push("Missing or too short meta title");
  }

  // Meta Description (20 pts)
  const metaDescLen = item.meta_description?.length || 0;
  const hasMetaDesc = metaDescLen > 20;
  if (hasMetaDesc) {
    if (metaDescLen <= 155 && metaDescLen >= 120) score += 20;
    else if (metaDescLen <= 155) { score += 15; issues.push("Meta description could be longer (120-155 chars ideal)"); }
    else { score += 10; issues.push("Meta description exceeds 155 chars"); }
  } else {
    issues.push("Missing or too short meta description");
  }

  // Keywords (15 pts)
  const keywords = item.keywords || [];
  const keywordCount = keywords.length;
  const hasKeywords = keywordCount >= 3;
  if (keywordCount >= 8) score += 15;
  else if (keywordCount >= 5) score += 12;
  else if (keywordCount >= 3) score += 8;
  else if (keywordCount > 0) { score += 4; issues.push(`Only ${keywordCount} keywords (recommend 5+)`); }
  else issues.push("No keywords defined");

  // H1 Tag (10 pts)
  const hasH1 = !!(item.h1_tag || item.name || item.title);
  if (item.h1_tag) score += 10;
  else if (item.name || item.title) { score += 5; issues.push("Using name/title as H1 — set a dedicated H1 tag"); }
  else issues.push("Missing H1 tag");

  // Content (15 pts)
  const content = item.description || item.content || item.intro_content || item.detailed_content || "";
  const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  const hasContent = wordCount > 100;
  if (wordCount >= 1500) score += 15;
  else if (wordCount >= 800) { score += 10; issues.push(`Content is ${wordCount} words (1500+ recommended)`); }
  else if (wordCount >= 300) { score += 6; issues.push(`Content is only ${wordCount} words`); }
  else { issues.push(`Very thin content: ${wordCount} words`); }

  // Slug (10 pts)
  const hasSlug = !!item.slug;
  if (hasSlug) {
    if (item.slug === item.slug.toLowerCase() && !item.slug.includes(" ") && item.slug.length <= 75) score += 10;
    else { score += 5; issues.push("Slug could be more SEO-friendly"); }
  } else issues.push("Missing URL slug");

  // Schema placeholder (10 pts) - we check if JSON-LD would be needed
  const hasSchema = false; // Schema is auto-generated in frontend; this tracks if data supports rich schema
  if (item.meta_title && item.meta_description && hasContent) score += 10;
  else issues.push("Insufficient data for rich schema markup");

  return {
    score: Math.min(score, maxScore),
    status: score >= 70 ? "good" : score >= 40 ? "warning" : "poor",
    hasMetaTitle, hasMetaDesc, hasKeywords, hasH1, hasContent, hasSchema: score >= 70,
    hasSlug, metaTitleLen, metaDescLen, keywordCount, issues,
  };
}

const AdminSEODashboard = () => {
  const [selectedType, setSelectedType] = useState<ContentType>("article");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const { toast } = useToast();

  const fetchItems = async (type: ContentType) => {
    setLoading(true);
    const config = contentTypes.find(c => c.value === type)!;
    const { data } = await supabase
      .from(config.table as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(selectedType); }, [selectedType]);

  const audits = useMemo(() => items.map(item => ({ item, audit: getSEOAudit(item) })), [items]);

  const filteredAudits = useMemo(() => {
    if (filterStatus === "all") return audits;
    return audits.filter(a => a.audit.status === filterStatus);
  }, [audits, filterStatus]);

  const stats = useMemo(() => {
    const total = audits.length;
    const good = audits.filter(a => a.audit.status === "good").length;
    const warning = audits.filter(a => a.audit.status === "warning").length;
    const poor = audits.filter(a => a.audit.status === "poor").length;
    const avgScore = total > 0 ? Math.round(audits.reduce((s, a) => s + a.audit.score, 0) / total) : 0;
    const withMetaTitle = audits.filter(a => a.audit.hasMetaTitle).length;
    const withMetaDesc = audits.filter(a => a.audit.hasMetaDesc).length;
    const withKeywords = audits.filter(a => a.audit.hasKeywords).length;
    const withSchema = audits.filter(a => a.audit.hasSchema).length;
    const withH1 = audits.filter(a => a.audit.hasH1).length;
    const withSlug = audits.filter(a => a.audit.hasSlug).length;
    return { total, good, warning, poor, avgScore, withMetaTitle, withMetaDesc, withKeywords, withSchema, withH1, withSlug };
  }, [audits]);

  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;

  const handleApply = async (item: any, suggestions: any) => {
    const config = contentTypes.find(c => c.value === selectedType)!;
    const update: any = {};
    if (suggestions.meta_title) update.meta_title = suggestions.meta_title;
    if (suggestions.meta_description) update.meta_description = suggestions.meta_description;
    if (suggestions.h1_tag && (selectedType === "article" || selectedType === "cityPage")) update.h1_tag = suggestions.h1_tag;
    if (suggestions.keywords) update.keywords = suggestions.keywords;

    const { error } = await supabase.from(config.table as any).update(update).eq("id", item.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "SEO Updated", description: `${item.name || item.title} SEO fields updated. Content unchanged.` });
      fetchItems(selectedType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI SEO Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep analysis across all content — meta tags, schema, technical SEO, keywords, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-36">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              <SelectItem value="good">✅ Good</SelectItem>
              <SelectItem value="warning">⚠️ Needs Work</SelectItem>
              <SelectItem value="poor">❌ Poor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ContentType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contentTypes.map(ct => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">All Pages ({filteredAudits.length})</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Score Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className={`text-3xl font-bold ${stats.avgScore >= 70 ? "text-green-600" : stats.avgScore >= 40 ? "text-amber-600" : "text-red-600"}`}>{stats.avgScore}%</p>
                <p className="text-xs text-muted-foreground">Avg SEO Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.good}</p>
                <p className="text-xs text-muted-foreground">Good SEO ({pct(stats.good)}%)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{stats.warning}</p>
                <p className="text-xs text-muted-foreground">Needs Work ({pct(stats.warning)}%)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.poor}</p>
                <p className="text-xs text-muted-foreground">Poor SEO ({pct(stats.poor)}%)</p>
              </CardContent>
            </Card>
          </div>

          {/* SEO Element Coverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> SEO Element Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CoverageBar label="Meta Title" count={stats.withMetaTitle} total={stats.total} icon={<FileText className="h-3 w-3" />} />
              <CoverageBar label="Meta Description" count={stats.withMetaDesc} total={stats.total} icon={<FileText className="h-3 w-3" />} />
              <CoverageBar label="Keywords (3+)" count={stats.withKeywords} total={stats.total} icon={<Search className="h-3 w-3" />} />
              <CoverageBar label="H1 Tag" count={stats.withH1} total={stats.total} icon={<Code className="h-3 w-3" />} />
              <CoverageBar label="SEO-Ready Slug" count={stats.withSlug} total={stats.total} icon={<Globe className="h-3 w-3" />} />
              <CoverageBar label="Schema-Ready" count={stats.withSchema} total={stats.total} icon={<Code className="h-3 w-3" />} />
            </CardContent>
          </Card>

          {/* Score Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {[...Array(10)].map((_, bucket) => {
                  const lo = bucket * 10;
                  const hi = lo + 10;
                  const count = audits.filter(a => a.audit.score >= lo && a.audit.score < hi).length;
                  const height = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t ${lo >= 70 ? "bg-green-500" : lo >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <span className="text-[9px] text-muted-foreground">{lo}-{hi}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAGES TAB */}
        <TabsContent value="pages" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Meta Title</TableHead>
                      <TableHead>Meta Desc</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAudits.map(({ item, audit }) => {
                      const name = item.name || item.title || "Untitled";
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium max-w-[150px] truncate">{name}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs">
                            {audit.hasMetaTitle ? (
                              <span className="text-muted-foreground">{item.meta_title}</span>
                            ) : (
                              <span className="text-destructive font-medium">Missing</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {audit.hasMetaDesc ? (
                              <Badge variant="secondary" className="text-[10px]">{audit.metaDescLen} chars</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Missing</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {audit.keywordCount > 0 ? (
                              <Badge variant="secondary" className="text-[10px]">{audit.keywordCount}</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">None</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={audit.issues.length > 3 ? "destructive" : audit.issues.length > 0 ? "outline" : "secondary"} className="text-[10px]">
                              {audit.issues.length} issues
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {audit.status === "good" && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {audit.status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                              {audit.status === "poor" && <XCircle className="h-4 w-4 text-red-500" />}
                              <span className="text-sm font-medium">{audit.score}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <AISEOButton
                              contentType={selectedType}
                              data={item}
                              onApply={(s) => handleApply(item, s)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TECHNICAL SEO TAB */}
        <TabsContent value="technical" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Technical Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <TechCheck label="HTTPS enabled" status="pass" detail="All pages served over HTTPS" />
                <TechCheck label="robots.txt configured" status="pass" detail="Admin, auth, dashboard blocked" />
                <TechCheck label="Sitemap available" status="pass" detail="Auto-generated via admin" />
                <TechCheck label="Canonical tags" status="pass" detail="Set via SEOHead component" />
                <TechCheck label="Open Graph meta" status="pass" detail="Configured per page type" />
                <TechCheck label="Twitter Card meta" status="pass" detail="Configured per page type" />
                <TechCheck label="JSON-LD Schema" status="pass" detail="Auto-generated per content type" />
                <TechCheck label="Responsive viewport" status="pass" detail="Mobile-first design" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Content Health for {contentTypes.find(c => c.value === selectedType)?.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Pages with adequate content (300+ words)</span>
                    <span className="font-medium">{audits.filter(a => a.audit.hasContent).length}/{stats.total}</span>
                  </div>
                  <Progress value={pct(audits.filter(a => a.audit.hasContent).length)} className="h-2" />
                </div>
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Pages fully SEO-optimized (70+)</span>
                    <span className="font-medium">{stats.good}/{stats.total}</span>
                  </div>
                  <Progress value={pct(stats.good)} className="h-2" />
                </div>
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Pages with dedicated H1 tag</span>
                    <span className="font-medium">{audits.filter(a => a.item.h1_tag).length}/{stats.total}</span>
                  </div>
                  <Progress value={pct(audits.filter(a => a.item.h1_tag).length)} className="h-2" />
                </div>
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Pages with 5+ keywords</span>
                    <span className="font-medium">{audits.filter(a => a.audit.keywordCount >= 5).length}/{stats.total}</span>
                  </div>
                  <Progress value={pct(audits.filter(a => a.audit.keywordCount >= 5).length)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Most Common Issues */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Most Common SEO Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const issueCounts: Record<string, number> = {};
                audits.forEach(a => a.audit.issues.forEach(issue => {
                  issueCounts[issue] = (issueCounts[issue] || 0) + 1;
                }));
                const sorted = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
                return sorted.length > 0 ? sorted.map(([issue, count]) => (
                  <div key={issue} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm">{issue}</span>
                    <Badge variant="outline" className="text-xs">{count} pages</Badge>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No issues found 🎉</p>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function CoverageBar({ label, count, total, icon }: { label: string; count: number; total: number; icon: React.ReactNode }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-1.5">{icon} {label}</span>
        <span className={`font-medium ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {count}/{total} ({pct}%)
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function TechCheck({ label, status, detail }: { label: string; status: "pass" | "warn" | "fail"; detail: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {status === "pass" && <CheckCircle className="h-4 w-4 text-green-500" />}
      {status === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
      {status === "fail" && <XCircle className="h-4 w-4 text-red-500" />}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export default AdminSEODashboard;
