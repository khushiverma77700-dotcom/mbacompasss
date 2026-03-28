import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Search, X, Bold, Italic, Heading1, Heading2, Heading3, Link2, Table2, List, ListOrdered, Image } from "lucide-react";
import SEOChecklist from "@/components/admin/SEOChecklist";

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
  const contentRef = useState<HTMLTextAreaElement | null>(null);

  const fetchArticles = async () => {
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data);
  };

  useEffect(() => { fetchArticles(); }, []);

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 75);
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

  // Rich text toolbar actions
  const insertTag = (before: string, after: string = "") => {
    const textarea = document.getElementById("content-editor") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const newContent = textarea.value.substring(0, start) + before + selected + after + textarea.value.substring(end);
    setForm({ ...form, content: newContent });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const insertTable = () => {
    const table = `\n<table class="w-full border-collapse border border-gray-300">\n<thead>\n<tr><th class="border border-gray-300 p-2">Column 1</th><th class="border border-gray-300 p-2">Column 2</th><th class="border border-gray-300 p-2">Column 3</th></tr>\n</thead>\n<tbody>\n<tr><td class="border border-gray-300 p-2">Data 1</td><td class="border border-gray-300 p-2">Data 2</td><td class="border border-gray-300 p-2">Data 3</td></tr>\n<tr><td class="border border-gray-300 p-2">Data 4</td><td class="border border-gray-300 p-2">Data 5</td><td class="border border-gray-300 p-2">Data 6</td></tr>\n</tbody>\n</table>\n`;
    setForm({ ...form, content: form.content + table });
  };

  const handleSave = async () => {
    const slug = form.slug || generateSlug(form.title);
    const published = form.status === "live";
    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: form.content || null,
      category: form.category,
      author: form.author || null,
      published,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      keywords: form.keywords.length > 0 ? form.keywords : null,
      priority: form.priority,
      featured: form.featured,
      status: form.status,
      intro: form.intro || null,
      banner_url: form.banner_url || null,
      image_url: form.image_url || null,
      h1_tag: form.h1_tag || null,
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
      title: article.title || "",
      slug: article.slug || "",
      excerpt: article.excerpt || "",
      content: article.content || "",
      category: article.category || "news",
      author: article.author || "",
      published: article.published || false,
      meta_title: article.meta_title || "",
      meta_description: article.meta_description || "",
      keywords: article.keywords || [],
      priority: article.priority || 0,
      featured: article.featured || false,
      status: article.status || "draft",
      intro: article.intro || "",
      banner_url: article.banner_url || "",
      image_url: article.image_url || "",
      h1_tag: article.h1_tag || "",
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

              {/* Content Tab */}
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
                  <Textarea placeholder="Brief intro paragraph shown at the top" value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Excerpt (for cards/previews)</Label>
                  <Textarea placeholder="Short excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Content (HTML supported)</Label>
                  </div>
                  {/* Toolbar */}
                  <div className="flex flex-wrap gap-1 mb-2 p-2 bg-muted/50 rounded-lg border border-border">
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag("<h1>", "</h1>")} className="h-7 w-7 p-0"><Heading1 className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag("<h2>", "</h2>")} className="h-7 w-7 p-0"><Heading2 className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag("<h3>", "</h3>")} className="h-7 w-7 p-0"><Heading3 className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-7 bg-border mx-1" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag("<strong>", "</strong>")} className="h-7 w-7 p-0"><Bold className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag("<em>", "</em>")} className="h-7 w-7 p-0"><Italic className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-7 bg-border mx-1" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('<a href="URL">', "</a>")} className="h-7 w-7 p-0"><Link2 className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag('<img src="URL" alt="description" class="w-full rounded-lg" />', "")} className="h-7 w-7 p-0"><Image className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-7 bg-border mx-1" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag("<ul>\n<li>", "</li>\n</ul>")} className="h-7 w-7 p-0"><List className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertTag("<ol>\n<li>", "</li>\n</ol>")} className="h-7 w-7 p-0"><ListOrdered className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-7 bg-border mx-1" />
                    <Button type="button" variant="ghost" size="sm" onClick={insertTable} className="h-7 px-2 gap-1 text-xs"><Table2 className="w-3.5 h-3.5" /> Table</Button>
                  </div>
                  <Textarea
                    id="content-editor"
                    placeholder="Write your article content here. HTML tags supported for rich formatting."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={16}
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>

              {/* SEO Tab */}
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
                  <Textarea placeholder="SEO description for search results" value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} rows={3} maxLength={170} />
                  <span className="text-xs text-muted-foreground">{form.meta_description.length}/160</span>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Target Keywords</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add keyword and press Enter"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                    />
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
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Priority (0=normal, higher=more important)</Label>
                  <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} min={0} max={100} />
                </div>

                {/* SEO Preview */}
                <div className="border border-border rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Google Preview</h4>
                  <div className="space-y-1">
                    <div className="text-primary text-base font-medium truncate">{form.meta_title || form.title || "Page Title"} | MBAHub</div>
                    <div className="text-green-700 dark:text-green-400 text-xs">mbahub.com/article/{form.slug || "page-slug"}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{form.meta_description || form.excerpt || "Add a meta description to control what appears in search results."}</div>
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
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
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Banner Image URL</Label>
                  <Input placeholder="https://..." value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Featured Image URL</Label>
                  <Input placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} className="flex-1">{editId ? "Update Article" : "Create Article"}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
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
