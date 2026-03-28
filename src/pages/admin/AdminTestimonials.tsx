import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

const emptyForm = {
  type: "text" as string,
  name: "",
  designation: "",
  institute: "",
  content: "",
  image_url: "",
  video_url: "",
  rating: 5,
  featured: false,
  sort_order: 0,
  active: true,
};

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase.from("testimonials").select("*").order("sort_order");
    if (data) setTestimonials(data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    const payload = { ...form };
    if (editId) {
      const { error } = await supabase.from("testimonials").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("testimonials").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Testimonial updated" : "Testimonial created" });
    setDialogOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchData();
  };

  const handleEdit = (t: any) => {
    setForm({
      type: t.type || "text",
      name: t.name,
      designation: t.designation || "",
      institute: t.institute || "",
      content: t.content || "",
      image_url: t.image_url || "",
      video_url: t.video_url || "",
      rating: t.rating || 5,
      featured: t.featured || false,
      sort_order: t.sort_order || 0,
      active: t.active ?? true,
    });
    setEditId(t.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    fetchData();
    toast({ title: "Testimonial deleted" });
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = { text: "bg-blue-100 text-blue-800", image: "bg-green-100 text-green-800", video: "bg-purple-100 text-purple-800" };
    return <Badge className={`${colors[type] || ""} border-none text-xs`}>{type}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Testimonials</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}><Plus className="w-4 h-4 mr-2" /> Add Testimonial</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} Testimonial</DialogTitle>
              <DialogDescription>Add student testimonials with text, screenshot images, or video links.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
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
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Designation</Label>
                  <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="CAT 99.5%ile" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institute</Label>
                  <Input value={form.institute} onChange={(e) => setForm({ ...form, institute: e.target.value })} placeholder="IIM Ahmedabad" />
                </div>
              </div>
              {form.type === "text" && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Testimonial Content</Label>
                  <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Their experience..." />
                </div>
              )}
              {(form.type === "image" || form.type === "text") && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Image URL {form.type === "image" ? "*" : "(optional avatar)"}</Label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
              )}
              {form.type === "video" && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Video URL (YouTube/Vimeo) *</Label>
                  <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Rating (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                  <Label className="text-sm">Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"} Testimonial</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Institute</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{typeBadge(t.type)}</TableCell>
                  <TableCell>{t.institute || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: t.rating || 0 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{t.active ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {testimonials.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No testimonials yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTestimonials;
