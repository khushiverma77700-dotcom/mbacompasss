import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Pencil, KeyRound, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

type Credential = {
  id: string;
  key_name: string;
  key_value: string;
  category: string;
  description: string | null;
  is_active: boolean;
  last_used_at: string | null;
  updated_at: string;
};

type AuditEntry = {
  id: string;
  key_name: string;
  action: string;
  actor_email: string | null;
  old_value_masked: string | null;
  new_value_masked: string | null;
  created_at: string;
};

const CATEGORIES = [
  { value: "payments", label: "Payments" },
  { value: "ai", label: "AI" },
  { value: "sms", label: "SMS / OTP" },
  { value: "seo", label: "SEO / Indexing" },
  { value: "scraping", label: "Scraping" },
  { value: "other", label: "Other" },
];

const KEY_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;

export default function AdminApiKeys() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const [c, a] = await Promise.all([
      supabase.from("api_credentials").select("*").order("category").order("key_name"),
      supabase.from("api_credential_audit").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (c.error) toast.error(c.error.message);
    else setCredentials((c.data as Credential[]) || []);
    if (!a.error) setAudit((a.data as AuditEntry[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(row: Credential) {
    const { error } = await supabase
      .from("api_credentials")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success(`${row.key_name} ${!row.is_active ? "enabled" : "disabled"}`); load(); }
  }

  async function remove(row: Credential) {
    if (!confirm(`Delete ${row.key_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("api_credentials").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }

  async function flushCache() {
    const { error } = await supabase.functions.invoke("flush-credentials-cache");
    if (error) toast.error(error.message);
    else toast.success("Cache flushed — new values active now");
  }

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: credentials.filter((c) => c.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <KeyRound className="w-7 h-7 text-primary" />
            API Keys & Secrets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all third-party API keys used by the platform. Changes take effect within 60 seconds — or click <em>Flush Cache</em> for instant rollout.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={flushCache}>
            <RefreshCw className="w-4 h-4 mr-2" /> Flush Cache
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Key
          </Button>
        </div>
      </div>

      <Card className="border-amber-300 bg-amber-50/50">
        <CardContent className="p-4 flex gap-3 text-sm text-amber-900">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Security:</strong> Values are stored encrypted at rest. Only admins can view or edit them. All changes are audit-logged. If a value is left empty, the system automatically falls back to the original Supabase Secret.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys">Keys ({credentials.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Log ({audit.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6 mt-4">
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {!loading && grouped.map((group) => (
            <Card key={group.value}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {group.label}
                  <Badge variant="secondary">{group.items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/30 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-sm font-semibold">{row.key_name}</code>
                        {!row.is_active && <Badge variant="outline">Disabled</Badge>}
                        {!row.key_value && <Badge variant="destructive">Empty (using env fallback)</Badge>}
                      </div>
                      {row.description && (
                        <p className="text-xs text-muted-foreground mt-1">{row.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.last_used_at
                          ? `Last used: ${format(new Date(row.last_used_at), "PP p")}`
                          : "Never used"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={row.is_active} onCheckedChange={() => toggleActive(row)} />
                      <Button size="sm" variant="outline" onClick={() => setEditing(row)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(row)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {audit.map((a) => (
                  <div key={a.id} className="p-3 text-sm grid md:grid-cols-[180px_1fr_auto] gap-2 items-center">
                    <code className="font-mono text-xs">{a.key_name}</code>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{a.action}</Badge>
                      <span className="text-xs text-muted-foreground">by {a.actor_email || "system"}</span>
                      {a.old_value_masked && a.new_value_masked && (
                        <span className="text-xs">
                          <code>{a.old_value_masked}</code> → <code>{a.new_value_masked}</code>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "PP p")}
                    </span>
                  </div>
                ))}
                {audit.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <KeyDialog
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        existing={editing}
        onSaved={load}
      />
    </div>
  );
}

function KeyDialog({
  open, onClose, existing, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  existing: Credential | null;
  onSaved: () => void;
}) {
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setKeyName(existing.key_name);
      setKeyValue(existing.key_value);
      setCategory(existing.category);
      setDescription(existing.description || "");
    } else {
      setKeyName(""); setKeyValue(""); setCategory("other"); setDescription("");
    }
  }, [existing, open]);

  async function save() {
    if (!existing && !KEY_NAME_REGEX.test(keyName)) {
      toast.error("Key name must be UPPER_SNAKE_CASE (e.g. MY_API_KEY)");
      return;
    }
    setSaving(true);
    const payload: any = {
      key_value: keyValue,
      category,
      description: description || null,
      updated_by: (await supabase.auth.getUser()).data.user?.id,
    };
    let error;
    if (existing) {
      ({ error } = await supabase.from("api_credentials").update(payload).eq("id", existing.id));
    } else {
      payload.key_name = keyName;
      ({ error } = await supabase.from("api_credentials").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? "Updated" : "Created");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.key_name}` : "Add new API key"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Key Name</Label>
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value.toUpperCase())}
              placeholder="STRIPE_SECRET_KEY"
              disabled={!!existing}
              className="font-mono"
            />
            {!existing && (
              <p className="text-xs text-muted-foreground">UPPER_SNAKE_CASE only. Must start with a letter.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Value</Label>
            <Textarea
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="Paste the actual key value here…"
              rows={4}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to fall back to the original Supabase Secret.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short label, e.g. Razorpay live secret"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
