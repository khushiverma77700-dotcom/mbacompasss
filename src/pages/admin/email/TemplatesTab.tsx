import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EmailComposerFields from "./EmailComposerFields";
import { BUILTIN_VARS, type EmailDraft, emptyDraft } from "./emailShared";

const db = supabase as any;

export default function TemplatesTab({ onUse, onChanged }: { onUse: (t: any) => void; onChanged?: () => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<{ id?: string; name: string; draft: EmailDraft } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await db.from("email_templates").select("*").order("updated_at", { ascending: false });
    setTemplates(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const toDraft = (t: any): EmailDraft => ({ fromName: t.from_name || "MBA Compass", subject: t.subject || "", heading: t.heading || "", bodyHtml: t.body_html || "", ctas: t.ctas || [] });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Template name is required");
    setSaving(true);
    const d = editing.draft;
    const row = { name: editing.name.trim(), from_name: d.fromName, subject: d.subject, heading: d.heading, body_html: d.bodyHtml, ctas: d.ctas.filter((c) => c.label && c.url).slice(0, 2), updated_at: new Date().toISOString() };
    const { error } = editing.id ? await db.from("email_templates").update(row).eq("id", editing.id) : await db.from("email_templates").insert(row);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    setEditing(null); load(); onChanged?.();
  };

  const duplicate = async (t: any) => {
    const { id, created_at, updated_at, ...rest } = t;
    await db.from("email_templates").insert({ ...rest, name: `${t.name} (copy)` });
    load(); onChanged?.();
  };
  const remove = async (t: any) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    await db.from("email_templates").delete().eq("id", t.id);
    load(); onChanged?.();
  };

  if (editing) {
    return (
      <Card className="space-y-4 p-6">
        <div className="max-w-sm">
          <Label>Template name</Label>
          <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="CAT mock launch" />
        </div>
        <EmailComposerFields draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} variables={[...BUILTIN_VARS, "college"]} sampleVars={{ name: "Rahul Sharma", first_name: "Rahul", email: "rahul@example.com", college: "IIM Indore" }} />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save template"}</Button>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Saved templates</h3>
        <Button size="sm" onClick={() => setEditing({ name: "", draft: emptyDraft() })}><Plus className="mr-1 h-4 w-4" /> New template</Button>
      </div>
      {!templates.length && <p className="text-sm text-muted-foreground">No templates yet.</p>}
      <div className="divide-y">
        {templates.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.name}</p>
              <p className="truncate text-sm text-muted-foreground">{t.subject}</p>
            </div>
            <Button size="sm" onClick={() => onUse(t)}><Send className="mr-1 h-4 w-4" /> Use</Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing({ id: t.id, name: t.name, draft: toDraft(t) })}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => duplicate(t)}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(t)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
