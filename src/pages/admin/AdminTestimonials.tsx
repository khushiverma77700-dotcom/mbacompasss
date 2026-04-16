import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star, ArrowLeft } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";

const emptyForm = {
  type: "text" as string, name: "", designation: "", institute: "", institute_id: "",
  content: "", image_url: "", video_url: "", rating: 5, featured: false, sort_order: 0, active: true,
};

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => { const { data } = await supabase.from("testimonials").select("*").order("sort_order"); if (data) setTestimonials(data); };
  const fetchInstitutes = async () => { const { data } = await supabase.from("institutes").select("id, name").order("name"); if (data) setInstitutes(data); };
  useEffect(() => { fetchData(); fetchInstitutes(); }, []);

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    const payload = { ...form, institute_id: form.institute_id || null };
    if (editId) {
      const { error } = await supabase.from("testimonials").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("testimonials").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Testimonial updated" : "Testimonial created" });
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchData();
  };

  const handleEdit = (t: any) => {
    setForm({ type: t.type || "text", name: t.name, designation: t.designation || "", institute: t.institute || "", institute_id: t.institute_id || "", content: t.content || "", image_url: t.image_url || "", video_url: t.video_url || "", rating: t.rating || 5, featured: t.featured || false, sort_order: t.sort_order || 0, active: t.active ?? true });
    setEditId(t.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    fetchData(); toast({ title: "Testimonial deleted" });
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = { text: "bg-blue-100 text-blue-800", image: "bg-green-100 text-green-800", video: "bg-purple-100 text-purple-800" };
    return <Badge className={`${colors[type] || ""} border-none text-xs`}>{type}</Badge>;
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Testimonials
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Edit" : "Add"} Testimonial</CardTitle>
            <p className="text-sm text-muted-foreground">Add student testimonials with text, screenshot images, or video links.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Testimonial</SelectItem>
                  <SelectItem value="image">Screenshot / Image</SelectItem>
                  <SelectItem value="video">Video Testimonial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Student Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="CAT 99.5%ile" /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institute (text)</Label>
                <Input value={form.institute} onChange={(e) => setForm({ ...form, institute: e.target.value })} placeholder="IIM Ahmedabad" /></div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Link to Coaching Institute (optional)</Label>
              <select className="w-full border border-border rounded-md p-2 text-sm bg-background" value={form.institute_id} onChange={(e) => setForm({ ...form, institute_id: e.target.value })}>
                <option value="">No linked institute</option>
                {institutes.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            </div>
            {form.type === "text" && (
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Testimonial Content</Label>
                <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Their experience..." /></div>
            )}
            {(form.type === "image" || form.type === "text") && (
              <FileUpload bucket="uploads" folder="testimonials" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} accept="image/*"
                label={form.type === "image" ? "Screenshot Image *" : "Avatar Image (optional)"}
                sizeHint={form.type === "image" ? "800×600 px (4:3 ratio, JPG/PNG) • Max 200 KB" : "150×150 px (square, PNG) • Max 50 KB"} />
            )}
            {form.type === "video" && (
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Video URL (YouTube/Vimeo) *</Label>
                <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Rating (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} /></div>
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /><Label className="text-sm">Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label className="text-sm">Active</Label></div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">{editId ? "Update" : "Create"} Testimonial</Button>
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Testimonials</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Testimonial</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-12">S.No</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Institute</TableHead><TableHead>Rating</TableHead><TableHead>Active</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {testimonials.map((t, idx) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{typeBadge(t.type)}</TableCell>
                <TableCell>{t.institute || "—"}</TableCell>
                <TableCell><div className="flex items-center gap-1">{Array.from({ length: t.rating || 0 }).map((_, i) => (<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />))}</div></TableCell>
                <TableCell>{t.active ? "Yes" : "No"}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/><span className="text-[10px]">{new Date(t.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {testimonials.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No testimonials yet</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminTestimonials;
