import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Archive,
  BarChart3,
  Copy,
  ExternalLink,
  Eye,
  MousePointerClick,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import ApplicationFormDialog from "./collegeApplications/ApplicationFormDialog";
import BulkImportDialog from "./collegeApplications/BulkImportDialog";
import ActivityLogTab from "./collegeApplications/ActivityLogTab";
import StudentsTab from "./collegeApplications/StudentsTab";
import DocumentsTab from "./collegeApplications/DocumentsTab";
import RecommendedTab from "./collegeApplications/RecommendedTab";
import { SeoAssistDialog, BulkSeoDialog } from "./collegeApplications/SeoAssistDialog";
import {
  ADMIN_CATEGORY_FILTERS,
  CATEGORY_LABEL,
  DEADLINE_FILTERS,
  type DeadlineFilterKey,
  type TrackerCategory,
  type TrackerRow,
  TRACKER_SELECT,
  deadlineInfo,
  formatFee,
  matchesCategory,
  matchesDeadlineFilter,
} from "@/lib/applicationTracker";

type InlineEdit = Partial<
  Pick<
    TrackerRow,
    "application_deadline" | "application_open_date" | "application_fee" | "program_fee" | "category" | "status" | "apply_url"
  >
>;

const toDateInput = (v: string | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : "");

type Props = { initialTab?: string; initialAction?: string };

const VALID_TABS = ["dashboard", "applications", "documents", "recommended", "activity", "students"];

