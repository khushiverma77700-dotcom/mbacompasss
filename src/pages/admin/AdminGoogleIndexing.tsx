import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Globe,
  RefreshCw,
  Send,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowUpCircle,
  BarChart3,
  TrendingUp,
  Activity,
  Timer,
  Zap,
  Info,
  ExternalLink,
} from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import NightlyAutoRunPanel from "@/components/admin/NightlyAutoRunPanel";

interface IndexingUrl {
  id: string;
  url: string;
  page_type: string;
  record_id?: string | null;
  status: string;
  last_submitted_at: string | null;
  indexed_at: string | null;
  last_response?: unknown;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

interface IndexingLog {
  id: string;
  action: string;
  status: string;
  created_at: string;
  error_message: string | null;
  response?: unknown;
  indexing_urls?: { url: string } | Array<{ url: string }> | null;
}

interface SubmitUrlResponse {
  success: boolean;
  url: string;
  status: string;
  error?: string | null;
  google?: unknown;
  diagnostics?: Record<string, unknown>;
  record?: Partial<IndexingUrl>;
}

interface BulkActionResponse {
  total: number;
  success: number;
  failed: number;
  processed?: number;
  results?: Array<Partial<SubmitUrlResponse>>;
  message?: string;
}

interface BatchProgressState {
  total: number;
  processed: number;
  success: number;
  failed: number;
  remaining: number;
  currentUrl: string | null;
  startedAt: string;
  finishedAt: string | null;
  isRunning: boolean;
}

interface LiveBatchItem {
  url: string;
  status: "sending" | "success" | "failed";
  message: string;
  response: string;
  updatedAt: string;
}

const SITE_URL = "https://bschoolbuzz.com";

const AdminGoogleIndexing = () => {
  const { toast } = useToast();
  const [urls, setUrls] = useState<IndexingUrl[]>([]);
  const [logs, setLogs] = useState<IndexingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"urls" | "logs" | "charts">("urls");
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
  const [liveBatchItems, setLiveBatchItems] = useState<LiveBatchItem[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [availableSites, setAvailableSites] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("auto");
  const [loadingSites, setLoadingSites] = useState(false);

  const fetchData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);

      const [urlsRes, logsRes] = await Promise.all([
        supabase
          .from("indexing_urls")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("indexing_logs")
          .select("id, action, status, created_at, error_message, response, indexing_urls(url)")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (urlsRes.error) {
        if (showLoader) {
          toast({
            title: "Error loading URLs",
            description: urlsRes.error.message,
            variant: "destructive",
          });
        }
      } else {
        setUrls((urlsRes.data as IndexingUrl[]) || []);
      }

      if (logsRes.error) {
        if (showLoader) {
          toast({
            title: "Error loading logs",
            description: logsRes.error.message,
            variant: "destructive",
          });
        }
      } else {
        setLogs((logsRes.data as unknown as IndexingLog[]) || []);
      }

      setLoading(false);
    },
    [toast]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch available Search Console sites once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSites(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-indexing", {
          body: { action: "list_sites" },
        });
        if (cancelled) return;
        if (!error && data && typeof data === "object" && "ok" in data && (data as any).ok) {
          const sites: string[] = (data as any).data?.sites || [];
          setAvailableSites(sites);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingSites(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchData(false);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchData]);

  const getDisplayStatus = useCallback((row: Pick<IndexingUrl, "status" | "indexed_at">) => {
    if (row.indexed_at || row.status === "indexed") return "indexed";
    return row.status;
  }, []);

  const stats = useMemo(() => {
    const summary = { total: urls.length, submitted: 0, indexed: 0, failed: 0, pending: 0 };

    for (const row of urls) {
      const isIndexed = Boolean(row.indexed_at || row.status === "indexed");

      if (isIndexed) summary.indexed += 1;
      if (!isIndexed && row.status !== "failed") summary.pending += 1;
      if (row.status === "submitted" && !isIndexed) summary.submitted += 1;
      if (row.status === "failed") summary.failed += 1;
    }

    return summary;
  }, [urls]);

  const chartData = useMemo(() => {
    // Cumulative chart tracks BOTH submitted and indexed URLs over time so
    // the line keeps growing even before Google confirms indexing.
    const submittedByDate: Record<string, number> = {};
    const indexedByDate: Record<string, number> = {};
    const allDates = new Set<string>();

    for (const row of urls) {
      if (row.last_submitted_at) {
        const d = row.last_submitted_at.slice(0, 10);
        submittedByDate[d] = (submittedByDate[d] || 0) + 1;
        allDates.add(d);
      }
      if (row.indexed_at) {
        const d = row.indexed_at.slice(0, 10);
        indexedByDate[d] = (indexedByDate[d] || 0) + 1;
        allDates.add(d);
      }
    }

    const sortedDates = Array.from(allDates).sort();
    let cumSubmitted = 0;
    let cumIndexed = 0;
    const cumulativeData = sortedDates.map((date) => {
      cumSubmitted += submittedByDate[date] || 0;
      cumIndexed += indexedByDate[date] || 0;
      return {
        date,
        dailySubmitted: submittedByDate[date] || 0,
        dailyIndexed: indexedByDate[date] || 0,
        daily: (submittedByDate[date] || 0) + (indexedByDate[date] || 0),
        cumulativeSubmitted: cumSubmitted,
        cumulativeIndexed: cumIndexed,
        cumulative: cumSubmitted,
      };
    });

    if (cumulativeData.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      cumulativeData.push({
        date: today,
        dailySubmitted: 0,
        dailyIndexed: 0,
        daily: 0,
        cumulativeSubmitted: 0,
        cumulativeIndexed: 0,
        cumulative: 0,
      });
    }

    return cumulativeData;
  }, [urls]);

  // Step-by-step progress: Discovered → Submitted → Indexed
  const pipelineSteps = useMemo(() => {
    const total = urls.length;
    const submittedOrIndexed = urls.filter(
      (r) => r.last_submitted_at || r.status === "submitted" || r.indexed_at || r.status === "indexed"
    ).length;
    const indexed = urls.filter((r) => r.indexed_at || r.status === "indexed").length;

    return [
      {
        key: "discovered",
        label: "Discovered",
        description: "URLs found in your content database",
        count: total,
        of: total,
        percent: total > 0 ? 100 : 0,
        complete: total > 0,
        color: "from-slate-400 to-slate-500",
        icon: Search,
      },
      {
        key: "submitted",
        label: "Submitted to Google",
        description: "Crawl request sent via Indexing API",
        count: submittedOrIndexed,
        of: total,
        percent: total ? Math.round((submittedOrIndexed / total) * 100) : 0,
        complete: total > 0 && submittedOrIndexed === total,
        color: "from-blue-400 to-blue-600",
        icon: ArrowUpCircle,
      },
      {
        key: "indexed",
        label: "Confirmed on Google",
        description: "Google has acknowledged the URL",
        count: indexed,
        of: total,
        percent: total ? Math.round((indexed / total) * 100) : 0,
        complete: total > 0 && indexed === total,
        color: "from-emerald-400 to-emerald-600",
        icon: CheckCircle,
      },
    ];
  }, [urls]);

  const formatJson = (value: unknown) => {
    if (value == null) return "—";
    if (typeof value === "string") return value;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const getResponseSummary = (value: unknown): string => {
    if (!value) return "—";
    if (typeof value === "string") return value;

    const record = value as Record<string, any>;
    const inspection = record.google?.inspectionResult?.indexStatusResult || record.inspectionResult?.indexStatusResult;

    if (inspection) {
      const coverage = String(inspection.coverageState || "").trim();
      const verdict = String(inspection.verdict || "").trim().toUpperCase();

      if (verdict === "PASS") return "Indexed on Google";
      if (coverage) return coverage;
      if (verdict === "NEUTRAL") return "Not indexed yet";
    }

    if (record.google) return getResponseSummary(record.google);
    if (record.error?.message) return String(record.error.message);
    if (record.message) return String(record.message);
    if (record.urlNotificationMetadata) return "Accepted by Google Indexing API";
    if (record.diagnostics?.error_stage) {
      return String(record.diagnostics.error_stage).replace(/_/g, " ");
    }

    return formatJson(value);
  };

  const getErrorSummary = (response: unknown, explicitError?: string | null) => {
    if (explicitError) return explicitError;

    if (response && typeof response === "object") {
      const record = response as Record<string, any>;
      const inspection = record.google?.inspectionResult?.indexStatusResult || record.inspectionResult?.indexStatusResult;

      if (inspection) {
        const coverage = String(inspection.coverageState || "").trim();
        const verdict = String(inspection.verdict || "").trim().toUpperCase();

        if (verdict === "PASS") return "—";
        if (coverage === "URL is unknown to Google") {
          return "Not indexed yet — Google has not discovered this URL yet.";
        }

        return coverage || (verdict === "NEUTRAL" ? "Awaiting Google indexing." : "—");
      }

      if (record.urlNotificationMetadata) return "—";
      if (!record.error && !record.google?.error && !record.diagnostics?.error_stage) return "—";
    }

    const summary = getResponseSummary(response);
    return summary === "—" ? "—" : summary;
  };

  const shortUrl = (url: string) => url.replace(SITE_URL, "") || url;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return "—";
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (ms < 0) return "—";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

  const getLogUrl = (log: IndexingLog) => {
    if (Array.isArray(log.indexing_urls)) {
      return log.indexing_urls[0]?.url || "—";
    }
    return log.indexing_urls?.url || "—";
  };

  const pushLiveBatchItem = (item: LiveBatchItem) => {
    setLiveBatchItems((prev) => [item, ...prev.filter((entry) => entry.url !== item.url)].slice(0, 12));
  };

  const upsertUrlRecord = (
    payload: Partial<SubmitUrlResponse> | undefined,
    fallback: { id?: string; url: string; page_type?: string },
    overrideError?: string | null
  ) => {
    const record = (payload?.record || {}) as Partial<IndexingUrl>;
    const targetUrl = payload?.url || fallback.url;

    if (!targetUrl) return;

    setUrls((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex(
        (row) => row.url === targetUrl || (record.id ? row.id === record.id : false)
      );

      const merged = {
        id: record.id || fallback.id || targetUrl,
        url: targetUrl,
        page_type: (record.page_type as string) || fallback.page_type || "other",
        record_id: (record.record_id as string | null | undefined) ?? null,
        status: payload?.status || (record.status as string) || "pending",
        last_submitted_at:
          (record.last_submitted_at as string | null | undefined) ?? null,
        indexed_at: (record.indexed_at as string | null | undefined) ?? null,
        last_response: payload?.google ?? record.last_response ?? null,
        error_message:
          overrideError ?? payload?.error ?? (record.error_message as string | null | undefined) ?? null,
        retry_count:
          typeof record.retry_count === "number" ? record.retry_count : existingIndex >= 0 ? next[existingIndex].retry_count : 0,
        created_at:
          (record.created_at as string | undefined) ||
          (existingIndex >= 0 ? next[existingIndex].created_at : new Date().toISOString()),
        updated_at:
          (record.updated_at as string | undefined) || new Date().toISOString(),
      } as IndexingUrl;

      if (existingIndex >= 0) {
        next[existingIndex] = { ...next[existingIndex], ...merged };
      } else {
        next.unshift(merged);
      }

      return next;
    });
  };

  const extractRequestError = (error: any) => {
    const details = error?.details;
    const message =
      details?.error ||
      details?.data?.error ||
      details?.data?.record?.error_message ||
      error?.message ||
      "Request failed";

    return { message, details };
  };

  const callFunction = async <T,>(body: Record<string, unknown>): Promise<T> => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const url = `${SUPABASE_URL}/functions/v1/google-indexing`;

    const invokeOnce = async (timeoutMs: number) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || SUPABASE_KEY;

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });

