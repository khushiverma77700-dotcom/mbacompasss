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
import { RefreshCw, Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowLeft, ClipboardList, ListChecks, Wand2 } from "lucide-react";

type EntityType = "college" | "article" | "institute" | "course";

interface EntityRow {
  id: string;
  name: string;
  slug?: string | null;
  city?: string | null;
  state?: string | null;
  last_seo_refresh?: string | null;
}

const ENTITY_CONFIG: Record<EntityType, { table: string; nameField: string; label: string; hasRefreshTs: boolean }> = {
  college: { table: "colleges", nameField: "name", label: "Colleges", hasRefreshTs: true },
  article: { table: "articles", nameField: "title", label: "Articles", hasRefreshTs: true },
  institute: { table: "institutes", nameField: "name", label: "Institutes", hasRefreshTs: true },
  course: { table: "courses", nameField: "name", label: "Courses", hasRefreshTs: false },
};

const FRESHNESS_OPTIONS = [
  { value: "all", label: "All entities" },
  { value: "never", label: "Never refreshed" },
  { value: "30d", label: "Not refreshed in 30+ days" },
  { value: "90d", label: "Not refreshed in 90+ days" },
  { value: "180d", label: "Not refreshed in 180+ days" },
];

const AdminBulkRefresh = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entityType, setEntityType] = useState<EntityType>("college");
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [freshness, setFreshness] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"smart" | "full">("smart");
  const [concurrency, setConcurrency] = useState(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, succeeded: 0, failed: 0 });
  const [errors, setErrors] = useState<{ name: string; error: string }[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<{ matched: number; unmatched: string[] } | null>(null);

  const config = ENTITY_CONFIG[entityType];

  const fetchRows = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    const cols = ["id", config.nameField, "slug"];
    if (entityType === "college" || entityType === "institute") cols.push("city", "state");
    if (config.hasRefreshTs) cols.push("last_seo_refresh");
    const { data, error } = await supabase
      .from(config.table as any)
      .select(cols.join(","))
      .order(config.nameField, { ascending: true })
      .limit(2000);
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      const normalized = (data || []).map((r: any) => ({
        id: r.id,
        name: r[config.nameField] || "Untitled",
        slug: r.slug,
        city: r.city,
        state: r.state,
        last_seo_refresh: r.last_seo_refresh,
      }));
      setRows(normalized);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [entityType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (q && !(r.name?.toLowerCase().includes(q) || r.slug?.toLowerCase().includes(q) || r.city?.toLowerCase().includes(q))) return false;
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

  // Extract slug from a URL/path or treat the token as-is
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
      toast({ title: "Nothing to match", description: "Paste URLs, slugs, or names (one per line or comma-separated).", variant: "destructive" });
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
      } else {
        unmatched.push(raw);
      }
    }
    setSelectedIds(next);
    setPasteResult({ matched: tokens.length - unmatched.length, unmatched });
    toast({
      title: `Matched ${tokens.length - unmatched.length}/${tokens.length}`,
      description: `${newlyMatched} newly added to selection${unmatched.length ? ` • ${unmatched.length} not found` : ""}.`,
      variant: unmatched.length === tokens.length ? "destructive" : "default",
    });
  };

  const clearPaste = () => { setPasteText(""); setPasteResult(null); };


  const start = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast({ title: "Nothing selected", description: "Pick at least one entity to refresh.", variant: "destructive" });
      return;
    }
    if (!confirm(
      `Queue ${mode === "full" ? "FULL REWRITE" : "smart refresh"} for ${ids.length} ${config.label.toLowerCase()}?\n\n` +
      `• Each one will be regenerated by the AI engine (gpt-5-mini)\n` +
      `• Results land in the Content Refresh Queue for your approval\n` +
      `• Nothing goes live until you approve\n\n` +
      `Estimated time: ~${Math.ceil(ids.length * 8 / concurrency)} seconds at concurrency ${concurrency}.`
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
            failures.push({ name: idToName.get(id) || id, error: error.message });
          } else {
            succeeded++;
          }
        } catch (e) {
          failed++;
          failures.push({ name: idToName.get(id) || id, error: e instanceof Error ? e.message : "Unknown error" });
        }
        done++;
        setProgress({ done, total: ids.length, succeeded, failed });
      }));
    }
    setErrors(failures);
    setRunning(false);
    toast({
      title: "Bulk refresh complete",
      description: `${succeeded}/${ids.length} queued successfully${failed ? ` • ${failed} failed` : ""}. Open Content Refresh Queue to review & approve.`,
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-violet-600" /> Bulk Content Refresh
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Regenerate AI content across many entities at once. All results land in the Content Refresh Queue for your approval.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/content-refreshes")}>
          <ClipboardList className="w-4 h-4 mr-2" /> View Refresh Queue
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Pick what to refresh</CardTitle>
          <CardDescription>Choose entity type, then filter and select rows below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Entity Type</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)} disabled={running}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENTITY_CONFIG) as EntityType[]).map(k => (
                    <SelectItem key={k} value={k}>{ENTITY_CONFIG[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Freshness Filter</Label>
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

          <Tabs defaultValue="browse" className="pt-2 border-t">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="browse" className="gap-2"><ListChecks className="w-4 h-4" /> Browse & Tick</TabsTrigger>
              <TabsTrigger value="paste" className="gap-2"><Wand2 className="w-4 h-4" /> Paste URLs / Slugs / Names</TabsTrigger>
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
                    {allFilteredSelected ? "Deselect" : "Select"} all filtered ({filtered.length})
                  </Button>
                  {selectedIds.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={running} className="text-muted-foreground">
                      Clear selection
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
                        <label
                          key={r.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleSelect(r.id)}
                            disabled={running}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{r.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {r.slug && <span className="font-mono">/{r.slug}</span>}
                              {r.city && <> • {r.city}{r.state ? `, ${r.state}` : ""}</>}
                            </div>
                          </div>
                          {config.hasRefreshTs && (
                            <Badge variant="outline" className={
                              ageDays === null ? "border-amber-300 text-amber-700"
                              : ageDays > 90 ? "border-red-300 text-red-700"
                              : ageDays > 30 ? "border-yellow-300 text-yellow-700"
                              : "border-green-300 text-green-700"
                            }>
                              {ageDays === null ? "Never" : ageDays === 0 ? "Today" : `${ageDays}d ago`}
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
                Paste one entry per line (or comma-separated). We'll auto-match against <strong className="text-foreground">slugs, full URLs, or names</strong> and add matches to your selection.
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
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={running} className="text-muted-foreground">
                      Clear selection
                    </Button>
                  )}
                  <Button onClick={matchPasted} disabled={running || loading || !pasteText.trim()} className="bg-violet-600 hover:bg-violet-700">
                    <Wand2 className="w-4 h-4 mr-2" /> Match & Add to Selection
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
                      <div className="text-xs mb-1">Couldn't find these — check spelling or entity type:</div>
                      <ul className="text-xs font-mono space-y-0.5 max-h-32 overflow-y-auto">
                        {pasteResult.unmatched.map((u, i) => <li key={i}>• {u}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Concurrency (parallel requests)</Label>
              <Select value={String(concurrency)} onValueChange={(v) => setConcurrency(parseInt(v))} disabled={running}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 8].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                size="lg"
                onClick={start}
                disabled={running || selectedIds.size === 0}
                className={mode === "full" ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"}
              >
                {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (mode === "full" ? <Sparkles className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />)}
                {running ? "Running…" : `Start ${mode === "full" ? "Full Rewrite" : "Smart Refresh"} for ${selectedIds.size || 0}`}
              </Button>
            </div>
          </div>

          {(running || progress.done > 0) && (
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress: {progress.done} / {progress.total}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {progress.succeeded} succeeded</span>
                  {progress.failed > 0 && <span className="text-red-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {progress.failed} failed</span>}
                </div>
              </div>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              {!running && progress.done === progress.total && (
                <div className="text-sm text-emerald-700 font-medium pt-1">
                  ✓ Done. <button className="underline" onClick={() => navigate("/admin/content-refreshes")}>Open Content Refresh Queue</button> to review & approve.
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="border border-red-200 bg-red-50/60 rounded-md p-3 max-h-48 overflow-y-auto">
              <div className="font-semibold text-sm text-red-900 mb-2">Failures ({errors.length})</div>
              <ul className="text-xs space-y-1">
                {errors.map((e, i) => (
                  <li key={i} className="text-red-800">
                    <strong>{e.name}:</strong> {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBulkRefresh;
