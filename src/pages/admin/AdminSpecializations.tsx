import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Tag } from "lucide-react";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useFilteredList } from "@/hooks/useFilteredList";

type SpecRow = {
  id: string;
  name: string;
  slug: string;
  type: "college" | "coaching" | "both";
  active: boolean;
  sort_order: number;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);

const emptyForm = { name: "", slug: "", type: "both" as SpecRow["type"], active: true, sort_order: 0 };

const AdminSpecializations = () => {
  const [items, setItems] = useState<SpecRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const { filtered, filters, setFilter, clearAll, activeCount } = useFilteredList(items, {
    storageKey: "admin.specializations.filters",
    defaults: { search: "", type: "all", active: "all" },
    searchFields: [(s) => s.name, (s) => s.slug],
    fieldFilters: {
      type: (s) => s.type,
      active: (s) => (s.active ? "active" : "hidden"),
    },
  });

  const fetchItems = async () => {
    const { data, error } = await (supabase as any)
      .from("specializations")
      .select("*")
      .order("type")
      .order("sort_order");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data || []) as SpecRow[]);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const slug = form.slug.trim() || slugify(form.name);
    const payload = { ...form, slug, name: form.name.trim() };

    if (editId) {
      const { error } = await (supabase as any).from("specializations").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Specialization updated" });
    } else {
      const { error } = await (supabase as any).from("specializations").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Specialization added" });
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchItems();
  };

  const handleEdit = (row: SpecRow) => {
    setForm({ name: row.name, slug: row.slug, type: row.type, active: row.active, sort_order: row.sort_order });
    setEditId(row.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this specialization? It will be removed from all colleges/institutes that use it.")) return;
    const { error } = await (supabase as any).from("specializations").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Specialization deleted" });
    fetchItems();
  };

  const typeBadge = (t: SpecRow["type"]) => {
    if (t === "college") return <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">College</Badge>;
    if (t === "coaching") return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20" variant="outline">Coaching</Badge>;
    return <Badge variant="outline">Both</Badge>;
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Specializations
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} Specialization</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Name *</Label>
              <Input
                placeholder="e.g. Finance, CAT Coaching"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: editId ? form.slug : slugify(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">URL Slug</Label>
              <Input
                placeholder="auto-generated"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Used in filter URLs e.g. /colleges?specialization={form.slug || "your-slug"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Applies To *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as SpecRow["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both Colleges & Coaching</SelectItem>
                    <SelectItem value="college">Colleges only</SelectItem>
                    <SelectItem value="coaching">Coaching only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active (visible in public filters)
            </label>
            <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"} Specialization</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" /> Manage Specializations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tags assigned to colleges and coaching institutes — auto-generate filter pages like /colleges?specialization=finance
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Specialization
        </Button>
      </div>

      <AdminFilterBar
        searchValue={filters.search ?? ""}
        onSearchChange={(v) => setFilter("search", v)}
        searchPlaceholder="Search name or slug…"
        values={filters}
        onFilterChange={setFilter}
        onClearAll={clearAll}
        activeCount={activeCount}
        resultsHint={`${filtered.length} of ${items.length} shown`}
        filters={[
          {
            type: "select", key: "type", label: "Applies To", width: "w-44",
            options: [
              { label: "All", value: "all" },
              { label: "Both", value: "both" },
              { label: "Colleges only", value: "college" },
              { label: "Coaching only", value: "coaching" },
            ],
          },
          {
            type: "select", key: "active", label: "Status", width: "w-36",
            options: [
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Hidden", value: "hidden" },
            ],
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, idx) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.slug}</TableCell>
                  <TableCell>{typeBadge(row.type)}</TableCell>
                  <TableCell>{row.sort_order}</TableCell>
                  <TableCell>
                    {row.active
                      ? <Badge className="bg-green-500/10 text-green-700 border-green-500/20" variant="outline">Active</Badge>
                      : <Badge variant="outline">Hidden</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No specializations match your filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSpecializations;
