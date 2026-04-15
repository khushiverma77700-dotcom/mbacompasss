import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Star, ArrowLeft } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";
import ResponsiveImageUpload from "@/components/admin/ResponsiveImageUpload";
import SEOChecklist from "@/components/admin/SEOChecklist";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import StateCitySelect from "@/components/admin/StateCitySelect";
import { generateAndUploadLocationBanner } from "@/lib/locationBanner";

type Institute = {
  id: string; name: string; slug: string; city: string | null;
  rating: number | null; featured: boolean | null; mode: string | null;
  students_count: number | null; success_rate: number | null;
};

const emptyForm = {
  name: "", slug: "", description: "", city: "", state: "", address: "",
  phone: "", whatsapp: "", email: "", website: "",
  mode: "Offline", featured: false, discount: "", offer: "",
  meta_title: "", meta_description: "", keywords: [] as string[],
  logo_url: "", banner_url: "", category_id: "",
  rating: 0, total_reviews: 0, students_count: 0, success_rate: 0,
  features: [] as string[],
  latitude: "", longitude: "",
};

const AdminInstitutes = () => {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState({ keywords: "", features: "" });
  const { toast } = useToast();

  const fetchData = async () => {
    const [i, c] = await Promise.all([
      supabase.from("institutes").select("id, name, slug, city, rating, featured, mode, students_count, success_rate").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    if (i.data) setInstitutes(i.data);
    if (c.data) setCategories(c.data);
  };

  useEffect(() => { fetchData(); }, []);

  const addTag = (field: "keywords" | "features") => {
    const val = tagInput[field].trim();
    if (val && !form[field].includes(val)) {
      setForm({ ...form, [field]: [...form[field], val] });
    }
    setTagInput({ ...tagInput, [field]: "" });
  };

  const removeTag = (field: "keywords" | "features", idx: number) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let bannerUrl = form.banner_url;
    if (!bannerUrl && form.city && form.state) {
      bannerUrl = await generateAndUploadLocationBanner(form.city, form.state, "institute-banners") || "";
    }
    const payload: any = {
      name: form.name, slug, description: form.description || null,
      city: form.city || null, state: form.state || null, address: form.address || null,
      phone: form.phone || null, whatsapp: form.whatsapp || null,
      email: form.email || null, website: form.website || null,
      mode: form.mode, featured: form.featured,
      discount: form.discount || null, offer: form.offer || null,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      keywords: form.keywords.length > 0 ? form.keywords : null,
      logo_url: form.logo_url || null, banner_url: bannerUrl || null,
      category_id: form.category_id || null,
      rating: form.rating || 0, total_reviews: form.total_reviews || 0,
      students_count: form.students_count || 0, success_rate: form.success_rate || 0,
      features: form.features.length > 0 ? form.features : null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    };

    if (editId) {
      const { error } = await supabase.from("institutes").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Institute updated" });
    } else {
      const { error } = await supabase.from("institutes").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Institute added" });
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchData();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("institutes").select("*").eq("id", id).single();
    if (data) {
      setForm({
        name: data.name, slug: data.slug,
        description: data.description ?? "", city: data.city ?? "",
        state: data.state ?? "", address: data.address ?? "",
        phone: data.phone ?? "", whatsapp: data.whatsapp ?? "",
        email: data.email ?? "", website: data.website ?? "",
        mode: data.mode ?? "Offline", featured: data.featured ?? false,
        discount: data.discount ?? "", offer: data.offer ?? "",
        meta_title: data.meta_title ?? "", meta_description: data.meta_description ?? "",
        keywords: data.keywords ?? [],
        logo_url: data.logo_url ?? "", banner_url: data.banner_url ?? "",
        category_id: data.category_id ?? "",
        rating: data.rating ?? 0, total_reviews: data.total_reviews ?? 0,
        students_count: data.students_count ?? 0, success_rate: data.success_rate ?? 0,
        features: data.features ?? [],
        latitude: data.latitude ? String(data.latitude) : "",
        longitude: data.longitude ? String(data.longitude) : "",
      });
      setEditId(id); setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this institute?")) return;
    const item = institutes.find(i => i.id === id);
    await supabase.from("institutes").delete().eq("id", id);
    if (item) {
      const { cleanupDeletedPage } = await import("@/lib/adminCleanup");
      await cleanupDeletedPage({ contentType: "institute", id, slug: item.slug, name: item.name });
    }
    fetchData(); toast({ title: "Institute deleted" });
  };

  const TagInput = ({ field, placeholder }: { field: "keywords" | "features"; placeholder: string }) => (
    <div>
      <div className="flex gap-2 mb-2">
        <Input placeholder={placeholder} value={tagInput[field]}
          onChange={(e) => setTagInput({ ...tagInput, [field]: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(field); } }} />
        <Button type="button" variant="outline" size="sm" onClick={() => addTag(field)}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {form[field].map((item, idx) => (
          <Badge key={idx} variant="secondary" className="gap-1 text-xs">
            {item}
            <button onClick={() => removeTag(field, idx)}><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
    </div>
  );

  const schemaPreview = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: form.name || "Institute Name",
    description: form.meta_description || form.description?.replace(/<[^>]*>/g, "").slice(0, 160) || "",
    address: { "@type": "PostalAddress", addressLocality: form.city, addressRegion: form.state, addressCountry: "IN" },
    url: form.website || `${window.location.origin}/institute/${form.slug || "slug"}`,
    ...(form.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: String(form.rating), bestRating: "5", ratingCount: String(form.total_reviews || 10) } } : {}),
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Institutes
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? "Edit" : "Add"} Institute</CardTitle>
              <AISEOButton
                contentType="institute"
                recordId={editId || undefined}
                data={{ name: form.name, description: form.description, city: form.city, state: form.state, slug: form.slug, features: form.features }}
                onApply={(s) => setForm((f: any) => ({
                  ...f,
                  ...(s.meta_title && { meta_title: s.meta_title }),
                  ...(s.meta_description && { meta_description: s.meta_description }),
                  ...(s.keywords && { keywords: s.keywords }),
                }))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="stats">Stats & Features</TabsTrigger>
                <TabsTrigger value="media">Media & Offers</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Institute Name *</Label><Input placeholder="e.g. IMS Learning Resources" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">URL Slug</Label><Input placeholder="auto-generated from name" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description</Label><RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Detailed institute description..." /></div>
                <StateCitySelect state={form.state} city={form.city} onStateChange={(s) => setForm({ ...form, state: s, city: "" })} onCityChange={(c) => setForm({ ...form, city: c })} />
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Full Address</Label><Input placeholder="Street address..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone</Label><Input placeholder="+91..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">WhatsApp</Label><Input placeholder="+91..." value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</Label><Input placeholder="info@institute.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Website</Label><Input placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Teaching Mode</Label>
                    <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="Offline">Offline</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />Featured Institute</label></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Latitude</Label><Input placeholder="19.0760" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Longitude</Label><Input placeholder="72.8777" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Rating (0-5)</Label><Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Total Reviews</Label><Input type="number" value={form.total_reviews} onChange={(e) => setForm({ ...form, total_reviews: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Students Count</Label><Input type="number" value={form.students_count} onChange={(e) => setForm({ ...form, students_count: parseInt(e.target.value) || 0 })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Success Rate (%)</Label><Input type="number" step="0.1" min="0" max="100" value={form.success_rate} onChange={(e) => setForm({ ...form, success_rate: parseFloat(e.target.value) || 0 })} /></div>
                </div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Key Features / USPs</Label><TagInput field="features" placeholder="e.g. 50+ Mock Tests, Personal Mentoring" /></div>
              </TabsContent>

              <TabsContent value="media" className="space-y-3">
                <FileUpload bucket="uploads" folder="institutes/logos" value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} accept="image/*" label="Institute Logo" sizeHint="200×200 px (square, PNG) • Max 100 KB" />
                <ResponsiveImageUpload bucket="uploads" folder="institutes/banners" label="Banner Image" desktopValue={form.banner_url} mobileValue={(form as any).mobile_banner_url || ""} onDesktopChange={(url) => setForm({ ...form, banner_url: url })} onMobileChange={(url) => setForm({ ...form, mobile_banner_url: url } as any)} desktopSpec={{ dimensions: "1200×400 px", ratio: "3:1, landscape", maxSize: "250 KB" }} mobileSpec={{ dimensions: "600×300 px", ratio: "2:1", maxSize: "120 KB" }} />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Discount Text</Label><Input placeholder="e.g. 10% off on early enrollment" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
                  <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Offer Text</Label><Input placeholder="e.g. Free mock tests included" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} /></div>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-3">
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Title</Label><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={70} placeholder="Best MBA Coaching in Mumbai | Institute Name" /><span className="text-xs text-muted-foreground">{form.meta_title.length}/60 chars</span></div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Description</Label><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={170} placeholder="Join the best MBA coaching in Mumbai..." /><span className="text-xs text-muted-foreground">{form.meta_description.length}/160 chars</span></div>
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">SEO Keywords</Label><TagInput field="keywords" placeholder="e.g. MBA coaching Mumbai, CAT prep" /></div>
                <SEOChecklist data={{ title: form.name, slug: form.slug, meta_title: form.meta_title, meta_description: form.meta_description, keywords: form.keywords, content: form.description, image_url: form.logo_url, banner_url: form.banner_url, schemaType: "institute" }} contentType="institute" recordId={editId || undefined} />
              </TabsContent>

              <TabsContent value="schema" className="space-y-3">
                <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Auto-Generated Schema Markup (JSON-LD)</Label><p className="text-xs text-muted-foreground mb-2">This schema is automatically generated from the data you enter and injected into the institute's page for search engines.</p>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto max-h-64 text-foreground">{JSON.stringify(schemaPreview, null, 2)}</pre>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                  <h4 className="font-heading font-semibold text-foreground text-sm mb-2">Schema Checklist</h4>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: "Organization Name", ok: !!form.name },
                      { label: "Description", ok: !!form.meta_description || !!form.description },
                      { label: "Address (City + State)", ok: !!form.city && !!form.state },
                      { label: "Website URL", ok: !!form.website },
                      { label: "Aggregate Rating", ok: form.rating > 0 && form.total_reviews > 0 },
                      { label: "Geo Coordinates", ok: !!form.latitude && !!form.longitude },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.ok ? "bg-green-500" : "bg-red-400"}`} />
                        <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="w-full mt-4">{editId ? "Update" : "Create"} Institute</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Institutes</h1>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setTagInput({ keywords: "", features: "" }); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Institute
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutes.map(inst => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell>{inst.city || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{inst.mode}</Badge></TableCell>
                  <TableCell><span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {inst.rating || 0}</span></TableCell>
                  <TableCell>{inst.students_count || 0}</TableCell>
                  <TableCell>{inst.success_rate || 0}%</TableCell>
                  <TableCell>{inst.featured ? <Badge className="bg-primary text-primary-foreground text-xs">Yes</Badge> : "No"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(inst.id)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(inst.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {institutes.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No institutes yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInstitutes;
