import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Trash2, Users, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ROWS = 20000;

const toVar = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function ContactListsTab({ onChanged }: { onChanged?: () => void }) {
  const [lists, setLists] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [listName, setListName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<{ list: any; contacts: any[] } | null>(null);

  const load = async () => {
    const { data } = await db.from("email_contact_lists").select("*").order("created_at", { ascending: false });
    setLists(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const onFile = async (file: File) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      if (!json.length) return toast.error("The file has no rows");
      if (json.length > MAX_ROWS) toast.warning(`Only the first ${MAX_ROWS} rows will be used`);
      const hs = Object.keys(json[0]);
      const m: Record<string, string> = {};
      for (const h of hs) {
        const v = toVar(h);
        m[h] = /e.?mail/.test(v) ? "email" : v === "name" || v === "full_name" ? "name" : v || "skip";
      }
      setHeaders(hs); setMapping(m); setRows(json.slice(0, MAX_ROWS));
      setListName(file.name.replace(/\.\w+$/, ""));
    } catch {
      toast.error("Could not read this file. Use CSV or Excel.");
    }
  };

  const save = async () => {
    const emailCol = headers.find((h) => mapping[h] === "email");
    if (!emailCol) return toast.error("Map one column to Email");
    if (!listName.trim()) return toast.error("Give the list a name");
    if (!consent) return toast.error("Confirm these contacts agreed to hear from you");
    setSaving(true);
    try {
      const seen = new Set<string>();
      const contacts: any[] = [];
      let invalid = 0;
      for (const r of rows) {
        const email = String(r[emailCol] ?? "").trim().toLowerCase();
        if (!EMAIL_RE.test(email)) { invalid++; continue; }
        if (seen.has(email)) continue;
        seen.add(email);
        const vars: Record<string, string> = {};
        let name: string | null = null;
        for (const h of headers) {
          const k = mapping[h];
          if (!k || k === "skip" || k === "email") continue;
          const val = String(r[h] ?? "").trim();
          if (k === "name") name = val || null;
          vars[k] = val;
        }
        contacts.push({ email, name, vars });
      }
      if (!contacts.length) throw new Error("No valid email addresses found");
      const variables = [...new Set(Object.values(mapping).filter((k) => k && k !== "skip" && k !== "email"))];
      const { data: list, error } = await db.from("email_contact_lists").insert({ name: listName.trim(), variables, contact_count: contacts.length, consent_confirmed: true }).select().single();
      if (error) throw error;
      for (let i = 0; i < contacts.length; i += 500) {
        const { error: e2 } = await db.from("email_contacts").insert(contacts.slice(i, i + 500).map((c) => ({ ...c, list_id: list.id })));
        if (e2) throw e2;
      }
      toast.success(`Saved ${contacts.length} contacts${invalid ? ` (${invalid} invalid skipped)` : ""}`);
      setRows([]); setHeaders([]); setConsent(false);
      load(); onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const rename = async (l: any) => {
    const name = window.prompt("New list name", l.name);
    if (!name?.trim()) return;
    await db.from("email_contact_lists").update({ name: name.trim() }).eq("id", l.id);
    load(); onChanged?.();
  };
  const remove = async (l: any) => {
    if (!window.confirm(`Delete "${l.name}" and its ${l.contact_count} contacts?`)) return;
    await db.from("email_contact_lists").delete().eq("id", l.id);
    load(); onChanged?.();
  };
  const view = async (l: any) => {
    const { data } = await db.from("email_contacts").select("email,name,vars").eq("list_id", l.id).limit(200);
    setViewing({ list: l, contacts: data ?? [] });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-1 text-base font-semibold">Upload a contact list</h3>
        <p className="mb-4 text-sm text-muted-foreground">CSV or Excel. One column must contain email addresses; other columns become variables like {"{{college}}"}.</p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/40">
          <Upload className="h-4 w-4" /> Choose CSV / XLSX file
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>

        {headers.length > 0 && (
          <div className="mt-5 space-y-4">
            <p className="text-sm">{rows.length} rows found. Match each column:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-2 rounded-md border p-2">
                  <span className="w-1/2 truncate text-sm" title={h}>{h}</span>
                  <Select value={["email", "name", "skip"].includes(mapping[h]) ? mapping[h] : "custom"} onValueChange={(v) => setMapping({ ...mapping, [h]: v === "custom" ? toVar(h) || "field" : v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="custom">Variable {`{{${toVar(h) || "field"}}}`}</SelectItem>
                      <SelectItem value="skip">Skip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="max-w-sm">
              <Label>List name</Label>
              <Input value={listName} onChange={(e) => setListName(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
              These contacts agreed to hear from MBA Compass. Unsubscribed or bounced addresses are skipped automatically.
            </label>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save list"}</Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-base font-semibold">Saved lists</h3>
        {!lists.length && <p className="text-sm text-muted-foreground">No lists yet.</p>}
        <div className="divide-y">
          {lists.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 py-3">
              <Users className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.name}</p>
                <p className="text-sm text-muted-foreground">{l.contact_count} contacts · variables: {(l.variables ?? []).join(", ") || "—"}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => view(l)}>View</Button>
              <Button size="icon" variant="ghost" onClick={() => rename(l)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(l)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        {viewing && (
          <div className="mt-4 rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{viewing.list.name} (first 200)</p>
              <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
            <div className="max-h-80 overflow-auto text-sm">
              {viewing.contacts.map((c) => (
                <div key={c.email} className="flex gap-3 border-b py-1">
                  <span className="w-1/3 truncate">{c.email}</span>
                  <span className="w-1/4 truncate">{c.name || "—"}</span>
                  <span className="flex-1 truncate text-muted-foreground">{Object.entries(c.vars || {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
