import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity, AlertTriangle, CheckCircle, Code, Database, Eye, FileText,
  Gauge, Globe, Layers, Lightbulb, Loader2, MonitorSmartphone, RefreshCw,
  Settings, Shield, Sparkles, Target, Zap, XCircle, ChevronDown, Wrench,
  ImageIcon, Link2, Minimize2, LayoutGrid, TrendingUp, BarChart3,
  Clock, CalendarDays, PieChart, HardDrive, FileImage, ArrowDownToLine,
} from "lucide-react";

// ─── Types ────────────────────────────────────────

interface PageSpeedPage {
  url: string; name: string; slug: string; contentType: string; device: string;
  score: number; status: "good" | "warning" | "poor";
  fcp: number; lcp: number; tbt: number; cls: number; si: number; tti: number;
  issues: string[];
  opportunities?: { title: string; description: string; savings: string }[];
  diagnostics?: { title: string; description: string }[];
  checkedAt: string;
}

interface PageSpeedPayload {
  pages: PageSpeedPage[]; avgScore: number; device: string;
  summary: { good: number; warning: number; poor: number };
  lastChecked: string; pagesAnalyzed: number;
}

interface OptimizationFix {
  table: string; id: string; name: string; field: string; fixType: string; description: string;
}

interface ImageAuditItem {
  name: string; path: string; size: number; sizeFormatted: string;
  format: string; isOptimized: boolean; issues: string[]; publicUrl: string;
}

interface OptimizationResult {
  totalScanned: number; totalFixed: number;
  fixes: OptimizationFix[]; categories: Record<string, number>;
  imageAudit?: {
    totalImages: number; totalSizeBytes: number; totalSizeFormatted: string;
    optimizedCount: number; unoptimizedCount: number;
    largeImages: ImageAuditItem[]; nonWebpImages: ImageAuditItem[]; allImages: ImageAuditItem[];
  };
  timestamp: string;
}

interface ApiUsage {
  totalCalls: number; totalPages: number;
  dailyLimit: number; monthlyQuota: number;
  todayCalls: number; todayPages: number;
  monthCalls: number; monthPages: number;
  lastRun: string;
  history: { date: string; pages: number; device: string; avgScore: number }[];
}

interface Props {
  rows: any[];
  pageSpeedData: PageSpeedPayload | null;
  setPageSpeedData: (v: any) => void;
  pageSpeedLoading: boolean;
  setPageSpeedLoading: (v: boolean) => void;
  pageSpeedDevice: "mobile" | "desktop" | "tablet";
  setPageSpeedDevice: (v: "mobile" | "desktop" | "tablet") => void;
  pageSpeedOptimizing: string | null;
  setPageSpeedOptimizing: (v: string | null) => void;
  toast: any;
}

const SITE_URL = "https://coach-compass-finder.lovable.app";

const FIX_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  "lazy-loading": { icon: <ImageIcon className="h-4 w-4" />, label: "Lazy Loading", color: "bg-blue-100 text-blue-700 border-blue-200" },
  "async-decoding": { icon: <Zap className="h-4 w-4" />, label: "Async Decode", color: "bg-purple-100 text-purple-700 border-purple-200" },
  "image-dimensions": { icon: <LayoutGrid className="h-4 w-4" />, label: "Image Dims", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  "link-security": { icon: <Link2 className="h-4 w-4" />, label: "Link Security", color: "bg-green-100 text-green-700 border-green-200" },
  "html-minification": { icon: <Minimize2 className="h-4 w-4" />, label: "HTML Cleanup", color: "bg-amber-100 text-amber-700 border-amber-200" },
  "non-webp-images": { icon: <FileImage className="h-4 w-4" />, label: "Non-WebP", color: "bg-orange-100 text-orange-700 border-orange-200" },
  "large-images": { icon: <HardDrive className="h-4 w-4" />, label: "Large Files", color: "bg-red-100 text-red-700 border-red-200" },
};

