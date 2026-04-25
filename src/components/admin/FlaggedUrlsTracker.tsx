import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, ExternalLink, Trash2, Save, ListFilter, ClipboardList,
  Lock, FileInput, Image as ImageIcon, Code2, Link2, Users, Shield, HelpCircle,
} from "lucide-react";

interface FlaggedUrl {
  id: string;
  url: string;
  category: string;
  status: string;
  notes: string | null;
  flagged_reason: string | null;
  reported_at: string;
  audited_at: string | null;
  resolved_at: string | null;
}

const CATEGORIES: Array<{ value: string; label: string; icon: any; description: string }> = [
  { value: "login_auth", label: "Login / Auth pages", icon: Lock, description: "Sign-in, sign-up, password reset" },
  { value: "user_forms", label: "User forms", icon: FileInput, description: "Contact, inquiry, callback forms" },
  { value: "public_assets", label: "Public assets", icon: ImageIcon, description: "Files in /public, images, downloads" },
  { value: "third_party_scripts", label: "Third-party scripts", icon: Code2, description: "External JS, ads, trackers, widgets" },
  { value: "redirects_iframes", label: "Redirects / iframes", icon: Link2, description: "External redirects, embedded frames" },
  { value: "user_generated_content", label: "User-generated content", icon: Users, description: "Reviews, comments, listings" },
  { value: "admin_pages", label: "Admin pages", icon: Shield, description: "Backend dashboards" },
  { value: "uncategorized", label: "Uncategorized", icon: HelpCircle, description: "Not sorted yet" },
];

