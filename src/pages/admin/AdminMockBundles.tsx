import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, Search, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
};
type Mock = { id: string; name: string; slug: string; exam_code: string | null };

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export default function AdminMockBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Bundle> | null>(null);
  const [editingItems, setEditingItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: b }, { data: m }] = await Promise.all([
      supabase.from("mock_bundles").select("*").order("sort_order"),
      supabase.from("mock_tests").select("id, name, slug, exam_code").order("name"),
    ]);
    setBundles((b ?? []) as any);
    setMocks((m ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ name: "", slug: "", description: "", exam_code: "CAT", price_inr: 0, original_price_inr: null, validity_days: 365, is_published: false, highlight_on_mocks: false, sort_order: 0 });
    setEditingItems([]);
  };
  const openEdit = async (b: Bundle) => {
    setEditing(b);
    const { data } = await supabase.from("mock_bundle_items").select("test_id").eq("bundle_id", b.id);
    setEditingItems((data ?? []).map((x: any) => x.test_id));
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
        original_price_inr: editing.original_price_inr === null || editing.original_price_inr === undefined || (editing.original_price_inr as any) === ""
          ? null
          : Number(editing.original_price_inr),
        validity_days: Number(editing.validity_days) || 365,
        is_published: !!editing.is_published,
        highlight_on_mocks: !!editing.highlight_on_mocks,
        sort_order: Number(editing.sort_order) || 0,
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
      // Sync items: delete removed, insert new
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
      setEditing(null);
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
          <p className="text-sm text-muted-foreground">Group existing mocks into a paid bundle. One purchase unlocks every mock inside.</p>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(editing as Bundle)?.id ? "Edit Bundle" : "New Bundle"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </div>
                <div>
                  <Label>Exam</Label>
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
                  <Label>Original Price (INR) — optional, shows strikethrough</Label>
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

              <div>
                <Label>Mocks in this bundle ({editingItems.length} selected)</Label>
                <Card className="mt-2 max-h-72 overflow-y-auto p-2 space-y-1">
                  {mocks.length === 0 && <div className="text-xs text-muted-foreground p-3">No mocks exist. Create them in Mock Tests first.</div>}
                  {mocks.map((m) => {
                    const checked = editingItems.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={(v) => {
                          setEditingItems(v ? [...editingItems, m.id] : editingItems.filter((x) => x !== m.id));
                        }} />
                        <span className="text-sm flex-1">{m.name}</span>
                        {m.exam_code && <Badge variant="outline" className="text-xs">{m.exam_code}</Badge>}
                      </label>
                    );
                  })}
                </Card>
                <p className="text-xs text-muted-foreground mt-1">Adding a mock here will also auto-unlock it for any students already enrolled in this bundle.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
