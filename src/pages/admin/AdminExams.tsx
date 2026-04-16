import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, ArrowLeft } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SEOChecklist from "@/components/admin/SEOChecklist";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";

const emptyForm = {
  name: "", slug: "", full_name: "", description: "", conducting_body: "",
  eligibility: "", exam_date: "", registration_deadline: "", frequency: "",
  syllabus: [] as string[], keywords: [] as string[],
  meta_title: "", meta_description: "",
};

const AdminExams = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [syllabusInput, setSyllabusInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const { toast } = useToast();
  const { sortedItems: sortedExams, sortConfig, handleSort } = useTableSort(exams);

  const fetchExams = async () => {
    const { data } = await supabase.from("exams").select("*").order("name");
    if (data) setExams(data);
  };

  useEffect(() => { fetchExams(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") + "-exam";

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    const slug = form.slug || generateSlug(form.name);
    const payload: any = {
      name: form.name, slug, full_name: form.full_name || null,
      description: form.description || null, conducting_body: form.conducting_body || null,
      eligibility: form.eligibility || null, exam_date: form.exam_date || null,
      registration_deadline: form.registration_deadline || null, frequency: form.frequency || null,
      syllabus: form.syllabus.length > 0 ? form.syllabus : null,
      keywords: form.keywords.length > 0 ? form.keywords : null,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
    };

    if (editId) {
      const { error } = await supabase.from("exams").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("exams").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Exam updated" : "Exam created" });
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchExams();
  };

  const handleEdit = (exam: any) => {
    setForm({
      name: exam.name, slug: exam.slug, full_name: exam.full_name ?? "",
      description: exam.description ?? "", conducting_body: exam.conducting_body ?? "",
      eligibility: exam.eligibility ?? "", exam_date: exam.exam_date ?? "",
      registration_deadline: exam.registration_deadline ?? "", frequency: exam.frequency ?? "",
      syllabus: exam.syllabus ?? [], keywords: exam.keywords ?? [],
      meta_title: exam.meta_title ?? "", meta_description: exam.meta_description ?? "",
    });
    setEditId(exam.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    const item = exams.find(e => e.id === id);
    await supabase.from("exams").delete().eq("id", id);
    if (item) {
      const { cleanupDeletedPage } = await import("@/lib/adminCleanup");
      await cleanupDeletedPage({ contentType: "exam", id, slug: item.slug, name: item.name });
    }
    fetchExams(); toast({ title: "Exam deleted" });
  };

  const addTag = (list: string[], setInput: (s: string) => void, input: string, field: string) => {
    const val = input.trim();
    if (val && !list.includes(val)) {
      setForm({ ...form, [field]: [...list, val] });
    }
    setInput("");
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Exams
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? "Edit" : "Add"} Exam</CardTitle>
              <AISEOButton
                contentType="exam"
                recordId={editId || undefined}
                data={{ name: form.name, full_name: form.full_name, description: form.description, conducting_body: form.conducting_body, slug: form.slug }}
                onApply={(s) => setForm(f => ({
                  ...f,
                  ...(s.meta_title && { meta_title: s.meta_title }),
                  ...(s.meta_description && { meta_description: s.meta_description }),
                  ...(s.keywords && { keywords: s.keywords }),
                }))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Short Name *</Label><Input placeholder="e.g. CAT" value={form.name} onChange={(e) => { const name = e.target.value; setForm({ ...form, name, slug: editId ? form.slug : generateSlug(name) }); }} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono text-sm" /></div>
                </div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Full Name</Label><Input placeholder="e.g. Common Admission Test" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label><RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Exam description..." /></div>
                <Input placeholder="Conducting Body" value={form.conducting_body} onChange={(e) => setForm({ ...form, conducting_body: e.target.value })} />
              </TabsContent>

              <TabsContent value="details" className="space-y-3">
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Eligibility Criteria</Label><RichTextEditor content={form.eligibility} onChange={(html) => setForm({ ...form, eligibility: html })} placeholder="Eligibility criteria..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Exam Date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
                  <Input placeholder="Registration Deadline" value={form.registration_deadline} onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })} />
                </div>
                <Input placeholder="Frequency (e.g. Annual)" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Syllabus Topics</Label>
                  <div className="flex gap-2 mb-2">
                    <Input placeholder="Add topic" value={syllabusInput} onChange={(e) => setSyllabusInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(form.syllabus, setSyllabusInput, syllabusInput, "syllabus"); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => addTag(form.syllabus, setSyllabusInput, syllabusInput, "syllabus")}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form.syllabus.map(s => (
                      <Badge key={s} variant="secondary" className="gap-1 text-xs">{s}<button onClick={() => setForm({ ...form, syllabus: form.syllabus.filter(x => x !== s) })}><X className="w-3 h-3" /></button></Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-3">
                <SEOChecklist data={{ title: form.name, slug: form.slug, meta_title: form.meta_title, meta_description: form.meta_description, keywords: form.keywords, description: form.description, schemaType: "exam" }} contentType="exam" recordId={editId || undefined} showPublishWarning />
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Title</Label><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={70} /><span className="text-xs text-muted-foreground">{form.meta_title.length}/60</span></div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Description</Label><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={170} /><span className="text-xs text-muted-foreground">{form.meta_description.length}/160</span></div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Keywords</Label>
                  <div className="flex gap-2 mb-2">
                    <Input placeholder="Add keyword" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(form.keywords, setKeywordInput, keywordInput, "keywords"); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => addTag(form.keywords, setKeywordInput, keywordInput, "keywords")}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form.keywords.map(kw => (
                      <Badge key={kw} variant="secondary" className="gap-1 text-xs">{kw}<button onClick={() => setForm({ ...form, keywords: form.keywords.filter(x => x !== kw) })}><X className="w-3 h-3" /></button></Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="w-full mt-4">{editId ? "Update" : "Create"} Exam</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Exams</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Exam</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <SortableTableHead label="Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Full Name" sortKey="full_name" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Conducting Body" sortKey="conducting_body" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Exam Date" sortKey="exam_date" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTableHead label="Created" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e, idx) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.full_name ?? "—"}</TableCell>
                  <TableCell>{e.conducting_body ?? "—"}</TableCell>
                  <TableCell>{e.exam_date ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/><span className="text-[10px]">{new Date(e.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(e)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {exams.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No exams yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminExams;
