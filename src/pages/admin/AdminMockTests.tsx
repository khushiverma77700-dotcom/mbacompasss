import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Settings2, ExternalLink, Loader2, Sparkles, CheckSquare, Package, BookOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { slugify } from "@/lib/slugify";
import FileUpload from "@/components/admin/FileUpload";
import AIGenerateMockDialog from "@/components/admin/AIGenerateMockDialog";
import { useAdminFilters } from "@/hooks/useAdminFilters";

const SECTION_DEFAULTS = [
  { code: "VARC" as const, name: "Verbal Ability & Reading Comprehension", duration_minutes: 40, total_questions: 24, sort_order: 0 },
  { code: "DILR" as const, name: "Data Interpretation & Logical Reasoning", duration_minutes: 40, total_questions: 22, sort_order: 1 },
  { code: "QA" as const, name: "Quantitative Aptitude", duration_minutes: 40, total_questions: 22, sort_order: 2 },
];

type Form = {
  name: string;
  slug: string;
  description: string;
  banner_url: string;
  test_type: "full_length" | "sectional" | "topic_wise" | "practice_set";
  total_duration_minutes: number;
  pricing_type: "free" | "paid";
  price_inr: number;
  access_validity_days: number;
  difficulty: "easy" | "medium" | "hard";
  is_published: boolean;
  is_live: boolean;
  scheduled_start_at: string; // datetime-local string ("" when unset)
  sort_order: number;
  meta_title: string;
  meta_description: string;
};

const emptyForm: Form = {
  name: "",
  slug: "",
  description: "",
  banner_url: "",
  test_type: "full_length",
  total_duration_minutes: 120,
  pricing_type: "free",
  price_inr: 0,
  access_validity_days: 30,
  difficulty: "medium",
  is_published: false,
  is_live: false,
  scheduled_start_at: "",
  sort_order: 0,
  meta_title: "",
  meta_description: "",
};

