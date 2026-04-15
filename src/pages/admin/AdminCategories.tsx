import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

const emptyForm = { name: "", slug: "", description: "", icon: "BookOpen", exam_type: "" };

const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    const payload = { name: form.name, slug, description: form.description || null, icon: form.icon || "BookOpen", exam_type: form.exam_type || null };
    if (editId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Category updated" : "Category created" });
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchCategories();
  };

  const handleEdit = (cat: any) => {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "", icon: cat.icon ?? "BookOpen", exam_type: cat.exam_type ?? "" });
    setEditId(cat.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const item = categories.find(c => c.id === id);
    await supabase.from("categories").delete().eq("id", id);
    if (item) {
      const { cleanupDeletedPage } = await import("@/lib/adminCleanup");
      await cleanupDeletedPage({ contentType: "category", id, slug: item.slug, name: item.name });
    }
    fetchCategories(); toast({ title: "Category deleted" });
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Categories
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Category</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Name *</Label>
              <Input placeholder="Category name" value={form.name} onChange={(e) => {
                const name = e.target.value;
                setForm({ ...form, name, slug: editId ? form.slug : name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") });
              }} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label>
              <Textarea placeholder="Category description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Icon (Lucide name)</Label>
                <Input placeholder="BookOpen" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Exam Type</Label>
                <Input placeholder="e.g. MBA" value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} />
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Categories</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Exam Type</TableHead><TableHead>Icon</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{c.slug}</TableCell>
                <TableCell>{c.exam_type ?? "—"}</TableCell>
                <TableCell>{c.icon ?? "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No categories yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminCategories;
