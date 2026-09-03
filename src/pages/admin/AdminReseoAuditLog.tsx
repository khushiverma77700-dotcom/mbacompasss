import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Download, Search, FileText, Loader2 } from "lucide-react";

type AuditRow = {
  id: string;
  run_id: string | null;
  item_id: string | null;
  url: string;
  slug: string | null;
  page_type: string | null;
  page_name: string | null;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  primary_keyword: string | null;
  secondary_keyword: string | null;
  score_before: number | null;
  score_after: number | null;
  changes: Record<string, { before: any; after: any }>;
  before_snapshot: any;
  after_snapshot: any;
  notes: string | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  run_created: "bg-slate-100 text-slate-700 border-slate-200",
  item_queued: "bg-slate-100 text-slate-700 border-slate-200",
  item_started: "bg-blue-100 text-blue-700 border-blue-200",
  item_completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  item_applied: "bg-green-100 text-green-700 border-green-200",
  item_discarded: "bg-amber-100 text-amber-700 border-amber-200",
  item_failed: "bg-red-100 text-red-700 border-red-200",
  item_cancelled: "bg-orange-100 text-orange-700 border-orange-200",
};

function fmt(v: any) {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export default function AdminReseoAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [runFilter, setRunFilter] = useState<string>("");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase.from("seo_reoptimization_audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      if (runFilter.trim()) q = q.eq("run_id", runFilter.trim());
      const { data, error } = await q;
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      console.error("[audit] load failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [actionFilter, runFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.url?.toLowerCase().includes(q)
      || r.slug?.toLowerCase().includes(q)
      || r.page_name?.toLowerCase().includes(q)
      || r.primary_keyword?.toLowerCase().includes(q)
      || r.notes?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const exportCsv = () => {
    const header = ["timestamp", "action", "url", "slug", "page_type", "primary_keyword", "score_before", "score_after", "changed_fields", "actor_role", "notes"].join(",");
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    const lines = filtered.map(r => [
      r.created_at, r.action, r.url, r.slug || "", r.page_type || "",
      r.primary_keyword || "", r.score_before ?? "", r.score_after ?? "",
      Object.keys(r.changes || {}).join("|"), r.actor_role || "", r.notes || "",
    ].map(escape).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reseo-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" /> Re-SEO Audit Log
            </CardTitle>
            <CardDescription>
              Every Re-SEO event ever recorded — run creation, item start/completion, apply, discard, failure — with the exact before/after diff per URL.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" />CSV ({filtered.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search URL, slug, keyword, notes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="run_created">Run created</SelectItem>
                <SelectItem value="item_started">Item started</SelectItem>
                <SelectItem value="item_completed">Item completed (preview)</SelectItem>
                <SelectItem value="item_applied">Item applied</SelectItem>
                <SelectItem value="item_discarded">Item discarded</SelectItem>
                <SelectItem value="item_failed">Item failed</SelectItem>
                <SelectItem value="item_cancelled">Run cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Filter by run_id (optional)" value={runFilter} onChange={(e) => setRunFilter(e.target.value)} />
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>URL / Page</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Changed fields</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {loading ? "Loading…" : "No audit rows yet."}
                  </TableCell></TableRow>
                ) : filtered.map((r) => {
                  const changed = Object.keys(r.changes || {});
                  const delta = (r.score_after ?? 0) - (r.score_before ?? 0);
                  return (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={ACTION_COLORS[r.action] || ""}>{r.action.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="max-w-[280px] truncate" title={r.url}>
                        <div className="font-medium truncate">{r.page_name || r.slug || r.url}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.url}</div>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">{r.primary_keyword || "—"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.score_before != null || r.score_after != null ? (
                          <>{r.score_before ?? "—"} → {r.score_after ?? "—"}
                            {(r.score_before != null && r.score_after != null) && (
                              <span className={delta >= 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}>({delta >= 0 ? "+" : ""}{delta})</span>
                            )}
                          </>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {changed.length ? <Badge variant="secondary">{changed.length} field{changed.length > 1 ? "s" : ""}</Badge> : <span className="text-muted-foreground">—</span>}
                        {changed.length > 0 && <div className="text-xs text-muted-foreground truncate mt-0.5">{changed.join(", ")}</div>}
                      </TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="h-7" onClick={() => setSelected(r)}>View</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Audit entry · {selected?.action.replace(/_/g, " ")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 text-sm">
                <div className="grid gap-2 md:grid-cols-2">
                  <div><span className="text-muted-foreground">When:</span> {new Date(selected.created_at).toLocaleString()}</div>
                  <div><span className="text-muted-foreground">Actor:</span> {selected.actor_role || "—"} {selected.actor_id ? `(${selected.actor_id.slice(0, 8)}…)` : ""}</div>
                  <div><span className="text-muted-foreground">Run:</span> <code className="text-xs">{selected.run_id || "—"}</code></div>
                  <div><span className="text-muted-foreground">Item:</span> <code className="text-xs">{selected.item_id || "—"}</code></div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">URL:</span> <a href={selected.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{selected.url}</a></div>
                  <div><span className="text-muted-foreground">Primary keyword:</span> {selected.primary_keyword || "—"}</div>
                  <div><span className="text-muted-foreground">Secondary keyword:</span> {selected.secondary_keyword || "—"}</div>
                  <div><span className="text-muted-foreground">Score:</span> {selected.score_before ?? "—"} → {selected.score_after ?? "—"}</div>
                  <div><span className="text-muted-foreground">Page type:</span> {selected.page_type || "—"}</div>
                </div>

                {selected.notes && <p className="p-2 rounded-[0.25rem] bg-muted text-xs">{selected.notes}</p>}

                {Object.keys(selected.changes || {}).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Field-level changes</h4>
                    <div className="space-y-3">
                      {Object.entries(selected.changes).map(([field, diff]) => (
                        <div key={field} className="border rounded-md overflow-hidden">
                          <div className="px-3 py-1.5 bg-muted text-xs font-medium">{field}</div>
                          <div className="grid md:grid-cols-2 divide-x">
                            <div className="p-2 bg-red-50">
                              <div className="text-xs font-semibold text-red-700 mb-1">BEFORE</div>
                              <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">{fmt(diff.before)}</pre>
                            </div>
                            <div className="p-2 bg-green-50">
                              <div className="text-xs font-semibold text-green-700 mb-1">AFTER</div>
                              <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">{fmt(diff.after)}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
