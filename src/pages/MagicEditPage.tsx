import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { AlertTriangle, ExternalLink, Loader2, Save, Sparkles } from "lucide-react";

interface LoadResponse {
  entityType: string;
  label: string;
  titleField: string;
  bodyField: string;
  extraFields: string[];
  seoFields: string[];
  publicUrl: string;
  record: Record<string, any>;
}

const prettyLabel = (field: string) =>
  field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const LONG_TEXT_FIELDS = new Set(["admission_process", "eligibility", "excerpt", "intro"]);

const MagicEditPage = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [meta, setMeta] = useState<LoadResponse | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotes, setAiNotes] = useState<string[]>([]);

  const call = async (payload: Record<string, any>) => {
    const { data, error: fnError } = await supabase.functions.invoke("magic-edit", {
      body: { token, ...payload },
    });
    if (fnError) {
      // Edge function returns a JSON error body with a helpful message.
      let msg = fnError.message;
      try {
        const ctx = (fnError as any).context;
        if (ctx?.json) msg = (await ctx.json())?.error || msg;
        else if (ctx?.text) msg = JSON.parse(await ctx.text())?.error || msg;
      } catch { /* keep original */ }
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await call({ action: "load" });
        setMeta(data);
        setValues({ ...data.record, keywords: (data.record.keywords || []).join(", ") });
      } catch (e: any) {
        setError(e.message || "Could not open this link.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const editableFields = useMemo(() => {
    if (!meta) return [] as string[];
    return meta.extraFields.filter((f) => f in (meta.record || {}));
  }, [meta]);

  const set = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      [meta.titleField, meta.bodyField, ...meta.extraFields, ...meta.seoFields].forEach((f) => {
        if (f in values) payload[f] = values[f];
      });
      const data = await call({ action: "save", values: payload });
      setValues({ ...data.record, keywords: (data.record.keywords || []).join(", ") });
      toast({ title: "Changes published", description: "The live page has been updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runAiSeo = async (apply: boolean) => {
    setAiBusy(true);
    try {
      const data = await call({ action: "ai_seo", apply });
      const s = data.suggestions || {};
      setAiNotes(s.notes || []);
      if (apply && data.record) {
        setValues({ ...data.record, keywords: (data.record.keywords || []).join(", ") });
        toast({ title: "AI SEO applied", description: "Meta tags, H1 and keywords are live." });
      } else {
        setValues((prev) => ({
          ...prev,
          meta_title: s.meta_title || prev.meta_title,
          meta_description: s.meta_description || prev.meta_description,
          h1_tag: s.h1_tag || prev.h1_tag,
          primary_keyword: s.primary_keyword || prev.primary_keyword,
          keywords: (s.keywords || []).join(", ") || prev.keywords,
        }));
        toast({ title: "AI SEO suggestions ready", description: "Review the fields, then press Publish." });
      }
    } catch (e: any) {
      toast({ title: "AI SEO failed", description: e.message, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Opening editor…
        </div>
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Link unavailable</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{meta.label}</Badge>
              <h1 className="text-base font-semibold truncate max-w-[420px]">
                {values[meta.titleField] || "Untitled"}
              </h1>
            </div>
            <a
              href={meta.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              {meta.publicUrl} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => runAiSeo(false)} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI SEO
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Publish changes
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Page content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{prettyLabel(meta.titleField)}</Label>
              <Input value={values[meta.titleField] || ""} onChange={(e) => set(meta.titleField, e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{prettyLabel(meta.bodyField)}</Label>
              <RichTextEditor
                content={values[meta.bodyField] || ""}
                onChange={(html) => set(meta.bodyField, html)}
              />
            </div>
          </CardContent>
        </Card>

        {editableFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {editableFields.map((f) => (
                <div key={f} className={`space-y-2 ${LONG_TEXT_FIELDS.has(f) ? "md:col-span-2" : ""}`}>
                  <Label>{prettyLabel(f)}</Label>
                  {LONG_TEXT_FIELDS.has(f) ? (
                    <Textarea rows={4} value={values[f] || ""} onChange={(e) => set(f, e.target.value)} />
                  ) : (
                    <Input value={values[f] ?? ""} onChange={(e) => set(f, e.target.value)} />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              SEO &amp; AI optimisation
              <Button size="sm" variant="outline" onClick={() => runAiSeo(true)} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Run AI SEO &amp; publish
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Keyword</Label>
              <Input value={values.primary_keyword || ""} onChange={(e) => set("primary_keyword", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meta Title <span className="text-muted-foreground">({(values.meta_title || "").length}/60)</span></Label>
              <Input value={values.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meta Description <span className="text-muted-foreground">({(values.meta_description || "").length}/160)</span></Label>
              <Textarea rows={3} value={values.meta_description || ""} onChange={(e) => set("meta_description", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>H1 Tag</Label>
              <Input value={values.h1_tag || ""} onChange={(e) => set("h1_tag", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Keywords (comma separated)</Label>
              <Textarea rows={3} value={values.keywords || ""} onChange={(e) => set("keywords", e.target.value)} />
            </div>
            {aiNotes.length > 0 && (
              <div className="rounded-md border bg-background p-3 space-y-1">
                <p className="text-sm font-medium">AI suggestions</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {aiNotes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MagicEditPage;
