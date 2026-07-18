import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, GripVertical, Newspaper, ArrowUp, ArrowDown, Eye } from "lucide-react";
import MBANewsBar from "@/components/MBANewsBar";


type NewsItem = { tag: string; text: string; href: string; start_at?: string | null; end_at?: string | null };

const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (val: string): string | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const scheduleStatus = (it: NewsItem): { label: string; tone: "live" | "pending" | "expired" | "always" } => {
  const now = Date.now();
  const s = it.start_at ? Date.parse(it.start_at) : NaN;
  const e = it.end_at ? Date.parse(it.end_at) : NaN;
  if (isNaN(s) && isNaN(e)) return { label: "Always visible", tone: "always" };
  if (!isNaN(s) && now < s) return { label: `Starts ${new Date(s).toLocaleString()}`, tone: "pending" };
  if (!isNaN(e) && now > e) return { label: `Expired ${new Date(e).toLocaleString()}`, tone: "expired" };
  return { label: !isNaN(e) ? `Live until ${new Date(e).toLocaleString()}` : "Live now", tone: "live" };
};

const KEY = "mba_newsroom_bar";

const DEFAULT_ITEMS: NewsItem[] = [
  { tag: "CAT 2026", text: "IIM Kozhikode releases official CAT 2026 notification & exam calendar", href: "/exam/cat" },
  { tag: "XAT 2026", text: "XLRI opens XAT 2026 registrations — key dates and syllabus changes", href: "/exam/xat" },
  { tag: "IIM-A", text: "IIM Ahmedabad PGP 2026-28 shortlist criteria & Academic Rating weightage", href: "/college/iim-ahmedabad" },
];

const AdminMBANewsroomBar = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
      const v: any = data?.value || {};
      setItems(Array.isArray(v.items) && v.items.length ? v.items : DEFAULT_ITEMS);
      setEnabled(v.enabled !== false);
      setLoading(false);
    })();
  }, []);

  const update = (i: number, field: keyof NewsItem, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    setItems(next);
  };

  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => setItems([...items, { tag: "", text: "", href: "" }]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  const save = async () => {
    setSaving(true);
    const clean = items
      .map((it) => ({
        tag: (it.tag || "").trim(),
        text: (it.text || "").trim(),
        href: (it.href || "").trim(),
        start_at: it.start_at || null,
        end_at: it.end_at || null,
      }))
      .filter((it) => it.text && it.href);

    const value = { enabled, items: clean };

    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", KEY).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", KEY));
    } else {
      ({ error } = await supabase.from("site_settings").insert({ key: KEY, value }));
    }
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "MBA Newsroom bar saved", description: `${clean.length} items live on homepage.` });
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" /> MBA Newsroom Bar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the auto-scrolling news ticker shown on the homepage. Add a short tag, headline text, and target link.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ticker Visibility</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="enabled" className="text-sm">Show on homepage</Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">News Items ({items.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              No items yet. Click <span className="font-medium">Add Item</span> to create your first news entry.
            </div>
          )}
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg border bg-card">
              <div className="col-span-12 md:col-span-1 flex md:flex-col items-center gap-1 text-muted-foreground">
                <GripVertical className="w-4 h-4 hidden md:block" />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="col-span-12 md:col-span-2">
                <Label className="text-[11px] uppercase text-muted-foreground">Tag</Label>
                <Input
                  value={it.tag}
                  onChange={(e) => update(i, "tag", e.target.value)}
                  placeholder="CAT 2026"
                  className="mt-1"
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <Label className="text-[11px] uppercase text-muted-foreground">Headline</Label>
                <Input
                  value={it.text}
                  onChange={(e) => update(i, "text", e.target.value)}
                  placeholder="IIM Kozhikode releases official CAT 2026 notification…"
                  className="mt-1"
                />
              </div>
              <div className="col-span-11 md:col-span-2">
                <Label className="text-[11px] uppercase text-muted-foreground">Link</Label>
                <Input
                  value={it.href}
                  onChange={(e) => update(i, "href", e.target.value)}
                  placeholder="/exam/cat or https://…"
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Internal path (/exam/cat) or full URL (https://…). External links open in a new tab.</p>
              </div>

              <div className="col-span-1 flex justify-end pt-5">
                <Button size="icon" variant="ghost" onClick={() => remove(i)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Live Preview
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Reflects unsaved edits · Hover to pause · {enabled ? "Enabled" : "Hidden on homepage"}
          </span>
        </CardHeader>
        <CardContent>
          {enabled ? (
            <div className="border rounded-lg overflow-hidden">
              <MBANewsBar
                key={`${items.length}-${items.map((i) => i.tag + i.text + i.href).join("|")}`}
                items={items.filter((it) => it.text && it.href)}
                enabled={enabled}
                fetchRemote={false}
              />
              {items.filter((it) => it.text && it.href).length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Add at least one item with headline and link to see the ticker animation.
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground text-center border border-dashed rounded-lg">
              Ticker is disabled and will not appear on the homepage. Toggle "Show on homepage" to preview.
            </div>
          )}

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Static list preview</p>
            <div className="border rounded-lg bg-muted/30 p-3 space-y-1.5 max-h-56 overflow-auto">
              {items.filter((it) => it.text && it.href).length === 0 && (
                <p className="text-xs text-muted-foreground">No valid items yet.</p>
              )}
              {items.filter((it) => it.text && it.href).map((n, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">{n.tag || "TAG"}</span>
                  <span className="truncate">{n.text}</span>
                  <span className="text-[10px] text-muted-foreground truncate ml-auto">{n.href}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>


      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default AdminMBANewsroomBar;
