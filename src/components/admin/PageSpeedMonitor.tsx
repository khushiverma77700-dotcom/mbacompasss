import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Activity, AlertTriangle, CheckCircle, Code, Database, Eye, FileText,
  Gauge, Globe, Layers, Lightbulb, Loader2, MonitorSmartphone, RefreshCw,
  Settings, Shield, Sparkles, Target, Zap, XCircle, ChevronDown,
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

export function PageSpeedMonitor({
  rows, pageSpeedData, setPageSpeedData, pageSpeedLoading, setPageSpeedLoading,
  pageSpeedDevice, setPageSpeedDevice, pageSpeedOptimizing, setPageSpeedOptimizing, toast,
}: Props) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState("");

  // Load cached results on mount
  useEffect(() => {
    if (!pageSpeedData) {
      loadCachedResults(pageSpeedDevice);
    }
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

  // When device changes, load cached results for that device
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
      // Build URL list from rows - pick key pages
      const staticPages = [
        { name: "Home", slug: "/", url: "/", contentType: "static" },
        { name: "About", slug: "/about", url: "/about", contentType: "static" },
        { name: "Contact", slug: "/contact", url: "/contact", contentType: "static" },
        { name: "Blog", slug: "/blog", url: "/blog", contentType: "static" },
        { name: "Colleges", slug: "/colleges", url: "/colleges", contentType: "static" },
      ];

      // Add dynamic pages from rows (first 10)
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

      // Call edge function
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
      toast({
        title: "✅ Real Analysis Complete",
        description: `Analyzed ${data.pagesAnalyzed} pages via Google PageSpeed Insights (${pageSpeedDevice})`,
      });
    } catch (e: any) {
      console.error("Page speed analysis error:", e);
      toast({
        title: "Analysis Failed",
        description: e.message || "Could not reach PageSpeed API",
        variant: "destructive",
      });
    } finally {
      setPageSpeedLoading(false);
      setCurrentlyAnalyzing("");
    }
  };

  const metricColor = (val: number, good: number, ok: number) =>
    val <= good ? "text-green-600" : val <= ok ? "text-amber-600" : "text-red-600";

  const metricBg = (val: number, good: number, ok: number) =>
    val <= good ? "bg-green-100 text-green-700" : val <= ok ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  const isMobile = pageSpeedDevice !== "desktop";
  const thresholds = {
    fcp: { good: isMobile ? 1.8 : 1.0, ok: isMobile ? 3.0 : 2.0 },
    lcp: { good: isMobile ? 2.5 : 2.0, ok: isMobile ? 4.0 : 3.0 },
    tbt: { good: isMobile ? 200 : 100, ok: isMobile ? 600 : 300 },
    cls: { good: 0.1, ok: 0.25 },
    si: { good: isMobile ? 3.4 : 2.5, ok: isMobile ? 5.8 : 4.0 },
    tti: { good: isMobile ? 3.8 : 3.0, ok: isMobile ? 7.3 : 5.0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" /> Page Speed Monitor
                <Badge variant="outline" className="text-[10px] ml-2 border-primary/30">
                  Google PageSpeed Insights API
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time Core Web Vitals analysis powered by Lighthouse
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["mobile", "tablet", "desktop"] as const).map(device => (
                  <button
                    key={device}
                    onClick={() => handleDeviceChange(device)}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      pageSpeedDevice === device
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {device === "mobile" ? "📱 Mobile" : device === "tablet" ? "📱 Tablet" : "💻 Desktop"}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={runRealAnalysis}
                disabled={pageSpeedLoading}
                className="gap-2"
              >
                {pageSpeedLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {pageSpeedLoading ? "Analyzing..." : "Run Real Analysis"}
              </Button>
            </div>
          </div>

          {/* Progress bar during analysis */}
          {pageSpeedLoading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{currentlyAnalyzing}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ⏱️ This may take 1-3 minutes — each page is analyzed by Google's Lighthouse engine in real time
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
            Performance Benchmarks ({pageSpeedDevice === "mobile" ? "📱 Mobile" : pageSpeedDevice === "tablet" ? "📱 Tablet" : "💻 Desktop"})
          </CardTitle>
          <CardDescription>Target metrics for optimal SEO performance (Google standards)</CardDescription>
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
                <div className="relative inline-block">
                  <p className={`text-3xl font-bold ${pageSpeedData.avgScore >= 90 ? "text-green-600" : pageSpeedData.avgScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {pageSpeedData.avgScore}
                  </p>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
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

          {/* Page Results Table with proper horizontal scroll */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Page-by-Page Results ({pageSpeedData.pagesAnalyzed || pageSpeedData.pages.length} pages)
              </CardTitle>
              <CardDescription>Real Lighthouse scores — click a row to see optimization opportunities</CardDescription>
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
                              className={`cursor-pointer hover:bg-muted/50 ${
                                page.status === "poor" ? "bg-red-50/30" : ""
                              }`}
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
                                }`}>
                                  {page.score}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.fcp, thresholds.fcp.good, thresholds.fcp.ok)}`}>
                                {page.fcp}s
                              </TableCell>
                              <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.lcp, thresholds.lcp.good, thresholds.lcp.ok)}`}>
                                {page.lcp}s
                              </TableCell>
                              <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.tbt, thresholds.tbt.good, thresholds.tbt.ok)}`}>
                                {page.tbt}ms
                              </TableCell>
                              <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.cls, thresholds.cls.good, thresholds.cls.ok)}`}>
                                {page.cls}
                              </TableCell>
                              <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.si, thresholds.si.good, thresholds.si.ok)}`}>
                                {page.si}s
                              </TableCell>
                              <TableCell className={`text-center text-xs font-mono font-medium ${metricColor(page.tti, thresholds.tti.good, thresholds.tti.ok)}`}>
                                {page.tti}s
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5 max-w-[180px]">
                                  {page.issues.slice(0, 3).map((issue, i) => (
                                    <p key={i} className={`text-[10px] leading-tight ${
                                      issue.includes("✓") ? "text-green-600" : "text-red-600"
                                    }`}>
                                      {issue.includes("✓") ? "✅" : "⚠️"} {issue}
                                    </p>
                                  ))}
                                  {page.issues.length > 3 && (
                                    <p className="text-[10px] text-muted-foreground">+{page.issues.length - 3} more</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <ChevronDown className={`h-4 w-4 mx-auto transition-transform ${
                                  expandedPage === page.slug ? "rotate-180" : ""
                                }`} />
                              </TableCell>
                            </TableRow>

                            {/* Expanded Details Row */}
                            {expandedPage === page.slug && (
                              <TableRow key={`detail-${idx}`}>
                                <TableCell colSpan={10} className="bg-muted/20 p-0">
                                  <div className="p-4 space-y-4">
                                    {/* Core Web Vitals Visual */}
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
                                              numVal <= m.good ? "text-green-700" :
                                              numVal <= m.ok ? "text-amber-700" :
                                              "text-red-700"
                                            }`}>{m.val}</p>
                                            <p className="text-[9px] text-muted-foreground">
                                              Target: ≤{typeof m.good === "number" && m.good < 1 ? m.good : m.good}{m.label === "TBT" ? "ms" : m.label === "CLS" ? "" : "s"}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Opportunities */}
                                    {page.opportunities && page.opportunities.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                                          <Lightbulb className="h-4 w-4 text-amber-500" />
                                          Optimization Opportunities ({page.opportunities.length})
                                        </h4>
                                        <div className="space-y-1.5">
                                          {page.opportunities.map((opp, i) => (
                                            <div key={i} className="flex items-start gap-3 p-2.5 rounded border-l-4 border-l-amber-400 bg-amber-50/50">
                                              <Zap className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">{opp.title}</p>
                                                {opp.description && (
                                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{opp.description}</p>
                                                )}
                                              </div>
                                              {opp.savings && (
                                                <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700">
                                                  {opp.savings}
                                                </Badge>
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
                                          <Settings className="h-4 w-4 text-blue-500" />
                                          Diagnostics ({page.diagnostics.length})
                                        </h4>
                                        <div className="grid md:grid-cols-2 gap-1.5">
                                          {page.diagnostics.map((diag, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded bg-blue-50/50 border-l-4 border-l-blue-400">
                                              <AlertTriangle className="h-3 w-3 text-blue-500 shrink-0" />
                                              <span className="text-xs">{diag.title}</span>
                                              {diag.description && (
                                                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{diag.description}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* URL */}
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
                  <CardDescription>Issues found across multiple pages — fix these for biggest impact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topOpps.map(([title, count]) => (
                    <div key={title} className="flex items-center gap-3 p-2.5 rounded border-l-4 border-l-amber-400 bg-amber-50/30">
                      <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-sm flex-1">{title}</span>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">
                        {count} page{count > 1 ? "s" : ""}
                      </Badge>
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
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Quick Wins
                </CardTitle>
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
                {pageSpeedData.pages.some(p => p.fcp > thresholds.fcp.good) && (
                  <RecRow icon={<FileText className="h-4 w-4" />} text={`${pageSpeedData.pages.filter(p => p.fcp > thresholds.fcp.good).length} pages have slow FCP — inline critical CSS`} severity="medium" />
                )}
                {pageSpeedData.avgScore >= 90 && (
                  <RecRow icon={<CheckCircle className="h-4 w-4" />} text="All pages performing well! Monitor weekly to maintain scores." severity="low" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-500" /> Technical Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <RecRow icon={<Globe className="h-4 w-4" />} text="Use CDN for static assets (images, fonts, CSS)" severity="medium" />
                <RecRow icon={<Eye className="h-4 w-4" />} text="Convert images to WebP/AVIF for 30-50% size reduction" severity="medium" />
                <RecRow icon={<Database className="h-4 w-4" />} text="Set Cache-Control: max-age=31536000 for static files" severity="low" />
                <RecRow icon={<Shield className="h-4 w-4" />} text="Implement service workers for offline asset caching" severity="low" />
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
              Click "Run Real Analysis" to check page speed using Google's PageSpeed Insights API.
              <br />
              <span className="text-xs">Each page is analyzed with real Lighthouse scores — not simulated data.</span>
            </p>
            <Button onClick={runRealAnalysis} disabled={pageSpeedLoading}>
              <Gauge className="h-4 w-4 mr-2" /> Run First Analysis
            </Button>
          </CardContent>
        </Card>
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
