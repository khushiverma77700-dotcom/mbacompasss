import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Search, X } from "lucide-react";
import SEOChecklist from "@/components/admin/SEOChecklist";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";

const categories = ["news", "exam-tips", "career", "success-stories", "reviews", "college-news", "coaching", "gd-pi", "placements", "scholarships"];
const statusOptions = [
  { value: "draft", label: "Draft", color: "bg-muted text-muted-foreground" },
  { value: "live", label: "Live", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "not-live", label: "Not Live", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
];

const emptyForm = {
  title: "", slug: "", excerpt: "", content: "", category: "news", author: "",
  published: false, meta_title: "", meta_description: "", keywords: [] as string[],
  priority: 0, featured: false, status: "draft", intro: "", banner_url: "",
  image_url: "", h1_tag: "",
};

const AdminArticles = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  const fetchArticles = async () => {
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data);
  };

  useEffect(() => { fetchArticles(); }, []);

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 75);
  };

  const handleTitleChange = (title: string) => {
    const newForm = { ...form, title };
    if (!editId || form.slug === generateSlug(form.title)) {
      newForm.slug = generateSlug(title);
    }
    if (!form.h1_tag || form.h1_tag === form.title) {
      newForm.h1_tag = title;
    }
    setForm(newForm);
  };

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !form.keywords.includes(kw)) {
      setForm({ ...form, keywords: [...form.keywords, kw] });
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setForm({ ...form, keywords: form.keywords.filter(k => k !== kw) });
  };

  const handleSave = async () => {
    const slug = form.slug || generateSlug(form.title);
    const published = form.status === "live";
    const payload = {
      title: form.title, slug, excerpt: form.excerpt || null, content: form.content || null,
      category: form.category, author: form.author || null, published,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      keywords: form.keywords.length > 0 ? form.keywords : null,
      priority: form.priority, featured: form.featured, status: form.status,
      intro: form.intro || null, banner_url: form.banner_url || null,
      image_url: form.image_url || null, h1_tag: form.h1_tag || null,
    };

    if (editId) {
      const { error } = await supabase.from("articles").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("articles").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editId ? "Article updated" : "Article created" });
    setDialogOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchArticles();
  };

  const handleEdit = (article: any) => {
    setForm({
      title: article.title || "", slug: article.slug || "", excerpt: article.excerpt || "",
      content: article.content || "", category: article.category || "news",
      author: article.author || "", published: article.published || false,
      meta_title: article.meta_title || "", meta_description: article.meta_description || "",
      keywords: article.keywords || [], priority: article.priority || 0,
      featured: article.featured || false, status: article.status || "draft",
      intro: article.intro || "", banner_url: article.banner_url || "",
      image_url: article.image_url || "", h1_tag: article.h1_tag || "",
    });
    setEditId(article.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    await supabase.from("articles").delete().eq("id", id);
    fetchArticles();
    toast({ title: "Article deleted" });
  };

  const filteredArticles = articles.filter(a => {
    if (filterStatus !== "all" && (a.status || "draft") !== filterStatus) return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const s = statusOptions.find(o => o.value === status) || statusOptions[0];
    return <Badge className={`${s.color} border-none text-xs`}>{s.label}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Articles</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}><Plus className="w-4 h-4 mr-2" /> New Article</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-heading">{editId ? "Edit" : "Create"} Article</DialogTitle></DialogHeader>
            <Tabs defaultValue="content" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="seo">SEO & Meta</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Title *</Label>
                  <Input placeholder="Article title" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Slug (auto-generated, editable)</Label>
                  <Input placeholder="url-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-mono text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Author</Label>
                    <Input placeholder="Author name" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Intro / Summary</Label>
                  <RichTextEditor content={form.intro} onChange={(html) => setForm({ ...form, intro: html })} placeholder="Brief intro paragraph..." />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Excerpt (for cards/previews)</Label>
                  <Input placeholder="Short excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Content</Label>
                  <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Write your article content here..." />
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <SEOChecklist data={form} />
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">H1 Tag</Label>
                  <Input placeholder="Primary H1 heading" value={form.h1_tag} onChange={(e) => setForm({ ...form, h1_tag: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Title (max 60 chars)</Label>
                  <Input placeholder="SEO title for search results" value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={70} />
                  <span className="text-xs text-muted-foreground">{form.meta_title.length}/60</span>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meta Description (max 160 chars)</Label>
                  <Input placeholder="SEO description" value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={170} />
                  <span className="text-xs text-muted-foreground">{form.meta_description.length}/160</span>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Target Keywords</Label>
                  <div className="flex gap-2 mb-2">
                    <Input placeholder="Add keyword and press Enter" value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={addKeyword}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form.keywords.map(kw => (
                      <Badge key={kw} variant="secondary" className="gap-1 text-xs">
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Priority</Label>
                  <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} min={0} max={100} />
                </div>
                <div className="border border-border rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Google Preview</h4>
                  <div className="space-y-1">
                    <div className="text-primary text-base font-medium truncate">{form.meta_title || form.title || "Page Title"} | MBAHub</div>
                    <div className="text-green-700 dark:text-green-400 text-xs">mbahub.com/article/{form.slug || "page-slug"}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{form.meta_description || form.excerpt || "Add a meta description..."}</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v, published: v === "live" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                  <Label>Featured on Homepage</Label>
                </div>
                <FileUpload bucket="uploads" folder="articles/banners" value={form.banner_url} onChange={(url) => setForm({ ...form, banner_url: url })} accept="image/*" label="Banner Image" sizeHint="1200×400 px (3:1 ratio, JPG/PNG)" />
                <FileUpload bucket="uploads" folder="articles/images" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} accept="image/*" label="Featured Image" sizeHint="800×450 px (16:9 ratio, JPG/PNG)" />
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} className="flex-1">{editId ? "Update Article" : "Create Article"}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search articles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SEO</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((a) => {
                const seoScore = [a.meta_title, a.meta_description, a.h1_tag, (a.keywords || []).length > 0].filter(Boolean).length;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{a.title}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{a.category}</Badge></TableCell>
                    <TableCell>{getStatusBadge(a.status || "draft")}</TableCell>
                    <TableCell>
                      <Badge className={`border-none text-xs ${seoScore >= 3 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : seoScore >= 2 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                        {seoScore}/4
                      </Badge>
                    </TableCell>
                    <TableCell>{a.featured ? "⭐" : "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" asChild><a href={`/article/${a.slug}`} target="_blank"><Eye className="w-4 h-4" /></a></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredArticles.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No articles found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminArticles;
