import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, ExternalLink, Loader2, Building2, Globe, Plus, X, Sparkles } from "lucide-react";
import StateCitySelect from "@/components/admin/StateCitySelect";
import FileUpload from "@/components/admin/FileUpload";
import InstituteSectionEditor from "@/components/admin/InstituteSectionEditor";
import AICoachingInstituteDialog from "@/components/admin/AICoachingInstituteDialog";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import { INSTITUTE_SECTIONS, getSection } from "@/lib/instituteSections";
import { slugify } from "@/lib/slugify";

const AdminCoachingInstituteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inst, setInst] = useState<any>(null);
  const [sections, setSections] = useState<any>({});
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [linkedCourseIds, setLinkedCourseIds] = useState<Set<string>>(new Set());
  const [courseSearch, setCourseSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showSeo, setShowSeo] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: row }, { data: courses }, { data: links }] = await Promise.all([
        supabase.from("institutes").select("*").eq("id", id).maybeSingle(),
        supabase.from("courses").select("id, name, fees, duration, mode, category_id").order("name"),
        supabase.from("institute_courses").select("course_id").eq("institute_id", id),
      ]);
      setInst(row);
      setSections(row?.sections || {});
      setAllCourses(courses || []);
      setLinkedCourseIds(new Set((links || []).map((l: any) => l.course_id)));
      setLoading(false);
    })();
  }, [id]);

  const setBasic = (patch: any) => setInst((p: any) => ({ ...p, ...patch }));

  const saveAll = async () => {
    if (!inst?.name?.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = inst.slug?.trim() || slugify(inst.name);
    const { error } = await supabase
      .from("institutes")
      .update({
        name: inst.name.trim(),
        slug,
        institute_type: inst.institute_type,
        city: inst.city || null,
        state: inst.state || null,
        description: inst.description || null,
        logo_url: inst.logo_url || null,
        banner_url: inst.banner_url || null,
        website: inst.website || null,
        phone: inst.phone || null,
        email: inst.email || null,
        whatsapp: inst.whatsapp || null,
        featured: !!inst.featured,
        rating: inst.rating || 0,
        students_count: inst.students_count || 0,
        success_rate: inst.success_rate || 0,
        meta_title: inst.meta_title || null,
        meta_description: inst.meta_description || null,
        sections,
      })
      .eq("id", id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
  };

  const toggleCourse = async (courseId: string) => {
    const next = new Set(linkedCourseIds);
    if (next.has(courseId)) {
      await supabase.from("institute_courses").delete().eq("institute_id", id!).eq("course_id", courseId);
      next.delete(courseId);
    } else {
      const { error } = await supabase.from("institute_courses").insert({ institute_id: id!, course_id: courseId });
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      next.add(courseId);
    }
    setLinkedCourseIds(next);
  };

  const updateSection = (sid: string, next: { enabled: boolean; data: any }) =>
    setSections((s: any) => ({ ...s, [sid]: next }));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!inst) return <div className="py-20 text-center">Institute not found.</div>;

  const filledSections = INSTITUTE_SECTIONS.filter((d) => getSection(sections, d.id).enabled).length;
  const filteredCourses = allCourses.filter((c) => !courseSearch || c.name?.toLowerCase().includes(courseSearch.toLowerCase()));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/admin/coaching-institutes" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to institutes
          </Link>
          <h1 className="text-2xl font-bold mt-1">{inst.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              {inst.institute_type === "city" ? <Building2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {inst.institute_type === "city" ? "City-wise" : "Hybrid"}
            </Badge>
            <span>{filledSections} of {INSTITUTE_SECTIONS.length} sections enabled</span>
            <span>·</span>
            <span>{linkedCourseIds.size} courses linked</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {inst.slug && (
            <a href={`/institute/${inst.slug}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> View live</Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAI(true)}>
            <Sparkles className="w-4 h-4 mr-1" /> Generate via AI
          </Button>
          <AISEOButton
            contentType="institute"
            data={inst}
            recordId={inst.id}
            onApply={(applied) => setInst((p: any) => ({ ...p, ...applied }))}
          />
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="courses">Courses ({linkedCourseIds.size})</TabsTrigger>
          <TabsTrigger value="sections">Sections ({filledSections})</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Basic information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Institute name *</Label>
                  <Input value={inst.name || ""} onChange={(e) => setBasic({ name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Slug</Label>
                  <Input value={inst.slug || ""} onChange={(e) => setBasic({ slug: e.target.value })} placeholder="auto-generated from name" />
                </div>
                <div>
                  <Label>Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[["city", "City-wise", Building2], ["hybrid", "Hybrid", Globe]].map(([v, label, Icon]: any) => (
                      <button key={v} type="button" onClick={() => setBasic({ institute_type: v })}
                        className={`border rounded-md p-2 text-sm flex items-center gap-2 ${inst.institute_type === v ? "border-primary bg-primary/5" : ""}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!inst.featured} onCheckedChange={(v) => setBasic({ featured: v })} />
                    <Label>Featured</Label>
                  </div>
                </div>
                {inst.institute_type === "city" && (
                  <div className="md:col-span-2">
                    <StateCitySelect
                      state={inst.state || ""}
                      city={inst.city || ""}
                      onStateChange={(s) => setBasic({ state: s, city: "" })}
                      onCityChange={(c) => setBasic({ city: c })}
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label>Short description</Label>
                  <Textarea rows={3} value={inst.description || ""} onChange={(e) => setBasic({ description: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={inst.phone || ""} onChange={(e) => setBasic({ phone: e.target.value })} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={inst.whatsapp || ""} onChange={(e) => setBasic({ whatsapp: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={inst.email || ""} onChange={(e) => setBasic({ email: e.target.value })} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={inst.website || ""} onChange={(e) => setBasic({ website: e.target.value })} />
                </div>
                <div>
                  <Label>Logo</Label>
                  <FileUpload bucket="uploads" value={inst.logo_url || ""} onChange={(u) => setBasic({ logo_url: u })} />
                </div>
                <div>
                  <Label>Banner</Label>
                  <FileUpload bucket="uploads" value={inst.banner_url || ""} onChange={(u) => setBasic({ banner_url: u })} />
                </div>
                <div>
                  <Label>Rating (0-5)</Label>
                  <Input type="number" step="0.1" min={0} max={5} value={inst.rating || 0} onChange={(e) => setBasic({ rating: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Students count</Label>
                  <Input type="number" value={inst.students_count || 0} onChange={(e) => setBasic({ students_count: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Success rate (%)</Label>
                  <Input type="number" value={inst.success_rate || 0} onChange={(e) => setBasic({ success_rate: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked courses</CardTitle>
              <p className="text-xs text-muted-foreground">Select courses from your course database. They appear automatically on the institute page.</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 mb-3">
                <Input placeholder="Search courses…" value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} className="max-w-sm" />
                <Link to="/admin/courses" className="text-sm text-primary hover:underline">+ Manage course database</Link>
              </div>
              <div className="grid md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {filteredCourses.map((c) => {
                  const linked = linkedCourseIds.has(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCourse(c.id)}
                      className={`border rounded-md p-3 text-left flex items-center justify-between gap-3 ${linked ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"}`}>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[c.duration, c.mode, c.fees].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {linked ? <Badge>Linked</Badge> : <Plus className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  );
                })}
                {filteredCourses.length === 0 && (
                  <div className="col-span-2 text-sm text-muted-foreground text-center py-6">
                    No courses found. <Link to="/admin/courses" className="text-primary hover:underline">Add courses</Link>.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-3 mt-4">
          <Card className="bg-muted/30">
            <CardContent className="py-3 text-xs text-muted-foreground">
              Each section is hidden from the public page unless toggled on AND has at least one filled field.
              Frontend renders sections in the order shown below.
            </CardContent>
          </Card>
          {INSTITUTE_SECTIONS.map((def) => {
            const s = getSection(sections, def.id);
            return (
              <InstituteSectionEditor
                key={def.id}
                def={def}
                enabled={s.enabled}
                data={s.data}
                onChange={(next) => updateSection(def.id, next)}
              />
            );
          })}
          <div className="sticky bottom-3 flex justify-end">
            <Button onClick={saveAll} disabled={saving} size="lg" className="shadow-lg">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save all changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">SEO metadata</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Meta title (&lt;60 chars)</Label>
                <Input value={inst.meta_title || ""} onChange={(e) => setBasic({ meta_title: e.target.value })} maxLength={70} />
              </div>
              <div>
                <Label>Meta description (&lt;160 chars)</Label>
                <Textarea rows={3} value={inst.meta_description || ""} onChange={(e) => setBasic({ meta_description: e.target.value })} maxLength={180} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AICoachingInstituteDialog
        open={showAI}
        onOpenChange={setShowAI}
        defaults={{
          name: inst.name,
          city: inst.city || "",
          state: inst.state || "",
          website: inst.website || "",
          primaryKeyword: inst.meta_title || inst.name,
          instituteType: inst.institute_type,
        }}
        onGenerated={async ({ basic, sections: gen }) => {
          setInst((p: any) => ({
            ...p,
            description: basic.description || p.description,
            website: basic.website || p.website,
            phone: basic.phone || p.phone,
            email: basic.email || p.email,
            meta_title: basic.meta_title || p.meta_title,
            meta_description: basic.meta_description || p.meta_description,
            rating: basic.rating || p.rating,
            students_count: basic.students_count || p.students_count,
            success_rate: basic.success_rate || p.success_rate,
          }));
          setSections((s: any) => ({ ...s, ...gen }));
          toast({ title: "AI content loaded", description: "Review and click Save changes." });
        }}
      />

    </div>
  );
};

export default AdminCoachingInstituteDetail;
