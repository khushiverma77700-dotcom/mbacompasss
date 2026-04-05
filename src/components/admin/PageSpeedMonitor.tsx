import { useEffect, useCallback, useState } from "react";
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
  ImageIcon, Link2, FileCode, Minimize2, LayoutGrid, TrendingUp, BarChart3,
} from "lucide-react";

interface PageSpeedPage {
  url: string;
  name: string;
  slug: string;
  contentType: string;
  device: string;
  score: number;
  status: "good" | "warning" | "poor";
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  si: number;
  tti: number;
  issues: string[];
  opportunities?: { title: string; description: string; savings: string }[];
  diagnostics?: { title: string; description: string }[];
  checkedAt: string;
}

interface PageSpeedPayload {
  pages: PageSpeedPage[];
  avgScore: number;
  device: string;
  summary: { good: number; warning: number; poor: number };
  lastChecked: string;
  pagesAnalyzed: number;
}

interface OptimizationFix {
  table: string;
  id: string;
  name: string;
  field: string;
  fixType: string;
  description: string;
}

interface OptimizationResult {
  totalScanned: number;
  totalFixed: number;
  fixes: OptimizationFix[];
  categories: Record<string, number>;
  timestamp: string;
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
  "image-dimensions": { icon: <LayoutGrid className="h-4 w-4" />, label: "Image Dimensions", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  "link-security": { icon: <Link2 className="h-4 w-4" />, label: "Link Security", color: "bg-green-100 text-green-700 border-green-200" },
  "html-minification": { icon: <Minimize2 className="h-4 w-4" />, label: "HTML Cleanup", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export function PageSpeedMonitor({
  rows, pageSpeedData, setPageSpeedData, pageSpeedLoading, setPageSpeedLoading,
  pageSpeedDevice, setPageSpeedDevice, pageSpeedOptimizing, setPageSpeedOptimizing, toast,
}: Props) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState("");

  // Optimizer state
  const [scanResult, setScanResult] = useState<OptimizationResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<OptimizationResult | null>(null);
  const [optimizerTab, setOptimizerTab] = useState<"analysis" | "optimizer">("analysis");

  useEffect(() => {
    if (!pageSpeedData) {
      loadCachedResults(pageSpeedDevice);
    }
    loadCachedOptimizer();
  }, []);

  const loadCachedResults = async (device: string) => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", `page_speed_${device}`)
        .maybeSingle();
      if (data?.value) {
        setPageSpeedData(data.value as unknown as PageSpeedPayload);
      }
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

  const handleDeviceChange = (device: "mobile" | "desktop" | "tablet") => {
    setPageSpeedDevice(device);
    setPageSpeedData(null);
    loadCachedResults(device);
  };

  const runRealAnalysis = async () => {
    setPageSpeedLoading(true);
    setProgress(0);
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
          name: r.name,
          slug: r.slug,
          url: r.slug.startsWith("/") ? r.slug : `/${r.contentType === "article" ? "article" : r.contentType === "college" ? "college" : r.contentType === "institute" ? "institute" : r.contentType === "exam" ? "exam" : "colleges"}/${r.slug}`,
          contentType: r.contentType,
        }));

      const allUrls = [...staticPages, ...dynamicPages];
      setCurrentlyAnalyzing(`Analyzing ${allUrls.length} pages on ${pageSpeedDevice}...`);

      const { data, error } = await supabase.functions.invoke("page-speed-check", {
        body: {
          urls: allUrls,
          device: pageSpeedDevice === "tablet" ? "mobile" : pageSpeedDevice,
          siteUrl: SITE_URL,
        },
      });