export function PageSpeedMonitor({
  rows, pageSpeedData, setPageSpeedData, pageSpeedLoading, setPageSpeedLoading,
  pageSpeedDevice, setPageSpeedDevice, pageSpeedOptimizing, setPageSpeedOptimizing, toast,
}: Props) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState("");
  const [scanResult, setScanResult] = useState<OptimizationResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<OptimizationResult | null>(null);
  const [optimizerTab, setOptimizerTab] = useState<"analysis" | "optimizer" | "images" | "usage">("analysis");
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);

  useEffect(() => {
    if (!pageSpeedData) loadCachedResults(pageSpeedDevice);
    loadCachedOptimizer();
    loadApiUsage();
  }, []);

  const loadCachedResults = async (device: string) => {
    try {
      const { data } = await supabase.from("site_settings").select("value").eq("key", `page_speed_${device}`).maybeSingle();
      if (data?.value) setPageSpeedData(data.value as unknown as PageSpeedPayload);
    } catch {}
  };

  const loadCachedOptimizer = async () => {
    try {
      const [scanRes, fixRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "speed_optimizer_last_scan").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "speed_optimizer_last_fix").maybeSingle(),
      ]);
      if (scanRes.data?.value) setScanResult(scanRes.data.value as unknown as OptimizationResult);
      if (fixRes.data?.value) setFixResult(fixRes.data.value as unknown as OptimizationResult);
    } catch {}
  };

  const loadApiUsage = async () => {
    try {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "psi_api_usage").maybeSingle();
      if (data?.value) setApiUsage(data.value as unknown as ApiUsage);
    } catch {}
  };

  const handleDeviceChange = (device: "mobile" | "desktop" | "tablet") => {
    setPageSpeedDevice(device);
    setPageSpeedData(null);
    loadCachedResults(device);
  };

  const runRealAnalysis = async () => {
    setPageSpeedLoading(true);
    setCurrentlyAnalyzing("");
    try {
      const staticPages = [
        { name: "Home", slug: "/", url: "/", contentType: "static" },
        { name: "About", slug: "/about", url: "/about", contentType: "static" },
        { name: "Contact", slug: "/contact", url: "/contact", contentType: "static" },
        { name: "Blog", slug: "/blog", url: "/blog", contentType: "static" },
        { name: "Colleges", slug: "/colleges", url: "/colleges", contentType: "static" },
      ];
      const dynamicPages = rows
        .filter(r => r.slug && !r.key.startsWith("static:"))
        .slice(0, 10)
        .map(r => ({
          name: r.name, slug: r.slug,
          url: r.slug.startsWith("/") ? r.slug : `/${r.contentType === "article" ? "article" : r.contentType === "college" ? "college" : r.contentType === "institute" ? "institute" : r.contentType === "exam" ? "exam" : "colleges"}/${r.slug}`,
          contentType: r.contentType,
        }));
      const allUrls = [...staticPages, ...dynamicPages];
      setCurrentlyAnalyzing(`Analyzing ${allUrls.length} pages on ${pageSpeedDevice}...`);

      const { data, error } = await supabase.functions.invoke("page-speed-check", {
        body: { urls: allUrls, device: pageSpeedDevice === "tablet" ? "mobile" : pageSpeedDevice, siteUrl: SITE_URL },
      });
      if (error) throw error;
      setPageSpeedData(data);
      loadApiUsage(); // Refresh usage after analysis
      toast({ title: "✅ Analysis Complete", description: `Analyzed ${data.pagesAnalyzed} pages (${pageSpeedDevice})` });
    } catch (e: any) {
      toast({ title: "Analysis Failed", description: e.message, variant: "destructive" });
    } finally {
      setPageSpeedLoading(false);
      setCurrentlyAnalyzing("");
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("speed-optimizer", { body: { mode: "scan", includeImages: true } });
      if (error) throw error;
      setScanResult(data as OptimizationResult);
      toast({ title: "🔍 Scan Complete", description: `Found ${data.fixes.length} content issues + audited ${data.imageAudit?.totalImages || 0} images` });
    } catch (e: any) {
      toast({ title: "Scan Failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const runFix = async () => {
    setFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke("speed-optimizer", { body: { mode: "fix", includeImages: true } });
      if (error) throw error;
      setFixResult(data as OptimizationResult);
      setScanResult(null);
      toast({ title: "✅ Optimizations Applied!", description: `Fixed ${data.totalFixed} issues` });
    } catch (e: any) {
      toast({ title: "Fix Failed", description: e.message, variant: "destructive" });
    } finally {
      setFixing(false);
    }
  };

  const metricColor = (val: number, good: number, ok: number) =>
    val <= good ? "text-green-600" : val <= ok ? "text-amber-600" : "text-red-600";

  const isMobile = pageSpeedDevice !== "desktop";
  const thresholds = {
    fcp: { good: isMobile ? 1.8 : 1.0, ok: isMobile ? 3.0 : 2.0 },
    lcp: { good: isMobile ? 2.5 : 2.0, ok: isMobile ? 4.0 : 3.0 },
    tbt: { good: isMobile ? 200 : 100, ok: isMobile ? 600 : 300 },
    cls: { good: 0.1, ok: 0.25 },
    si: { good: isMobile ? 3.4 : 2.5, ok: isMobile ? 5.8 : 4.0 },
    tti: { good: isMobile ? 3.8 : 3.0, ok: isMobile ? 7.3 : 5.0 },
  };

  const activeResult = scanResult || fixResult;
  const imageAudit = activeResult?.imageAudit;

  // API usage calculations
  const dailyUsed = apiUsage?.todayCalls || 0;
  const dailyLimit = apiUsage?.dailyLimit || 25000;
  const monthUsed = apiUsage?.monthCalls || 0;
  const monthLimit = apiUsage?.monthlyQuota || 25000;
  const dailyPct = Math.min(100, (dailyUsed / dailyLimit) * 100);
  const monthPct = Math.min(100, (monthUsed / monthLimit) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" /> Page Speed Monitor
                <Badge variant="outline" className="text-[10px] ml-2 border-primary/30">Google Lighthouse</Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time CWV analysis • One-Click Optimizer • Image Audit • API Usage Tracking
              </p>
              {/* Cron status */}
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-green-100 text-green-700 text-[10px] gap-1">
                  <Clock className="h-3 w-3" /> Daily 6:00 AM — Mobile Analysis
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 text-[10px] gap-1">
                  <Clock className="h-3 w-3" /> 6:10 AM — Desktop Analysis
                </Badge>
                <Badge className="bg-purple-100 text-purple-700 text-[10px] gap-1">
                  <Clock className="h-3 w-3" /> 6:20 AM — Auto-Optimize
                </Badge>
              </div>
            </div>
            <div className="flex gap-1.5 items-center flex-wrap">
              {(["analysis", "optimizer", "images", "usage"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setOptimizerTab(tab)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    optimizerTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tab === "analysis" ? "📊 Analysis" : tab === "optimizer" ? "🔧 Optimizer" : tab === "images" ? "🖼️ Images" : "📈 API Usage"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ ANALYSIS TAB ═══════════ */}
      {optimizerTab === "analysis" && (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["mobile", "tablet", "desktop"] as const).map(device => (
                    <button key={device} onClick={() => handleDeviceChange(device)}
                      className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                        pageSpeedDevice === device ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}>
                      {device === "mobile" ? "📱 Mobile" : device === "tablet" ? "📟 Tablet" : "💻 Desktop"}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={runRealAnalysis} disabled={pageSpeedLoading} className="gap-2">
                  {pageSpeedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {pageSpeedLoading ? "Analyzing..." : "Run Lighthouse Analysis"}
                </Button>
              </div>
              {pageSpeedLoading && (
                <div className="mt-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{currentlyAnalyzing}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benchmarks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Benchmarks ({pageSpeedDevice})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "FCP", ideal: `≤ ${thresholds.fcp.good}s`, warn: `≤ ${thresholds.fcp.ok}s`, icon: "⚡" },
                  { label: "LCP", ideal: `≤ ${thresholds.lcp.good}s`, warn: `≤ ${thresholds.lcp.ok}s`, icon: "🎯" },
                  { label: "TBT", ideal: `≤ ${thresholds.tbt.good}ms`, warn: `≤ ${thresholds.tbt.ok}ms`, icon: "🧱" },
                  { label: "CLS", ideal: `≤ ${thresholds.cls.good}`, warn: `≤ ${thresholds.cls.ok}`, icon: "📐" },
                  { label: "SI", ideal: `≤ ${thresholds.si.good}s`, warn: `≤ ${thresholds.si.ok}s`, icon: "📊" },
                  { label: "TTI", ideal: `≤ ${thresholds.tti.good}s`, warn: `≤ ${thresholds.tti.ok}s`, icon: "🖱️" },
                ].map(m => (
                  <div key={m.label} className="text-center p-3 rounded-xl bg-muted/50 border">
                    <span className="text-lg">{m.icon}</span>
                    <p className="text-xs font-bold mt-1">{m.label}</p>
                    <p className="text-[11px] text-green-600 font-semibold">{m.ideal}</p>
                    <p className="text-[10px] text-amber-600">{m.warn}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {pageSpeedData ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className={`border-l-4 ${pageSpeedData.avgScore >= 90 ? "border-l-green-500" : pageSpeedData.avgScore >= 50 ? "border-l-amber-500" : "border-l-red-500"}`}>
                  <CardContent className="pt-4 text-center">
                    <p className={`text-3xl font-bold ${pageSpeedData.avgScore >= 90 ? "text-green-600" : pageSpeedData.avgScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{pageSpeedData.avgScore}</p>
                    <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
                  </CardContent>
                </Card>
                {[
                  { val: pageSpeedData.summary.good, label: "Fast (90+)", color: "border-l-green-500", textColor: "text-green-600" },
                  { val: pageSpeedData.summary.warning, label: "Needs Work", color: "border-l-amber-500", textColor: "text-amber-600" },
                  { val: pageSpeedData.summary.poor, label: "Slow (<50)", color: "border-l-red-500", textColor: "text-red-600" },
                ].map(s => (
                  <Card key={s.label} className={`border-l-4 ${s.color}`}>
                    <CardContent className="pt-4 text-center">
                      <p className={`text-3xl font-bold ${s.textColor}`}>{s.val}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground">Last Checked</p>
                    <p className="text-sm font-medium mt-1">{new Date(pageSpeedData.lastChecked).toLocaleString()}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{pageSpeedData.device}</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Results Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Results ({pageSpeedData.pages.length} pages)
                    </CardTitle>
                    {pageSpeedData.pages.some(p => p.score < 90) && (
                      <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-700" onClick={() => { setOptimizerTab("optimizer"); runScan(); }}>
                        <Wrench className="h-4 w-4" /> Auto-Fix All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px] sticky left-0 bg-background z-10">Page</TableHead>
                            <TableHead className="text-center w-[70px]">Score</TableHead>
                            <TableHead className="text-center w-[70px]">FCP</TableHead>
                            <TableHead className="text-center w-[70px]">LCP</TableHead>
                            <TableHead className="text-center w-[80px]">TBT</TableHead>
                            <TableHead className="text-center w-[70px]">CLS</TableHead>
                            <TableHead className="text-center w-[70px]">SI</TableHead>
                            <TableHead className="text-center w-[70px]">TTI</TableHead>
                            <TableHead className="w-[180px]">Issues</TableHead>
                            <TableHead className="text-center w-[50px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...pageSpeedData.pages].sort((a, b) => a.score - b.score).map((page, idx) => (
                            <>
                              <TableRow key={`r-${idx}`} className={`cursor-pointer hover:bg-muted/50 ${page.status === "poor" ? "bg-red-50/30" : ""}`}
                                onClick={() => setExpandedPage(expandedPage === page.slug ? null : page.slug)}>
                                <TableCell className="sticky left-0 bg-background z-10">
                                  <p className="text-sm font-medium truncate max-w-[170px]">{page.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">{page.slug}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={`text-xs font-bold ${page.score >= 90 ? "bg-green-100 text-green-700" : page.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"} hover:bg-inherit`}>{page.score}</Badge>
                                </TableCell>
                                {([
                                  { v: page.fcp, u: "s", ...thresholds.fcp },
                                  { v: page.lcp, u: "s", ...thresholds.lcp },
                                  { v: page.tbt, u: "ms", ...thresholds.tbt },
                                  { v: page.cls, u: "", ...thresholds.cls },
                                  { v: page.si, u: "s", ...thresholds.si },
                                  { v: page.tti, u: "s", ...thresholds.tti },
                                ] as const).map((m, mi) => (
                                  <TableCell key={mi} className={`text-center text-xs font-mono font-medium ${metricColor(m.v, m.good, m.ok)}`}>{m.v}{m.u}</TableCell>
                                ))}
                                <TableCell>
                                  <div className="space-y-0.5 max-w-[180px]">
                                    {page.issues.slice(0, 2).map((issue, i) => (
                                      <p key={i} className={`text-[10px] leading-tight ${issue.includes("✓") ? "text-green-600" : "text-red-600"}`}>
                                        {issue.includes("✓") ? "✅" : "⚠️"} {issue}
                                      </p>
                                    ))}
                                    {page.issues.length > 2 && <p className="text-[10px] text-muted-foreground">+{page.issues.length - 2} more</p>}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <ChevronDown className={`h-4 w-4 mx-auto transition-transform ${expandedPage === page.slug ? "rotate-180" : ""}`} />
                                </TableCell>
                              </TableRow>

                              {expandedPage === page.slug && (
                                <TableRow key={`d-${idx}`}>
                                  <TableCell colSpan={10} className="bg-muted/20 p-0">
                                    <div className="p-4 space-y-4">
                                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                        {[
                                          { label: "FCP", val: `${page.fcp}s`, ...thresholds.fcp },
                                          { label: "LCP", val: `${page.lcp}s`, ...thresholds.lcp },
                                          { label: "TBT", val: `${page.tbt}ms`, good: thresholds.tbt.good, ok: thresholds.tbt.ok },
                                          { label: "CLS", val: `${page.cls}`, ...thresholds.cls },
                                          { label: "SI", val: `${page.si}s`, ...thresholds.si },
                                          { label: "TTI", val: `${page.tti}s`, ...thresholds.tti },
                                        ].map(m => {
                                          const n = parseFloat(m.val);
                                          return (
                                            <div key={m.label} className={`p-3 rounded-lg text-center border ${n <= m.good ? "bg-green-50 border-green-200" : n <= m.ok ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                                              <p className="text-[10px] font-bold text-muted-foreground">{m.label}</p>
                                              <p className={`text-lg font-bold ${n <= m.good ? "text-green-700" : n <= m.ok ? "text-amber-700" : "text-red-700"}`}>{m.val}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {page.score < 90 && (
                                        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                                          <Wrench className="h-5 w-5 text-primary shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-sm font-semibold">Auto-Fix Available</p>
                                            <p className="text-xs text-muted-foreground">Optimize content: lazy loading, async decode, link security, HTML cleanup</p>
                                          </div>
                                          <Button size="sm" onClick={(e) => { e.stopPropagation(); setOptimizerTab("optimizer"); runScan(); }} className="gap-1.5 shrink-0">
                                            <Sparkles className="h-3.5 w-3.5" /> Fix Now
                                          </Button>
                                        </div>
                                      )}
                                      {page.opportunities && page.opportunities.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-bold flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Opportunities ({page.opportunities.length})</h4>
                                          <div className="space-y-1.5">
                                            {page.opportunities.map((opp, i) => (
                                              <div key={i} className="flex items-start gap-3 p-2.5 rounded border-l-4 border-l-amber-400 bg-amber-50/50">
                                                <Zap className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium">{opp.title}</p>
                                                  {opp.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{opp.description}</p>}
                                                </div>
                                                {opp.savings && <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700">{opp.savings}</Badge>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {page.diagnostics && page.diagnostics.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-bold flex items-center gap-2 mb-2"><Settings className="h-4 w-4 text-blue-500" /> Diagnostics</h4>
                                          <div className="grid md:grid-cols-2 gap-1.5">
                                            {page.diagnostics.map((d, i) => (
                                              <div key={i} className="flex items-center gap-2 p-2 rounded bg-blue-50/50 border-l-4 border-l-blue-400">
                                                <AlertTriangle className="h-3 w-3 text-blue-500 shrink-0" />
                                                <span className="text-xs">{d.title}</span>
                                                {d.description && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{d.description}</span>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Global Opps */}
              {(() => {
                const allOpps = pageSpeedData.pages.flatMap(p => p.opportunities || []);
                const oppCounts = allOpps.reduce<Record<string, number>>((acc, o) => { acc[o.title] = (acc[o.title] || 0) + 1; return acc; }, {});
                const topOpps = Object.entries(oppCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
                return topOpps.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Top Optimization Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topOpps.map(([title, count]) => (
                        <div key={title} className="flex items-center gap-3 p-2.5 rounded border-l-4 border-l-amber-400 bg-amber-50/30">
                          <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-sm flex-1">{title}</span>
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">{count} pages</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null;
              })()}
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Gauge className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Speed Data Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Click "Run Lighthouse Analysis" to start.</p>
                <Button onClick={runRealAnalysis} disabled={pageSpeedLoading}><Gauge className="h-4 w-4 mr-2" /> Run First Analysis</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════ OPTIMIZER TAB ═══════════ */}
      {optimizerTab === "optimizer" && (
        <>
          <Card className="border-primary/20 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> One-Click Speed Optimizer</h3>
                  <p className="text-sm text-muted-foreground mt-1">Auto-fix performance issues in database content + audit storage images</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={runScan} disabled={scanning || fixing} className="gap-2">
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    {scanning ? "Scanning..." : "Scan for Issues"}
                  </Button>
                  <Button size="sm" onClick={runFix} disabled={fixing || scanning || (!scanResult || scanResult.fixes.length === 0)} className="gap-2 bg-green-600 hover:bg-green-700">
                    {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {fixing ? "Applying..." : `Fix All${scanResult ? ` (${scanResult.fixes.length})` : ""}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(FIX_TYPE_CONFIG).map(([key, config]) => {
              const count = activeResult?.categories[key] || 0;
              return (
                <Card key={key} className={`text-center ${count > 0 ? "border-primary/30" : ""}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${config.color} mb-2`}>{config.icon}</div>
                    <p className="text-[11px] font-semibold">{config.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>{count}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {fixResult && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" /> Last Fix — {fixResult.totalFixed} applied
                </CardTitle>
                <CardDescription>{new Date(fixResult.timestamp).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-2">
                  {fixResult.fixes.slice(0, 20).map((fix, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-white border text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium">{fix.name}</span>
                        <span className="text-muted-foreground"> ({fix.table})</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{fix.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {scanResult && scanResult.fixes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> {scanResult.fixes.length} Issues Found
                  </CardTitle>
                  <Button size="sm" onClick={runFix} disabled={fixing} className="gap-2 bg-green-600 hover:bg-green-700">
                    {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Fix All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Fix Type</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanResult.fixes.slice(0, 50).map((fix, i) => {
                        const cfg = FIX_TYPE_CONFIG[fix.fixType] || FIX_TYPE_CONFIG["html-minification"];
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm max-w-[200px] truncate">{fix.name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{fix.table}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fix.field}</TableCell>
                            <TableCell><Badge className={`text-[10px] ${cfg.color} border`}>{cfg.label}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{fix.description}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {scanResult && scanResult.fixes.length === 0 && (
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700">All Content Optimized! ✨</h3>
                <p className="text-sm text-muted-foreground mt-2">No performance issues found in database content.</p>
              </CardContent>
            </Card>
          )}

          {!scanResult && !fixResult && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Auto-Optimizer Ready</h3>
                <div className="flex flex-wrap gap-2 justify-center mt-3 mb-4">
                  {Object.entries(FIX_TYPE_CONFIG).map(([key, cfg]) => (
                    <Badge key={key} variant="outline" className="gap-1.5">{cfg.icon} {cfg.label}</Badge>
                  ))}
                </div>
                <Button onClick={runScan} disabled={scanning} className="gap-2"><Eye className="h-4 w-4" /> Scan Now</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════ IMAGES TAB ═══════════ */}
      {optimizerTab === "images" && (
        <>
          <Card className="border-primary/20 bg-gradient-to-br from-orange-50/50 to-pink-50/50 dark:from-orange-950/20 dark:to-pink-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><FileImage className="h-5 w-5 text-orange-500" /> Storage Image Audit</h3>
                  <p className="text-sm text-muted-foreground mt-1">Audit uploaded images for format, size, and optimization opportunities</p>
                </div>
                <Button size="sm" onClick={runScan} disabled={scanning} className="gap-2">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {scanning ? "Auditing..." : "Audit Images"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {imageAudit ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{imageAudit.totalImages}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Images</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xl font-bold text-purple-600">{imageAudit.totalSizeFormatted}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Size</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{imageAudit.optimizedCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Optimized</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{imageAudit.nonWebpImages.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Non-WebP</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{imageAudit.largeImages.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Large Files (&gt;200KB)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Image List */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">All Images ({imageAudit.allImages.length})</CardTitle>
                  <CardDescription>Sorted by file size — largest first</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead className="text-center">Format</TableHead>
                          <TableHead className="text-center">Size</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Issues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {imageAudit.allImages.slice(0, 50).map((img, i) => (
                          <TableRow key={i} className={img.isOptimized ? "" : "bg-amber-50/30"}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded border bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                                  {img.format !== "svg" ? (
                                    <img src={img.publicUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <FileImage className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate max-w-[200px]">{img.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{img.path}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`text-[10px] ${
                                ["webp", "avif"].includes(img.format) ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"
                              }`}>{img.format.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className={`text-center text-xs font-mono font-medium ${
                              img.size > 500000 ? "text-red-600" : img.size > 200000 ? "text-amber-600" : "text-green-600"
                            }`}>{img.sizeFormatted}</TableCell>
                            <TableCell className="text-center">
                              {img.isOptimized ? (
                                <Badge className="bg-green-100 text-green-700 text-[10px]">✓ OK</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 text-[10px]">⚠ Fix</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {img.issues.map((issue, j) => (
                                  <p key={j} className="text-[10px] text-amber-700">{issue}</p>
                                ))}
                                {img.isOptimized && <p className="text-[10px] text-green-600">All good ✓</p>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Image Optimization Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {imageAudit.nonWebpImages.length > 0 && (
                    <RecRow icon={<FileImage className="h-4 w-4" />} text={`${imageAudit.nonWebpImages.length} images are not in WebP/AVIF format — convert for 30-50% size savings`} severity="high" />
                  )}
                  {imageAudit.largeImages.length > 0 && (
                    <RecRow icon={<ArrowDownToLine className="h-4 w-4" />} text={`${imageAudit.largeImages.length} images exceed 200KB — compress before uploading`} severity="high" />
                  )}
                  <RecRow icon={<ImageIcon className="h-4 w-4" />} text="Use squoosh.app or tinypng.com to compress images before upload" severity="medium" />
                  <RecRow icon={<Globe className="h-4 w-4" />} text="WebP format provides 25-35% better compression than JPEG at equivalent quality" severity="low" />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileImage className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Image Audit Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Click "Audit Images" to scan your storage bucket for optimization opportunities.</p>
                <Button onClick={runScan} disabled={scanning}><FileImage className="h-4 w-4 mr-2" /> Audit Now</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════ API USAGE TAB ═══════════ */}
      {optimizerTab === "usage" && (
        <>
          <Card className="border-primary/20 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><PieChart className="h-5 w-5 text-indigo-500" /> Google PSI API Usage</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track your PageSpeed Insights API quota consumption — daily &amp; monthly
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={loadApiUsage} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {apiUsage ? (
            <>
              {/* Quota Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Daily */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-500" /> Today's Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold text-blue-600">{dailyUsed}</p>
                        <p className="text-xs text-muted-foreground">API calls today</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{apiUsage.todayPages || 0} pages</p>
                        <p className="text-xs text-muted-foreground">analyzed</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Usage</span>
                        <span className="font-medium">{dailyUsed} / {dailyLimit.toLocaleString()}</span>
                      </div>
                      <Progress value={dailyPct} className="h-2" />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {(dailyLimit - dailyUsed).toLocaleString()} calls remaining today
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-500" /> Monthly Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold text-purple-600">{monthUsed}</p>
                        <p className="text-xs text-muted-foreground">API calls this month</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{apiUsage.monthPages || 0} pages</p>
                        <p className="text-xs text-muted-foreground">analyzed</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Quota</span>
                        <span className="font-medium">{monthUsed} / {monthLimit.toLocaleString()}</span>
                      </div>
                      <Progress value={monthPct} className="h-2" />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {(monthLimit - monthUsed).toLocaleString()} calls remaining this month
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lifetime Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-primary">{apiUsage.totalCalls}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total API Calls (Lifetime)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-primary">{apiUsage.totalPages}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Pages Analyzed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm font-medium">{apiUsage.lastRun ? new Date(apiUsage.lastRun).toLocaleString() : "Never"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last API Call</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className={`text-2xl font-bold ${dailyPct < 50 ? "text-green-600" : dailyPct < 80 ? "text-amber-600" : "text-red-600"}`}>
                      {dailyPct < 50 ? "🟢" : dailyPct < 80 ? "🟡" : "🔴"} {(100 - dailyPct).toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Quota Health</p>
                  </CardContent>
                </Card>
              </div>

              {/* History */}
              {apiUsage.history && apiUsage.history.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Analysis History</CardTitle>
                    <CardDescription>Last {apiUsage.history.length} analysis runs</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="text-center">Device</TableHead>
                            <TableHead className="text-center">Pages</TableHead>
                            <TableHead className="text-center">Avg Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...apiUsage.history].reverse().map((entry, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{new Date(entry.date).toLocaleString()}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-[10px]">
                                  {entry.device === "mobile" ? "📱" : "💻"} {entry.device}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm font-medium">{entry.pages}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={`text-xs font-bold ${
                                  entry.avgScore >= 90 ? "bg-green-100 text-green-700" :
                                  entry.avgScore >= 50 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                } hover:bg-inherit`}>{entry.avgScore}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quota Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" /> Google PSI API Quota Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <RecRow icon={<Globe className="h-4 w-4" />} text="Free tier: 25,000 queries per day (with API key)" severity="low" />
                  <RecRow icon={<Clock className="h-4 w-4" />} text="Without API key: ~5 queries/minute, heavily rate-limited" severity="medium" />
                  <RecRow icon={<TrendingUp className="h-4 w-4" />} text="Daily cron uses ~10-30 calls per run (5 static + dynamic pages × 2 devices)" severity="low" />
                  <RecRow icon={<CalendarDays className="h-4 w-4" />} text="Monthly estimated: ~600-900 API calls with daily automated checks" severity="low" />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <PieChart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Usage Data Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Run a PageSpeed analysis first. Usage tracking starts automatically.
                </p>
                <Button onClick={() => { setOptimizerTab("analysis"); }} variant="outline" className="gap-2">
                  <Gauge className="h-4 w-4" /> Go to Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RecRow({ icon, text, severity }: { icon: React.ReactNode; text: string; severity: "high" | "medium" | "low" }) {
  const colors = severity === "high" ? "border-l-red-500 bg-red-50/50" : severity === "medium" ? "border-l-amber-500 bg-amber-50/50" : "border-l-blue-500 bg-blue-50/50";
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded border-l-4 ${colors}`}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <p className="text-sm flex-1">{text}</p>
      <Badge className={`text-[10px] ${severity === "high" ? "bg-red-100 text-red-700" : severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{severity}</Badge>
    </div>
  );
}
