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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";
import ResponsiveImageUpload from "@/components/admin/ResponsiveImageUpload";
import SEOChecklist from "@/components/admin/SEOChecklist";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";

const emptyForm = {
  name: "", slug: "", description: "", city: "", state: "", type: "Private",
  established: 0, ranking: 0, fees: "", website: "",
  placement_avg: "", placement_highest: "", placement_median: "",
  campus_size: "", total_students: 0, admission_process: "",
  logo_url: "", banner_url: "",
  courses: [] as string[], accreditations: [] as string[],
  exams_accepted: [] as string[], top_recruiters: [] as string[],
  meta_title: "", meta_description: "", keywords: [] as string[],
};

const AdminColleges = () => {
  const [colleges, setColleges] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [tagInputs, setTagInputs] = useState({ courses: "", accreditations: "", exams_accepted: "", top_recruiters: "", keywords: "" });
  const { toast } = useToast();

  const fetchColleges = async () => {
    const { data } = await supabase.from("colleges").select("id, name, slug, city, state, type, ranking, established").order("ranking", { ascending: true });
    if (data) setColleges(data);
  };

  useEffect(() => { fetchColleges(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 75);

  const addTag = (field: keyof typeof tagInputs) => {
    const val = tagInputs[field].trim();
    if (val && !(form[field] as string[]).includes(val)) {
      setForm({ ...form, [field]: [...(form[field] as string[]), val] });
    }
    setTagInputs({ ...tagInputs, [field]: "" });
  };

  const removeTag = (field: string, val: string) => {
    setForm({ ...form, [field]: (form[field as keyof typeof form] as string[]).filter(v => v !== val) });
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    const slug = form.slug || generateSlug(form.name);
    const payload: any = {
      name: form.name, slug, description: form.description || null,
      city: form.city || null, state: form.state || null, type: form.type || null,
      established: form.established || null, ranking: form.ranking || null,
      fees: form.fees || null, website: form.website || null,
      placement_avg: form.placement_avg || null, placement_highest: form.placement_highest || null,
      placement_median: form.placement_median || null, campus_size: form.campus_size || null,
      total_students: form.total_students || null, admission_process: form.admission_process || null,
      logo_url: form.logo_url || null, banner_url: form.banner_url || null,
      courses: form.courses.length > 0 ? form.courses : null,
      accreditations: form.accreditations.length > 0 ? form.accreditations : null,
      exams_accepted: form.exams_accepted.length > 0 ? form.exams_accepted : null,
      top_recruiters: form.top_recruiters.length > 0 ? form.top_recruiters : null,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      keywords: form.keywords.length > 0 ? form.keywords : null,
    };

    if (editId) {
      const { error } = await supabase.from("colleges").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("colleges").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "College updated" : "College created" });
    setDialogOpen(false); setForm(emptyForm); setEditId(null); fetchColleges();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("colleges").select("*").eq("id", id).maybeSingle();
    if (!data) return;
    setForm({
      name: data.name, slug: data.slug, description: data.description ?? "",
      city: data.city ?? "", state: data.state ?? "", type: data.type ?? "Private",
      established: data.established ?? 0, ranking: data.ranking ?? 0,
      fees: data.fees ?? "", website: data.website ?? "",
      placement_avg: data.placement_avg ?? "", placement_highest: data.placement_highest ?? "",
      placement_median: data.placement_median ?? "", campus_size: data.campus_size ?? "",
      total_students: data.total_students ?? 0, admission_process: data.admission_process ?? "",
      logo_url: data.logo_url ?? "", banner_url: data.banner_url ?? "",
      courses: data.courses ?? [], accreditations: data.accreditations ?? [],
      exams_accepted: data.exams_accepted ?? [], top_recruiters: data.top_recruiters ?? [],
      meta_title: data.meta_title ?? "", meta_description: data.meta_description ?? "",
      keywords: data.keywords ?? [],
    });
    setEditId(id); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this college?")) return;
    await supabase.from("colleges").delete().eq("id", id);
    fetchColleges(); toast({ title: "College deleted" });
  };

  const TagInput = ({ field, label }: { field: keyof typeof tagInputs; label: string }) => (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex gap-2 mb-2">
        <Input placeholder={`Add ${label.toLowerCase()}`} value={tagInputs[field]}
          onChange={(e) => setTagInputs({ ...tagInputs, [field]: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(field); } }} />
        <Button type="button" variant="outline" size="sm" onClick={() => addTag(field)}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(form[field] as string[]).map(v => (
          <Badge key={v} variant="secondary" className="gap-1 text-xs">
            {v}
            <button onClick={() => removeTag(field, v)}><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Colleges</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}><Plus className="w-4 h-4 mr-2" /> Add College</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{editId ? "Edit" : "Add"} College</DialogTitle>
                <AISEOButton
                  contentType="college"
                  recordId={editId || undefined}
                  data={{ name: form.name, description: form.description, city: form.city, state: form.state, slug: form.slug, courses: form.courses, fees: form.fees }}
                  onApply={(s) => setForm(f => ({
                    ...f,
                    ...(s.meta_title && { meta_title: s.meta_title }),
                    ...(s.meta_description && { meta_description: s.meta_description }),
                    ...(s.keywords && { keywords: s.keywords }),
                  }))}
                />
              </div>
            </DialogHeader>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="placements">Placements</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3">
                <Input placeholder="College Name *" value={form.name} onChange={(e) => {
                  const name = e.target.value;
                  setForm({ ...form, name, slug: editId ? form.slug : generateSlug(name) });
                }} />
                <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono text-sm" />
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label>
                  <RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="College description..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["IIM", "Private", "Government", "Deemed", "Autonomous", "University"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input type="number" placeholder="Established Year" value={form.established || ""} onChange={(e) => setForm({ ...form, established: parseInt(e.target.value) || 0 })} />
                  <Input type="number" placeholder="Ranking" value={form.ranking || ""} onChange={(e) => setForm({ ...form, ranking: parseInt(e.target.value) || 0 })} />
                  <Input placeholder="Fees (e.g. ₹20L)" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} />
                </div>
                <FileUpload bucket="uploads" folder="colleges/logos" value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} accept="image/*" label="College Logo" sizeHint="200×200 px (square, PNG) • Max 100 KB" />
                <ResponsiveImageUpload
                  bucket="uploads"
                  folder="colleges/banners"
                  label="Banner Image"
                  desktopValue={form.banner_url}
                  mobileValue={(form as any).mobile_banner_url || ""}
                  onDesktopChange={(url) => setForm({ ...form, banner_url: url })}
                  onMobileChange={(url) => setForm({ ...form, mobile_banner_url: url } as any)}
                  desktopSpec={{ dimensions: "1200×400 px", ratio: "3:1, landscape", maxSize: "250 KB" }}
                  mobileSpec={{ dimensions: "600×300 px", ratio: "2:1", maxSize: "120 KB" }}
                />
                <Input placeholder="Website URL" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </TabsContent>

              <TabsContent value="placements" className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Avg Package</Label>
                    <Input placeholder="e.g. ₹25 LPA" value={form.placement_avg} onChange={(e) => setForm({ ...form, placement_avg: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Highest Package</Label>
                    <Input placeholder="e.g. ₹80 LPA" value={form.placement_highest} onChange={(e) => setForm({ ...form, placement_highest: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Median Package</Label>
                    <Input placeholder="e.g. ₹22 LPA" value={form.placement_median} onChange={(e) => setForm({ ...form, placement_median: e.target.value })} />
                  </div>
                </div>
                <TagInput field="top_recruiters" label="Top Recruiters" />
              </TabsContent>

              <TabsContent value="details" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Campus Size" value={form.campus_size} onChange={(e) => setForm({ ...form, campus_size: e.target.value })} />
                  <Input type="number" placeholder="Total Students" value={form.total_students || ""} onChange={(e) => setForm({ ...form, total_students: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Admission Process</Label>
                  <RichTextEditor content={form.admission_process} onChange={(html) => setForm({ ...form, admission_process: html })} placeholder="Describe the admission process..." />
                </div>
                <TagInput field="courses" label="Courses Offered" />
                <TagInput field="accreditations" label="Accreditations" />
                <TagInput field="exams_accepted" label="Exams Accepted" />
              </TabsContent>

              <TabsContent value="seo" className="space-y-3">
                <SEOChecklist data={{
                  title: form.name, slug: form.slug, meta_title: form.meta_title,
                  meta_description: form.meta_description, keywords: form.keywords,
                  description: form.description, banner_url: form.banner_url,
                  schemaType: "college",
                }} contentType="college" recordId={editId || undefined} showPublishWarning />
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Title</Label>
                  <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={70} />
                  <span className="text-xs text-muted-foreground">{form.meta_title.length}/60</span>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Description</Label>
                  <Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={170} />
                  <span className="text-xs text-muted-foreground">{form.meta_description.length}/160</span>
                </div>
                <TagInput field="keywords" label="Target Keywords" />
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="w-full mt-4">{editId ? "Update" : "Create"} College</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Est.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colleges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.ranking ?? "—"}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{c.type ?? "—"}</Badge></TableCell>
                  <TableCell>{c.established ?? "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c.id)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {colleges.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No colleges yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminColleges;
