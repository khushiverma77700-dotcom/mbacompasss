import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Wand2, Loader2, Sparkles, Search, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type EntityType = "article" | "college" | "institute" | "course";

const TABLES: Record<EntityType, { table: string; nameField: string; label: string }> = {
  college: { table: "colleges", nameField: "name", label: "Colleges" },
  article: { table: "articles", nameField: "title", label: "Articles" },
  institute: { table: "institutes", nameField: "name", label: "Institutes" },
  course: { table: "courses", nameField: "name", label: "Courses" },
};

const QUICK_PROMPTS = [
  "Update placements with 2025 figures and add citations",
  "Add internal links to other top IIMs/IIFTs/MDIs wherever they appear",
  "Refresh meta title & description for SEO (max 60/160 chars)",
  "Fix 'N/A' or 'Contact us' placeholders with realistic values",
  "Add a key-facts table at the top of the description",
  "Make the tone friendlier for first-time MBA aspirants",
];

interface Row {
  id: string;
  name: string;
  slug?: string | null;
}

interface JobItem {
  id: string;
  name: string;
  status: "pending" | "running" | "succeeded" | "failed";
  refresh_id?: string;
  changed?: number;
  total?: number;
  error?: string;
}

const AdminBulkAIEdit = () => {
  const [entityType, setEntityType] = useState<EntityType>("college");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [instruction, setInstruction] = useState("");
  const [job, setJob] = useState<JobItem[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const meta = TABLES[entityType];

  // Fetch entities
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setSelected({});
      const fields = `id, ${meta.nameField}${entityType !== "course" ? ", slug" : ""}`;
      const { data, error } = await supabase
        .from(meta.table as any)
        .select(fields)
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        toast({ title: "Failed to load", description: error.message, variant: "destructive" });
        setRows([]);
      } else {
        setRows(
          (data || []).map((r: any) => ({
            id: r.id,
            name: r[meta.nameField] || "Untitled",
            slug: r.slug ?? null,
          }))
        );
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [entityType, meta.nameField, meta.table]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || (r.slug || "").toLowerCase().includes(q));
  }, [rows, search]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const toggleAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    if (val) for (const r of filtered) next[r.id] = true;
    setSelected(next);
  };

  const runBulk = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Select at least one entity", variant: "destructive" });
      return;
    }
    if (instruction.trim().length < 8) {
      toast({ title: "Write a clear instruction", description: "Min 8 characters.", variant: "destructive" });
      return;
    }
    if (selectedIds.length > 50) {
      toast({ title: "Too many", description: "Max 50 entities per bulk run. Split into batches.", variant: "destructive" });
      return;
    }

    setRunning(true);
    setProgress(0);
    const items: JobItem[] = selectedIds.map((id) => {
      const r = rows.find((x) => x.id === id)!;
      return { id, name: r.name, status: "pending" };
    });
    setJob(items);

    const { data: { user } } = await supabase.auth.getUser();

    // Run sequentially to respect AI rate limits
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setJob((prev) => prev?.map((it, idx) => idx === i ? { ...it, status: "running" } : it) ?? null);

      try {
        const { data, error } = await supabase.functions.invoke("ai-edit-content", {
          body: {
            entity_type: entityType,
            entity_id: item.id,
            instruction: instruction.trim(),
            requested_by: user?.id,
          },
        });
        if (error) throw error;
        setJob((prev) => prev?.map((it, idx) => idx === i ? {
          ...it, status: "succeeded",
          refresh_id: (data as any)?.refresh_id,
          changed: (data as any)?.changed_fields,
          total: (data as any)?.total_fields,
        } : it) ?? null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AI failed";
        setJob((prev) => prev?.map((it, idx) => idx === i ? { ...it, status: "failed", error: msg } : it) ?? null);
      }

      setProgress(Math.round(((i + 1) / items.length) * 100));
      // Small spacing to avoid burst rate limiting
      await new Promise((r) => setTimeout(r, 600));
    }

    setRunning(false);
    toast({
      title: "Bulk AI edit finished",
      description: `${items.length} entities processed. Open the review queue to approve.`,
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);
  const someSelected = filtered.some((r) => selected[r.id]) && !allSelected;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Bulk AI Editor
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Apply one AI instruction across many colleges, articles, institutes or courses at once.
            All changes go to the <Link to="/admin/content-refreshes" className="text-primary hover:underline">Content Refresh Queue</Link> for your approval before going live.
          </p>
        </div>
        <Link to="/admin/content-refreshes">
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-4 w-4" /> Review Queue
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Pick entity type & select pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
            <TabsList>
              {(Object.keys(TABLES) as EntityType[]).map((t) => (
                <TabsTrigger key={t} value={t}>{TABLES[t].label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${meta.label.toLowerCase()}...`}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} selected · {filtered.length} shown · {rows.length} total
            </div>
          </div>

          <div className="border border-border rounded-lg max-h-[360px] overflow-y-auto">
            <div className="sticky top-0 bg-muted/60 backdrop-blur px-3 py-2 border-b border-border flex items-center gap-3">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => toggleAll(Boolean(v))}
                disabled={loading || filtered.length === 0}
              />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {allSelected ? "Deselect all" : "Select all visible"}
              </span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No matching entities.</div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition">
                    <Checkbox
                      checked={!!selected[r.id]}
                      onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [r.id]: Boolean(v) }))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                      {r.slug && <div className="text-xs text-muted-foreground truncate">/{r.slug}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Tell the AI what to change</CardTitle>
          <CardDescription>
            One instruction will be applied to every selected entity. The AI only touches what you ask.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bulk-instruction" className="text-sm font-medium">Instruction</Label>
            <Textarea
              id="bulk-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Update placement section with 2025 stats and interlink IIM-A wherever it appears"
              className="mt-1.5 min-h-[100px]"
              disabled={running}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <Badge
                key={p}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/10 hover:text-primary transition font-normal"
                onClick={() => setInstruction(p)}
              >
                {p}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Run</CardTitle>
          <CardDescription>
            Each entity is processed sequentially (≈10–30 seconds each). Limit per run: 50.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runBulk} disabled={running || selectedIds.length === 0} className="gap-2" size="lg">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {running ? `Processing… ${progress}%` : `Apply AI edit to ${selectedIds.length} entities`}
          </Button>

          {running && <Progress value={progress} className="h-2" />}

          {job && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Job results
              </div>
              <ul className="divide-y divide-border max-h-[360px] overflow-y-auto">
                {job.map((it) => (
                  <li key={it.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                    {it.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                    {it.status === "succeeded" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                    {it.status === "failed" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                    {it.status === "pending" && <div className="h-4 w-4 rounded-full border border-border shrink-0" />}
                    <span className="flex-1 truncate font-medium text-foreground">{it.name}</span>
                    {it.status === "succeeded" && (
                      <span className="text-xs text-muted-foreground">{it.changed}/{it.total} changed</span>
                    )}
                    {it.status === "failed" && (
                      <span className="text-xs text-destructive truncate max-w-[260px]" title={it.error}>{it.error}</span>
                    )}
                  </li>
                ))}
              </ul>
              {!running && (
                <div className="bg-muted/30 px-3 py-2 border-t border-border">
                  <Link to="/admin/content-refreshes">
                    <Button size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" /> Open Review Queue to approve
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBulkAIEdit;
