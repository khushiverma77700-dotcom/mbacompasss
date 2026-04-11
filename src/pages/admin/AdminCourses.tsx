import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, BookOpen, Clock, IndianRupee } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";

const emptyForm = {
  name: "", description: "", institute_id: "", duration: "", fees: 0,
  batch_info: "", syllabus_url: "", curriculum: [] as string[], brochure_url: "",
  course_category_id: "",
};

const AdminCourses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [courseCategories, setCourseCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [curriculumInput, setCurriculumInput] = useState("");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    const [c, i, cc] = await Promise.all([
      supabase.from("courses").select("*, institutes(name, city, mode), course_categories(name)").order("created_at", { ascending: false }),
      supabase.from("institutes").select("id, name, city").order("name"),
      supabase.from("course_categories").select("*").eq("active", true).order("sort_order").order("name"),
    ]);
    if (c.data) setCourses(c.data);
    if (i.data) setInstitutes(i.data);
    if (cc.data) setCourseCategories(cc.data);
  };

  useEffect(() => { fetchData(); }, []);

  const addCurriculum = () => {
    const item = curriculumInput.trim();
    if (item && !form.curriculum.includes(item)) {
      setForm({ ...form, curriculum: [...form.curriculum, item] });
    }
    setCurriculumInput("");
  };

  const handleSave = async () => {
    if (!form.name || !form.institute_id) {
      toast({ title: "Error", description: "Name and Institute are required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name, description: form.description || null,
      institute_id: form.institute_id, duration: form.duration || null,
      fees: form.fees || null, batch_info: form.batch_info || null,
      syllabus_url: form.syllabus_url || null,
      brochure_url: (form as any).brochure_url || null,
      curriculum: form.curriculum.length > 0 ? form.curriculum : null,
      course_category_id: form.course_category_id || null,
    };

    if (editId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Course updated" : "Course created" });
    setDialogOpen(false); setForm(emptyForm); setEditId(null); fetchData();
  };

  const handleEdit = (course: any) => {
    setForm({
      name: course.name, description: course.description ?? "",
      institute_id: course.institute_id, duration: course.duration ?? "",
      fees: course.fees ?? 0, batch_info: course.batch_info ?? "",
      syllabus_url: course.syllabus_url ?? "", curriculum: course.curriculum ?? [],
      brochure_url: (course as any).brochure_url ?? "",
      course_category_id: course.course_category_id ?? "",
    });
    setEditId(course.id); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await supabase.from("courses").delete().eq("id", id);
    fetchData(); toast({ title: "Course deleted" });
  };

  const filtered = search
    ? courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.institutes?.name?.toLowerCase().includes(search.toLowerCase()))
    : courses;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Manage Courses</h1>
          <p className="text-sm text-muted-foreground">{courses.length} courses across {new Set(courses.map(c => c.institute_id)).size} institutes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}><Plus className="w-4 h-4 mr-2" /> Add Course</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Course</DialogTitle></DialogHeader>
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="details">Course Details</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institute *</Label>
                  <Select value={form.institute_id} onValueChange={(v) => setForm({ ...form, institute_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Institute" /></SelectTrigger>
                    <SelectContent>
                      {institutes.map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} {i.city ? `(${i.city})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Course Name *</Label>
                  <Input placeholder="e.g. CAT 2026 Complete Course" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label>
                  <RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Detailed course description with highlights, what students will learn..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Duration</Label>
                    <Input placeholder="e.g. 12 months" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Fees (₹)</Label>
                    <Input type="number" placeholder="45000" value={form.fees} onChange={(e) => setForm({ ...form, fees: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Batch Info</Label>
                  <Input placeholder="e.g. 30-40 students | Starts April 2026 | Weekend + Weekday batches" value={form.batch_info} onChange={(e) => setForm({ ...form, batch_info: e.target.value })} />
                </div>
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Curriculum Items</Label>
                  <p className="text-xs text-muted-foreground mb-2">Add each topic, module, or learning outcome</p>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="e.g. Quantitative Aptitude — Number Systems, Algebra, Geometry" value={curriculumInput}
                      onChange={(e) => setCurriculumInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCurriculum(); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={addCurriculum}>Add</Button>
                  </div>
                  <div className="space-y-1.5">
                    {form.curriculum.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground w-6">{idx + 1}.</span>
                        <span className="text-sm text-foreground flex-1">{item}</span>
                        <button onClick={() => setForm({ ...form, curriculum: form.curriculum.filter((_, i) => i !== idx) })} className="text-destructive hover:text-destructive/80">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {form.curriculum.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">No curriculum items added yet</p>
                  )}
                  <div className="bg-secondary/50 rounded-lg p-3 mt-3 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong>Tip:</strong> Add detailed items like "Quantitative Aptitude — Number Systems, Algebra, Geometry, Mensuration" for better SEO and student understanding.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="space-y-3">
                <FileUpload
                  bucket="uploads"
                  folder="courses/syllabus"
                  value={form.syllabus_url}
                  onChange={(url) => setForm({ ...form, syllabus_url: url })}
                  accept=".pdf,.doc,.docx"
                  label="Syllabus Document (PDF/DOC)"
                />
                <FileUpload
                  bucket="uploads"
                  folder="courses/brochures"
                  value={(form as any).brochure_url}
                  onChange={(url) => setForm({ ...form, brochure_url: url })}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  label="Course Brochure (PDF/Image)"
                  sizeHint="PDF/Image brochure • Max 5 MB"
                />
                <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                  <h4 className="font-heading font-semibold text-foreground text-sm mb-2">Course Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{form.name || "—"}</span></div>
                    <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium text-foreground">{form.duration || "—"}</span></div>
                    <div><span className="text-muted-foreground">Fees:</span> <span className="font-medium text-primary">{form.fees ? `₹${Number(form.fees).toLocaleString()}` : "—"}</span></div>
                    <div><span className="text-muted-foreground">Curriculum:</span> <span className="font-medium text-foreground">{form.curriculum.length} topics</span></div>
                    <div><span className="text-muted-foreground">Batch:</span> <span className="font-medium text-foreground">{form.batch_info || "—"}</span></div>
                    <div><span className="text-muted-foreground">Syllabus:</span> <span className="font-medium text-foreground">{form.syllabus_url ? "Uploaded ✓" : "Not uploaded"}</span></div>
                    <div><span className="text-muted-foreground">Brochure:</span> <span className="font-medium text-foreground">{(form as any).brochure_url ? "Uploaded ✓" : "Not uploaded"}</span></div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="w-full mt-4">{editId ? "Update" : "Create"} Course</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input placeholder="Search courses or institutes..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Institute</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{c.name}</div>
                      {c.syllabus_url && <span className="text-xs text-primary">📄 Syllabus attached</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-foreground">{c.institutes?.name ?? "—"}</div>
                      {c.institutes?.city && <span className="text-xs text-muted-foreground">{c.institutes.city}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm"><Clock className="w-3 h-3" /> {c.duration ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-heading font-semibold text-primary">{c.fees ? `₹${Number(c.fees).toLocaleString()}` : "—"}</span>
                  </TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{c.batch_info ?? "—"}</span></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{(c.curriculum || []).length} topics</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No courses found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourses;
