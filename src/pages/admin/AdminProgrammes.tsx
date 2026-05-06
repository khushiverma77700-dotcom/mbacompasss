import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";

type Programme = {
  id?: string;
  college_id: string;
  name: string;
  short_name?: string | null;
  slug: string;
  programme_type: string;
  duration?: string | null;
  mode?: string | null;
  fees_total_lakhs?: number | null;
  fees_year?: string | null;
  fees_breakdown?: string | null;
  intake_seats?: number | null;
  min_graduation_percent?: number | null;
  min_work_ex_months?: number | null;
  accepts_cat?: boolean;
  accepts_xat?: boolean;
  accepts_gmat?: boolean;
  accepts_gre?: boolean;
  accepts_cmat?: boolean;
  accepts_nmat?: boolean;
  accepts_snap?: boolean;
  accepts_iift?: boolean;
  cat_percentile_target?: string | null;
  xat_percentile_target?: string | null;
  gmat_score_target?: string | null;
  specializations?: string[] | null;
  highlights?: string[] | null;
  source_url?: string | null;
  sort_order?: number | null;
  active?: boolean;
};

const empty = (collegeId: string): Programme => ({
  college_id: collegeId,
  name: "",
  slug: "",
  programme_type: "MBA",
  active: true,
});

const AdminProgrammes = () => {
  const qc = useQueryClient();
  const [collegeId, setCollegeId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Programme | null>(null);
  const [open, setOpen] = useState(false);

  const { data: colleges = [] } = useQuery({
    queryKey: ["admin-programmes-colleges"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("id, name, slug").order("name");
      return data || [];
    },
  });

  const { data: programmes = [], refetch } = useQuery({
    queryKey: ["admin-programmes", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programme_courses")
        .select("*")
        .eq("college_id", collegeId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Programme[];
    },
  });

  const filtered = useMemo(
    () => programmes.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [programmes, search],
  );

  const onSave = async () => {
    if (!editing) return;
    const payload: any = { ...editing };
    if (!payload.slug) payload.slug = slugify(payload.name);
    if (!payload.name || !payload.college_id) {
      toast.error("Name and college are required");
      return;
    }
    const { error } = payload.id
      ? await supabase.from("programme_courses").update(payload).eq("id", payload.id)
      : await supabase.from("programme_courses").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setOpen(false);
    setEditing(null);
    refetch();
    qc.invalidateQueries({ queryKey: ["programme-courses"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this programme?")) return;
    const { error } = await supabase.from("programme_courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refetch();
  };

  const update = (patch: Partial<Programme>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">College Programmes</h1>
          <p className="text-sm text-muted-foreground">Manage MBA/PGDM programme entries shown in each college's portfolio table.</p>
        </div>
        <Button
          onClick={() => {
            if (!collegeId) return toast.error("Pick a college first");
            setEditing(empty(collegeId));
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> New Programme
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>College</Label>
            <Select value={collegeId} onValueChange={setCollegeId}>
              <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {colleges.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Search programme</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="MBA, PGDM..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {collegeId && (
        <Card>
          <CardHeader><CardTitle className="text-base">{filtered.length} programme(s)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-2">Name</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-left py-2 px-2">Duration</th>
                    <th className="text-left py-2 px-2">Fees (L)</th>
                    <th className="text-left py-2 px-2">Seats</th>
                    <th className="text-left py-2 px-2">Active</th>
                    <th className="text-right py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 px-2 font-medium">{p.name}</td>
                      <td className="py-2 px-2"><Badge variant="outline">{p.programme_type}</Badge></td>
                      <td className="py-2 px-2 text-muted-foreground">{p.duration || "—"}</td>
                      <td className="py-2 px-2">{p.fees_total_lakhs ?? "—"}</td>
                      <td className="py-2 px-2">{p.intake_seats ?? "—"}</td>
                      <td className="py-2 px-2">{p.active ? "Yes" : "No"}</td>
                      <td className="py-2 px-2 text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => p.id && onDelete(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No programmes yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Programme" : "New Programme"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Name *</Label>
                <Input value={editing.name} onChange={(e) => update({ name: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Short name</Label>
                <Input value={editing.short_name || ""} onChange={(e) => update({ short_name: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={editing.slug} onChange={(e) => update({ slug: e.target.value })} />
              </div>
              <div>
                <Label>Programme Type</Label>
                <Input value={editing.programme_type} onChange={(e) => update({ programme_type: e.target.value })} placeholder="MBA / PGDM / EPGP" />
              </div>
              <div>
                <Label>Mode</Label>
                <Input value={editing.mode || ""} onChange={(e) => update({ mode: e.target.value })} placeholder="Full-time / Part-time" />
              </div>
              <div>
                <Label>Duration</Label>
                <Input value={editing.duration || ""} onChange={(e) => update({ duration: e.target.value })} placeholder="2 years" />
              </div>
              <div>
                <Label>Intake seats</Label>
                <Input type="number" value={editing.intake_seats ?? ""} onChange={(e) => update({ intake_seats: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Fees total (₹ Lakhs)</Label>
                <Input type="number" step="0.01" value={editing.fees_total_lakhs ?? ""} onChange={(e) => update({ fees_total_lakhs: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Fees year</Label>
                <Input value={editing.fees_year || ""} onChange={(e) => update({ fees_year: e.target.value })} placeholder="2025-26" />
              </div>
              <div className="md:col-span-2">
                <Label>Fees breakdown</Label>
                <Textarea rows={2} value={editing.fees_breakdown || ""} onChange={(e) => update({ fees_breakdown: e.target.value })} />
              </div>
              <div>
                <Label>Min graduation %</Label>
                <Input type="number" value={editing.min_graduation_percent ?? ""} onChange={(e) => update({ min_graduation_percent: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Min work-ex (months)</Label>
                <Input type="number" value={editing.min_work_ex_months ?? ""} onChange={(e) => update({ min_work_ex_months: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="md:col-span-2">
                <Label>Accepted exams</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {([
                    ["accepts_cat", "CAT"], ["accepts_xat", "XAT"], ["accepts_gmat", "GMAT"], ["accepts_gre", "GRE"],
                    ["accepts_cmat", "CMAT"], ["accepts_nmat", "NMAT"], ["accepts_snap", "SNAP"], ["accepts_iift", "IIFT"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Switch checked={!!(editing as any)[key]} onCheckedChange={(v) => update({ [key]: v } as any)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>CAT %ile target</Label>
                <Input value={editing.cat_percentile_target || ""} onChange={(e) => update({ cat_percentile_target: e.target.value })} />
              </div>
              <div>
                <Label>XAT %ile target</Label>
                <Input value={editing.xat_percentile_target || ""} onChange={(e) => update({ xat_percentile_target: e.target.value })} />
              </div>
              <div>
                <Label>GMAT score target</Label>
                <Input value={editing.gmat_score_target || ""} onChange={(e) => update({ gmat_score_target: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Specialisations (comma-separated)</Label>
                <Input
                  value={(editing.specializations || []).join(", ")}
                  onChange={(e) => update({ specializations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Highlights (one per line)</Label>
                <Textarea
                  rows={3}
                  value={(editing.highlights || []).join("\n")}
                  onChange={(e) => update({ highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Source URL</Label>
                <Input value={editing.source_url || ""} onChange={(e) => update({ source_url: e.target.value })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={editing.sort_order ?? ""} onChange={(e) => update({ sort_order: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={!!editing.active} onCheckedChange={(v) => update({ active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProgrammes;
