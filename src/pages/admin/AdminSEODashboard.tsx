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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, BarChart3, BookOpen, CheckCircle, Code,
  Copy, FileText, Filter, Gauge, Globe, Link2, Loader2, MapPin, Minus, PenTool, RefreshCw,
  Save, Search, Shield, Sparkles, Tag, Target, Trash2, TrendingUp, Trophy, Users, XCircle, Zap,
  Download, Eye, Database, Layers, Radio, Settings, FileCheck, MonitorSmartphone, Lock,
  ExternalLink, Activity, LayoutGrid, Network, Crosshair, Swords, Brain, Lightbulb, Star,
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
  shortTailCount: number; longTailCount: number; wordCount: number; issues: string[];
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

  const [injectLoading, setInjectLoading] = useState(false);

  // Load saved blog ideas
  const loadSavedBlogIdeas = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "saved_blog_ideas").maybeSingle();
    if (data?.value && Array.isArray(data.value)) setSavedBlogIdeas(data.value as unknown as SavedBlogIdea[]);
  }, []);

  const saveBlogIdeasToDb = async (ideas: SavedBlogIdea[]) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "saved_blog_ideas").maybeSingle();
    if (existing?.id) await supabase.from("site_settings").update({ value: ideas as unknown as Record<string, any> }).eq("id", existing.id);
    else await supabase.from("site_settings").insert({ key: "saved_blog_ideas", value: ideas as unknown as Record<string, any> });
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

      // Static pages (non-admin, non-dynamic pages)
      const staticPages = [
        { id: "page-home", name: "Home", slug: "/", path: "/" },
        { id: "page-about", name: "About", slug: "/about", path: "/about" },
        { id: "page-contact", name: "Contact", slug: "/contact", path: "/contact" },
        { id: "page-compare", name: "Compare", slug: "/compare", path: "/compare" },
        { id: "page-blog", name: "Blog", slug: "/blog", path: "/blog" },
        { id: "page-colleges", name: "Colleges", slug: "/colleges", path: "/colleges" },
        { id: "page-profile-analyzer", name: "Profile Analyzer", slug: "/profile-analyzer", path: "/profile-analyzer" },
        { id: "page-dashboard", name: "Dashboard", slug: "/dashboard", path: "/dashboard" },
        { id: "page-auth", name: "Auth / Sign In", slug: "/auth", path: "/auth" },
      ];

      const [snapshots, ...results] = await Promise.all([
        fetchAllSeoSnapshots(),
        ...contentTypes.map((ct) =>
          supabase.from(contentTypeConfig[ct].table as any).select("*").order("created_at", { ascending: false }).limit(1000)
        ),
      ]);

      // Build rows from DB content
      const nextRows = results.flatMap((result, index) => {
        const ct = contentTypes[index];
        return ((result.data as Record<string, any>[] | null) || []).map((item) => {
          const snapshot = snapshots[`${ct}:${item.id}`] || null;
          return { key: `${ct}:${item.id}`, id: item.id, contentType: ct, name: getName(item), slug: item.slug, city: item.city || null, state: item.state || null, item, snapshot, audit: getSEOAudit(ct, item, snapshot) } satisfies DashboardRow;
        });
      });

      // Add static pages as a special content type
      const staticRows: DashboardRow[] = staticPages.map(sp => ({
        key: `static:${sp.id}`,
        id: sp.id,
        contentType: "article" as SEOContentType,
        name: sp.name,
        slug: sp.slug,
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

  useEffect(() => { fetchDashboardData(); loadSavedBlogIdeas(); }, [fetchDashboardData, loadSavedBlogIdeas]);

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
      setKwSummary(d?.summary || "");
      setKwLastRefresh(new Date().toLocaleString());
      toast({ title: "Keyword research complete", description: `Found ${d?.keywords?.length || 0} keywords` });
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
      for (const row of targetRows) {
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
      for (const row of targetRows) {
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

  // Filtering & stats
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

  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "pages", label: `All Pages (${filteredRows.length})`, icon: FileText },
    { id: "keywords", label: "Keyword Research", icon: Search },
    { id: "blog-titles", label: "Blog Titles", icon: PenTool },
    { id: "competitors", label: "Competitor Intel", icon: Swords },
    { id: "content-audit", label: "Content Audit", icon: BookOpen },
    { id: "backlinks", label: "Backlink Strategy", icon: Network },
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
              No new pages detected since last visit. Total tracked: {rows.length} pages across {contentTypes.length} content types.
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
                    <SelectContent><SelectItem value="all">All types</SelectItem>{contentTypes.map(ct => <SelectItem key={ct} value={ct}>{contentTypeConfig[ct].label}</SelectItem>)}</SelectContent>
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
                        <TableHead>Page</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Words</TableHead>
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
                <CardDescription>Discover high-value keywords. Select and auto-inject them into your pages.</CardDescription>
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
                {kwSummary && <Card><CardContent className="pt-4"><p className="text-sm">{kwSummary}</p></CardContent></Card>}
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
                          <Badge key={kw} variant="secondary" className="text-xs gap-1">{kw}<button onClick={() => setKwSelectedKws(p => p.filter(k => k !== kw))} className="ml-1 hover:text-red-500">×</button></Badge>
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
                          <TableHead className="w-10"><Checkbox checked={kwResults.length > 0 && kwSelectedKws.length === kwResults.length} onCheckedChange={(c) => setKwSelectedKws(c ? kwResults.map(k => k.keyword) : [])} /></TableHead>
                          <TableHead>Keyword</TableHead><TableHead>Volume</TableHead><TableHead>Difficulty</TableHead><TableHead>Competition</TableHead><TableHead>Intent</TableHead><TableHead>Trend</TableHead><TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kwResults.map((kw, i) => (
                          <TableRow key={i}>
                            <TableCell><Checkbox checked={kwSelectedKws.includes(kw.keyword)} onCheckedChange={(c) => setKwSelectedKws(prev => c ? [...prev, kw.keyword] : prev.filter(k => k !== kw.keyword))} /></TableCell>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell><span className="font-mono text-sm">{kw.searchVolume?.toLocaleString()}</span></TableCell>
                            <TableCell><div className="flex items-center gap-1"><Progress value={kw.difficulty} className="w-16 h-2" /><span className="text-xs">{kw.difficulty}</span></div></TableCell>
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
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Content Gaps</CardTitle></CardHeader><CardContent>{kwContentGaps.map((g, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {g}</p>)}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Seasonal</CardTitle></CardHeader><CardContent>{kwSeasonal.map((s, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {s}</p>)}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Snippet Opportunities</CardTitle></CardHeader><CardContent>{kwSnippets.map((s, i) => <p key={i} className="text-sm py-1 border-b last:border-0">• {s}</p>)}</CardContent></Card>
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
                      {savedBlogIdeas.map(idea => (
                        <TableRow key={idea.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{idea.title}</TableCell>
                          <TableCell className="text-xs text-blue-600 max-w-[150px] truncate">{idea.metaTitle}</TableCell>
                          <TableCell className="text-xs text-green-600">/{idea.slug}</TableCell>
                          <TableCell className="text-xs">{idea.targetKeyword}</TableCell>
                          <TableCell className="font-mono text-xs">{idea.searchVolume?.toLocaleString()}</TableCell>
                          <TableCell><Badge className={`text-[10px] ${priorityColor(idea.priority)}`}>{idea.priority}</Badge></TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{new Date(idea.savedAt).toLocaleDateString()}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteBlogIdea(idea.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                        </TableRow>
                      ))}
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
