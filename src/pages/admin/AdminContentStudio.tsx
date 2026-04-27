import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw, Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
  ListChecks, Wand2, Eye, Check, X, ExternalLink, Target, FileText,
  GraduationCap, Building2, BookOpen, Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* =========================================================
   Unified Content Studio
   - Single page: select → run → review → approve
   - Works across Colleges, College Sections, Articles, Institutes, Courses
   ========================================================= */

type EntityType = "college" | "college_section" | "article" | "institute" | "course";
type Status = "pending" | "approved" | "rejected" | "failed" | "generating";

interface EntityRow {
  id: string;
  name: string;
  slug?: string | null;
  city?: string | null;
  state?: string | null;
  last_seo_refresh?: string | null;
  parent_label?: string | null; // for college_section -> college name
}

interface RefreshRow {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_slug: string | null;
  entity_name: string | null;
  refresh_mode: string;
  status: Status;
  current_snapshot: Record<string, any>;
  proposed_snapshot: Record<string, any>;
  diff: Record<string, { changed: boolean; before: any; after: any }>;
  ai_model: string | null;
  ai_notes: string | null;
  error_message: string | null;
  created_at: string;
  reviewed_at: string | null;
  published_at: string | null;
}

const ENTITY_CONFIG: Record<EntityType, {
  table: string;
  nameField: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hasRefreshTs: boolean;
  publicPath?: string;
}> = {
  college:         { table: "colleges",         nameField: "name",  label: "Colleges",         icon: GraduationCap, hasRefreshTs: true,  publicPath: "/college/" },
  college_section: { table: "college_sections", nameField: "title", label: "College Sections", icon: Layers,        hasRefreshTs: false },
  article:         { table: "articles",         nameField: "title", label: "Blogs / Articles", icon: FileText,      hasRefreshTs: true,  publicPath: "/article/" },
  institute:       { table: "institutes",       nameField: "name",  label: "Institutes",       icon: Building2,     hasRefreshTs: true,  publicPath: "/institute/" },
  course:          { table: "courses",          nameField: "name",  label: "Courses",          icon: BookOpen,      hasRefreshTs: false },
};

const FRESHNESS_OPTIONS = [
  { value: "all",   label: "All entities" },
  { value: "never", label: "Never refreshed" },
  { value: "30d",   label: "Not refreshed in 30+ days" },
  { value: "90d",   label: "Not refreshed in 90+ days" },
  { value: "180d",  label: "Not refreshed in 180+ days" },
];

const STATUS_COLOR: Record<Status, string> = {
  pending:    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved:   "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected:   "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  failed:     "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  generating: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
};

function renderValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}
function isHtmlField(v: any) {
  return typeof v === "string" && /<\/?[a-z][\s\S]*>/i.test(v);
}

async function getFunctionErrorMessage(error: any): Promise<string> {
  const context = error?.context;
  if (context && typeof context.text === "function") {
    try {
      const text = await context.text();
      const parsed = JSON.parse(text);
      return parsed?.error || parsed?.message || text || error.message;
    } catch {
      return error.message;
    }
  }
  return error?.message || "Refresh failed";
}

