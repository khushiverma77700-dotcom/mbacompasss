import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Clock, Star, Users, ArrowLeft } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";

const emptyForm = {
  name: "", description: "", institute_id: "", duration: "", fees: 0,
  batch_info: "", syllabus_url: "", curriculum: [] as string[], brochure_url: "",
  course_category_id: "", mode: "Offline", start_date: "", total_seats: 0,
  highlights: [] as string[], eligibility: "", demo_video_url: "",
  discount_text: "", rating: 0, enrolled_count: 0,
};

const AdminCourses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [courseCategories, setCourseCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [curriculumInput, setCurriculumInput] = useState("");
  const [highlightInput, setHighlightInput] = useState("");
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
    if (item && !form.curriculum.includes(item)) setForm({ ...form, curriculum: [...form.curriculum, item] });
    setCurriculumInput("");
  };

  const addHighlight = () => {
    const item = highlightInput.trim();
    if (item && !form.highlights.includes(item)) setForm({ ...form, highlights: [...form.highlights, item] });
    setHighlightInput("");
  };

  const handleSave = async () => {
    if (!form.name || !form.institute_id) { toast({ title: "Error", description: "Name and Institute are required", variant: "destructive" }); return; }
    const payload = {
      name: form.name, description: form.description || null,
      institute_id: form.institute_id, duration: form.duration || null,
      fees: form.fees || null, batch_info: form.batch_info || null,
      syllabus_url: form.syllabus_url || null, brochure_url: form.brochure_url || null,
      curriculum: form.curriculum.length > 0 ? form.curriculum : null,
      course_category_id: form.course_category_id || null, mode: form.mode || "Offline",
      start_date: form.start_date || null, total_seats: form.total_seats || null,
      highlights: form.highlights.length > 0 ? form.highlights : [],
      eligibility: form.eligibility || null, demo_video_url: form.demo_video_url || null,
      discount_text: form.discount_text || null, rating: form.rating || 0, enrolled_count: form.enrolled_count || 0,
    } as any;

    if (editId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Course updated" : "Course created" });
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchData();
  };

  const handleEdit = (course: any) => {
    setForm({
      name: course.name, description: course.description ?? "",
      institute_id: course.institute_id, duration: course.duration ?? "",
      fees: course.fees ?? 0, batch_info: course.batch_info ?? "",
      syllabus_url: course.syllabus_url ?? "", curriculum: course.curriculum ?? [],
      brochure_url: course.brochure_url ?? "", course_category_id: course.course_category_id ?? "",
      mode: course.mode ?? "Offline", start_date: course.start_date ?? "",
      total_seats: course.total_seats ?? 0, highlights: course.highlights ?? [],
      eligibility: course.eligibility ?? "", demo_video_url: course.demo_video_url ?? "",
      discount_text: course.discount_text ?? "", rating: course.rating ?? 0, enrolled_count: course.enrolled_count ?? 0,
    });
    setEditId(course.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await supabase.from("courses").delete().eq("id", id);
    fetchData(); toast({ title: "Course deleted" });
  };

  const filtered = search ? courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.institutes?.name?.toLowerCase().includes(search.toLowerCase())) : courses;

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Course</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="extras">Extras</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="highlights">Highlights</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institute *</Label>
                    <Select value={form.institute_id} onValueChange={(v) => setForm({ ...form, institute_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Institute" /></SelectTrigger>
                      <SelectContent>{institutes.map(i => (<SelectItem key={i.id} value={i.id}>{i.name} {i.city ? `(${i.city})` : ""}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Course Category</Label>
                    <Select value={form.course_category_id} onValueChange={(v) => setForm({ ...form, course_category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>{courseCategories.map(cc => (<SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Course Name *</Label><Input placeholder="e.g. CAT 2026 Complete Course" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label><RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Detailed course description..." /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Duration</Label><Input placeholder="e.g. 12 months" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Fees (₹)</Label><Input type="number" placeholder="45000" value={form.fees} onChange={(e) => setForm({ ...form, fees: parseFloat(e.target.value) || 0 })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Mode</Label>
                    <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="Offline">Offline</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Batch Info</Label><Input placeholder="e.g. 30-40 students | Weekend + Weekday batches" value={form.batch_info} onChange={(e) => setForm({ ...form, batch_info: e.target.value })} /></div>
              </TabsContent>

              <TabsContent value="extras" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Start Date</Label><Input placeholder="e.g. April 15, 2026" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Total Seats</Label><Input type="number" placeholder="50" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Rating (0-5)</Label><Input type="number" step="0.1" min="0" max="5" placeholder="4.5" value={form.rating} onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Enrolled Students</Label><Input type="number" placeholder="230" value={form.enrolled_count} onChange={(e) => setForm({ ...form, enrolled_count: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Eligibility</Label><Input placeholder="e.g. Graduates with min 50% marks" value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Demo Video URL</Label><Input placeholder="https://youtube.com/..." value={form.demo_video_url} onChange={(e) => setForm({ ...form, demo_video_url: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Discount / Offer Text</Label><Input placeholder="e.g. 20% off for early birds!" value={form.discount_text} onChange={(e) => setForm({ ...form, discount_text: e.target.value })} /></div>
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Curriculum Items</Label>
                  <p className="text-xs text-muted-foreground mb-2">Add each topic, module, or learning outcome</p>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="e.g. Quantitative Aptitude — Number Systems, Algebra" value={curriculumInput} onChange={(e) => setCurriculumInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCurriculum(); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={addCurriculum}>Add</Button>
                  </div>
                  <div className="space-y-1.5">
                    {form.curriculum.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground w-6">{idx + 1}.</span>
                        <span className="text-sm text-foreground flex-1">{item}</span>
                        <button onClick={() => setForm({ ...form, curriculum: form.curriculum.filter((_, i) => i !== idx) })} className="text-destructive hover:text-destructive/80"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  {form.curriculum.length === 0 && <p className="text-xs text-muted-foreground italic py-4 text-center">No curriculum items added yet</p>}
                </div>
              </TabsContent>

              <TabsContent value="highlights" className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Course Highlights</Label>
                  <p className="text-xs text-muted-foreground mb-2">Add key selling points that appear on course cards</p>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="e.g. 200+ hours of live classes" value={highlightInput} onChange={(e) => setHighlightInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHighlight(); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={addHighlight}>Add</Button>
                  </div>
                  <div className="space-y-1.5">
                    {form.highlights.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <Star className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground flex-1">{item}</span>
                        <button onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== idx) })} className="text-destructive hover:text-destructive/80"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  {form.highlights.length === 0 && <p className="text-xs text-muted-foreground italic py-4 text-center">No highlights added yet</p>}
                </div>
              </TabsContent>

              <TabsContent value="materials" className="space-y-3">
                <FileUpload bucket="uploads" folder="courses/syllabus" value={form.syllabus_url} onChange={(url) => setForm({ ...form, syllabus_url: url })} accept=".pdf,.doc,.docx" label="Syllabus Document (PDF/DOC)" />
                <FileUpload bucket="uploads" folder="courses/brochures" value={form.brochure_url} onChange={(url) => setForm({ ...form, brochure_url: url })} accept=".pdf,.doc,.docx,.jpg,.png" label="Course Brochure (PDF/Image)" sizeHint="PDF/Image brochure • Max 5 MB" />
                <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                  <h4 className="font-heading font-semibold text-foreground text-sm mb-2">Course Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{form.name || "—"}</span></div>
                    <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium text-foreground">{form.duration || "—"}</span></div>
                    <div><span className="text-muted-foreground">Fees:</span> <span className="font-medium text-primary">{form.fees ? `₹${Number(form.fees).toLocaleString()}` : "—"}</span></div>
                    <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium text-foreground">{form.mode}</span></div>
                    <div><span className="text-muted-foreground">Curriculum:</span> <span className="font-medium text-foreground">{form.curriculum.length} topics</span></div>
                    <div><span className="text-muted-foreground">Highlights:</span> <span className="font-medium text-foreground">{form.highlights.length} items</span></div>
                    <div><span className="text-muted-foreground">Rating:</span> <span className="font-medium text-foreground">{form.rating || "—"}</span></div>
                    <div><span className="text-muted-foreground">Enrolled:</span> <span className="font-medium text-foreground">{form.enrolled_count || "—"}</span></div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="w-full mt-4">{editId ? "Update" : "Create"} Course</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Manage Courses</h1>
          <p className="text-sm text-muted-foreground">{courses.length} courses across {new Set(courses.map(c => c.institute_id)).size} institutes</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Course</Button>
      </div>

      <div className="mb-4"><Input placeholder="Search courses or institutes..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <SortableTableHead label="Course Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Institute</TableHead>
                <SortableTableHead label="Mode" sortKey="mode" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Duration" sortKey="duration" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Fees" sortKey="fees" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Rating" sortKey="rating" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Enrolled" sortKey="enrolled_count" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c, idx) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {c.syllabus_url && <span className="text-xs text-primary">📄 Syllabus</span>}
                        {(c as any).course_categories?.name && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{(c as any).course_categories.name}</Badge>}
                        {c.discount_text && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{c.discount_text}</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div><div className="text-foreground">{c.institutes?.name ?? "—"}</div>{c.institutes?.city && <span className="text-xs text-muted-foreground">{c.institutes.city}</span>}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{c.mode || "Offline"}</Badge></TableCell>
                  <TableCell><span className="flex items-center gap-1 text-sm"><Clock className="w-3 h-3" /> {c.duration ?? "—"}</span></TableCell>
                  <TableCell><span className="font-heading font-semibold text-primary">{c.fees ? `₹${Number(c.fees).toLocaleString()}` : "—"}</span></TableCell>
                  <TableCell>{c.rating ? <span className="flex items-center gap-1 text-sm"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {Number(c.rating).toFixed(1)}</span> : "—"}</TableCell>
                  <TableCell>{c.enrolled_count ? <span className="flex items-center gap-1 text-sm"><Users className="w-3 h-3" /> {c.enrolled_count}</span> : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/><span className="text-[10px]">{new Date(c.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No courses found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourses;
