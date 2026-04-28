import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Package, Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { FEATURE_DEFINITIONS, FeatureKey, FeatureMap } from "@/lib/courseFeatures";
import CourseMockPicker from "@/components/admin/CourseMockPicker";

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
  included_categories: string[];
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const ALL_CATEGORIES = ["CAT", "NMAT", "XAT", "SNAP", "IIFT", "CMAT", "MAT", "TISSNET", "Other"];

const EMPTY: Partial<Bundle> = {
  name: "", slug: "", description: "", exam_code: "CAT", price_inr: 0, original_price_inr: null,
  validity_days: 365, is_published: false, highlight_on_mocks: false, sort_order: 0,
  features: {}, included_categories: [],
};

export default function AdminMockBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Bundle> | null>(null);
  const [editingItems, setEditingItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const load = async () => {
    setLoading(true);
    const { data: b } = await supabase.from("mock_bundles").select("*").order("sort_order");
    setBundles((b ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ ...EMPTY }); setEditingItems([]); setStep(1); };
  const openEdit = async (b: Bundle) => {
    setEditing({
      ...b,
      features: (b.features ?? {}) as FeatureMap,
      included_categories: b.included_categories ?? [],
    });
    const { data } = await supabase.from("mock_bundle_items").select("test_id").eq("bundle_id", b.id);
    setEditingItems((data ?? []).map((x: any) => x.test_id));
    setStep(1);
  };

  const closeDialog = () => { setEditing(null); setStep(1); };

  const toggleFeature = (key: FeatureKey, on: boolean) => {
    if (!editing) return;
    const next = { ...(editing.features ?? {}) };
    if (on) next[key] = true; else delete next[key];
    setEditing({ ...editing, features: next });
  };

  const toggleCategory = (cat: string, on: boolean) => {
    if (!editing) return;
    const cur = new Set(editing.included_categories ?? []);
    if (on) cur.add(cat); else cur.delete(cat);
    setEditing({ ...editing, included_categories: [...cur] });
  };

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const slug = editing.slug?.trim() || slugify(editing.name);
      const payload = {
        name: editing.name.trim(),
        slug,
        description: editing.description ?? null,
        exam_code: editing.exam_code ?? null,
        cover_image_url: editing.cover_image_url ?? null,
        price_inr: Number(editing.price_inr) || 0,
        original_price_inr:
          editing.original_price_inr === null || editing.original_price_inr === undefined || (editing.original_price_inr as any) === ""
            ? null
            : Number(editing.original_price_inr),
        validity_days: Number(editing.validity_days) || 365,
        is_published: !!editing.is_published,
        highlight_on_mocks: !!editing.highlight_on_mocks,
        sort_order: Number(editing.sort_order) || 0,
        features: (editing.features ?? {}) as any,
        included_categories: editing.included_categories ?? [],
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
      toast.success("Course saved");
      closeDialog();
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeBundle = async (id: string) => {
    if (!confirm("Delete this course? Existing student access remains intact.")) return;
    const { error } = await supabase.from("mock_bundles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const filtered = bundles.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()));
  const featureCount = Object.values(editing?.features ?? {}).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Package className="h-6 w-6" /> Courses (Mock Bundles)</h1>
          <p className="text-sm text-muted-foreground">Build a course in 3 steps: Details → Features → Mocks. Students see exactly what you include.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 w-56" />
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Course</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No courses yet. Click "New Course" to create one.</Card>}
          {filtered.map((b) => {
            const featCount = Object.values(b.features ?? {}).filter(Boolean).length;
            return (
              <Card key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{b.name}</span>
                    <Badge variant={b.is_published ? "default" : "secondary"}>{b.is_published ? "Published" : "Draft"}</Badge>
                    {b.exam_code && <Badge variant="outline">{b.exam_code}</Badge>}
                    <Badge variant="outline" className="text-xs">{featCount} features</Badge>
                    <Badge variant="outline" className="text-xs">{(b.included_categories ?? []).length} categories</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">/{b.slug} · ₹{Number(b.price_inr).toLocaleString()} · {b.validity_days}d access</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => removeBundle(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(editing as Bundle)?.id ? "Edit Course" : "New Course"}</DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-2">
            {[
              { n: 1, label: "Details" },
              { n: 2, label: "Features" },
              { n: 3, label: "Mocks" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => setStep(s.n as any)}
                  className={`flex items-center gap-2 text-xs font-medium ${step === s.n ? "text-sky-700" : step > s.n ? "text-emerald-600" : "text-muted-foreground"}`}
                >
                  <span className={`h-7 w-7 rounded-full grid place-items-center border ${step === s.n ? "bg-sky-100 border-sky-300" : step > s.n ? "bg-emerald-100 border-emerald-300" : "border-muted-foreground/30"}`}>
                    {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </span>
                  Step {s.n} — {s.label}
                </button>
                {i < 2 && <div className={`flex-1 h-px mx-3 ${step > s.n ? "bg-emerald-300" : "bg-muted-foreground/20"}`} />}
              </div>
            ))}
          </div>

          {editing && step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Course Name *</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </div>
                <div>
                  <Label>Primary Exam</Label>
                  <Input value={editing.exam_code ?? ""} onChange={(e) => setEditing({ ...editing, exam_code: e.target.value })} placeholder="CAT" />
                </div>
                <div>
                  <Label>Cover image URL</Label>
                  <Input value={editing.cover_image_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} />
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
                <div>
                  <Label>Sort order</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
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

          {editing && step === 2 && (
            <div className="space-y-3">
              <div>
                <Label className="text-base">Features & Offerings ({featureCount} enabled)</Label>
                <p className="text-xs text-muted-foreground">Toggle exactly what students who buy this course get inside their dashboard. Anything left off will appear locked with an upgrade prompt.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FEATURE_DEFINITIONS.map((f) => {
                  const on = !!editing.features?.[f.key];
                  return (
                    <label key={f.key} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition ${on ? "border-sky-300 bg-sky-50/60" : "border-border hover:bg-muted/30"}`}>
                      <Switch checked={on} onCheckedChange={(v) => toggleFeature(f.key, v)} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{f.label}</div>
                        <div className="text-[11px] text-muted-foreground">{f.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {editing && step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base">Mock Categories</Label>
                <p className="text-xs text-muted-foreground">Pick which exams this course includes mocks for. Then choose specific mocks below.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALL_CATEGORIES.map((c) => {
                    const on = (editing.included_categories ?? []).includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCategory(c, !on)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${on ? "bg-sky-500 text-white border-sky-500" : "bg-background border-border hover:bg-muted"}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-base">Choose Mocks</Label>
                <CourseMockPicker
                  selectedCategories={editing.included_categories ?? []}
                  selectedTestIds={editingItems}
                  onTestIdsChange={setEditingItems}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <div className="flex gap-2">
              {step > 1 && <Button variant="outline" onClick={() => setStep((step - 1) as any)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>}
              {step < 3 && <Button onClick={() => setStep((step + 1) as any)}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>}
              {step === 3 && (
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save Course
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