const AdminContentStudio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ---------- Selection State ----------
  const [entityType, setEntityType] = useState<EntityType>("college");
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [freshness, setFreshness] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ---------- Run State ----------
  const [mode, setMode] = useState<"smart" | "full">("smart");
  const [concurrency, setConcurrency] = useState(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, succeeded: 0, failed: 0 });
  const [errors, setErrors] = useState<{ name: string; error: string }[]>([]);

  // ---------- Paste & Match State ----------
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<{ matched: number; unmatched: string[] } | null>(null);

  // ---------- Review Queue State ----------
  const [queue, setQueue] = useState<RefreshRow[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueTab, setQueueTab] = useState<Status | "all">("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);

  // Tab between Generate vs Review
  const [mainTab, setMainTab] = useState<"generate" | "review">("generate");

  const config = ENTITY_CONFIG[entityType];

  /* ========== Load entity rows ========== */
  const fetchRows = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      if (entityType === "college_section") {
        // Sections live in college_sections, joined with colleges for display
        const { data, error } = await supabase
          .from("college_sections")
          .select("id, title, section_type, college_id, colleges!inner(name, slug)")
          .order("updated_at", { ascending: false })
          .limit(2000);
        if (error) throw error;
        const normalized: EntityRow[] = (data || []).map((r: any) => ({
          id: r.id,
          name: `${r.colleges?.name || "Unknown college"} — ${r.title || r.section_type}`,
          slug: r.colleges?.slug,
          parent_label: r.section_type,
        }));
        setRows(normalized);
      } else {
        const cols = ["id", config.nameField, "slug"];
        if (entityType === "college" || entityType === "institute") cols.push("city", "state");
        if (config.hasRefreshTs) cols.push("last_seo_refresh");
        const { data, error } = await supabase
          .from(config.table as any)
          .select(cols.join(","))
          .order(config.nameField, { ascending: true })
          .limit(2000);
        if (error) throw error;
        const normalized: EntityRow[] = (data || []).map((r: any) => ({
          id: r.id,
          name: r[config.nameField] || "Untitled",
          slug: r.slug,
          city: r.city,
          state: r.state,
          last_seo_refresh: r.last_seo_refresh,
        }));
        setRows(normalized);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Failed to load", description: msg, variant: "destructive" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [entityType]);

  /* ========== Load review queue ========== */
  const loadQueue = async (showToast = false) => {
    setQueueLoading(true);
    const { data, error } = await supabase
      .from("content_refreshes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Queue load failed", description: error.message, variant: "destructive" });
    } else {
      const list = (data as unknown as RefreshRow[]) || [];
      setQueue(list);
      if (showToast) toast({ title: "Queue refreshed", description: `Loaded ${list.length} item(s).` });
    }
    setQueueLoading(false);
  };

  useEffect(() => {
    loadQueue();
    const ch = supabase
      .channel("content_studio_queue")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "content_refreshes" }, () => loadQueue())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ========== Filtering ========== */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (q && !(
        r.name?.toLowerCase().includes(q) ||
        r.slug?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q)
      )) return false;
      if (freshness !== "all" && config.hasRefreshTs) {
        if (freshness === "never") {
          if (r.last_seo_refresh) return false;
        } else {
          const days = parseInt(freshness);
          if (!r.last_seo_refresh) return true;
          const ageDays = (Date.now() - new Date(r.last_seo_refresh).getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays < days) return false;
        }
      }
      return true;
    });
  }, [rows, search, freshness, config.hasRefreshTs]);

  /* ========== Selection Helpers ========== */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllFiltered = () => {
    if (filtered.every(r => selectedIds.has(r.id))) {
      const next = new Set(selectedIds);
      filtered.forEach(r => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach(r => next.add(r.id));
      setSelectedIds(next);
    }
  };
  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

  /* ========== Paste & Match ========== */
  const extractSlug = (token: string): string => {
    let t = token.trim();
    if (!t) return "";
    t = t.split("?")[0].split("#")[0];
    if (t.includes("://") || t.startsWith("/")) {
      const parts = t.replace(/^https?:\/\/[^/]+/, "").split("/").filter(Boolean);
      if (parts.length > 0) t = parts[parts.length - 1];
    }
    return t.replace(/\/+$/, "").trim();
  };
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const matchPasted = () => {
    const tokens = pasteText.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
      toast({ title: "Nothing to match", description: "Paste URLs, slugs, or names.", variant: "destructive" });
      return;
    }
    const next = new Set(selectedIds);
    const unmatched: string[] = [];
    let newlyMatched = 0;
    for (const raw of tokens) {
      const slugCandidate = extractSlug(raw).toLowerCase();
      const nameCandidate = norm(raw);
      let hit = rows.find(r => r.slug && r.slug.toLowerCase() === slugCandidate);
      if (!hit) hit = rows.find(r => norm(r.name) === nameCandidate);
      if (!hit) hit = rows.find(r =>
        (r.slug && slugCandidate.length >= 4 && r.slug.toLowerCase().includes(slugCandidate)) ||
        (nameCandidate.length >= 4 && norm(r.name).includes(nameCandidate))
      );
      if (hit) {
        if (!next.has(hit.id)) newlyMatched++;
        next.add(hit.id);
      } else unmatched.push(raw);
    }
    setSelectedIds(next);
    setPasteResult({ matched: tokens.length - unmatched.length, unmatched });
    toast({
      title: `Matched ${tokens.length - unmatched.length}/${tokens.length}`,
      description: `${newlyMatched} newly added${unmatched.length ? ` • ${unmatched.length} not found` : ""}.`,
      variant: unmatched.length === tokens.length ? "destructive" : "default",
    });
  };
  const clearPaste = () => { setPasteText(""); setPasteResult(null); };

  /* ========== Run Bulk Refresh ========== */
  const start = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast({ title: "Nothing selected", description: "Pick at least one entity.", variant: "destructive" });
      return;
    }
    if (!confirm(
      `Queue ${mode === "full" ? "FULL REWRITE" : "smart refresh"} for ${ids.length} ${config.label.toLowerCase()}?\n\n` +
      `• Each one will be regenerated by gpt-5-mini\n` +
      `• Results land below in the Review tab\n` +
      `• Nothing goes live until you approve\n\n` +
      `Estimated time: ~${Math.ceil(ids.length * 8 / concurrency)}s at concurrency ${concurrency}.`
    )) return;

    setRunning(true);
    setErrors([]);
    setProgress({ done: 0, total: ids.length, succeeded: 0, failed: 0 });
    const { data: { user } } = await supabase.auth.getUser();
    const idToName = new Map(rows.map(r => [r.id, r.name]));
    let done = 0, succeeded = 0, failed = 0;
    const failures: { name: string; error: string }[] = [];

    for (let i = 0; i < ids.length; i += concurrency) {
      const batch = ids.slice(i, i + concurrency);
      await Promise.all(batch.map(async (id) => {
        try {
          const { error } = await supabase.functions.invoke("refresh-content", {
            body: { entity_type: entityType, entity_id: id, mode, requested_by: user?.id },
          });
          if (error) {
            failed++;
            failures.push({ name: idToName.get(id) || id, error: await getFunctionErrorMessage(error) });
          } else succeeded++;
        } catch (e) {
          failed++;
          failures.push({ name: idToName.get(id) || id, error: e instanceof Error ? e.message : "Unknown" });
        }
        done++;
        setProgress({ done, total: ids.length, succeeded, failed });
      }));
    }
    setErrors(failures);
    setRunning(false);
    toast({
      title: "Bulk refresh complete",
      description: `${succeeded}/${ids.length} queued. Switch to Review tab to approve.`,
    });
    loadQueue();
    if (succeeded > 0) setMainTab("review");
  };

  /* ========== Review Queue ========== */
  const queueFiltered = useMemo(() => {
    if (queueTab === "all") return queue;
    return queue.filter(r => r.status === queueTab);
  }, [queue, queueTab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: queue.length, pending: 0, approved: 0, rejected: 0, failed: 0, generating: 0 };
    queue.forEach(r => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [queue]);

  const open = useMemo(() => queue.find(r => r.id === openId) || null, [queue, openId]);
  const changedFieldNames = useMemo(() => {
    if (!open) return [] as string[];
    return Object.entries(open.diff).filter(([, v]) => v.changed).map(([k]) => k);
  }, [open]);

  useEffect(() => {
    if (open) setSelectedFields(new Set(changedFieldNames));
    else setSelectedFields(new Set());
  }, [openId, changedFieldNames.length]);

  const act = async (action: "approve" | "reject", selectedOnly = false) => {
    if (!open) return;
    setActing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("apply-content-refresh", {
        body: {
          refresh_id: open.id,
          action,
          reviewed_by: user?.id,
          selected_fields: selectedOnly ? Array.from(selectedFields) : undefined,
        },
      });
      if (error) throw error;
      toast({
        title: action === "approve" ? "Published" : "Rejected",
        description: action === "approve"
          ? `${(data as any)?.fields_applied || 0} field(s) updated on the live page.`
          : "Refresh discarded.",
      });
      setOpenId(null);
      loadQueue();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Action failed", variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  /* ========== Render ========== */
  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-600" /> Content Studio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          One place to <strong>select</strong> (browse, manual, paste), <strong>regenerate</strong> in bulk, then <strong>review &amp; approve</strong> — for Colleges, College Sections, Articles, Institutes &amp; Courses.
        </p>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="generate" className="gap-2">
            <Wand2 className="w-4 h-4" /> 1. Select &amp; Generate
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <Eye className="w-4 h-4" /> 2. Review &amp; Approve
            {counts.pending > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-amber-100 text-amber-800">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ============ GENERATE TAB ============ */}
        <TabsContent value="generate" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1 — Pick what to refresh</CardTitle>
              <CardDescription>
                Choose entity type, then filter, browse-and-tick, or paste URLs/slugs/names.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entity Type Pills */}
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ENTITY_CONFIG) as EntityType[]).map(k => {
                  const Icon = ENTITY_CONFIG[k].icon;
                  const active = entityType === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setEntityType(k)}
                      disabled={running}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                        active
                          ? "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100 font-semibold"
                          : "border-border bg-background hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {ENTITY_CONFIG[k].label}
                    </button>
                  );
                })}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Freshness</Label>
                  <Select value={freshness} onValueChange={setFreshness} disabled={running || !config.hasRefreshTs}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FRESHNESS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Search</Label>
                  <Input
                    placeholder="Filter by name, slug, or city…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={running}
                  />
                </div>
              </div>

              {/* Selection Methods */}
              <Tabs defaultValue="browse" className="pt-2 border-t">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                  <TabsTrigger value="browse" className="gap-2">
                    <ListChecks className="w-4 h-4" /> Browse &amp; Tick
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="gap-2">
                    <Wand2 className="w-4 h-4" /> Paste URLs / Slugs / Names
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="browse" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm text-muted-foreground">
                      {loading ? "Loading…" : (
                        <>
                          Showing <strong className="text-foreground">{filtered.length}</strong> of {rows.length} {config.label.toLowerCase()}
                          {selectedIds.size > 0 && <> • <strong className="text-violet-700">{selectedIds.size} selected</strong></>}
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading || running}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reload
                      </Button>
                      <Button variant="outline" size="sm" onClick={toggleSelectAllFiltered} disabled={loading || running || filtered.length === 0}>
                        {allFilteredSelected ? "Deselect" : "Select"} all ({filtered.length})
                      </Button>
                      {selectedIds.size > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={running}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-md max-h-[420px] overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No entities match your filters."}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filtered.map(r => {
                          const ageDays = r.last_seo_refresh
                            ? Math.floor((Date.now() - new Date(r.last_seo_refresh).getTime()) / (1000 * 60 * 60 * 24))
                            : null;
                          return (
                            <label key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer text-sm">
                              <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} disabled={running} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{r.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {r.slug && <span className="font-mono">/{r.slug}</span>}
                                  {r.city && <> • {r.city}{r.state ? `, ${r.state}` : ""}</>}
                                  {r.parent_label && <> • <span className="font-mono">{r.parent_label}</span></>}
                                </div>
                              </div>
                              {config.hasRefreshTs && (
                                <Badge variant="outline" className={
                                  ageDays === null ? "border-amber-300 text-amber-700"
                                  : ageDays > 90 ? "border-red-300 text-red-700"
                                  : ageDays > 30 ? "border-yellow-300 text-yellow-700"
                                  : "border-green-300 text-green-700"
                                }>
                                  {ageDays === null ? "Never" : ageDays === 0 ? "Today" : `${ageDays}d`}
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="space-y-3 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Paste one entry per line (or comma-separated). Auto-matches against <strong className="text-foreground">slugs, full URLs, or names</strong>.
                  </div>
                  <Textarea
                    placeholder={`Examples (mix freely):\nhttps://mbacompass.in/college/iim-ahmedabad\n/college/iim-bangalore\niim-calcutta\nIIM Lucknow\nXLRI Jamshedpur, FMS Delhi`}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    disabled={running || loading}
                    rows={8}
                    className="font-mono text-xs"
                  />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-muted-foreground">
                      {selectedIds.size > 0 && <strong className="text-violet-700">{selectedIds.size} currently selected</strong>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={clearPaste} disabled={running || !pasteText}>Clear text</Button>
                      {selectedIds.size > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={running}>
                          Clear selection
                        </Button>
                      )}
                      <Button onClick={matchPasted} disabled={running || loading || !pasteText.trim()} className="bg-violet-600 hover:bg-violet-700">
                        <Wand2 className="w-4 h-4 mr-2" /> Match &amp; Add
                      </Button>
                    </div>
                  </div>
                  {pasteResult && (
                    <div className={`rounded-md p-3 text-sm border ${pasteResult.unmatched.length === 0 ? "border-emerald-200 bg-emerald-50/60 text-emerald-900" : "border-amber-200 bg-amber-50/60 text-amber-900"}`}>
                      <div className="font-semibold mb-1 flex items-center gap-2">
                        {pasteResult.unmatched.length === 0
                          ? <><CheckCircle2 className="w-4 h-4" /> All {pasteResult.matched} entries matched.</>
                          : <><AlertCircle className="w-4 h-4" /> Matched {pasteResult.matched} • {pasteResult.unmatched.length} not found.</>}
                      </div>
                      {pasteResult.unmatched.length > 0 && (
                        <>
                          <div className="text-xs mb-1">Couldn't find these:</div>
                          <ul className="text-xs font-mono space-y-0.5 max-h-32 overflow-y-auto">
                            {pasteResult.unmatched.map((u, i) => <li key={i}>• {u}</li>)}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Step 2: Mode + Run */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2 — Choose mode &amp; run</CardTitle>
              <CardDescription>Smart refresh = light cleanup. Full rewrite = complete regeneration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Mode</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as any)} disabled={running}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smart">Smart Refresh (light)</SelectItem>
                      <SelectItem value="full">Full Rewrite (heavy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Concurrency</Label>
                  <Select value={String(concurrency)} onValueChange={(v) => setConcurrency(parseInt(v))} disabled={running}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 8].map(n => <SelectItem key={n} value={String(n)}>{n} parallel</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    size="lg"
                    onClick={start}
                    disabled={running || selectedIds.size === 0}
                    className={`w-full ${mode === "full" ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  >
                    {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (mode === "full" ? <Sparkles className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />)}
                    {running ? "Running…" : `Run on ${selectedIds.size || 0}`}
                  </Button>
                </div>
              </div>

              {(running || progress.done > 0) && (
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progress: {progress.done} / {progress.total}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {progress.succeeded}</span>
                      {progress.failed > 0 && <span className="text-red-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {progress.failed}</span>}
                    </div>
                  </div>
                  <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
                  {!running && progress.done === progress.total && progress.succeeded > 0 && (
                    <div className="text-sm text-emerald-700 font-medium pt-1">
                      ✓ Done. <button className="underline" onClick={() => setMainTab("review")}>Switch to Review tab</button> to approve.
                    </div>
                  )}
                </div>
              )}

              {errors.length > 0 && (
                <div className="border border-red-200 bg-red-50/60 rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="font-semibold text-sm text-red-900 mb-2">Failures ({errors.length})</div>
                  <ul className="text-xs space-y-1">
                    {errors.map((e, i) => (
                      <li key={i} className="text-red-800"><strong>{e.name}:</strong> {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ REVIEW TAB ============ */}
        <TabsContent value="review" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" /> Review &amp; Approve
                </CardTitle>
                <CardDescription>Side-by-side diff. Approve fields you want to publish.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadQueue(true)} disabled={queueLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${queueLoading ? "animate-spin" : ""}`} />
                {queueLoading ? "Reloading..." : "Reload"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={queueTab} onValueChange={(v) => setQueueTab(v as any)}>
                <TabsList className="flex flex-wrap h-auto">
                  <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                  <TabsTrigger value="generating">Generating ({counts.generating})</TabsTrigger>
                  <TabsTrigger value="approved">Published ({counts.approved})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
                  <TabsTrigger value="failed">Failed ({counts.failed})</TabsTrigger>
                  <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                </TabsList>
              </Tabs>

              {queueLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : queueFiltered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No items {queueTab !== "all" ? `with status "${queueTab}"` : "yet"}. Generate some from the first tab.
                </div>
              ) : (
                <div className="grid gap-3">
                  {queueFiltered.map((r) => {
                    const changed = Object.values(r.diff || {}).filter((d: any) => d?.changed).length;
                    const total = Object.keys(r.diff || {}).length;
                    const cfg = ENTITY_CONFIG[r.entity_type as EntityType];
                    return (
                      <div key={r.id} className="border rounded-lg p-3 hover:border-primary/40 transition-colors flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{cfg?.label || r.entity_type}</Badge>
                            <Badge variant="outline" className={`text-xs ${STATUS_COLOR[r.status]}`}>{r.status}</Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              {r.refresh_mode === "full" ? <Sparkles className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                              {r.refresh_mode}
                            </Badge>
                            {r.status === "pending" && (
                              <span className="text-xs text-muted-foreground">{changed}/{total} fields changed</span>
                            )}
                            {r.error_message && <span className="text-xs text-rose-600 truncate">{r.error_message}</span>}
                          </div>
                          <div className="mt-1 font-medium truncate">{r.entity_name || r.entity_slug || r.entity_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at))} ago
                            {r.published_at && ` • Published ${formatDistanceToNow(new Date(r.published_at))} ago`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.entity_slug && cfg?.publicPath && (
                            <Button asChild size="sm" variant="ghost">
                              <a href={`${cfg.publicPath}${r.entity_slug}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />Live
                              </a>
                            </Button>
                          )}
                          <Button size="sm" onClick={() => setOpenId(r.id)} disabled={r.status === "generating"}>
                            <Eye className="h-4 w-4 mr-1" />Review
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ Review Diff Dialog ============ */}
      <Dialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>{open?.entity_name || "Review refresh"}</span>
              {open && (
                <>
                  <Badge variant="outline">{ENTITY_CONFIG[open.entity_type as EntityType]?.label || open.entity_type}</Badge>
                  <Badge variant="outline" className={STATUS_COLOR[open.status]}>{open.status}</Badge>
                  <Badge variant="outline">{open.refresh_mode} mode</Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {open && (
            <>
              <div className="text-xs text-muted-foreground pb-2">
                Tick the fields you want to publish. Unchanged fields are hidden.
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-3 -mr-3">
                <div className="space-y-4">
                  {Object.entries(open.diff)
                    .sort(([, a], [, b]) => Number(b.changed) - Number(a.changed))
                    .map(([field, d]) => {
                      if (!d.changed) return null;
                      const before = renderValue(d.before);
                      const after = renderValue(d.after);
                      const html = isHtmlField(d.before) || isHtmlField(d.after);
                      const checked = selectedFields.has(field);
                      return (
                        <Card key={field} className={checked ? "border-primary/50" : ""}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setSelectedFields((s) => {
                                    const next = new Set(s);
                                    if (v) next.add(field); else next.delete(field);
                                    return next;
                                  });
                                }}
                                disabled={open.status !== "pending"}
                              />
                              <CardTitle className="text-sm font-mono">{field}</CardTitle>
                              <Badge variant="outline" className="text-xs ml-auto">changed</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="grid md:grid-cols-2 gap-3 pt-0">
                            <div className="rounded border border-rose-500/30 bg-rose-500/5 p-3">
                              <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 mb-1">Current</div>
                              {html ? (
                                <div className="prose prose-sm max-w-none dark:prose-invert text-xs" dangerouslySetInnerHTML={{ __html: before }} />
                              ) : (
                                <pre className="text-xs whitespace-pre-wrap break-words">{before}</pre>
                              )}
                            </div>
                            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
                              <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1">Refreshed</div>
                              {html ? (
                                <div className="prose prose-sm max-w-none dark:prose-invert text-xs" dangerouslySetInnerHTML={{ __html: after }} />
                              ) : (
                                <pre className="text-xs whitespace-pre-wrap break-words">{after}</pre>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  {changedFieldNames.length === 0 && (
                    <div className="text-center text-muted-foreground py-10 text-sm">
                      No field changes were proposed — content is already current.
                    </div>
                  )}
                </div>
              </div>

              {open.status === "pending" && (
                <div className="border-t pt-3 flex flex-col sm:flex-row gap-2 justify-end">
                  <Button variant="outline" onClick={() => act("reject")} disabled={acting}>
                    <X className="h-4 w-4 mr-1" />Reject
                  </Button>
                  <Button onClick={() => act("approve", true)} disabled={acting || selectedFields.size === 0}>
                    {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Approve &amp; Publish ({selectedFields.size})
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContentStudio;