        const text = await res.text();
        let parsed: any = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = { error: text || `HTTP ${res.status}` };
        }

        if (!res.ok) {
          const err = new Error(parsed?.error || `Edge Function returned ${res.status}`);
          (err as any).details = parsed;
          throw err;
        }
        return parsed;
      } finally {
        window.clearTimeout(timer);
      }
    };

    let data: any;
    let lastErr: any;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        data = await invokeOnce(90_000);
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || "");
        const isNetworkError =
          err?.name === "AbortError" ||
          err?.name === "TypeError" ||
          /network|failed to fetch|load failed|networkerror/i.test(msg);
        if (!isNetworkError || attempt === maxAttempts) throw err;
        // exponential backoff: 1s, 2.5s
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
    if (lastErr) throw lastErr;

    if (data && typeof data === "object" && "ok" in data) {
      const payload = data as { ok: boolean; data?: T; error?: string };
      if (!payload.ok) {
        const enrichedError = new Error(payload.error || "Request failed");
        (enrichedError as any).details = data;
        throw enrichedError;
      }
      return (payload.data ?? data) as T;
    }

    return data as T;
  };

  const pushLog = (msg: string) => setActionLog(prev => [`[${new Date().toLocaleTimeString("en-IN")}] ${msg}`, ...prev].slice(0, 30));

  const handleDiscover = async () => {
    setActionLoading("discover");
    pushLog("Scanning database for new URLs...");
    try {
      const result = await callFunction<{ discovered: number }>({ action: "discover" });
      pushLog(`Discovery complete: ${result.discovered} new URLs found`);
      toast({
        title: "Discovery complete",
        description: `${result.discovered} new URLs found`,
      });
      await fetchData(false);
    } catch (error: any) {
      const { message } = extractRequestError(error);
      pushLog(`Discovery failed: ${message}`);
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleAutoRun = async () => {
    setActionLoading("auto-run");
    pushLog("Auto Run started: discover → submit → check index status (respecting daily quotas)...");
    try {
      const result = await callFunction<{
        discovered: number;
        submitted: number;
        submission_failed: number;
        inspected: number;
        newly_indexed: number;
        submission_budget: number;
        inspection_budget: number;
        steps: string[];
      }>({ action: "auto_run" });
      pushLog(
        `Auto Run done — discovered:${result.discovered} submitted:${result.submitted} failed:${result.submission_failed} inspected:${result.inspected} newly indexed:${result.newly_indexed}`
      );
      (result.steps || []).forEach((s) => pushLog(`  • ${s}`));
      toast({
        title: "Auto Run complete",
        description: `Discovered ${result.discovered}, submitted ${result.submitted}, inspected ${result.inspected}, newly indexed ${result.newly_indexed}`,
      });
      await fetchData(false);
    } catch (error: any) {
      const { message } = extractRequestError(error);
      pushLog(`Auto Run failed: ${message}`);
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleRefresh = async () => {
    setActionLoading("refresh");
    pushLog("Retrying failed URLs...");
    try {
      const result = await callFunction<BulkActionResponse>({ action: "refresh" });

      (result.results || []).forEach((entry) => {
        if (entry.url) {
          upsertUrlRecord(entry, { url: entry.url, page_type: "other" }, entry.error || null);
        }
      });

      pushLog(`Retry finished: ${result.success}/${result.total} succeeded`);
      toast({
        title: "Retry finished",
        description: `${result.success}/${result.total} URLs processed successfully`,
      });
      await fetchData(false);
    } catch (error: any) {
      const { message } = extractRequestError(error);
      pushLog(`Retry failed: ${message}`);
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleSubmitAll = async () => {
    const pendingEntries = urls
      .filter((row) => getDisplayStatus(row) === "pending")
      .slice(0, 100);

    if (!pendingEntries.length) {
      toast({
        title: "No pending URLs",
        description: "All URLs are already processed.",
      });
      return;
    }

    setActionLoading("submit-all");
    setLiveBatchItems([]);
    setBatchProgress({
      total: pendingEntries.length,
      processed: 0,
      success: 0,
      failed: 0,
      remaining: pendingEntries.length,
      currentUrl: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      isRunning: true,
    });

    let successCount = 0;
    let failedCount = 0;

    setBatchProgress((prev) =>
      prev
        ? {
            ...prev,
            currentUrl: "Submitting batch to Google…",
          }
        : prev
    );

    try {
      const result = await callFunction<BulkActionResponse>({
        action: "batch_submit",
        urls: pendingEntries.map((entry) => ({
          url: entry.url,
          page_type: entry.page_type,
          record_id: entry.record_id || undefined,
        })),
      });

      successCount = result.success || 0;
      failedCount = result.failed || 0;

      (result.results || []).forEach((entry) => {
        if (!entry.url) return;

        const fallbackEntry = pendingEntries.find((row) => row.url === entry.url) || {
          url: entry.url,
          page_type: "other",
          record_id: null,
        };

        upsertUrlRecord(entry, fallbackEntry, entry.error || null);

        pushLiveBatchItem({
          url: entry.url,
          status: entry.success ? "success" : "failed",
          message: entry.success
            ? getResponseSummary(entry.google)
            : entry.error || getResponseSummary(entry.google),
          response: formatJson(entry.google ?? entry.diagnostics ?? entry),
          updatedAt: new Date().toISOString(),
        });
      });

      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: result.processed ?? result.total ?? pendingEntries.length,
              success: successCount,
              failed: failedCount,
              remaining:
                pendingEntries.length - (result.processed ?? result.total ?? pendingEntries.length),
              currentUrl: null,
              finishedAt: new Date().toISOString(),
              isRunning: false,
            }
          : prev
      );

      await fetchData(false);

      toast({
        title: "Batch submission finished",
        description: `${successCount}/${pendingEntries.length} URLs processed successfully${
          failedCount ? `, ${failedCount} failed.` : "."
        }`,
        variant: failedCount ? "destructive" : "default",
      });
    } catch (error: any) {
      const { message } = extractRequestError(error);

      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              currentUrl: null,
              finishedAt: new Date().toISOString(),
              isRunning: false,
            }
          : prev
      );

      toast({ title: "Error", description: message, variant: "destructive" });
    }

    setActionLoading(null);
  };

  const handleCheckIndexStatus = async () => {
    setActionLoading("check-status");
    const statusCheckBatchSize = 12;
    const pendingCount = urls.filter(
      (u) => !u.indexed_at && (u.status === "submitted" || u.status === "pending")
    ).length;
    const totalToCheck = Math.max(pendingCount, 1);

    setBatchProgress({
      total: totalToCheck,
      processed: 0,
      remaining: totalToCheck,
      success: 0,
      failed: 0,
      currentUrl: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      isRunning: true,
    });
    setLiveBatchItems([]);
    pushLog(`Asking Google which URLs are indexed… (${totalToCheck} to check)`);

    let totalIndexed = 0;
    let totalChecked = 0;
    let totalFailed = 0;
    let nextSkip = 0;
    let siteProp: string | undefined;
    let guard = 0;
    const maxIterations = Math.ceil(totalToCheck / statusCheckBatchSize) + 3;

    try {
      while (guard++ < maxIterations) {
        const result = await callFunction<{
          checked: number;
          indexed: number;
          not_indexed: number;
          processed_in_batch?: number;
          next_skip?: number;
          remaining?: number;
          total_pending?: number;
          site_property?: string;
        }>({
          action: "check_index_status",
          limit: statusCheckBatchSize,
          skip: nextSkip,
          ...(selectedSite && selectedSite !== "auto" ? { site_property: selectedSite } : {}),
        });

        const processedInBatch = result.processed_in_batch ?? result.checked ?? 0;

        totalChecked += processedInBatch;
        totalIndexed += result.indexed || 0;
        totalFailed += Math.max(processedInBatch - (result.indexed || 0) - (result.not_indexed || 0), 0);
        nextSkip = result.next_skip ?? totalChecked;
        siteProp = result.site_property || siteProp;

        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                total: Math.max(prev.total, result.total_pending ?? prev.total),
                processed: Math.min(totalChecked, Math.max(prev.total, result.total_pending ?? prev.total)),
                remaining: Math.max((result.total_pending ?? prev.total) - totalChecked, 0),
                success: totalIndexed,
                failed: totalFailed,
                currentUrl: null,
              }
            : prev
        );

        pushLog(
          `Batch ${guard}: ${result.indexed}/${processedInBatch} indexed${
            result.remaining ? ` · ${result.remaining} still to check` : ""
          }`
        );

        if (processedInBatch === 0 || !(result.remaining && result.remaining > 0)) {
          break;
        }
      }

      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              finishedAt: new Date().toISOString(),
              isRunning: false,
              processed: prev.total,
              remaining: 0,
            }
          : prev
      );

      toast({
        title: "Index status checked",
        description: `${totalIndexed} of ${totalChecked} URLs confirmed on Google${
          siteProp ? ` via ${siteProp}` : ""
        }.`,
      });
      await fetchData(false);
    } catch (error: any) {
      const { message } = extractRequestError(error);
      pushLog(`Status check failed: ${message}`);
      setBatchProgress((prev) =>
        prev ? { ...prev, finishedAt: new Date().toISOString(), isRunning: false } : prev
      );
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleManualSubmit = async () => {
    const url = manualUrl.trim();
    if (!url) return;

    setActionLoading("manual");
    pushLog(`Submitting URL: ${shortUrl(url)}...`);
    try {
      const result = await callFunction<SubmitUrlResponse>({
        action: "submit_url",
        url,
        page_type: "manual",
      });

      upsertUrlRecord(result, { url, page_type: "manual" });
      setManualUrl("");
      pushLog(`URL ${result.success ? "submitted successfully" : "submission failed"}: ${shortUrl(url)}`);

      toast({
        title: result.success ? "URL submitted to Google" : "Submission failed",
        description: result.success
          ? "Google has been notified to crawl this URL. Status: Submitted (not yet indexed)."
          : result.error || "Submission failed",
        variant: result.success ? "default" : "destructive",
      });

      await fetchData(false);
    } catch (error: any) {
      const { message, details } = extractRequestError(error);
      upsertUrlRecord(details?.data, { url, page_type: "manual" }, message);
      pushLog(`Error submitting ${shortUrl(url)}: ${message}`);
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleResubmit = async (row: IndexingUrl) => {
    setActionLoading(row.id);
    try {
      const result = await callFunction<SubmitUrlResponse>({
        action: "submit_url",
        url: row.url,
        page_type: row.page_type,
        record_id: row.record_id || undefined,
      });

      upsertUrlRecord(result, row);
      toast({
        title: "URL re-submitted",
        description: getResponseSummary(result.google),
      });
      await fetchData(false);
    } catch (error: any) {
      const { message, details } = extractRequestError(error);
      upsertUrlRecord(details?.data, row, message);
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: any; label: string }> = {
      submitted: {
        cls: "bg-blue-50 text-blue-700 border-blue-200",
        icon: ArrowUpCircle,
        label: "Notified Google + IndexNow",
      },
      indexed: {
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle,
        label: "Indexed",
      },
      failed: {
        cls: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
        label: "Failed",
      },
      pending: {
        cls: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
        label: "Pending",
      },
      not_indexed_yet: {
        cls: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
        label: "Not indexed yet",
      },
      check_failed: {
        cls: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
        label: "Check failed",
      },
      started: {
        cls: "bg-sky-50 text-sky-700 border-sky-200",
        icon: Activity,
        label: "Started",
      },
    };

    const resolved = map[status] || map.pending;
    const Icon = resolved.icon;

    return (
      <Badge variant="outline" className={`gap-1 ${resolved.cls}`}>
        <Icon className="w-3 h-3" />
        {resolved.label}
      </Badge>
    );
  };

  const activityBadge = (status: LiveBatchItem["status"]) => {
    if (status === "sending") {
      return (
        <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
          <Loader2 className="w-3 h-3 animate-spin" /> Sending
        </Badge>
      );
    }

    return statusBadge(status === "success" ? "indexed" : "failed");
  };

  const filtered = urls.filter((row) => {
    const displayStatus = getDisplayStatus(row);
    const matchesStatus =
      filter === "all"
        ? true
        : filter === "pending"
          ? !row.indexed_at && row.status !== "failed"
          : filter === "indexed"
            ? displayStatus === "indexed"
            : displayStatus === filter;

    if (!matchesStatus) return false;
    if (searchTerm && !row.url.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const { sortedItems: sortedFiltered, sortConfig: urlSortConfig, handleSort: handleUrlSort } = useTableSort(filtered);
  const { sortedItems: sortedLogs, sortConfig: logSortConfig, handleSort: handleLogSort } = useTableSort(logs);

  const chartConfig = {
    cumulativeSubmitted: { label: "Total Submitted", color: "hsl(217 91% 60%)" },
    cumulativeIndexed: { label: "Total Indexed", color: "hsl(142 71% 45%)" },
    dailySubmitted: { label: "Submitted", color: "hsl(217 91% 60%)" },
    dailyIndexed: { label: "Indexed", color: "hsl(142 71% 45%)" },
  };

  const progressValue = batchProgress
    ? Math.round((batchProgress.processed / Math.max(batchProgress.total, 1)) * 100)
    : 0;

  const getCoverageInfo = (response: unknown): { coverage: string; verdict: string } => {
    try {
      const r = response as any;
      const result = r?.google?.inspectionResult?.indexStatusResult;
      return {
        coverage: String(result?.coverageState || "").trim(),
        verdict: String(result?.verdict || "").trim(),
      };
    } catch {
      return { coverage: "", verdict: "" };
    }
  };

  return (
    <div className="space-y-6">
      <NightlyAutoRunPanel />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" /> Google Indexing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated URL submission, retry tracking, and detailed Google response visibility.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleAutoRun}
            disabled={!!actionLoading}
            title="Discover → Submit → Check Index Status. Runs automatically every day at 12 AM IST."
          >
            {actionLoading === "auto-run" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Zap className="w-4 h-4 mr-1" />
            )}
            Auto Run (Daily)
          </Button>
          <Button variant="outline" size="sm" onClick={handleDiscover} disabled={!!actionLoading}>
            {actionLoading === "discover" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Search className="w-4 h-4 mr-1" />
            )}
            Discover New
          </Button>
          <Button variant="outline" size="sm" onClick={handleSubmitAll} disabled={!!actionLoading}>
            {actionLoading === "submit-all" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Zap className="w-4 h-4 mr-1" />
            )}
            {actionLoading === "submit-all" && batchProgress
              ? `Submitting ${batchProgress.processed}/${batchProgress.total}`
              : "Submit All Pending"}
          </Button>
          <Select value={selectedSite} onValueChange={setSelectedSite} disabled={!!actionLoading}>
            <SelectTrigger className="h-9 w-[230px] text-xs" title="Search Console property used for Check Index Status">
              <SelectValue placeholder={loadingSites ? "Loading properties…" : "Auto-detect property"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect property</SelectItem>
              {availableSites.map((site) => (
                <SelectItem key={site} value={site} className="text-xs font-mono">
                  {site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckIndexStatus}
            disabled={!!actionLoading}
            title="Ask Google which submitted URLs are already indexed"
          >
            {actionLoading === "check-status" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1 text-emerald-500" />
            )}
            Check Index Status
          </Button>
          <Button size="sm" onClick={handleRefresh} disabled={!!actionLoading}>
            {actionLoading === "refresh" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Retry Failed
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: "all", label: "Total URLs", value: stats.total, icon: BarChart3, color: "text-muted-foreground" },
          { key: "submitted", label: "Crawl Requested", value: stats.submitted, icon: ArrowUpCircle, color: "text-blue-500" },
          { key: "indexed", label: "Indexed", value: stats.indexed, icon: CheckCircle, color: "text-emerald-500" },
          { key: "failed", label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-500" },
          { key: "pending", label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className={`cursor-pointer transition-all hover:shadow-md ${filter === card.key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFilter(card.key)}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${card.color}`} />
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Step-by-step indexing pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Indexing Pipeline — Track each step
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* connector line behind icons */}
            <div className="hidden md:block absolute top-6 left-[8%] right-[8%] h-1 bg-muted rounded-full" />
            <div
              className="hidden md:block absolute top-6 left-[8%] h-1 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full transition-all duration-700"
              style={{
                width: `${(pipelineSteps[pipelineSteps.length - 1].percent / 100) * 84}%`,
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {pipelineSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md bg-gradient-to-br ${step.color} ${
                        step.complete ? "ring-4 ring-emerald-100" : ""
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border text-[10px] font-bold flex items-center justify-center text-foreground">
                        {idx + 1}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
                      {step.description}
                    </p>
                    <div className="mt-3 w-full max-w-[220px]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-foreground">
                          {step.count}
                          <span className="text-muted-foreground font-normal"> / {step.of}</span>
                        </span>
                        <span className="text-muted-foreground">{step.percent}%</span>
                      </div>
                      <Progress value={step.percent} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Tip: After submitting URLs, click <strong className="text-foreground">"Check Index Status"</strong> to see which ones Google has actually picked up.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckIndexStatus}
              disabled={!!actionLoading}
              className="h-7 text-xs"
            >
              {actionLoading === "check-status" ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCircle className="w-3 h-3 mr-1" />
              )}
              Check Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-800 space-y-1">
              <p className="font-medium">How Google Indexing actually works:</p>
              <p><strong>Pending</strong> = URL discovered, not yet sent to Google. <strong>Crawl Request Sent</strong> = Google's Indexing API received our notification (this does NOT guarantee Search Console will mark it submitted — the Indexing API officially supports only JobPosting / BroadcastEvent pages). <strong>Indexed</strong> = Confirmed indexed by Google. <strong>Failed</strong> = API error, will retry.</p>
              <p>For regular pages (Institutes, Colleges, Articles) the reliable path is the sitemap. We auto-ping <code>/sitemap.xml</code> after every change so Google re-discovers new URLs.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Log */}
      {actionLog.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Action Log
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-muted/40 rounded-md p-3 max-h-32 overflow-y-auto font-mono text-xs space-y-0.5">
              {actionLog.map((msg, i) => (
                <p key={i} className="text-muted-foreground">{msg}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {(batchProgress || liveBatchItems.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Bulk Submission Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {batchProgress ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {batchProgress.processed}/{batchProgress.total} URLs processed
                      </span>
                      <span className="text-muted-foreground">{batchProgress.remaining} remaining</span>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-xl font-semibold">{batchProgress.processed}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Success</p>
                      <p className="text-xl font-semibold text-emerald-600">{batchProgress.success}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-xl font-semibold text-red-600">{batchProgress.failed}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Started:</span> {formatTime(batchProgress.startedAt)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Current:</span>{" "}
                      {batchProgress.currentUrl ? shortUrl(batchProgress.currentUrl) : batchProgress.isRunning ? "Waiting…" : "Completed"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Finished:</span>{" "}
                      {batchProgress.finishedAt ? formatTime(batchProgress.finishedAt) : "Still running"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Run “Submit All Pending” to see live batch progress here.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Live Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {liveBatchItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Live request updates will appear here while URLs are being processed.</p>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {liveBatchItems.map((item) => (
                    <div key={item.url} className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-primary truncate">{shortUrl(item.url)}</p>
                          <p className="mt-1 text-xs text-muted-foreground break-words">{item.message}</p>
                        </div>
                        {activityBadge(item.status)}
                      </div>
                      {item.response && item.response !== "—" && (
                        <details className="mt-2 text-[11px] text-muted-foreground">
                          <summary className="cursor-pointer text-primary">View API response</summary>
                          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 font-mono text-[10px]">
                            {item.response}
                          </pre>
                        </details>
                      )}
                      <p className="mt-2 text-[10px] text-muted-foreground">{formatTime(item.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {[
          { id: "urls" as const, label: "URLs", icon: Globe },
          { id: "charts" as const, label: "Analytics", icon: TrendingUp },
          { id: "logs" as const, label: "Activity Logs", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Send className="w-4 h-4" /> Submit URL Manually
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://bschoolbuzz.com/article/..."
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleManualSubmit()}
              className="flex-1"
            />
            <Button onClick={handleManualSubmit} disabled={!!actionLoading || !manualUrl.trim()}>
              {actionLoading === "manual" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === "urls" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                {filter !== "all" ? `${filter.charAt(0).toUpperCase() + filter.slice(1)} URLs` : "All URLs"} — {filtered.length} results
              </CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search URLs..."
                  className="w-52 h-8 text-sm"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                {filter !== "all" && (
                  <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No URLs found. Click “Discover New” to scan your content.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <SortableTableHead label="URL" sortKey="url" sortConfig={urlSortConfig} onSort={handleUrlSort} className="min-w-[240px]" />
                      <SortableTableHead label="Type" sortKey="page_type" sortConfig={urlSortConfig} onSort={handleUrlSort} />
                      <SortableTableHead label="Status" sortKey="status" sortConfig={urlSortConfig} onSort={handleUrlSort} />
                      <SortableTableHead label="Submission Time" sortKey="last_submitted_at" sortConfig={urlSortConfig} onSort={handleUrlSort} />
                      <SortableTableHead label="Last Checked" sortKey="updated_at" sortConfig={urlSortConfig} onSort={handleUrlSort} />
                      <SortableTableHead label="Retries" sortKey="retry_count" sortConfig={urlSortConfig} onSort={handleUrlSort} />
                      <TableHead className="min-w-[220px]">Error / Reason</TableHead>
                      <TableHead className="min-w-[220px]">Google Response</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFiltered.map((row, idx) => (
                      <TableRow key={row.id} className="group align-top">
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-primary hover:underline break-all"
                          >
                            {shortUrl(row.url)}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {row.page_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const { coverage, verdict } = getCoverageInfo(row.last_response);
                            const badge = statusBadge(getDisplayStatus(row));
                            if (!coverage && !verdict) return badge;
                            return (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-help border-b border-dashed border-muted-foreground/40">
                                      {badge}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    <div className="space-y-1">
                                      {coverage && (
                                        <div>
                                          <span className="font-semibold">Google coverage:</span>{" "}
                                          {coverage}
                                        </div>
                                      )}
                                      {verdict && (
                                        <div>
                                          <span className="font-semibold">Verdict:</span> {verdict}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(row.last_submitted_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(row.updated_at || row.last_submitted_at || row.created_at)}
                        </TableCell>
                        <TableCell className="text-xs text-center">{row.retry_count}</TableCell>
                        <TableCell className="max-w-[240px]">
                          <div
                            className={`text-[11px] break-words whitespace-pre-wrap ${
                              row.error_message ? "text-red-600" : "text-muted-foreground"
                            }`}
                          >
                            {getErrorSummary(row.last_response, row.error_message)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {row.last_response ? (
                            <details className="text-[11px] text-muted-foreground">
                              <summary className="cursor-pointer text-primary">
                                {getResponseSummary(row.last_response)}
                              </summary>
                              <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 font-mono text-[10px]">
                                {formatJson(row.last_response)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(getDisplayStatus(row) === "failed" || getDisplayStatus(row) === "pending") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleResubmit(row)}
                                disabled={actionLoading === row.id}
                                title="Re-submit via API"
                              >
                                {actionLoading === row.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}
                            {!row.indexed_at && getDisplayStatus(row) !== "indexed" && (
                              <a
                                href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent("sc-domain:bschoolbuzz.com")}&id=${encodeURIComponent(row.url)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Search Console — use the 'Request Indexing' button there for guaranteed indexing within minutes"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "charts" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Cumulative URLs Over Time
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted (blue) vs. confirmed Indexed (green) — both grow as you add URLs.
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="submittedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="cumulativeSubmitted"
                      stroke="hsl(217 91% 60%)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      name="Total Submitted"
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeIndexed"
                      stroke="hsl(142 71% 45%)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      name="Total Indexed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" /> Daily Activity
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                URLs submitted and indexed each day.
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="dailySubmitted" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name="Submitted" />
                    <Bar dataKey="dailyIndexed" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} name="Indexed" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Recent Activity — {logs.length} entries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No activity logs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <SortableTableHead label="Time" sortKey="created_at" sortConfig={logSortConfig} onSort={handleLogSort} />
                      <SortableTableHead label="URL" sortKey="url" sortConfig={logSortConfig} onSort={handleLogSort} />
                      <SortableTableHead label="Action" sortKey="action" sortConfig={logSortConfig} onSort={handleLogSort} />
                      <SortableTableHead label="Status" sortKey="status" sortConfig={logSortConfig} onSort={handleLogSort} />
                      <TableHead className="min-w-[220px]">API Response</TableHead>
                      <TableHead className="min-w-[220px]">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLogs.map((log, idx) => (
                      <TableRow key={log.id} className="align-top">
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(log.created_at)}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="text-xs font-mono text-primary break-all">{shortUrl(getLogUrl(log))}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{statusBadge(log.status === "submitted" ? "submitted" : log.status)}</TableCell>
                        <TableCell className="max-w-[260px]">
                          {log.response ? (
                            <details className="text-[11px] text-muted-foreground">
                              <summary className="cursor-pointer text-primary">
                                {getResponseSummary(log.response)}
                              </summary>
                              <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 font-mono text-[10px]">
                                {formatJson(log.response)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-red-600 break-words whitespace-pre-wrap max-w-[260px]">
                          {log.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminGoogleIndexing;
