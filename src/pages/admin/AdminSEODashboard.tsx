import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, BarChart3, BookOpen, CheckCircle, Code,
  Copy, FileText, Filter, Gauge, Globe, Link2, Loader2, MapPin, Minus, PenTool, RefreshCw,
  Save, Search, Shield, Sparkles, Tag, Target, Trash2, TrendingUp, Trophy, Users, XCircle, Zap,
  Download, Eye, Database, Layers, Radio, Settings, FileCheck, MonitorSmartphone, Lock,
  ExternalLink, Activity, LayoutGrid, Network, Crosshair, Swords, Brain, Lightbulb, Star,
  Wand2,
} from "lucide-react";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import { PageSpeedMonitor } from "@/components/admin/PageSpeedMonitor";
import { useToast } from "@/hooks/use-toast";
import {
  buildStoredSeoSnapshot, contentTypeConfig, fetchAllSeoSnapshots, mergeKeywordBuckets,
  saveSeoSnapshot, type SEOContentType, type StoredSEOSnapshot,
} from "@/lib/seoAutomation";
import STATIC_PAGES_CONFIG from "@/data/staticPages";
import SEOFullAudit from "@/components/admin/SEOFullAudit";
import { AutoFixPanel } from "@/components/admin/AutoFixPanel";

// ── Types ──
type ScoreStatus = "good" | "warning" | "poor";
type FilterStatus = "all" | ScoreStatus;
type BooleanFilter = "all" | "yes" | "no";
type TypeFilter = "all" | "static" | SEOContentType;

interface SEOAudit {
  score: number; status: ScoreStatus;
  hasMetaTitle: boolean; hasMetaDesc: boolean; hasKeywords: boolean; hasH1: boolean;
  hasContent: boolean; hasSchema: boolean; hasSlug: boolean; hasCanonical: boolean;
  hasSocial: boolean; hasTechnical: boolean; aiOptimized: boolean;
  metaTitleLen: number; metaDescLen: number; keywordCount: number;
  shortTailCount: number; longTailCount: number; wordCount: number; issues: string[];
}

interface DashboardRow {
  key: string; id: string; contentType: SEOContentType; name: string;
  slug?: string; city?: string | null; state?: string | null;
  item: Record<string, any>; snapshot: StoredSEOSnapshot | null; audit: SEOAudit;
  isStatic?: boolean; path?: string;
}

interface KeywordResult {
  keyword: string; searchVolume: number; competition: string; difficulty: number;
  cpc?: number; intent: string; trending: string; category?: string;
  source?: string; priorityScore?: number;
}

interface KeywordCluster {
  clusterName: string; pillarKeyword: string;
  supportingKeywords: string[]; suggestedContentType?: string;
}

interface ContentGapItem {
  gap: string; suggestedTitle: string;
  estimatedTraffic?: number; difficulty?: string;
}

interface SeasonalItem {
  keyword: string; peakMonths: string; action: string;
}

interface SnippetItem {
  question: string; suggestedAnswer?: string; currentRanker?: string;
}

interface DataQualityReport {
  totalRealKeywords?: number; totalAiEnriched?: number;
  dataSourcesUsed?: string[]; confidence?: string; notes?: string;
}

interface BlogTitleResult {
  title: string; targetKeyword: string; searchVolume: number; competition: string;
  contentType: string; wordCount?: number; priority: string; trendingScore: number;
  metaTitle?: string; metaDescription?: string; slug?: string;
}

interface CompetitorResult {
  domain: string; domainAuthority: number; estimatedTraffic?: string; indexedPages?: string;
  strengths: string[]; weaknesses?: string[];
  contentStrategy: string; topContentTypes?: string[]; uniqueKeywords: string[];
  backlinkStrategy?: string; socialPresence?: string; topPages?: string[];
  serpFeatures?: string[]; technicalAdvantages?: string[];
}

interface CompetitorGap {
  keyword: string; searchVolume: number; competitorRanking?: string;
  rankingPosition?: string; difficulty: number; opportunity: string; recommendedAction?: string;
}

interface SWOTAnalysis {
  strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[];
}

interface BacklinkOpportunities {
  siteTypes?: string[]; outreachStrategies?: string[];
  resourcePages?: string[]; guestPostTargets?: string[];
}

interface PageRecommendation {
  pageType: string; recommendations: string[]; priority: string;
}

interface SavedBlogIdea {
  id: string; title: string; metaTitle: string; metaDescription: string; slug: string;
  targetKeyword: string; searchVolume: number; competition: string;
  contentType: string; priority: string; savedAt: string;
}

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
    keywordCount, shortTailCount, longTailCount, wordCount, issues,
  };
};

// ── Main Component ──
const SEO_KNOWN_KEYS_STORAGE = "seo_dashboard_known_keys";

