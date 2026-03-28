import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const emptyForm = {
  name: "", description: "", institute_id: "", duration: "", fees: 0,
  batch_info: "", syllabus_url: "", curriculum: [] as string[],
};

const AdminCourses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [curriculumInput, setCurriculumInput] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    const [c, i] = await Promise.all([
      supabase.from("courses").select("*, institutes(name)").order("created_at", { ascending: false }),
      supabase.from("institutes").select("id, name").order("name"),
    ]);
    if (c.data) setCourses(c.data);
    if (i.data) setInstitutes(i.data);
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
      name: form.name,
      description: form.description || null,
      institute_id: form.institute_id,
      duration: form.duration || null,
      fees: form.fees || null,
      batch_info: form.batch_info || null,
      syllabus_url: form.syllabus_url || null,
      curriculum: form.curriculum.length > 0 ? form.curriculum : null,
    };

    if (editId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Course updated" : "Course created" });
    setDialogOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchData();
  };

  const handleEdit = (course: any) => {
    setForm({
      name: course.name,
      description: course.description ?? "",
      institute_id: course.institute_id,
      duration: course.duration ?? "",
      fees: course.fees ?? 0,
      batch_info: course.batch_info ?? "",
      syllabus_url: course.syllabus_url ?? "",
      curriculum: course.curriculum ?? [],
    });
    setEditId(course.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await supabase.from("courses").delete().eq("id", id);
    fetchData();
    toast({ title: "Course deleted" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Courses</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Course</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institute *</Label>
                <Select value={form.institute_id} onValueChange={(v) => setForm({ ...form, institute_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Institute" /></SelectTrigger>
                  <SelectContent>
                    {institutes.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Course Name *</Label>
                <Input placeholder="e.g. CAT Complete Course" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label>
                <Textarea placeholder="Course description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
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
                <Input placeholder="e.g. 30-40 students | Starts April 2026" value={form.batch_info} onChange={(e) => setForm({ ...form, batch_info: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Syllabus URL</Label>
                <Input placeholder="Link to syllabus PDF" value={form.syllabus_url} onChange={(e) => setForm({ ...form, syllabus_url: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Curriculum Items</Label>
                <div className="flex gap-2 mb-2">
                  <Input placeholder="Add item" value={curriculumInput} onChange={(e) => setCurriculumInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCurriculum(); } }} />
                  <Button type="button" variant="outline" size="sm" onClick={addCurriculum}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.curriculum.map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                      {item}
                      <button onClick={() => setForm({ ...form, curriculum: form.curriculum.filter((_, i) => i !== idx) })}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"} Course</Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.institutes?.name ?? "—"}</TableCell>
                  <TableCell>{c.duration ?? "—"}</TableCell>
                  <TableCell>{c.fees ? `₹${Number(c.fees).toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {courses.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No courses yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourses;
