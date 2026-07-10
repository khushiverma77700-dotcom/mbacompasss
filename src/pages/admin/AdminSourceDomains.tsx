import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, ShieldCheck, Globe } from "lucide-react";

type ContentType = "college" | "institute" | "course" | "article" | "exam" | "global";

interface Row {
  id: string;
  content_type: ContentType;
  domain: string;
  label: string | null;
  notes: string | null;
  is_active: boolean;
}

const TYPE_LABELS: Record<ContentType, string> = {
  global: "Global (all types)",
  college: "Colleges",
  institute: "Institutes",
  course: "Courses",
  article: "Articles",
  exam: "Exams",
};

const AdminSourceDomains = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ContentType>("all");
  const [form, setForm] = useState<{ content_type: ContentType; domain: string; label: string; notes: string }>({
    content_type: "college", domain: "", label: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("official_source_domains")
      .select("*")
      .order("content_type", { ascending: true })
      .order("domain", { ascending: true });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const normalizeDomain = (d: string) => {
    let s = d.trim().toLowerCase();
    if (!s) return "";
    try { s = new URL(s.startsWith("http") ? s : `https://${s}`).hostname; } catch { /* keep as-is */ }
    return s.replace(/^www\./, "").replace(/\/+$/, "");
  };

  const add = async () => {
    const domain = normalizeDomain(form.domain);
    if (!domain) return toast({ title: "Domain required", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("official_source_domains").insert({
      content_type: form.content_type,
      domain,
      label: form.label.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    toast({ title: "Domain added", description: `${domain} added to ${TYPE_LABELS[form.content_type]}.` });
    setForm({ ...form, domain: "", label: "", notes: "" });
    load();
  };

  const toggleActive = async (row: Row) => {
    const { error } = await supabase.from("official_source_domains").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, is_active: !r.is_active } : r));
  };

  const remove = async (row: Row) => {
    if (!confirm(`Remove ${row.domain} from ${TYPE_LABELS[row.content_type]}?`)) return;
    const { error } = await supabase.from("official_source_domains").delete().eq("id", row.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setRows(rs => rs.filter(r => r.id !== row.id));
    toast({ title: "Removed" });
  };

  const filtered = filter === "all" ? rows : rows.filter(r => r.content_type === filter);
  const grouped = filtered.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.content_type] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" /> Official Source Domains
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          The AI refresh crawler is only allowed to pull data and hyperlinks from domains listed here. Use "Global" for
          regulators that apply to everything (NIRF, AICTE, NAAC, UGC). Use content-type-specific rows for narrower sources
          (e.g. exam bodies for exams).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add allowed domain</CardTitle>
          <CardDescription>Enter the bare domain (e.g. <code className="text-xs">nirfindia.org</code>). URLs and <code className="text-xs">www.</code> are stripped automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Content type</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v as ContentType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as ContentType[]).map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Domain</Label>
              <Input placeholder="nirfindia.org" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Label (optional)</Label>
              <Input placeholder="NIRF Rankings" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Notes (optional)</Label>
              <Input placeholder="MoE regulator" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button onClick={add} disabled={saving || !form.domain.trim()} className="w-full gap-2">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Allowlist</CardTitle>
            <CardDescription>{loading ? "Loading…" : `${rows.length} total • ${rows.filter(r => r.is_active).length} active`}</CardDescription>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All content types</SelectItem>
              {(Object.keys(TYPE_LABELS) as ContentType[]).map(t => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-6">
          {filtered.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground text-center py-8">No domains for this filter.</div>
          )}
          {(Object.keys(grouped) as ContentType[]).map(ct => (
            <div key={ct}>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" /> {TYPE_LABELS[ct]}
                <Badge variant="outline" className="ml-1">{grouped[ct].length}</Badge>
              </h3>
              <div className="border rounded-md divide-y">
                {grouped[ct].map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-medium truncate">{r.domain}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.label || "—"}{r.notes ? ` • ${r.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{r.is_active ? "Active" : "Disabled"}</span>
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(r)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSourceDomains;
