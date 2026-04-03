import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Code,
  FileText,
  Filter,
  Gauge,
  Globe,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Tag,
  XCircle,
} from "lucide-react";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import { useToast } from "@/hooks/use-toast";
import {
  buildStoredSeoSnapshot,
  contentTypeConfig,
  fetchAllSeoSnapshots,
  mergeKeywordBuckets,
  saveSeoSnapshot,
  type SEOContentType,
  type StoredSEOSnapshot,
} from "@/lib/seoAutomation";

type ScoreStatus = "good" | "warning" | "poor";
type FilterStatus = "all" | ScoreStatus;
type BooleanFilter = "all" | "yes" | "no";
type TypeFilter = "all" | SEOContentType;

interface SEOAudit {
  score: number;
  status: ScoreStatus;
  hasMetaTitle: boolean;
  hasMetaDesc: boolean;
  hasKeywords: boolean;
  hasH1: boolean;
  hasContent: boolean;
  hasSchema: boolean;
  hasSlug: boolean;
  hasCanonical: boolean;
  hasSocial: boolean;
  hasTechnical: boolean;
  aiOptimized: boolean;
  metaTitleLen: number;
  metaDescLen: number;
  keywordCount: number;
  shortTailCount: number;
  longTailCount: number;
  issues: string[];
}

interface DashboardRow {
  key: string;
  id: string;
  contentType: SEOContentType;
  name: string;
  slug?: string;
  city?: string | null;
  state?: string | null;
  item: Record<string, any>;
  snapshot: StoredSEOSnapshot | null;
  audit: SEOAudit;
}

const contentTypes = Object.keys(contentTypeConfig) as SEOContentType[];

const getName = (item: Record<string, any>) => item.title || item.name || item.full_name || "Untitled";

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ");

const getTextContent = (item: Record<string, any>) =>
  stripHtml(
    item.description ||
      item.content ||
      item.intro_content ||
      item.detailed_content ||
      item.faq_content ||
      item.admission_process ||
      item.eligibility ||
      "",
  );

