import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/admin/RichTextEditor";
import StateCitySelect from "@/components/admin/StateCitySelect";
import { magicSchemaFor, type MagicField } from "@/lib/magicEditSchema";
import MagicImageUpload from "@/components/magic/MagicImageUpload";
import MagicAiSeoDialog, { type MagicSeoSuggestions } from "@/components/magic/MagicAiSeoDialog";
import { AlertTriangle, ExternalLink, Loader2, Save, Sparkles, X } from "lucide-react";

interface LoadResponse {
  entityType: string;
  label: string;
  titleField: string;
  bodyField: string;
  editableFields: string[];
  seoFields: string[];
  publicUrl: string;
  note: string | null;
  record: Record<string, any>;
}

const MagicEditPage = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [meta, setMeta] = useState<LoadResponse | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotes, setAiNotes] = useState<string[]>([]);

  const schema = useMemo(() => magicSchemaFor(meta?.entityType), [meta?.entityType]);

  const call = async (payload: Record<string, any>) => {
    const { data, error: fnError } = await supabase.functions.invoke("magic-edit", {
      body: { token, ...payload },
    });
    if (fnError) {
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
        setValues({ ...data.record });
      } catch (e: any) {
        setError(e.message || "Could not open this link.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const set = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  const addTag = (key: string) => {
    const val = (tagInputs[key] || "").trim();
    if (!val) return;
    const list: string[] = Array.isArray(values[key]) ? values[key] : [];
    if (!list.includes(val)) set(key, [...list, val]);
    setTagInputs((p) => ({ ...p, [key]: "" }));
  };
  const removeTag = (key: string, val: string) =>
    set(key, (Array.isArray(values[key]) ? values[key] : []).filter((x: string) => x !== val));

  const save = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      meta.editableFields.forEach((f) => {
        if (f in values) payload[f] = values[f];
      });
      const data = await call({ action: "save", values: payload });
      setValues({ ...data.record });
      const n = (data.changedFields || []).length;
      toast({
        title: "Changes published",
        description: n
          ? `${n} field${n > 1 ? "s" : ""} updated on the live page. The site admin has been notified.`
          : "The live page has been updated.",
      });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runAiSeo = async (apply: boolean): Promise<MagicSeoSuggestions> => {
    const data = await call({ action: "ai_seo", apply });
    const s = (data.suggestions || {}) as MagicSeoSuggestions;
    setAiNotes(s.notes || []);
    if (apply && data.record) setValues({ ...data.record });
    return s;
  };

  const uploadImage = async (dataUrl: string, folder: string): Promise<string> => {
    const res = await call({ action: "upload", file: dataUrl, folder });
    if (!res?.url) throw new Error("Upload did not return a URL.");
    return res.url as string;
  };

  const renderField = (f: MagicField) => {
    if (f.type === "statecity") {
      return (
        <div key={f.key} className="md:col-span-2">
          <StateCitySelect
            state={values.state || ""}
            city={values.city || ""}
            onStateChange={(s) => setValues((p) => ({ ...p, state: s, city: "" }))}
            onCityChange={(c) => set("city", c)}
            showLabels
          />
        </div>
      );
    }

    const label = (
      <Label className="text-sm font-semibold text-muted-foreground mb-1.5 block">{f.label}</Label>
    );
    const wrap = (node: React.ReactNode) => (
      <div key={f.key} className={f.half ? "" : "md:col-span-2"}>
        {label}
        {node}
        {f.hint && <p className="text-sm text-muted-foreground mt-1">{f.hint}</p>}
      </div>
    );

    switch (f.type) {
      case "image":
        return (
          <div key={f.key} className={f.half ? "" : "md:col-span-2"}>
            {label}
            <MagicImageUpload
              value={values[f.key] || ""}
              folder={f.folder || "magic"}
              hint={f.hint}
              upload={uploadImage}
              onChange={(url) => set(f.key, url)}
            />
          </div>
        );
      case "richtext":
        return (
          <div key={f.key} className="md:col-span-2">
            {label}
            <RichTextEditor
              content={values[f.key] || ""}
              onChange={(html) => set(f.key, html)}
              placeholder={f.placeholder}
            />
          </div>
        );
      case "number":
        return wrap(
          <Input
            type="number"
            value={values[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
          />,
        );
      case "select":
        return wrap(
          <Select value={values[f.key] || ""} onValueChange={(v) => set(f.key, v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {(f.options || []).map((o) => (
                <SelectItem key={o} value={o}>
                  {f.optionLabels?.[o] || o.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        );
      case "switch":
        return (
          <div key={f.key} className="flex items-center gap-3 pt-6">
            <Switch checked={Boolean(values[f.key])} onCheckedChange={(v) => set(f.key, v)} />
            <Label>{f.label}</Label>
          </div>
        );
      case "tags": {
        const list: string[] = Array.isArray(values[f.key]) ? values[f.key] : [];
        return (
          <div key={f.key} className="md:col-span-2">
            {label}
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add and press Enter"
                value={tagInputs[f.key] || ""}
                onChange={(e) => setTagInputs((p) => ({ ...p, [f.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(f.key); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag(f.key)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((v) => (
                <Badge key={v} variant="secondary" className="gap-1 text-sm">
                  {v}
                  <button onClick={() => removeTag(f.key, v)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
        );
      }
      default: {
        const val = values[f.key] ?? "";
        return wrap(
          <>
            <Input
              value={val}
              placeholder={f.placeholder}
              maxLength={f.maxLength}
              className={f.mono ? "font-mono text-sm" : undefined}
              onChange={(e) => set(f.key, e.target.value)}
            />
            {f.counter && (
              <span className="text-sm text-muted-foreground">{String(val).length}/{f.counter}</span>
            )}
          </>,
        );
      }
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

  if (error || !meta || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Link unavailable</h1>
            <p className="text-sm text-muted-foreground">{error || "Unsupported content type."}</p>
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
            <Button
              variant="outline"
              onClick={() => setAiOpen(true)}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4 mr-2" />
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
        <p className="text-sm text-muted-foreground">
          You are editing the live {meta.label.toLowerCase()} page. Every change you publish is logged and emailed to
          the MBA Compass admin team automatically.
        </p>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-lg">Edit {meta.label}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="border-primary/30 text-primary hover:bg-primary/10">
              <Sparkles className="w-4 h-4 mr-2" />
              Run AI SEO &amp; publish
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={schema.tabs[0].key} className="space-y-4">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${schema.tabs.length}, minmax(0, 1fr))` }}>
                {schema.tabs.map((t) => (
                  <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
                ))}
              </TabsList>

              {schema.tabs.map((t) => (
                <TabsContent key={t.key} value={t.key}>
                  <div className="grid md:grid-cols-2 gap-4">
                    {t.fields
                      .filter((f) => f.type === "statecity" || meta.editableFields.includes(f.key))
                      .map(renderField)}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {aiNotes.length > 0 && (
              <div className="rounded-md border bg-background p-3 space-y-1 mt-4">
                <p className="text-sm font-medium">AI suggestions</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {aiNotes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            <Button onClick={save} disabled={saving} className="w-full mt-4">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Publish changes
            </Button>
          </CardContent>
        </Card>
      </main>

      <MagicAiSeoDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        label={meta.label}
        current={values}
        run={runAiSeo}
        onApplied={(s) => {
          setAiNotes(s.notes || []);
          toast({ title: "AI SEO applied", description: "Meta tags, H1 and keywords are live. The site admin has been notified." });
        }}
      />
    </div>
  );
};

export default MagicEditPage;
