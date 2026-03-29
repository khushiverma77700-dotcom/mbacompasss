import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Globe, MapPin } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SEOChecklist from "@/components/admin/SEOChecklist";
import FileUpload from "@/components/admin/FileUpload";

interface CityPage {
  id: string;
  name: string;
  slug: string;
  type: string;
  state: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[];
  intro_content: string | null;
  detailed_content: string | null;
  faq_content: string | null;
  hero_image_url: string | null;
  city_aliases: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  slug: "",
  type: "city",
  state: "",
  meta_title: "",
  meta_description: "",
  keywords: [] as string[],
  intro_content: "",
  detailed_content: "",
  faq_content: "",
  hero_image_url: "",
  city_aliases: [] as string[],
  sort_order: 0,
  active: true,
};

const TagInput = ({ label, tags, onAdd, onRemove }: { label: string; tags: string[]; onAdd: (t: string) => void; onRemove: (i: number) => void }) => {
  const [val, setVal] = useState("");
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input value={val} onChange={e => setVal(e.target.value)} placeholder={`Add ${label.toLowerCase()}...`} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (val.trim()) { onAdd(val.trim()); setVal(""); } } }} />
        <Button type="button" variant="outline" size="sm" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map((t, i) => (
          <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => onRemove(i)}>{t} ×</Badge>
        ))}
      </div>
    </div>
  );
};

const AdminCityPages = () => {
  const [pages, setPages] = useState<CityPage[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchPages = async () => {
    const { data } = await supabase.from("city_pages").select("*").order("sort_order");
    if (data) setPages(data as any);
  };

  useEffect(() => { fetchPages(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }

    const payload = {
      name: form.name,
      slug: form.slug,
      type: form.type,
      state: form.state || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      keywords: form.keywords,
      intro_content: form.intro_content || null,
      detailed_content: form.detailed_content || null,
      faq_content: form.faq_content || null,
      hero_image_url: form.hero_image_url || null,
      city_aliases: form.city_aliases,
      sort_order: form.sort_order,
      active: form.active,
    };

    if (editId) {
      const { error } = await supabase.from("city_pages").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Page updated");
    } else {
      const { error } = await supabase.from("city_pages").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Page created");
    }

    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
    fetchPages();
  };

  const handleEdit = (page: CityPage) => {
    setForm({
      name: page.name,
      slug: page.slug,
      type: page.type,
      state: page.state || "",
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
      keywords: page.keywords || [],
      intro_content: page.intro_content || "",
      detailed_content: page.detailed_content || "",
      faq_content: page.faq_content || "",
      hero_image_url: page.hero_image_url || "",
      city_aliases: page.city_aliases || [],
      sort_order: page.sort_order,
      active: page.active,
    });
    setEditId(page.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    await supabase.from("city_pages").delete().eq("id", id);
    toast.success("Deleted");
    fetchPages();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">City & State Pages</h1>
          <p className="text-sm text-muted-foreground">Manage SEO-optimized regional college listing pages</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Page
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} City/State Page</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO & Keywords</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Page Name *</Label>
                  <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value, slug: !editId ? generateSlug(e.target.value) : f.slug })); }} placeholder="e.g., Delhi NCR" />
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="delhi-ncr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="region">Region</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parent State</Label>
                  <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g., Maharashtra" />
                </div>
              </div>
              <TagInput
                label="City Aliases (for matching colleges)"
                tags={form.city_aliases}
                onAdd={t => setForm(f => ({ ...f, city_aliases: [...f.city_aliases, t] }))}
                onRemove={i => setForm(f => ({ ...f, city_aliases: f.city_aliases.filter((_, idx) => idx !== i) }))}
              />
              <p className="text-xs text-muted-foreground">Add all city name variations (e.g., "Bengaluru", "Bangalore") so colleges are matched correctly.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                  <Label>Active</Label>
                </div>
              </div>
              <div>
                <Label>Hero Image</Label>
                <FileUpload value={form.hero_image_url} onChange={url => setForm(f => ({ ...f, hero_image_url: url }))} folder="city-pages" />
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div>
                <Label>Introduction / Hero Content</Label>
                <RichTextEditor content={form.intro_content} onChange={v => setForm(f => ({ ...f, intro_content: v }))} placeholder="Write an engaging intro about MBA colleges in this city..." />
              </div>
              <div>
                <Label>Detailed Content (Below listing)</Label>
                <RichTextEditor content={form.detailed_content} onChange={v => setForm(f => ({ ...f, detailed_content: v }))} placeholder="In-depth guide: key highlights, why study here, top specializations..." />
              </div>
              <div>
                <Label>FAQ Content</Label>
                <RichTextEditor content={form.faq_content} onChange={v => setForm(f => ({ ...f, faq_content: v }))} placeholder="Q&A section for SEO (use H3 for questions)..." />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <div>
                <Label>Meta Title</Label>
                <Input value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} placeholder="Top MBA Colleges in Delhi NCR 2026 — Fees, Rankings" />
                <p className="text-xs text-muted-foreground mt-1">{form.meta_title.length}/60 characters</p>
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea value={form.meta_description} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} placeholder="Explore top MBA colleges in Delhi NCR..." rows={3} />
                <p className="text-xs text-muted-foreground mt-1">{form.meta_description.length}/160 characters</p>
              </div>
              <TagInput
                label="SEO Keywords / Long-tail Phrases"
                tags={form.keywords}
                onAdd={t => setForm(f => ({ ...f, keywords: [...f.keywords, t] }))}
                onRemove={i => setForm(f => ({ ...f, keywords: f.keywords.filter((_, idx) => idx !== i) }))}
              />
              <SEOChecklist data={{
                title: form.name,
                content: (form.intro_content || "") + (form.detailed_content || ""),
                metaTitle: form.meta_title,
                metaDescription: form.meta_description,
                keywords: form.keywords,
                slug: form.slug,
              }} />
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="text-xs text-muted-foreground">Page URL: /colleges/{form.slug}</div>
                  <h2 className="font-heading text-xl font-bold text-foreground">{form.meta_title || `Top MBA Colleges in ${form.name}`}</h2>
                  <p className="text-sm text-muted-foreground">{form.meta_description || "No meta description set."}</p>
                  {form.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {form.keywords.map((k, i) => <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>)}
                    </div>
                  )}
                  {form.intro_content && <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: form.intro_content }} />}
                  <div className="border border-dashed border-border rounded-lg p-4 text-center text-muted-foreground text-sm">
                    [College Listing Grid — auto-filtered by city aliases]
                  </div>
                  {form.detailed_content && <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: form.detailed_content }} />}
                  {form.faq_content && <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: form.faq_content }} />}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Update" : "Create"} Page</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>All City/State Pages ({pages.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(page => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.name}</TableCell>
                  <TableCell><Badge variant="outline">{page.type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">/colleges/{page.slug}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">{(page.city_aliases || []).map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}</div>
                  </TableCell>
                  <TableCell className="text-xs">{(page.keywords || []).length} tags</TableCell>
                  <TableCell>
                    <Badge variant={page.active ? "default" : "secondary"}>{page.active ? "Active" : "Draft"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(page)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(`/colleges/${page.slug}`, "_blank")}><Eye className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(page.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pages.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No city/state pages yet. Click "Add Page" to create one.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCityPages;
