import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const emptyForm = { coaching_of_week_id: "", year: new Date().getFullYear(), total_calls: 0, conversions: 0, students_placed: 0, avg_score_improvement: 0 };

const AdminCoachingResults = () => {
  const [items, setItems] = useState<any[]>([]);
  const [cotwOptions, setCotwOptions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAll = async () => {
    const [{ data: results }, { data: cotw }] = await Promise.all([
      supabase.from("coaching_results").select("*, coaching_of_week(headline, institutes(name))").order("year", { ascending: false }),
      supabase.from("coaching_of_week").select("id, headline, institutes(name)").order("created_at", { ascending: false }),
    ]);
    if (results) setItems(results);
    if (cotw) setCotwOptions(cotw);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!form.coaching_of_week_id) { toast({ title: "Select a coaching entry", variant: "destructive" }); return; }
    const payload = {
      coaching_of_week_id: form.coaching_of_week_id,
      year: form.year,
      total_calls: form.total_calls,
      conversions: form.conversions,
      students_placed: form.students_placed,
      avg_score_improvement: form.avg_score_improvement,
    };
    if (editId) {
      const { error } = await supabase.from("coaching_results").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("coaching_results").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Created" });
    }
    setDialogOpen(false); setForm(emptyForm); setEditId(null); fetchAll();
  };

  const handleEdit = (item: any) => {
    setForm({
      coaching_of_week_id: item.coaching_of_week_id,
      year: item.year,
      total_calls: item.total_calls || 0,
      conversions: item.conversions || 0,
      students_placed: item.students_placed || 0,
      avg_score_improvement: item.avg_score_improvement || 0,
    });
    setEditId(item.id); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("coaching_results").delete().eq("id", id);
    fetchAll(); toast({ title: "Deleted" });
  };

  const getLabel = (item: any) => {
    const inst = item.coaching_of_week?.institutes;
    return `${inst?.name || "Unknown"} — ${item.coaching_of_week?.headline || ""}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Coaching Results (Yearly)</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}><Plus className="w-4 h-4 mr-2" /> Add Result</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Yearly Result</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1 block">Coaching Entry *</Label>
                <select className="w-full border border-border rounded-md p-2 text-sm bg-background" value={form.coaching_of_week_id}
                  onChange={(e) => setForm({ ...form, coaching_of_week_id: e.target.value })}>
                  <option value="">Choose...</option>
                  {cotwOptions.map((c: any) => <option key={c.id} value={c.id}>{c.institutes?.name || "?"} — {c.headline || "No headline"}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 2024 })} /></div>
                <div><Label className="text-xs">Total Calls</Label><Input type="number" value={form.total_calls} onChange={(e) => setForm({ ...form, total_calls: parseInt(e.target.value) || 0 })} /></div>
                <div><Label className="text-xs">Conversions (%)</Label><Input type="number" value={form.conversions} onChange={(e) => setForm({ ...form, conversions: parseInt(e.target.value) || 0 })} /></div>
                <div><Label className="text-xs">Students Placed</Label><Input type="number" value={form.students_placed} onChange={(e) => setForm({ ...form, students_placed: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div><Label className="text-xs">Avg Score Improvement</Label><Input type="number" value={form.avg_score_improvement} onChange={(e) => setForm({ ...form, avg_score_improvement: parseFloat(e.target.value) || 0 })} /></div>
              <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Coaching</TableHead><TableHead>Year</TableHead><TableHead>Calls</TableHead><TableHead>Conv %</TableHead><TableHead>Placed</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{getLabel(item)}</TableCell>
                <TableCell>{item.year}</TableCell>
                <TableCell>{item.total_calls}</TableCell>
                <TableCell>{item.conversions}%</TableCell>
                <TableCell>{item.students_placed}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No results yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminCoachingResults;
