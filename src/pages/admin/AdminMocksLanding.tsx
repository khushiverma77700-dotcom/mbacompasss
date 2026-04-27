import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id?: string;
  hero_eyebrow: string; hero_headline: string; hero_subheadline: string;
  hero_cta_label: string; hero_image_url: string | null;
  price_current: number; price_original: number;
  price_discount_label: string; offer_urgency: string;
  offer_ends_at: string | null;
  bundle_title: string; bundle_subtitle: string;
  cta_target_test_id: string | null;
  trust_students: string; trust_avg_improvement: string; trust_rating: string;
  benefits: any[]; whats_included: any[]; comparison: any[];
  testimonials: any[]; faqs: any[];
  meta_pixel_id: string | null;
  meta_title: string; meta_description: string;
  why_us_title?: string; why_us_subtitle?: string; why_us_points?: any[];
  auto_testimonials?: any[];
  student_analyses?: any[];
  student_feedback_text?: any[];
  student_feedback_images?: any[];
  expert_feedback?: any[];
  platform_features?: any[];
  ai_report_title?: string; ai_report_subtitle?: string;
}

export default function AdminMocksLanding() {
  const [s, setS] = useState<Settings | null>(null);
  const [tests, setTests] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: t }] = await Promise.all([
        supabase.from("mocks_landing_settings").select("*").maybeSingle(),
        supabase.from("mock_tests").select("id, name").order("created_at", { ascending: false }),
      ]);
      setS(data as any);
      setTests((t ?? []) as any);
    })();
  }, []);

  if (!s) return <div className="p-8">Loading…</div>;

  const upd = (patch: Partial<Settings>) => setS({ ...s, ...patch });
  const updArr = (key: keyof Settings, idx: number, patch: any) => {
    const arr = [...(s[key] as any[])];
    arr[idx] = { ...arr[idx], ...patch };
    upd({ [key]: arr } as any);
  };
  const addArr = (key: keyof Settings, item: any) => upd({ [key]: [...(s[key] as any[]), item] } as any);
  const delArr = (key: keyof Settings, idx: number) =>
    upd({ [key]: (s[key] as any[]).filter((_, i) => i !== idx) } as any);

  const save = async () => {
    setSaving(true);
    const { id, ...payload } = s;
    const { error } = await supabase
      .from("mocks_landing_settings")
      .update(payload)
      .eq("id", id!);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Landing settings saved");
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mocks Landing Page</h1>
          <p className="text-sm text-muted-foreground">Manage hero, pricing, content & Meta Pixel for /mocks</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Offer</TabsTrigger>
          <TabsTrigger value="trust">Trust Signals</TabsTrigger>
          <TabsTrigger value="whyus">Why Us</TabsTrigger>
          <TabsTrigger value="features">Platform Features</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="included">What's Included</TabsTrigger>
          <TabsTrigger value="compare">Comparison</TabsTrigger>
          <TabsTrigger value="auto-test">Auto Marquee</TabsTrigger>
          <TabsTrigger value="analyses">Student Analysis</TabsTrigger>
          <TabsTrigger value="fb-text">Feedback (Text)</TabsTrigger>
          <TabsTrigger value="fb-img">Feedback (Image)</TabsTrigger>
          <TabsTrigger value="experts">Expert Feedback</TabsTrigger>
          <TabsTrigger value="ai-report">AI Report</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials (Legacy)</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="tracking">Tracking & SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-4">
          <Card className="p-5 space-y-4">
            <Field label="Eyebrow" v={s.hero_eyebrow} onChange={(v) => upd({ hero_eyebrow: v })} />
            <Field label="Headline" v={s.hero_headline} onChange={(v) => upd({ hero_headline: v })} multiline />
            <Field label="Subheadline" v={s.hero_subheadline} onChange={(v) => upd({ hero_subheadline: v })} multiline />
            <Field label="CTA Label" v={s.hero_cta_label} onChange={(v) => upd({ hero_cta_label: v })} />
            <Field label="Hero Image URL (optional)" v={s.hero_image_url ?? ""} onChange={(v) => upd({ hero_image_url: v })} />
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Current Price (₹)" v={s.price_current} onChange={(v) => upd({ price_current: v })} />
              <NumField label="Original Price (₹)" v={s.price_original} onChange={(v) => upd({ price_original: v })} />
            </div>
            <Field label="Discount Label" v={s.price_discount_label} onChange={(v) => upd({ price_discount_label: v })} />
            <Field label="Urgency Text" v={s.offer_urgency} onChange={(v) => upd({ offer_urgency: v })} />
            <div>
              <Label>Offer Ends At (countdown timer — optional)</Label>
              <Input
                type="datetime-local"
                value={s.offer_ends_at ? new Date(s.offer_ends_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => upd({ offer_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
            <Field label="Bundle Title" v={s.bundle_title} onChange={(v) => upd({ bundle_title: v })} />
            <Field label="Bundle Subtitle" v={s.bundle_subtitle} onChange={(v) => upd({ bundle_subtitle: v })} />
            <div>
              <Label>Mock Test sold by Buy Now CTA</Label>
              <select
                className="w-full border rounded-md h-10 px-3 mt-1"
                value={s.cta_target_test_id ?? ""}
                onChange={(e) => upd({ cta_target_test_id: e.target.value || null })}
              >
                <option value="">— Auto (latest published) —</option>
                {tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trust" className="mt-4">
          <Card className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Students count" v={s.trust_students} onChange={(v) => upd({ trust_students: v })} />
            <Field label="Avg improvement" v={s.trust_avg_improvement} onChange={(v) => upd({ trust_avg_improvement: v })} />
            <Field label="Rating" v={s.trust_rating} onChange={(v) => upd({ trust_rating: v })} />
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="mt-4">
          <Card className="p-5 space-y-3">
            {s.benefits.map((b, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3"><Field label="Icon" v={b.icon} onChange={(v) => updArr("benefits", i, { icon: v })} /></div>
                <div className="col-span-3"><Field label="Title" v={b.title} onChange={(v) => updArr("benefits", i, { title: v })} /></div>
                <div className="col-span-5"><Field label="Description" v={b.desc} onChange={(v) => updArr("benefits", i, { desc: v })} /></div>
                <Button variant="ghost" size="icon" onClick={() => delArr("benefits", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addArr("benefits", { icon: "Sparkles", title: "", desc: "" })}>
              <Plus className="h-4 w-4 mr-1" /> Add benefit
            </Button>
            <p className="text-xs text-muted-foreground">Icon names: BrainCircuit, Timer, BookOpen, TrendingUp, Users, MessageCircle, Sparkles, ShieldCheck, Star, Clock</p>
          </Card>
        </TabsContent>

        <TabsContent value="included" className="mt-4">
          <Card className="p-5 space-y-3">
            {s.whats_included.map((w, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4"><Field label="Value" v={w.value} onChange={(v) => updArr("whats_included", i, { value: v })} /></div>
                <div className="col-span-7"><Field label="Label" v={w.label} onChange={(v) => updArr("whats_included", i, { label: v })} /></div>
                <Button variant="ghost" size="icon" onClick={() => delArr("whats_included", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addArr("whats_included", { value: "", label: "" })}>
              <Plus className="h-4 w-4 mr-1" /> Add item
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <Card className="p-5 space-y-3">
            {s.comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7"><Field label="Feature" v={row.feature} onChange={(v) => updArr("comparison", i, { feature: v })} /></div>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!row.us} onChange={(e) => updArr("comparison", i, { us: e.target.checked })} /> Us
                </label>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!row.others} onChange={(e) => updArr("comparison", i, { others: e.target.checked })} /> Others
                </label>
                <Button variant="ghost" size="icon" onClick={() => delArr("comparison", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addArr("comparison", { feature: "", us: true, others: false })}>
              <Plus className="h-4 w-4 mr-1" /> Add row
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials" className="mt-4">
          <Card className="p-5 space-y-3">
            {s.testimonials.map((t, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Name" v={t.name} onChange={(v) => updArr("testimonials", i, { name: v })} />
                  <Field label="Score / Result" v={t.score} onChange={(v) => updArr("testimonials", i, { score: v })} />
                </div>
                <Field label="Quote" v={t.quote} onChange={(v) => updArr("testimonials", i, { quote: v })} multiline />
                <Button variant="ghost" size="sm" onClick={() => delArr("testimonials", i)}><Trash2 className="h-4 w-4 mr-1" /> Remove</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addArr("testimonials", { name: "", score: "", quote: "" })}>
              <Plus className="h-4 w-4 mr-1" /> Add testimonial
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="mt-4">
          <Card className="p-5 space-y-3">
            {s.faqs.map((f, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <Field label="Question" v={f.q} onChange={(v) => updArr("faqs", i, { q: v })} />
                <Field label="Answer" v={f.a} onChange={(v) => updArr("faqs", i, { a: v })} multiline />
                <Button variant="ghost" size="sm" onClick={() => delArr("faqs", i)}><Trash2 className="h-4 w-4 mr-1" /> Remove</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addArr("faqs", { q: "", a: "" })}>
              <Plus className="h-4 w-4 mr-1" /> Add FAQ
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="mt-4">
          <Card className="p-5 space-y-4">
            <Field label="Meta (Facebook) Pixel ID" v={s.meta_pixel_id ?? ""} onChange={(v) => upd({ meta_pixel_id: v })} />
            <p className="text-xs text-muted-foreground -mt-2">Tracks PageView, ViewContent, AddToCart, InitiateCheckout & Purchase events.</p>
            <Field label="Meta Title" v={s.meta_title} onChange={(v) => upd({ meta_title: v })} />
            <Field label="Meta Description" v={s.meta_description} onChange={(v) => upd({ meta_description: v })} multiline />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save Changes"}</Button>
      </div>
    </div>
  );
}

function Field({ label, v, onChange, multiline }: { label: string; v: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline
        ? <Textarea value={v} onChange={(e) => onChange(e.target.value)} className="mt-1" rows={3} />
        : <Input value={v} onChange={(e) => onChange(e.target.value)} className="mt-1" />}
    </div>
  );
}
function NumField({ label, v, onChange }: { label: string; v: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={v} onChange={(e) => onChange(Number(e.target.value))} className="mt-1" />
    </div>
  );
}
