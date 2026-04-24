import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import ResponsiveImageUpload from "@/components/admin/ResponsiveImageUpload";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useFilteredList } from "@/hooks/useFilteredList";

const emptyForm = { title: "", subtitle: "", image_url: "", mobile_image_url: "", link_url: "", cta_text: "Learn More", active: true, sort_order: 0 };

const AdminBanners = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();
  const { sortedItems: sortedBanners, sortConfig, handleSort } = useTableSort(banners);

  const fetchBanners = async () => {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    if (data) setBanners(data);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleSave = async () => {
    if (editId) {
      const { error } = await supabase.from("banners").update(form).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("banners").insert(form);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Banner updated" : "Banner created" });
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchBanners();
  };

  const handleEdit = (banner: any) => {
    setForm({
      title: banner.title, subtitle: banner.subtitle ?? "",
      image_url: banner.image_url ?? "", mobile_image_url: (banner as any).mobile_image_url ?? "",
      link_url: banner.link_url ?? "", cta_text: banner.cta_text ?? "Learn More",
      active: banner.active ?? true, sort_order: banner.sort_order ?? 0,
    });
    setEditId(banner.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    fetchBanners(); toast({ title: "Banner deleted" });
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Banners
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Banner</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <ResponsiveImageUpload
              bucket="uploads" folder="banners" label="Banner Image"
              desktopValue={form.image_url} mobileValue={form.mobile_image_url}
              onDesktopChange={(url) => setForm({ ...form, image_url: url })}
              onMobileChange={(url) => setForm({ ...form, mobile_image_url: url })}
              desktopSpec={{ dimensions: "1400×500 px", ratio: "2.8:1, landscape", maxSize: "300 KB" }}
              mobileSpec={{ dimensions: "600×400 px", ratio: "3:2, portrait-friendly", maxSize: "150 KB" }}
            />
            <Input placeholder="Link URL" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            <Input placeholder="CTA Text" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
            <Input placeholder="Sort Order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Banners</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Banner</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
           <TableHeader><TableRow>
            <TableHead className="w-12">S.No</TableHead><SortableTableHead label="Title" sortKey="title" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="CTA" sortKey="cta_text" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="Active" sortKey="active" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="Order" sortKey="sort_order" sortConfig={sortConfig} onSort={handleSort} /><SortableTableHead label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} /><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {sortedBanners.map((b, idx) => (
              <TableRow key={b.id}>
                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                <TableCell className="font-medium">{b.title}</TableCell>
                <TableCell>{b.cta_text}</TableCell>
                <TableCell>{b.active ? "Yes" : "No"}</TableCell>
                <TableCell>{b.sort_order}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(b.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/><span className="text-[10px]">{new Date(b.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No banners yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminBanners;
