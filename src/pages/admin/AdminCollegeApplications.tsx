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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  CalendarDays,
  Copy,
  Eye,
  IndianRupee,
  MoreHorizontal,
  MousePointerClick,
  Pencil,
  Plus,
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
  formatDate,
  matchesCategory,
  matchesDeadlineFilter,
} from "@/lib/applicationTracker";

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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.375rem] font-semibold text-foreground">College Applications</h1>
          <p className="text-sm text-muted-foreground">
            Manage colleges, exams, deadlines and student applications.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More application actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>More actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Bulk import
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkSeoOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" /> Bulk AI SEO
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-1.5" onClick={() => { setFormRow(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Application</span><span className="sm:hidden">Add</span>
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

        {/* Applications listing */}
        <TabsContent value="applications" className="space-y-4 pt-4">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
              <Input className="min-w-0" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search college, exam or programme" />
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
              <Button variant={showArchived ? "default" : "outline"} className="gap-1.5 lg:justify-self-end" onClick={() => setShowArchived((v) => !v)}>
                <Archive className="h-4 w-4" /> {showArchived ? "Viewing archived" : "View archived"}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <p className="min-w-0 text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{rows.length}</span> of {showArchived ? all.filter((r) => r.is_archived).length : all.filter((r) => !r.is_archived).length} records
            </p>
            {(search || category !== "all" || deadlineFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategory("all"); setDeadlineFilter("all"); }}>
                Clear filters
              </Button>
            )}
          </div>

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
            <div className="grid gap-3 xl:grid-cols-2">
              {rows.map((row) => {
                const deadline = deadlineInfo(row);
                return (
                  <Card key={row.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                            {row.logo_url ? (
                              <img src={row.logo_url} alt="" loading="lazy" decoding="async" className="h-9 w-9 object-contain" />
                            ) : (
                              <span className="font-semibold text-primary">{row.name.slice(0, 1)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{row.name}</p>
                            <p className="truncate text-sm text-muted-foreground">{row.program || row.location || "No programme added"}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge variant="secondary">{CATEGORY_LABEL[row.category] ?? row.category}</Badge>
                              <Badge variant={row.is_active ? "default" : "outline"}>{row.is_active ? "Live" : "Inactive"}</Badge>
                              {row.is_recommended && <Badge variant="outline">Recommended</Badge>}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0" aria-label={`More actions for ${row.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Manage record</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSeoRow(row)}><Sparkles className="mr-2 h-4 w-4" /> AI SEO</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void duplicate(row)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleFlag(row, "is_active")}>
                              <Eye className="mr-2 h-4 w-4" /> {row.is_active ? "Make inactive" : "Make live"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleFlag(row, "is_archived")}>
                              <Archive className="mr-2 h-4 w-4" /> {row.is_archived ? "Restore" : "Archive"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToDelete(row)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 gap-px border-y border-border bg-border sm:grid-cols-4">
                        <div className="bg-card p-3">
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Deadline</p>
                          <p className="mt-1 font-medium text-foreground">{formatDate(row.application_deadline)}</p>
                          <p className="text-sm text-muted-foreground">{deadline.label}</p>
                        </div>
                        <div className="bg-card p-3">
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" /> Application</p>
                          <p className="mt-1 font-medium text-foreground">{formatFee(row.application_fee)}</p>
                        </div>
                        <div className="bg-card p-3">
                          <p className="text-sm text-muted-foreground">Page activity</p>
                          <p className="mt-1 font-medium text-foreground">{row.view_count} views</p>
                          <p className="text-sm text-muted-foreground">{row.apply_click_count} apply clicks</p>
                        </div>
                        <div className="bg-card p-3">
                          <p className="text-sm text-muted-foreground">Students</p>
                          <p className="mt-1 font-medium text-foreground">{trackedCount[row.id] ?? 0} tracking</p>
                          <p className="text-sm text-muted-foreground">Order {row.display_order}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end p-3">
                        <Button size="sm" className="gap-1.5" onClick={() => { setFormRow(row); setFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" /> Edit details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
