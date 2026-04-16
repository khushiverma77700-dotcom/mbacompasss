import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";

const emptyForm = { title: "", description: "", link: "/blog", sort_order: 0, active: true };

const AdminComparisons = () => {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();
  const { sortedItems: sortedItems, sortConfig, handleSort } = useTableSort(items);

  const fetch = async () => {
    const { data } = await supabase.from("comparisons").select("*").order("sort_order");
    if (data) setItems(data);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    const payload = { title: form.title, description: form.description || null, link: form.link || "/blog", sort_order: form.sort_order, active: form.active };
    if (editId) {
      const { error } = await supabase.from("comparisons").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("comparisons").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Created" });
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); fetch();
  };

  const handleEdit = (item: any) => {
    setForm({ title: item.title, description: item.description ?? "", link: item.link ?? "/blog", sort_order: item.sort_order ?? 0, active: item.active ?? true });
    setEditId(item.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("comparisons").delete().eq("id", id);
    fetch(); toast({ title: "Deleted" });
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Comparisons
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Comparison</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1 block">Title *</Label>
              <Input placeholder="CAT vs XAT" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</Label>
              <Textarea placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1 block">Link (article/blog URL)</Label>
              <Input placeholder="/article/cat-vs-xat" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1 block">Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
            </label>
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">{editId ? "Update" : "Create"}</Button>
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Popular Comparisons</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Comparison</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-12">S.No</TableHead><SortableTableHead label="Title" sortKey="title" sortConfig={sortConfig} onSort={handleSort} /><TableHead>Description</TableHead><TableHead>Link</TableHead><SortableTableHead label="Status" sortKey="active" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} /><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{item.description || "—"}</TableCell>
                <TableCell className="text-sm">{item.link}</TableCell>
                <TableCell><Badge variant={item.active ? "default" : "secondary"}>{item.active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/><span className="text-[10px]">{new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No comparisons yet. Fallback data will show on frontend.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminComparisons;
