// Saved WhatsApp message library — reusable messages that any campaign can use.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Save, Trash2, Loader2, Send } from "lucide-react";

export type SavedMessage = {
  id: string;
  name: string;
  message_type: "template" | "text";
  template_name: string | null;
  template_language: string;
  template_params: unknown;
  message_body: string | null;
  notes: string | null;
  created_at: string;
};

const paramsToText = (value: unknown): string =>
  Array.isArray(value) ? value.map((v) => String(v)).join(" | ") : "";

const emptyDraft = {
  name: "",
  message_type: "template" as "template" | "text",
  template_name: "",
  template_language: "en",
  template_params: "",
  message_body: "",
  notes: "",
};

type Props = {
  onUse: (message: SavedMessage) => void;
};

export default function WhatsAppMessageLibrary({ onUse }: Props) {
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select(
        "id, name, message_type, template_name, template_language, template_params, message_body, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessages((data ?? []) as SavedMessage[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const startEdit = (message: SavedMessage) => {
    setEditingId(message.id);
    setDraft({
      name: message.name,
      message_type: message.message_type,
      template_name: message.template_name ?? "",
      template_language: message.template_language ?? "en",
      template_params: paramsToText(message.template_params),
      message_body: message.message_body ?? "",
      notes: message.notes ?? "",
    });
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Give the message a name");
      return;
    }
    if (draft.message_type === "template" && !draft.template_name.trim()) {
      toast.error("Enter the approved template name");
      return;
    }
    if (draft.message_type === "text" && !draft.message_body.trim()) {
      toast.error("Enter the message text");
      return;
    }
    setBusy(true);
    const payload = {
      name: draft.name.trim(),
      message_type: draft.message_type,
      template_name: draft.message_type === "template" ? draft.template_name.trim() : null,
      template_language: draft.template_language.trim() || "en",
      template_params: draft.template_params
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean),
      message_body: draft.message_type === "text" ? draft.message_body.trim() : null,
      notes: draft.notes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("whatsapp_messages").update(payload).eq("id", editingId)
      : await supabase.from("whatsapp_messages").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Message updated" : "Message saved");
    startNew();
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("whatsapp_messages").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (editingId === id) startNew();
    toast.success("Message deleted");
    await load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Saved messages</h2>
          <Button size="sm" variant="outline" onClick={startNew}>
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved messages yet. Create one on the right and reuse it across campaigns.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-md border p-3 space-y-2 ${
                  editingId === m.id ? "border-primary/60 bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {m.message_type === "template"
                        ? `Template: ${m.template_name} (${m.template_language})`
                        : m.message_body}
                    </p>
                  </div>
                  <Badge variant="secondary">{m.message_type}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onUse(m)}>
                    <Send className="w-4 h-4 mr-2" />
                    Use in new campaign
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(m)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(m.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">
          {editingId ? "Edit message" : "Create a message"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Message name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="CAT mock offer"
            />
          </div>
          <div>
            <Label>Message type</Label>
            <Select
              value={draft.message_type}
              onValueChange={(v) => setDraft({ ...draft, message_type: v as "template" | "text" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template">Approved template</SelectItem>
                <SelectItem value="text">Plain text (24h window only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {draft.message_type === "template" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Template name</Label>
              <Input
                value={draft.template_name}
                onChange={(e) => setDraft({ ...draft, template_name: e.target.value })}
                placeholder="mock_offer_v1"
              />
            </div>
            <div>
              <Label>Template language</Label>
              <Input
                value={draft.template_language}
                onChange={(e) => setDraft({ ...draft, template_language: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Template values (separate with |)</Label>
              <Input
                value={draft.template_params}
                onChange={(e) => setDraft({ ...draft, template_params: e.target.value })}
                placeholder="CAT 2026 | 20 Nov"
              />
            </div>
          </div>
        ) : (
          <div>
            <Label>Message text</Label>
            <Textarea
              rows={4}
              value={draft.message_body}
              onChange={(e) => setDraft({ ...draft, message_body: e.target.value })}
            />
          </div>
        )}

        <div>
          <Label>Notes (internal)</Label>
          <Input
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Where this message is used"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {editingId ? "Save changes" : "Save message"}
          </Button>
          {editingId ? (
            <Button variant="ghost" onClick={startNew}>
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
