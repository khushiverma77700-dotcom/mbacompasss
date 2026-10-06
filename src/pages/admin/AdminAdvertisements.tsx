import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/admin/FileUpload";
import { AdCreative } from "@/components/ads/AdSlots";
import AdLivePreview from "@/components/ads/AdLivePreview";
import { PAGE_TYPES, PLACEMENTS, type AdCampaign } from "@/lib/ads/engine";
import { AlertTriangle, CalendarPlus, Copy, Download, Eye, Monitor, Pause, Pencil, Play, Plus, Smartphone, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AD_TYPES = [
  { v: "image", l: "Static image banner" }, { v: "gif", l: "GIF" }, { v: "poster", l: "Promotional poster" },
  { v: "html", l: "HTML / responsive creative" }, { v: "text_cta", l: "Text + CTA" }, { v: "image_cta", l: "Image + CTA" },
];

const blank = (): Partial<AdCampaign> => ({
  name: "", ad_type: "image_cta", status: "draft", headline: "", body: "", cta_text: "Learn more",
  desktop_image_url: "", mobile_image_url: "", html_content: "", alt_text: "", destination_url: "",
  start_at: null, end_at: null, priority: 5, weight: 1, page_types: [], include_paths: [], exclude_paths: [],
  keywords: [], devices: "all", placements: ["top", "after_intro", "in_content", "mid", "home_section", "before_faq", "sidebar", "end"], max_per_page: 2, min_paragraph_gap: 4,
  cap_per_day: 3, cap_per_session: 0, is_fallback: false, conversion_path: "",
  impression_budget: 0, daily_impression_budget: 0, pacing: "asap", schedule_days: [], schedule_start_hour: null, schedule_end_hour: null,
  is_exclusive: false, is_house: false, ab_test: "",
});
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SPOTS = [{ k: "all", l: "All spots at once" }, { k: "top", l: "Top of page" }, { k: "in_content", l: "Inside content" }, { k: "before_faq", l: "Before FAQ" }, { k: "home_section", l: "Between homepage sections" }, { k: "sidebar", l: "Sidebar" }, { k: "end", l: "End of content" }, { k: "sticky", l: "Sticky bar" }];
const SAMPLE_PAGES = [{ v: "/", l: "Homepage" }, { v: "/blog", l: "Blog listing" }, { v: "/mba-application", l: "MBA applications" }, { v: "/mba-compass", l: "Courses" }];
type Fill = { placement: string; device: string; requests: number; filled: number };

const effectiveStatus = (a: AdCampaign) => {
  const now = Date.now();
  if (a.status === "active" && a.end_at && Date.parse(a.end_at) < now) return "ended";
  if (a.status === "active" && a.start_at && Date.parse(a.start_at) > now) return "scheduled";
  return a.status;
};
const toLines = (v: string) => v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
const toLocal = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

type Stat = { campaign_id: string; day: string; event_type: string; device: string; placement: string; n: number };

export default function AdminAdvertisements() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<AdCampaign> | null>(null);
  const [preview, setPreview] = useState<AdCampaign | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewCompact, setPreviewCompact] = useState(false);
  const [previewMode, setPreviewMode] = useState<"creative" | "page">("page");
  const [previewPath, setPreviewPath] = useState("/");
  const [previewSpot, setPreviewSpot] = useState("all");

  const { data: ads = [] } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AdCampaign[];
    },
  });
  const { data: stats = [] } = useQuery({
    queryKey: ["admin-ad-stats", days],
    refetchInterval: 30_000,
    queryFn: async () => {
      const from = new Date(Date.now() - days * 86400_000).toISOString();
      const { data, error } = await supabase.rpc("ad_stats" as any, { _from: from, _to: new Date(Date.now() + 86400_000).toISOString() });
      if (error) throw error;
      return (data ?? []) as Stat[];
    },
  });
  const { data: fill = [] } = useQuery({
    queryKey: ["admin-ad-fill", days],
    refetchInterval: 30_000,
    queryFn: async () => {
      const from = new Date(Date.now() - days * 86400_000).toISOString();
      const { data } = await supabase.rpc("ad_fill_stats" as any, { _from: from, _to: new Date(Date.now() + 86400_000).toISOString() });
      return ((data ?? []) as Fill[]).map((r) => ({ ...r, requests: Number(r.requests), filled: Number(r.filled) }));
    },
  });
  const { data: liveCount = 0 } = useQuery({
    queryKey: ["admin-ad-live"],
    refetchInterval: 15_000,
    queryFn: async () => (await supabase.from("ad_events").select("id", { count: "exact", head: true }).eq("event_type", "impression").gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())).count ?? 0,
  });
  const { data: settings } = useQuery({
    queryKey: ["admin-ad-settings"],
    queryFn: async () => (await supabase.from("ad_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  const totals = useMemo(() => {
    const m: Record<string, { imp: number; clk: number; conv: number }> = {};
    for (const s of stats) {
      const t = (m[s.campaign_id] ??= { imp: 0, clk: 0, conv: 0 });
      if (s.event_type === "impression") t.imp += Number(s.n);
      if (s.event_type === "click") t.clk += Number(s.n);
      if (s.event_type === "conversion") t.conv += Number(s.n);
    }
    return m;
  }, [stats]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-ads"] }); qc.invalidateQueries({ queryKey: ["first-party-ads"] }); };

  const save = async () => {
    const e = editing!;
    if (!e.name?.trim() || !e.destination_url?.trim()) return toast({ title: "Name and destination URL are required", variant: "destructive" });
    if (!/^(https?:\/\/|\/)/.test(e.destination_url)) return toast({ title: "Destination must start with https:// or /", variant: "destructive" });
    const { id, ad_code, ...rest } = e as AdCampaign & { created_at?: string };
    delete (rest as any).created_at;
    (rest as any).ab_test = (rest as any).ab_test?.trim() || null;
    const row = { ...rest, updated_at: new Date().toISOString(), conversion_path: rest.conversion_path || null };
    const { error } = id ? await supabase.from("ad_campaigns").update(row as any).eq("id", id) : await supabase.from("ad_campaigns").insert(row as any);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: "Advertisement saved" }); setEditing(null); refresh();
  };

  const setStatus = async (ids: string[], status: string) => {
    const { error } = await supabase.from("ad_campaigns").update({ status }).in("id", ids);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" }); else refresh();
  };
  const remove = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} advertisement(s)? Their analytics will also be removed.`)) return;
    const { error } = await supabase.from("ad_campaigns").delete().in("id", ids);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" }); else { setSelected(new Set()); refresh(); }
  };
  const duplicate = (a: AdCampaign) => { const { id, ad_code, ...rest } = a; setEditing({ ...rest, name: `${a.name} (copy)`, status: "draft" }); };

  const extend = async (a: AdCampaign, extraDays = 7) => {
    const base = a.end_at && Date.parse(a.end_at) > Date.now() ? Date.parse(a.end_at) : Date.now();
    const { error } = await supabase.from("ad_campaigns").update({ end_at: new Date(base + extraDays * 86400_000).toISOString() }).eq("id", a.id);
    if (error) toast({ title: "Could not extend", description: error.message, variant: "destructive" });
    else { toast({ title: `Extended ${extraDays} days` }); refresh(); }
  };

  const endsSoon = (a: AdCampaign) => a.status === "active" && !!a.end_at && Date.parse(a.end_at) > Date.now() && Date.parse(a.end_at) - Date.now() < 3 * 86400_000;

  const alerts = useMemo(() => {
    const out: { id: string; level: "warn" | "info"; text: string }[] = [];
    for (const a of ads) {
      const st = effectiveStatus(a);
      const t = totals[a.id] ?? { imp: 0, clk: 0, conv: 0 };
      if (st === "active" && t.imp === 0) out.push({ id: `${a.id}-zero`, level: "warn", text: `"${a.name}" is live but had no views in the last ${days} day${days > 1 ? "s" : ""} — check its targeting, schedule or placements.` });
      if (st === "active" && t.imp >= 500 && t.clk / t.imp < 0.002) out.push({ id: `${a.id}-ctr`, level: "warn", text: `"${a.name}" has ${t.imp.toLocaleString()} views but only a ${((t.clk / t.imp) * 100).toFixed(2)}% click rate — try a sharper headline or new creative.` });
      if (endsSoon(a)) out.push({ id: `${a.id}-end`, level: "info", text: `"${a.name}" ends within 3 days — extend it if it should keep running.` });
      if (st === "ended") out.push({ id: `${a.id}-ended`, level: "info", text: `"${a.name}" has ended. Extend it to put it back live.` });
    }
    for (const f of fill) {
      if (f.requests >= 100 && f.filled / f.requests < 0.3) out.push({ id: `fill-${f.placement}-${f.device}`, level: "warn", text: `The "${f.placement}" spot on ${f.device} is empty ${Math.round((1 - f.filled / f.requests) * 100)}% of the time — add a campaign or a house ad for it.` });
    }
    for (const a of ads) {
      if ((a.impression_budget ?? 0) > 0) { const t = totals[a.id]?.imp ?? 0; if (t >= a.impression_budget! * 0.9) out.push({ id: `${a.id}-budget`, level: "info", text: `"${a.name}" has used ${Math.min(100, Math.round((t / a.impression_budget!) * 100))}% of its view budget in this period.` }); }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads, totals, days, fill]);

  const saveSettings = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("ad_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast({ title: "Could not save settings", description: error.message, variant: "destructive" });
    else { qc.invalidateQueries({ queryKey: ["admin-ad-settings"] }); qc.invalidateQueries({ queryKey: ["first-party-ads"] }); toast({ title: "Settings saved" }); }
  };

  const filtered = ads.filter((a) => (statusFilter === "all" || effectiveStatus(a) === statusFilter) && (!search || `${a.name} ${a.ad_code}`.toLowerCase().includes(search.toLowerCase())));
  const sum = Object.values(totals).reduce((s, t) => ({ imp: s.imp + t.imp, clk: s.clk + t.clk, conv: s.conv + t.conv }), { imp: 0, clk: 0, conv: 0 });
  const activeCount = ads.filter((a) => effectiveStatus(a) === "active").length;

  const daily = useMemo(() => {
    const m: Record<string, { day: string; impressions: number; clicks: number }> = {};
    for (const s of stats) {
      const d = (m[s.day] ??= { day: s.day, impressions: 0, clicks: 0 });
      if (s.event_type === "impression") d.impressions += Number(s.n);
      if (s.event_type === "click") d.clicks += Number(s.n);
    }
    let ci = 0, cc = 0;
    return Object.values(m).sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({ ...d, cumImpressions: (ci += d.impressions), cumClicks: (cc += d.clicks) }));
  }, [stats]);
  const byGroup = (key: "placement" | "device") => {
    const m: Record<string, { name: string; impressions: number; clicks: number }> = {};
    for (const s of stats) {
      const d = (m[s[key]] ??= { name: s[key], impressions: 0, clicks: 0 });
      if (s.event_type === "impression") d.impressions += Number(s.n);
      if (s.event_type === "click") d.clicks += Number(s.n);
    }
    return Object.values(m);
  };
  const fillBy = (key: "placement" | "device") => {
    const m: Record<string, { name: string; requests: number; filled: number }> = {};
    for (const f of fill) { const d = (m[f[key]] ??= { name: f[key], requests: 0, filled: 0 }); d.requests += f.requests; d.filled += f.filled; }
    return Object.values(m).map((d) => ({ ...d, rate: d.requests ? Math.round((d.filled / d.requests) * 100) : 0 }));
  };
  const fillTotal = fill.reduce((s, f) => ({ r: s.r + f.requests, f: s.f + f.filled }), { r: 0, f: 0 });
  const abTests = useMemo(() => {
    const g: Record<string, AdCampaign[]> = {};
    for (const a of ads) if (a.ab_test?.trim()) (g[a.ab_test.trim()] ??= []).push(a);
    return Object.entries(g).filter(([, v]) => v.length > 1);
  }, [ads]);
  const score = (t?: { imp: number; clk: number; conv: number }) => {
    if (!t || t.imp < 50) return null;
    const ctr = t.clk / t.imp;
    return Math.min(100, Math.round(ctr * 100 * 25 + (t.clk ? (t.conv / t.clk) * 30 : 0)));
  };
  const tip = (a: AdCampaign, t?: { imp: number; clk: number }) => {
    if (!t || t.imp < 50) return "Collecting data";
    const ctr = t.clk / t.imp;
    if (ctr < 0.003) return a.ad_type === "image" ? "Low CTR: try Image + CTA with a clear button" : "Low CTR: test a sharper headline or new creative";
    if (ctr > 0.02) return "Strong performer: consider higher priority";
    return "Performing normally";
  };

  const exportCsv = () => {
    const rows = [["Ad ID", "Name", "Status", "Impressions", "Clicks", "CTR %", "Conversions"]];
    for (const a of ads) { const t = totals[a.id] ?? { imp: 0, clk: 0, conv: 0 }; rows.push([a.ad_code, a.name, effectiveStatus(a), String(t.imp), String(t.clk), t.imp ? ((t.clk / t.imp) * 100).toFixed(2) : "0", String(t.conv)]); }
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ad-report-${days}d.csv`; a.click();
  };

  const e = editing;
  const set = (patch: Partial<AdCampaign>) => setEditing((p) => ({ ...p!, ...patch }));
  const toggleArr = (key: "page_types" | "placements", v: string) => set({ [key]: (e?.[key] ?? []).includes(v) ? (e![key] as string[]).filter((x) => x !== v) : [...((e?.[key] as string[]) ?? []), v] } as any);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Advertisement Manager</h1>
          <p className="text-sm text-muted-foreground">Create a promotion once; the site places it on matching pages automatically.</p>
        </div>
        <Button onClick={() => setEditing(blank())} className="gap-1.5"><Plus className="h-4 w-4" /> New advertisement</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[["Live now (15 min)", liveCount], ["Active ads", activeCount], ["Impressions", sum.imp], ["Clicks", sum.clk], ["CTR", sum.imp ? `${((sum.clk / sum.imp) * 100).toFixed(2)}%` : "0%"], ["Conversions", sum.conv]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border border-border bg-card p-4"><div className="text-sm text-muted-foreground">{l}</div><div className="text-xl font-bold text-foreground">{v as any}</div></div>
        ))}
      </div>

      <Tabs defaultValue="ads">
        <TabsList><TabsTrigger value="ads">Advertisements</TabsTrigger><TabsTrigger value="analytics">Analytics</TabsTrigger><TabsTrigger value="settings">Global settings</TabsTrigger></TabsList>

        <TabsContent value="ads" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search by name or ID" value={search} onChange={(ev) => setSearch(ev.target.value)} className="max-w-xs" />
            <div className="flex flex-wrap gap-1">
              {["all", "active", "scheduled", "paused", "draft", "ended"].map((s) => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize" onClick={() => setStatusFilter(s)}>
                  {s}{s !== "all" && ` (${ads.filter((a) => effectiveStatus(a) === s).length})`}
                </Button>
              ))}
            </div>
            {selected.size > 0 && (<>
              <Button size="sm" variant="outline" onClick={() => setStatus([...selected], "paused")}>Pause selected</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus([...selected], "active")}>Activate selected</Button>
              <Button size="sm" variant="outline" onClick={() => remove([...selected])}>Delete selected</Button>
            </>)}
          </div>
          {filtered.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No advertisements yet. Create your first one.</div>}
          <div className="space-y-2">
            {filtered.map((a) => {
              const t = totals[a.id]; const st = effectiveStatus(a);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <Checkbox checked={selected.has(a.id)} onCheckedChange={(c) => setSelected((s) => { const n = new Set(s); c ? n.add(a.id) : n.delete(a.id); return n; })} />
                  {a.desktop_image_url || a.mobile_image_url ? <img src={a.desktop_image_url || a.mobile_image_url!} alt="" className="h-10 w-20 rounded object-cover" loading="lazy" /> : <div className="h-10 w-20 rounded bg-muted" />}
                  <div className="min-w-[180px] flex-1">
                    <div className="font-semibold text-foreground">{a.name} {a.is_fallback && <Badge variant="outline">Fallback</Badge>}</div>
                    <div className="text-sm text-muted-foreground">{a.ad_code} · Priority {a.priority} · {a.placements.join(", ")}</div>
                  </div>
                  <Badge variant={st === "active" ? "default" : "secondary"} className="capitalize">{st}</Badge>
                  {endsSoon(a) && <Badge variant="outline" className="border-amber-500 text-amber-600">Ends soon</Badge>}
                  <div className="text-sm text-muted-foreground">{t?.imp ?? 0} views · {t?.clk ?? 0} clicks · {t?.imp ? ((t.clk / t.imp) * 100).toFixed(2) : "0"}%</div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Preview" onClick={() => setPreview(a)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Duplicate" onClick={() => duplicate(a)}><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Extend by 7 days" title="Extend by 7 days" onClick={() => extend(a, 7)}><CalendarPlus className="h-4 w-4" /></Button>
                    {a.status === "active" ? <Button size="icon" variant="ghost" aria-label="Pause" onClick={() => setStatus([a.id], "paused")}><Pause className="h-4 w-4" /></Button>
                      : <Button size="icon" variant="ghost" aria-label="Activate" onClick={() => setStatus([a.id], "active")}><Play className="h-4 w-4" /></Button>}
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove([a.id])}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 7, 30, 90].map((d) => <SelectItem key={d} value={String(d)}>Last {d} day{d > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5"><Download className="h-4 w-4" /> Export CSV</Button>
            <span className="text-sm text-muted-foreground">Updates every 30 seconds</span>
          </div>
          {alerts.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-amber-600" /> Needs attention ({alerts.length})</div>
              {alerts.map((al) => (
                <div key={al.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${al.level === "warn" ? "bg-amber-500" : "bg-blue-400"}`} />{al.text}
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4"><div className="mb-2 font-semibold">Day-wise</div>
              <ResponsiveContainer width="100%" height={240}><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Legend /><Bar dataKey="impressions" fill="hsl(var(--primary))" /><Bar dataKey="clicks" fill="hsl(var(--accent-foreground))" /></BarChart></ResponsiveContainer></div>
            <div className="rounded-lg border border-border bg-card p-4"><div className="mb-2 font-semibold">Cumulative</div>
              <ResponsiveContainer width="100%" height={240}><LineChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Legend /><Line dataKey="cumImpressions" name="impressions" stroke="hsl(var(--primary))" /><Line dataKey="cumClicks" name="clicks" stroke="hsl(var(--accent-foreground))" /></LineChart></ResponsiveContainer></div>
            {(["placement", "device"] as const).map((k) => (
              <div key={k} className="rounded-lg border border-border bg-card p-4"><div className="mb-2 font-semibold capitalize">By {k}</div>
                <ResponsiveContainer width="100%" height={220}><BarChart data={byGroup(k)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="impressions" fill="hsl(var(--primary))" /><Bar dataKey="clicks" fill="hsl(var(--accent-foreground))" /></BarChart></ResponsiveContainer></div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-1 font-semibold">Fill rate — how often each spot actually shows an ad</div>
            <p className="mb-3 text-sm text-muted-foreground">Overall {fillTotal.r ? Math.round((fillTotal.f / fillTotal.r) * 100) : 0}% of {fillTotal.r.toLocaleString()} spots were filled.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {(["placement", "device"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <div className="text-sm font-medium capitalize text-foreground">By {k === "placement" ? "spot" : k}</div>
                  {fillBy(k).sort((a, b) => b.requests - a.requests).map((r) => (
                    <div key={r.name} className="flex items-center gap-2 text-sm">
                      <span className="w-28 truncate text-muted-foreground">{r.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${r.rate}%` }} /></div>
                      <span className="w-32 text-right text-muted-foreground">{r.rate}% of {r.requests.toLocaleString()}</span>
                    </div>
                  ))}
                  {!fill.length && <div className="text-sm text-muted-foreground">No data yet — it starts collecting as visitors browse.</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-1 font-semibold">A/B tests</div>
            <p className="mb-3 text-sm text-muted-foreground">Give two or more ads the same test name; each visitor always sees one version.</p>
            {!abTests.length && <div className="text-sm text-muted-foreground">No tests running.</div>}
            {abTests.map(([name, variants]) => {
              const rows = variants.map((v) => { const t = totals[v.id] ?? { imp: 0, clk: 0, conv: 0 }; return { v, t, ctr: t.imp ? t.clk / t.imp : 0 }; });
              const enough = rows.every((r) => r.t.imp >= 300);
              const best = enough ? rows.reduce((a, b) => (b.ctr > a.ctr ? b : a)) : null;
              return (
                <div key={name} className="mb-3 space-y-1 border-b border-border pb-3">
                  <div className="font-medium text-foreground">{name}</div>
                  {rows.map((r) => (
                    <div key={r.v.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                      <span className="text-foreground">{r.v.name} {best?.v.id === r.v.id && <Badge>Leading</Badge>}</span>
                      <span>{r.t.imp} views · {r.t.clk} clicks · {(r.ctr * 100).toFixed(2)}% · {r.t.conv} conversions</span>
                    </div>
                  ))}
                  {!enough && <div className="text-sm text-muted-foreground">Too early to call — each version needs at least 300 views.</div>}
                </div>
              );
            })}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 font-semibold">Performance by advertisement</div>
            <div className="space-y-2">
              {ads.map((a) => { const t = totals[a.id]; const sc = score(t); return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm">
                  <span className="font-medium text-foreground">{a.name} <span className="text-muted-foreground">({a.ad_code})</span></span>
                  <span className="text-muted-foreground">{t?.imp ?? 0} views · {t?.clk ?? 0} clicks · {t?.conv ?? 0} conversions · Score {sc ?? "–"} · {tip(a, t)}</span>
                </div>); })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          {settings && (
            <div className="max-w-xl space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between"><Label>Show advertisements site-wide</Label><Switch checked={settings.enabled} onCheckedChange={(v) => saveSettings({ enabled: v })} /></div>
              <div className="flex items-center justify-between"><Label>Allow pop-up advertisements</Label><Switch checked={settings.allow_popup} onCheckedChange={(v) => saveSettings({ allow_popup: v })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Pop-ups per visit</Label><Input type="number" min={0} max={5} defaultValue={(settings as any).popup_per_session ?? 1} onBlur={(ev) => saveSettings({ popup_per_session: Number(ev.target.value) } as any)} /></div>
                <div><Label>Pop-ups per day</Label><Input type="number" min={0} max={10} defaultValue={(settings as any).popup_per_day ?? 2} onBlur={(ev) => saveSettings({ popup_per_day: Number(ev.target.value) } as any)} /></div>
                <div><Label>Pop-up delay (sec)</Label><Input type="number" min={0} max={120} defaultValue={(settings as any).popup_delay_seconds ?? 8} onBlur={(ev) => saveSettings({ popup_delay_seconds: Number(ev.target.value) } as any)} /></div>
              </div>
              <p className="text-sm text-muted-foreground">Pop-ups have their own strict limit; normal in-page ads rotate freely within each ad's own limits. 0 = no limit.</p>
              <div><Label>Mid-page ads on college, exam and other pages</Label><Input type="number" min={0} max={4} defaultValue={(settings as any).page_section_ads ?? 2} onBlur={(ev) => saveSettings({ page_section_ads: Number(ev.target.value) } as any)} /></div>
              <div><Label>Maximum ads per page (main content, not counting sidebar)</Label><Input type="number" min={1} max={10} defaultValue={settings.max_ads_per_page} onBlur={(ev) => saveSettings({ max_ads_per_page: Number(ev.target.value) || 3 })} /></div>
              <div><Label>Inside-article ads per 1,000 words</Label><Input type="number" step="0.1" min={0.2} max={5} defaultValue={settings.ads_per_1000_words ?? 1.2} onBlur={(ev) => saveSettings({ ads_per_1000_words: Number(ev.target.value) || 1.2 })} /></div>
              <div><Label>Article length limits (one per line: up to words = max ads)</Label>
                <Textarea rows={5} defaultValue={((Array.isArray(settings.length_tiers) ? settings.length_tiers : []) as unknown as { max_words: number; ads: number }[]).map((t: { max_words: number; ads: number }) => `${t.max_words} = ${t.ads}`).join("\n")}
                  onBlur={(ev) => saveSettings({ length_tiers: toLines(ev.target.value).map((l) => l.split("=").map((x) => Number(x.trim()))).filter(([w, n]) => w > 0 && n >= 0).map(([max_words, ads]) => ({ max_words, ads })) })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Sidebar ads stacked</Label><Input type="number" min={0} max={5} defaultValue={settings.sidebar_stack_size ?? 3} onBlur={(ev) => saveSettings({ sidebar_stack_size: Number(ev.target.value) })} /></div>
                <div><Label>Sidebar spacing (8–24px)</Label><Input type="number" min={8} max={24} defaultValue={settings.sidebar_gap_px ?? 16} onBlur={(ev) => saveSettings({ sidebar_gap_px: Math.min(24, Math.max(8, Number(ev.target.value) || 16)) })} /></div>
              </div>
              <div className="flex items-center justify-between"><Label>Sidebar follows while scrolling</Label><Switch checked={settings.sidebar_sticky ?? true} onCheckedChange={(v) => saveSettings({ sidebar_sticky: v })} /></div>
              <div><Label>Ads between homepage sections</Label><Input type="number" min={0} max={4} defaultValue={settings.homepage_section_ads ?? 2} onBlur={(ev) => saveSettings({ homepage_section_ads: Number(ev.target.value) })} /></div>
              <div><Label>Label shown above ads</Label><Input defaultValue={settings.label_text} onBlur={(ev) => saveSettings({ label_text: ev.target.value || "Sponsored" })} /></div>
              <div><Label>Never show ads on these pages (one per line, * = anything)</Label><Textarea rows={6} defaultValue={settings.excluded_paths.join("\n")} onBlur={(ev) => saveSettings({ excluded_paths: toLines(ev.target.value) })} /></div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Preview studio: {preview?.name}</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  <Button size="sm" variant={previewDevice === "desktop" ? "default" : "outline"} onClick={() => setPreviewDevice("desktop")} className="gap-1.5"><Monitor className="h-4 w-4" /> Desktop</Button>
                  <Button size="sm" variant={previewDevice === "mobile" ? "default" : "outline"} onClick={() => setPreviewDevice("mobile")} className="gap-1.5"><Smartphone className="h-4 w-4" /> Mobile</Button>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={previewMode === "page" ? "default" : "outline"} onClick={() => setPreviewMode("page")}>On a real page</Button>
                  <Button size="sm" variant={previewMode === "creative" ? "default" : "outline"} onClick={() => setPreviewMode("creative")}>Creative only</Button>
                </div>
                {previewMode === "creative" ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant={!previewCompact ? "default" : "outline"} onClick={() => setPreviewCompact(false)}>Standard</Button>
                    <Button size="sm" variant={previewCompact ? "default" : "outline"} onClick={() => setPreviewCompact(true)}>Sticky bar</Button>
                  </div>
                ) : (<>
                  <Select value={SAMPLE_PAGES.some((p) => p.v === previewPath) ? previewPath : "custom"} onValueChange={(v) => v !== "custom" && setPreviewPath(v)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{SAMPLE_PAGES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}<SelectItem value="custom">Custom page</SelectItem></SelectContent>
                  </Select>
                  <Input className="w-56" value={previewPath} onChange={(ev) => setPreviewPath(ev.target.value.startsWith("/") ? ev.target.value : `/${ev.target.value}`)} placeholder="/blog/your-article" />
                  <Select value={previewSpot} onValueChange={setPreviewSpot}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>{SPOTS.map((p) => <SelectItem key={p.k} value={p.k}>{p.l}</SelectItem>)}</SelectContent>
                  </Select>
                </>)}
              </div>
              {previewMode === "page" ? (
                <div className={`overflow-hidden rounded-lg border border-border ${previewDevice === "mobile" ? "mx-auto w-[390px]" : "w-full"}`}>
                  <iframe key={`${preview.id}-${previewPath}-${previewSpot}-${previewDevice}`} title="Ad preview on a real page" className="h-[70vh] w-full bg-background"
                    src={`${previewPath}${previewPath.includes("?") ? "&" : "?"}ad_preview=${preview.id}&ad_spot=${previewSpot}`} />
                </div>
              ) : (
              <div className={`rounded-lg border border-dashed border-border bg-muted/30 p-4 ${previewDevice === "mobile" ? "mx-auto max-w-sm" : ""}`}>
                <AdCreative
                  key={`${preview.id}-${previewDevice}-${previewCompact}`}
                  ad={previewDevice === "mobile" ? { ...preview, desktop_image_url: preview.mobile_image_url || preview.desktop_image_url } : preview}
                  placement="preview" label={settings?.label_text || "Sponsored"} preview compact={previewCompact}
                />
              </div>
              )}
              <p className="text-sm text-muted-foreground">Previews never count as views or clicks. Pages show the ad only in spots that exist there (e.g. inside-content spots appear on articles). This is how the creative will look to visitors. The site picks the mobile image automatically on phones.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!e} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          <DialogHeader><DialogTitle>{e?.id ? `Edit ${e.ad_code}` : "New advertisement"}</DialogTitle></DialogHeader>
          {e && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="lg:order-2"><div className="lg:sticky lg:top-0"><AdLivePreview ad={e} label={settings?.label_text || "Sponsored"} /></div></div>
            <div className="space-y-5 lg:order-1">
              <section className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2"><Label>Advertisement name</Label><Input value={e.name ?? ""} onChange={(ev) => set({ name: ev.target.value })} placeholder="CAT 2027 Crash Course" /></div>
                <div><Label>Type</Label><Select value={e.ad_type} onValueChange={(v) => set({ ad_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{AD_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Status</Label><Select value={e.status} onValueChange={(v) => set({ status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["draft", "active", "paused"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="md:col-span-2"><Label>Destination URL</Label><Input value={e.destination_url ?? ""} onChange={(ev) => set({ destination_url: ev.target.value })} placeholder="https://mbacompass.in/mba-compass/... or /mocks" /></div>
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2 font-semibold">Creative</div>
                {e.ad_type === "html" ? (
                  <div className="md:col-span-2"><Label>HTML creative</Label><Textarea rows={6} value={e.html_content ?? ""} onChange={(ev) => set({ html_content: ev.target.value })} /></div>
                ) : (<>
                  <FileUpload bucket="uploads" folder="ads" value={e.desktop_image_url ?? ""} onChange={(u) => set({ desktop_image_url: u })} accept="image/*" label="Desktop creative" sizeHint="728x90, 970x250, 300x250 or 336x280" />
                  <FileUpload bucket="uploads" folder="ads" value={e.mobile_image_url ?? ""} onChange={(u) => set({ mobile_image_url: u })} accept="image/*" label="Mobile creative (optional)" sizeHint="320x100, 320x250 or 300x250" />
                  <div className="md:col-span-2"><Label>Image description (for accessibility)</Label><Input value={e.alt_text ?? ""} onChange={(ev) => set({ alt_text: ev.target.value })} /></div>
                </>)}
                <div><Label>Headline</Label><Input value={e.headline ?? ""} onChange={(ev) => set({ headline: ev.target.value })} /></div>
                <div><Label>Button text</Label><Input value={e.cta_text ?? ""} onChange={(ev) => set({ cta_text: ev.target.value })} /></div>
                <div className="md:col-span-2"><Label>Short description</Label><Textarea rows={2} value={e.body ?? ""} onChange={(ev) => set({ body: ev.target.value })} /></div>
              </section>

              <section className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-4 font-semibold">Schedule and priority</div>
                <div className="md:col-span-2"><Label>Start</Label><Input type="datetime-local" value={toLocal(e.start_at)} onChange={(ev) => set({ start_at: ev.target.value ? new Date(ev.target.value).toISOString() : null })} /></div>
                <div className="md:col-span-2"><Label>End</Label><Input type="datetime-local" value={toLocal(e.end_at)} onChange={(ev) => set({ end_at: ev.target.value ? new Date(ev.target.value).toISOString() : null })} /></div>
                <div><Label>Priority (1–10)</Label><Input type="number" min={1} max={10} value={e.priority} onChange={(ev) => set({ priority: Number(ev.target.value) })} /></div>
                <div><Label>Rotation weight</Label><Input type="number" min={1} max={100} value={e.weight} onChange={(ev) => set({ weight: Number(ev.target.value) })} /></div>
                <div><Label>Max per visitor / day</Label><Input type="number" min={0} value={e.cap_per_day} onChange={(ev) => set({ cap_per_day: Number(ev.target.value) })} /></div>
                <div><Label>Max per visit</Label><Input type="number" min={0} value={e.cap_per_session} onChange={(ev) => set({ cap_per_session: Number(ev.target.value) })} /></div>
                <p className="md:col-span-4 text-sm text-muted-foreground">0 means no limit.</p>
              </section>

              <section className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-4 font-semibold">Campaign controls</div>
                <div><Label>Total view budget</Label><Input type="number" min={0} value={e.impression_budget ?? 0} onChange={(ev) => set({ impression_budget: Number(ev.target.value) })} /></div>
                <div><Label>Daily view budget</Label><Input type="number" min={0} value={e.daily_impression_budget ?? 0} onChange={(ev) => set({ daily_impression_budget: Number(ev.target.value) })} /></div>
                <div className="md:col-span-2"><Label>Delivery speed</Label><Select value={e.pacing ?? "asap"} onValueChange={(v) => set({ pacing: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asap">As fast as possible</SelectItem><SelectItem value="even">Spread evenly (through the day, or across start–end dates)</SelectItem></SelectContent></Select></div>
                <div className="md:col-span-4"><Label>Show on these days (India time; none ticked = every day)</Label>
                  <div className="mt-1 flex flex-wrap gap-3">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1.5 text-sm"><Checkbox checked={(e.schedule_days ?? []).includes(i)} onCheckedChange={() => set({ schedule_days: (e.schedule_days ?? []).includes(i) ? e.schedule_days!.filter((x) => x !== i) : [...(e.schedule_days ?? []), i] })} />{d}</label>)}</div></div>
                <div><Label>From hour (0–23)</Label><Input type="number" min={0} max={23} value={e.schedule_start_hour ?? ""} onChange={(ev) => set({ schedule_start_hour: ev.target.value === "" ? null : Number(ev.target.value) })} placeholder="Any" /></div>
                <div><Label>Until hour (0–24)</Label><Input type="number" min={0} max={24} value={e.schedule_end_hour ?? ""} onChange={(ev) => set({ schedule_end_hour: ev.target.value === "" ? null : Number(ev.target.value) })} placeholder="Any" /></div>
                <div className="md:col-span-2"><Label>A/B test name (optional)</Label><Input value={e.ab_test ?? ""} onChange={(ev) => set({ ab_test: ev.target.value })} placeholder="e.g. CAT crash course headline" /></div>
                <label className="md:col-span-2 flex items-center gap-2 text-sm"><Switch checked={!!e.is_exclusive} onCheckedChange={(v) => set({ is_exclusive: v, is_house: v ? false : e.is_house })} /> Exclusive — only this ad shows on pages it matches</label>
                <label className="md:col-span-2 flex items-center gap-2 text-sm"><Switch checked={!!e.is_house} onCheckedChange={(v) => set({ is_house: v, is_exclusive: v ? false : e.is_exclusive })} /> House ad — fills spots only when no other ad is available</label>
                <p className="md:col-span-4 text-sm text-muted-foreground">Budgets count views; 0 means unlimited. Overnight hours work (e.g. 22 to 6).</p>
              </section>

              <section className="space-y-3">
                <div className="font-semibold">Where it shows</div>
                <div><Label>Page types (leave empty for all)</Label>
                  <div className="mt-1 flex flex-wrap gap-3">{PAGE_TYPES.map((p) => <label key={p} className="flex items-center gap-1.5 text-sm capitalize"><Checkbox checked={e.page_types?.includes(p)} onCheckedChange={() => toggleArr("page_types", p)} />{p}</label>)}</div></div>
                <div><Label>Placements</Label>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">{PLACEMENTS.map((p) => <label key={p.key} className="flex items-center gap-1.5 text-sm"><Checkbox checked={e.placements?.includes(p.key)} onCheckedChange={() => toggleArr("placements", p.key)} />{p.label}</label>)}</div></div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>Only these URLs (one per line, e.g. /blog/*)</Label><Textarea rows={3} value={(e.include_paths ?? []).join("\n")} onChange={(ev) => set({ include_paths: toLines(ev.target.value) })} /></div>
                  <div><Label>Never on these URLs</Label><Textarea rows={3} value={(e.exclude_paths ?? []).join("\n")} onChange={(ev) => set({ exclude_paths: toLines(ev.target.value) })} /></div>
                  <div><Label>Keywords (page must mention one)</Label><Textarea rows={2} value={(e.keywords ?? []).join(", ")} onChange={(ev) => set({ keywords: toLines(ev.target.value) })} placeholder="CAT, percentile, IIM" /></div>
                  <div className="space-y-3">
                    <div><Label>Device</Label><Select value={e.devices} onValueChange={(v) => set({ devices: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Desktop and mobile</SelectItem><SelectItem value="desktop">Desktop only</SelectItem><SelectItem value="mobile">Mobile only</SelectItem></SelectContent></Select></div>
                  </div>
                  <div><Label>Max times on one page</Label><Input type="number" min={1} max={4} value={e.max_per_page} onChange={(ev) => set({ max_per_page: Number(ev.target.value) })} /></div>
                  <div><Label>Min. paragraphs before in-article ads</Label><Input type="number" min={1} value={e.min_paragraph_gap} onChange={(ev) => set({ min_paragraph_gap: Number(ev.target.value) })} /></div>
                  <div><Label>Conversion page (optional, e.g. /thank-you)</Label><Input value={e.conversion_path ?? ""} onChange={(ev) => set({ conversion_path: ev.target.value })} /></div>
                  <label className="flex items-center gap-2 pt-6 text-sm"><Switch checked={!!e.is_fallback} onCheckedChange={(v) => set({ is_fallback: v })} /> Use as default ad when nothing else matches</label>
                </div>
              </section>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save}>Save advertisement</Button>
              </div>
            </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
