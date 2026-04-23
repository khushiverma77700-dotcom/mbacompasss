import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Globe, FileText, Tag, Loader2, CheckCircle } from "lucide-react";
import STATIC_PAGES from "@/data/staticPages";
import { AutoFixPanel } from "@/components/admin/AutoFixPanel";

interface PageSEO {
  meta_title: string;
  meta_description: string;
  keywords: string;
}

const AdminStaticPageSEO = () => {
  const [pages, setPages] = useState<Record<string, PageSEO>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .like("key", "static_seo_%");

      const map: Record<string, PageSEO> = {};
      STATIC_PAGES.forEach((p) => {
        const row = data?.find((d: any) => d.key === `static_seo_${p.key}`);
        const val = (row?.value as Record<string, any>) ?? {};
        map[p.key] = {
          meta_title: val.meta_title || "",
          meta_description: val.meta_description || "",
          keywords: val.keywords || "",
        };
      });
      setPages(map);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const updatePage = (key: string, field: keyof PageSEO, value: string) => {
    setPages((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const savePage = async (key: string) => {
    setSaving(key);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: `static_seo_${key}`, value: pages[key] as any }, { onConflict: "key" });

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `SEO settings for ${STATIC_PAGES.find((p) => p.key === key)?.label} updated.` });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Static Page SEO</h1>
        <p className="text-muted-foreground">Manage meta title, description, and keywords for all static pages.</p>
      </div>

      <AutoFixPanel
        actions={["fix_all", "fix_missing_meta", "rewrite_legacy_domains", "rebuild_sitemap"]}
        title="One-click site-wide SEO fix"
        subtitle="Auto-generate missing meta on all DB-backed pages, rewrite legacy domains, and rebuild the sitemap."
      />

      <div className="grid gap-6">
        {STATIC_PAGES.map((page) => {
          const seo = pages[page.key] || { meta_title: "", meta_description: "", keywords: "" };
          const titleLen = seo.meta_title.length;
          const descLen = seo.meta_description.length;

          return (
            <Card key={page.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{page.label}</CardTitle>
                      <CardDescription className="text-xs">{page.path}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {seo.meta_title && seo.meta_description && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" /> Configured
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <FileText className="w-3.5 h-3.5" /> Meta Title
                    </Label>
                    <span className={`text-xs ${titleLen > 60 ? "text-destructive" : titleLen > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {titleLen}/60
                    </span>
                  </div>
                  <Input
                    value={seo.meta_title}
                    onChange={(e) => updatePage(page.key, "meta_title", e.target.value)}
                    placeholder={`Enter meta title for ${page.label}`}
                    maxLength={80}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <FileText className="w-3.5 h-3.5" /> Meta Description
                    </Label>
                    <span className={`text-xs ${descLen > 160 ? "text-destructive" : descLen > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {descLen}/160
                    </span>
                  </div>
                  <Textarea
                    value={seo.meta_description}
                    onChange={(e) => updatePage(page.key, "meta_description", e.target.value)}
                    placeholder={`Enter meta description for ${page.label}`}
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Tag className="w-3.5 h-3.5" /> Keywords
                  </Label>
                  <Input
                    value={seo.keywords}
                    onChange={(e) => updatePage(page.key, "keywords", e.target.value)}
                    placeholder="comma-separated keywords e.g. MBA coaching, IIM preparation"
                  />
                  <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
                </div>

                <Button
                  onClick={() => savePage(page.key)}
                  disabled={saving === page.key}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {saving === page.key ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-3.5 h-3.5 mr-1.5" /> Save {page.label} SEO</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminStaticPageSEO;
