import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, GraduationCap, X, Package } from "lucide-react";
import FileUpload from "@/components/admin/FileUpload";

interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  exam_focus: string[] | null;
  mode: string | null;
  level: string | null;
  language: string | null;
  duration_weeks: number | null;
  validity_months: number | null;
  price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  features: any;
  highlights: any;
  curriculum: any;
  what_youll_learn: any;
  faqs: any;
  instructors: any;
  gallery_images: any;
  thumbnail_url: string | null;
  banner_url: string | null;
  enroll_url: string | null;
  brochure_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  total_students_enrolled: number | null;
  rating: number | null;
  reviews_count: number | null;
  // counts
  full_mocks_count: number | null;
  sectional_mocks_count: number | null;
  topic_tests_count: number | null;
  total_video_hours: number | null;
  total_practice_questions: number | null;
  live_classes_count: number | null;
  // toggles
  has_ai_study_planner: boolean;
  has_ai_tools: boolean;
  has_daily_test: boolean;
  has_daily_mocks: boolean;
  has_cat_planner: boolean;
  has_sectional_tests: boolean;
  has_topic_tests: boolean;
  has_previous_year_papers: boolean;
  has_personalized_hub: boolean;
  has_mentorship_1on1: boolean;
  has_doubt_resolution: boolean;
  has_recorded_lectures: boolean;
  has_live_classes: boolean;
  has_performance_analytics: boolean;
  has_leaderboard_access: boolean;
  has_mock_analysis: boolean;
  has_study_material: boolean;
  has_gd_pi_prep: boolean;
  has_percentile_predictor: boolean;
  has_ai_insights: boolean;
  has_certificate: boolean;
  has_lifetime_access: boolean;
  seo_title: string | null;
  seo_description: string | null;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Only keep features that actually exist on the student dashboard.
// Mocks themselves are NOT toggled here — they come automatically from attached bundles.
const FEATURE_TOGGLES: { key: keyof Course; label: string; group: string }[] = [
  { key: "has_daily_test",            label: "Daily Test",                  group: "Tests & Practice" },
  { key: "has_mock_analysis",         label: "Detailed Mock Analysis",      group: "Tests & Practice" },
  { key: "has_leaderboard_access",    label: "Leaderboard",                 group: "Tests & Practice" },

  { key: "has_ai_study_planner",      label: "AI Study Planner",            group: "AI & Insights" },
  { key: "has_cat_planner",           label: "Day Planner",                 group: "AI & Insights" },
  { key: "has_performance_analytics", label: "Performance Analytics",       group: "AI & Insights" },
  { key: "has_percentile_predictor",  label: "Percentile Predictor",        group: "AI & Insights" },
  { key: "has_ai_tools",              label: "AI Tools (analyzer, finder)", group: "AI & Insights" },

  { key: "has_doubt_resolution",      label: "Support Center",              group: "Support" },
];

const empty: Partial<Course> = {
  title: "", slug: "", subtitle: "", description: "",
  exam_focus: ["CAT"], mode: "online", level: "beginner", language: "English",
  validity_months: 12,
  price: 0, original_price: 0, discount_percent: 0,
  features: [], highlights: [], curriculum: [],
  what_youll_learn: [], faqs: [], instructors: [], gallery_images: [],
  is_featured: false, is_active: true, sort_order: 0,
  total_students_enrolled: 0, rating: 0, reviews_count: 0,
};

type BundleOpt = { id: string; name: string; exam_code: string | null; is_published: boolean };