const STATUSES: Array<{ value: string; label: string; color: string }> = [
  { value: "pending", label: "Pending", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { value: "auditing", label: "Auditing", color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  { value: "fixed", label: "Fixed", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { value: "false_positive", label: "False positive", color: "bg-purple-500/15 text-purple-700 border-purple-500/30" },
  { value: "resolved", label: "Resolved", color: "bg-emerald-600/20 text-emerald-700 border-emerald-600/40" },
];

const categoryMeta = (v: string) => CATEGORIES.find(c => c.value === v) || CATEGORIES[CATEGORIES.length - 1];
const statusMeta = (v: string) => STATUSES.find(s => s.value === v) || STATUSES[0];

const FlaggedUrlsTracker = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<FlaggedUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState("");
  const [bulkCategory, setBulkCategory] = useState("uncategorized");
  const [bulkReason, setBulkReason] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("safe_browsing_flagged_urls")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setItems((data as FlaggedUrl[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addBulk = async () => {
    const lines = bulkText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast({ title: "No URLs entered", variant: "destructive" });
      return;
    }

    // Validate URLs
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const line of lines) {
      try {
        const u = new URL(line.startsWith("http") ? line : `https://${line}`);
        valid.push(u.toString());
      } catch {
        invalid.push(line);
      }
    }

    if (valid.length === 0) {
      toast({ title: "All URLs invalid", description: invalid.join(", ").slice(0, 200), variant: "destructive" });
      return;
    }

    setAdding(true);
    const rows = valid.map(url => ({
      url,
      category: bulkCategory,
      status: "pending",
      flagged_reason: bulkReason.trim() || null,
    }));

    const { error } = await supabase
      .from("safe_browsing_flagged_urls")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true });

    setAdding(false);

    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: `Added ${valid.length} URL${valid.length === 1 ? "" : "s"}`,
        description: invalid.length > 0 ? `${invalid.length} invalid skipped` : "Duplicates were skipped automatically.",
      });
      setBulkText("");
      setBulkReason("");
      load();
    }
  };

  const updateRow = async (id: string, patch: Partial<FlaggedUrl>) => {
    // Auto-set timestamps based on status transitions
    if (patch.status === "auditing" && !items.find(i => i.id === id)?.audited_at) {
      patch.audited_at = new Date().toISOString();
    }
    if ((patch.status === "fixed" || patch.status === "resolved" || patch.status === "false_positive")) {
      patch.resolved_at = new Date().toISOString();
    }

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

    const { error } = await supabase
      .from("safe_browsing_flagged_urls")
      .update(patch)
      .eq("id", id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const deleteRow = async (id: string) => {
    if (!confirm("Remove this URL from the tracker?")) return;
    const { error } = await supabase.from("safe_browsing_flagged_urls").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: "Removed" });
    }
  };

  const exportCsv = () => {
    const headers = ["url", "category", "status", "flagged_reason", "notes", "reported_at", "resolved_at"];
    const rows = items.map(i => headers.map(h => {
      const v = (i as any)[h] ?? "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `safe-browsing-flagged-urls-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Stats per category and status
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; pending: number; resolved: number }> = {};
    for (const cat of CATEGORIES) map[cat.value] = { total: 0, pending: 0, resolved: 0 };
    for (const i of items) {
      const m = map[i.category] || (map[i.category] = { total: 0, pending: 0, resolved: 0 });
      m.total++;
      if (i.status === "pending" || i.status === "auditing") m.pending++;
      if (i.status === "fixed" || i.status === "resolved" || i.status === "false_positive") m.resolved++;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "pending") return items.filter(i => i.status === "pending" || i.status === "auditing");
    if (filter === "resolved") return items.filter(i => i.status === "fixed" || i.status === "resolved" || i.status === "false_positive");
    return items.filter(i => i.category === filter);
  }, [items, filter]);

  const totalPending = items.filter(i => i.status === "pending" || i.status === "auditing").length;
  const totalResolved = items.filter(i => i.status !== "pending" && i.status !== "auditing").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Flagged URLs Tracker
          </CardTitle>
          <CardDescription>
            Paste URLs from Search Console's Security Issues page. Group them by category so you know exactly what to audit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add form */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <Textarea
              placeholder="Paste flagged URLs here — one per line, or comma-separated&#10;https://mbacompass.in/auth&#10;https://mbacompass.in/contact"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={4}
              maxLength={10000}
              className="font-mono text-xs"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <c.icon className="w-3.5 h-3.5" /> {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Flagged reason (optional)</label>
                <Input
                  placeholder='e.g. "Deceptive pages"'
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Duplicates are skipped automatically.
              </p>
              <Button onClick={addBulk} disabled={adding || !bulkText.trim()} size="sm">
                <Plus className="w-3.5 h-3.5 mr-2" />
                {adding ? "Adding..." : "Add to tracker"}
              </Button>
            </div>
          </div>

          {/* Category overview chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ListFilter className="w-4 h-4" /> By category
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-amber-600 font-medium">{totalPending} pending</span>
                <span className="text-emerald-600 font-medium">{totalResolved} resolved</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const s = categoryStats[cat.value];
                const Icon = cat.icon;
                const isActive = filter === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setFilter(isActive ? "all" : cat.value)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-lg font-bold tabular-nums">{s.total}</span>
                    </div>
                    <div className="text-xs font-medium leading-tight">{cat.label}</div>
                    {s.total > 0 && (
                      <div className="flex gap-2 mt-1.5 text-[10px]">
                        {s.pending > 0 && <span className="text-amber-600">{s.pending} pending</span>}
                        {s.resolved > 0 && <span className="text-emerald-600">{s.resolved} done</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter tabs + export */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Tabs value={filter === "all" || filter === "pending" || filter === "resolved" ? filter : "all"} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({totalPending})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({totalResolved})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={items.length === 0}>
              Export CSV
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {items.length === 0 ? "No URLs yet — paste some above to get started." : "No URLs match this filter."}
                </p>
              </div>
            ) : (
              filtered.map(item => {
                const cat = categoryMeta(item.category);
                const st = statusMeta(item.status);
                const Icon = cat.icon;
                return (
                  <div key={item.id} className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-primary hover:underline break-all flex items-center gap-1"
                          >
                            {item.url}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <Badge variant="outline" className={st.color}>{st.label}</Badge>
                        </div>

                        {item.flagged_reason && (
                          <p className="text-xs text-muted-foreground italic">"{item.flagged_reason}"</p>
                        )}

                        <div className="grid sm:grid-cols-2 gap-2">
                          <Select value={item.category} onValueChange={(v) => updateRow(item.id, { category: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => (
                                <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={item.status} onValueChange={(v) => updateRow(item.id, { status: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <NotesField
                          value={item.notes || ""}
                          onSave={(val) => updateRow(item.id, { notes: val })}
                        />

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Reported {new Date(item.reported_at).toLocaleDateString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteRow(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const NotesField = ({ value, onSave }: { value: string; onSave: (v: string) => void }) => {
  const [local, setLocal] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setLocal(value); }, [value]);
  const dirty = local !== value;

  return (
    <div className="space-y-1">
      <Textarea
        placeholder="Audit notes — what did you find? What needs fixing?"
        value={local}
        onChange={(e) => { setLocal(e.target.value); setEditing(true); }}
        rows={2}
        maxLength={1000}
        className="text-xs resize-none"
      />
      {dirty && (
        <Button size="sm" variant="secondary" className="h-6 text-xs" onClick={() => { onSave(local); setEditing(false); }}>
          <Save className="w-3 h-3 mr-1" /> Save notes
        </Button>
      )}
    </div>
  );
};

export default FlaggedUrlsTracker;
