import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";

const SECTION_TYPES = [
  { value: "why_join", label: "Why Join" },
  { value: "placements", label: "Placements" },
  { value: "gallery", label: "Gallery" },
  { value: "qa", label: "Q&A" },
  { value: "scholarships", label: "Scholarships" },
  { value: "hostel", label: "Hostel & Campus" },
  { value: "faculty", label: "Faculty" },
  { value: "admissions", label: "Admissions" },
  { value: "cutoff", label: "Cut-off" },
  { value: "rankings", label: "Rankings" },
  { value: "reviews", label: "Reviews" },
  { value: "news", label: "News" },
];

const emptyForm = {
  college_id: "",
  section_type: "why_join",
  title: "",
  content: "",
  data: "{}",
  sort_order: 0,
};

const AdminCollegeSections = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [selectedCollege, setSelectedCollege] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchColleges = async () => {
    const { data } = await supabase.from("colleges").select("id, name").order("name");
    if (data) setColleges(data);
  };

  const fetchSections = async () => {
    let query = supabase.from("college_sections").select("*, colleges(name)").order("sort_order");
    if (selectedCollege) query = query.eq("college_id", selectedCollege);
    const { data } = await query;
    if (data) setSections(data);
  };

  useEffect(() => { fetchColleges(); }, []);
  useEffect(() => { fetchSections(); }, [selectedCollege]);

  const handleSave = async () => {
    if (!form.college_id) { toast({ title: "Select a college", variant: "destructive" }); return; }
    let parsedData = {};
    try { parsedData = JSON.parse(form.data); } catch { parsedData = {}; }

    const payload = {
      college_id: form.college_id,
      section_type: form.section_type,
      title: form.title || null,
      content: form.content || null,
      data: parsedData,
      sort_order: form.sort_order,
    };

    if (editId) {
      const { error } = await supabase.from("college_sections").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Section updated" });
    } else {
      const { error } = await supabase.from("college_sections").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Section created" });
    }
    setDialogOpen(false); setForm(emptyForm); setEditId(null); fetchSections();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("college_sections").select("*").eq("id", id).single();
    if (data) {
      setForm({
        college_id: data.college_id,
        section_type: data.section_type,
        title: data.title ?? "",
        content: data.content ?? "",
        data: JSON.stringify(data.data ?? {}, null, 2),
        sort_order: data.sort_order ?? 0,
      });
      setEditId(id); setDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    await supabase.from("college_sections").delete().eq("id", id);
    fetchSections(); toast({ title: "Section deleted" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">College Sections</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} College Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">College *</Label>
                <select className="w-full border border-border rounded-md p-2 text-sm bg-background" value={form.college_id} onChange={(e) => setForm({ ...form, college_id: e.target.value })}>
                  <option value="">Choose college...</option>
                  {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Section Type</Label>
                <Select value={form.section_type} onValueChange={(v) => setForm({ ...form, section_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Section Title (optional override)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Content</Label>
                <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Section content with rich formatting..." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Extra Data (JSON)</Label>
                <textarea className="w-full border border-border rounded-md p-2 text-sm bg-background font-mono h-24" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} placeholder='{"images": [], "items": []}' />
                <span className="text-xs text-muted-foreground">For gallery images, Q&A items, scholarship details etc.</span>
              </div>
              <Input type="number" placeholder="Sort order" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"} Section</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Filter by College</Label>
        <select className="border border-border rounded-md p-2 text-sm bg-background w-64" value={selectedCollege} onChange={(e) => setSelectedCollege(e.target.value)}>
          <option value="">All Colleges</option>
          {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>College</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{(s as any).colleges?.name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{SECTION_TYPES.find((t) => t.value === s.section_type)?.label || s.section_type}</Badge></TableCell>
                  <TableCell>{s.title || "—"}</TableCell>
                  <TableCell>{s.sort_order}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s.id)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {sections.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sections yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCollegeSections;