export default function AdminMBACompassCourses() {
  const [list, setList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Course> | null>(null);
  const [bundles, setBundles] = useState<BundleOpt[]>([]);
  const [editBundleIds, setEditBundleIds] = useState<string[]>([]);
  const [bundleCounts, setBundleCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: courses }, { data: b }, { data: cb }] = await Promise.all([
      supabase.from("mba_compass_courses").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("mock_bundles").select("id, name, exam_code, is_published").order("sort_order"),
      supabase.from("course_bundles").select("course_id, bundle_id"),
    ]);
    setList((courses ?? []) as Course[]);
    setBundles((b ?? []) as BundleOpt[]);
    const counts: Record<string, number> = {};
    (cb ?? []).forEach((r: any) => { counts[r.course_id] = (counts[r.course_id] ?? 0) + 1; });
    setBundleCounts(counts);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // When opening an existing course, load its linked bundles
  useEffect(() => {
    (async () => {
      if (!edit?.id) { setEditBundleIds([]); return; }
      const { data } = await supabase.from("course_bundles").select("bundle_id").eq("course_id", edit.id);
      setEditBundleIds((data ?? []).map((r: any) => r.bundle_id));
    })();
  }, [edit?.id]);

  const toggleBundle = (id: string) => {
    setEditBundleIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const save = async () => {
    if (!edit?.title) return toast.error("Title required");
    const slug = edit.slug?.trim() || slugify(edit.title);

    // Auto-derive mock counts from attached bundles
    let fullMocks = 0, sectionalMocks = 0, topicTests = 0, totalMocks = 0;
    if (editBundleIds.length > 0) {
      const { data: items } = await supabase
        .from("mock_bundle_items")
        .select("test:mock_tests(test_type, category)")
        .in("bundle_id", editBundleIds);
      const seen = new Set<string>();
      (items ?? []).forEach((row: any) => {
        const t = row.test;
        if (!t) return;
        const kind = (t.test_type || t.category || "full_length") as string;
        const key = `${kind}-${totalMocks}-${Math.random()}`;
        if (seen.has(key)) return;
        seen.add(key);
        totalMocks++;
        if (kind === "full_length") fullMocks++;
        else if (kind === "sectional") sectionalMocks++;
        else if (kind === "topic_wise" || kind === "topic") topicTests++;
      });
    }

    const payload = {
      ...edit,
      slug,
      exam_focus: edit.exam_focus ?? [],
      features: edit.features ?? [],
      highlights: edit.highlights ?? [],
      curriculum: edit.curriculum ?? [],
      what_youll_learn: edit.what_youll_learn ?? [],
      faqs: edit.faqs ?? [],
      instructors: edit.instructors ?? [],
      gallery_images: edit.gallery_images ?? [],
      // Auto-derived from bundles
      full_mocks_count: fullMocks,
      sectional_mocks_count: sectionalMocks,
      topic_tests_count: topicTests,
      // Always zero — these don't exist on the platform
      live_classes_count: 0,
      total_video_hours: 0,
      total_practice_questions: 0,
      has_live_classes: false,
      has_recorded_lectures: false,
      has_study_material: false,
      has_mentorship_1on1: false,
      has_gd_pi_prep: false,
      has_certificate: false,
      has_lifetime_access: false,
      has_sectional_tests: sectionalMocks > 0,
      has_topic_tests: topicTests > 0,
    };
    let courseId = edit.id;
    let error;
    if (edit.id) {
      ({ error } = await supabase.from("mba_compass_courses").update(payload as any).eq("id", edit.id));
    } else {
      const ins = await supabase.from("mba_compass_courses").insert(payload as any).select("id").single();
      error = ins.error;
      courseId = ins.data?.id;
    }
    if (error) return toast.error(error.message);

    // Sync course_bundles: replace links for this course
    if (courseId) {
      await supabase.from("course_bundles").delete().eq("course_id", courseId);
      if (editBundleIds.length > 0) {
        const rows = editBundleIds.map((bundle_id, sort_order) => ({ course_id: courseId, bundle_id, sort_order }));
        const linkRes = await supabase.from("course_bundles").insert(rows);
        if (linkRes.error) toast.error("Course saved, but bundle links failed: " + linkRes.error.message);
      }
    }

    toast.success("Course saved");
    setEdit(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await supabase.from("mba_compass_courses").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const arrField = (val: any) => Array.isArray(val) ? val.join("\n") : "";
  const setArr = (key: keyof Course, txt: string) =>
    setEdit({ ...edit!, [key]: txt.split("\n").map((s) => s.trim()).filter(Boolean) });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-sky-600" /> MBA Compass Courses
          </h1>
          <p className="text-sm text-muted-foreground">Manage in-house paid programs displayed at /mba-compass.</p>
        </div>
        <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit(empty)} className="bg-sky-600 hover:bg-sky-700">
              <Plus className="h-4 w-4 mr-2" /> New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{edit?.id ? "Edit course" : "Create new course"}</DialogTitle>
            </DialogHeader>
            {edit && (
              <Tabs defaultValue="basic" className="mt-2">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="basic">Basics</TabsTrigger>
                  <TabsTrigger value="media">Images</TabsTrigger>
                  <TabsTrigger value="bundles">Bundles ({editBundleIds.length})</TabsTrigger>
                  <TabsTrigger value="features">Features Included</TabsTrigger>
                  <TabsTrigger value="faqs">FAQs</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                </TabsList>

                {/* BASICS */}
                <TabsContent value="basic" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Title *</Label><Input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
                    <div><Label>Slug</Label><Input value={edit.slug ?? ""} placeholder="auto from title" onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div>
                  </div>
                  <div><Label>Subtitle</Label><Input value={edit.subtitle ?? ""} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} /></div>
                  <div><Label>Full description</Label><Textarea rows={4} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>

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
                    <div>
                      <Label>Level</Label>
                      <select className="w-full h-10 rounded-md border px-3 text-sm" value={edit.level ?? "beginner"} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Language</Label><Input value={edit.language ?? ""} onChange={(e) => setEdit({ ...edit, language: e.target.value })} /></div>
                    <div><Label>Validity (months)</Label><Input type="number" value={edit.validity_months ?? 0} onChange={(e) => setEdit({ ...edit, validity_months: parseInt(e.target.value) || 0 })} /></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                    <div><Label>Price (₹)</Label><Input type="number" value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: parseFloat(e.target.value) || 0 })} /></div>
                    <div><Label>Original price (₹)</Label><Input type="number" value={edit.original_price ?? 0} onChange={(e) => setEdit({ ...edit, original_price: parseFloat(e.target.value) || 0 })} /></div>
                    <div><Label>Discount %</Label><Input type="number" value={edit.discount_percent ?? 0} onChange={(e) => setEdit({ ...edit, discount_percent: parseInt(e.target.value) || 0 })} /></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Students enrolled</Label><Input type="number" value={edit.total_students_enrolled ?? 0} onChange={(e) => setEdit({ ...edit, total_students_enrolled: parseInt(e.target.value) || 0 })} /></div>
                    <div><Label>Rating (0-5)</Label><Input type="number" step="0.1" min={0} max={5} value={edit.rating ?? 0} onChange={(e) => setEdit({ ...edit, rating: parseFloat(e.target.value) || 0 })} /></div>
                    <div><Label>Reviews count</Label><Input type="number" value={edit.reviews_count ?? 0} onChange={(e) => setEdit({ ...edit, reviews_count: parseInt(e.target.value) || 0 })} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div><Label>Sort order</Label><Input type="number" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: parseInt(e.target.value) || 0 })} /></div>
                    <div className="flex items-end gap-4 pb-2">
                      <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.is_featured} onCheckedChange={(v) => setEdit({ ...edit, is_featured: v })} /> Featured</label>
                      <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /> Active</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div><Label>Enroll URL (external link or payment page)</Label><Input value={edit.enroll_url ?? ""} onChange={(e) => setEdit({ ...edit, enroll_url: e.target.value })} placeholder="https://..." /></div>
                    <div><Label>Brochure URL</Label><Input value={edit.brochure_url ?? ""} onChange={(e) => setEdit({ ...edit, brochure_url: e.target.value })} placeholder="https://..." /></div>
                  </div>
                </TabsContent>

                {/* MEDIA */}
                <TabsContent value="media" className="space-y-4 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <FileUpload
                        bucket="uploads"
                        folder="mba-compass"
                        accept="image/*"
                        showUrlInput={false}
                        sizeHint="1280×720 (16:9), max 500KB"
                        label="Thumbnail (card image)"
                        value={edit.thumbnail_url ?? ""}
                        onChange={(url) => setEdit({ ...edit, thumbnail_url: url })}
                      />
                    </div>
                    <div className="border rounded-lg p-3">
                      <FileUpload
                        bucket="uploads"
                        folder="mba-compass"
                        accept="image/*"
                        showUrlInput={false}
                        sizeHint="1920×600 wide banner"
                        label="Hero banner"
                        value={edit.banner_url ?? ""}
                        onChange={(url) => setEdit({ ...edit, banner_url: url })}
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <Label className="text-sm font-medium">Gallery images (uploaded only)</Label>
                    <p className="text-xs text-muted-foreground mb-2">Screenshots, classroom photos, etc.</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {(edit.gallery_images ?? []).map((img: string, i: number) => (
                        <div key={i} className="relative">
                          <img src={img} alt="" className="w-full aspect-video object-cover rounded border" />
                          <button
                            type="button"
                            onClick={() => setEdit({ ...edit, gallery_images: (edit.gallery_images ?? []).filter((_: any, j: number) => j !== i) })}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <FileUpload
                        bucket="uploads"
                        folder="mba-compass/gallery"
                        accept="image/*"
                        showUrlInput={false}
                        label="Add image to gallery"
                        value=""
                        onChange={(url) => url && setEdit({ ...edit, gallery_images: [...(edit.gallery_images ?? []), url] })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* FEATURES INCLUDED */}
                <TabsContent value="features" className="mt-4">
                  <p className="text-xs text-muted-foreground mb-3">Toggle exactly what's included in this course. These appear on the course card and in the comparison table.</p>
                  {Object.entries(
                    FEATURE_TOGGLES.reduce<Record<string, typeof FEATURE_TOGGLES>>((acc, t) => {
                      (acc[t.group] ??= []).push(t); return acc;
                    }, {})
                  ).map(([group, items]) => (
                    <div key={group} className="mb-4">
                      <div className="text-xs font-semibold text-sky-700 mb-2 uppercase tracking-wide">{group}</div>
                      <div className="grid sm:grid-cols-2 gap-2 border rounded-lg p-3 bg-sky-50/30">
                        {items.map((t) => (
                          <label key={t.key as string} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-white">
                            <span>{t.label}</span>
                            <Switch
                              checked={!!(edit as any)[t.key]}
                              onCheckedChange={(v) => setEdit({ ...edit, [t.key]: v } as any)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* (Counts, Curriculum, Instructors removed — auto-derived from bundles or unused on the platform) */}

                <TabsContent value="faqs" className="space-y-3 mt-4">
                  {(edit.faqs ?? []).map((f: any, i: number) => (
                    <div key={i} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-sky-700">FAQ {i + 1}</div>
                        <Button size="icon" variant="ghost" onClick={() => setEdit({ ...edit, faqs: edit.faqs.filter((_: any, j: number) => j !== i) })}>
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                      <Input placeholder="Question" value={f.q ?? ""} onChange={(e) => {
                        const upd = [...edit.faqs]; upd[i] = { ...upd[i], q: e.target.value };
                        setEdit({ ...edit, faqs: upd });
                      }} />
                      <Textarea rows={3} placeholder="Answer" value={f.a ?? ""} onChange={(e) => {
                        const upd = [...edit.faqs]; upd[i] = { ...upd[i], a: e.target.value };
                        setEdit({ ...edit, faqs: upd });
                      }} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEdit({ ...edit, faqs: [...(edit.faqs ?? []), { q: "", a: "" }] })}>
                    <Plus className="h-4 w-4 mr-1" /> Add FAQ
                  </Button>
                </TabsContent>

                {/* BUNDLES */}
                <TabsContent value="bundles" className="space-y-3 mt-4">
                  <div className="text-sm text-muted-foreground flex items-start gap-2">
                    <Package className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
                    <span>Pick the mock bundles included in this course. Students who buy this course will be auto-enrolled into every selected bundle (and through that, every mock inside).</span>
                  </div>
                  {bundles.length === 0 ? (
                    <Card className="p-6 text-center text-sm text-muted-foreground">
                      No bundles yet. Create bundles in <span className="font-medium">Mock Bundles</span> first.
                    </Card>
                  ) : (
                    <div className="border rounded-md max-h-96 overflow-y-auto divide-y">
                      {bundles.map((b) => {
                        const checked = editBundleIds.includes(b.id);
                        return (
                          <label key={b.id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 ${checked ? "bg-sky-50/40" : ""}`}>
                            <Checkbox checked={checked} onCheckedChange={() => toggleBundle(b.id)} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{b.name}</div>
                              <div className="text-xs text-muted-foreground">{b.exam_code ?? "Mixed"}</div>
                            </div>
                            {!b.is_published && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground"><strong>{editBundleIds.length}</strong> bundle{editBundleIds.length === 1 ? "" : "s"} selected.</div>
                </TabsContent>

                {/* SEO */}
                <TabsContent value="seo" className="space-y-3 mt-4">
                  <div><Label>SEO title (max 60 chars)</Label><Input maxLength={60} value={edit.seo_title ?? ""} onChange={(e) => setEdit({ ...edit, seo_title: e.target.value })} /></div>
                  <div><Label>SEO description (max 160 chars)</Label><Textarea rows={3} maxLength={160} value={edit.seo_description ?? ""} onChange={(e) => setEdit({ ...edit, seo_description: e.target.value })} /></div>
                </TabsContent>
              </Tabs>
            )}
            <div className="sticky bottom-0 bg-white pt-3 mt-4 border-t">
              <Button className="w-full bg-sky-600 hover:bg-sky-700" onClick={save}>Save course</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-sky-500 mb-3" />
          <p className="text-sm text-muted-foreground">No courses yet. Click "New Course" to add one.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="w-full aspect-video object-cover" />}
              <div className="p-4">
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
                  {(bundleCounts[c.id] ?? 0) > 0 && <Badge variant="outline" className="text-[10px] gap-1"><Package className="h-3 w-3" /> {bundleCounts[c.id]} bundle{bundleCounts[c.id] === 1 ? "" : "s"}</Badge>}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {(c.full_mocks_count ?? 0) + (c.sectional_mocks_count ?? 0) + (c.topic_tests_count ?? 0)} total mocks · {c.full_mocks_count ?? 0} full · {c.sectional_mocks_count ?? 0} sectional · {c.topic_tests_count ?? 0} topic
                </div>
                <div className="mt-2 text-sm text-gray-700 font-semibold">
                  ₹{Math.round(c.price ?? 0).toLocaleString("en-IN")}
                  {c.original_price ? <span className="text-xs text-muted-foreground line-through ml-1 font-normal">₹{Math.round(c.original_price).toLocaleString("en-IN")}</span> : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
