import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useFilteredList } from "@/hooks/useFilteredList";

const emptyForm = {
  coaching_of_week_id: "", year: new Date().getFullYear(),
  total_calls: 0, conversions: 0, students_placed: 0, avg_score_improvement: 0,
  iim_a_selections: 0, iim_b_selections: 0, cat_99_plus: 0, xat_99_plus: 0,
};

const AdminCoachingResults = () => {
  const [items, setItems] = useState<any[]>([]);
  const [cotwOptions, setCotwOptions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
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
      coaching_of_week_id: form.coaching_of_week_id, year: form.year, total_calls: form.total_calls, conversions: form.conversions,
      students_placed: form.students_placed, avg_score_improvement: form.avg_score_improvement,
      iim_a_selections: form.iim_a_selections, iim_b_selections: form.iim_b_selections,
      cat_99_plus: form.cat_99_plus, xat_99_plus: form.xat_99_plus,
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
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchAll();
  };

  const handleEdit = (item: any) => {
    setForm({
      coaching_of_week_id: item.coaching_of_week_id, year: item.year, total_calls: item.total_calls || 0,
      conversions: item.conversions || 0, students_placed: item.students_placed || 0,
      avg_score_improvement: item.avg_score_improvement || 0,
      iim_a_selections: item.iim_a_selections || 0, iim_b_selections: item.iim_b_selections || 0,
      cat_99_plus: item.cat_99_plus || 0, xat_99_plus: item.xat_99_plus || 0,
    });
    setEditId(item.id); setShowForm(true);
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

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(items.map((i) => String(i.year)))).filter(Boolean).sort((a, b) => Number(b) - Number(a));
    return [{ label: "All years", value: "all" }, ...years.map((y) => ({ label: y, value: y }))];
  }, [items]);

  const { filtered, filters, setFilter, clearAll, activeCount } = useFilteredList(items, {
    storageKey: "admin.coachingResults.filters",
    defaults: { search: "", coaching: "all", year: "all" },
    searchFields: [
      (i) => getLabel(i),
      (i) => (i as any).coaching_of_week?.headline,
      (i) => (i as any).coaching_of_week?.institutes?.name,
    ],
    fieldFilters: {
      coaching: (i) => i.coaching_of_week_id,
      year: (i) => String(i.year),
    },
  });

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Coaching Results
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Yearly Result</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
              <div><Label className="text-xs">IIM-A Selections</Label><Input type="number" value={form.iim_a_selections} onChange={(e) => setForm({ ...form, iim_a_selections: parseInt(e.target.value) || 0 })} /></div>
              <div><Label className="text-xs">IIM-B Selections</Label><Input type="number" value={form.iim_b_selections} onChange={(e) => setForm({ ...form, iim_b_selections: parseInt(e.target.value) || 0 })} /></div>
              <div><Label className="text-xs">CAT 99+%ile</Label><Input type="number" value={form.cat_99_plus} onChange={(e) => setForm({ ...form, cat_99_plus: parseInt(e.target.value) || 0 })} /></div>
              <div><Label className="text-xs">XAT 99+%ile</Label><Input type="number" value={form.xat_99_plus} onChange={(e) => setForm({ ...form, xat_99_plus: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label className="text-xs">Avg Score Improvement</Label><Input type="number" value={form.avg_score_improvement} onChange={(e) => setForm({ ...form, avg_score_improvement: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">{editId ? "Update" : "Create"}</Button>
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Coaching Results (Yearly)</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Result</Button>
      </div>
      <AdminFilterBar
        searchValue={filters.search ?? ""}
        onSearchChange={(v) => setFilter("search", v)}
        searchPlaceholder="Search institute, headline…"
        values={filters}
        onFilterChange={setFilter}
        onClearAll={clearAll}
        activeCount={activeCount}
        resultsHint={`${filtered.length} of ${items.length} shown`}
        filters={[
          {
            type: "select", key: "coaching", label: "Coaching Entry", width: "w-60",
            options: [{ label: "All", value: "all" }, ...cotwOptions.map((c: any) => ({ label: `${c.institutes?.name || "?"} — ${c.headline || ""}`, value: c.id }))],
          },
          { type: "select", key: "year", label: "Year", width: "w-28", options: yearOptions },
        ]}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Coaching</TableHead><TableHead>Year</TableHead><TableHead>Calls</TableHead><TableHead>Conv%</TableHead><TableHead>Placed</TableHead><TableHead>IIM-A</TableHead><TableHead>IIM-B</TableHead><TableHead>CAT 99+</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium max-w-[150px] truncate">{getLabel(item)}</TableCell>
                <TableCell>{item.year}</TableCell><TableCell>{item.total_calls}</TableCell><TableCell>{item.conversions}%</TableCell>
                <TableCell>{item.students_placed}</TableCell><TableCell>{item.iim_a_selections || 0}</TableCell>
                <TableCell>{item.iim_b_selections || 0}</TableCell><TableCell>{item.cat_99_plus || 0}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No results match your filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminCoachingResults;
