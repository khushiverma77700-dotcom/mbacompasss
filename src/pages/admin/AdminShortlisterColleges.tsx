import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, GraduationCap, Sparkles, Loader2, Building2, IndianRupee, TrendingUp, MapPin, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIERS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
const CATEGORIES = ["IIM", "Non-IIM"];
const EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "GMAT", "MAT", "CMAT"];

const emptyForm = {
  name: "", slug: "", city: "", state: "", fees: "", placement_avg: "", placement_highest: "",
  ranking: "", tier: "Tier 2", college_category: "Non-IIM", type: "", established: "",
  exams_accepted: [] as string[], accreditations: [] as string[], description: "",
  courses: [] as string[], campus_size: "", total_students: "", website: "",
  meta_title: "", meta_description: "", logo_url: "", banner_url: "",
};

const AdminShortlisterColleges = () => {
  const [colleges, setColleges] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [newExam, setNewExam] = useState("");
  const [newAccr, setNewAccr] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const { toast } = useToast();

  const fetchColleges = async () => {
    let q = supabase.from("colleges").select("id, name, slug, city, state, fees, placement_avg, ranking, tier, college_category, exams_accepted, established, logo_url").order("ranking", { ascending: true, nullsFirst: false });
    const { data } = await q;
    if (data) setColleges(data);
  };

  useEffect(() => { fetchColleges(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: editId ? f.slug : generateSlug(name) }));
  };

  const aiEnrich = async () => {
    if (!form.name) { toast({ title: "Enter college name first", variant: "destructive" }); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("college-shortlister", {
        body: { action: "enrich", collegeName: form.name }
      });
      if (error) throw error;
      if (data?.enriched) {
        const e = data.enriched;
        setForm(f => ({
          ...f,
          city: f.city || e.city || "",
          state: f.state || e.state || "",
          fees: f.fees || e.fees || "",
          placement_avg: f.placement_avg || e.placement_avg || "",
          placement_highest: f.placement_highest || e.placement_highest || "",
          ranking: f.ranking || (e.ranking?.toString() || ""),
          tier: e.tier || f.tier,
          college_category: e.college_category || f.college_category,
          type: f.type || e.type || "",
          established: f.established || (e.established?.toString() || ""),
          exams_accepted: f.exams_accepted.length > 0 ? f.exams_accepted : (e.exams_accepted || []),
          accreditations: f.accreditations.length > 0 ? f.accreditations : (e.accreditations || []),
          description: f.description || e.description || "",
          courses: f.courses.length > 0 ? f.courses : (e.courses || []),
          campus_size: f.campus_size || e.campus_size || "",
          website: f.website || e.website || "",
        }));
        toast({ title: "AI enriched college data", description: "Review and adjust before saving" });
      }
    } catch (err: any) {
      toast({ title: "AI enrichment failed", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast({ title: "Name and slug are required", variant: "destructive" }); return; }
    if (!form.tier || !form.college_category) { toast({ title: "Tier and Category are mandatory", variant: "destructive" }); return; }

    const payload: any = {
      name: form.name, slug: form.slug, city: form.city || null, state: form.state || null,
      fees: form.fees || null, placement_avg: form.placement_avg || null,
      placement_highest: form.placement_highest || null,
      ranking: form.ranking ? parseInt(form.ranking) : null,
      tier: form.tier, college_category: form.college_category, type: form.type || null,
      established: form.established ? parseInt(form.established) : null,
      exams_accepted: form.exams_accepted.length > 0 ? form.exams_accepted : null,
      accreditations: form.accreditations.length > 0 ? form.accreditations : null,
      description: form.description || null,
      courses: form.courses.length > 0 ? form.courses : null,
      campus_size: form.campus_size || null,
      total_students: form.total_students ? parseInt(form.total_students) : null,
      website: form.website || null,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      logo_url: form.logo_url || null, banner_url: form.banner_url || null,
    };

    if (editId) {
      const { error } = await supabase.from("colleges").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "College updated" });
    } else {
      const { error } = await supabase.from("colleges").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "College added" });
    }
    setDialogOpen(false); setForm(emptyForm); setEditId(null); fetchColleges();
  };

  const handleEdit = (college: any) => {
    setForm({
      name: college.name || "", slug: college.slug || "", city: college.city || "", state: college.state || "",
      fees: college.fees || "", placement_avg: college.placement_avg || "",
      placement_highest: college.placement_highest || "",
      ranking: college.ranking?.toString() || "", tier: college.tier || "Tier 2",
      college_category: college.college_category || "Non-IIM", type: college.type || "",
      established: college.established?.toString() || "",
      exams_accepted: college.exams_accepted || [], accreditations: college.accreditations || [],
      description: college.description || "", courses: college.courses || [],
      campus_size: college.campus_size || "", total_students: college.total_students?.toString() || "",
      website: college.website || "", meta_title: college.meta_title || "",
      meta_description: college.meta_description || "", logo_url: college.logo_url || "",
      banner_url: college.banner_url || "",
    });
    setEditId(college.id); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this college? This cannot be undone.")) return;
    await supabase.from("colleges").delete().eq("id", id);
    fetchColleges(); toast({ title: "College deleted" });
  };

  const filtered = colleges.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || c.tier === filterTier;
    const matchCat = filterCategory === "all" || c.college_category === filterCategory;
    return matchSearch && matchTier && matchCat;
  });

  const stats = {
    total: colleges.length,
    iim: colleges.filter(c => c.college_category === "IIM").length,
    tier1: colleges.filter(c => c.tier === "Tier 1").length,
    tier2: colleges.filter(c => c.tier === "Tier 2").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Shortlister Colleges
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage colleges that appear in AI College Shortlister results</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-2" /> Add College
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editId ? "Edit" : "Add"} College
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="basic" className="mt-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
                <TabsTrigger value="academics" className="text-xs">Academics</TabsTrigger>
                <TabsTrigger value="placement" className="text-xs">Placement</TabsTrigger>
                <TabsTrigger value="seo" className="text-xs">SEO & Media</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                {/* AI Enrich Button */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs text-foreground flex-1">Auto-fill missing data using AI</span>
                  <Button size="sm" variant="outline" onClick={aiEnrich} disabled={aiLoading || !form.name}>
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    AI Enrich
                  </Button>
                </div>

                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs font-semibold mb-1.5 block">College Name <span className="text-destructive">*</span></Label>
                      <Input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. IIM Ahmedabad" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Slug <span className="text-destructive">*</span></Label>
                      <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Type</Label>
                      <Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="e.g. Private / Government" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Category <span className="text-destructive">*</span></Label>
                      <Select value={form.college_category} onValueChange={v => setForm(f => ({ ...f, college_category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Tier <span className="text-destructive">*</span></Label>
                      <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">City</Label>
                      <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Mumbai" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">State</Label>
                      <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="Maharashtra" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Established</Label>
                      <Input type="number" value={form.established} onChange={e => setForm(f => ({ ...f, established: e.target.value }))} placeholder="1961" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Description</Label>
                    <textarea className="w-full border border-border rounded-md p-2 text-sm bg-background min-h-[80px]" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief about the college..." />
                  </div>
                </TabsContent>

                <TabsContent value="academics" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Ranking</Label>
                      <Input type="number" value={form.ranking} onChange={e => setForm(f => ({ ...f, ranking: e.target.value }))} placeholder="e.g. 5" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Campus Size</Label>
                      <Input value={form.campus_size} onChange={e => setForm(f => ({ ...f, campus_size: e.target.value }))} placeholder="e.g. 100 acres" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Total Students</Label>
                      <Input type="number" value={form.total_students} onChange={e => setForm(f => ({ ...f, total_students: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Website</Label>
                      <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                    </div>
                  </div>

                  {/* Exams accepted */}
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Exams Accepted</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.exams_accepted.map((e, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setForm(f => ({ ...f, exams_accepted: f.exams_accepted.filter((_, j) => j !== i) }))}>
                          {e} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Select value={newExam} onValueChange={v => { if (v && !form.exams_accepted.includes(v)) setForm(f => ({ ...f, exams_accepted: [...f.exams_accepted, v] })); setNewExam(""); }}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Add exam..." /></SelectTrigger>
                        <SelectContent>
                          {EXAMS.filter(e => !form.exams_accepted.includes(e)).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Accreditations */}
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Accreditations</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.accreditations.map((a, i) => (
                        <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => setForm(f => ({ ...f, accreditations: f.accreditations.filter((_, j) => j !== i) }))}>
                          {a} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={newAccr} onChange={e => setNewAccr(e.target.value)} placeholder="e.g. AACSB, EQUIS" onKeyDown={e => { if (e.key === "Enter" && newAccr.trim()) { setForm(f => ({ ...f, accreditations: [...f.accreditations, newAccr.trim()] })); setNewAccr(""); } }} />
                      <Button size="sm" variant="outline" onClick={() => { if (newAccr.trim()) { setForm(f => ({ ...f, accreditations: [...f.accreditations, newAccr.trim()] })); setNewAccr(""); } }}>Add</Button>
                    </div>
                  </div>

                  {/* Courses */}
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Courses / Programs</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.courses.map((c, i) => (
                        <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => setForm(f => ({ ...f, courses: f.courses.filter((_, j) => j !== i) }))}>
                          {c} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder="e.g. MBA, PGDM" onKeyDown={e => { if (e.key === "Enter" && newCourse.trim()) { setForm(f => ({ ...f, courses: [...f.courses, newCourse.trim()] })); setNewCourse(""); } }} />
                      <Button size="sm" variant="outline" onClick={() => { if (newCourse.trim()) { setForm(f => ({ ...f, courses: [...f.courses, newCourse.trim()] })); setNewCourse(""); } }}>Add</Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="placement" className="space-y-4 mt-0">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Total Fees</Label>
                      <Input value={form.fees} onChange={e => setForm(f => ({ ...f, fees: e.target.value }))} placeholder="e.g. ₹23 Lakhs" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Avg Package (CTC)</Label>
                      <Input value={form.placement_avg} onChange={e => setForm(f => ({ ...f, placement_avg: e.target.value }))} placeholder="e.g. ₹32 LPA" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Highest Package</Label>
                      <Input value={form.placement_highest} onChange={e => setForm(f => ({ ...f, placement_highest: e.target.value }))} placeholder="e.g. ₹1.2 Cr" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Logo URL</Label>
                    <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Banner URL</Label>
                    <Input value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Meta Title</Label>
                    <Input value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Meta Description</Label>
                    <textarea className="w-full border border-border rounded-md p-2 text-sm bg-background min-h-[60px]" value={form.meta_description} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <Button onClick={handleSave} className="w-full mt-4">{editId ? "Update" : "Create"} College</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Colleges", value: stats.total, icon: Building2, color: "text-primary" },
          { label: "IIM Colleges", value: stats.iim, icon: GraduationCap, color: "text-amber-600" },
          { label: "Tier 1", value: stats.tier1, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Tier 2+", value: stats.tier2, icon: MapPin, color: "text-blue-600" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search colleges..." className="pl-9" />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[130px]"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">College</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Tier</TableHead>
                <TableHead className="text-xs">City</TableHead>
                <TableHead className="text-xs">Rank</TableHead>
                <TableHead className="text-xs">Fees</TableHead>
                <TableHead className="text-xs">Avg CTC</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.logo_url ? <img src={c.logo_url} className="w-7 h-7 rounded object-contain" alt="" /> : <Building2 className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-medium text-xs">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.college_category === "IIM" ? "default" : "outline"} className="text-[10px]">
                      {c.college_category || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{c.tier || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.city || "—"}</TableCell>
                  <TableCell className="text-xs">{c.ranking || "—"}</TableCell>
                  <TableCell className="text-xs">{c.fees || "—"}</TableCell>
                  <TableCell className="text-xs">{c.placement_avg || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No colleges found. Add your first college above.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminShortlisterColleges;