      if (error) throw error;
      setPageSpeedData(data);
      setProgress(100);
      toast({ title: "✅ Real Analysis Complete", description: `Analyzed ${data.pagesAnalyzed} pages via Google PageSpeed Insights (${pageSpeedDevice})` });
    } catch (e: any) {
      console.error("Page speed analysis error:", e);
      toast({ title: "Analysis Failed", description: e.message || "Could not reach PageSpeed API", variant: "destructive" });
    } finally {
      setPageSpeedLoading(false);
      setCurrentlyAnalyzing("");
    }
  };

  // ─── Optimizer Functions ─────────────────────────
  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("speed-optimizer", {
        body: { mode: "scan" },
      });
      if (error) throw error;
      setScanResult(data as OptimizationResult);
      toast({ title: "🔍 Scan Complete", description: `Found ${data.fixes.length} optimization opportunities across ${data.totalScanned} records` });
    } catch (e: any) {
      toast({ title: "Scan Failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const runFix = async () => {
    setFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke("speed-optimizer", {
        body: { mode: "fix" },
      });
      if (error) throw error;
      setFixResult(data as OptimizationResult);
      setScanResult(null); // Clear scan since fixes are applied
      toast({ title: "✅ All Optimizations Applied!", description: `Fixed ${data.totalFixed} issues across your database content` });
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
                Real-time Core Web Vitals analysis + One-Click Auto-Optimization
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {/* Tab toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setOptimizerTab("analysis")}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    optimizerTab === "analysis" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  📊 Analysis
                </button>
                <button
                  onClick={() => setOptimizerTab("optimizer")}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    optimizerTab === "optimizer" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  🔧 Auto-Optimizer
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════ ANALYSIS TAB ═══════════════════ */}
      {optimizerTab === "analysis" && (
        <>
          {/* Device Selector + Run */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["mobile", "tablet", "desktop"] as const).map(device => (
                    <button
                      key={device}
                      onClick={() => handleDeviceChange(device)}
                      className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                        pageSpeedDevice === device
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
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
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">{currentlyAnalyzing}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    ⏱️ This may take 1-3 minutes — each page is analyzed by Google's Lighthouse engine
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benchmark Targets */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Performance Benchmarks ({pageSpeedDevice === "mobile" ? "📱 Mobile" : pageSpeedDevice === "tablet" ? "📟 Tablet" : "💻 Desktop"})
              </CardTitle>
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
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className={`border-l-4 ${pageSpeedData.avgScore >= 90 ? "border-l-green-500" : pageSpeedData.avgScore >= 50 ? "border-l-amber-500" : "border-l-red-500"}`}>
                  <CardContent className="pt-4 text-center">
                    <p className={`text-3xl font-bold ${pageSpeedData.avgScore >= 90 ? "text-green-600" : pageSpeedData.avgScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {pageSpeedData.avgScore}
                    </p>
                    <span className="text-[10px] text-muted-foreground">/100</span>
                    <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{pageSpeedData.summary.good}</p>
                    <p className="text-xs text-muted-foreground mt-1">Fast (90+)</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{pageSpeedData.summary.warning}</p>
                    <p className="text-xs text-muted-foreground mt-1">Needs Work (50-89)</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{pageSpeedData.summary.poor}</p>
                    <p className="text-xs text-muted-foreground mt-1">Slow (&lt;50)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground">Last Checked</p>
                    <p className="text-sm font-medium mt-1">{new Date(pageSpeedData.lastChecked).toLocaleString()}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{pageSpeedData.device}</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Page Results Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Page-by-Page Results ({pageSpeedData.pages.length} pages)
                      </CardTitle>
                      <CardDescription>Real Lighthouse scores — click a row to expand details and fix</CardDescription>
                    </div>
                    {/* Bulk optimize button */}
                    {pageSpeedData.pages.some(p => p.score < 90) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => { setOptimizerTab("optimizer"); runScan(); }}
                      >
                        <Wrench className="h-4 w-4" />
                        Auto-Fix All Issues
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
                            <TableHead className="text-center w-[60px]">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...pageSpeedData.pages]
                            .sort((a, b) => a.score - b.score)
                            .map((page, idx) => (
                              <>
                                <TableRow
                                  key={`row-${idx}`}
                                  className={`cursor-pointer hover:bg-muted/50 ${page.status === "poor" ? "bg-red-50/30" : ""}`}
                                  onClick={() => setExpandedPage(expandedPage === page.slug ? null : page.slug)}
                                >
                                  <TableCell className="sticky left-0 bg-background z-10">
                                    <div>
                                      <p className="text-sm font-medium truncate max-w-[170px]">{page.name}</p>
                                      <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">{page.slug}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={`text-xs font-bold ${
                                      page.score >= 90 ? "bg-green-100 text-green-700 hover:bg-green-100" :
                                      page.score >= 50 ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                                      "bg-red-100 text-red-700 hover:bg-red-100"
                                    }`}>{page.score}</Badge>
                                  </TableCell>
                                  <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.fcp, thresholds.fcp.good, thresholds.fcp.ok)}`}>{page.fcp}s</TableCell>
                                  <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.lcp, thresholds.lcp.good, thresholds.lcp.ok)}`}>{page.lcp}s</TableCell>
                                  <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.tbt, thresholds.tbt.good, thresholds.tbt.ok)}`}>{page.tbt}ms</TableCell>
                                  <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.cls, thresholds.cls.good, thresholds.cls.ok)}`}>{page.cls}</TableCell>
                                  <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.si, thresholds.si.good, thresholds.si.ok)}`}>{page.si}s</TableCell>
                                  <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.tti, thresholds.tti.good, thresholds.tti.ok)}`}>{page.tti}s</TableCell>
                                  <TableCell>
                                    <div className="space-y-0.5 max-w-[180px]">
                                      {page.issues.slice(0, 3).map((issue, i) => (
                                        <p key={i} className={`text-[10px] leading-tight ${issue.includes("✓") ? "text-green-600" : "text-red-600"}`}>
                                          {issue.includes("✓") ? "✅" : "⚠️"} {issue}
                                        </p>
                                      ))}
                                      {page.issues.length > 3 && <p className="text-[10px] text-muted-foreground">+{page.issues.length - 3} more</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <ChevronDown className={`h-4 w-4 mx-auto transition-transform ${expandedPage === page.slug ? "rotate-180" : ""}`} />
                                  </TableCell>
                                </TableRow>

                                {expandedPage === page.slug && (
                                  <TableRow key={`detail-${idx}`}>
                                    <TableCell colSpan={10} className="bg-muted/20 p-0">
                                      <div className="p-4 space-y-4">
                                        {/* CWV Visual */}
                                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                          {[
                                            { label: "FCP", val: `${page.fcp}s`, ...thresholds.fcp },
                                            { label: "LCP", val: `${page.lcp}s`, good: thresholds.lcp.good, ok: thresholds.lcp.ok },
                                            { label: "TBT", val: `${page.tbt}ms`, good: thresholds.tbt.good, ok: thresholds.tbt.ok },
                                            { label: "CLS", val: `${page.cls}`, good: thresholds.cls.good, ok: thresholds.cls.ok },
                                            { label: "SI", val: `${page.si}s`, good: thresholds.si.good, ok: thresholds.si.ok },
                                            { label: "TTI", val: `${page.tti}s`, good: thresholds.tti.good, ok: thresholds.tti.ok },
                                          ].map(m => {
                                            const numVal = parseFloat(m.val);
                                            return (
                                              <div key={m.label} className={`p-3 rounded-lg text-center border ${
                                                numVal <= m.good ? "bg-green-50 border-green-200" :
                                                numVal <= m.ok ? "bg-amber-50 border-amber-200" :
                                                "bg-red-50 border-red-200"
                                              }`}>
                                                <p className="text-[10px] font-bold text-muted-foreground">{m.label}</p>
                                                <p className={`text-lg font-bold ${
                                                  numVal <= m.good ? "text-green-700" : numVal <= m.ok ? "text-amber-700" : "text-red-700"
                                                }`}>{m.val}</p>
                                                <p className="text-[9px] text-muted-foreground">
                                                  Target: ≤{m.good}{m.label === "TBT" ? "ms" : m.label === "CLS" ? "" : "s"}
                                                </p>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Quick Fix for this page */}
                                        {page.score < 90 && (
                                          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                                            <Wrench className="h-5 w-5 text-primary shrink-0" />
                                            <div className="flex-1">
                                              <p className="text-sm font-semibold">Auto-Fix Available</p>
                                              <p className="text-xs text-muted-foreground">
                                                Optimize database content for this page: add lazy loading, async decoding, fix external links, and minify HTML
                                              </p>
                                            </div>
                                            <Button
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOptimizerTab("optimizer");
                                                runScan();
                                              }}
                                              className="gap-1.5 shrink-0"
                                            >
                                              <Sparkles className="h-3.5 w-3.5" />
                                              Fix Now
                                            </Button>
                                          </div>
                                        )}

                                        {/* Opportunities */}
                                        {page.opportunities && page.opportunities.length > 0 && (
                                          <div>
                                            <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                                              <Lightbulb className="h-4 w-4 text-amber-500" /> Opportunities ({page.opportunities.length})
                                            </h4>
                                            <div className="space-y-1.5">
                                              {page.opportunities.map((opp, i) => (
                                                <div key={i} className="flex items-start gap-3 p-2.5 rounded border-l-4 border-l-amber-400 bg-amber-50/50">
                                                  <Zap className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">{opp.title}</p>
                                                    {opp.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{opp.description}</p>}
                                                  </div>
                                                  {opp.savings && (
                                                    <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700">{opp.savings}</Badge>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Diagnostics */}
                                        {page.diagnostics && page.diagnostics.length > 0 && (
                                          <div>
                                            <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                                              <Settings className="h-4 w-4 text-blue-500" /> Diagnostics ({page.diagnostics.length})
                                            </h4>
                                            <div className="grid md:grid-cols-2 gap-1.5">
                                              {page.diagnostics.map((diag, i) => (
                                                <div key={i} className="flex items-center gap-2 p-2 rounded bg-blue-50/50 border-l-4 border-l-blue-400">
                                                  <AlertTriangle className="h-3 w-3 text-blue-500 shrink-0" />
                                                  <span className="text-xs">{diag.title}</span>
                                                  {diag.description && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{diag.description}</span>}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <p className="text-[10px] text-muted-foreground">
                                          Analyzed URL: <a href={page.url} target="_blank" rel="noopener" className="underline">{page.url}</a>
                                          {" • "}Checked: {new Date(page.checkedAt).toLocaleString()}
                                        </p>
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

              {/* Global Opportunities Summary */}
              {(() => {
                const allOpps = pageSpeedData.pages.flatMap(p => p.opportunities || []);
                const oppCounts = allOpps.reduce<Record<string, number>>((acc, o) => {
                  acc[o.title] = (acc[o.title] || 0) + 1;
                  return acc;
                }, {});
                const topOpps = Object.entries(oppCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
                return topOpps.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" /> Most Common Optimization Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topOpps.map(([title, count]) => (
                        <div key={title} className="flex items-center gap-3 p-2.5 rounded border-l-4 border-l-amber-400 bg-amber-50/30">
                          <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-sm flex-1">{title}</span>
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">{count} page{count > 1 ? "s" : ""}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Recommendations */}
              <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Quick Wins</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pageSpeedData.pages.some(p => p.lcp > thresholds.lcp.good) && (
                      <RecRow icon={<Eye className="h-4 w-4" />} text={`${pageSpeedData.pages.filter(p => p.lcp > thresholds.lcp.good).length} pages have slow LCP — optimize hero images and fonts`} severity="high" />
                    )}
                    {pageSpeedData.pages.some(p => p.cls > thresholds.cls.good) && (
                      <RecRow icon={<Layers className="h-4 w-4" />} text={`${pageSpeedData.pages.filter(p => p.cls > thresholds.cls.good).length} pages have CLS issues — add width/height to images`} severity="high" />
                    )}
                    {pageSpeedData.pages.some(p => p.tbt > thresholds.tbt.good) && (
                      <RecRow icon={<Code className="h-4 w-4" />} text={`${pageSpeedData.pages.filter(p => p.tbt > thresholds.tbt.good).length} pages have high TBT — reduce JavaScript execution`} severity="high" />
                    )}
                    {pageSpeedData.avgScore >= 90 && (
                      <RecRow icon={<CheckCircle className="h-4 w-4" />} text="All pages performing well! Monitor weekly." severity="low" />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-blue-500" /> Technical Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <RecRow icon={<Globe className="h-4 w-4" />} text="Use CDN for static assets (images, fonts, CSS)" severity="medium" />
                    <RecRow icon={<Eye className="h-4 w-4" />} text="Convert images to WebP/AVIF for 30-50% size reduction" severity="medium" />
                    <RecRow icon={<Database className="h-4 w-4" />} text="Set Cache-Control: max-age=31536000 for static files" severity="low" />
                    <RecRow icon={<MonitorSmartphone className="h-4 w-4" />} text="Consider SSR/pre-rendering for critical pages" severity="low" />
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Gauge className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Speed Data Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Run Lighthouse Analysis" to check page speed using Google's PageSpeed Insights API.
                </p>
                <Button onClick={runRealAnalysis} disabled={pageSpeedLoading}>
                  <Gauge className="h-4 w-4 mr-2" /> Run First Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════ OPTIMIZER TAB ═══════════════════ */}
      {optimizerTab === "optimizer" && (
        <>
          {/* Optimizer Header */}
          <Card className="border-primary/20 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    One-Click Speed Optimizer
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scans your database content and auto-fixes performance issues in images, links, and HTML
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={runScan} disabled={scanning || fixing} className="gap-2">
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    {scanning ? "Scanning..." : "Scan for Issues"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={runFix}
                    disabled={fixing || scanning || (!scanResult || scanResult.fixes.length === 0)}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {fixing ? "Applying Fixes..." : `Fix All Issues${scanResult ? ` (${scanResult.fixes.length})` : ""}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What gets optimized */}
          <div className="grid md:grid-cols-5 gap-3">
            {Object.entries(FIX_TYPE_CONFIG).map(([key, config]) => {
              const count = activeResult?.categories[key] || 0;
              return (
                <Card key={key} className={`text-center ${count > 0 ? "border-primary/30" : ""}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${config.color} mb-2`}>
                      {config.icon}
                    </div>
                    <p className="text-xs font-semibold">{config.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">issues</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Last Fix Result */}
          {fixResult && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Last Optimization Applied — {fixResult.totalFixed} fixes
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
                        <span className="text-muted-foreground"> ({fix.table}.{fix.field})</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{fix.description}</p>
                      </div>
                    </div>
                  ))}
                  {fixResult.fixes.length > 20 && (
                    <p className="text-xs text-muted-foreground col-span-2 text-center pt-2">
                      +{fixResult.fixes.length - 20} more fixes applied
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan Results */}
          {scanResult && scanResult.fixes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Found {scanResult.fixes.length} Issues in {scanResult.totalScanned} Records
                    </CardTitle>
                    <CardDescription>Click "Fix All Issues" to auto-apply all optimizations</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={runFix}
                    disabled={fixing}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Fix All ({scanResult.fixes.length})
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
                            <TableCell>
                              <Badge className={`text-[10px] ${cfg.color} border`}>
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{fix.description}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {scanResult.fixes.length > 50 && (
                    <p className="text-xs text-center text-muted-foreground py-3">
                      Showing 50 of {scanResult.fixes.length} issues
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {scanResult && scanResult.fixes.length === 0 && (
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700">All Content Optimized! ✨</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  No performance issues found in your database content. All images have lazy loading,
                  async decoding, dimensions, and all external links are secured.
                </p>
              </CardContent>
            </Card>
          )}

          {!scanResult && !fixResult && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Auto-Optimizer Ready</h3>
                <p className="text-sm text-muted-foreground mb-1">This tool scans all your database content and fixes:</p>
                <div className="flex flex-wrap gap-2 justify-center mt-3 mb-4">
                  {Object.entries(FIX_TYPE_CONFIG).map(([key, cfg]) => (
                    <Badge key={key} variant="outline" className="gap-1.5">
                      {cfg.icon} {cfg.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Tables scanned: articles, colleges, institutes, city_pages, college_sections
                </p>
                <Button onClick={runScan} disabled={scanning} className="gap-2">
                  <Eye className="h-4 w-4" /> Scan Now
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Optimization Guide */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> What This Optimizer Does
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { icon: <ImageIcon className="h-5 w-5 text-blue-500" />, title: "Lazy Loading", desc: 'Adds loading="lazy" to all <img> tags so images load only when visible, reducing initial page weight' },
                  { icon: <Zap className="h-5 w-5 text-purple-500" />, title: "Async Decoding", desc: 'Adds decoding="async" to images so the browser can decode them off the main thread, reducing TBT' },
                  { icon: <LayoutGrid className="h-5 w-5 text-cyan-500" />, title: "Image Dimensions", desc: "Adds width/height attributes to prevent Cumulative Layout Shift (CLS) when images load" },
                  { icon: <Link2 className="h-5 w-5 text-green-500" />, title: "Link Security", desc: 'Adds rel="noopener noreferrer" to external links with target="_blank" for security and performance' },
                  { icon: <Minimize2 className="h-5 w-5 text-amber-500" />, title: "HTML Cleanup", desc: "Removes excessive whitespace and line breaks from stored HTML content to reduce payload size" },
                  { icon: <TrendingUp className="h-5 w-5 text-primary" />, title: "Score Impact", desc: "These fixes directly improve LCP, CLS, TBT, and overall Lighthouse scores across all devices" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
      <Badge className={`text-[10px] ${
        severity === "high" ? "bg-red-100 text-red-700" :
        severity === "medium" ? "bg-amber-100 text-amber-700" :
        "bg-blue-100 text-blue-700"
      }`}>{severity}</Badge>
    </div>
  );
}