const getSEOAudit = (
  contentType: SEOContentType,
  item: Record<string, any>,
  snapshot: StoredSEOSnapshot | null,
): SEOAudit => {
  const issues: string[] = [];
  const resolvedTitle = snapshot?.meta_title || item.meta_title || "";
  const resolvedDescription = snapshot?.meta_description || item.meta_description || "";
  const resolvedKeywords = snapshot?.keywords?.length ? snapshot.keywords : item.keywords || [];
  const resolvedH1 = snapshot?.h1_tag || item.h1_tag || item.title || item.name || item.full_name || "";
  const wordCount = getTextContent(item).split(/\s+/).filter(Boolean).length;
  const metaTitleLen = resolvedTitle.length;
  const metaDescLen = resolvedDescription.length;
  const keywordCount = resolvedKeywords.length;
  const shortTailCount = snapshot?.keywordBuckets?.shortTail?.length || 0;
  const longTailCount = snapshot?.keywordBuckets?.longTail?.length || 0;
  const hasSchema = Boolean(snapshot?.schemaMarkup) || Boolean(item.slug && getName(item));
  const hasCanonical = Boolean(snapshot?.canonicalUrl || snapshot?.technicalSEO?.canonicalUrl || item.slug);
  const hasSocial = Boolean(
    snapshot?.socialMeta?.ogTitle || snapshot?.socialMeta?.twitterTitle || item.meta_title,
  );
  const hasTechnical = Boolean(
    snapshot?.technicalSEO &&
      [
        snapshot.technicalSEO.pagespeedTips?.length,
        snapshot.technicalSEO.mobileTips?.length,
        snapshot.technicalSEO.securityChecks?.length,
        snapshot.technicalSEO.crawlabilityTips?.length,
        snapshot.technicalSEO.keywordPlacementTips?.length,
      ].some(Boolean),
  );

  let score = 0;

  const hasMetaTitle = metaTitleLen >= 10;
  if (hasMetaTitle) {
    score += metaTitleLen <= 60 ? 15 : 10;
    if (metaTitleLen > 60) issues.push("Meta title exceeds 60 characters");
  } else {
    issues.push("Missing or too-short meta title");
  }

  const hasMetaDesc = metaDescLen >= 70;
  if (hasMetaDesc) {
    if (metaDescLen >= 120 && metaDescLen <= 160) score += 15;
    else {
      score += 9;
      issues.push("Meta description is outside the ideal 120-160 range");
    }
  } else {
    issues.push("Missing or too-short meta description");
  }

  const hasKeywords = keywordCount >= 4;
  if (hasKeywords) score += 10;
  else issues.push("Keyword coverage is thin");

  if (shortTailCount > 0) score += 8;
  else issues.push("Short-tail keywords have not been researched yet");

  if (longTailCount > 0) score += 8;
  else issues.push("Long-tail keywords have not been researched yet");

  const hasH1 = Boolean(resolvedH1);
  if (hasH1) score += 8;
  else issues.push("Missing optimized H1 heading");

  const hasSlug = Boolean(item.slug);
  if (hasSlug && item.slug === String(item.slug).toLowerCase() && !String(item.slug).includes(" ")) score += 8;
  else if (hasSlug) issues.push("Slug needs cleanup for SEO");
  else issues.push("Missing slug");

  const hasContent = wordCount >= 250;
  if (wordCount >= 1000) score += 10;
  else if (wordCount >= 250) {
    score += 6;
    issues.push(`Content depth is moderate at ${wordCount} words`);
  } else {
    issues.push(`Thin content depth at ${wordCount} words`);
  }

  if (hasSchema) score += 10;
  else issues.push("Schema markup is not available");

  if (hasCanonical) score += 4;
  else issues.push("Canonical URL is missing");

  if (hasSocial) score += 4;
  else issues.push("Social meta is incomplete");

  if (hasTechnical) score += 10;
  else issues.push("Technical SEO guidance has not been generated");

  const aiOptimized = Boolean(snapshot);
  if (aiOptimized) score += 8;
  else issues.push("AI research snapshot is missing");

  if (contentType === "cityPage" && !item.city_aliases?.length) {
    issues.push("City aliases are missing for broader regional matching");
  }

  score = Math.min(100, score);

  return {
    score,
    status: score >= 80 ? "good" : score >= 55 ? "warning" : "poor",
    hasMetaTitle,
    hasMetaDesc,
    hasKeywords,
    hasH1,
    hasContent,
    hasSchema,
    hasSlug,
    hasCanonical,
    hasSocial,
    hasTechnical,
    aiOptimized,
    metaTitleLen,
    metaDescLen,
    keywordCount,
    shortTailCount,
    longTailCount,
    issues,
  };
};

