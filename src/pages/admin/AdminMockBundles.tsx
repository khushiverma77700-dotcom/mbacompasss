import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Package, Loader2, ChevronDown, ChevronRight, ArrowUp, ArrowDown, X } from "lucide-react";
import { toast } from "sonner";
import { FeatureMap } from "@/lib/courseFeatures";
import { HighlightMap } from "@/lib/courseHighlights";

type Bundle = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  exam_code: string | null;
  cover_image_url: string | null;
  price_inr: number;
  original_price_inr: number | null;
  validity_days: number;
  is_published: boolean;
  highlight_on_mocks: boolean;
  sort_order: number;
  features: FeatureMap;
  highlights: HighlightMap;
  included_categories: string[];
};

type MockOption = {
  id: string;
  name: string;
  slug: string;
  exam_code: string | null;
  test_type: string | null;
  category: string | null;
  is_published: boolean | null;
};


const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const EMPTY: Partial<Bundle> = {
  name: "", slug: "", description: "", exam_code: null, price_inr: 0, original_price_inr: null,
  validity_days: 365, is_published: true, highlight_on_mocks: false, sort_order: 0,
  features: {}, highlights: {}, included_categories: [],
};

export default function AdminMockBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Bundle> | null>(null);
  const [editingItems, setEditingItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mock picker state
  const [allMocks, setAllMocks] = useState<MockOption[]>([]);
  const [mocksLoading, setMocksLoading] = useState(false);
  const [mockSearch, setMockSearch] = useState("");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("full_length");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "draft">("all");
  const [selectionFilter, setSelectionFilter] = useState<"all" | "selected" | "unselected">("all");

  const load = async () => {
    setLoading(true);
    const { data: b } = await supabase.from("mock_bundles").select("*").order("sort_order");
    setBundles((b ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadMocks = async () => {
    setMocksLoading(true);
    const { data } = await supabase
      .from("mock_tests")
      .select("id, name, slug, exam_code, test_type, category, is_published")
      .order("name");
    setAllMocks((data ?? []) as MockOption[]);
    setMocksLoading(false);

  };

  const openNew = () => {
    setEditing({ ...EMPTY });
    setEditingItems([]);
    setShowAdvanced(false);
    setMockSearch("");
    setExamFilter("all");
    loadMocks();
  };
  const openEdit = async (b: Bundle) => {
    setEditing({
      ...b,
      features: (b.features ?? {}) as FeatureMap,
      highlights: (b.highlights ?? {}) as HighlightMap,
      included_categories: b.included_categories ?? [],
    });
    const { data } = await supabase.from("mock_bundle_items").select("test_id, sort_order").eq("bundle_id", b.id).order("sort_order");
    setEditingItems((data ?? []).map((x: any) => x.test_id));
    setShowAdvanced(false);
    setMockSearch("");
    setExamFilter("all");
    loadMocks();
  };

  const closeDialog = () => { setEditing(null); setShowAdvanced(false); };

  const examCodes = useMemo(() => {
    const set = new Set<string>();
    allMocks.forEach((m) => m.exam_code && set.add(m.exam_code));
    return ["all", ...Array.from(set).sort()];
  }, [allMocks]);

  const TYPE_OPTIONS = [
    { v: "full_length", l: "Full Length" },
    { v: "sectional", l: "Sectional" },
    { v: "topic_wise", l: "Topic-wise" },
    { v: "practice_set", l: "Practice" },
    { v: "daily", l: "Daily Test" },
  ];
  const testTypes = useMemo(() => ["all", ...TYPE_OPTIONS.map((t) => t.v)], []);

  const kindOf = (m: MockOption) => (m.category || m.test_type || "").toLowerCase();

  const filteredMocks = useMemo(() => {
    return allMocks.filter((m) => {
      if (examFilter !== "all" && m.exam_code !== examFilter) return false;
      if (typeFilter !== "all" && kindOf(m) !== typeFilter) return false;
      if (statusFilter === "live" && !m.is_published) return false;
      if (statusFilter === "draft" && m.is_published) return false;
      const sel = editingItems.includes(m.id);
      if (selectionFilter === "selected" && !sel) return false;
      if (selectionFilter === "unselected" && sel) return false;
      if (mockSearch && !m.name.toLowerCase().includes(mockSearch.toLowerCase())) return false;
      return true;
    });
  }, [allMocks, examFilter, typeFilter, statusFilter, selectionFilter, mockSearch, editingItems]);

  const clearFilters = () => {
    setMockSearch(""); setExamFilter("all"); setTypeFilter("full_length"); setStatusFilter("all"); setSelectionFilter("all");
  };


  const toggleMock = (id: string) => {
    setEditingItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const allFilteredSelected = filteredMocks.length > 0 && filteredMocks.every((m) => editingItems.includes(m.id));
  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setEditingItems((prev) => prev.filter((id) => !filteredMocks.some((m) => m.id === id)));
    } else {
      setEditingItems((prev) => Array.from(new Set([...prev, ...filteredMocks.map((m) => m.id)])));
    }
  };

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const slug = editing.slug?.trim() || slugify(editing.name);
      // Auto-derive included categories from selected mocks so /courses filtering keeps working
      const derivedCats = Array.from(
        new Set(
          allMocks
            .filter((m) => editingItems.includes(m.id))
            .map((m) => m.exam_code)
            .filter(Boolean) as string[]
        )
      );
      const payload = {
        name: editing.name.trim(),
        slug,
        description: editing.description ?? null,
        exam_code: editing.exam_code ?? (derivedCats[0] ?? null),
        cover_image_url: editing.cover_image_url ?? null,
        price_inr: Number(editing.price_inr) || 0,
        original_price_inr:
          editing.original_price_inr === null || editing.original_price_inr === undefined || (editing.original_price_inr as any) === ""
            ? null
            : Number(editing.original_price_inr),
        validity_days: Number(editing.validity_days) || 365,
        is_published: editing.is_published ?? true,
        highlight_on_mocks: !!editing.highlight_on_mocks,
        sort_order: Number(editing.sort_order) || 0,
        features: (editing.features ?? {}) as any,
        highlights: (editing.highlights ?? {}) as any,
        included_categories: derivedCats.length ? derivedCats : (editing.included_categories ?? []),
      };
      let bundleId = (editing as Bundle).id;
      if (bundleId) {
        const { error } = await supabase.from("mock_bundles").update(payload).eq("id", bundleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("mock_bundles").insert(payload).select("id").single();
        if (error) throw error;
        bundleId = data!.id;
      }
      const { data: existing } = await supabase.from("mock_bundle_items").select("test_id").eq("bundle_id", bundleId);
      const existingIds = new Set((existing ?? []).map((x: any) => x.test_id));
      const newIds = new Set(editingItems);
      const toAdd = editingItems.filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !newIds.has(id as string));
      if (toRemove.length) {
        await supabase.from("mock_bundle_items").delete().eq("bundle_id", bundleId).in("test_id", toRemove);
      }
      if (toAdd.length) {
        await supabase.from("mock_bundle_items").insert(toAdd.map((tid, i) => ({ bundle_id: bundleId, test_id: tid, sort_order: i })));
      }
      toast.success("Bundle saved");
      closeDialog();
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeBundle = async (id: string) => {
    if (!confirm("Delete this bundle? Existing student access remains intact.")) return;
    const { error } = await supabase.from("mock_bundles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const filtered = bundles.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Package className="h-6 w-6" /> Mock Bundles</h1>
          <p className="text-sm text-muted-foreground">Give the bundle a name, pick the mocks. That's it.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search bundles..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 w-56" />
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Bundle</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No bundles yet. Click "New Bundle" to create one.</Card>}
          {filtered.map((b) => (
            <Card key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{b.name}</span>
                  <Badge variant={b.is_published ? "default" : "secondary"}>{b.is_published ? "Published" : "Draft"}</Badge>
                  {b.exam_code && <Badge variant="outline">{b.exam_code}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">/{b.slug} · ₹{Number(b.price_inr).toLocaleString()} · {b.validity_days}d access</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(b)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => removeBundle(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(editing as Bundle)?.id ? "Edit Bundle" : "New Bundle"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <Label>Bundle Name *</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })}
                  placeholder="e.g. CAT 2026 Full Mock Pack"
                />
              </div>

              {/* Mocks picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Select Mocks</Label>
                  <span className="text-xs text-muted-foreground"><strong>{editingItems.length}</strong> selected</span>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={mockSearch} onChange={(e) => setMockSearch(e.target.value)} placeholder="Search mocks by name..." className="pl-8 h-9" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Exam</div>
                      <div className="flex flex-wrap gap-1">
                        {examCodes.map((c) => (
                          <button key={c} type="button" onClick={() => setExamFilter(c)}
                            className={`px-2 py-1 rounded-full text-[11px] font-medium border transition ${examFilter === c ? "bg-sky-500 text-white border-sky-500" : "bg-background border-border hover:bg-muted"}`}>
                            {c === "all" ? "All" : c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Type</div>
                      <div className="flex flex-wrap gap-1">
                        {testTypes.map((t) => (
                          <button key={t} type="button" onClick={() => setTypeFilter(t)}
                            className={`px-2 py-1 rounded-full text-[11px] font-medium border transition capitalize ${typeFilter === t ? "bg-sky-500 text-white border-sky-500" : "bg-background border-border hover:bg-muted"}`}>
                            {t === "all" ? "All" : t.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Status</div>
                      <div className="flex flex-wrap gap-1">
                        {(["all","live","draft"] as const).map((s) => (
                          <button key={s} type="button" onClick={() => setStatusFilter(s)}
                            className={`px-2 py-1 rounded-full text-[11px] font-medium border transition capitalize ${statusFilter === s ? "bg-sky-500 text-white border-sky-500" : "bg-background border-border hover:bg-muted"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex gap-1">
                      {(["all","selected","unselected"] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setSelectionFilter(s)}
                          className={`px-2 py-1 rounded-full text-[11px] font-medium border transition capitalize ${selectionFilter === s ? "bg-emerald-500 text-white border-emerald-500" : "bg-background border-border hover:bg-muted"}`}>
                          {s === "all" ? "All mocks" : s}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Showing <strong>{filteredMocks.length}</strong> · <strong>{editingItems.length}</strong> selected</span>
                      <button type="button" onClick={clearFilters} className="text-sky-600 hover:underline">Clear filters</button>
                    </div>
                  </div>
                </div>

                <Card className="overflow-hidden">
                  {mocksLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 sticky top-0">
                          <tr className="text-left text-xs">
                            <th className="px-3 py-2 w-10">
                              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAllFiltered} />
                            </th>
                            <th className="px-3 py-2 font-medium">Mock</th>
                            <th className="px-3 py-2 font-medium w-20">Exam</th>
                            <th className="px-3 py-2 font-medium w-20">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMocks.length === 0 && (
                            <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-xs">No mocks match.</td></tr>
                          )}
                          {filteredMocks.map((m) => {
                            const checked = editingItems.includes(m.id);
                            return (
                              <tr key={m.id} className={`border-t hover:bg-muted/30 cursor-pointer ${checked ? "bg-sky-50/40" : ""}`} onClick={() => toggleMock(m.id)}>
                                <td className="px-3 py-2"><Checkbox checked={checked} onCheckedChange={() => toggleMock(m.id)} /></td>
                                <td className="px-3 py-2">
                                  <div className="font-medium">{m.name}</div>
                                  <div className="text-[10px] text-muted-foreground">/{m.slug}</div>
                                </td>
                                <td className="px-3 py-2">{m.exam_code && <Badge variant="outline" className="text-[10px]">{m.exam_code}</Badge>}</td>
                                <td className="px-3 py-2">
                                  {m.is_published ? <Badge className="text-[10px] bg-emerald-600">Live</Badge> : <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Selected mocks - ordered list (Serial #) */}
                {editingItems.length > 0 && (
                  <Card className="p-3 bg-sky-50/40 border-sky-100">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Display Order ({editingItems.length})</Label>
                      <span className="text-[10px] text-muted-foreground">Serial # = order shown to students</span>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {editingItems.map((tid, idx) => {
                        const m = allMocks.find((x) => x.id === tid);
                        return (
                          <div key={tid} className="flex items-center gap-2 bg-white border border-sky-100 rounded-md px-2 py-1.5">
                            <Input
                              type="number"
                              value={idx + 1}
                              onChange={(e) => {
                                let target = Math.max(1, Math.min(editingItems.length, Number(e.target.value) || 1)) - 1;
                                if (target === idx) return;
                                const next = [...editingItems];
                                const [moved] = next.splice(idx, 1);
                                next.splice(target, 0, moved);
                                setEditingItems(next);
                              }}
                              className="h-7 w-14 text-xs text-center"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{m?.name ?? tid}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {m?.exam_code} · {(m?.test_type ?? "").replace(/_/g, " ")}
                              </div>
                            </div>
                            <button type="button" disabled={idx === 0} onClick={() => {
                              const next = [...editingItems];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              setEditingItems(next);
                            }} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" disabled={idx === editingItems.length - 1} onClick={() => {
                              const next = [...editingItems];
                              [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                              setEditingItems(next);
                            }} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => setEditingItems(editingItems.filter((x) => x !== tid))}
                              className="p-1 rounded hover:bg-rose-50 text-rose-500"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>

              {/* Advanced (optional) */}
              <div className="border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Advanced (price, validity, publishing)
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Slug</Label>
                        <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Price (INR)</Label>
                        <Input type="number" value={editing.price_inr ?? 0} onChange={(e) => setEditing({ ...editing, price_inr: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Original Price (INR) — optional</Label>
                        <Input type="number" value={editing.original_price_inr ?? ""} onChange={(e) => setEditing({ ...editing, original_price_inr: e.target.value === "" ? null : Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Validity (days)</Label>
                        <Input type="number" value={editing.validity_days ?? 365} onChange={(e) => setEditing({ ...editing, validity_days: Number(e.target.value) })} />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch checked={!!editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
                        <Label>Published</Label>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch checked={!!editing.highlight_on_mocks} onCheckedChange={(v) => setEditing({ ...editing, highlight_on_mocks: v })} />
                        <Label>Featured on Courses page</Label>
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
