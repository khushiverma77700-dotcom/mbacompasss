// Approved WhatsApp templates, pulled from the provider and shown as a simple
// list. Templates can also be added by hand when the provider blocks reading.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { syncWhatsAppTemplatesFn } from "@/lib/whatsappAutomation.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

export type WhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  category: string | null;
  status: string;
  body_text: string | null;
  variable_count: number;
  source: string;
  synced_at: string | null;
};

const WABA_STORAGE_KEY = "whatsapp_business_account_id";

export async function fetchWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("id, name, language, category, status, body_text, variable_count, source, synced_at")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsAppTemplate[];
}

export default function WhatsAppTemplates({
  onUse,
}: {
  onUse?: (template: WhatsAppTemplate) => void;
}) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [wabaId, setWabaId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", language: "en", body: "", variables: "0" });

  const sync = useServerFn(syncWhatsAppTemplatesFn);

  const load = useCallback(async () => {
    try {
      setTemplates(await fetchWhatsAppTemplates());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load templates");
    }
  }, []);

  useEffect(() => {
    void load();
    if (typeof window !== "undefined") {
      setWabaId(window.localStorage.getItem(WABA_STORAGE_KEY) ?? "");
    }
  }, [load]);

  const runSync = async () => {
    setBusy(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(WABA_STORAGE_KEY, wabaId.trim());
      }
      const result = await sync({ data: { businessAccountId: wabaId.trim() || undefined } });
      if (result.error) toast.error(result.error);
      else toast.success(`${result.synced} templates loaded from WhatsApp`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  const addManual = async () => {
    if (!form.name.trim()) {
      toast.error("Enter the template name");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("whatsapp_templates").upsert(
      {
        name: form.name.trim(),
        language: form.language.trim() || "en",
        status: "APPROVED",
        body_text: form.body.trim() || null,
        variable_count: Math.max(parseInt(form.variables, 10) || 0, 0),
        source: "manual",
      },
      { onConflict: "name,language" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Template saved");
    setForm({ name: "", language: "en", body: "", variables: "0" });
    setShowAdd(false);
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  const lastSynced = templates.map((t) => t.synced_at).filter(Boolean).sort().at(-1);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow max-w-xs">
            <Label>WhatsApp Business Account ID (optional)</Label>
            <Input
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="e.g. 102290129340398"
            />
          </div>
          <Button disabled={busy} onClick={() => void runSync()}>
            {busy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync templates
          </Button>
          <Button variant="outline" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="w-4 h-4 mr-2" /> Add manually
          </Button>
          {lastSynced ? (
            <span className="text-sm text-muted-foreground">
              Last synced {new Date(lastSynced).toLocaleString()}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Sync brings in every template on your WhatsApp account. If the provider replies that the
          key is not allowed to read templates, ask them for a key with template permission or for
          your business account ID, and meanwhile add the template here by hand.
        </p>
      </Card>

      {showAdd ? (
        <Card className="p-4 space-y-3 max-w-xl">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Template name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="mock_offer_v1"
              />
            </div>
            <div>
              <Label>Language</Label>
              <Input
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Message text (as approved)</Label>
            <Textarea
              rows={3}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div className="max-w-[160px]">
            <Label>Number of blanks</Label>
            <Input
              type="number"
              min={0}
              value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
            />
          </div>
          <Button disabled={busy} onClick={() => void addManual()}>
            Save template
          </Button>
        </Card>
      ) : null}

      <Card className="p-4 overflow-x-auto">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No templates yet. Hit &quot;Sync templates&quot; to pull them from WhatsApp.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Blanks</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => {
                const approved = t.status.toUpperCase() === "APPROVED";
                return (
                  <TableRow key={t.id} className={approved ? "" : "opacity-60"}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.language}</TableCell>
                    <TableCell>
                      <Badge variant={approved ? "default" : "secondary"}>{t.status}</Badge>
                    </TableCell>
                    <TableCell>{t.variable_count}</TableCell>
                    <TableCell className="max-w-[360px] truncate">{t.body_text ?? "—"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {onUse && approved ? (
                        <Button size="sm" variant="outline" onClick={() => onUse(t)}>
                          Use in campaign
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => void remove(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
