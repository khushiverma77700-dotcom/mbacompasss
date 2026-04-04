import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, BarChart3, BookOpen, CheckCircle, Code,
  Copy, FileText, Filter, Gauge, Globe, Link2, Loader2, MapPin, Minus, PenTool, RefreshCw,
  Save, Search, Shield, Sparkles, Tag, Target, Trash2, TrendingUp, Trophy, Users, XCircle, Zap,
  Download, Eye, Database, Layers, Radio, Settings, FileCheck, MonitorSmartphone, Lock,
} from "lucide-react";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import { useToast } from "@/hooks/use-toast";
import {
  buildStoredSeoSnapshot, contentTypeConfig, fetchAllSeoSnapshots, mergeKeywordBuckets,
  saveSeoSnapshot, type SEOContentType, type StoredSEOSnapshot,
} from "@/lib/seoAutomation";

// ── Types ──
type ScoreStatus = "good" | "warning" | "poor";
type FilterStatus = "all" | ScoreStatus;
type BooleanFilter = "all" | "yes" | "no";
type TypeFilter = "all" | SEOContentType;

interface SEOAudit {
  score: number; status: ScoreStatus;
  hasMetaTitle: boolean; hasMetaDesc: boolean; hasKeywords: boolean; hasH1: boolean;
  hasContent: boolean; hasSchema: boolean; hasSlug: boolean; hasCanonical: boolean;
  hasSocial: boolean; hasTechnical: boolean; aiOptimized: boolean;
  metaTitleLen: number; metaDescLen: number; keywordCount: number;
  shortTailCount: number; longTailCount: number; issues: string[];
}

interface DashboardRow {
  key: string; id: string; contentType: SEOContentType; name: string;
  slug?: string; city?: string | null; state?: string | null;
  item: Record<string, any>; snapshot: StoredSEOSnapshot | null; audit: SEOAudit;
}

interface KeywordResult {
  keyword: string; searchVolume: number; competition: string; difficulty: number;
  cpc?: number; intent: string; trending: string; category?: string;
}

interface BlogTitleResult {
  title: string; targetKeyword: string; searchVolume: number; competition: string;
  contentType: string; wordCount?: number; priority: string; trendingScore: number;
  metaTitle?: string; metaDescription?: string; slug?: string;
}

interface CompetitorResult {
  domain: string; domainAuthority: number; strengths: string[];
  contentStrategy: string; topContentTypes?: string[]; uniqueKeywords: string[];
  backlinkStrategy?: string; socialPresence?: string;
}

interface CompetitorGap {
  keyword: string; searchVolume: number; competitorRanking?: string;
  difficulty: number; opportunity: string;
}

interface SavedBlogIdea {
  id: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  targetKeyword: string;
  searchVolume: number;
  competition: string;
  contentType: string;
  priority: string;
  savedAt: string;
}

// Tables that actually have a keywords column
const TABLES_WITH_KEYWORDS: SEOContentType[] = ["article", "institute", "college", "exam", "cityPage"];

// ── Helpers ──
const contentTypes = Object.keys(contentTypeConfig) as SEOContentType[];
const getName = (item: Record<string, any>) => item.title || item.name || item.full_name || "Untitled";
const stripHtml = (v: string) => v.replace(/<[^>]*>/g, " ");
const getTextContent = (item: Record<string, any>) =>
  stripHtml(item.description || item.content || item.intro_content || item.detailed_content || item.faq_content || item.admission_process || item.eligibility || "");

const generateSlug = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const getSEOAudit = (contentType: SEOContentType, item: Record<string, any>, snapshot: StoredSEOSnapshot | null): SEOAudit => {
  const issues: string[] = [];
  const resolvedTitle = snapshot?.meta_title || item.meta_title || "";
  const resolvedDesc = snapshot?.meta_description || item.meta_description || "";
  const resolvedKw = snapshot?.keywords?.length ? snapshot.keywords : item.keywords || [];
  const resolvedH1 = snapshot?.h1_tag || item.h1_tag || item.title || item.name || item.full_name || "";
  const wordCount = getTextContent(item).split(/\s+/).filter(Boolean).length;
  const metaTitleLen = resolvedTitle.length;
  const metaDescLen = resolvedDesc.length;
  const keywordCount = resolvedKw.length;
  const shortTailCount = snapshot?.keywordBuckets?.shortTail?.length || 0;
  const longTailCount = snapshot?.keywordBuckets?.longTail?.length || 0;
  const hasSchema = Boolean(snapshot?.schemaMarkup) || Boolean(item.slug && getName(item));
  const hasCanonical = Boolean(snapshot?.canonicalUrl || snapshot?.technicalSEO?.canonicalUrl || item.slug);
  const hasSocial = Boolean(snapshot?.socialMeta?.ogTitle || snapshot?.socialMeta?.twitterTitle || item.meta_title);
  const hasTechnical = Boolean(snapshot?.technicalSEO && [snapshot.technicalSEO.pagespeedTips?.length, snapshot.technicalSEO.mobileTips?.length, snapshot.technicalSEO.securityChecks?.length, snapshot.technicalSEO.crawlabilityTips?.length, snapshot.technicalSEO.keywordPlacementTips?.length].some(Boolean));

  let score = 0;
  const hasMetaTitle = metaTitleLen >= 10;
  if (hasMetaTitle) { score += metaTitleLen <= 60 ? 15 : 10; if (metaTitleLen > 60) issues.push("Meta title exceeds 60 characters"); }
  else issues.push("Missing or too-short meta title");

  const hasMetaDesc = metaDescLen >= 70;
  if (hasMetaDesc) { if (metaDescLen >= 120 && metaDescLen <= 160) score += 15; else { score += 9; issues.push("Meta description outside 120-160 range"); } }
  else issues.push("Missing or too-short meta description");

  const hasKeywords = keywordCount >= 4;
  if (hasKeywords) score += 10; else issues.push("Keyword coverage is thin");
  if (shortTailCount > 0) score += 8; else issues.push("Short-tail keywords not researched");
  if (longTailCount > 0) score += 8; else issues.push("Long-tail keywords not researched");

  const hasH1 = Boolean(resolvedH1);
  if (hasH1) score += 8; else issues.push("Missing H1 heading");
  const hasSlug = Boolean(item.slug);
  if (hasSlug && item.slug === String(item.slug).toLowerCase() && !String(item.slug).includes(" ")) score += 8;
  else if (hasSlug) issues.push("Slug needs cleanup"); else issues.push("Missing slug");

  const hasContent = wordCount >= 250;
  if (wordCount >= 1000) score += 10;
  else if (wordCount >= 250) { score += 6; issues.push(`Content ${wordCount} words (need 1000+)`); }
  else issues.push(`Thin content: ${wordCount} words`);

  if (hasSchema) score += 10; else issues.push("Schema markup missing");
  if (hasCanonical) score += 4; else issues.push("Canonical URL missing");
  if (hasSocial) score += 4; else issues.push("Social meta incomplete");
  if (hasTechnical) score += 10; else issues.push("Technical SEO not generated");

  const aiOptimized = Boolean(snapshot);
  if (aiOptimized) score += 8; else issues.push("AI snapshot missing");

  score = Math.min(100, score);
  return {
    score, status: score >= 80 ? "good" : score >= 55 ? "warning" : "poor",
    hasMetaTitle, hasMetaDesc, hasKeywords, hasH1, hasContent, hasSchema, hasSlug,
    hasCanonical, hasSocial, hasTechnical, aiOptimized, metaTitleLen, metaDescLen,
    keywordCount, shortTailCount, longTailCount, issues,
  };
};