const AdminSEODashboard = () => {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<TypeFilter>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [schemaFilter, setSchemaFilter] = useState<BooleanFilter>("all");
  const [aiFilter, setAiFilter] = useState<BooleanFilter>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [snapshots, ...results] = await Promise.all([
        fetchAllSeoSnapshots(),
        ...contentTypes.map((contentType) =>
          supabase
            .from(contentTypeConfig[contentType].table as any)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000),
        ),
      ]);

      const nextRows = results.flatMap((result, index) => {
        const contentType = contentTypes[index];
        const items = (result.data as Record<string, any>[] | null) || [];

        return items.map((item) => {
          const snapshot = snapshots[`${contentType}:${item.id}`] || null;
          const audit = getSEOAudit(contentType, item, snapshot);

          return {
            key: `${contentType}:${item.id}`,
            id: item.id,
            contentType,
            name: getName(item),
            slug: item.slug,
            city: item.city || null,
            state: item.state || null,
            item,
            snapshot,
            audit,
          } satisfies DashboardRow;
        });
      });

      setRows(nextRows);
    } catch (e: any) {
      toast({ title: "SEO dashboard error", description: e.message || "Failed to load SEO data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedType !== "all" && row.contentType !== selectedType) return false;
      if (filterStatus !== "all" && row.audit.status !== filterStatus) return false;
      if (schemaFilter === "yes" && !row.audit.hasSchema) return false;
      if (schemaFilter === "no" && row.audit.hasSchema) return false;
      if (aiFilter === "yes" && !row.audit.aiOptimized) return false;
      if (aiFilter === "no" && row.audit.aiOptimized) return false;
      if (cityFilter !== "all" && (row.city || "") !== cityFilter) return false;
      if (stateFilter !== "all" && (row.state || "") !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return [row.name, row.slug, row.city, row.state, contentTypeConfig[row.contentType].label]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      }
      return true;
    });
  }, [rows, selectedType, filterStatus, schemaFilter, aiFilter, cityFilter, stateFilter, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const good = rows.filter((row) => row.audit.status === "good").length;
    const warning = rows.filter((row) => row.audit.status === "warning").length;
    const poor = rows.filter((row) => row.audit.status === "poor").length;
    const avgScore = total ? Math.round(rows.reduce((sum, row) => sum + row.audit.score, 0) / total) : 0;

    return {
      total,
      good,
      warning,
      poor,
      avgScore,
      optimized: rows.filter((row) => row.audit.score >= 80 && row.audit.hasSchema && row.audit.hasCanonical).length,
      withMetaTitle: rows.filter((row) => row.audit.hasMetaTitle).length,
      withMetaDesc: rows.filter((row) => row.audit.hasMetaDesc).length,
      withSchema: rows.filter((row) => row.audit.hasSchema).length,
      withCanonical: rows.filter((row) => row.audit.hasCanonical).length,
      withSocial: rows.filter((row) => row.audit.hasSocial).length,
      withTechnical: rows.filter((row) => row.audit.hasTechnical).length,
      withAI: rows.filter((row) => row.audit.aiOptimized).length,
      withShortTail: rows.filter((row) => row.audit.shortTailCount > 0).length,
      withLongTail: rows.filter((row) => row.audit.longTailCount > 0).length,
    };
  }, [rows]);

  const pct = (value: number) => (stats.total ? Math.round((value / stats.total) * 100) : 0);

  const stateOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.state).filter(Boolean))) as string[],
    [rows],
  );
  const cityOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.city).filter(Boolean))) as string[],
    [rows],
  );

  const selectedRows = filteredRows.filter((row) => selectedKeys.includes(row.key));
  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedKeys.includes(row.key));

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedKeys((current) => current.filter((key) => !filteredRows.some((row) => row.key === key)));
      return;
    }

    setSelectedKeys((current) => Array.from(new Set([...current, ...filteredRows.map((row) => row.key)])));
  };

  const toggleRow = (rowKey: string, checked: boolean) => {
    setSelectedKeys((current) =>
      checked ? Array.from(new Set([...current, rowKey])) : current.filter((key) => key !== rowKey),
    );
  };

  const applySEOFields = async (row: DashboardRow, suggestions: Partial<{ meta_title: string; meta_description: string; h1_tag: string; keywords: string[] }>) => {
    const update: Record<string, any> = {};
    if (suggestions.meta_title) update.meta_title = suggestions.meta_title;
    if (suggestions.meta_description) update.meta_description = suggestions.meta_description;
    if (suggestions.keywords?.length) update.keywords = suggestions.keywords;

    if (contentTypeConfig[row.contentType].supportsH1Column && suggestions.h1_tag) {
      update.h1_tag = suggestions.h1_tag;
    }

    const { error } = await supabase
      .from(contentTypeConfig[row.contentType].table as any)
      .update(update)
      .eq("id", row.id);

    if (error) {
      toast({ title: "SEO update failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "SEO updated", description: `${row.name} was updated without changing core content.` });
    fetchDashboardData();
  };

  const handleBulkOptimize = async () => {
    if (!selectedRows.length) {
      toast({ title: "No pages selected", description: "Choose at least one page before running bulk AI SEO." });
      return;
    }

    setBulkLoading(true);
    let successCount = 0;
    let failureCount = 0;

    for (const row of selectedRows) {
      try {
        const { data, error } = await supabase.functions.invoke("ai-seo-enhance", {
          body: {
            contentType: row.contentType,
            data: row.item,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const suggestions = data?.suggestions;
        if (!suggestions) throw new Error("Missing AI suggestions");

        const update: Record<string, any> = {
          meta_title: suggestions.meta_title,
          meta_description: suggestions.meta_description,
          keywords: mergeKeywordBuckets(suggestions.keywords),
        };

        if (contentTypeConfig[row.contentType].supportsH1Column && suggestions.h1_tag) {
          update.h1_tag = suggestions.h1_tag;
        }

        const { error: updateError } = await supabase
          .from(contentTypeConfig[row.contentType].table as any)
          .update(update)
          .eq("id", row.id);

        if (updateError) throw updateError;

        await saveSeoSnapshot(buildStoredSeoSnapshot(row.contentType, row.item, suggestions));
        successCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 350));
      } catch (e) {
        console.error("bulk seo error", row.key, e);
        failureCount += 1;
      }
    }

    setBulkLoading(false);
    setSelectedKeys([]);
    fetchDashboardData();

    toast({
      title: "Bulk AI SEO complete",
      description:
        failureCount > 0
          ? `${successCount} pages optimized, ${failureCount} failed.`
          : `${successCount} pages optimized and auto-saved successfully.`,
    });
  };

  const commonIssues = useMemo(() => {
    const issueCounts: Record<string, number> = {};
    rows.forEach((row) => row.audit.issues.forEach((issue) => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }));
    return Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Advanced AI SEO Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-type SEO monitoring, bulk AI optimization, auto-saved schema, and technical keyword coverage.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchDashboardData} disabled={loading || bulkLoading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={handleBulkOptimize} disabled={bulkLoading || selectedRows.length === 0}>
            {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Bulk AI Optimize ({selectedRows.length})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">All Pages ({filteredRows.length})</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Average score" value={`${stats.avgScore}%`} tone={stats.avgScore >= 80 ? "good" : stats.avgScore >= 55 ? "warning" : "poor"} />
            <StatCard label="Tracked pages" value={String(stats.total)} />
            <StatCard label="SEO-friendly pages" value={`${pct(stats.optimized)}%`} helper={`${stats.optimized}/${stats.total}`} tone={pct(stats.optimized) >= 70 ? "good" : pct(stats.optimized) >= 40 ? "warning" : "poor"} />
            <StatCard label="Schema usage" value={`${pct(stats.withSchema)}%`} helper={`${stats.withSchema}/${stats.total}`} tone={pct(stats.withSchema) >= 80 ? "good" : pct(stats.withSchema) >= 50 ? "warning" : "poor"} />
            <StatCard label="AI research coverage" value={`${pct(stats.withAI)}%`} helper={`${stats.withAI}/${stats.total}`} tone={pct(stats.withAI) >= 70 ? "good" : pct(stats.withAI) >= 40 ? "warning" : "poor"} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> SEO element coverage across all pages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CoverageBar label="Meta titles" count={stats.withMetaTitle} total={stats.total} icon={<FileText className="h-3 w-3" />} />
              <CoverageBar label="Meta descriptions" count={stats.withMetaDesc} total={stats.total} icon={<FileText className="h-3 w-3" />} />
              <CoverageBar label="Schema markup" count={stats.withSchema} total={stats.total} icon={<Code className="h-3 w-3" />} />
              <CoverageBar label="Canonical coverage" count={stats.withCanonical} total={stats.total} icon={<Link2 className="h-3 w-3" />} />
              <CoverageBar label="Social meta coverage" count={stats.withSocial} total={stats.total} icon={<Globe className="h-3 w-3" />} />
              <CoverageBar label="Technical SEO research" count={stats.withTechnical} total={stats.total} icon={<Gauge className="h-3 w-3" />} />
              <CoverageBar label="Short-tail keywords" count={stats.withShortTail} total={stats.total} icon={<Tag className="h-3 w-3" />} />
              <CoverageBar label="Long-tail keywords" count={stats.withLongTail} total={stats.total} icon={<Search className="h-3 w-3" />} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Score distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {[...Array(10)].map((_, bucket) => {
                    const low = bucket * 10;
                    const high = low + 10;
                    const count = rows.filter((row) => row.audit.score >= low && row.audit.score < high).length;
                    const height = stats.total ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t ${low >= 80 ? "bg-green-500" : low >= 55 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        <span className="text-[9px] text-muted-foreground">{low}-{high}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Largest unresolved gaps</CardTitle>
              </CardHeader>
              <CardContent>
                {commonIssues.length > 0 ? commonIssues.slice(0, 6).map(([issue, count]) => (
                  <div key={issue} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{issue}</span>
                    <Badge variant="outline" className="text-xs">{count} pages</Badge>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No open SEO issues found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-3 xl:grid-cols-6 md:grid-cols-3">
                <div className="relative xl:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, slug, city, state..." className="pl-9" />
                </div>
                <Select value={selectedType} onValueChange={(value) => setSelectedType(value as TypeFilter)}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All content types</SelectItem>
                    {contentTypes.map((contentType) => (
                      <SelectItem key={contentType} value={contentType}>{contentTypeConfig[contentType].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                  <SelectTrigger><SelectValue placeholder="Score band" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All scores</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="warning">Needs work</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={schemaFilter} onValueChange={(value) => setSchemaFilter(value as BooleanFilter)}>
                  <SelectTrigger><SelectValue placeholder="Schema" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Schema: all</SelectItem>
                    <SelectItem value="yes">Schema present</SelectItem>
                    <SelectItem value="no">Schema missing</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={aiFilter} onValueChange={(value) => setAiFilter(value as BooleanFilter)}>
                  <SelectTrigger><SelectValue placeholder="AI coverage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">AI: all</SelectItem>
                    <SelectItem value="yes">AI researched</SelectItem>
                    <SelectItem value="no">AI missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <MapPin className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All states</SelectItem>
                    {stateOptions.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <MapPin className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {cityOptions.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 text-sm text-muted-foreground xl:col-span-2">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))} />
                  <span>Select all visible pages for one-click bulk AI optimization</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      <TableHead className="w-12">Pick</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Exact issues</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>
                          <Checkbox checked={selectedKeys.includes(row.key)} onCheckedChange={(checked) => toggleRow(row.key, Boolean(checked))} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium leading-none">{row.name}</p>
                            <p className="text-xs text-muted-foreground">/{row.slug || "missing-slug"}</p>
                            {(row.city || row.state) && (
                              <p className="text-xs text-muted-foreground">{[row.city, row.state].filter(Boolean).join(", ")}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{contentTypeConfig[row.contentType].label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <MiniBadge active={row.audit.hasMetaTitle}>Title</MiniBadge>
                            <MiniBadge active={row.audit.hasMetaDesc}>Meta</MiniBadge>
                            <MiniBadge active={row.audit.hasSchema}>Schema</MiniBadge>
                            <MiniBadge active={row.audit.hasCanonical}>Canonical</MiniBadge>
                            <MiniBadge active={row.audit.shortTailCount > 0}>Short-tail</MiniBadge>
                            <MiniBadge active={row.audit.longTailCount > 0}>Long-tail</MiniBadge>
                            <MiniBadge active={row.audit.aiOptimized}>AI</MiniBadge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 max-w-[280px]">
                            {row.audit.issues.slice(0, 3).map((issue) => (
                              <p key={issue} className="text-xs text-muted-foreground">• {issue}</p>
                            ))}
                            {row.audit.issues.length > 3 && <p className="text-xs text-muted-foreground">+{row.audit.issues.length - 3} more</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {row.audit.status === "good" && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {row.audit.status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            {row.audit.status === "poor" && <XCircle className="h-4 w-4 text-red-500" />}
                            <span className="text-sm font-medium">{row.audit.score}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <AISEOButton
                            contentType={row.contentType}
                            recordId={row.id}
                            data={row.item}
                            onApply={(suggestions) => applySEOFields(row, suggestions)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Technical SEO status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <TechCheck label="HTTPS delivery" status={window.location.protocol === "https:" ? "pass" : "warn"} detail="Preview uses secure transport and published pages should remain on HTTPS." />
                <TechCheck label="robots.txt availability" status="pass" detail="robots.txt is present and publicly accessible." />
                <TechCheck label="Sitemap availability" status="pass" detail="Sitemap tooling exists in the admin panel." />
                <TechCheck label="Canonical coverage" status={pct(stats.withCanonical) >= 80 ? "pass" : pct(stats.withCanonical) >= 50 ? "warn" : "fail"} detail={`${stats.withCanonical}/${stats.total} pages have canonical coverage.`} />
                <TechCheck label="Schema coverage" status={pct(stats.withSchema) >= 80 ? "pass" : pct(stats.withSchema) >= 50 ? "warn" : "fail"} detail={`${stats.withSchema}/${stats.total} pages can emit JSON-LD.`} />
                <TechCheck label="Social meta coverage" status={pct(stats.withSocial) >= 70 ? "pass" : pct(stats.withSocial) >= 40 ? "warn" : "fail"} detail={`${stats.withSocial}/${stats.total} pages have social sharing coverage.`} />
                <TechCheck label="AI technical research" status={pct(stats.withTechnical) >= 70 ? "pass" : pct(stats.withTechnical) >= 40 ? "warn" : "fail"} detail={`${stats.withTechnical}/${stats.total} pages include saved technical SEO guidance.`} />
                <TechCheck label="Keyword research depth" status={pct(stats.withLongTail) >= 70 && pct(stats.withShortTail) >= 70 ? "pass" : pct(stats.withLongTail) >= 40 || pct(stats.withShortTail) >= 40 ? "warn" : "fail"} detail={`${stats.withShortTail}/${stats.total} short-tail and ${stats.withLongTail}/${stats.total} long-tail keyword coverages.`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Granular optimization progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CoverageBar label="Pages scoring 80+" count={stats.optimized} total={stats.total} icon={<CheckCircle className="h-3 w-3" />} />
                <CoverageBar label="AI research snapshots" count={stats.withAI} total={stats.total} icon={<Sparkles className="h-3 w-3" />} />
                <CoverageBar label="Technical SEO snapshots" count={stats.withTechnical} total={stats.total} icon={<Shield className="h-3 w-3" />} />
                <CoverageBar label="Short-tail coverage" count={stats.withShortTail} total={stats.total} icon={<Tag className="h-3 w-3" />} />
                <CoverageBar label="Long-tail coverage" count={stats.withLongTail} total={stats.total} icon={<Search className="h-3 w-3" />} />
                <CoverageBar label="Schema-ready pages" count={stats.withSchema} total={stats.total} icon={<Code className="h-3 w-3" />} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Most common exact improvements needed</CardTitle>
            </CardHeader>
            <CardContent>
              {commonIssues.length > 0 ? commonIssues.map(([issue, count]) => (
                <div key={issue} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm">{issue}</span>
                  <Badge variant="outline" className="text-xs">{count} pages</Badge>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No issues found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function StatCard({ label, value, helper, tone = "default" }: { label: string; value: string; helper?: string; tone?: "default" | "good" | "warning" | "poor" }) {
  const toneClass = tone === "good" ? "text-green-600" : tone === "warning" ? "text-amber-600" : tone === "poor" ? "text-red-600" : "text-foreground";

  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className={`text-3xl font-bold ${toneClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {helper && <p className="text-[10px] text-muted-foreground mt-1">{helper}</p>}
      </CardContent>
    </Card>
  );
}

function MiniBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <Badge variant={active ? "secondary" : "outline"} className="text-[10px]">
      {children}
    </Badge>
  );
}

function CoverageBar({ label, count, total, icon }: { label: string; count: number; total: number; icon: React.ReactNode }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-1.5">{icon} {label}</span>
        <span className={`font-medium ${percent >= 80 ? "text-green-600" : percent >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {count}/{total} ({percent}%)
        </span>
      </div>
      <Progress value={percent} className="h-1.5" />
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
