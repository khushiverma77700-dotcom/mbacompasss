import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, ArrowLeft } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import { Badge } from "@/components/ui/badge";

const emptyForm = { name: "", slug: "", sort_order: 0, active: true };

const AdminCourseCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data } = await supabase.from("course_categories").select("*").order("sort_order").order("name");
    if (data) setCategories(data);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    const payload = { name: form.name, slug, sort_order: form.sort_order, active: form.active };
    if (editId) {
      const { error } = await supabase.from("course_categories").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("course_categories").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Category updated" : "Category created" });
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchCategories();
  };

  const handleEdit = (cat: any) => {
    setForm({ name: cat.name, slug: cat.slug, sort_order: cat.sort_order ?? 0, active: cat.active ?? true });
    setEditId(cat.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course category? Courses linked to it will be unlinked.")) return;
    await supabase.from("course_categories").delete().eq("id", id);
    fetchCategories(); toast({ title: "Course category deleted" });
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Course Categories
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Course Category</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Name *</Label>
              <Input placeholder="e.g. CAT 2026" value={form.name} onChange={(e) => {
                const name = e.target.value;
                setForm({ ...form, name, slug: editId ? form.slug : name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") });
              }} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">{editId ? "Update" : "Create"} Category</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>Cancel</Button>
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
          <h1 className="font-heading text-2xl font-bold text-foreground">Course Categories</h1>
          <p className="text-sm text-muted-foreground">Manage course types like CAT 2026, OMETs, Mocks, GDPI etc.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-12">#</TableHead><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {categories.map((c, idx) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground"><div className="flex items-center gap-1"><GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />{idx + 1}</div></TableCell>
                <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{c.slug}</TableCell>
                <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No course categories yet. Add categories like "CAT 2026", "OMETs", "Mocks", "GDPI".</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminCourseCategories;
