import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Download, GraduationCap } from "lucide-react";

type Row = {
  id?: string;
  category: "iim" | "private" | "govt" | "global";
  rank: number;
  name: string;
  slug: string;
  city: string | null;
  fees: string | null;
  cutoff: string | null;
  average_package: string | null;
  highest_package: string | null;
  highlight: string | null;
  is_active: boolean;
  sort_order: number;
};

const CATEGORIES: { id: Row["category"]; label: string }[] = [
  { id: "iim", label: "Top IIMs" },
  { id: "private", label: "Top Private" },
  { id: "govt", label: "Top Government" },
  { id: "global", label: "Global / 1-Year" },
];

const empty = (cat: Row["category"]): Row => ({
  category: cat, rank: 0, name: "", slug: "", city: "", fees: "", cutoff: "",
  average_package: "", highest_package: "", highlight: "", is_active: true, sort_order: 0,
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function AdminCollegeTables() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Row["category"]>("iim");
  const [editing, setEditing] = useState<Row | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landscape_colleges")
      .select("*")
      .order("category").order("sort_order").order("rank");
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => rows.filter((r) => r.category === active), [rows, active]);

  const save = async () => {
    if (!editing) return;
    const payload: Row = {
      ...editing,
      slug: editing.slug || slugify(editing.name),
      rank: Number(editing.rank) || 0,
      sort_order: Number(editing.sort_order) || 0,
    };
    if (!payload.name) return toast.error("Name is required");
    const { error } = editing.id
      ? await supabase.from("landscape_colleges").update(payload).eq("id", editing.id)
      : await supabase.from("landscape_colleges").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this row?")) return;
    const { error } = await supabase.from("landscape_colleges").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (r: Row) => {
    const { error } = await supabase.from("landscape_colleges").update({ is_active: !r.is_active }).eq("id", r.id!);
    if (error) return toast.error(error.message);
    load();
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return [];
    const parseLine = (l: string) => {
      const out: string[] = []; let cur = ""; let q = false;
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (c === "," && !q) { out.push(cur); cur = ""; }
        else cur += c;
      }
      out.push(cur);
      return out.map((x) => x.trim());
    };
    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((l) => {
      const cells = parseLine(l);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
      return obj;
    });
  };

  const bulkImport = async () => {
    const parsed = parseCSV(csvText);
    if (!parsed.length) return toast.error("No rows found");
    const inserts: Row[] = [];
    for (const p of parsed) {
      const cat = (p.category || "").toLowerCase();
      if (!["iim", "private", "govt", "global"].includes(cat)) continue;
      if (!p.name) continue;
      inserts.push({
        category: cat as Row["category"],
        rank: parseInt(p.rank || "0") || 0,
        name: p.name,
        slug: p.slug || slugify(p.name),
        city: p.city || p.location || null,
        fees: p.fees || null,
        cutoff: p.cutoff || null,
        average_package: p.average_package || p["average package"] || p.median_ctc || null,
        highest_package: p.highest_package || p["highest package"] || null,
        highlight: p.highlight || null,
        is_active: (p.is_active ?? "true").toLowerCase() !== "false",
        sort_order: parseInt(p.sort_order || "0") || 0,
      });
    }
    if (!inserts.length) return toast.error("No valid rows");
    const { error } = await supabase.from("landscape_colleges").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${inserts.length} colleges`);
    setBulkOpen(false); setCsvText(""); load();
  };

  const onFile = async (f: File) => {
    setCsvText(await f.text());
  };

  const exportCSV = () => {
    const headers = ["category","rank","name","slug","city","fees","cutoff","average_package","highest_package","highlight","is_active","sort_order"];
    const esc = (v: any) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "college-tables.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6 text-primary" /> College Tables</h1>
          <p className="text-sm text-muted-foreground">Manage the "Every B-School that matters" homepage tables.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)}><Upload className="w-4 h-4 mr-1" />Bulk CSV Upload</Button>
          <Button onClick={() => setEditing(empty(active))}><Plus className="w-4 h-4 mr-1" />Add College</Button>
        </div>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as Row["category"])}>
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.label} ({rows.filter((r) => r.category === c.id).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c.id} value={c.id} className="mt-4">
            <div className="border rounded-xl overflow-x-auto bg-white">
              <table className="w-full text-sm">
                <thead className="bg-sky-50 text-xs uppercase text-primary/80">
                  <tr>
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Fees</th>
                    <th className="p-3 text-left">Cutoff</th>
                    <th className="p-3 text-left">Avg Package</th>
                    <th className="p-3 text-left">Highest</th>
                    <th className="p-3 text-left">Highlight</th>
                    <th className="p-3 text-left">Active</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                  ) : visible.length === 0 ? (
                    <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No colleges yet in this category.</td></tr>
                  ) : visible.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-sky-50/50">
                      <td className="p-3 font-bold">#{r.rank}</td>
                      <td className="p-3">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.slug}</div>
                      </td>
                      <td className="p-3">{r.city}</td>
                      <td className="p-3">{r.fees}</td>
                      <td className="p-3">{r.cutoff}</td>
                      <td className="p-3 text-emerald-700 font-semibold">{r.average_package}</td>
                      <td className="p-3">{r.highest_package}</td>
                      <td className="p-3">{r.highlight}</td>
                      <td className="p-3"><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => r.id && remove(r.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} College</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as Row["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Rank</Label><Input type="number" value={editing.rank} onChange={(e) => setEditing({ ...editing, rank: parseInt(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><Label>Location / City</Label><Input value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
              <div><Label>Fees</Label><Input value={editing.fees || ""} onChange={(e) => setEditing({ ...editing, fees: e.target.value })} placeholder="₹28.0 L" /></div>
              <div><Label>Cutoff</Label><Input value={editing.cutoff || ""} onChange={(e) => setEditing({ ...editing, cutoff: e.target.value })} placeholder="99.5%ile" /></div>
              <div><Label>Average Package</Label><Input value={editing.average_package || ""} onChange={(e) => setEditing({ ...editing, average_package: e.target.value })} placeholder="₹34.5 LPA" /></div>
              <div><Label>Highest Package</Label><Input value={editing.highest_package || ""} onChange={(e) => setEditing({ ...editing, highest_package: e.target.value })} placeholder="₹1.15 Cr" /></div>
              <div><Label>Sort Order</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><Label>Highlight badge (optional)</Label><Input value={editing.highlight || ""} onChange={(e) => setEditing({ ...editing, highlight: e.target.value })} placeholder="Top NIRF #1" /></div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active (shown on homepage)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk CSV */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bulk CSV Upload</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Required columns: <code>category, name</code>. Optional: <code>rank, slug, city, fees, cutoff, average_package, highest_package, highlight, is_active, sort_order</code>.
              Category must be one of <b>iim, private, govt, global</b>.
            </p>
            <div className="flex gap-2 flex-wrap">
              <a href="/college-tables-sample.csv" download>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Download sample CSV</Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />Choose CSV file
              </Button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
            <Textarea rows={10} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="Or paste CSV contents here…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={bulkImport} disabled={!csvText.trim()}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
