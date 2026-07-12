import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_OPTIONS = [
  "Quant",
  "VARC",
  "LRDI",
  "GK / Current Affairs",
  "CAT Prep",
  "XAT Prep",
  "NMAT Prep",
  "SNAP Prep",
  "IIFT Prep",
  "CMAT Prep",
  "MAT Prep",
  "GD/PI/WAT",
  "Interview Prep",
  "Essay/SOP",
  "Formula Sheets",
  "Previous Year Papers",
  "Mock Analysis",
  "Study Plan",
  "Other",
];
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Upload, FileText, Loader2, ExternalLink, GripVertical, Star, X } from "lucide-react";
import { Link } from "react-router-dom";

type Freebie = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  download_count: number;
  is_published: boolean;
  sort_order: number;
  is_featured: boolean;
  featured_order: number;
  created_at: string;
};

const MAX_FEATURED = 3;


const emptyForm = {
  title: "",
  description: "",
  category: "",
  file_url: "",
  file_name: "",
  file_size: 0,
  file_type: "",
  cover_image_url: "",
  tags: "",
  is_published: true,
  sort_order: 0,
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const AdminFreebies = () => {
  const [rows, setRows] = useState<Freebie[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("freebies")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as Freebie[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (r: Freebie) => {
    setEditId(r.id);
    setForm({
      title: r.title,
      description: r.description || "",
      category: r.category || "",
      file_url: r.file_url,
      file_name: r.file_name || "",
      file_size: r.file_size || 0,
      file_type: r.file_type || "",
      cover_image_url: r.cover_image_url || "",
      tags: (r.tags || []).join(", "),
      is_published: r.is_published,
      sort_order: r.sort_order,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("freebies").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      setForm((f) => ({
        ...f,
        file_url: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || (ext ?? ""),
      }));
      toast({ title: "File uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("freebies").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = await supabase.storage.from("freebies").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      setForm((f) => ({ ...f, cover_image_url: data?.signedUrl || path }));
      toast({ title: "Cover uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.file_url) {
      toast({ title: "Missing fields", description: "Title and file are required.", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      file_url: form.file_url,
      file_name: form.file_name || null,
      file_size: form.file_size || null,
      file_type: form.file_type || null,
      cover_image_url: form.cover_image_url.trim() || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      is_published: form.is_published,
      sort_order: Number(form.sort_order) || 0,
    };
    const q = editId
      ? supabase.from("freebies").update(payload).eq("id", editId)
      : supabase.from("freebies").insert(payload);
    const { error } = await q;
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editId ? "Updated" : "Created" });
    resetForm();
    load();
  };

  const remove = async (r: Freebie) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    // Try to remove file too (ignore errors — path may be absolute URL)
    if (r.file_url && !r.file_url.startsWith("http")) {
      await supabase.storage.from("freebies").remove([r.file_url]);
    }
    const { error } = await supabase.from("freebies").delete().eq("id", r.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    load();
  };

  // ============ FEATURED (drag & drop, max 3) ============
  const featured = rows
    .filter((r) => r.is_featured)
    .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
  const nonFeatured = rows.filter((r) => !r.is_featured);
  const [dragId, setDragId] = useState<string | null>(null);

  const persistFeatured = async (ordered: string[], removedIds: string[] = []) => {
    // Optimistic update
    setRows((prev) =>
      prev.map((r) => {
        if (removedIds.includes(r.id)) return { ...r, is_featured: false, featured_order: 0 };
        const idx = ordered.indexOf(r.id);
        if (idx >= 0) return { ...r, is_featured: true, featured_order: idx };
        return r;
      }),
    );
    try {
      const updates: PromiseLike<any>[] = [];
      ordered.forEach((id, idx) => {
        updates.push(
          Promise.resolve(
            supabase.from("freebies").update({ is_featured: true, featured_order: idx }).eq("id", id),
          ),
        );
      });
      removedIds.forEach((id) => {
        updates.push(
          Promise.resolve(
            supabase.from("freebies").update({ is_featured: false, featured_order: 0 }).eq("id", id),
          ),
        );
      });

      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
      load();
    }
  };

  const addToFeatured = (id: string) => {
    if (featured.some((f) => f.id === id)) return;
    if (featured.length >= MAX_FEATURED) {
      toast({ title: `Max ${MAX_FEATURED} featured`, description: "Remove one first.", variant: "destructive" });
      return;
    }
    persistFeatured([...featured.map((f) => f.id), id]);
  };

  const removeFromFeatured = (id: string) => {
    persistFeatured(featured.filter((f) => f.id !== id).map((f) => f.id), [id]);
  };

  const onDropOnFeatured = (e: React.DragEvent, targetIndex: number | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("freebie-id");
    if (!id) return;
    const currentIds = featured.map((f) => f.id);
    const fromIdx = currentIds.indexOf(id);
    let nextIds: string[];
    if (fromIdx >= 0) {
      // reorder within featured
      nextIds = currentIds.filter((x) => x !== id);
      const insertAt = targetIndex === null ? nextIds.length : Math.min(targetIndex, nextIds.length);
      nextIds.splice(insertAt, 0, id);
    } else {
      if (currentIds.length >= MAX_FEATURED) {
        toast({ title: `Max ${MAX_FEATURED} featured`, variant: "destructive" });
        return;
      }
      nextIds = [...currentIds];
      const insertAt = targetIndex === null ? nextIds.length : Math.min(targetIndex, nextIds.length);
      nextIds.splice(insertAt, 0, id);
    }
    persistFeatured(nextIds);
    setDragId(null);
  };


  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Freebies</h1>
        <div className="ml-auto">
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Freebie
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Edit Freebie" : "New Freebie"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="CAT 2025 Formula Sheet" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description shown on the card" />
            </div>

            <div>
              <Label>File * (PDF / DOC / any document)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  disabled={uploading}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {form.file_name && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.file_name} · {formatBytes(form.file_size)}
                </p>
              )}
            </div>

            <div>
              <Label>Cover Image (optional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Recommended: 800×450 px (16:9), JPG/PNG, under 500 KB</p>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                  disabled={uploadingCover}
                />
                {uploadingCover && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="cover" className="mt-2 h-24 rounded border" />
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="cat, cheatsheet" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label>Published</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={uploading || uploadingCover}>
                {editId ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Freebies ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No freebies yet. Click "Add Freebie" to upload one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.category || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs">
                      {r.file_name || r.file_url}
                      <div className="text-muted-foreground">{formatBytes(r.file_size)}</div>
                    </TableCell>
                    <TableCell>{r.download_count}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_published ? "default" : "secondary"}>
                        {r.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <a href="/freebies" target="_blank" rel="noreferrer">
                          <Button size="icon" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                        </a>
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFreebies;