// ISO -> "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
const isoToLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdminMockTests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { filters, setFilter } = useAdminFilters({
    storageKey: "admin.mockTests.filters",
    defaults: { category: "all", exam: "all", difficulty: "all", readiness: "all" },
    preserveKeys: ["edit"],
  });
  const categoryFilter = filters.category;
  const examFilter = filters.exam;
  const difficultyFilter = filters.difficulty;
  const readinessFilter = filters.readiness;
  const setCategoryFilter = (v: string) => setFilter("category", v);
  const setExamFilter = (v: string) => setFilter("exam", v);
  const setDifficultyFilter = (v: string) => setFilter("difficulty", v);
  const setReadinessFilter = (v: string) => setFilter("readiness", v);
  const [readinessSaving, setReadinessSaving] = useState<Record<string, boolean>>({});
  const [sortOrderDraft, setSortOrderDraft] = useState<Record<string, string>>({});
  const [sortOrderSaving, setSortOrderSaving] = useState<Record<string, boolean>>({});

  const updateSortOrder = async (id: string, raw: string) => {
    const parsed = parseInt(raw, 10);
    const value = Number.isFinite(parsed) ? parsed : 0;
    const current = tests.find((x) => x.id === id);
    if (current && (current.sort_order ?? 0) === value) {
      setSortOrderDraft((p) => { const n = { ...p }; delete n[id]; return n; });
      return;
    }
    setSortOrderSaving((p) => ({ ...p, [id]: true }));
    setTests((prev) => prev.map((x) => (x.id === id ? { ...x, sort_order: value } : x)));
    const { error } = await supabase.from("mock_tests").update({ sort_order: value }).eq("id", id);
    setSortOrderSaving((p) => ({ ...p, [id]: false }));
    setSortOrderDraft((p) => { const n = { ...p }; delete n[id]; return n; });
    if (error) {
      toast({ title: "Failed to update sort order", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sort order updated" });
    }
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bundleMap, setBundleMap] = useState<Record<string, { id: string; name: string; slug: string }[]>>({});
  const [courseMap, setCourseMap] = useState<Record<string, { id: string; name: string; slug: string }[]>>({});
  const [linkDialog, setLinkDialog] = useState<{ kind: "bundle" | "course"; testName: string; items: { id: string; name: string; slug: string }[] } | null>(null);

  const visibleTests = tests
    .filter((t) => categoryFilter === "all" || (t.category || t.test_type) === categoryFilter)
    .filter((t) => examFilter === "all" || t.exam_code === examFilter)
    .filter((t) => difficultyFilter === "all" || t.difficulty === difficultyFilter)
    .filter((t) => readinessFilter === "all" || (t.readiness_status || "incomplete") === readinessFilter);

  const updateReadiness = async (id: string, value: string) => {
    setReadinessSaving((p) => ({ ...p, [id]: true }));
    // optimistic
    setTests((prev) => prev.map((x) => (x.id === id ? { ...x, readiness_status: value } : x)));
    const { error } = await supabase.from("mock_tests").update({ readiness_status: value }).eq("id", id);
    setReadinessSaving((p) => ({ ...p, [id]: false }));
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      fetchTests();
    } else {
      toast({ title: "Readiness updated" });
    }
  };

  const readinessMeta: Record<string, { label: string; className: string }> = {
    ready: { label: "Ready", className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    needs_changes: { label: "Needs Changes", className: "bg-amber-100 text-amber-700 border-amber-300" },
    incomplete: { label: "Incomplete", className: "bg-rose-100 text-rose-700 border-rose-300" },
  };

  const allVisibleSelected = visibleTests.length > 0 && visibleTests.every((t) => selectedIds.includes(t.id));
  const toggleAllVisible = () => {
    if (allVisibleSelected) setSelectedIds((prev) => prev.filter((id) => !visibleTests.some((t) => t.id === id)));
    else setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleTests.map((t) => t.id)])));
  };
  const toggleRow = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const bulkUpdate = async (patch: Record<string, any>, label: string) => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const { error } = await supabase.from("mock_tests").update(patch).in("id", selectedIds);
    setBulkBusy(false);
    if (error) { toast({ title: "Bulk update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${selectedIds.length} mock(s) ${label}` });
    setSelectedIds([]);
    fetchTests();
  };


  const fetchTests = async () => {
    setLoading(true);
    const { data } = await supabase.from("mock_tests").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    setTests(data ?? []);
    setLoading(false);

    // Load bundle memberships per mock
    const { data: bItems } = await supabase
      .from("mock_bundle_items")
      .select("test_id, bundle:mock_bundles(id, name, slug)");
    const bMap: Record<string, { id: string; name: string; slug: string }[]> = {};
    const testToBundleIds: Record<string, string[]> = {};
    (bItems ?? []).forEach((row: any) => {
      if (!row.bundle) return;
      (bMap[row.test_id] ||= []).push({ id: row.bundle.id, name: row.bundle.name, slug: row.bundle.slug });
      (testToBundleIds[row.test_id] ||= []).push(row.bundle.id);
    });
    setBundleMap(bMap);

    // Load courses that include those bundles
    const { data: cLinks } = await supabase
      .from("course_bundles")
      .select("bundle_id, course:mba_compass_courses(id, title, slug)");
    const bundleToCourses: Record<string, { id: string; name: string; slug: string }[]> = {};
    (cLinks ?? []).forEach((row: any) => {
      if (!row.course) return;
      (bundleToCourses[row.bundle_id] ||= []).push({ id: row.course.id, name: row.course.title, slug: row.course.slug });
    });
    const cMap: Record<string, { id: string; name: string; slug: string }[]> = {};
    Object.entries(testToBundleIds).forEach(([testId, bundleIds]) => {
      const seen = new Set<string>();
      bundleIds.forEach((bid) => {
        (bundleToCourses[bid] ?? []).forEach((c) => {
          if (seen.has(c.id)) return;
          seen.add(c.id);
          (cMap[testId] ||= []).push(c);
        });
      });
    });
    setCourseMap(cMap);
  };
  useEffect(() => { fetchTests(); }, []);

  const startCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const startEdit = (t: any) => {
    setForm({
      name: t.name, slug: t.slug, description: t.description ?? "", banner_url: t.banner_url ?? "",
      test_type: t.test_type, total_duration_minutes: t.total_duration_minutes,
      pricing_type: t.pricing_type, price_inr: Number(t.price_inr), access_validity_days: t.access_validity_days,
      difficulty: t.difficulty, is_published: !!t.is_published, is_live: !!t.is_live,
      scheduled_start_at: isoToLocalInput(t.scheduled_start_at),
      sort_order: typeof t.sort_order === "number" ? t.sort_order : 0,
      meta_title: t.meta_title ?? "", meta_description: t.meta_description ?? "",
    });
    setEditId(t.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const slug = slugify(form.name); // always derived from name
    setSaving(true);
    // Mocks are always free at the mock level — monetization happens via bundles → courses.
    const scheduledISO = form.scheduled_start_at ? new Date(form.scheduled_start_at).toISOString() : null;
    const payload = {
      ...form,
      slug,
      pricing_type: "free" as const,
      price_inr: 0,
      scheduled_start_at: scheduledISO,
    };
    if (editId) {
      const { error } = await supabase.from("mock_tests").update(payload).eq("id", editId);
      if (error) {
        const dup = error.code === "23505" || /duplicate key|unique/i.test(error.message);
        toast({ title: dup ? "Duplicate name" : "Save failed", description: dup ? "A mock with this name already exists. Please pick a unique name." : error.message, variant: "destructive" });
        setSaving(false); return;
      }
      toast({ title: "Mock test updated" });
    } else {
      const { data, error } = await supabase.from("mock_tests").insert(payload).select("id").single();
      if (error || !data) {
        const dup = error?.code === "23505" || /duplicate key|unique/i.test(error?.message || "");
        toast({ title: dup ? "Duplicate name" : "Save failed", description: dup ? "A mock with this name already exists. Please pick a unique name." : error?.message, variant: "destructive" });
        setSaving(false); return;
      }
      // Seed default sections for full-length CAT mock
      if (form.test_type === "full_length") {
        const sections = SECTION_DEFAULTS.map(s => ({ ...s, test_id: data.id }));
        await supabase.from("mock_sections").insert(sections);
      }
      toast({ title: "Mock test created — now add questions" });
      setShowForm(false); setEditId(null); setForm(emptyForm);
      navigate(`/admin/mock-tests/${data.id}/builder`);
      return;
    }
    setSaving(false);
    setShowForm(false); setEditId(null); setForm(emptyForm);
    fetchTests();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes all sections, questions, attempts, and responses.`)) return;
    const { error } = await supabase.from("mock_tests").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mock test deleted" });
    fetchTests();
  };

  if (showForm) {
    return (
      <div className="max-w-3xl">
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Mock Tests
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Create"} Mock Test</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Test Name * <span className="text-muted-foreground">(must be unique)</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} placeholder="CAT Mock 01 — Full Length" />
              </div>
              <div>
                <Label className="text-xs">Slug <span className="text-muted-foreground">(auto)</span></Label>
                <Input value={form.slug || slugify(form.name)} readOnly className="bg-muted/40 cursor-not-allowed" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Test Type</Label>
                <Select value={form.test_type} onValueChange={(v: any) => setForm({ ...form, test_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_length">Full Length</SelectItem>
                    <SelectItem value="sectional">Sectional</SelectItem>
                    <SelectItem value="topic_wise">Topic-wise</SelectItem>
                    <SelectItem value="practice_set">Practice Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Total Duration (min)</Label>
                <Input type="number" value={form.total_duration_minutes} onChange={(e) => setForm({ ...form, total_duration_minutes: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Access Validity (days)</Label>
                <Input type="number" value={form.access_validity_days} onChange={(e) => setForm({ ...form, access_validity_days: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Banner URL</Label>
                <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Sort Order <span className="text-muted-foreground">(lower shows first on student dashboard)</span></Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Meta Title (SEO)</Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={60} />
              </div>
              <div>
                <Label className="text-xs">Meta Description (SEO)</Label>
                <Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={160} />
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t">
              <Label className="text-sm font-semibold">Launch & Visibility</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.is_published && !form.is_live ? "default" : "outline"}
                  onClick={() => setForm({ ...form, is_published: true, is_live: false })}
                >
                  Publish
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.is_live ? "default" : "outline"}
                  onClick={() => setForm({ ...form, is_published: true, is_live: true })}
                >
                  Live Mock Scheduled
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!form.is_published && !form.is_live ? "default" : "outline"}
                  onClick={() => setForm({ ...form, is_published: false, is_live: false, scheduled_start_at: "" })}
                >
                  Draft
                </Button>
              </div>
              {form.is_live && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Scheduled Launch Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_start_at}
                      onChange={(e) => setForm({ ...form, scheduled_start_at: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Students will see the mock card with a countdown. It unlocks automatically at this time. Leave empty to show "To be launched soon".
                    </p>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Publish:</span> visible & playable immediately. {" "}
                <span className="font-medium">Live Mock Scheduled:</span> visible with countdown, unlocks at the chosen time. {" "}
                <span className="font-medium">Draft:</span> hidden from students.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editId ? "Update Mock Test" : "Create & Add Questions"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Mock Tests</h1>
          <p className="text-sm text-muted-foreground mt-1">CAT-style mock test management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2 text-primary" /> Generate Mocks From AI
          </Button>
          <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" /> New Mock Test</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { v: "all", l: "All" },
          { v: "full_length", l: "Full Length" },
          { v: "sectional", l: "Sectional" },
          { v: "topic", l: "Topic-wise" },
          { v: "daily", l: "Daily Test" },
          { v: "practice", l: "Practice" },
        ].map((c) => (
          <Button
            key={c.v}
            size="sm"
            variant={categoryFilter === c.v ? "default" : "outline"}
            onClick={() => setCategoryFilter(c.v)}
          >
            {c.l}
            <Badge variant="secondary" className="ml-2">
              {c.v === "all" ? tests.length : tests.filter((t) => (t.category || t.test_type) === c.v).length}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Exam</Label>
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {Array.from(new Set(tests.map((t) => t.exam_code).filter(Boolean))).sort().map((ex) => (
                <SelectItem key={ex as string} value={ex as string}>{ex as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Difficulty</Label>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Readiness</Label>
          <Select value={readinessFilter} onValueChange={setReadinessFilter}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="needs_changes">Needs Changes</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(examFilter !== "all" || difficultyFilter !== "all" || readinessFilter !== "all") && (
          <Button size="sm" variant="ghost" onClick={() => { setExamFilter("all"); setDifficultyFilter("all"); setReadinessFilter("all"); }}>
            Clear filters
          </Button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 rounded-md border bg-sky-50/60 px-3 py-2">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-sky-600" />
            {selectedIds.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="default" disabled={bulkBusy} onClick={() => bulkUpdate({ is_published: true, is_live: true }, "made Live")}>Make Live</Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdate({ is_published: true }, "Published")}>Publish</Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdate({ is_live: false, is_published: false }, "moved to Draft")}>Make Draft</Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button size="sm" variant="outline" disabled={bulkBusy} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => bulkUpdate({ readiness_status: "ready" }, "marked Ready")}>Mark Ready</Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => bulkUpdate({ readiness_status: "needs_changes" }, "marked Needs Changes")}>Needs Changes</Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => bulkUpdate({ readiness_status: "incomplete" }, "marked Incomplete")}>Incomplete</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Exam</TableHead>
                
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead className="w-[90px]">Sort</TableHead>
                <TableHead>Bundles</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Takers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (<TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>)}
              {!loading && tests.length === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  No mock tests yet. Click <strong>Generate Mocks From AI</strong> or <strong>New Mock Test</strong>.
                </TableCell></TableRow>
              )}
              {visibleTests.map((t) => {
                const bundles = bundleMap[t.id] ?? [];
                const courses = courseMap[t.id] ?? [];
                return (
                <TableRow key={t.id} className={selectedIds.includes(t.id) ? "bg-sky-50/40" : ""}>
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(t.id)} onCheckedChange={() => toggleRow(t.id)} />
                  </TableCell>

                  <TableCell>
                    <div className="font-medium flex items-center gap-1.5">
                      {t.name}
                      {t.generated_by_ai && <Sparkles className="w-3 h-3 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground">/{t.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {String(t.category || t.test_type).replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{t.exam_code || "CAT"}</Badge></TableCell>
                  <TableCell>{t.total_duration_minutes} min</TableCell>
                  <TableCell>
                    {t.is_published ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Published</Badge> : <Badge variant="outline">Draft</Badge>}
                    {t.is_live && <Badge className="ml-1 bg-orange-500 hover:bg-orange-600">Live</Badge>}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const cur = (t.readiness_status || "incomplete") as keyof typeof readinessMeta;
                      const meta = readinessMeta[cur] ?? readinessMeta.incomplete;
                      return (
                        <Select value={cur} onValueChange={(v) => updateReadiness(t.id, v)} disabled={!!readinessSaving[t.id]}>
                          <SelectTrigger className={`h-8 w-[150px] text-xs font-medium border ${meta.className}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="needs_changes">Needs Changes</SelectItem>
                            <SelectItem value="incomplete">Incomplete</SelectItem>
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-20 text-xs"
                      value={sortOrderDraft[t.id] ?? String(t.sort_order ?? 0)}
                      disabled={!!sortOrderSaving[t.id]}
                      onChange={(e) => setSortOrderDraft((p) => ({ ...p, [t.id]: e.target.value }))}
                      onBlur={(e) => updateSortOrder(t.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                  </TableCell>
                  <TableCell>
                    {bundles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLinkDialog({ kind: "bundle", testName: t.name, items: bundles })}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 text-xs font-medium text-sky-700 transition-colors"
                        title="View bundles containing this mock"
                      >
                        <Package className="w-3 h-3" />
                        {bundles.length}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    {courses.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLinkDialog({ kind: "course", testName: t.name, items: courses })}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700 transition-colors"
                        title="View courses including this mock"
                      >
                        <BookOpen className="w-3 h-3" />
                        {courses.length}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>{t.total_takers ?? 0}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild variant="outline" size="sm" title="Manage sections & questions">
                      <Link to={`/admin/mock-tests/${t.id}/builder`}>
                        <Settings2 className="w-3.5 h-3.5 mr-1" /> Builder
                      </Link>
                    </Button>
                    {t.is_published && (
                      <Button asChild variant="ghost" size="sm" title="Open public page">
                        <Link to={`/mocks/${t.slug}`} target="_blank"><ExternalLink className="w-3.5 h-3.5" /></Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => startEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id, t.name)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AIGenerateMockDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onCreated={fetchTests}
      />

      <Dialog open={!!linkDialog} onOpenChange={(o) => !o && setLinkDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {linkDialog?.kind === "bundle" ? <Package className="w-4 h-4 text-sky-600" /> : <BookOpen className="w-4 h-4 text-violet-600" />}
              {linkDialog?.kind === "bundle" ? "Bundles" : "Courses"} containing
              <span className="font-semibold">"{linkDialog?.testName}"</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(linkDialog?.items ?? []).map((item) => {
              const path = linkDialog?.kind === "bundle"
                ? `/admin/mock-bundles?edit=${item.id}`
                : `/admin/mba-compass-courses?edit=${item.id}`;
              const publicPath = linkDialog?.kind === "bundle"
                ? `/courses/${item.slug}`
                : `/mba-compass/${item.slug}`;
              return (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground truncate">/{item.slug}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button asChild size="sm" variant="outline">
                      <Link to={path} onClick={() => setLinkDialog(null)}>Manage</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" title="Open public page">
                      <Link to={publicPath} target="_blank"><ExternalLink className="w-3.5 h-3.5" /></Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMockTests;
