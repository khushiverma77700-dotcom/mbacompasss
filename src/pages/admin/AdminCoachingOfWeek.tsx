import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, ArrowLeft } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ResponsiveImageUpload from "@/components/admin/ResponsiveImageUpload";

const emptyForm = {
  institute_id: "", headline: "", description: "", offer_text: "", offer_details: "",
  results_summary: "", banner_url: "", coupon_code: "", coupon_discount: "",
  selected_courses: "", website_url: "", active: true,
};

const AdminCoachingOfWeek = () => {
  const [items, setItems] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchItems = async () => { const { data } = await supabase.from("coaching_of_week").select("*, institutes(name)").order("created_at", { ascending: false }); if (data) setItems(data); };
  const fetchInstitutes = async () => { const { data } = await supabase.from("institutes").select("id, name").order("name"); if (data) setInstitutes(data); };
  useEffect(() => { fetchItems(); fetchInstitutes(); }, []);

  const handleSave = async () => {
    if (!form.institute_id) { toast({ title: "Select an institute", variant: "destructive" }); return; }
    const payload = {
      institute_id: form.institute_id, headline: form.headline || null, description: form.description || null,
      offer_text: form.offer_text || null, offer_details: form.offer_details || null,
      results_summary: form.results_summary || null, banner_url: form.banner_url || null,
      coupon_code: form.coupon_code || null, coupon_discount: form.coupon_discount || null,
      selected_courses: form.selected_courses || null, website_url: (form as any).website_url || null, active: form.active,
    };
    if (editId) {
      const { error } = await supabase.from("coaching_of_week").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("coaching_of_week").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Created" });
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchItems();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("coaching_of_week").select("*").eq("id", id).single();
    if (data) {
      setForm({ institute_id: data.institute_id, headline: data.headline ?? "", description: data.description ?? "", offer_text: data.offer_text ?? "", offer_details: data.offer_details ?? "", results_summary: data.results_summary ?? "", banner_url: data.banner_url ?? "", coupon_code: (data as any).coupon_code ?? "", coupon_discount: (data as any).coupon_discount ?? "", selected_courses: (data as any).selected_courses ?? "", website_url: (data as any).website_url ?? "", active: data.active ?? true });
      setEditId(id); setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("coaching_of_week").delete().eq("id", id);
    fetchItems(); toast({ title: "Deleted" });
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Coaching of the Week
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Coaching of the Week</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Select Institute *</Label>
              <select className="w-full border border-border rounded-md p-2 text-sm bg-background" value={form.institute_id} onChange={(e) => setForm({ ...form, institute_id: e.target.value })}>
                <option value="">Choose institute...</option>
                {institutes.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            </div>
            <Input placeholder="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label>
              <RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Why this institute is featured..." /></div>
            <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><Tag className="w-4 h-4 text-primary" /><Label className="text-sm font-bold text-foreground">Coupon Code Settings</Label></div>
              <Input placeholder="Coupon Code (e.g. MBAHUB70)" value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} />
              <Input placeholder="Discount Text (e.g. 60% OFF)" value={form.coupon_discount} onChange={(e) => setForm({ ...form, coupon_discount: e.target.value })} />
              <Input placeholder="Selected Courses (e.g. CAT Complete, GMAT Prep)" value={form.selected_courses} onChange={(e) => setForm({ ...form, selected_courses: e.target.value })} />
              <Input placeholder="Website URL (e.g. https://institute.com)" value={(form as any).website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
            </div>
            <Input placeholder="Offer text banner (e.g. Flat 30% OFF)" value={form.offer_text} onChange={(e) => setForm({ ...form, offer_text: e.target.value })} />
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Offer Details</Label>
              <RichTextEditor content={form.offer_details} onChange={(html) => setForm({ ...form, offer_details: html })} placeholder="Detailed offer info..." /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Results Summary</Label>
              <RichTextEditor content={form.results_summary} onChange={(html) => setForm({ ...form, results_summary: html })} placeholder="Key results and achievements..." /></div>
            <ResponsiveImageUpload bucket="uploads" folder="coaching-of-week" label="Banner Image"
              desktopValue={form.banner_url} mobileValue={(form as any).mobile_banner_url || ""}
              onDesktopChange={(url) => setForm({ ...form, banner_url: url })}
              onMobileChange={(url) => setForm({ ...form, mobile_banner_url: url } as any)}
              desktopSpec={{ dimensions: "1200×500 px", ratio: "12:5, landscape", maxSize: "300 KB" }}
              mobileSpec={{ dimensions: "600×400 px", ratio: "3:2", maxSize: "150 KB" }} />
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

  const { sortedItems: sortedItems, sortConfig, handleSort } = useTableSort(items);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Coaching of the Week</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <SortableTableHead label="Institute" sortKey="institute_id" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTableHead label="Headline" sortKey="headline" sortConfig={sortConfig} onSort={handleSort} />
            <TableHead>Coupon</TableHead>
            <TableHead>Offer</TableHead>
            <SortableTableHead label="Status" sortKey="active" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTableHead label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{(item as any).institutes?.name || "—"}</TableCell>
                <TableCell>{item.headline}</TableCell>
                <TableCell>{(item as any).coupon_code ? <Badge variant="outline" className="font-mono">{(item as any).coupon_code}</Badge> : "—"}</TableCell>
                <TableCell>{item.offer_text || "—"}</TableCell>
                <TableCell><Badge variant={item.active ? "default" : "secondary"}>{item.active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item.id)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminCoachingOfWeek;