export default function AdminCollegeApplications({ initialTab, initialAction }: Props = {}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : "applications",
  );
  const [seoRow, setSeoRow] = useState<TrackerRow | null>(null);
  const [bulkSeoOpen, setBulkSeoOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | TrackerCategory>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterKey>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [edits, setEdits] = useState<Record<string, InlineEdit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formRow, setFormRow] = useState<TrackerRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TrackerRow | null>(null);

  // Sidebar links deep-link into a tab and can open the add / bulk dialog.
  useEffect(() => {
    if (initialTab && VALID_TABS.includes(initialTab)) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialAction === "add") {
      setFormRow(null);
      setFormOpen(true);
    }
    if (initialAction === "bulk") setImportOpen(true);
  }, [initialAction]);

  const trackersQuery = useQuery({
    queryKey: ["admin-application-trackers"],
    queryFn: async (): Promise<TrackerRow[]> => {
      const { data, error } = await supabase
        .from("application_trackers")
        .select(TRACKER_SELECT)
        .order("display_order", { ascending: true })
        .order("application_deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrackerRow[];
    },
  });

  const studentAppsQuery = useQuery({
    queryKey: ["admin-student-applications-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_applications").select("id, user_id, tracker_id, status");
      if (error) throw error;
      return (data ?? []) as { id: string; user_id: string; tracker_id: string; status: string }[];
    },
  });

  const all = useMemo(() => trackersQuery.data ?? [], [trackersQuery.data]);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-application-trackers"] });
    void queryClient.invalidateQueries({ queryKey: ["application-trackers", "public"] });
  };

  const missingSeo = useMemo(
    () => all.filter((r) => !r.is_archived && (!r.seo_title || !r.seo_description)),
    [all],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      if (r.is_archived !== showArchived) return false;
      if (!matchesCategory(r, category)) return false;
      if (!matchesDeadlineFilter(r, deadlineFilter)) return false;
      if (!q) return true;
      return `${r.name} ${r.program ?? ""} ${r.location ?? ""}`.toLowerCase().includes(q);
    });
  }, [all, search, category, deadlineFilter, showArchived]);

  const stats = useMemo(() => {
    const live = all.filter((r) => !r.is_archived);
    let open = 0;
    let today = 0;
    let week = 0;
    let clicks = 0;
    let views = 0;
    for (const r of live) {
      const info = deadlineInfo(r);
      if (info.isOpen) open += 1;
      if (info.daysLeft === 0) today += 1;
      if (info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 7) week += 1;
      clicks += r.apply_click_count;
      views += r.view_count;
    }
    const apps = studentAppsQuery.data ?? [];
    return {
      total: live.length,
      open,
      today,
      week,
      clicks,
      views,
      students: new Set(apps.map((a) => a.user_id)).size,
      started: apps.length,
      inProgress: apps.filter((a) => ["started", "in_progress"].includes(a.status)).length,
      completed: apps.filter((a) => ["submitted", "completed", "offer_received", "fee_paid"].includes(a.status)).length,
    };
  }, [all, studentAppsQuery.data]);

  const topColleges = useMemo(
    () =>
      [...all]
        .filter((r) => !r.is_archived)
        .sort((a, b) => b.apply_click_count - a.apply_click_count)
        .slice(0, 10),
    [all],
  );

  const trackedCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of studentAppsQuery.data ?? []) {
      map[a.tracker_id] = (map[a.tracker_id] ?? 0) + 1;
    }
    return map;
  }, [studentAppsQuery.data]);

  const setEdit = (id: string, patch: InlineEdit) =>
    setEdits((e) => ({ ...e, [id]: { ...(e[id] ?? {}), ...patch } }));

  const saveInline = async (row: TrackerRow) => {
    const patch = edits[row.id];
    if (!patch) return;
    if (patch.apply_url && !/^https?:\/\//i.test(patch.apply_url)) {
      toast({ title: "Apply URL must start with http:// or https://", variant: "destructive" });
      return;
    }
    setSavingId(row.id);
    const { error } = await supabase.from("application_trackers").update(patch as never).eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setEdits((e) => {
      const next = { ...e };
      delete next[row.id];
      return next;
    });
    toast({ title: `${row.name} updated`, description: "The change is live on the frontend." });
    refresh();
  };

  const toggleFlag = async (row: TrackerRow, field: "is_active" | "is_archived") => {
    const { error } = await supabase
      .from("application_trackers")
      .update({ [field]: !row[field] } as never)
      .eq("id", row.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${row.name} ${field === "is_active" ? (row.is_active ? "deactivated" : "activated") : row.is_archived ? "restored" : "archived"}` });
    refresh();
  };

  const duplicate = async (row: TrackerRow) => {
    const copy = {
      ...row,
      name: `${row.name} (Copy)`,
      slug: `${row.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
      view_count: 0,
      apply_click_count: 0,
    } as Record<string, unknown>;
    delete copy["id"];
    delete copy["created_at"];
    delete copy["updated_at"];
    const { error } = await supabase.from("application_trackers").insert(copy as never);
    if (error) {
      toast({ title: "Duplicate failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Application duplicated" });
    refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("application_trackers").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Application deleted" });
    refresh();
  };

  const metricCards = [
    { label: "Total applications", value: stats.total, icon: BarChart3 },
    { label: "Currently open", value: stats.open, icon: BarChart3 },
    { label: "Closing today", value: stats.today, icon: BarChart3 },
    { label: "Closing this week", value: stats.week, icon: BarChart3 },
    { label: "Total students", value: stats.students, icon: Users },
    { label: "Apply clicks", value: stats.clicks, icon: MousePointerClick },
    { label: "Applications started", value: stats.started, icon: BarChart3 },
    { label: "In progress", value: stats.inProgress, icon: BarChart3 },
    { label: "Completed / submitted", value: stats.completed, icon: BarChart3 },
    { label: "College views", value: stats.views, icon: Eye },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[1.375rem] font-semibold text-foreground">College Applications</h1>
          <p className="text-sm text-muted-foreground">
            Manage the application tracker, deadlines, documents, student activity and intent analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setBulkSeoOpen(true)}>
            <Wand2 className="h-4 w-4" /> Bulk AI SEO
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Bulk import
          </Button>
          <Button className="gap-1.5" onClick={() => { setFormRow(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Application
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="activity">Activity log</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        {/* Dashboard / analytics */}
        <TabsContent value="dashboard" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {metricCards.map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <c.icon className="h-4 w-4 text-primary" />
                    {c.label}
                  </div>
                  <p className="pt-1 text-[1.375rem] font-semibold text-foreground">{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">College-wise performance</CardTitle>
            </CardHeader>
            <CardContent>
              {trackersQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-xl" />
              ) : (
                <div className="overflow-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">College / Exam</th>
                        <th className="px-3 py-2 font-medium">Views</th>
                        <th className="px-3 py-2 font-medium">Apply clicks</th>
                        <th className="px-3 py-2 font-medium">Tracked applications</th>
                        <th className="px-3 py-2 font-medium">Deadline status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topColleges.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                          <td className="px-3 py-2">{r.view_count}</td>
                          <td className="px-3 py-2">{r.apply_click_count}</td>
                          <td className="px-3 py-2">{trackedCount[r.id] ?? 0}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline">{deadlineInfo(r).label}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications listing with inline editing */}
        <TabsContent value="applications" className="space-y-4 pt-4">
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-4">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search college, exam or programme" />
              <Select value={category} onValueChange={(v) => setCategory(v as "all" | TrackerCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_CATEGORY_FILTERS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deadlineFilter} onValueChange={(v) => setDeadlineFilter(v as DeadlineFilterKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEADLINE_FILTERS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant={showArchived ? "default" : "outline"} className="gap-1.5" onClick={() => setShowArchived((v) => !v)}>
                <Archive className="h-4 w-4" /> {showArchived ? "Viewing archived" : "View archived"}
              </Button>
            </CardContent>
          </Card>

          {trackersQuery.isLoading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="space-y-2 p-10 text-center">
                <p className="font-medium text-foreground">No applications here yet</p>
                <p className="text-sm text-muted-foreground">Add one manually or bulk import a CSV to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">College / Exam</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Opens</th>
                    <th className="px-3 py-2 font-medium">Deadline</th>
                    <th className="px-3 py-2 font-medium">App fee</th>
                    <th className="px-3 py-2 font-medium">Programme fee</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Apply URL</th>
                    <th className="px-3 py-2 font-medium">Activity</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const edit = edits[row.id] ?? {};
                    const dirty = Object.keys(edit).length > 0;
                    return (
                      <tr key={row.id} className="border-t border-border align-middle">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {row.logo_url && (
                              <img src={row.logo_url} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-md border border-border object-contain" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{row.name}</p>
                              <p className="truncate text-muted-foreground">{row.program || row.location || "—"}</p>
                            </div>
                            {!row.is_active && <Badge variant="outline">Inactive</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={edit.category ?? row.category}
                            onValueChange={(v) => setEdit(row.id, { category: v })}
                          >
                            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ADMIN_CATEGORY_FILTERS.filter((c) => c.key !== "all").map((c) => (
                                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            className="h-9 w-[150px]"
                            value={toDateInput(edit.application_open_date ?? row.application_open_date)}
                            onChange={(e) => setEdit(row.id, { application_open_date: e.target.value || null })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            className="h-9 w-[150px]"
                            value={toDateInput(edit.application_deadline ?? row.application_deadline)}
                            onChange={(e) =>
                              setEdit(row.id, {
                                application_deadline: e.target.value ? new Date(e.target.value).toISOString() : null,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            className="h-9 w-[110px]"
                            value={(edit.application_fee ?? row.application_fee ?? "").toString()}
                            onChange={(e) =>
                              setEdit(row.id, { application_fee: e.target.value === "" ? null : Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            className="h-9 w-[130px]"
                            value={(edit.program_fee ?? row.program_fee ?? "").toString()}
                            onChange={(e) =>
                              setEdit(row.id, { program_fee: e.target.value === "" ? null : Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select value={edit.status ?? row.status} onValueChange={(v) => setEdit(row.id, { status: v })}>
                            <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="upcoming">Upcoming</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="pt-1 text-muted-foreground">{deadlineInfo(row).label}</p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Input
                              className="h-9 w-[200px]"
                              value={edit.apply_url ?? row.apply_url ?? ""}
                              onChange={(e) => setEdit(row.id, { apply_url: e.target.value || null })}
                              placeholder="https://…"
                            />
                            {row.apply_url && (
                              <a href={row.apply_url} target="_blank" rel="noopener noreferrer" aria-label="Open apply URL">
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {row.view_count} views · {row.apply_click_count} clicks · {trackedCount[row.id] ?? 0} tracked
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1.5">
                            {dirty && (
                              <Button size="sm" className="gap-1.5" disabled={savingId === row.id} onClick={() => void saveInline(row)}>
                                <Save className="h-3.5 w-3.5" /> {savingId === row.id ? "Saving…" : "Save"}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => { setFormRow(row); setFormOpen(true); }} aria-label="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void duplicate(row)} aria-label="Duplicate">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void toggleFlag(row, "is_active")}>
                              {row.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSeoRow(row)} aria-label="AI SEO">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void toggleFlag(row, "is_archived")} aria-label="Archive">
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setToDelete(row)} aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Showing {rows.length} of {all.length} applications. Fees shown in the tracker:{" "}
            {formatFee(rows[0]?.application_fee ?? null)} onwards.
          </p>
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <DocumentsTab trackers={all} />
        </TabsContent>

        <TabsContent value="recommended" className="pt-4">
          <RecommendedTab trackers={all} />
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <ActivityLogTab trackers={all} />
        </TabsContent>

        <TabsContent value="students" className="pt-4">
          <StudentsTab />
        </TabsContent>
      </Tabs>

      <ApplicationFormDialog open={formOpen} onOpenChange={setFormOpen} row={formRow} onSaved={refresh} />
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} existing={all} onImported={refresh} />
      <SeoAssistDialog row={seoRow} onClose={() => setSeoRow(null)} onSaved={refresh} />
      <BulkSeoDialog
        open={bulkSeoOpen}
        rows={missingSeo}
        onClose={() => setBulkSeoOpen(false)}
        onDone={refresh}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the application and every tracked student record linked to it. Consider
              archiving instead — archived applications stay in the database but disappear from the frontend.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const CATEGORY_LABELS = CATEGORY_LABEL;
