import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, GraduationCap } from "lucide-react";

interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  exam_focus: string[] | null;
  mode: string | null;
  duration_weeks: number | null;
  price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  features: any;
  highlights: any;
  curriculum: any;
  thumbnail_url: string | null;
  banner_url: string | null;
  enroll_url: string | null;
  brochure_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const empty: Partial<Course> = {
  title: "", slug: "", subtitle: "", description: "",
  exam_focus: ["CAT"], mode: "online", duration_weeks: 12,
  price: 0, original_price: 0, discount_percent: 0,
  features: [], highlights: [], curriculum: [],
  is_featured: false, is_active: true, sort_order: 0,
};

export default function AdminMBACompassCourses() {
  const [list, setList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Course> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mba_compass_courses")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    setList((data ?? []) as Course[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.title) return toast.error("Title required");
    const slug = edit.slug?.trim() || slugify(edit.title);
    const payload = {
      ...edit,
      slug,
      exam_focus: edit.exam_focus ?? [],
      features: edit.features ?? [],
      highlights: edit.highlights ?? [],
      curriculum: edit.curriculum ?? [],
    };
    let error;
    if (edit.id) ({ error } = await supabase.from("mba_compass_courses").update(payload as any).eq("id", edit.id));
    else ({ error } = await supabase.from("mba_compass_courses").insert(payload as any));
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEdit(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    await supabase.from("mba_compass_courses").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const arrField = (val: any): string =>
    Array.isArray(val) ? val.join("\n") : "";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-sky-600" /> MBA Compass Courses
          </h1>
          <p className="text-sm text-muted-foreground">Manage your in-house paid programs shown on /mba-compass.</p>
        </div>
        <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit(empty)} className="bg-sky-600 hover:bg-sky-700">
              <Plus className="h-4 w-4 mr-2" /> New Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{edit?.id ? "Edit" : "New"} program</DialogTitle></DialogHeader>
            {edit && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Title *</Label><Input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
                  <div><Label>Slug</Label><Input value={edit.slug ?? ""} placeholder="auto from title" onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div>
                </div>
                <div><Label>Subtitle</Label><Input value={edit.subtitle ?? ""} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea rows={3} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Exam focus (comma)</Label>
                    <Input value={(edit.exam_focus ?? []).join(", ")} onChange={(e) => setEdit({ ...edit, exam_focus: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="CAT, XAT" />
                  </div>
                  <div>
                    <Label>Mode</Label>
                    <select className="w-full h-10 rounded-md border px-3 text-sm" value={edit.mode ?? "online"} onChange={(e) => setEdit({ ...edit, mode: e.target.value })}>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div><Label>Duration (weeks)</Label><Input type="number" value={edit.duration_weeks ?? 0} onChange={(e) => setEdit({ ...edit, duration_weeks: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Price (₹)</Label><Input type="number" value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: parseFloat(e.target.value) || 0 })} /></div>
                  <div><Label>Original price</Label><Input type="number" value={edit.original_price ?? 0} onChange={(e) => setEdit({ ...edit, original_price: parseFloat(e.target.value) || 0 })} /></div>
                  <div><Label>Discount %</Label><Input type="number" value={edit.discount_percent ?? 0} onChange={(e) => setEdit({ ...edit, discount_percent: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Thumbnail URL (16:9)</Label><Input value={edit.thumbnail_url ?? ""} onChange={(e) => setEdit({ ...edit, thumbnail_url: e.target.value })} /></div>
                  <div><Label>Banner URL</Label><Input value={edit.banner_url ?? ""} onChange={(e) => setEdit({ ...edit, banner_url: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Enroll URL</Label><Input value={edit.enroll_url ?? ""} onChange={(e) => setEdit({ ...edit, enroll_url: e.target.value })} /></div>
                  <div><Label>Brochure URL</Label><Input value={edit.brochure_url ?? ""} onChange={(e) => setEdit({ ...edit, brochure_url: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Features (one per line)</Label>
                  <Textarea rows={4} value={arrField(edit.features)} onChange={(e) => setEdit({ ...edit, features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <Label>Highlights (one per line, max 3)</Label>
                  <Textarea rows={3} value={arrField(edit.highlights)} onChange={(e) => setEdit({ ...edit, highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} placeholder="200+ video lessons&#10;30 mocks&#10;1:1 mentorship" />
                </div>
                <div>
                  <Label>Curriculum modules (one per line)</Label>
                  <Textarea rows={3} value={arrField(edit.curriculum)} onChange={(e) => setEdit({ ...edit, curriculum: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Sort order</Label><Input type="number" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: parseInt(e.target.value) || 0 })} /></div>
                  <div className="flex items-end gap-4 pb-2">
                    <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.is_featured} onCheckedChange={(v) => setEdit({ ...edit, is_featured: v })} /> Featured</label>
                    <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /> Active</label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>SEO title</Label><Input value={edit.seo_title ?? ""} onChange={(e) => setEdit({ ...edit, seo_title: e.target.value })} /></div>
                  <div><Label>SEO description</Label><Input value={edit.seo_description ?? ""} onChange={(e) => setEdit({ ...edit, seo_description: e.target.value })} /></div>
                </div>
                <Button className="w-full bg-sky-600 hover:bg-sky-700" onClick={save}>Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-sky-500 mb-3" />
          <p className="text-sm text-muted-foreground">No programs yet. Click "New Program" to add one.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground truncate">/mba-compass/{c.slug}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(c.exam_focus ?? []).map((e) => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}
                {c.is_featured && <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px] border-0"><Star className="h-3 w-3 mr-0.5" /> Featured</Badge>}
                {!c.is_active && <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200">Inactive</Badge>}
              </div>
              <div className="mt-2 text-sm text-gray-700">₹{Math.round(c.price ?? 0).toLocaleString("en-IN")} {c.original_price ? <span className="text-xs text-muted-foreground line-through ml-1">₹{Math.round(c.original_price).toLocaleString("en-IN")}</span> : null}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
