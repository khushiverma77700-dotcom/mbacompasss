import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Settings2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { slugify } from "@/lib/slugify";
import AIGenerateMockDialog from "@/components/admin/AIGenerateMockDialog";

const SECTION_DEFAULTS = [
  { code: "VARC" as const, name: "Verbal Ability & Reading Comprehension", duration_minutes: 40, total_questions: 24, sort_order: 0 },
  { code: "DILR" as const, name: "Data Interpretation & Logical Reasoning", duration_minutes: 40, total_questions: 22, sort_order: 1 },
  { code: "QA" as const, name: "Quantitative Aptitude", duration_minutes: 40, total_questions: 22, sort_order: 2 },
];

type Form = {
  name: string;
  slug: string;
  description: string;
  banner_url: string;
  test_type: "full_length" | "sectional" | "topic";
  total_duration_minutes: number;
  pricing_type: "free" | "paid";
  price_inr: number;
  access_validity_days: number;
  difficulty: "easy" | "medium" | "hard";
  is_published: boolean;
  is_live: boolean;
  meta_title: string;
  meta_description: string;
};

const emptyForm: Form = {
  name: "",
  slug: "",
  description: "",
  banner_url: "",
  test_type: "full_length",
  total_duration_minutes: 120,
  pricing_type: "free",
  price_inr: 0,
  access_validity_days: 30,
  difficulty: "medium",
  is_published: false,
  is_live: false,
  meta_title: "",
  meta_description: "",
};

const AdminMockTests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchTests = async () => {
    setLoading(true);
    const { data } = await supabase.from("mock_tests").select("*").order("created_at", { ascending: false });
    setTests(data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchTests(); }, []);

  const startCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const startEdit = (t: any) => {
    setForm({
      name: t.name, slug: t.slug, description: t.description ?? "", banner_url: t.banner_url ?? "",
      test_type: t.test_type, total_duration_minutes: t.total_duration_minutes,
      pricing_type: t.pricing_type, price_inr: Number(t.price_inr), access_validity_days: t.access_validity_days,
      difficulty: t.difficulty, is_published: !!t.is_published, is_live: !!t.is_live,
      meta_title: t.meta_title ?? "", meta_description: t.meta_description ?? "",
    });
    setEditId(t.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const slug = form.slug.trim() || slugify(form.name);
    if (form.pricing_type === "paid" && Number(form.price_inr) <= 0) {
      toast({ title: "Paid mocks need a price > 0", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = { ...form, slug, price_inr: Number(form.price_inr) || 0 };
    if (editId) {
      const { error } = await supabase.from("mock_tests").update(payload).eq("id", editId);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Mock test updated" });
    } else {
      const { data, error } = await supabase.from("mock_tests").insert(payload).select("id").single();
      if (error || !data) { toast({ title: "Save failed", description: error?.message, variant: "destructive" }); setSaving(false); return; }
      // Seed default sections for full-length CAT mock
      if (form.test_type === "full_length") {
        const sections = SECTION_DEFAULTS.map(s => ({ ...s, test_id: data.id }));
        await supabase.from("mock_sections").insert(sections);
      }
      toast({ title: "Mock test created — now add questions" });
      setShowForm(false); setEditId(null); setForm(emptyForm);
      navigate(`/admin/mock-tests/${data.id}/builder`);
      return;
    }
    setSaving(false);
    setShowForm(false); setEditId(null); setForm(emptyForm);
    fetchTests();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes all sections, questions, attempts, and responses.`)) return;
    const { error } = await supabase.from("mock_tests").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mock test deleted" });
    fetchTests();
  };

  if (showForm) {
    return (
      <div className="max-w-3xl">
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Mock Tests
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Create"} Mock Test</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Test Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} placeholder="CAT Mock 01 — Full Length" />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="cat-mock-01" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Test Type</Label>
                <Select value={form.test_type} onValueChange={(v: any) => setForm({ ...form, test_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_length">Full Length</SelectItem>
                    <SelectItem value="sectional">Sectional</SelectItem>
                    <SelectItem value="topic">Topic-wise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Total Duration (min)</Label>
                <Input type="number" value={form.total_duration_minutes} onChange={(e) => setForm({ ...form, total_duration_minutes: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Access Validity (days)</Label>
                <Input type="number" value={form.access_validity_days} onChange={(e) => setForm({ ...form, access_validity_days: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Pricing</Label>
                <Select value={form.pricing_type} onValueChange={(v: any) => setForm({ ...form, pricing_type: v, price_inr: v === "free" ? 0 : form.price_inr })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.pricing_type === "paid" && (
                <div>
                  <Label className="text-xs">Price (INR)</Label>
                  <Input type="number" value={form.price_inr} onChange={(e) => setForm({ ...form, price_inr: parseFloat(e.target.value) || 0 })} />
                </div>
              )}
              <div>
                <Label className="text-xs">Banner URL</Label>
                <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Meta Title (SEO)</Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} maxLength={60} />
              </div>
              <div>
                <Label className="text-xs">Meta Description (SEO)</Label>
                <Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={160} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label className="text-sm">Published (visible to students)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_live} onCheckedChange={(v) => setForm({ ...form, is_live: v })} />
                <Label className="text-sm">Live mock (scheduled)</Label>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editId ? "Update Mock Test" : "Create & Add Questions"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Mock Tests</h1>
          <p className="text-sm text-muted-foreground mt-1">CAT-style mock test management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2 text-primary" /> Generate Mocks From AI
          </Button>
          <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" /> New Mock Test</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { v: "all", l: "All" },
          { v: "full_length", l: "Full Length" },
          { v: "sectional", l: "Sectional" },
          { v: "topic", l: "Topic-wise" },
          { v: "daily", l: "Daily Test" },
          { v: "practice", l: "Practice" },
        ].map((c) => (
          <Button
            key={c.v}
            size="sm"
            variant={categoryFilter === c.v ? "default" : "outline"}
            onClick={() => setCategoryFilter(c.v)}
          >
            {c.l}
            <Badge variant="secondary" className="ml-2">
              {c.v === "all" ? tests.length : tests.filter((t) => (t.category || t.test_type) === c.v).length}
            </Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Takers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (<TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>)}
              {!loading && tests.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No mock tests yet. Click <strong>New Mock Test</strong> to create your first CAT mock.
                </TableCell></TableRow>
              )}
              {tests.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">/{t.slug}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{t.test_type.replace("_", " ")}</Badge></TableCell>
                  <TableCell>
                    {t.pricing_type === "free" ? (
                      <Badge variant="secondary">Free</Badge>
                    ) : (
                      <Badge>₹{Number(t.price_inr).toLocaleString("en-IN")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{t.total_duration_minutes} min</TableCell>
                  <TableCell>
                    {t.is_published ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Published</Badge> : <Badge variant="outline">Draft</Badge>}
                    {t.is_live && <Badge className="ml-1 bg-orange-500 hover:bg-orange-600">Live</Badge>}
                  </TableCell>
                  <TableCell>{t.total_takers ?? 0}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild variant="outline" size="sm" title="Manage sections & questions">
                      <Link to={`/admin/mock-tests/${t.id}/builder`}>
                        <Settings2 className="w-3.5 h-3.5 mr-1" /> Builder
                      </Link>
                    </Button>
                    {t.is_published && (
                      <Button asChild variant="ghost" size="sm" title="Open public page">
                        <Link to={`/mocks/${t.slug}`} target="_blank"><ExternalLink className="w-3.5 h-3.5" /></Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => startEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id, t.name)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMockTests;