const AdminSEODashboard = () => {
  const navigate = useNavigate();
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
  const [previousKeys, setPreviousKeys] = useState<Set<string>>(new Set());
  const [newRows, setNewRows] = useState<DashboardRow[]>([]);
  const [newLinksDismissed, setNewLinksDismissed] = useState(false);
  const { toast } = useToast();

  // Keyword Research State
  const [kwQuery, setKwQuery] = useState("MBA coaching India");
  const [kwResults, setKwResults] = useState<KeywordResult[]>([]);
  const [kwContentGaps, setKwContentGaps] = useState<ContentGapItem[]>([]);
  const [kwSeasonal, setKwSeasonal] = useState<SeasonalItem[]>([]);
  const [kwSnippets, setKwSnippets] = useState<SnippetItem[]>([]);
  const [kwClusters, setKwClusters] = useState<KeywordCluster[]>([]);
  const [kwDataQuality, setKwDataQuality] = useState<DataQualityReport | null>(null);
  const [kwCompetitorKws, setKwCompetitorKws] = useState<any[]>([]);
  const [kwSummary, setKwSummary] = useState("");
  const [kwLoading, setKwLoading] = useState(false);
  const [kwLastRefresh, setKwLastRefresh] = useState<string | null>(null);
  const [kwSelectedKws, setKwSelectedKws] = useState<string[]>([]);
  const [kwInjectTarget, setKwInjectTarget] = useState<"all" | SEOContentType>("all");
  const [kwSortBy, setKwSortBy] = useState<"volume" | "difficulty" | "priority">("volume");
  const [kwFilterSource, setKwFilterSource] = useState<string>("all");
  const [kwFilterIntent, setKwFilterIntent] = useState<string>("all");

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

  // Competitor State (enhanced)
  const [compUrls, setCompUrls] = useState("shiksha.com, collegedunia.com, careers360.com");
  const [compResults, setCompResults] = useState<CompetitorResult[]>([]);
  const [compGaps, setCompGaps] = useState<CompetitorGap[]>([]);
  const [compOpportunities, setCompOpportunities] = useState<string[]>([]);
  const [compQuickWins, setCompQuickWins] = useState<string[]>([]);
  const [compLongTerm, setCompLongTerm] = useState<string[]>([]);
  const [compPosition, setCompPosition] = useState(0);
  const [compPositionJustification, setCompPositionJustification] = useState("");
  const [compSummary, setCompSummary] = useState("");
  const [compLoading, setCompLoading] = useState(false);
  const [compLastRefresh, setCompLastRefresh] = useState<string | null>(null);
  const [compInjectScope, setCompInjectScope] = useState<"full" | "page" | "section">("full");
  const [compInjectLoading, setCompInjectLoading] = useState(false);
  const [compSWOT, setCompSWOT] = useState<SWOTAnalysis | null>(null);
  const [compBacklinks, setCompBacklinks] = useState<BacklinkOpportunities | null>(null);
  const [compPageRecs, setCompPageRecs] = useState<PageRecommendation[]>([]);
  const [compSubTab, setCompSubTab] = useState("overview");

  // Removed Links State
  const [removedLinks, setRemovedLinks] = useState<any[]>([]);
  const [removedLinksLoading, setRemovedLinksLoading] = useState(false);

  const [injectLoading, setInjectLoading] = useState(false);

  // Interlink Studio State
  const [interlinkSuggestions, setInterlinkSuggestions] = useState<any[]>([]);
  const [interlinkSummary, setInterlinkSummary] = useState("");
  const [interlinkThemes, setInterlinkThemes] = useState<string[]>([]);
  const [interlinkLoading, setInterlinkLoading] = useState(false);
  const [interlinkApplying, setInterlinkApplying] = useState(false);
  const [interlinkSelected, setInterlinkSelected] = useState<Set<number>>(new Set());
  const [interlinkFilter, setInterlinkFilter] = useState("all");

  // Auto-Generate State
  const [autoGenType, setAutoGenType] = useState<SEOContentType>("article");
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [autoGenResults, setAutoGenResults] = useState<any[]>([]);

  // Uniqueness Check State
  const [uniqueLoading, setUniqueLoading] = useState(false);
  const [uniqueData, setUniqueData] = useState<any>(null);

  // Content Gaps State
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsData, setGapsData] = useState<any>(null);

  // Daily Competitor Report State
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [dailyReportRefreshing, setDailyReportRefreshing] = useState(false);

  // Page Speed State
  const [pageSpeedData, setPageSpeedData] = useState<any>(null);
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false);
  const [pageSpeedDevice, setPageSpeedDevice] = useState<"mobile" | "desktop" | "tablet">("mobile");
  const [pageSpeedOptimizing, setPageSpeedOptimizing] = useState<string | null>(null);

  // Load saved blog ideas
  const loadSavedBlogIdeas = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "saved_blog_ideas").maybeSingle();
    if (data?.value) {
      const val = data.value as any;
      // Support both wrapped {items: [...]} and legacy array format
      const ideas = Array.isArray(val) ? val : (val?.items && Array.isArray(val.items) ? val.items : []);
      setSavedBlogIdeas(ideas as SavedBlogIdea[]);
    }
  }, []);

  const loadRemovedLinks = useCallback(async () => {
    setRemovedLinksLoading(true);
    try {
      const { getRemovedLinks } = await import("@/lib/adminCleanup");
      const links = await getRemovedLinks();
      setRemovedLinks(links);
    } catch {} finally { setRemovedLinksLoading(false); }
  }, []);

  const handlePermanentDelete = async (url: string) => {
    const { permanentlyRemoveLink } = await import("@/lib/adminCleanup");
    await permanentlyRemoveLink(url);
    setRemovedLinks(prev => prev.filter(l => l.url !== url));
    toast({ title: "Link permanently removed" });
  };

  const saveBlogIdeasToDb = async (ideas: SavedBlogIdea[]) => {
    try {
      const payload = { items: ideas } as unknown as Record<string, any>;
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "saved_blog_ideas").maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from("site_settings").update({ value: payload }).eq("id", existing.id);
        if (error) { console.error("Save blog ideas update error:", error); toast({ title: "Save failed", description: error.message, variant: "destructive" }); }
      } else {
        const { error } = await supabase.from("site_settings").insert({ key: "saved_blog_ideas", value: payload });
        if (error) { console.error("Save blog ideas insert error:", error); toast({ title: "Save failed", description: error.message, variant: "destructive" }); }
      }
    } catch (e: any) {
      console.error("Save blog ideas error:", e);
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setNewLinksDismissed(false);
    try {
      // Load previously known keys from DB (site_settings) for cross-browser persistence
      let knownKeys = new Set<string>();
      try {
        const { data: knownData } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "seo_dashboard_known_keys")
          .maybeSingle();
        if (knownData?.value && Array.isArray(knownData.value)) {
          knownKeys = new Set(knownData.value as string[]);
        }
      } catch {}
      setPreviousKeys(knownKeys);

      // Static pages — auto-detected from centralized config
      const staticPages = STATIC_PAGES_CONFIG.map(sp => ({
        id: `page-${sp.key}`,
        name: sp.label,
        slug: sp.path,
        path: sp.path,
      }));

      const [snapshots, ...results] = await Promise.all([
        fetchAllSeoSnapshots(),
        ...contentTypes.map((ct) =>
          supabase.from(contentTypeConfig[ct].table as any).select("*").order("created_at", { ascending: false }).limit(1000)
        ),
      ]);

      // Build rows from DB content
      const nextRows: DashboardRow[] = results.flatMap((result, index) => {
        const ct = contentTypes[index];
        return ((result.data as Record<string, any>[] | null) || []).map((item) => {
          const snapshot = snapshots[`${ct}:${item.id}`] || null;
          return { key: `${ct}:${item.id}`, id: item.id, contentType: ct, name: getName(item), slug: item.slug, city: item.city || null, state: item.state || null, item, snapshot, audit: getSEOAudit(ct, item, snapshot) };
        });
      });

      // Add static pages as a special content type
      const staticRows: DashboardRow[] = staticPages.map(sp => ({
        key: `static:${sp.id}`,
        id: sp.id,
        contentType: "article" as SEOContentType,
        name: sp.name,
        slug: sp.slug,
        path: sp.path,
        isStatic: true,
        city: null,
        state: null,
        item: { id: sp.id, title: sp.name, slug: sp.slug, meta_title: sp.name, meta_description: null, keywords: [] },
        snapshot: snapshots[`static:${sp.id}`] || null,
        audit: {
          score: 50, status: "warning" as ScoreStatus, issues: ["Static page — manage SEO in code"],
          hasMetaTitle: true, hasMetaDesc: false, hasKeywords: false, hasH1: true,
          hasContent: true, hasSchema: false, hasSlug: true, hasCanonical: false,
          hasSocial: false, hasTechnical: false, aiOptimized: false,
          metaTitleLen: sp.name.length, metaDescLen: 0, keywordCount: 0,
          shortTailCount: 0, longTailCount: 0, wordCount: 0,
        },
      }));

      nextRows.push(...staticRows);
      setRows(nextRows);

      // Detect new pages (only if we have previously saved keys)
      if (knownKeys.size > 0) {
        const detected = nextRows.filter(r => !knownKeys.has(r.key));
        setNewRows(detected);
        if (detected.length > 0) {
          toast({ title: `${detected.length} New Page${detected.length > 1 ? "s" : ""} Detected!`, description: "New content found since last refresh." });
        }
      } else {
        // First visit — save all current keys as baseline (no "new" banner)
        setNewRows([]);
        const currentKeys = nextRows.map(r => r.key);
        await saveKnownKeys(currentKeys);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  const saveKnownKeys = async (keys: string[]) => {
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "seo_dashboard_known_keys")
      .maybeSingle();
    if (existing?.id) {
      await supabase.from("site_settings").update({ value: keys as unknown as Record<string, any> }).eq("id", existing.id);
    } else {
      await supabase.from("site_settings").insert({ key: "seo_dashboard_known_keys", value: keys as unknown as Record<string, any> });
    }
  };

  const acknowledgeNewLinks = async () => {
    setNewLinksDismissed(true);
    // Save all current keys as known so next refresh starts fresh
    const currentKeys = rows.map(r => r.key);
    await saveKnownKeys(currentKeys);
  };

  // Auto-poll for new pages every 90 seconds
  useEffect(() => { fetchDashboardData(); loadSavedBlogIdeas(); loadDailyReport(); loadRemovedLinks(); }, [fetchDashboardData, loadSavedBlogIdeas, loadRemovedLinks]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !bulkLoading) fetchDashboardData();
    }, 90_000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, loading, bulkLoading]);

  // ── New Feature Functions ──
  const loadDailyReport = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "seo_competitor_daily_report").maybeSingle();
    if (data?.value) setDailyReport(data.value as any);
  }, []);

  const runAutoGenerate = async () => {
    setAutoGenLoading(true);
    try {
      const targetRows = rows.filter(r => r.contentType === autoGenType);
      const pageIds = targetRows.map(r => r.id).slice(0, 20);
      const allPages = rows.map(r => ({ meta_title: r.item.meta_title, meta_description: r.item.meta_description }));
      const { data, error } = await supabase.functions.invoke("auto-seo-engine", {
        body: { mode: "bulk_optimize", contentType: autoGenType, pageIds, allPages },
      });
      if (error) throw error;
      setAutoGenResults(data?.results || []);
      toast({ title: "Auto-generate complete", description: `Processed ${data?.processed || 0} pages` });
      fetchDashboardData();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setAutoGenLoading(false); }
  };

  const runUniquenessCheck = async () => {
    setUniqueLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-seo-engine", { body: { mode: "uniqueness_check" } });
      if (error) throw error;
      setUniqueData(data);
      toast({ title: "Uniqueness check complete" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setUniqueLoading(false); }
  };

  const runContentGaps = async () => {
    setGapsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-seo-engine", { body: { mode: "content_gaps" } });
      if (error) throw error;
      setGapsData(data);
      toast({ title: "Content gap analysis complete" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setGapsLoading(false); }
  };

  const runDailyCompetitorRefresh = async () => {
    setDailyReportRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-competitor-cron", { body: {} });
      if (error) throw error;
      if (data?.report) setDailyReport(data.report);
      toast({ title: "Competitor report refreshed" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setDailyReportRefreshing(false); }
  };

  const handleImplementAction = async (action: any) => {
    if (!action.targetPages?.length) { toast({ title: "No target pages for this action" }); return; }
    toast({ title: "Action noted", description: `"${action.action}" — apply via Bulk Optimize on matching pages.` });
  };

  // ── Research Functions ──
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
      setKwClusters(d?.keywordClusters || []);
      setKwDataQuality(d?.dataQualityReport || null);
      setKwCompetitorKws(d?.competitorKeywords || []);
      setKwSummary(d?.summary || "");
      setKwLastRefresh(new Date().toLocaleString());
      const realCount = (d?.keywords || []).filter((k: any) => k.source !== "ai_enriched").length;
      toast({ title: "Keyword research complete", description: `${d?.keywords?.length || 0} keywords (${realCount} from real data)` });
    } catch (e: any) {
      toast({ title: "Keyword research failed", description: e.message, variant: "destructive" });
    } finally { setKwLoading(false); }
  };

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
        metaDescription: t.metaDescription || `${t.title} - Complete guide covering ${t.targetKeyword}.`,
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
      setCompPositionJustification(d?.positionJustification || "");
      setCompSummary(d?.summary || "");
      setCompSWOT(d?.swotAnalysis || null);
      setCompBacklinks(d?.backlinkOpportunities || null);
      setCompPageRecs(d?.pageRecommendations || []);
      setCompLastRefresh(new Date().toLocaleString());
      toast({ title: "Competitor analysis complete" });
    } catch (e: any) {
      toast({ title: "Competitor analysis failed", description: e.message, variant: "destructive" });
    } finally { setCompLoading(false); }
  };

  // ── Auto-inject ──
  const handleAutoInjectKeywords = async () => {
    if (!kwSelectedKws.length) { toast({ title: "No keywords selected" }); return; }
    const targetRows = rows.filter(r => {
      if (!TABLES_WITH_KEYWORDS.includes(r.contentType)) return false;
      if (kwInjectTarget !== "all" && r.contentType !== kwInjectTarget) return false;
      return true;
    });
    if (!targetRows.length) { toast({ title: "No target pages", variant: "destructive" }); return; }
    if (!window.confirm(`Add ${kwSelectedKws.length} keywords to ${targetRows.length} pages?`)) return;

    setInjectLoading(true);
    let updated = 0;
    try {
      for (const row of targetRows.filter(r => !isStaticPage(r))) {
        const existing: string[] = row.item.keywords || [];
        const newKws = kwSelectedKws.filter(k => !existing.map(e => e.toLowerCase()).includes(k.toLowerCase()));
        if (!newKws.length) continue;
        const { error } = await supabase.from(contentTypeConfig[row.contentType].table as any).update({ keywords: [...existing, ...newKws] } as any).eq("id", row.id);
        if (!error) updated++;
      }
      toast({ title: "Keywords injected!", description: `Updated ${updated} pages.` });
      setKwSelectedKws([]);
      fetchDashboardData();
    } catch (e: any) { toast({ title: "Injection failed", description: e.message, variant: "destructive" }); }
    finally { setInjectLoading(false); }
  };

  const handleCompetitorAutoInject = async () => {
    if (!compGaps.length) { toast({ title: "Run competitor analysis first." }); return; }
    const gapKeywords = compGaps.map(g => g.keyword).filter(Boolean);
    if (!gapKeywords.length) { toast({ title: "No keyword gaps to inject" }); return; }

    let targetRows: DashboardRow[] = [];
    if (compInjectScope === "full") targetRows = rows.filter(r => TABLES_WITH_KEYWORDS.includes(r.contentType));
    else if (compInjectScope === "page") targetRows = rows.filter(r => TABLES_WITH_KEYWORDS.includes(r.contentType) && r.audit.score < 80);
    else targetRows = rows.filter(r => r.contentType === "article");

    if (!window.confirm(`Inject top 10 gap keywords into ${targetRows.length} pages?`)) return;

    setCompInjectLoading(true);
    let updated = 0;
    try {
      const topGapKws = gapKeywords.slice(0, 10);
      for (const row of targetRows.filter(r => !isStaticPage(r))) {
        const existing: string[] = row.item.keywords || [];
        const newKws = topGapKws.filter(k => !existing.map(e => e.toLowerCase()).includes(k.toLowerCase()));
        if (!newKws.length) continue;
        const { error } = await supabase.from(contentTypeConfig[row.contentType].table as any).update({ keywords: [...existing, ...newKws] } as any).eq("id", row.id);
        if (!error) updated++;
      }
      toast({ title: "Competitor keywords injected!", description: `Updated ${updated} pages.` });
      fetchDashboardData();
    } catch (e: any) { toast({ title: "Injection failed", description: e.message, variant: "destructive" }); }
    finally { setCompInjectLoading(false); }
  };

  // Blog idea management
  const handleSaveBlogIdea = async (bt: BlogTitleResult) => {
    const idea: SavedBlogIdea = {
      id: crypto.randomUUID(), title: bt.title, metaTitle: bt.metaTitle || bt.title.slice(0, 60),
      metaDescription: bt.metaDescription || `${bt.title} - Expert guide on ${bt.targetKeyword}.`,
      slug: bt.slug || generateSlug(bt.title), targetKeyword: bt.targetKeyword, searchVolume: bt.searchVolume,
      competition: bt.competition, contentType: bt.contentType, priority: bt.priority, savedAt: new Date().toISOString(),
    };
    const updated = [...savedBlogIdeas, idea];
    setSavedBlogIdeas(updated);
    await saveBlogIdeasToDb(updated);
    toast({ title: "Blog idea saved" });
  };
  const handleSaveAllBlogIdeas = async () => {
    const newIdeas: SavedBlogIdea[] = btResults.filter(bt => !savedBlogIdeas.some(s => s.title === bt.title)).map(bt => ({
      id: crypto.randomUUID(), title: bt.title, metaTitle: bt.metaTitle || bt.title.slice(0, 60),
      metaDescription: bt.metaDescription || `${bt.title} - Expert guide on ${bt.targetKeyword}.`,
      slug: bt.slug || generateSlug(bt.title), targetKeyword: bt.targetKeyword, searchVolume: bt.searchVolume,
      competition: bt.competition, contentType: bt.contentType, priority: bt.priority, savedAt: new Date().toISOString(),
    }));
    const updated = [...savedBlogIdeas, ...newIdeas];
    setSavedBlogIdeas(updated);
    await saveBlogIdeasToDb(updated);
    toast({ title: `Saved ${newIdeas.length} new ideas` });
  };
  const handleDeleteBlogIdea = async (id: string) => {
    const updated = savedBlogIdeas.filter(i => i.id !== id);
    setSavedBlogIdeas(updated);
    await saveBlogIdeasToDb(updated);
  };
  const handleDeleteAllBlogIdeas = async () => {
    if (!window.confirm("Delete all saved blog ideas?")) return;
    setSavedBlogIdeas([]);
    await saveBlogIdeasToDb([]);
  };

  // Hand off a blog brief to the Write-Blog page
  const handleWriteBlogViaAI = (brief: {
    title: string; slug?: string; targetKeyword: string;
    metaTitle?: string; metaDescription?: string; category?: string;
    secondaryKeywords?: string[];
  }) => {
    try {
      sessionStorage.setItem("ai_blog_brief_draft", JSON.stringify({
        title: brief.title,
        slug: brief.slug || generateSlug(brief.title),
        targetKeyword: brief.targetKeyword,
        metaTitle: brief.metaTitle || "",
        metaDescription: brief.metaDescription || "",
        category: brief.category || "news",
        secondaryKeywords: brief.secondaryKeywords || [],
      }));
    } catch {}
    navigate("/admin/seo/write-blog");
  };

  const runInterlinkSuggest = async () => {
    setInterlinkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-seo-engine", { body: { mode: "interlink_suggest" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInterlinkSuggestions(data?.suggestions || []);
      setInterlinkSummary(data?.summary || "");
      setInterlinkThemes(data?.themes || []);
      setInterlinkSelected(new Set((data?.suggestions || []).map((_: any, i: number) => i)));
      toast({ title: "Interlink suggestions ready", description: `${data?.suggestions?.length || 0} link opportunities found` });
    } catch (e: any) { toast({ title: "Interlink analysis failed", description: e.message, variant: "destructive" }); }
    finally { setInterlinkLoading(false); }
  };

  const handleInterlinkApply = async () => {
    const selected = interlinkSuggestions.filter((_, i) => interlinkSelected.has(i));
    if (!selected.length) { toast({ title: "No links selected" }); return; }
    if (!window.confirm(`Apply ${selected.length} internal links to page snapshots?`)) return;
    setInterlinkApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-seo-engine", { body: { mode: "interlink_apply", links: selected } });
      if (error) throw error;
      toast({ title: "Internal links applied!", description: `Updated ${data?.updated || 0} page snapshots with ${data?.totalLinks || 0} links.` });
      fetchDashboardData();
    } catch (e: any) { toast({ title: "Apply failed", description: e.message, variant: "destructive" }); }
    finally { setInterlinkApplying(false); }
  };

  const toggleInterlinkSelect = (index: number) => {
    setInterlinkSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const filteredInterlinks = useMemo(() => {
    if (interlinkFilter === "all") return interlinkSuggestions;
    return interlinkSuggestions.filter(s => s.priority === interlinkFilter || s.theme === interlinkFilter);
  }, [interlinkSuggestions, interlinkFilter]);


  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedType === "static") {
        if (!row.isStatic) return false;
      } else if (selectedType !== "all") {
        if (row.isStatic) return false;
        if (row.contentType !== selectedType) return false;
      }
      if (filterStatus !== "all" && row.audit.status !== filterStatus) return false;
      if (schemaFilter === "yes" && !row.audit.hasSchema) return false;
      if (schemaFilter === "no" && row.audit.hasSchema) return false;
      if (aiFilter === "yes" && !row.audit.aiOptimized) return false;
      if (aiFilter === "no" && row.audit.aiOptimized) return false;
      if (cityFilter !== "all" && (row.city || "") !== cityFilter) return false;
      if (stateFilter !== "all" && (row.state || "") !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        const typeLabel = row.isStatic ? "static page" : contentTypeConfig[row.contentType].label;
        return [row.name, row.slug, row.path, row.city, row.state, typeLabel]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
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
    const avgWordCount = total ? Math.round(rows.reduce((s, r) => s + r.audit.wordCount, 0) / total) : 0;
    return {
      total, good, warning, poor, avgScore, avgWordCount,
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
      thinContent: rows.filter(r => r.audit.wordCount < 250).length,
      mediumContent: rows.filter(r => r.audit.wordCount >= 250 && r.audit.wordCount < 1000).length,
      richContent: rows.filter(r => r.audit.wordCount >= 1000).length,
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

  const isStaticPage = (row: DashboardRow) => row.key.startsWith("static:");

  const applySEOFields = async (row: DashboardRow, suggestions: any) => {
    if (isStaticPage(row)) {
      toast({ title: "Static page", description: "Use Static Page SEO settings to update this page.", variant: "default" });
      return;
    }
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
    for (const row of selectedRows.filter(r => !isStaticPage(r))) {
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

  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "full-audit", label: "🔥 Full Audit & Fix", icon: FileCheck },
    { id: "pages", label: `All Pages (${filteredRows.length})`, icon: FileText },
    { id: "removed-links", label: "Removed Links", icon: Trash2 },
    { id: "interlinks", label: "Interlink Studio", icon: Link2 },
    { id: "auto-generate", label: "Auto-Generate", icon: Zap },
    { id: "uniqueness", label: "Uniqueness Check", icon: Shield },
    { id: "content-gaps", label: "Content Gaps", icon: Crosshair },
    { id: "keywords", label: "Keyword Research", icon: Search },
    { id: "blog-titles", label: "Blog Titles", icon: PenTool },
    { id: "competitors", label: "Competitor Intel", icon: Swords },
    { id: "daily-report", label: "Daily Report", icon: Activity },
    { id: "content-audit", label: "Content Audit", icon: BookOpen },
    { id: "backlinks", label: "Backlink Strategy", icon: Network },
    { id: "page-speed", label: "Page Speed", icon: Gauge },
    { id: "technical", label: "Technical SEO", icon: Shield },
    { id: "seo-health", label: "SEO Health", icon: Activity },
    { id: "topic-clusters", label: "Topic Clusters", icon: Layers },
    { id: "content-freshness", label: "Content Freshness", icon: RefreshCw },
    { id: "image-audit", label: "Image Audit", icon: Eye },
  ];

  return (
    <div className="flex gap-6">
      {/* ── Static Sidebar Navigation ── */}
      <div className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> SEO Command Center
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                      activeTab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
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
                  <div className="text-center p-1.5 rounded bg-green-50"><p className="text-xs font-bold text-green-700">{stats.good}</p><p className="text-[9px] text-green-600">Good</p></div>
                  <div className="text-center p-1.5 rounded bg-amber-50"><p className="text-xs font-bold text-amber-700">{stats.warning}</p><p className="text-[9px] text-amber-600">Warn</p></div>
                  <div className="text-center p-1.5 rounded bg-red-50"><p className="text-xs font-bold text-red-700">{stats.poor}</p><p className="text-[9px] text-red-600">Poor</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 space-y-6">
        <AutoFixPanel
          actions={["fix_all", "fix_missing_meta", "rewrite_legacy_domains", "flush_indexing"]}
          title="Site-wide auto-fix"
          subtitle="Hybrid: AI-generates missing meta on a batch of pages, rewrites legacy domains, flushes the indexing queue, and pings the sitemap."
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI SEO Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">Keyword research, competitor intelligence, content audit, backlink strategy — all AI-powered.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchDashboardData} disabled={loading || bulkLoading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Refresh
            </Button>
            <Button onClick={handleBulkOptimize} disabled={bulkLoading || selectedRows.length === 0} size="sm">
              {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Bulk Optimize ({selectedRows.length})
            </Button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {navItems.map(item => (<TabsTrigger key={item.id} value={item.id} className="text-xs">{item.label}</TabsTrigger>))}
            </TabsList>
          </Tabs>
        </div>

        {/* ═══ NEW LINKS DETECTED BANNER ═══ */}
        {!loading && newRows.length === 0 && !newLinksDismissed && previousKeys.size > 0 && (
          <Card className="border-muted bg-muted/30">
            <CardContent className="py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No new pages detected since last visit. Total tracked: {rows.length} pages ({contentTypes.length} content types + static pages).
            </CardContent>
          </Card>
        )}
        {newRows.length > 0 && !newLinksDismissed && (
          <Card className="border-green-500/50 bg-green-500/5 animate-in fade-in slide-in-from-top-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  {newRows.length} New Page{newRows.length > 1 ? "s" : ""} Detected
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const text = newRows.map(r => `${r.name} (${contentTypeConfig[r.contentType].label}) — Score: ${r.audit.score}%`).join("\n");
                    navigator.clipboard.writeText(text);
                    toast({ title: "Copied new pages list!" });
                  }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={acknowledgeNewLinks}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>These pages were added since your last dashboard visit. Run AI SEO to optimize them.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {newRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-md bg-green-500/5 border border-green-500/20">
                    <Badge variant="outline" className="text-green-600 border-green-500/50 text-[10px] px-1.5 py-0">NEW</Badge>
                    <Badge variant="secondary" className="text-[10px]">{contentTypeConfig[r.contentType].label}</Badge>
                    <span className="font-medium text-foreground truncate flex-1">{r.name}</span>
                    <span className="text-muted-foreground text-xs">{r.slug ? `/${r.slug}` : ""}</span>
                    <Badge className={`text-[10px] ${r.audit.status === "good" ? "bg-green-100 text-green-700" : r.audit.status === "warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {r.audit.score}%
                    </Badge>
                    <AISEOButton contentType={r.contentType} data={r.item} recordId={r.id} onApply={fetchDashboardData} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* ═══ FULL AUDIT & AUTO-FIX ═══ */}
        {activeTab === "full-audit" && (
          <SEOFullAudit rows={rows} onRefresh={fetchDashboardData} />
        )}
        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Average Score" value={`${stats.avgScore}%`} tone={stats.avgScore >= 80 ? "good" : stats.avgScore >= 55 ? "warning" : "poor"} icon={<Gauge className="h-5 w-5" />} />
              <StatCard label="Total Pages" value={String(stats.total)} icon={<FileText className="h-5 w-5" />} />
              <StatCard label="SEO-Ready" value={`${pct(stats.optimized)}%`} helper={`${stats.optimized}/${stats.total}`} tone={pct(stats.optimized) >= 70 ? "good" : pct(stats.optimized) >= 40 ? "warning" : "poor"} icon={<CheckCircle className="h-5 w-5" />} />
              <StatCard label="Avg Word Count" value={String(stats.avgWordCount)} helper={`${stats.thinContent} thin pages`} tone={stats.avgWordCount >= 800 ? "good" : "warning"} icon={<BookOpen className="h-5 w-5" />} />
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
                <CardHeader className="pb-2"><CardTitle className="text-sm">Content Quality Distribution</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm flex-1">Rich Content (1000+ words)</span><Badge className="bg-green-100 text-green-700">{stats.richContent}</Badge></div>
                  <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-sm flex-1">Medium Content (250-999)</span><Badge className="bg-amber-100 text-amber-700">{stats.mediumContent}</Badge></div>
                  <div className="flex items-center gap-3"><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm flex-1">Thin Content (&lt;250 words)</span><Badge className="bg-red-100 text-red-700">{stats.thinContent}</Badge></div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-3"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm flex-1">Good Score (80+)</span><Badge className="bg-green-100 text-green-700">{stats.good}</Badge></div>
                    <div className="flex items-center gap-3 mt-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-sm flex-1">Needs Work (55-79)</span><Badge className="bg-amber-100 text-amber-700">{stats.warning}</Badge></div>
                    <div className="flex items-center gap-3 mt-2"><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm flex-1">Poor (&lt;55)</span><Badge className="bg-red-100 text-red-700">{stats.poor}</Badge></div>
                  </div>
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
                    <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="static">Static Pages</SelectItem>{contentTypes.map(ct => <SelectItem key={ct} value={ct}>{contentTypeConfig[ct].label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                    <SelectTrigger><SelectValue placeholder="Score" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All scores</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="warning">Needs work</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent>
                  </Select>
                  <Select value={schemaFilter} onValueChange={(v) => setSchemaFilter(v as BooleanFilter)}>
                    <SelectTrigger><SelectValue placeholder="Schema" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Schema: all</SelectItem><SelectItem value="yes">Has schema</SelectItem><SelectItem value="no">No schema</SelectItem></SelectContent>
                  </Select>
                  <Select value={aiFilter} onValueChange={(v) => setAiFilter(v as BooleanFilter)}>
                    <SelectTrigger><SelectValue placeholder="AI" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">AI: all</SelectItem><SelectItem value="yes">AI done</SelectItem><SelectItem value="no">AI pending</SelectItem></SelectContent>
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
                        <TableHead className="w-10">S.No</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Words</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row, idx) => (
                        <TableRow key={row.key}>
                          <TableCell><Checkbox checked={selectedKeys.includes(row.key)} onCheckedChange={(c) => toggleRow(row.key, Boolean(c))} /></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium leading-none">{row.name}</p>
                            <p className="text-xs text-muted-foreground">/{row.slug || "—"}</p>
                          </TableCell>
                          <TableCell><Badge variant={row.isStatic ? "secondary" : "outline"} className="text-xs">{row.isStatic ? "Static Page" : contentTypeConfig[row.contentType].label}</Badge></TableCell>
                          <TableCell><span className={`text-xs font-mono ${row.audit.wordCount < 250 ? "text-red-500" : row.audit.wordCount < 1000 ? "text-amber-500" : "text-green-500"}`}>{row.audit.wordCount}</span></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <MiniBadge active={row.audit.hasMetaTitle}>Title</MiniBadge>
                              <MiniBadge active={row.audit.hasMetaDesc}>Meta</MiniBadge>
                              <MiniBadge active={row.audit.hasSchema}>Schema</MiniBadge>
                              <MiniBadge active={row.audit.hasCanonical}>Canon</MiniBadge>
                              <MiniBadge active={row.audit.aiOptimized}>AI</MiniBadge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 max-w-[200px]">
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
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{row.item?.created_at ? new Date(row.item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</TableCell>
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

        {/* ═══ AUTO-GENERATE ═══ */}
        {activeTab === "auto-generate" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Auto-Generate SEO for All Pages</CardTitle>
                <CardDescription>AI analyzes each page and auto-inserts unique meta titles, descriptions, and short/long-tail keywords. Ensures no duplicates across the site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Content Type</label>
                    <Select value={autoGenType} onValueChange={(v) => setAutoGenType(v as SEOContentType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{contentTypes.map(ct => <SelectItem key={ct} value={ct}>{contentTypeConfig[ct].label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={runAutoGenerate} disabled={autoGenLoading} size="lg">
                    {autoGenLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                    Auto-Generate All {contentTypeConfig[autoGenType].label}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Processes up to 20 pages per run. Each page gets unique meta title (≤60 chars), description (150-160 chars), short-tail & long-tail keywords, user intent, and internal link suggestions.</p>
              </CardContent>
            </Card>
            {autoGenResults.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Page</TableHead><TableHead>Status</TableHead><TableHead>Meta Title</TableHead><TableHead>Keywords</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {autoGenResults.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{r.name}</TableCell>
                          <TableCell><Badge className={r.status === "success" ? "bg-green-100 text-green-700" : r.status === "rate_limited" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{r.status}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{r.seo?.meta_title || "—"}</TableCell>
                          <TableCell className="text-xs">{(r.seo?.shortTailKeywords?.length || 0) + (r.seo?.longTailKeywords?.length || 0)} keywords</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ UNIQUENESS CHECK ═══ */}
        {activeTab === "uniqueness" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Meta Uniqueness Checker</CardTitle>
                <CardDescription>Scan all pages for duplicate meta titles, descriptions, and missing meta data.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={runUniquenessCheck} disabled={uniqueLoading}>
                  {uniqueLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Run Uniqueness Scan
                </Button>
              </CardContent>
            </Card>
            {uniqueData && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard label="Total Pages" value={String(uniqueData.totalPages)} icon={<FileText className="h-5 w-5" />} />
                  <StatCard label="Uniqueness Score" value={`${uniqueData.uniqueScore}%`} tone={uniqueData.uniqueScore >= 90 ? "good" : uniqueData.uniqueScore >= 70 ? "warning" : "poor"} icon={<Shield className="h-5 w-5" />} />
                  <StatCard label="Duplicate Titles" value={String(uniqueData.titleDuplicates?.length || 0)} tone={uniqueData.titleDuplicates?.length ? "poor" : "good"} icon={<AlertTriangle className="h-5 w-5" />} />
                  <StatCard label="Missing Meta" value={String(uniqueData.missingMeta?.length || 0)} tone={uniqueData.missingMeta?.length ? "warning" : "good"} icon={<XCircle className="h-5 w-5" />} />
                </div>
                {uniqueData.titleDuplicates?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Duplicate Meta Titles</CardTitle></CardHeader>
                    <CardContent>{uniqueData.titleDuplicates.map((d: any, i: number) => (
                      <div key={i} className="py-2 border-b last:border-0">
                        <p className="text-sm font-medium text-red-600">"{d.title}"</p>
                        <p className="text-xs text-muted-foreground">Found on {d.pages.length} pages: {d.pages.map((p: any) => p.slug).join(", ")}</p>
                      </div>
                    ))}</CardContent>
                  </Card>
                )}
                {uniqueData.missingMeta?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-amber-500" /> Missing Meta Data</CardTitle></CardHeader>
                    <CardContent>{uniqueData.missingMeta.slice(0, 20).map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                        <Badge variant="outline" className="text-xs">{m.contentType}</Badge>
                        <span className="text-sm flex-1">/{m.slug}</span>
                        <Badge variant="destructive" className="text-[10px]">Missing {m.missing}</Badge>
                      </div>
                    ))}</CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ CONTENT GAPS ═══ */}
        {activeTab === "content-gaps" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Crosshair className="h-5 w-5 text-primary" /> AI Content Gap Analysis</CardTitle>
                <CardDescription>AI analyzes your entire content inventory, identifies missing topics, user intent gaps, internal linking opportunities, and content format suggestions.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={runContentGaps} disabled={gapsLoading}>
                  {gapsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}Analyze Content Gaps
                </Button>
              </CardContent>
            </Card>
            {gapsData && (
              <>
                {gapsData.summary && <Card><CardContent className="pt-4"><p className="text-sm">{gapsData.summary}</p></CardContent></Card>}
                {gapsData.missingTopics?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-red-500" /> Missing Topics</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>Volume</TableHead><TableHead>Priority</TableHead><TableHead>Format</TableHead></TableRow></TableHeader>
                        <TableBody>{gapsData.missingTopics.map((t: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{t.topic}</TableCell>
                            <TableCell className="text-xs">{t.searchVolume || "—"}</TableCell>
                            <TableCell><Badge className={`text-xs ${t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{t.priority}</Badge></TableCell>
                            <TableCell className="text-xs">{t.suggestedFormat || "—"}</TableCell>
                          </TableRow>
                        ))}</TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  {gapsData.userIntentGaps?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> User Intent Gaps</CardTitle></CardHeader>
                      <CardContent>{gapsData.userIntentGaps.map((g: any, i: number) => (
                        <div key={i} className="py-2 border-b last:border-0">
                          <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{g.intent}</Badge><span className="text-sm font-medium">{g.query}</span></div>
                          <p className="text-xs text-muted-foreground mt-1">{g.recommendation}</p>
                        </div>
                      ))}</CardContent>
                    </Card>
                  )}
                  {gapsData.contentFormatSuggestions?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Format Suggestions</CardTitle></CardHeader>
                      <CardContent>{gapsData.contentFormatSuggestions.map((s: any, i: number) => (
                        <div key={i} className="py-2 border-b last:border-0">
                          <p className="text-sm font-medium">{s.page}</p>
                          <p className="text-xs text-muted-foreground">{s.suggestedFormat} — {s.reason}</p>
                        </div>
                      ))}</CardContent>
                    </Card>
                  )}
                </div>
                {gapsData.internalLinkOpportunities?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4" /> Internal Linking Opportunities</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Anchor Text</TableHead></TableRow></TableHeader>
                        <TableBody>{gapsData.internalLinkOpportunities.map((l: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{l.from}</TableCell>
                            <TableCell className="text-xs text-blue-600">{l.to}</TableCell>
                            <TableCell className="text-xs font-medium">{l.anchorText}</TableCell>
                          </TableRow>
                        ))}</TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                {gapsData.competitorGaps?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Competitor Content Gaps</CardTitle></CardHeader>
                    <CardContent>{gapsData.competitorGaps.map((g: string, i: number) => <p key={i} className="text-sm py-1 border-b last:border-0">• {g}</p>)}</CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ DAILY COMPETITOR REPORT ═══ */}
        {activeTab === "daily-report" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Daily Competitor Analysis Report</CardTitle>
                <CardDescription>Auto-runs daily at 6 AM comparing your SEO against Shiksha, Collegedunia, Careers360, MBAUniverse, InsideIIM & PagalGuy. Click "Implement" on any action to apply changes.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div>
                  {dailyReport?.dateGenerated && <p className="text-xs text-muted-foreground">Last report: {new Date(dailyReport.dateGenerated).toLocaleString()}</p>}
                  {dailyReport?.ourStats && <p className="text-xs text-muted-foreground">Our stats: {dailyReport.ourStats.totalPages} pages, {dailyReport.ourStats.pagesWithMeta} with meta</p>}
                </div>
                <Button onClick={runDailyCompetitorRefresh} disabled={dailyReportRefreshing}>
                  {dailyReportRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Refresh Now
                </Button>
              </CardContent>
            </Card>
            {dailyReport && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard label="Our Position" value={`${dailyReport.overallPosition}/10`} tone={dailyReport.overallPosition >= 7 ? "good" : dailyReport.overallPosition >= 4 ? "warning" : "poor"} icon={<Trophy className="h-5 w-5" />} />
                  <StatCard label="Competitors" value={String(dailyReport.competitors?.length || 0)} icon={<Users className="h-5 w-5" />} />
                  <StatCard label="Keyword Gaps" value={String(dailyReport.keywordGaps?.length || 0)} icon={<Search className="h-5 w-5" />} />
                  <StatCard label="Actions" value={String(dailyReport.immediateActions?.length || 0)} icon={<Zap className="h-5 w-5" />} />
                </div>
                {dailyReport.summary && <Card><CardContent className="pt-4"><p className="text-sm">{dailyReport.summary}</p></CardContent></Card>}
                {dailyReport.immediateActions?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Immediate Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {dailyReport.immediateActions.map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{a.action}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge className={`text-[10px] ${a.impact === "high" ? "bg-red-100 text-red-700" : a.impact === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>Impact: {a.impact}</Badge>
                              <Badge variant="outline" className="text-[10px]">Effort: {a.effort}</Badge>
                            </div>
                            {a.targetPages?.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">Target: {a.targetPages.join(", ")}</p>}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleImplementAction(a)}>
                            <Sparkles className="h-3 w-3 mr-1" /> Implement
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {dailyReport.competitors?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Competitor Profiles</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {dailyReport.competitors.map((c: any, i: number) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> {c.domain}</span>
                            <Badge variant="outline">DA: {c.estimatedDA}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-green-600 font-medium">Strengths:</span> {c.keyAdvantages?.slice(0, 2).join("; ")}</div>
                            <div><span className="text-red-600 font-medium">Weaknesses:</span> {c.weaknesses?.slice(0, 2).join("; ")}</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {dailyReport.keywordGaps?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Keyword Gaps to Target</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>Keyword</TableHead><TableHead>Volume</TableHead><TableHead>Competitor</TableHead><TableHead>Difficulty</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                        <TableBody>{dailyReport.keywordGaps.slice(0, 15).map((g: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{g.keyword}</TableCell>
                            <TableCell className="text-xs">{g.estimatedVolume?.toLocaleString() || "—"}</TableCell>
                            <TableCell className="text-xs">{g.competitor || "—"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{g.difficulty || "—"}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{g.action}</TableCell>
                          </TableRow>
                        ))}</TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  {dailyReport.contentGaps?.length > 0 && (
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Content Gaps</CardTitle></CardHeader><CardContent>{dailyReport.contentGaps.map((g: string, i: number) => <p key={i} className="text-sm py-1 border-b last:border-0">• {g}</p>)}</CardContent></Card>
                  )}
                  {dailyReport.technicalImprovements?.length > 0 && (
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Technical Improvements</CardTitle></CardHeader><CardContent>{dailyReport.technicalImprovements.map((t: string, i: number) => <p key={i} className="text-sm py-1 border-b last:border-0">🔧 {t}</p>)}</CardContent></Card>
                  )}
                </div>
              </>
            )}
            {!dailyReport && !dailyReportRefreshing && (
              <Card><CardContent className="pt-8 pb-8 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No daily report yet. Click "Refresh Now" to generate the first one.</p>
              </CardContent></Card>
            )}
          </div>
        )}

        {activeTab === "keywords" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> AI Keyword Research</CardTitle>
                <CardDescription>Real Google data + AI enrichment. Discover, filter, and auto-inject keywords into your pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={kwQuery} onChange={e => setKwQuery(e.target.value)} placeholder="Enter niche or topic..." className="flex-1" />
                  <Button onClick={runKeywordResearch} disabled={kwLoading}>
                    {kwLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Research
                  </Button>
                </div>
                {kwLastRefresh && <p className="text-xs text-muted-foreground">Last refreshed: {kwLastRefresh}</p>}
              </CardContent>
            </Card>

            {kwResults.length > 0 && (
              <>
                {/* Data Quality Report */}
                {kwDataQuality && (
                  <Card className="border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Data Quality:</span>
                          <Badge className={`text-xs ${kwDataQuality.confidence === "high" ? "bg-primary/10 text-primary" : kwDataQuality.confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{kwDataQuality.confidence || "unknown"}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {kwDataQuality.totalRealKeywords || 0} real • {kwDataQuality.totalAiEnriched || 0} AI-enriched
                        </span>
                        {kwDataQuality.dataSourcesUsed?.length ? (
                          <div className="flex gap-1">{kwDataQuality.dataSourcesUsed.map((s, i) => <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>)}</div>
                        ) : null}
                        {kwDataQuality.notes && <p className="text-xs text-muted-foreground w-full">{kwDataQuality.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {kwSummary && <Card><CardContent className="pt-4"><p className="text-sm">{kwSummary}</p></CardContent></Card>}

                {/* Inject Controls */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{kwSelectedKws.length} keywords selected</p>
                        <p className="text-xs text-muted-foreground">Will be added to the keywords field of each page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={kwInjectTarget} onValueChange={(v) => setKwInjectTarget(v as any)}>
                          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Pages</SelectItem>
                            {TABLES_WITH_KEYWORDS.map(ct => (<SelectItem key={ct} value={ct}>{contentTypeConfig[ct].label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAutoInjectKeywords} disabled={injectLoading || kwSelectedKws.length === 0} size="sm">
                          {injectLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Auto-Inject
                        </Button>
                      </div>
                    </div>
                    {kwSelectedKws.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {kwSelectedKws.map(kw => (
                          <Badge key={kw} variant="secondary" className="text-xs gap-1">{kw}<button onClick={() => setKwSelectedKws(p => p.filter(k => k !== kw))} className="ml-1 hover:text-destructive">×</button></Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Filters & Sort */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-muted-foreground">Sort:</span>
                  <Select value={kwSortBy} onValueChange={v => setKwSortBy(v as any)}>
                    <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">Volume ↓</SelectItem>
                      <SelectItem value="difficulty">Difficulty ↑</SelectItem>
                      <SelectItem value="priority">Priority ↓</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs font-medium text-muted-foreground ml-2">Source:</span>
                  <Select value={kwFilterSource} onValueChange={setKwFilterSource}>
                    <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="google_suggest">Google Suggest</SelectItem>
                      <SelectItem value="paa">People Also Ask</SelectItem>
                      <SelectItem value="alphabet">Alphabet Expansion</SelectItem>
                      <SelectItem value="trends">Google Trends</SelectItem>
                      <SelectItem value="ai_enriched">AI Enriched</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs font-medium text-muted-foreground ml-2">Intent:</span>
                  <Select value={kwFilterIntent} onValueChange={setKwFilterIntent}>
                    <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Intents</SelectItem>
                      <SelectItem value="informational">Informational</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="transactional">Transactional</SelectItem>
                      <SelectItem value="navigational">Navigational</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={() => { navigator.clipboard.writeText(kwResults.map(k => `${k.keyword}\t${k.searchVolume}\t${k.competition}\t${k.difficulty}\t${k.intent}\t${k.source || ""}`).join("\n")); toast({ title: "Copied to clipboard" }); }}>
                    <Copy className="h-3 w-3 mr-1" /> Export TSV
                  </Button>
                </div>

                {/* Keywords Table */}
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"><Checkbox checked={kwResults.length > 0 && kwSelectedKws.length === kwResults.length} onCheckedChange={(c) => setKwSelectedKws(c ? kwResults.map(k => k.keyword) : [])} /></TableHead>
                          <TableHead>Keyword</TableHead><TableHead>Volume</TableHead><TableHead>Difficulty</TableHead><TableHead>Competition</TableHead><TableHead>Intent</TableHead><TableHead>Trend</TableHead><TableHead>Source</TableHead><TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kwResults
                          .filter(kw => kwFilterSource === "all" || kw.source === kwFilterSource)
                          .filter(kw => kwFilterIntent === "all" || kw.intent === kwFilterIntent)
                          .sort((a, b) => {
                            if (kwSortBy === "volume") return (b.searchVolume || 0) - (a.searchVolume || 0);
                            if (kwSortBy === "difficulty") return (a.difficulty || 0) - (b.difficulty || 0);
                            return (b.priorityScore || 0) - (a.priorityScore || 0);
                          })
                          .map((kw, i) => (
                          <TableRow key={i}>
                            <TableCell><Checkbox checked={kwSelectedKws.includes(kw.keyword)} onCheckedChange={(c) => setKwSelectedKws(prev => c ? [...prev, kw.keyword] : prev.filter(k => k !== kw.keyword))} /></TableCell>
                            <TableCell className="font-medium text-sm">{kw.keyword}</TableCell>
                            <TableCell><span className="font-mono text-sm">{kw.searchVolume?.toLocaleString()}</span>{kw.cpc ? <span className="text-[10px] text-muted-foreground block">₹{kw.cpc}</span> : null}</TableCell>
                            <TableCell><div className="flex items-center gap-1"><Progress value={kw.difficulty} className="w-16 h-2" /><span className="text-xs">{kw.difficulty}</span></div></TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${kw.competition === "low" ? "border-green-300 text-green-700" : kw.competition === "high" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}`}>{kw.competition}</Badge></TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{kw.intent}</Badge></TableCell>
                            <TableCell>{trendIcon(kw.trending)}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${kw.source === "google_suggest" ? "border-blue-300 text-blue-700" : kw.source === "paa" ? "border-purple-300 text-purple-700" : kw.source === "alphabet" ? "border-cyan-300 text-cyan-700" : kw.source === "trends" ? "border-green-300 text-green-700" : kw.source === "ai_enriched" ? "border-amber-300 text-amber-700" : ""}`}>{kw.source || "—"}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{kw.category || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Keyword Clusters */}
                {kwClusters.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Keyword Clusters ({kwClusters.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {kwClusters.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{c.clusterName}</span>
                            {c.suggestedContentType && <Badge variant="outline" className="text-[10px]">{c.suggestedContentType}</Badge>}
                          </div>
                          <p className="text-xs text-primary font-medium mb-1">Pillar: {c.pillarKeyword}</p>
                          <div className="flex flex-wrap gap-1">{c.supportingKeywords.map((sk, j) => <Badge key={j} variant="secondary" className="text-[10px]">{sk}</Badge>)}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Content Gaps / Seasonal / Snippets */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Content Gaps</CardTitle></CardHeader><CardContent className="space-y-2">{kwContentGaps.map((g, i) => (
                    <div key={i} className="text-sm py-1 border-b last:border-0">
                      <p className="font-medium">{typeof g === "string" ? g : g.gap}</p>
                      {typeof g !== "string" && g.suggestedTitle && <p className="text-xs text-primary">→ {g.suggestedTitle}</p>}
                      {typeof g !== "string" && g.estimatedTraffic && <span className="text-[10px] text-muted-foreground">{g.estimatedTraffic.toLocaleString()} est. traffic</span>}
                    </div>
                  ))}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Seasonal</CardTitle></CardHeader><CardContent className="space-y-2">{kwSeasonal.map((s, i) => (
                    <div key={i} className="text-sm py-1 border-b last:border-0">
                      <p className="font-medium">{typeof s === "string" ? s : s.keyword}</p>
                      {typeof s !== "string" && <p className="text-xs text-muted-foreground">Peak: {s.peakMonths} — {s.action}</p>}
                    </div>
                  ))}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Snippet Opportunities</CardTitle></CardHeader><CardContent className="space-y-2">{kwSnippets.map((s, i) => (
                    <div key={i} className="text-sm py-1 border-b last:border-0">
                      <p className="font-medium">{typeof s === "string" ? s : s.question}</p>
                      {typeof s !== "string" && s.currentRanker && <p className="text-[10px] text-muted-foreground">Current: {s.currentRanker}</p>}
                    </div>
                  ))}</CardContent></Card>
                </div>

                {/* Competitor Keywords */}
                {kwCompetitorKws.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Swords className="h-4 w-4" /> Competitor Keywords ({kwCompetitorKws.length})</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead>Keyword</TableHead><TableHead>Competitor</TableHead><TableHead>Position</TableHead><TableHead>Opportunity</TableHead></TableRow></TableHeader>
                        <TableBody>{kwCompetitorKws.slice(0, 15).map((ck, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{ck.keyword}</TableCell>
                            <TableCell className="text-xs">{ck.competitor}</TableCell>
                            <TableCell className="text-xs">#{ck.estimatedPosition || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{ck.ourOpportunity || "—"}</TableCell>
                          </TableRow>
                        ))}</TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
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
                <CardDescription>AI-generated titles with meta, description, slug — save ideas and build your pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={btQuery} onChange={e => setBtQuery(e.target.value)} placeholder="Enter topic..." className="flex-1" />
                  <Button onClick={runBlogTitleResearch} disabled={btLoading}>{btLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Research</Button>
                </div>
                {btLastRefresh && <p className="text-xs text-muted-foreground">Last refreshed: {btLastRefresh}</p>}
              </CardContent>
            </Card>
            {btResults.length > 0 && (
              <>
                {btSummary && <Card><CardContent className="pt-4"><p className="text-sm">{btSummary}</p></CardContent></Card>}
                <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={handleSaveAllBlogIdeas}><Save className="h-4 w-4 mr-1" /> Save All</Button></div>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Title / Meta</TableHead><TableHead>Keyword</TableHead><TableHead>Volume</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Trend</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {btResults.map((bt, i) => (
                          <TableRow key={i}>
                            <TableCell className="max-w-[350px]">
                              <p className="font-medium text-sm">{bt.title}</p>
                              <p className="text-[11px] text-blue-600 mt-0.5">Meta: {bt.metaTitle}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{bt.metaDescription}</p>
                              <p className="text-[10px] text-green-600 mt-0.5">/{bt.slug}</p>
                            </TableCell>
                            <TableCell className="text-xs">{bt.targetKeyword}</TableCell>
                            <TableCell><span className="font-mono text-sm">{bt.searchVolume?.toLocaleString()}</span></TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{bt.contentType}</Badge></TableCell>
                            <TableCell><Badge className={`text-xs ${priorityColor(bt.priority)}`}>{bt.priority}</Badge></TableCell>
                            <TableCell><div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /><span className="text-xs">{bt.trendingScore}/10</span></div></TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(`Title: ${bt.title}\nMeta: ${bt.metaTitle}\nDesc: ${bt.metaDescription}\nSlug: ${bt.slug}\nKeyword: ${bt.targetKeyword}`); toast({ title: "Copied" }); }}><Copy className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveBlogIdea(bt)} disabled={savedBlogIdeas.some(s => s.title === bt.title)}><Save className="h-3 w-3" /></Button>
                                <Button variant="default" size="sm" className="h-7 px-2 gap-1" onClick={() => handleWriteBlogViaAI({ title: bt.title, slug: bt.slug, targetKeyword: bt.targetKeyword, metaTitle: bt.metaTitle, metaDescription: bt.metaDescription, category: "news" })}>
                                  <Wand2 className="h-3 w-3" /> Write via AI
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
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">🌿 Evergreen</CardTitle></CardHeader><CardContent>{btEvergreen.map((t, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {t}</p>)}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">🔥 Trending</CardTitle></CardHeader><CardContent>{btTrending.map((t, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {t}</p>)}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">📅 4-Week Calendar</CardTitle></CardHeader><CardContent>{btCalendar.map((w, i) => (<div key={i} className="py-2 border-b last:border-0"><p className="text-sm font-medium">Week {w.week}: {w.topic}</p><p className="text-xs text-muted-foreground">{w.keyword} — {w.reason}</p></div>))}</CardContent></Card>
                </div>
              </>
            )}
            {savedBlogIdeas.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Saved Ideas ({savedBlogIdeas.length})</CardTitle>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={handleDeleteAllBlogIdeas}><Trash2 className="h-3 w-3 mr-1" /> Clear All</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Meta Title</TableHead><TableHead>Slug</TableHead><TableHead>Keyword</TableHead><TableHead>Vol</TableHead><TableHead>Priority</TableHead><TableHead>Saved</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {savedBlogIdeas.map(idea => {
                        const copyCell = (text: string) => {
                          navigator.clipboard.writeText(text);
                          toast({ title: "Copied!", description: text.slice(0, 60) });
                        };
                        return (
                        <TableRow key={idea.id}>
                          <TableCell className="font-medium max-w-[250px]">
                            <div className="flex items-center gap-1 group">
                              <span className="truncate cursor-help" title={idea.title}>{idea.title}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyCell(idea.title)}><Copy className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-blue-600 max-w-[200px]">
                            <div className="flex items-center gap-1 group">
                              <span className="truncate cursor-help" title={idea.metaTitle}>{idea.metaTitle}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyCell(idea.metaTitle)}><Copy className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-green-600 max-w-[180px]">
                            <div className="flex items-center gap-1 group">
                              <span className="truncate cursor-help" title={`/${idea.slug}`}>/{idea.slug}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyCell(`/${idea.slug}`)}><Copy className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[140px]">
                            <div className="flex items-center gap-1 group">
                              <span className="truncate cursor-help" title={idea.targetKeyword}>{idea.targetKeyword}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyCell(idea.targetKeyword)}><Copy className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{idea.searchVolume?.toLocaleString()}</TableCell>
                          <TableCell><Badge className={`text-[10px] ${priorityColor(idea.priority)}`}>{idea.priority}</Badge></TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{new Date(idea.savedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button variant="default" size="sm" className="h-6 px-2 gap-1 text-[10px]" onClick={() => handleWriteBlogViaAI({ title: idea.title, slug: idea.slug, targetKeyword: idea.targetKeyword, metaTitle: idea.metaTitle, metaDescription: idea.metaDescription, category: "news" })}>
                                <Wand2 className="h-3 w-3" /> AI
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteBlogIdea(idea.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ COMPETITOR INTELLIGENCE (ENHANCED) ═══ */}
        {activeTab === "competitors" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Swords className="h-5 w-5 text-primary" /> Competitor Intelligence Center</CardTitle>
                <CardDescription>Deep competitor analysis with SWOT, backlink gaps, SERP features, and page-level action plans.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={compUrls} onChange={e => setCompUrls(e.target.value)} placeholder="Enter competitor domains, comma-separated..." rows={2} />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">{compLastRefresh ? `Last analyzed: ${compLastRefresh}` : "Not analyzed yet"}</p>
                  <Button onClick={runCompetitorAnalysis} disabled={compLoading}>
                    {compLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}Deep Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {compResults.length > 0 && (
              <>
                {/* Competitor sub-tabs */}
                <Tabs value={compSubTab} onValueChange={setCompSubTab}>
                  <TabsList className="flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="profiles" className="text-xs">Profiles</TabsTrigger>
                    <TabsTrigger value="swot" className="text-xs">SWOT</TabsTrigger>
                    <TabsTrigger value="gaps" className="text-xs">Keyword Gaps</TabsTrigger>
                    <TabsTrigger value="backlinks" className="text-xs">Backlinks</TabsTrigger>
                    <TabsTrigger value="actions" className="text-xs">Action Plan</TabsTrigger>
                  </TabsList>

                  {/* Overview Sub-tab */}
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <StatCard label="Our Position" value={`${compPosition}/10`} tone={compPosition >= 7 ? "good" : compPosition >= 4 ? "warning" : "poor"} icon={<Target className="h-5 w-5" />} />
                      <StatCard label="Keyword Gaps" value={String(compGaps.length)} icon={<Search className="h-5 w-5" />} />
                      <StatCard label="Quick Wins" value={String(compQuickWins.length)} icon={<Zap className="h-5 w-5" />} />
                      <StatCard label="Competitors Tracked" value={String(compResults.length)} icon={<Users className="h-5 w-5" />} />
                    </div>

                    {compSummary && <Card><CardContent className="pt-4"><p className="text-sm">{compSummary}</p></CardContent></Card>}
                    {compPositionJustification && (
                      <Card className="border-primary/20">
                        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Position Justification</CardTitle></CardHeader>
                        <CardContent><p className="text-sm">{compPositionJustification}</p></CardContent>
                      </Card>
                    )}

                    {/* Auto-inject bar */}
                    <Card className="border-amber-300/50 bg-amber-50/30">
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-amber-600" />Auto-Inject Competitor Gap Keywords</p>
                            <p className="text-xs text-muted-foreground mt-1">Injects top 10 gap keywords into your pages.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={compInjectScope} onValueChange={(v) => setCompInjectScope(v as any)}>
                              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">🌐 Full Website</SelectItem>
                                <SelectItem value="page">📄 Low-Score Pages</SelectItem>
                                <SelectItem value="section">📝 Articles Only</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleCompetitorAutoInject} disabled={compInjectLoading || compGaps.length === 0} size="sm">
                              {compInjectLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Inject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Quick Wins</CardTitle></CardHeader><CardContent>{compQuickWins.map((w, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">⚡ {w}</p>)}</CardContent></Card>
                      <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Long-Term Strategy</CardTitle></CardHeader><CardContent>{compLongTerm.map((s, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">📈 {s}</p>)}</CardContent></Card>
                    </div>

                    {compOpportunities.length > 0 && (
                      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">💡 Content Opportunities</CardTitle></CardHeader><CardContent>{compOpportunities.map((o, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {o}</p>)}</CardContent></Card>
                    )}
                  </TabsContent>

                  {/* Detailed Profiles Sub-tab */}
                  <TabsContent value="profiles" className="space-y-4">
                    {compResults.map((comp, i) => (
                      <Card key={i}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><Globe className="h-5 w-5" /> {comp.domain}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-sm">DA: {comp.domainAuthority}</Badge>
                              {comp.estimatedTraffic && <Badge variant="secondary" className="text-xs">Traffic: {comp.estimatedTraffic}</Badge>}
                              {comp.indexedPages && <Badge variant="secondary" className="text-xs">Pages: {comp.indexedPages}</Badge>}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Strengths</p>
                              {comp.strengths.map((s, j) => <p key={j} className="text-sm py-1 border-b last:border-0">✅ {s}</p>)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1"><XCircle className="h-3 w-3" /> Weaknesses</p>
                              {(comp.weaknesses || []).map((w, j) => <p key={j} className="text-sm py-1 border-b last:border-0">❌ {w}</p>)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Content Strategy</p>
                            <p className="text-sm">{comp.contentStrategy}</p>
                          </div>
                          {comp.topContentTypes && comp.topContentTypes.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Top Content Types</p>
                              <div className="flex flex-wrap gap-1">{comp.topContentTypes.map((t, j) => <Badge key={j} variant="outline" className="text-xs">{t}</Badge>)}</div>
                            </div>
                          )}
                          {comp.topPages && comp.topPages.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Top Pages Driving Traffic</p>
                              {comp.topPages.map((p, j) => <p key={j} className="text-sm py-1 border-b last:border-0 flex items-center gap-1"><ExternalLink className="h-3 w-3 shrink-0" /> {p}</p>)}
                            </div>
                          )}
                          {comp.serpFeatures && comp.serpFeatures.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">SERP Features Owned</p>
                              <div className="flex flex-wrap gap-1">{comp.serpFeatures.map((f, j) => <Badge key={j} className="text-xs bg-purple-100 text-purple-700">{f}</Badge>)}</div>
                            </div>
                          )}
                          {comp.technicalAdvantages && comp.technicalAdvantages.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Technical Advantages</p>
                              {comp.technicalAdvantages.map((t, j) => <p key={j} className="text-sm py-1 border-b last:border-0">🔧 {t}</p>)}
                            </div>
                          )}
                          <div className="grid gap-2 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Backlink Strategy</p>
                              <p className="text-sm">{comp.backlinkStrategy || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Social Presence</p>
                              <p className="text-sm">{comp.socialPresence || "N/A"}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Unique Keywords We Don't Target</p>
                            <div className="flex flex-wrap gap-1">{comp.uniqueKeywords.map((k, j) => <Badge key={j} variant="secondary" className="text-[10px]">{k}</Badge>)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  {/* SWOT Sub-tab */}
                  <TabsContent value="swot" className="space-y-4">
                    {compSWOT ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-green-200 bg-green-50/30">
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-green-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Strengths</CardTitle></CardHeader>
                          <CardContent>{compSWOT.strengths.map((s, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0 border-green-100">✅ {s}</p>)}</CardContent>
                        </Card>
                        <Card className="border-red-200 bg-red-50/30">
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700 flex items-center gap-2"><XCircle className="h-4 w-4" /> Weaknesses</CardTitle></CardHeader>
                          <CardContent>{compSWOT.weaknesses.map((w, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0 border-red-100">❌ {w}</p>)}</CardContent>
                        </Card>
                        <Card className="border-blue-200 bg-blue-50/30">
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Opportunities</CardTitle></CardHeader>
                          <CardContent>{compSWOT.opportunities.map((o, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0 border-blue-100">💡 {o}</p>)}</CardContent>
                        </Card>
                        <Card className="border-amber-200 bg-amber-50/30">
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Threats</CardTitle></CardHeader>
                          <CardContent>{compSWOT.threats.map((t, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0 border-amber-100">⚠️ {t}</p>)}</CardContent>
                        </Card>
                      </div>
                    ) : (
                      <Card><CardContent className="pt-6 text-center text-muted-foreground">Run competitor analysis to see SWOT data.</CardContent></Card>
                    )}
                  </TabsContent>

                  {/* Keyword Gaps Sub-tab */}
                  <TabsContent value="gaps" className="space-y-4">
                    {compGaps.length > 0 ? (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">🎯 Keyword Gaps — They Rank, You Don't ({compGaps.length} found)</CardTitle></CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader><TableRow><TableHead>Keyword</TableHead><TableHead>Volume</TableHead><TableHead>Difficulty</TableHead><TableHead>Competitor</TableHead><TableHead>Position</TableHead><TableHead>Opportunity</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {compGaps.map((gap, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{gap.keyword}</TableCell>
                                  <TableCell><span className="font-mono text-sm">{gap.searchVolume?.toLocaleString()}</span></TableCell>
                                  <TableCell><div className="flex items-center gap-1"><Progress value={gap.difficulty} className="w-12 h-2" /><span className="text-xs">{gap.difficulty}</span></div></TableCell>
                                  <TableCell className="text-xs">{gap.competitorRanking || "—"}</TableCell>
                                  <TableCell className="text-xs font-mono">{gap.rankingPosition || "—"}</TableCell>
                                  <TableCell className="text-xs">{gap.opportunity}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-[10px]">{gap.recommendedAction || "Create"}</Badge></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card><CardContent className="pt-6 text-center text-muted-foreground">No keyword gaps available yet.</CardContent></Card>
                    )}
                  </TabsContent>

                  {/* Backlinks Sub-tab */}
                  <TabsContent value="backlinks" className="space-y-4">
                    {compBacklinks ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {compBacklinks.siteTypes && compBacklinks.siteTypes.length > 0 && (
                          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> Site Types Linking to Competitors</CardTitle></CardHeader>
                            <CardContent>{compBacklinks.siteTypes.map((s, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">🔗 {s}</p>)}</CardContent>
                          </Card>
                        )}
                        {compBacklinks.outreachStrategies && compBacklinks.outreachStrategies.length > 0 && (
                          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Outreach Strategies</CardTitle></CardHeader>
                            <CardContent>{compBacklinks.outreachStrategies.map((s, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">📧 {s}</p>)}</CardContent>
                          </Card>
                        )}
                        {compBacklinks.resourcePages && compBacklinks.resourcePages.length > 0 && (
                          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Resource Page Opportunities</CardTitle></CardHeader>
                            <CardContent>{compBacklinks.resourcePages.map((s, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">📄 {s}</p>)}</CardContent>
                          </Card>
                        )}
                        {compBacklinks.guestPostTargets && compBacklinks.guestPostTargets.length > 0 && (
                          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PenTool className="h-4 w-4" /> Guest Posting Targets</CardTitle></CardHeader>
                            <CardContent>{compBacklinks.guestPostTargets.map((s, i) => <p key={i} className="text-sm py-1.5 border-b last:border-0">✍️ {s}</p>)}</CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <Card><CardContent className="pt-6 text-center text-muted-foreground">Run competitor analysis to see backlink opportunities.</CardContent></Card>
                    )}
                  </TabsContent>

                  {/* Action Plan Sub-tab */}
                  <TabsContent value="actions" className="space-y-4">
                    {compPageRecs.length > 0 ? (
                      <>
                        <p className="text-sm text-muted-foreground">Page-wise, section-wise recommendations based on competitor analysis. Each action is prioritized.</p>
                        {compPageRecs.map((rec, i) => (
                          <Card key={i} className={rec.priority === "high" ? "border-l-4 border-l-red-500" : rec.priority === "medium" ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-blue-500"}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center justify-between">
                                <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> {rec.pageType}</span>
                                <Badge className={`text-xs ${priorityColor(rec.priority)}`}>{rec.priority} priority</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {rec.recommendations.map((r, j) => (
                                <div key={j} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                                  <Crosshair className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
                                  <p className="text-sm">{r}</p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    ) : (
                      <Card><CardContent className="pt-6 text-center text-muted-foreground">Run competitor analysis to see action plans.</CardContent></Card>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}

        {/* ═══ CONTENT AUDIT ═══ */}
        {activeTab === "content-audit" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Content Audit</CardTitle>
                <CardDescription>Analyze content quality, word counts, thin pages, and optimization opportunities across your website.</CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Avg Word Count" value={String(stats.avgWordCount)} tone={stats.avgWordCount >= 800 ? "good" : "warning"} icon={<FileText className="h-5 w-5" />} />
              <StatCard label="Thin Pages (<250)" value={String(stats.thinContent)} tone={stats.thinContent === 0 ? "good" : "poor"} icon={<AlertTriangle className="h-5 w-5" />} />
              <StatCard label="Medium (250-999)" value={String(stats.mediumContent)} icon={<Activity className="h-5 w-5" />} />
              <StatCard label="Rich (1000+)" value={String(stats.richContent)} tone={stats.richContent > 0 ? "good" : "warning"} icon={<CheckCircle className="h-5 w-5" />} />
            </div>

            {/* Content by type */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Content Quality by Type</CardTitle></CardHeader>
              <CardContent>
                {contentTypes.map(ct => {
                  const typeRows = rows.filter(r => r.contentType === ct);
                  if (!typeRows.length) return null;
                  const avgWc = Math.round(typeRows.reduce((s, r) => s + r.audit.wordCount, 0) / typeRows.length);
                  const thin = typeRows.filter(r => r.audit.wordCount < 250).length;
                  const avgScore = Math.round(typeRows.reduce((s, r) => s + r.audit.score, 0) / typeRows.length);
                  return (
                    <div key={ct} className="flex items-center gap-4 py-2.5 border-b last:border-0">
                      <span className="text-sm font-medium w-28">{contentTypeConfig[ct].label}</span>
                      <span className="text-xs text-muted-foreground w-16">{typeRows.length} pages</span>
                      <div className="flex-1"><Progress value={avgScore} className="h-2" /></div>
                      <span className="text-xs font-mono w-12 text-right">{avgScore}%</span>
                      <span className="text-xs text-muted-foreground w-24">~{avgWc} words</span>
                      {thin > 0 && <Badge variant="destructive" className="text-[10px]">{thin} thin</Badge>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Thin content pages */}
            {stats.thinContent > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Thin Content Pages — Need Immediate Attention</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Page</TableHead><TableHead>Type</TableHead><TableHead>Words</TableHead><TableHead>Score</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {rows.filter(r => r.audit.wordCount < 250).sort((a, b) => a.audit.wordCount - b.audit.wordCount).slice(0, 20).map(row => (
                        <TableRow key={row.key}>
                          <TableCell><p className="font-medium text-sm">{row.name}</p><p className="text-xs text-muted-foreground">/{row.slug}</p></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{contentTypeConfig[row.contentType].label}</Badge></TableCell>
                          <TableCell><span className="font-mono text-sm text-red-500">{row.audit.wordCount}</span></TableCell>
                          <TableCell><span className="text-sm font-medium">{row.audit.score}%</span></TableCell>
                          <TableCell className="text-right"><AISEOButton contentType={row.contentType} recordId={row.id} data={row.item} onApply={(s) => applySEOFields(row, s)} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Pages missing keywords */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4 text-amber-500" /> Pages Missing Keywords</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Page</TableHead><TableHead>Type</TableHead><TableHead>Keywords</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.filter(r => !r.audit.hasKeywords && TABLES_WITH_KEYWORDS.includes(r.contentType)).slice(0, 15).map(row => (
                      <TableRow key={row.key}>
                        <TableCell><p className="font-medium text-sm">{row.name}</p></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{contentTypeConfig[row.contentType].label}</Badge></TableCell>
                        <TableCell><span className="text-xs text-red-500">{row.audit.keywordCount} keywords</span></TableCell>
                        <TableCell><span className="text-sm">{row.audit.score}%</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ BACKLINK STRATEGY ═══ */}
        {activeTab === "backlinks" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5 text-primary" /> Backlink Strategy</CardTitle>
                <CardDescription>AI-generated backlink opportunities based on competitor analysis. Run competitor analysis first to populate this section.</CardDescription>
              </CardHeader>
            </Card>

            {compBacklinks ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {compBacklinks.siteTypes && compBacklinks.siteTypes.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> Types of Sites Linking to Competitors</CardTitle></CardHeader>
                      <CardContent>{compBacklinks.siteTypes.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 py-2 border-b last:border-0"><Link2 className="h-3 w-3 mt-1 shrink-0 text-blue-500" /><p className="text-sm">{s}</p></div>
                      ))}</CardContent>
                    </Card>
                  )}
                  {compBacklinks.outreachStrategies && compBacklinks.outreachStrategies.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Outreach Strategies</CardTitle></CardHeader>
                      <CardContent>{compBacklinks.outreachStrategies.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 py-2 border-b last:border-0"><ArrowRight className="h-3 w-3 mt-1 shrink-0 text-green-500" /><p className="text-sm">{s}</p></div>
                      ))}</CardContent>
                    </Card>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {compBacklinks.resourcePages && compBacklinks.resourcePages.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Resource Pages to Target</CardTitle></CardHeader>
                      <CardContent>{compBacklinks.resourcePages.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 py-2 border-b last:border-0"><ExternalLink className="h-3 w-3 mt-1 shrink-0 text-purple-500" /><p className="text-sm">{s}</p></div>
                      ))}</CardContent>
                    </Card>
                  )}
                  {compBacklinks.guestPostTargets && compBacklinks.guestPostTargets.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PenTool className="h-4 w-4" /> Guest Post Targets</CardTitle></CardHeader>
                      <CardContent>{compBacklinks.guestPostTargets.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 py-2 border-b last:border-0"><Star className="h-3 w-3 mt-1 shrink-0 text-amber-500" /><p className="text-sm">{s}</p></div>
                      ))}</CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Run competitor analysis first to discover backlink opportunities.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab("competitors")}><Swords className="h-4 w-4 mr-2" /> Go to Competitor Intel</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ PAGE SPEED MONITOR (REAL API) ═══ */}
        {activeTab === "page-speed" && (
          <PageSpeedMonitor
            rows={rows}
            pageSpeedData={pageSpeedData}
            setPageSpeedData={setPageSpeedData}
            pageSpeedLoading={pageSpeedLoading}
            setPageSpeedLoading={setPageSpeedLoading}
            pageSpeedDevice={pageSpeedDevice}
            setPageSpeedDevice={setPageSpeedDevice}
            pageSpeedOptimizing={pageSpeedOptimizing}
            setPageSpeedOptimizing={setPageSpeedOptimizing}
            toast={toast}
          />
        )}

        {/* ═══ TECHNICAL SEO (ENHANCED) ═══ */}
        {activeTab === "technical" && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MonitorSmartphone className="h-4 w-4" /> Core Web Vitals & Performance</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="HTTPS Secure" status={window.location.protocol === "https:" ? "pass" : "fail"} detail="TLS encryption" icon={<Lock className="h-4 w-4" />} />
                  <TechCheck label="Responsive Viewport" status="pass" detail="viewport meta present" icon={<MonitorSmartphone className="h-4 w-4" />} />
                  <TechCheck label="robots.txt" status="pass" detail="Accessible" icon={<FileCheck className="h-4 w-4" />} />
                  <TechCheck label="XML Sitemap" status="pass" detail="Admin tooling available" icon={<MapPin className="h-4 w-4" />} />
                  <TechCheck label="Lazy Loading" status="pass" detail="Native lazy loading" icon={<Eye className="h-4 w-4" />} />
                  <TechCheck label="Semantic HTML" status="pass" detail="H1, H2, article, section" icon={<Code className="h-4 w-4" />} />
                  <TechCheck label="Font Display" status="pass" detail="font-display: swap" icon={<FileText className="h-4 w-4" />} />
                  <TechCheck label="SPA Rendering" status="warn" detail="Pre-rendering recommended" icon={<Globe className="h-4 w-4" />} />
                  <TechCheck label="Code Splitting" status="pass" detail="Vite dynamic imports" icon={<Layers className="h-4 w-4" />} />
                  <TechCheck label="Image Optimization" status="warn" detail="Consider WebP/AVIF" icon={<Eye className="h-4 w-4" />} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radio className="h-4 w-4" /> Indexing & Crawlability</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="Canonical URLs" status={pct(stats.withCanonical) >= 80 ? "pass" : "warn"} detail={`${stats.withCanonical}/${stats.total}`} icon={<Link2 className="h-4 w-4" />} />
                  <TechCheck label="JSON-LD Schema" status={pct(stats.withSchema) >= 80 ? "pass" : "warn"} detail={`${stats.withSchema}/${stats.total}`} icon={<Code className="h-4 w-4" />} />
                  <TechCheck label="Meta Titles" status={pct(stats.withMetaTitle) >= 90 ? "pass" : pct(stats.withMetaTitle) >= 70 ? "warn" : "fail"} detail={`${stats.withMetaTitle}/${stats.total}`} icon={<FileText className="h-4 w-4" />} />
                  <TechCheck label="Meta Descriptions" status={pct(stats.withMetaDesc) >= 90 ? "pass" : pct(stats.withMetaDesc) >= 70 ? "warn" : "fail"} detail={`${stats.withMetaDesc}/${stats.total}`} icon={<FileText className="h-4 w-4" />} />
                  <TechCheck label="Open Graph" status={pct(stats.withSocial) >= 70 ? "pass" : "warn"} detail={`${stats.withSocial}/${stats.total}`} icon={<Globe className="h-4 w-4" />} />
                  <TechCheck label="Twitter Cards" status={pct(stats.withSocial) >= 70 ? "pass" : "warn"} detail={`${stats.withSocial}/${stats.total}`} icon={<Globe className="h-4 w-4" />} />
                  <TechCheck label="Hreflang Tags" status="warn" detail="Not implemented (single language)" icon={<Globe className="h-4 w-4" />} />
                  <TechCheck label="Breadcrumb Schema" status="pass" detail="Homepage + detail pages" icon={<ArrowRight className="h-4 w-4" />} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Keyword Health</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="Keyword Coverage (4+)" status={pct(rows.filter(r => r.audit.hasKeywords).length) >= 80 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasKeywords).length}/${stats.total}`} icon={<Tag className="h-4 w-4" />} />
                  <TechCheck label="Short-tail Keywords" status={pct(stats.withShortTail) >= 50 ? "pass" : "warn"} detail={`${stats.withShortTail}/${stats.total}`} icon={<Search className="h-4 w-4" />} />
                  <TechCheck label="Long-tail Keywords" status={pct(stats.withLongTail) >= 50 ? "pass" : "warn"} detail={`${stats.withLongTail}/${stats.total}`} icon={<Search className="h-4 w-4" />} />
                  <TechCheck label="AI Snapshots" status={pct(stats.withAI) >= 60 ? "pass" : "warn"} detail={`${stats.withAI}/${stats.total}`} icon={<Sparkles className="h-4 w-4" />} />
                  <TechCheck label="Technical SEO Tips" status={pct(stats.withTechnical) >= 50 ? "pass" : "warn"} detail={`${stats.withTechnical}/${stats.total}`} icon={<Settings className="h-4 w-4" />} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Content Quality</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <TechCheck label="H1 Tags" status={pct(rows.filter(r => r.audit.hasH1).length) >= 90 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasH1).length}/${stats.total}`} icon={<FileText className="h-4 w-4" />} />
                  <TechCheck label="Content 250+ words" status={pct(rows.filter(r => r.audit.hasContent).length) >= 70 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasContent).length}/${stats.total}`} icon={<BookOpen className="h-4 w-4" />} />
                  <TechCheck label="Content 1000+ words" status={pct(stats.richContent) >= 30 ? "pass" : "warn"} detail={`${stats.richContent}/${stats.total}`} icon={<BookOpen className="h-4 w-4" />} />
                  <TechCheck label="Clean Slugs" status={pct(rows.filter(r => r.audit.hasSlug).length) >= 90 ? "pass" : "warn"} detail={`${rows.filter(r => r.audit.hasSlug).length}/${stats.total}`} icon={<Link2 className="h-4 w-4" />} />
                  <TechCheck label="Score ≥ 80" status={pct(stats.good) >= 50 ? "pass" : pct(stats.good) >= 25 ? "warn" : "fail"} detail={`${stats.good}/${stats.total}`} icon={<CheckCircle className="h-4 w-4" />} />
                  <TechCheck label="No Thin Pages" status={stats.thinContent === 0 ? "pass" : "fail"} detail={`${stats.thinContent} thin pages`} icon={<AlertTriangle className="h-4 w-4" />} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Security & Accessibility</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <TechCheck label="Content Security Policy" status="warn" detail="Recommended for production" icon={<Shield className="h-4 w-4" />} />
                <TechCheck label="X-Frame-Options" status="warn" detail="Consider adding DENY" icon={<Shield className="h-4 w-4" />} />
                <TechCheck label="ARIA Labels" status="pass" detail="Radix UI components" icon={<Users className="h-4 w-4" />} />
                <TechCheck label="Alt Text on Images" status="warn" detail="Check all images" icon={<Eye className="h-4 w-4" />} />
                <TechCheck label="Focus Management" status="pass" detail="Tab navigation works" icon={<Target className="h-4 w-4" />} />
                <TechCheck label="Color Contrast" status="pass" detail="WCAG AA compliant" icon={<Eye className="h-4 w-4" />} />
              </CardContent>
            </Card>

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
                <CoverageBar label="Rich Content" count={stats.richContent} total={stats.total} icon={<BookOpen className="h-3 w-3" />} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Priority Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pct(stats.withMetaTitle) < 90 && <RecommendationRow icon={<FileText className="h-4 w-4" />} text={`Add meta titles to ${stats.total - stats.withMetaTitle} pages`} severity="high" />}
                {pct(stats.withMetaDesc) < 90 && <RecommendationRow icon={<FileText className="h-4 w-4" />} text={`Add meta descriptions to ${stats.total - stats.withMetaDesc} pages`} severity="high" />}
                {pct(stats.withSchema) < 80 && <RecommendationRow icon={<Code className="h-4 w-4" />} text={`Generate schema for ${stats.total - stats.withSchema} pages`} severity="high" />}
                {stats.thinContent > 0 && <RecommendationRow icon={<AlertTriangle className="h-4 w-4" />} text={`${stats.thinContent} pages have thin content (<250 words) — add more content`} severity="high" />}
                {pct(stats.withAI) < 60 && <RecommendationRow icon={<Sparkles className="h-4 w-4" />} text={`Run AI optimization on ${stats.total - stats.withAI} pages`} severity="medium" />}
                {pct(stats.withSocial) < 70 && <RecommendationRow icon={<Globe className="h-4 w-4" />} text={`Add OG + Twitter meta to ${stats.total - stats.withSocial} pages`} severity="medium" />}
                {pct(stats.withLongTail) < 50 && <RecommendationRow icon={<Search className="h-4 w-4" />} text={`Research long-tail keywords — only ${stats.withLongTail} pages have them`} severity="low" />}
                {stats.poor > 0 && <RecommendationRow icon={<XCircle className="h-4 w-4" />} text={`${stats.poor} pages have poor scores — prioritize bulk optimization`} severity="high" />}
                <RecommendationRow icon={<Globe className="h-4 w-4" />} text="Consider SSR/pre-rendering for better crawler access to SPA content" severity="medium" />
                <RecommendationRow icon={<Eye className="h-4 w-4" />} text="Convert images to WebP/AVIF for faster page loads" severity="low" />
                <RecommendationRow icon={<Shield className="h-4 w-4" />} text="Add Content Security Policy headers for production" severity="low" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ REMOVED LINKS ═══ */}
        {activeTab === "removed-links" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" /> Removed Links
                </CardTitle>
                <CardDescription>Pages deleted from admin are tracked here. Permanently remove them when ready.</CardDescription>
              </CardHeader>
              <CardContent>
                {removedLinksLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : removedLinks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-semibold">No Removed Links</p>
                    <p className="text-sm">When you delete pages from admin, they will appear here automatically.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {removedLinks.map((link, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{link.label}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{link.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{link.url}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(link.deletedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handlePermanentDelete(link.url)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
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

        {/* ═══ INTERLINK STUDIO ═══ */}
        {activeTab === "interlinks" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /> Interlink Studio</CardTitle>
                    <CardDescription>AI-powered internal linking. Generate, review, add/remove, then apply to your pages.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={runInterlinkSuggest} disabled={interlinkLoading} size="sm">
                      {interlinkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {interlinkSuggestions.length ? "Re-analyze" : "Generate Suggestions"}
                    </Button>
                    {interlinkSuggestions.length > 0 && (
                      <Button onClick={handleInterlinkApply} disabled={interlinkApplying || interlinkSelected.size === 0} size="sm" variant="default">
                        {interlinkApplying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Apply Selected ({interlinkSelected.size})
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {interlinkSummary && (
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{interlinkSummary}</p>
                </CardContent>
              )}
            </Card>

            {interlinkSuggestions.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant={interlinkFilter === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setInterlinkFilter("all")}>
                    All ({interlinkSuggestions.length})
                  </Badge>
                  {["high", "medium", "low"].map(p => {
                    const count = interlinkSuggestions.filter(s => s.priority === p).length;
                    return count > 0 ? (
                      <Badge key={p} variant={interlinkFilter === p ? "default" : "outline"} className="cursor-pointer" onClick={() => setInterlinkFilter(p)}>
                        {p.charAt(0).toUpperCase() + p.slice(1)} ({count})
                      </Badge>
                    ) : null;
                  })}
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setInterlinkSelected(new Set(filteredInterlinks.map((s) => interlinkSuggestions.indexOf(s))))}>Select All</Button>
                    <Button size="sm" variant="outline" onClick={() => setInterlinkSelected(new Set())}>Deselect All</Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {filteredInterlinks.map((link) => {
                    const originalIdx = interlinkSuggestions.indexOf(link);
                    const isSelected = interlinkSelected.has(originalIdx);
                    return (
                      <Card key={originalIdx} className={`transition-all ${isSelected ? "border-primary/50 bg-primary/5" : "opacity-60"}`}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleInterlinkSelect(originalIdx)} className="mt-1" />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-[10px] ${link.priority === "high" ? "bg-red-100 text-red-700" : link.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{link.priority}</Badge>
                                {link.theme && <Badge variant="outline" className="text-[10px]">{link.theme}</Badge>}
                              </div>
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className="font-medium truncate max-w-[200px]">{link.sourceName}</span>
                                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                                <span className="font-medium truncate max-w-[200px] text-primary">{link.targetName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{link.sourcePath}</code>
                                <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{link.targetPath}</code>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Anchor:</span>
                                <span className="text-xs font-medium text-primary">&quot;{link.anchorText}&quot;</span>
                              </div>
                              {link.reason && <p className="text-xs text-muted-foreground italic">{link.reason}</p>}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => {
                              const next = interlinkSuggestions.filter((_, i) => i !== originalIdx);
                              setInterlinkSuggestions(next);
                              setInterlinkSelected(prev => { const n = new Set<number>(); prev.forEach(v => { if (v < originalIdx) n.add(v); else if (v > originalIdx) n.add(v - 1); }); return n; });
                            }}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {!interlinkLoading && interlinkSuggestions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Link2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Interlink Suggestions Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Click &quot;Generate Suggestions&quot; to analyze your site and get AI-powered internal linking recommendations.</p>
                  <Button onClick={runInterlinkSuggest} disabled={interlinkLoading}>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate Suggestions
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ SEO HEALTH ═══ */}
        {activeTab === "seo-health" && <SEOHealthPanel rows={rows} />}

        {/* ═══ TOPIC CLUSTERS ═══ */}
        {activeTab === "topic-clusters" && <TopicClustersPanel />}

        {/* ═══ CONTENT FRESHNESS ═══ */}
        {activeTab === "content-freshness" && (
          <ContentFreshnessPanel rows={rows} onRefresh={fetchDashboardData} />
        )}

        {/* ═══ IMAGE AUDIT ═══ */}
        {activeTab === "image-audit" && <ImageAuditPanel />}
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

// ═══════════════════════════════════════════════════════════
// SEO HEALTH PANEL — Aggregated KPI Dashboard
// ═══════════════════════════════════════════════════════════
function SEOHealthPanel({ rows }: { rows: DashboardRow[] }) {
  const total = rows.length || 1;
  const withPrimaryKW = rows.filter(r => r.item.primary_keyword).length;
  const withFunnel = rows.filter(r => r.item.funnel_stage).length;
  const withCluster = rows.filter(r => r.item.cluster_id).length;
  const scored = rows.filter(r => typeof r.item.content_score === "number");
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.item.content_score || 0), 0) / scored.length)
    : 0;
  const NINETY = 90 * 24 * 60 * 60 * 1000;
  const stale = rows.filter(r => {
    const ref = r.item.last_seo_refresh || r.item.updated_at;
    return !ref || (Date.now() - new Date(ref).getTime() > NINETY);
  }).length;
  const withFaq = rows.filter(r => Array.isArray((r.snapshot as any)?.faqs) && (r.snapshot as any).faqs.length).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> SEO Health Overview</CardTitle>
          <CardDescription>Cross-page KPI snapshot for AI-search readiness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Pages with Primary KW" value={`${Math.round((withPrimaryKW / total) * 100)}%`} helper={`${withPrimaryKW}/${total}`} tone={withPrimaryKW / total > 0.8 ? "good" : withPrimaryKW / total > 0.5 ? "warning" : "poor"} icon={<Target className="h-4 w-4" />} />
            <StatCard label="Funnel Tagged" value={`${Math.round((withFunnel / total) * 100)}%`} helper={`${withFunnel}/${total}`} tone={withFunnel / total > 0.8 ? "good" : "warning"} icon={<Layers className="h-4 w-4" />} />
            <StatCard label="In Topic Cluster" value={`${Math.round((withCluster / total) * 100)}%`} helper={`${withCluster}/${total}`} tone={withCluster / total > 0.5 ? "good" : "warning"} icon={<Network className="h-4 w-4" />} />
            <StatCard label="Avg Content Score" value={`${avgScore}`} helper="0-100 (E-E-A-T)" tone={avgScore > 75 ? "good" : avgScore > 50 ? "warning" : "poor"} icon={<Brain className="h-4 w-4" />} />
            <StatCard label="With FAQs" value={`${Math.round((withFaq / total) * 100)}%`} helper={`${withFaq}/${total}`} tone={withFaq / total > 0.5 ? "good" : "warning"} icon={<Search className="h-4 w-4" />} />
            <StatCard label="Stale (>90d)" value={`${stale}`} helper="Need refresh" tone={stale > total * 0.3 ? "poor" : stale > 0 ? "warning" : "good"} icon={<RefreshCw className="h-4 w-4" />} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPI Targets (per AI-Search Plan)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CoverageBar label="Pages with Primary Keyword" count={withPrimaryKW} total={total} icon={<Target className="h-4 w-4 text-primary" />} />
          <CoverageBar label="Pages with FAQ Schema" count={withFaq} total={total} icon={<Search className="h-4 w-4 text-primary" />} />
          <CoverageBar label="Pages in Topic Cluster" count={withCluster} total={total} icon={<Network className="h-4 w-4 text-primary" />} />
          <CoverageBar label="Pages Funnel-Tagged" count={withFunnel} total={total} icon={<Layers className="h-4 w-4 text-primary" />} />
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TOPIC CLUSTERS PANEL — Pillar/Cluster Map
// ═══════════════════════════════════════════════════════════
function TopicClustersPanel() {
  const { toast } = useToast();
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKW, setNewKW] = useState("");
  const [pillarTopic, setPillarTopic] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from("topic_clusters").select("*").order("created_at", { ascending: false });
    setClusters(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newName.trim() || !newKW.trim()) return;
    const { error } = await (supabase as any).from("topic_clusters").insert({ name: newName.trim(), primary_keyword: newKW.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewName(""); setNewKW(""); toast({ title: "Cluster created" }); load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("topic_clusters").delete().eq("id", id);
    load();
  };

  const generateMap = async () => {
    if (!pillarTopic.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-keyword-research", {
        body: { mode: "cluster_map", pillarTopic: pillarTopic.trim() },
      });
      if (error) throw error;
      setAiSuggestions(data?.clusters || data?.suggestions || []);
      toast({ title: "AI cluster map generated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5 text-primary" /> Topic Clusters</CardTitle>
          <CardDescription>Group pages into pillar/cluster structures for topical authority</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Cluster name (e.g. CAT Preparation)" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 min-w-[200px]" />
            <Input placeholder="Primary keyword" value={newKW} onChange={e => setNewKW(e.target.value)} className="flex-1 min-w-[200px]" />
            <Button onClick={create}><Sparkles className="h-4 w-4 mr-1" /> Create Cluster</Button>
          </div>
          <div className="border-t pt-4">
            <div className="flex gap-2 flex-wrap mb-3">
              <Input placeholder="Pillar topic for AI map (e.g. MBA Coaching)" value={pillarTopic} onChange={e => setPillarTopic(e.target.value)} className="flex-1 min-w-[200px]" />
              <Button variant="outline" onClick={generateMap} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
                Generate AI Cluster Map
              </Button>
            </div>
            {aiSuggestions.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {aiSuggestions.map((s, i) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="py-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{s.funnelStage || s.funnel_stage || "TOFU"}</Badge>
                        <p className="text-sm font-semibold">{s.clusterName || s.name || s.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.primaryKeyword || s.pillarKeyword}</p>
                      {Array.isArray(s.supportingKeywords) && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {s.supportingKeywords.slice(0, 6).map((k: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-[10px]">{k}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Existing Clusters ({clusters.length})</h4>
            {clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clusters yet. Create one above or generate via AI.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {clusters.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="py-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.primary_keyword}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTENT FRESHNESS PANEL
// ═══════════════════════════════════════════════════════════
function ContentFreshnessPanel({ rows, onRefresh }: { rows: DashboardRow[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const NINETY = 90 * 24 * 60 * 60 * 1000;
  const staleRows = useMemo(() => {
    return rows
      .map(r => {
        const ref = r.item.last_seo_refresh || r.item.updated_at;
        const age = ref ? Math.floor((Date.now() - new Date(ref).getTime()) / (24 * 60 * 60 * 1000)) : 999;
        return { row: r, ageDays: age };
      })
      .filter(x => x.ageDays > 90)
      .sort((a, b) => b.ageDays - a.ageDays);
  }, [rows]);

  const refreshOne = async (r: DashboardRow) => {
    setBusy(r.key);
    try {
      const { error } = await supabase.functions.invoke("auto-seo-engine", {
        body: { mode: "content_score", contentType: r.contentType, recordId: r.id },
      });
      if (error) throw error;
      toast({ title: "Refreshed", description: r.name });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" /> Content Freshness</CardTitle>
        <CardDescription>Pages not refreshed in 90+ days — refresh to maintain rankings</CardDescription>
      </CardHeader>
      <CardContent>
        {staleRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">All pages are fresh ✨</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">{staleRows.length} stale pages</p>
            {staleRows.slice(0, 50).map(({ row, ageDays }) => (
              <div key={row.key} className="flex items-center gap-3 p-2.5 border rounded">
                <Badge variant="outline" className="text-[10px]">{row.contentType}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">{ageDays} days old</p>
                </div>
                <Badge className={ageDays > 180 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                  {ageDays > 180 ? "Critical" : "Stale"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => refreshOne(row)} disabled={busy === row.key}>
                  {busy === row.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ImageAuditRow {
  contentType: string;
  id: string;
  name: string;
  slug?: string;
  path: string;
  totalImages: number;
  missingAlt: number;
  legacyFormat: number;
  healthScore: number;
}

function ImageAuditPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImageAuditRow[]>([]);
  const [scanned, setScanned] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-seo-engine", {
        body: { mode: "image_audit" },
      });
      if (error) throw error;
      setResults(((data as any)?.results || []) as ImageAuditRow[]);
      setScanned(true);
      toast({ title: "Image audit complete", description: `${(data as any)?.totalIssues || 0} pages with image issues.` });
    } catch (e: any) {
      toast({ title: "Audit failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalMissingAlt = results.reduce((s, r) => s + r.missingAlt, 0);
  const totalLegacy = results.reduce((s, r) => s + r.legacyFormat, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Image Audit</CardTitle>
            <CardDescription>Detect images missing ALT text or using legacy formats (JPG/PNG/GIF instead of WebP/AVIF)</CardDescription>
          </div>
          <Button onClick={runAudit} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
            {scanned ? "Re-run Audit" : "Run Audit"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scanned && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Pages with issues</p>
              <p className="text-2xl font-bold text-foreground">{results.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Images missing ALT</p>
              <p className="text-2xl font-bold text-amber-600">{totalMissingAlt}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Legacy format images</p>
              <p className="text-2xl font-bold text-red-600">{totalLegacy}</p>
            </CardContent></Card>
          </div>
        )}

        {!scanned && !loading && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Click "Run Audit" to scan all articles, colleges, institutes, exams, and city pages for image SEO issues.
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.slice(0, 100).map((r) => (
              <div key={`${r.contentType}-${r.id}`} className="flex items-center gap-3 p-2.5 border rounded">
                <Badge variant="outline" className="text-[10px]">{r.contentType}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.path}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="border-amber-200 text-amber-700">
                    {r.missingAlt} no ALT
                  </Badge>
                  <Badge variant="outline" className="border-red-200 text-red-700">
                    {r.legacyFormat} legacy
                  </Badge>
                  <Badge className={r.healthScore >= 70 ? "bg-emerald-100 text-emerald-700" : r.healthScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                    {r.healthScore}
                  </Badge>
                </div>
              </div>
            ))}
            {results.length > 100 && (
              <p className="text-xs text-muted-foreground text-center pt-2">Showing first 100 of {results.length}</p>
            )}
          </div>
        )}

        {scanned && results.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">All images have ALT text and modern formats ✨</p>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminSEODashboard;
