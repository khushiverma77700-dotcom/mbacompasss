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
import { Plus, Pencil, Trash2, Eye, Globe, MapPin, Search, GraduationCap } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SEOChecklist from "@/components/admin/SEOChecklist";
import FileUpload from "@/components/admin/FileUpload";
import ResponsiveImageUpload from "@/components/admin/ResponsiveImageUpload";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import { INDIAN_STATES, getCitiesForState } from "@/data/indianLocations";
import { generateAndUploadLocationBanner } from "@/lib/locationBanner";
import { Checkbox } from "@/components/ui/checkbox";

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

  const [allColleges, setAllColleges] = useState<any[]>([]);
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<Set<string>>(new Set());
  const [collegeSearch, setCollegeSearch] = useState("");

  const fetchPages = async () => {
    const { data } = await supabase.from("city_pages").select("*").order("sort_order");
    if (data) setPages(data as any);
  };

  const fetchAllColleges = async () => {
    const { data } = await supabase.from("colleges").select("id, name, city, state, tier, college_category").order("name");
    if (data) setAllColleges(data);
  };

  useEffect(() => { fetchPages(); fetchAllColleges(); }, []);

  // When editing, pre-select colleges that match this city
  const loadCityColleges = (page: CityPage) => {
    const aliases = [page.name.toLowerCase(), ...(page.city_aliases || []).map(a => a.toLowerCase())];
    const matched = new Set<string>();
    allColleges.forEach(c => {
      if (c.city && aliases.includes(c.city.toLowerCase())) {
        matched.add(c.id);
      }
    });
    setSelectedCollegeIds(matched);
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }

    // Auto-generate hero image if not set and state is available
    let heroUrl = form.hero_image_url;
    if (!heroUrl && form.name && form.state) {
      heroUrl = await generateAndUploadLocationBanner(form.name, form.state, "city-banners") || "";
    }

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
      hero_image_url: heroUrl || null,
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

    // Save manually assigned colleges: update city field for selected colleges
    if (editId || !editId) {
      const cityName = form.name;
      const aliases = [cityName.toLowerCase(), ...form.city_aliases.map(a => a.toLowerCase())];
      
      // Remove city from colleges that were unselected
      const toUnassign = allColleges.filter(c => 
        c.city && aliases.includes(c.city.toLowerCase()) && !selectedCollegeIds.has(c.id)
      );
      for (const c of toUnassign) {
        await supabase.from("colleges").update({ city: null }).eq("id", c.id);
      }
      
      // Assign city to newly selected colleges
      for (const id of selectedCollegeIds) {
        const col = allColleges.find(c => c.id === id);
        if (col && (!col.city || !aliases.includes(col.city.toLowerCase()))) {
          await supabase.from("colleges").update({ city: cityName, state: form.state || col.state }).eq("id", id);
        }
      }
      fetchAllColleges();
    }

    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setSelectedCollegeIds(new Set());
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
    loadCityColleges(page);
    setCollegeSearch("");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    const item = pages.find(p => p.id === id);
    await supabase.from("city_pages").delete().eq("id", id);
    if (item) {
      const { cleanupDeletedPage } = await import("@/lib/adminCleanup");
      await cleanupDeletedPage({ contentType: "cityPage", id, slug: item.slug, name: item.name });
    }
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
            <div className="flex items-center justify-between">
              <DialogTitle>{editId ? "Edit" : "Add"} City/State Page</DialogTitle>
              <AISEOButton
                contentType="cityPage"
                recordId={editId || undefined}
                data={{ name: form.name, type: form.type, state: form.state, intro_content: form.intro_content, slug: form.slug }}
                onApply={(s) => setForm((f: any) => ({
                  ...f,
                  ...(s.meta_title && { meta_title: s.meta_title }),
                  ...(s.meta_description && { meta_description: s.meta_description }),
                  ...(s.keywords && { keywords: s.keywords }),
                }))}
              />
            </div>
          </DialogHeader>
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO & Keywords</TabsTrigger>
              <TabsTrigger value="colleges">Manually Add</TabsTrigger>
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
                  <Select value={form.state || "_none"} onValueChange={v => setForm(f => ({ ...f, state: v === "_none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Select state...</SelectItem>
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
              <ResponsiveImageUpload
                bucket="uploads"
                folder="city-pages"
                label="Hero Image"
                desktopValue={form.hero_image_url}
                mobileValue={(form as any).mobile_hero_image_url || ""}
                onDesktopChange={(url) => setForm(f => ({ ...f, hero_image_url: url }))}
                onMobileChange={(url) => setForm(f => ({ ...f, mobile_hero_image_url: url } as any))}
                desktopSpec={{ dimensions: "1400×500 px", ratio: "2.8:1, landscape", maxSize: "300 KB" }}
                mobileSpec={{ dimensions: "600×400 px", ratio: "3:2", maxSize: "150 KB" }}
              />
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
                meta_title: form.meta_title,
                meta_description: form.meta_description,
                keywords: form.keywords,
                slug: form.slug,
              }} contentType="cityPage" recordId={editId || undefined} />
            </TabsContent>

            <TabsContent value="colleges" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Assign Colleges to "{form.name}"</h3>
                <Badge variant="secondary" className="ml-auto">{selectedCollegeIds.size} selected</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Select colleges that should appear under this city. Their city field will be updated on save.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search colleges by name..."
                  value={collegeSearch}
                  onChange={e => setCollegeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="border rounded-lg max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>College Name</TableHead>
                      <TableHead>Current City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allColleges
                      .filter(c => !collegeSearch || c.name.toLowerCase().includes(collegeSearch.toLowerCase()))
                      .map(c => (
                        <TableRow key={c.id} className="cursor-pointer" onClick={() => {
                          setSelectedCollegeIds(prev => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          });
                        }}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCollegeIds.has(c.id)}
                              onCheckedChange={(checked) => {
                                setSelectedCollegeIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(c.id);
                                  else next.delete(c.id);
                                  return next;
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">{c.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.city || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.state || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{c.tier || "—"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    {allColleges.filter(c => !collegeSearch || c.name.toLowerCase().includes(collegeSearch.toLowerCase())).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No colleges found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
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
