import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2 } from "lucide-react";

type NavLink = { label: string; path: string };
type Feature = { icon: string; title: string; description: string };
type StatItem = { value: string; label: string };

const AdminSiteSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    const { data } = await supabase.from("site_settings").select("key, value");
    if (data) {
      const map: Record<string, any> = {};
      data.forEach((r: any) => { map[r.key] = r.value; });
      setSettings(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const saveKey = async (key: string) => {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: settings[key], updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${key} settings saved!` });
    }
  };

  const update = (key: string, field: string, value: any) => {
    setSettings({ ...settings, [key]: { ...settings[key], [field]: value } });
  };

  const updateArrayItem = (key: string, field: string, idx: number, prop: string, val: string) => {
    const arr = [...(settings[key]?.[field] || [])];
    arr[idx] = { ...arr[idx], [prop]: val };
    update(key, field, arr);
  };

  const addArrayItem = (key: string, field: string, item: any) => {
    const arr = [...(settings[key]?.[field] || []), item];
    update(key, field, arr);
  };

  const removeArrayItem = (key: string, field: string, idx: number) => {
    const arr = (settings[key]?.[field] || []).filter((_: any, i: number) => i !== idx);
    update(key, field, arr);
  };

  if (loading) return <div className="text-muted-foreground p-8">Loading settings...</div>;

  const header = settings.header || {};
  const footer = settings.footer || {};
  const contact = settings.contact_page || {};
  const about = settings.about_page || {};
  const hero = settings.hero || {};
  const whyChoose = settings.why_choose_us || {};
  const stats = settings.stats || {};
  const faqs = settings.faqs || {};
  const howItWorks = settings.how_it_works || {};

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Site Settings</h1>
      <Tabs defaultValue="header" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="why">Why Choose Us</TabsTrigger>
          <TabsTrigger value="contact">Contact Page</TabsTrigger>
          <TabsTrigger value="about">About Page</TabsTrigger>
        </TabsList>

        {/* HEADER */}
        <TabsContent value="header">
          <Card>
            <CardHeader><CardTitle>Header / Navbar Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Brand Name</Label>
                  <Input value={header.brand_name || ""} onChange={(e) => update("header", "brand_name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Brand Tagline</Label>
                  <Input value={header.brand_tagline || ""} onChange={(e) => update("header", "brand_tagline", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Navigation Links</Label>
                {(header.nav_links || []).map((link: NavLink, idx: number) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input placeholder="Label" value={link.label} onChange={(e) => updateArrayItem("header", "nav_links", idx, "label", e.target.value)} />
                    <Input placeholder="Path" value={link.path} onChange={(e) => updateArrayItem("header", "nav_links", idx, "path", e.target.value)} />
                    <Button variant="ghost" size="sm" onClick={() => removeArrayItem("header", "nav_links", idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addArrayItem("header", "nav_links", { label: "", path: "/" })}><Plus className="w-4 h-4 mr-1" /> Add Link</Button>
              </div>
              <Button onClick={() => saveKey("header")}><Save className="w-4 h-4 mr-2" /> Save Header</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FOOTER */}
        <TabsContent value="footer">
          <Card>
            <CardHeader><CardTitle>Footer Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Brand Description</Label>
                <Textarea value={footer.brand_description || ""} onChange={(e) => update("footer", "brand_description", e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</Label>
                  <Input value={footer.contact_email || ""} onChange={(e) => update("footer", "contact_email", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone</Label>
                  <Input value={footer.contact_phone || ""} onChange={(e) => update("footer", "contact_phone", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Address</Label>
                  <Input value={footer.contact_address || ""} onChange={(e) => update("footer", "contact_address", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Copyright Text</Label>
                <Input value={footer.copyright || ""} onChange={(e) => update("footer", "copyright", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Exam Links</Label>
                {(footer.exam_links || []).map((link: NavLink, idx: number) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input placeholder="Label" value={link.label} onChange={(e) => updateArrayItem("footer", "exam_links", idx, "label", e.target.value)} />
                    <Input placeholder="Path" value={link.path} onChange={(e) => updateArrayItem("footer", "exam_links", idx, "path", e.target.value)} />
                    <Button variant="ghost" size="sm" onClick={() => removeArrayItem("footer", "exam_links", idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addArrayItem("footer", "exam_links", { label: "", path: "/" })}><Plus className="w-4 h-4 mr-1" /> Add Link</Button>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Quick Links</Label>
                {(footer.quick_links || []).map((link: NavLink, idx: number) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input placeholder="Label" value={link.label} onChange={(e) => updateArrayItem("footer", "quick_links", idx, "label", e.target.value)} />
                    <Input placeholder="Path" value={link.path} onChange={(e) => updateArrayItem("footer", "quick_links", idx, "path", e.target.value)} />
                    <Button variant="ghost" size="sm" onClick={() => removeArrayItem("footer", "quick_links", idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addArrayItem("footer", "quick_links", { label: "", path: "/" })}><Plus className="w-4 h-4 mr-1" /> Add Link</Button>
              </div>
              <Button onClick={() => saveKey("footer")}><Save className="w-4 h-4 mr-2" /> Save Footer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HERO */}
        <TabsContent value="hero">
          <Card>
            <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Heading</Label>
                <Input value={hero.heading || ""} onChange={(e) => update("hero", "heading", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Subheading</Label>
                <Textarea value={hero.subheading || ""} onChange={(e) => update("hero", "subheading", e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Popular Searches</Label>
                {(hero.popular_searches || []).map((s: string, idx: number) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input value={s} onChange={(e) => {
                      const arr = [...(hero.popular_searches || [])];
                      arr[idx] = e.target.value;
                      update("hero", "popular_searches", arr);
                    }} />
                    <Button variant="ghost" size="sm" onClick={() => {
                      update("hero", "popular_searches", (hero.popular_searches || []).filter((_: any, i: number) => i !== idx));
                    }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => update("hero", "popular_searches", [...(hero.popular_searches || []), ""])}><Plus className="w-4 h-4 mr-1" /> Add Search</Button>
              </div>
              <Button onClick={() => saveKey("hero")}><Save className="w-4 h-4 mr-2" /> Save Hero</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS */}
        <TabsContent value="stats">
          <Card>
            <CardHeader><CardTitle>Homepage Stats</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(stats.items || []).map((item: StatItem, idx: number) => (
                <div key={idx} className="flex gap-2">
                  <Input placeholder="Value (e.g. 500+)" value={item.value} onChange={(e) => {
                    const arr = [...(stats.items || [])];
                    arr[idx] = { ...arr[idx], value: e.target.value };
                    update("stats", "items", arr);
                  }} />
                  <Input placeholder="Label" value={item.label} onChange={(e) => {
                    const arr = [...(stats.items || [])];
                    arr[idx] = { ...arr[idx], label: e.target.value };
                    update("stats", "items", arr);
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => {
                    update("stats", "items", (stats.items || []).filter((_: any, i: number) => i !== idx));
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("stats", "items", [...(stats.items || []), { value: "", label: "" }])}><Plus className="w-4 h-4 mr-1" /> Add Stat</Button>
              <Button onClick={() => saveKey("stats")}><Save className="w-4 h-4 mr-2" /> Save Stats</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHY CHOOSE US */}
        <TabsContent value="why">
          <Card>
            <CardHeader><CardTitle>Why Choose Us Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Heading</Label>
                  <Input value={whyChoose.heading || ""} onChange={(e) => update("why_choose_us", "heading", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Subheading</Label>
                  <Input value={whyChoose.subheading || ""} onChange={(e) => update("why_choose_us", "subheading", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Features (icon options: Shield, BarChart3, Star, Headphones, Award, Users, BookOpen, Target)</Label>
                {(whyChoose.features || []).map((f: Feature, idx: number) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 mb-2 p-3 border border-border rounded-lg">
                    <Input placeholder="Icon" value={f.icon} onChange={(e) => {
                      const arr = [...(whyChoose.features || [])];
                      arr[idx] = { ...arr[idx], icon: e.target.value };
                      update("why_choose_us", "features", arr);
                    }} />
                    <Input placeholder="Title" value={f.title} onChange={(e) => {
                      const arr = [...(whyChoose.features || [])];
                      arr[idx] = { ...arr[idx], title: e.target.value };
                      update("why_choose_us", "features", arr);
                    }} />
                    <Input placeholder="Description" value={f.description} onChange={(e) => {
                      const arr = [...(whyChoose.features || [])];
                      arr[idx] = { ...arr[idx], description: e.target.value };
                      update("why_choose_us", "features", arr);
                    }} className="col-span-1" />
                    <Button variant="ghost" size="sm" onClick={() => {
                      update("why_choose_us", "features", (whyChoose.features || []).filter((_: any, i: number) => i !== idx));
                    }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addArrayItem("why_choose_us", "features", { icon: "Star", title: "", description: "" })}><Plus className="w-4 h-4 mr-1" /> Add Feature</Button>
              </div>
              <Button onClick={() => saveKey("why_choose_us")}><Save className="w-4 h-4 mr-2" /> Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTACT PAGE */}
        <TabsContent value="contact">
          <Card>
            <CardHeader><CardTitle>Contact Page Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Page Heading</Label>
                  <Input value={contact.heading || ""} onChange={(e) => update("contact_page", "heading", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Subheading</Label>
                  <Input value={contact.subheading || ""} onChange={(e) => update("contact_page", "subheading", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</Label>
                  <Input value={contact.email || ""} onChange={(e) => update("contact_page", "email", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone</Label>
                  <Input value={contact.phone || ""} onChange={(e) => update("contact_page", "phone", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Address</Label>
                  <Input value={contact.address || ""} onChange={(e) => update("contact_page", "address", e.target.value)} />
                </div>
              </div>
              <Button onClick={() => saveKey("contact_page")}><Save className="w-4 h-4 mr-2" /> Save Contact</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABOUT PAGE */}
        <TabsContent value="about">
          <Card>
            <CardHeader><CardTitle>About Page Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Page Heading</Label>
                <Input value={about.heading || ""} onChange={(e) => update("about_page", "heading", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Page Content (HTML)</Label>
                <Textarea value={about.content || ""} onChange={(e) => update("about_page", "content", e.target.value)} rows={10} />
              </div>
              <Button onClick={() => saveKey("about_page")}><Save className="w-4 h-4 mr-2" /> Save About</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSiteSettings;
