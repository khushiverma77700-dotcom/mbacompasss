import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Check, X, Eye, Loader2, ExternalLink, Sparkles, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Status = "pending" | "approved" | "rejected" | "failed" | "generating";

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

function renderValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

function isHtmlField(v: any) {
  return typeof v === "string" && /<\/?[a-z][\s\S]*>/i.test(v);
}

const STATUS_COLOR: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  failed: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  generating: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
};

const ENTITY_LABEL: Record<string, string> = {
  article: "Blog/Article",
  college: "College",
  institute: "Institute",
  course: "Course",
};

const ENTITY_PUBLIC_PATH: Record<string, string> = {
  article: "/article/",
  college: "/college/",
  institute: "/institute/",
  course: "/coaching/", // courses live under their institute; we'll fall back
};

export default function AdminContentRefreshes() {
  const [rows, setRows] = useState<RefreshRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status | "all">("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);

  const load = async (showToast = false) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_refreshes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
    } else {
      const list = (data as unknown as RefreshRow[]) || [];
      setRows(list);
      if (showToast) {
        toast({
          title: "Refreshed",
          description: list.length === 0
            ? "Queue is empty. Trigger a refresh from any College/Institute/Blog/Course admin page."
            : `Loaded ${list.length} refresh request${list.length === 1 ? "" : "s"}.`,
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("content_refreshes_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_refreshes" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, pending: 0, approved: 0, rejected: 0, failed: 0, generating: 0 };
    rows.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [rows]);

  const open = useMemo(() => rows.find((r) => r.id === openId) || null, [rows, openId]);

  const changedFieldNames = useMemo(() => {
    if (!open) return [] as string[];
    return Object.entries(open.diff)
      .filter(([, v]) => v.changed)
      .map(([k]) => k);
  }, [open]);

  // initialise selection to all changed fields when modal opens
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
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed";
      toast({ title: "Failed", description: msg, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" />
            Content Refresh Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Review AI-refreshed content side-by-side. Approve to publish to the live page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Reloading..." : "Reload"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="generating">Generating ({counts.generating})</TabsTrigger>
          <TabsTrigger value="approved">Published ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({counts.failed})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No refresh requests {tab !== "all" ? `with status "${tab}"` : "yet"}.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const changed = Object.values(r.diff || {}).filter((d: any) => d?.changed).length;
            const total = Object.keys(r.diff || {}).length;
            return (
              <Card key={r.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="py-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{ENTITY_LABEL[r.entity_type] || r.entity_type}</Badge>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLOR[r.status]}`}>{r.status}</Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        {r.refresh_mode === "full" ? <Sparkles className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                        {r.refresh_mode}
                      </Badge>
                      {r.status === "pending" && (
                        <span className="text-xs text-muted-foreground">{changed} of {total} fields changed</span>
                      )}
                      {r.error_message && <span className="text-xs text-rose-600 truncate">{r.error_message}</span>}
                    </div>
                    <div className="mt-1 font-medium truncate">{r.entity_name || r.entity_slug || r.entity_id}</div>
                    <div className="text-xs text-muted-foreground">
                      Requested {formatDistanceToNow(new Date(r.created_at))} ago
                      {r.published_at && ` • Published ${formatDistanceToNow(new Date(r.published_at))} ago`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.entity_slug && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={`${ENTITY_PUBLIC_PATH[r.entity_type] || "/"}${r.entity_slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />Live
                        </a>
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setOpenId(r.id)} disabled={r.status === "generating"}>
                      <Eye className="h-4 w-4 mr-1" />Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>{open?.entity_name || "Review refresh"}</span>
              {open && (
                <>
                  <Badge variant="outline">{ENTITY_LABEL[open.entity_type]}</Badge>
                  <Badge variant="outline" className={STATUS_COLOR[open.status]}>{open.status}</Badge>
                  <Badge variant="outline">{open.refresh_mode} mode</Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {open && (
            <>
              <div className="text-xs text-muted-foreground pb-2">
                Tick the fields you want to publish. Unchanged fields are hidden by default.
              </div>
              <ScrollArea className="flex-1 pr-3">
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
                                <div className="prose prose-sm max-w-none dark:prose-invert text-xs max-h-64 overflow-auto" dangerouslySetInnerHTML={{ __html: before }} />
                              ) : (
                                <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">{before}</pre>
                              )}
                            </div>
                            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
                              <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1">Refreshed</div>
                              {html ? (
                                <div className="prose prose-sm max-w-none dark:prose-invert text-xs max-h-64 overflow-auto" dangerouslySetInnerHTML={{ __html: after }} />
                              ) : (
                                <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">{after}</pre>
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
              </ScrollArea>

              {open.status === "pending" && (
                <div className="border-t pt-3 flex flex-col sm:flex-row gap-2 justify-end">
                  <Button variant="outline" onClick={() => act("reject")} disabled={acting}>
                    <X className="h-4 w-4 mr-1" />Reject
                  </Button>
                  <Button
                    onClick={() => act("approve", true)}
                    disabled={acting || selectedFields.size === 0}
                  >
                    {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Approve & Publish ({selectedFields.size} field{selectedFields.size === 1 ? "" : "s"})
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
