import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";

const emptyForm = { institute_id: "", year: new Date().getFullYear(), college_name: "", students_selected: 0, description: "" };

const AdminInstituteResults = () => {
  const [results, setResults] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInstitutes = async () => {
    const { data } = await supabase.from("institutes").select("id, name").order("name");
    if (data) setInstitutes(data);
  };

  const fetchResults = async () => {
    let query = supabase.from("institute_results").select("*, institutes(name)").order("year", { ascending: false });
    if (selectedInstitute) query = query.eq("institute_id", selectedInstitute);
    const { data } = await query;
    if (data) setResults(data);
  };

  useEffect(() => { fetchInstitutes(); }, []);
  useEffect(() => { fetchResults(); }, [selectedInstitute]);

  const handleSave = async () => {
    if (!form.institute_id) { toast({ title: "Select an institute", variant: "destructive" }); return; }
    const payload = { institute_id: form.institute_id, year: form.year, college_name: form.college_name, students_selected: form.students_selected, description: form.description || null };
    if (editId) {
      const { error } = await supabase.from("institute_results").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Result updated" });
    } else {
      const { error } = await supabase.from("institute_results").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Result added" });
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchResults();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("institute_results").select("*").eq("id", id).single();
    if (data) {
      setForm({ institute_id: data.institute_id, year: data.year, college_name: data.college_name, students_selected: data.students_selected ?? 0, description: data.description ?? "" });
      setEditId(id); setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this result?")) return;
    await supabase.from("institute_results").delete().eq("id", id);
    fetchResults(); toast({ title: "Result deleted" });
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Institute Results
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Result Entry</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institute *</Label>
              <select className="w-full border border-border rounded-md p-2 text-sm bg-background" value={form.institute_id} onChange={(e) => setForm({ ...form, institute_id: e.target.value })}>
                <option value="">Choose institute...</option>
                {institutes.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground block mb-1">Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 2025 })} /></div>
              <div><Label className="text-xs text-muted-foreground block mb-1">Students Selected</Label><Input type="number" value={form.students_selected} onChange={(e) => setForm({ ...form, students_selected: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <Input placeholder="College Name (e.g. IIM Ahmedabad, NMIMS)" value={form.college_name} onChange={(e) => setForm({ ...form, college_name: e.target.value })} />
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label>
              <RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Additional details..." />
            </div>
            <p className="text-xs text-muted-foreground italic">Results are shared by the institute and not guaranteed by us.</p>
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">{editId ? "Update" : "Create"} Result</Button>
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Institute Results</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Result</Button>
      </div>
      <div className="mb-4">
        <select className="border border-border rounded-md p-2 text-sm bg-background w-64" value={selectedInstitute} onChange={(e) => setSelectedInstitute(e.target.value)}>
          <option value="">All Institutes</option>
          {institutes.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
        </select>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Institute</TableHead><TableHead>Year</TableHead><TableHead>College</TableHead><TableHead>Students</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{(r as any).institutes?.name || "—"}</TableCell>
                <TableCell>{r.year}</TableCell><TableCell>{r.college_name}</TableCell><TableCell>{r.students_selected}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(r.id)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No results yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminInstituteResults;