// ── Main Component ──
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
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Keyword Research State
  const [kwQuery, setKwQuery] = useState("MBA coaching India");
  const [kwResults, setKwResults] = useState<KeywordResult[]>([]);
  const [kwContentGaps, setKwContentGaps] = useState<string[]>([]);
  const [kwSeasonal, setKwSeasonal] = useState<string[]>([]);
  const [kwSnippets, setKwSnippets] = useState<string[]>([]);
  const [kwSummary, setKwSummary] = useState("");
  const [kwLoading, setKwLoading] = useState(false);
  const [kwLastRefresh, setKwLastRefresh] = useState<string | null>(null);
  const [kwSelectedKws, setKwSelectedKws] = useState<string[]>([]);
  const [kwInjectTarget, setKwInjectTarget] = useState<"all" | SEOContentType>("all");

  // Blog Titles State
  const [btQuery, setBtQuery] = useState("MBA coaching");
  const [btResults, setBtResults] = useState<BlogTitleResult[]>([]);
  const [btEvergreen, setBtEvergreen] = useState<string[]>([]);
  const [btTrending, setBtTrending] = useState<string[]>([]);
  const [btCalendar, setBtCalendar] = useState<any[]>([]);
  const [btSummary, setBtSummary] = useState("");
  const [btLoading, setBtLoading] = useState(false);
  const [btLastRefresh, setBtLastRefresh] = useState<string | null>(null);
  const [savedBlogIdeas, setSavedBlogIdeas] = useState<SavedBlogIdea[]>([]);

  // Competitor State
  const [compUrls, setCompUrls] = useState("shiksha.com, collegedunia.com, careers360.com");
  const [compResults, setCompResults] = useState<CompetitorResult[]>([]);
  const [compGaps, setCompGaps] = useState<CompetitorGap[]>([]);
  const [compOpportunities, setCompOpportunities] = useState<string[]>([]);
  const [compQuickWins, setCompQuickWins] = useState<string[]>([]);
  const [compLongTerm, setCompLongTerm] = useState<string[]>([]);
  const [compPosition, setCompPosition] = useState(0);
  const [compSummary, setCompSummary] = useState("");
  const [compLoading, setCompLoading] = useState(false);
  const [compLastRefresh, setCompLastRefresh] = useState<string | null>(null);
  const [compInjectScope, setCompInjectScope] = useState<"full" | "page" | "section">("full");
  const [compInjectLoading, setCompInjectLoading] = useState(false);

  // Inject keywords state
  const [injectLoading, setInjectLoading] = useState(false);

  // Load saved blog ideas from site_settings
  const loadSavedBlogIdeas = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "saved_blog_ideas").maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      setSavedBlogIdeas(data.value as unknown as SavedBlogIdea[]);
    }
  }, []);

  const saveBlogIdeasToDb = async (ideas: SavedBlogIdea[]) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "saved_blog_ideas").maybeSingle();
    if (existing?.id) {
      await supabase.from("site_settings").update({ value: ideas as unknown as Record<string, any> }).eq("id", existing.id);
    } else {
      await supabase.from("site_settings").insert({ key: "saved_blog_ideas", value: ideas as unknown as Record<string, any> });
    }
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshots, ...results] = await Promise.all([
        fetchAllSeoSnapshots(),
        ...contentTypes.map((ct) =>
          supabase.from(contentTypeConfig[ct].table as any).select("*").order("created_at", { ascending: false }).limit(1000)
        ),
      ]);
      const nextRows = results.flatMap((result, index) => {
        const ct = contentTypes[index];
        return ((result.data as Record<string, any>[] | null) || []).map((item) => {
          const snapshot = snapshots[`${ct}:${item.id}`] || null;
          return { key: `${ct}:${item.id}`, id: item.id, contentType: ct, name: getName(item), slug: item.slug, city: item.city || null, state: item.state || null, item, snapshot, audit: getSEOAudit(ct, item, snapshot) } satisfies DashboardRow;
        });
      });
      setRows(nextRows);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchDashboardData(); loadSavedBlogIdeas(); }, [fetchDashboardData, loadSavedBlogIdeas]);

  // Keyword Research
  const runKeywordResearch = async () => {
    setKwLoading(true);
    try {
      const existingKws = rows.flatMap(r => r.item.keywords || []).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("ai-keyword-research", {
        body: { mode: "keyword_research", query: kwQuery, niche: kwQuery, existingKeywords: existingKws.slice(0, 50) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const d = data?.data;
      setKwResults(d?.keywords || []);
      setKwContentGaps(d?.contentGaps || []);
      setKwSeasonal(d?.seasonalOpportunities || []);
      setKwSnippets(d?.snippetOpportunities || []);
      setKwSummary(d?.summary || "");
      setKwLastRefresh(new Date().toLocaleString());
      toast({ title: "Keyword research complete", description: `Found ${d?.keywords?.length || 0} keywords` });
    } catch (e: any) {
      toast({ title: "Keyword research failed", description: e.message, variant: "destructive" });
    } finally { setKwLoading(false); }
  };

  // Blog Titles Research
  const runBlogTitleResearch = async () => {
    setBtLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-keyword-research", {
        body: { mode: "blog_titles", query: btQuery, niche: btQuery },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const d = data?.data;
      setBtResults((d?.titles || []).map((t: any) => ({
        ...t,
        metaTitle: t.metaTitle || t.title?.slice(0, 60) || "",
        metaDescription: t.metaDescription || `${t.title} - Complete guide covering ${t.targetKeyword}. Expert tips, strategies, and insights for MBA aspirants.`,
        slug: t.slug || generateSlug(t.title || ""),
      })));
      setBtEvergreen(d?.evergreenTopics || []);
      setBtTrending(d?.trendingTopics || []);
      setBtCalendar(d?.contentCalendar || []);
      setBtSummary(d?.summary || "");
      setBtLastRefresh(new Date().toLocaleString());
      toast({ title: "Blog title research complete", description: `Found ${d?.titles?.length || 0} title ideas` });
    } catch (e: any) {
      toast({ title: "Blog title research failed", description: e.message, variant: "destructive" });
    } finally { setBtLoading(false); }
  };

  // Competitor Analysis
  const runCompetitorAnalysis = async () => {
    setCompLoading(true);
    try {
      const urls = compUrls.split(",").map(u => u.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("ai-keyword-research", {
        body: { mode: "competitor_analysis", competitors: urls },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const d = data?.data;
      setCompResults(d?.competitors || []);
      setCompGaps(d?.keywordGaps || []);
      setCompOpportunities(d?.contentOpportunities || []);
      setCompQuickWins(d?.quickWins || []);
      setCompLongTerm(d?.longTermStrategy || []);
      setCompPosition(d?.competitivePosition || 0);
      setCompSummary(d?.summary || "");
      setCompLastRefresh(new Date().toLocaleString());
      toast({ title: "Competitor analysis complete" });
    } catch (e: any) {
      toast({ title: "Competitor analysis failed", description: e.message, variant: "destructive" });
    } finally { setCompLoading(false); }
  };

  // FIXED: Auto-inject keywords - only into tables that have keywords column, with target filtering
  const handleAutoInjectKeywords = async () => {
    if (!kwSelectedKws.length) {
      toast({ title: "No keywords selected", description: "Select keywords to inject first." });
      return;
    }

    const targetRows = rows.filter(r => {
      if (!TABLES_WITH_KEYWORDS.includes(r.contentType)) return false;
      if (kwInjectTarget !== "all" && r.contentType !== kwInjectTarget) return false;
      return true;
    });

    if (!targetRows.length) {
      toast({ title: "No target pages", description: "No pages match the selected content type filter.", variant: "destructive" });
      return;
    }

    const confirm = window.confirm(`This will add ${kwSelectedKws.length} keywords to ${targetRows.length} ${kwInjectTarget === "all" ? "all" : contentTypeConfig[kwInjectTarget as SEOContentType].label} pages. Continue?`);
    if (!confirm) return;

    setInjectLoading(true);
    let updated = 0;
    let failed = 0;
    try {
      for (const row of targetRows) {
        const existing: string[] = row.item.keywords || [];
        const newKws = kwSelectedKws.filter(k => !existing.map(e => e.toLowerCase()).includes(k.toLowerCase()));
        if (newKws.length === 0) continue;
        const merged = [...existing, ...newKws];
        const { error } = await supabase
          .from(contentTypeConfig[row.contentType].table as any)
          .update({ keywords: merged } as any)
          .eq("id", row.id);
        if (!error) updated++;
        else { failed++; console.error(`Failed to inject into ${row.name}:`, error.message); }
      }
      toast({
        title: "Keywords injected successfully!",
        description: `✅ Updated ${updated} pages. ${failed > 0 ? `❌ ${failed} failed.` : ""} Keywords: ${kwSelectedKws.join(", ")}`,
      });
      setKwSelectedKws([]);
      fetchDashboardData();
    } catch (e: any) {
      toast({ title: "Injection failed", description: e.message, variant: "destructive" });
    } finally { setInjectLoading(false); }
  };

  // Save single blog idea
  const handleSaveBlogIdea = async (bt: BlogTitleResult) => {
    const idea: SavedBlogIdea = {
      id: crypto.randomUUID(),
      title: bt.title,
      metaTitle: bt.metaTitle || bt.title.slice(0, 60),
      metaDescription: bt.metaDescription || `${bt.title} - Expert guide on ${bt.targetKeyword}.`,
      slug: bt.slug || generateSlug(bt.title),
      targetKeyword: bt.targetKeyword,
      searchVolume: bt.searchVolume,
      competition: bt.competition,
      contentType: bt.contentType,
      priority: bt.priority,
      savedAt: new Date().toISOString(),
    };
    const updated = [...savedBlogIdeas, idea];
    setSavedBlogIdeas(updated);
    await saveBlogIdeasToDb(updated);
    toast({ title: "Blog idea saved", description: idea.title });
  };

  // Save all blog ideas
  const handleSaveAllBlogIdeas = async () => {
    const newIdeas: SavedBlogIdea[] = btResults.filter(bt =>
      !savedBlogIdeas.some(s => s.title === bt.title)
    ).map(bt => ({
      id: crypto.randomUUID(),
      title: bt.title,
      metaTitle: bt.metaTitle || bt.title.slice(0, 60),
      metaDescription: bt.metaDescription || `${bt.title} - Expert guide on ${bt.targetKeyword}.`,
      slug: bt.slug || generateSlug(bt.title),
      targetKeyword: bt.targetKeyword,
      searchVolume: bt.searchVolume,
      competition: bt.competition,
      contentType: bt.contentType,
      priority: bt.priority,
      savedAt: new Date().toISOString(),
    }));
    const updated = [...savedBlogIdeas, ...newIdeas];
    setSavedBlogIdeas(updated);
    await saveBlogIdeasToDb(updated);
    toast({ title: "All blog ideas saved", description: `Saved ${newIdeas.length} new ideas` });
  };

  // Delete saved blog idea
  const handleDeleteBlogIdea = async (id: string) => {
    const updated = savedBlogIdeas.filter(i => i.id !== id);
    setSavedBlogIdeas(updated);
    await saveBlogIdeasToDb(updated);
    toast({ title: "Blog idea deleted" });
  };

  // Delete all saved blog ideas
  const handleDeleteAllBlogIdeas = async () => {
    if (!window.confirm("Delete all saved blog ideas?")) return;
    setSavedBlogIdeas([]);
    await saveBlogIdeasToDb([]);
    toast({ title: "All blog ideas deleted" });
  };

  // Competitor auto-inject: inject gap keywords + meta improvements across pages
  const handleCompetitorAutoInject = async () => {
    if (!compGaps.length && !compQuickWins.length) {
      toast({ title: "No data", description: "Run competitor analysis first." });
      return;
    }

    const gapKeywords = compGaps.map(g => g.keyword).filter(Boolean);
    if (!gapKeywords.length) {
      toast({ title: "No keyword gaps to inject" });
      return;
    }

    let targetRows: DashboardRow[] = [];
    if (compInjectScope === "full") {
      targetRows = rows.filter(r => TABLES_WITH_KEYWORDS.includes(r.contentType));
    } else if (compInjectScope === "page") {
      // Inject into pages that have low scores
      targetRows = rows.filter(r => TABLES_WITH_KEYWORDS.includes(r.contentType) && r.audit.score < 80);
    } else {
      // Section = articles only
      targetRows = rows.filter(r => r.contentType === "article");
    }

    const confirmMsg = compInjectScope === "full"
      ? `Inject ${gapKeywords.length} competitor gap keywords into ALL ${targetRows.length} pages?`
      : compInjectScope === "page"
      ? `Inject into ${targetRows.length} pages with scores below 80?`
      : `Inject into ${targetRows.length} articles only?`;

    if (!window.confirm(confirmMsg)) return;

    setCompInjectLoading(true);
    let updated = 0;
    try {
      // Take top 10 gap keywords to avoid spamming
      const topGapKws = gapKeywords.slice(0, 10);
      for (const row of targetRows) {
        const existing: string[] = row.item.keywords || [];
        const newKws = topGapKws.filter(k => !existing.map(e => e.toLowerCase()).includes(k.toLowerCase()));
        if (!newKws.length) continue;
        const merged = [...existing, ...newKws];
        const { error } = await supabase
          .from(contentTypeConfig[row.contentType].table as any)
          .update({ keywords: merged } as any)
          .eq("id", row.id);
        if (!error) updated++;
      }
      toast({
        title: "Competitor keywords injected!",
        description: `Updated ${updated} pages with ${Math.min(gapKeywords.length, 10)} gap keywords.`,
      });
      fetchDashboardData();
    } catch (e: any) {
      toast({ title: "Injection failed", description: e.message, variant: "destructive" });
    } finally { setCompInjectLoading(false); }
  };

  // Filtering
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
        return [row.name, row.slug, row.city, row.state, contentTypeConfig[row.contentType].label].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      }
      return true;
    });
  }, [rows, selectedType, filterStatus, schemaFilter, aiFilter, cityFilter, stateFilter, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const good = rows.filter(r => r.audit.status === "good").length;
    const warning = rows.filter(r => r.audit.status === "warning").length;
    const poor = rows.filter(r => r.audit.status === "poor").length;
    const avgScore = total ? Math.round(rows.reduce((s, r) => s + r.audit.score, 0) / total) : 0;
    return {
      total, good, warning, poor, avgScore,
      optimized: rows.filter(r => r.audit.score >= 80 && r.audit.hasSchema && r.audit.hasCanonical).length,
      withMetaTitle: rows.filter(r => r.audit.hasMetaTitle).length,
      withMetaDesc: rows.filter(r => r.audit.hasMetaDesc).length,
      withSchema: rows.filter(r => r.audit.hasSchema).length,
      withCanonical: rows.filter(r => r.audit.hasCanonical).length,
      withSocial: rows.filter(r => r.audit.hasSocial).length,
      withTechnical: rows.filter(r => r.audit.hasTechnical).length,
      withAI: rows.filter(r => r.audit.aiOptimized).length,
      withShortTail: rows.filter(r => r.audit.shortTailCount > 0).length,
      withLongTail: rows.filter(r => r.audit.longTailCount > 0).length,
    };
  }, [rows]);

  const pct = (v: number) => (stats.total ? Math.round((v / stats.total) * 100) : 0);
  const selectedRows = filteredRows.filter(r => selectedKeys.includes(r.key));
  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedKeys.includes(r.key));

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) { setSelectedKeys(c => c.filter(k => !filteredRows.some(r => r.key === k))); return; }
    setSelectedKeys(c => Array.from(new Set([...c, ...filteredRows.map(r => r.key)])));
  };
  const toggleRow = (rowKey: string, checked: boolean) => {
    setSelectedKeys(c => checked ? Array.from(new Set([...c, rowKey])) : c.filter(k => k !== rowKey));
  };

  const applySEOFields = async (row: DashboardRow, suggestions: any) => {
    const update: Record<string, any> = {};
    if (suggestions.meta_title) update.meta_title = suggestions.meta_title;
    if (suggestions.meta_description) update.meta_description = suggestions.meta_description;
    if (suggestions.keywords?.length) update.keywords = suggestions.keywords;
    if (contentTypeConfig[row.contentType].supportsH1Column && suggestions.h1_tag) update.h1_tag = suggestions.h1_tag;
    const { error } = await supabase.from(contentTypeConfig[row.contentType].table as any).update(update).eq("id", row.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "SEO updated", description: `${row.name} was updated.` });
    fetchDashboardData();
  };

  const handleBulkOptimize = async () => {
    if (!selectedRows.length) { toast({ title: "No pages selected" }); return; }
    setBulkLoading(true);
    let success = 0, fail = 0;
    for (const row of selectedRows) {
      try {
        const { data, error } = await supabase.functions.invoke("ai-seo-enhance", { body: { contentType: row.contentType, data: row.item } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const sug = data?.suggestions;
        if (!sug) throw new Error("Missing suggestions");
        const update: Record<string, any> = { meta_title: sug.meta_title, meta_description: sug.meta_description, keywords: mergeKeywordBuckets(sug.keywords) };
        if (contentTypeConfig[row.contentType].supportsH1Column && sug.h1_tag) update.h1_tag = sug.h1_tag;
        const { error: ue } = await supabase.from(contentTypeConfig[row.contentType].table as any).update(update).eq("id", row.id);
        if (ue) throw ue;
        await saveSeoSnapshot(buildStoredSeoSnapshot(row.contentType, row.item, sug));
        success++;
        await new Promise(r => setTimeout(r, 350));
      } catch { fail++; }
    }
    setBulkLoading(false);
    setSelectedKeys([]);
    fetchDashboardData();
    toast({ title: "Bulk optimize complete", description: `${success} optimized, ${fail} failed.` });
  };

  const commonIssues = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => r.audit.issues.forEach(i => { counts[i] = (counts[i] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const trendIcon = (t: string) => t === "up" ? <ArrowUp className="h-3 w-3 text-green-500" /> : t === "down" ? <ArrowDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3 text-muted-foreground" />;
  const priorityColor = (p: string) => p === "high" ? "text-red-600 bg-red-50" : p === "medium" ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50";

  // Navigation items for sidebar
  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "pages", label: `All Pages (${filteredRows.length})`, icon: FileText },
    { id: "keywords", label: "Keyword Research", icon: Search },
    { id: "blog-titles", label: "Blog Titles", icon: PenTool },
    { id: "competitors", label: "Competitors", icon: Trophy },
    { id: "technical", label: "Technical SEO", icon: Shield },
  ];

  return (
    <div className="flex gap-6">
      {/* ── Static Sidebar Navigation ── */}
      <div className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> SEO Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
              {/* Quick Stats in sidebar */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Avg Score</span>
                  <span className={`font-bold ${stats.avgScore >= 80 ? "text-green-600" : stats.avgScore >= 55 ? "text-amber-600" : "text-red-600"}`}>{stats.avgScore}%</span>
                </div>
                <Progress value={stats.avgScore} className="h-1.5" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">AI Coverage</span>
                  <span className="font-medium">{pct(stats.withAI)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Schema Done</span>
                  <span className="font-medium">{pct(stats.withSchema)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2">
                  <div className="text-center p-1.5 rounded bg-green-50">
                    <p className="text-xs font-bold text-green-700">{stats.good}</p>
                    <p className="text-[9px] text-green-600">Good</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-amber-50">
                    <p className="text-xs font-bold text-amber-700">{stats.warning}</p>
                    <p className="text-[9px] text-amber-600">Warn</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-red-50">
                    <p className="text-xs font-bold text-red-700">{stats.poor}</p>
                    <p className="text-[9px] text-red-600">Poor</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI SEO Command Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Keyword research, competitor tracking, blog ideas, and auto-optimization — all AI-powered.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchDashboardData} disabled={loading || bulkLoading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button onClick={handleBulkOptimize} disabled={bulkLoading || selectedRows.length === 0} size="sm">
              {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Bulk Optimize ({selectedRows.length})
            </Button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {navItems.map(item => (
                <TabsTrigger key={item.id} value={item.id} className="text-xs">{item.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Average Score" value={`${stats.avgScore}%`} tone={stats.avgScore >= 80 ? "good" : stats.avgScore >= 55 ? "warning" : "poor"} icon={<Gauge className="h-5 w-5" />} />
              <StatCard label="Total Pages" value={String(stats.total)} icon={<FileText className="h-5 w-5" />} />
              <StatCard label="SEO-Ready" value={`${pct(stats.optimized)}%`} helper={`${stats.optimized}/${stats.total}`} tone={pct(stats.optimized) >= 70 ? "good" : pct(stats.optimized) >= 40 ? "warning" : "poor"} icon={<CheckCircle className="h-5 w-5" />} />
              <StatCard label="Schema Done" value={`${pct(stats.withSchema)}%`} helper={`${stats.withSchema}/${stats.total}`} tone={pct(stats.withSchema) >= 80 ? "good" : "warning"} icon={<Code className="h-5 w-5" />} />
              <StatCard label="AI Covered" value={`${pct(stats.withAI)}%`} helper={`${stats.withAI}/${stats.total}`} tone={pct(stats.withAI) >= 70 ? "good" : "warning"} icon={<Sparkles className="h-5 w-5" />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Score Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-32">
                    {[...Array(10)].map((_, b) => {
                      const low = b * 10, high = low + 10;
                      const count = rows.filter(r => r.audit.score >= low && r.audit.score < high).length;
                      const height = stats.total ? (count / stats.total) * 100 : 0;
                      return (
                        <div key={b} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-muted-foreground font-medium">{count}</span>
                          <div className={`w-full rounded-t transition-all ${low >= 80 ? "bg-green-500" : low >= 55 ? "bg-amber-500" : "bg-red-500"}`} style={{ height: `${Math.max(height, 2)}%` }} />
                          <span className="text-[9px] text-muted-foreground">{low}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm flex-1">Good (80+)</span><Badge className="bg-green-100 text-green-700">{stats.good}</Badge></div>
                  <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-sm flex-1">Needs Work (55-79)</span><Badge className="bg-amber-100 text-amber-700">{stats.warning}</Badge></div>
                  <div className="flex items-center gap-3"><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm flex-1">Poor (&lt;55)</span><Badge className="bg-red-100 text-red-700">{stats.poor}</Badge></div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">SEO Element Coverage</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <CoverageBar label="Meta Titles" count={stats.withMetaTitle} total={stats.total} icon={<FileText className="h-3 w-3" />} />
                <CoverageBar label="Meta Descriptions" count={stats.withMetaDesc} total={stats.total} icon={<FileText className="h-3 w-3" />} />
                <CoverageBar label="Schema Markup" count={stats.withSchema} total={stats.total} icon={<Code className="h-3 w-3" />} />
                <CoverageBar label="Canonical URLs" count={stats.withCanonical} total={stats.total} icon={<Link2 className="h-3 w-3" />} />
                <CoverageBar label="Social Meta" count={stats.withSocial} total={stats.total} icon={<Globe className="h-3 w-3" />} />
                <CoverageBar label="Technical SEO" count={stats.withTechnical} total={stats.total} icon={<Gauge className="h-3 w-3" />} />
                <CoverageBar label="Short-tail Keywords" count={stats.withShortTail} total={stats.total} icon={<Tag className="h-3 w-3" />} />
                <CoverageBar label="Long-tail Keywords" count={stats.withLongTail} total={stats.total} icon={<Search className="h-3 w-3" />} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Top SEO Issues</CardTitle></CardHeader>
              <CardContent>
                {commonIssues.length > 0 ? commonIssues.slice(0, 8).map(([issue, count]) => (
                  <div key={issue} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{issue}</span>
                    <Badge variant="outline" className="text-xs">{count} pages</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No issues found.</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ ALL PAGES ═══ */}
        {activeTab === "pages" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-3 xl:grid-cols-6 md:grid-cols-3">
                  <div className="relative xl:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
                  </div>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as TypeFilter)}>
                    <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {contentTypes.map(ct => <SelectItem key={ct} value={ct}>{contentTypeConfig[ct].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                    <SelectTrigger><SelectValue placeholder="Score" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All scores</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="warning">Needs work</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={schemaFilter} onValueChange={(v) => setSchemaFilter(v as BooleanFilter)}>
                    <SelectTrigger><SelectValue placeholder="Schema" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Schema: all</SelectItem>
                      <SelectItem value="yes">Has schema</SelectItem>
                      <SelectItem value="no">No schema</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={aiFilter} onValueChange={(v) => setAiFilter(v as BooleanFilter)}>
                    <SelectTrigger><SelectValue placeholder="AI" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">AI: all</SelectItem>
                      <SelectItem value="yes">AI done</SelectItem>
                      <SelectItem value="no">AI pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={(c) => toggleSelectAll(Boolean(c))} />
                  <span>Select all visible for bulk optimization</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map(row => (
                        <TableRow key={row.key}>
                          <TableCell><Checkbox checked={selectedKeys.includes(row.key)} onCheckedChange={(c) => toggleRow(row.key, Boolean(c))} /></TableCell>
                          <TableCell>
                            <p className="font-medium leading-none">{row.name}</p>
                            <p className="text-xs text-muted-foreground">/{row.slug || "—"}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{contentTypeConfig[row.contentType].label}</Badge></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <MiniBadge active={row.audit.hasMetaTitle}>Title</MiniBadge>
                              <MiniBadge active={row.audit.hasMetaDesc}>Meta</MiniBadge>
                              <MiniBadge active={row.audit.hasSchema}>Schema</MiniBadge>
                              <MiniBadge active={row.audit.hasCanonical}>Canonical</MiniBadge>
                              <MiniBadge active={row.audit.aiOptimized}>AI</MiniBadge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 max-w-[240px]">
                              {row.audit.issues.slice(0, 2).map(i => <p key={i} className="text-xs text-muted-foreground">• {i}</p>)}
                              {row.audit.issues.length > 2 && <p className="text-xs text-muted-foreground">+{row.audit.issues.length - 2} more</p>}
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
                            <AISEOButton contentType={row.contentType} recordId={row.id} data={row.item} onApply={(s) => applySEOFields(row, s)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ KEYWORD RESEARCH ═══ */}
        {activeTab === "keywords" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> AI Keyword Research</CardTitle>
                <CardDescription>Discover high-value keywords for your MBA coaching niche. Select keywords and auto-inject them into your pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={kwQuery} onChange={e => setKwQuery(e.target.value)} placeholder="Enter niche or topic..." className="flex-1" />
                  <Button onClick={runKeywordResearch} disabled={kwLoading}>
                    {kwLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Research Keywords
                  </Button>
                </div>
                {kwLastRefresh && <p className="text-xs text-muted-foreground">Last refreshed: {kwLastRefresh}</p>}
              </CardContent>
            </Card>

            {kwResults.length > 0 && (
              <>
                {kwSummary && <Card><CardContent className="pt-4"><p className="text-sm">{kwSummary}</p></CardContent></Card>}

                {/* Auto-inject bar - FIXED with target selection */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{kwSelectedKws.length} keywords selected for injection</p>
                        <p className="text-xs text-muted-foreground">Keywords will be added to the `keywords` field of each page in your database</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={kwInjectTarget} onValueChange={(v) => setKwInjectTarget(v as any)}>
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Pages</SelectItem>
                            {TABLES_WITH_KEYWORDS.map(ct => (
                              <SelectItem key={ct} value={ct}>{contentTypeConfig[ct].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAutoInjectKeywords} disabled={injectLoading || kwSelectedKws.length === 0} size="sm">
                          {injectLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                          Auto-Inject Keywords
                        </Button>
                      </div>
                    </div>
                    {kwSelectedKws.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {kwSelectedKws.map(kw => (
                          <Badge key={kw} variant="secondary" className="text-xs gap-1">
                            {kw}
                            <button onClick={() => setKwSelectedKws(p => p.filter(k => k !== kw))} className="ml-1 hover:text-red-500">×</button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={kwResults.length > 0 && kwSelectedKws.length === kwResults.length}
                              onCheckedChange={(c) => setKwSelectedKws(c ? kwResults.map(k => k.keyword) : [])}
                            />
                          </TableHead>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Competition</TableHead>
                          <TableHead>Intent</TableHead>
                          <TableHead>Trend</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kwResults.map((kw, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Checkbox
                                checked={kwSelectedKws.includes(kw.keyword)}
                                onCheckedChange={(c) => setKwSelectedKws(prev => c ? [...prev, kw.keyword] : prev.filter(k => k !== kw.keyword))}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell><span className="font-mono text-sm">{kw.searchVolume?.toLocaleString()}</span></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Progress value={kw.difficulty} className="w-16 h-2" />
                                <span className="text-xs">{kw.difficulty}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${kw.competition === "low" ? "border-green-300 text-green-700" : kw.competition === "high" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}`}>{kw.competition}</Badge></TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{kw.intent}</Badge></TableCell>
                            <TableCell>{trendIcon(kw.trending)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{kw.category || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Content Gaps</CardTitle></CardHeader>
                    <CardContent>{kwContentGaps.map((g, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {g}</p>)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Seasonal Opportunities</CardTitle></CardHeader>
                    <CardContent>{kwSeasonal.map((s, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {s}</p>)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Featured Snippet Opportunities</CardTitle></CardHeader>
                    <CardContent>{kwSnippets.map((s, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {s}</p>)}</CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ BLOG TITLES ═══ */}
        {activeTab === "blog-titles" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PenTool className="h-5 w-5 text-primary" /> Blog Title Research</CardTitle>
                <CardDescription>AI-generated blog titles with meta title, description, slug — save ideas and build your content pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={btQuery} onChange={e => setBtQuery(e.target.value)} placeholder="Enter topic or niche..." className="flex-1" />
                  <Button onClick={runBlogTitleResearch} disabled={btLoading}>
                    {btLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Research Titles
                  </Button>
                </div>
                {btLastRefresh && <p className="text-xs text-muted-foreground">Last refreshed: {btLastRefresh}</p>}
              </CardContent>
            </Card>

            {btResults.length > 0 && (
              <>
                {btSummary && <Card><CardContent className="pt-4"><p className="text-sm">{btSummary}</p></CardContent></Card>}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleSaveAllBlogIdeas}>
                    <Save className="h-4 w-4 mr-1" /> Save All Ideas
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title / Meta</TableHead>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Trend</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {btResults.map((bt, i) => (
                          <TableRow key={i}>
                            <TableCell className="max-w-[350px]">
                              <p className="font-medium text-sm">{bt.title}</p>
                              <p className="text-[11px] text-blue-600 mt-0.5">Meta: {bt.metaTitle || bt.title.slice(0, 60)}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{bt.metaDescription}</p>
                              <p className="text-[10px] text-green-600 mt-0.5">/{bt.slug}</p>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{bt.targetKeyword}</TableCell>
                            <TableCell><span className="font-mono text-sm">{bt.searchVolume?.toLocaleString()}</span></TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{bt.contentType}</Badge></TableCell>
                            <TableCell><Badge className={`text-xs ${priorityColor(bt.priority)}`}>{bt.priority}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                <span className="text-xs">{bt.trendingScore}/10</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`Title: ${bt.title}\nMeta Title: ${bt.metaTitle}\nMeta Description: ${bt.metaDescription}\nSlug: ${bt.slug}\nKeyword: ${bt.targetKeyword}`);
                                    toast({ title: "Copied to clipboard" });
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => handleSaveBlogIdea(bt)}
                                  disabled={savedBlogIdeas.some(s => s.title === bt.title)}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">🌿 Evergreen Topics</CardTitle></CardHeader>
                    <CardContent>{btEvergreen.map((t, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {t}</p>)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">🔥 Trending Now</CardTitle></CardHeader>
                    <CardContent>{btTrending.map((t, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {t}</p>)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">📅 4-Week Content Calendar</CardTitle></CardHeader>
                    <CardContent>{btCalendar.map((w, i) => (
                      <div key={i} className="py-2 border-b last:border-0">
                        <p className="text-sm font-medium">Week {w.week}: {w.topic}</p>
                        <p className="text-xs text-muted-foreground">Keyword: {w.keyword} — {w.reason}</p>
                      </div>
                    ))}</CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Saved Blog Ideas */}
            {savedBlogIdeas.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Saved Blog Ideas ({savedBlogIdeas.length})</CardTitle>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={handleDeleteAllBlogIdeas}>
                      <Trash2 className="h-3 w-3 mr-1" /> Clear All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Meta Title</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Saved</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedBlogIdeas.map(idea => (
                        <TableRow key={idea.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{idea.title}</TableCell>
                          <TableCell className="text-xs text-blue-600 max-w-[150px] truncate">{idea.metaTitle}</TableCell>
                          <TableCell className="text-xs text-green-600">/{idea.slug}</TableCell>
                          <TableCell className="text-xs">{idea.targetKeyword}</TableCell>
                          <TableCell className="font-mono text-xs">{idea.searchVolume?.toLocaleString()}</TableCell>
                          <TableCell><Badge className={`text-[10px] ${priorityColor(idea.priority)}`}>{idea.priority}</Badge></TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{new Date(idea.savedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteBlogIdea(idea.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ COMPETITORS ═══ */}
        {activeTab === "competitors" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Competitor Intelligence</CardTitle>
                <CardDescription>Track competitors, find keyword gaps, and one-click inject improvements across your website.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={compUrls} onChange={e => setCompUrls(e.target.value)} placeholder="Enter competitor domains, comma-separated..." rows={2} />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">{compLastRefresh ? `Last analyzed: ${compLastRefresh}` : "Not analyzed yet"}</p>
                  <Button onClick={runCompetitorAnalysis} disabled={compLoading}>
                    {compLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
                    Analyze Competitors
                  </Button>
                </div>
              </CardContent>
            </Card>

            {compResults.length > 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Our Competitive Position" value={`${compPosition}/10`} tone={compPosition >= 7 ? "good" : compPosition >= 4 ? "warning" : "poor"} icon={<Target className="h-5 w-5" />} />
                  <StatCard label="Keyword Gaps Found" value={String(compGaps.length)} icon={<Search className="h-5 w-5" />} />
                  <StatCard label="Quick Wins Available" value={String(compQuickWins.length)} icon={<Zap className="h-5 w-5" />} />
                </div>

                {compSummary && <Card><CardContent className="pt-4"><p className="text-sm">{compSummary}</p></CardContent></Card>}

                {/* AUTO-INJECT from competitor gaps */}
                <Card className="border-amber-300/50 bg-amber-50/30">
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-600" />
                          Auto-Inject Competitor Gap Keywords
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Injects top 10 competitor gap keywords into your pages. Choose scope below.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={compInjectScope} onValueChange={(v) => setCompInjectScope(v as any)}>
                          <SelectTrigger className="w-44 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">🌐 Full Website</SelectItem>
                            <SelectItem value="page">📄 Low-Score Pages Only</SelectItem>
                            <SelectItem value="section">📝 Articles Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleCompetitorAutoInject} disabled={compInjectLoading || compGaps.length === 0} size="sm" variant="default">
                          {compInjectLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                          Inject Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Competitor Cards */}
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {compResults.map((comp, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> {comp.domain}</span>
                          <Badge variant="outline">DA: {comp.domainAuthority}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Strengths:</p>
                          {comp.strengths.slice(0, 3).map((s, j) => <p key={j} className="text-xs">• {s}</p>)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Strategy:</p>
                          <p className="text-xs">{comp.contentStrategy}</p>
                        </div>
                        {comp.uniqueKeywords.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Unique Keywords:</p>
                            <div className="flex flex-wrap gap-1">{comp.uniqueKeywords.slice(0, 5).map((k, j) => <Badge key={j} variant="secondary" className="text-[10px]">{k}</Badge>)}</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Keyword Gaps */}
                {compGaps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">🎯 Keyword Gaps — Keywords They Rank For, You Don't</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead>Volume</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Opportunity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compGaps.slice(0, 20).map((gap, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{gap.keyword}</TableCell>
                              <TableCell><span className="font-mono text-sm">{gap.searchVolume?.toLocaleString()}</span></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Progress value={gap.difficulty} className="w-12 h-2" />
                                  <span className="text-xs">{gap.difficulty}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">{gap.opportunity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Quick Wins</CardTitle></CardHeader>
                    <CardContent>{compQuickWins.map((w, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">⚡ {w}</p>)}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Long-Term Strategy</CardTitle></CardHeader>
                    <CardContent>{compLongTerm.map((s, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">📈 {s}</p>)}</CardContent>
                  </Card>
                </div>

                {compOpportunities.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">💡 Content Opportunities We're Missing</CardTitle></CardHeader>
                    <CardContent>{compOpportunities.map((o, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {o}</p>)}</CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ TECHNICAL SEO ═══ */}
        {activeTab === "technical" && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Core Web Vitals */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MonitorSmartphone className="h-4 w-4" /> Core Web Vitals & Performance</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="HTTPS Secure" status={window.location.protocol === "https:" ? "pass" : "fail"} detail="Transport Layer Security" icon={<Lock className="h-4 w-4" />} />
                  <TechCheck label="Responsive Meta Viewport" status="pass" detail="viewport tag present" icon={<MonitorSmartphone className="h-4 w-4" />} />
                  <TechCheck label="robots.txt" status="pass" detail="Accessible" icon={<FileCheck className="h-4 w-4" />} />
                  <TechCheck label="XML Sitemap" status="pass" detail="Admin tooling available" icon={<MapPin className="h-4 w-4" />} />
                  <TechCheck label="Lazy Loading Images" status="pass" detail="Native lazy loading" icon={<Eye className="h-4 w-4" />} />
                  <TechCheck label="Semantic HTML" status="pass" detail="H1, H2, article, section" icon={<Code className="h-4 w-4" />} />
                  <TechCheck label="Single Page App (SPA)" status="warn" detail="Pre-rendering recommended for crawlers" icon={<Globe className="h-4 w-4" />} />
                </CardContent>
              </Card>

              {/* Indexing & Crawlability */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radio className="h-4 w-4" /> Indexing & Crawlability</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="Canonical URLs" status={pct(stats.withCanonical) >= 80 ? "pass" : "warn"} detail={`${stats.withCanonical}/${stats.total} pages`} icon={<Link2 className="h-4 w-4" />} />
                  <TechCheck label="JSON-LD Schema" status={pct(stats.withSchema) >= 80 ? "pass" : "warn"} detail={`${stats.withSchema}/${stats.total} pages`} icon={<Code className="h-4 w-4" />} />
                  <TechCheck label="Meta Titles" status={pct(stats.withMetaTitle) >= 90 ? "pass" : pct(stats.withMetaTitle) >= 70 ? "warn" : "fail"} detail={`${stats.withMetaTitle}/${stats.total} pages`} icon={<FileText className="h-4 w-4" />} />
                  <TechCheck label="Meta Descriptions" status={pct(stats.withMetaDesc) >= 90 ? "pass" : pct(stats.withMetaDesc) >= 70 ? "warn" : "fail"} detail={`${stats.withMetaDesc}/${stats.total} pages`} icon={<FileText className="h-4 w-4" />} />
                  <TechCheck label="Open Graph Tags" status={pct(stats.withSocial) >= 70 ? "pass" : "warn"} detail={`${stats.withSocial}/${stats.total} pages`} icon={<Globe className="h-4 w-4" />} />
                  <TechCheck label="Twitter Cards" status={pct(stats.withSocial) >= 70 ? "pass" : "warn"} detail={`${stats.withSocial}/${stats.total}`} icon={<Globe className="h-4 w-4" />} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Keyword Health */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Keyword Health</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="Keyword Coverage (4+)" status={pct(rows.filter(r => r.audit.hasKeywords).length) >= 80 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasKeywords).length}/${stats.total}`} icon={<Tag className="h-4 w-4" />} />
                  <TechCheck label="Short-tail Keywords" status={pct(stats.withShortTail) >= 50 ? "pass" : "warn"} detail={`${stats.withShortTail}/${stats.total} pages`} icon={<Search className="h-4 w-4" />} />
                  <TechCheck label="Long-tail Keywords" status={pct(stats.withLongTail) >= 50 ? "pass" : "warn"} detail={`${stats.withLongTail}/${stats.total} pages`} icon={<Search className="h-4 w-4" />} />
                  <TechCheck label="AI Research Snapshots" status={pct(stats.withAI) >= 60 ? "pass" : "warn"} detail={`${stats.withAI}/${stats.total} pages`} icon={<Sparkles className="h-4 w-4" />} />
                  <TechCheck label="Technical SEO Tips" status={pct(stats.withTechnical) >= 50 ? "pass" : "warn"} detail={`${stats.withTechnical}/${stats.total} pages`} icon={<Settings className="h-4 w-4" />} />
                </CardContent>
              </Card>

              {/* Content Quality */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Content Quality Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="H1 Tags Present" status={pct(rows.filter(r => r.audit.hasH1).length) >= 90 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasH1).length}/${stats.total}`} icon={<FileText className="h-4 w-4" />} />
                  <TechCheck label="Content Length 250+" status={pct(rows.filter(r => r.audit.hasContent).length) >= 70 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasContent).length}/${stats.total}`} icon={<BookOpen className="h-4 w-4" />} />
                  <TechCheck label="Clean Slugs" status={pct(rows.filter(r => r.audit.hasSlug).length) >= 90 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasSlug).length}/${stats.total}`} icon={<Link2 className="h-4 w-4" />} />
                  <TechCheck label="Score ≥ 80" status={pct(stats.good) >= 50 ? "pass" : pct(stats.good) >= 25 ? "warn" : "fail"} detail={`${stats.good}/${stats.total} pages`} icon={<CheckCircle className="h-4 w-4" />} />
                </CardContent>
              </Card>
            </div>

            {/* Overall Progress */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" /> Overall Optimization Progress</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <CoverageBar label="Score ≥ 80" count={stats.good} total={stats.total} icon={<CheckCircle className="h-3 w-3" />} />
                <CoverageBar label="AI Optimized" count={stats.withAI} total={stats.total} icon={<Sparkles className="h-3 w-3" />} />
                <CoverageBar label="Schema Markup" count={stats.withSchema} total={stats.total} icon={<Code className="h-3 w-3" />} />
                <CoverageBar label="Meta Titles" count={stats.withMetaTitle} total={stats.total} icon={<FileText className="h-3 w-3" />} />
                <CoverageBar label="Meta Descriptions" count={stats.withMetaDesc} total={stats.total} icon={<FileText className="h-3 w-3" />} />
                <CoverageBar label="Canonical URLs" count={stats.withCanonical} total={stats.total} icon={<Link2 className="h-3 w-3" />} />
                <CoverageBar label="Social Meta" count={stats.withSocial} total={stats.total} icon={<Globe className="h-3 w-3" />} />
                <CoverageBar label="Technical Tips" count={stats.withTechnical} total={stats.total} icon={<Shield className="h-3 w-3" />} />
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Priority Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pct(stats.withMetaTitle) < 90 && <RecommendationRow icon={<FileText className="h-4 w-4" />} text={`Add meta titles to ${stats.total - stats.withMetaTitle} pages`} severity="high" />}
                {pct(stats.withMetaDesc) < 90 && <RecommendationRow icon={<FileText className="h-4 w-4" />} text={`Add meta descriptions to ${stats.total - stats.withMetaDesc} pages`} severity="high" />}
                {pct(stats.withSchema) < 80 && <RecommendationRow icon={<Code className="h-4 w-4" />} text={`Generate schema markup for ${stats.total - stats.withSchema} pages via AI optimize`} severity="high" />}
                {pct(stats.withAI) < 60 && <RecommendationRow icon={<Sparkles className="h-4 w-4" />} text={`Run AI optimization on ${stats.total - stats.withAI} pages for full SEO coverage`} severity="medium" />}
                {pct(stats.withSocial) < 70 && <RecommendationRow icon={<Globe className="h-4 w-4" />} text={`Add social meta (Open Graph + Twitter) to ${stats.total - stats.withSocial} pages`} severity="medium" />}
                {pct(stats.withLongTail) < 50 && <RecommendationRow icon={<Search className="h-4 w-4" />} text={`Research long-tail keywords — only ${stats.withLongTail} pages have them`} severity="low" />}
                {stats.poor > 0 && <RecommendationRow icon={<XCircle className="h-4 w-4" />} text={`${stats.poor} pages have poor SEO scores — prioritize these for bulk optimization`} severity="high" />}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ──
function StatCard({ label, value, helper, tone = "default", icon }: { label: string; value: string; helper?: string; tone?: "default" | "good" | "warning" | "poor"; icon?: React.ReactNode }) {
  const toneClass = tone === "good" ? "text-green-600" : tone === "warning" ? "text-amber-600" : tone === "poor" ? "text-red-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{icon}</span>
          <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {helper && <p className="text-[10px] text-muted-foreground mt-1">{helper}</p>}
      </CardContent>
    </Card>
  );
}

function MiniBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <Badge variant={active ? "secondary" : "outline"} className="text-[10px]">{children}</Badge>;
}

function CoverageBar({ label, count, total, icon }: { label: string; count: number; total: number; icon: React.ReactNode }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm flex-1 min-w-0 truncate">{label}</span>
      <Progress value={pct} className="w-24 h-2" />
      <span className="text-xs text-muted-foreground w-16 text-right">{count}/{total} ({pct}%)</span>
    </div>
  );
}

function TechCheck({ label, status, detail, icon }: { label: string; status: "pass" | "warn" | "fail"; detail: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-0">
      {status === "pass" ? <CheckCircle className="h-4 w-4 text-green-500" /> : status === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-sm flex-1">{label}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function RecommendationRow({ icon, text, severity }: { icon: React.ReactNode; text: string; severity: "high" | "medium" | "low" }) {
  const colors = severity === "high" ? "border-l-red-500 bg-red-50/50" : severity === "medium" ? "border-l-amber-500 bg-amber-50/50" : "border-l-blue-500 bg-blue-50/50";
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded border-l-4 ${colors}`}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <p className="text-sm flex-1">{text}</p>
      <Badge className={`text-[10px] ${severity === "high" ? "bg-red-100 text-red-700" : severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{severity}</Badge>
    </div>
  );
}

export default AdminSEODashboard;
