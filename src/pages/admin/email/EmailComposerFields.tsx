import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { type EmailDraft, previewPersonalize } from "./emailShared";

interface Props {
  draft: EmailDraft;
  onChange: (d: EmailDraft) => void;
  variables: string[];
  sampleVars: Record<string, string>;
}

export default function EmailComposerFields({ draft, onChange, variables, sampleVars }: Props) {
  const [editorKey, setEditorKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<EmailDraft>) => onChange({ ...draft, ...p });

  const uploadImage = async (file: File) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toast.error("Use PNG, JPG, WebP or GIF");
    if (file.size > 3 * 1024 * 1024) return toast.error("Image must be under 3 MB");
    setUploading(true);
    try {
      const path = `email-images/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      set({ bodyHtml: `${draft.bodyHtml}<p><img src="${data.publicUrl}" alt="" /></p>` });
      setEditorKey((k) => k + 1);
      toast.success("Image added to the email body");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setCta = (i: number, p: Partial<{ label: string; url: string }>) =>
    set({ ctas: draft.ctas.map((c, j) => (j === i ? { ...c, ...p } : c)) });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>From name</Label>
            <Input value={draft.fromName} onChange={(e) => set({ fromName: e.target.value })} placeholder="MBA Compass" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={draft.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Hi {{first_name}}, your CAT plan is ready" />
          </div>
        </div>
        <div>
          <Label>Email heading</Label>
          <Input value={draft.heading} onChange={(e) => set({ heading: e.target.value })} placeholder="Big news for {{college|aspirants}}" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Email body</Label>
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <ImagePlus className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload image"}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
          </div>
          <RichTextEditor key={editorKey} content={draft.bodyHtml} onChange={(html) => set({ bodyHtml: html })} placeholder="Write your message…" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Buttons (up to 2)</Label>
            {draft.ctas.length < 2 && (
              <Button type="button" size="sm" variant="outline" onClick={() => set({ ctas: [...draft.ctas, { label: "", url: "" }] })}>
                <Plus className="mr-1 h-4 w-4" /> Add button
              </Button>
            )}
          </div>
          {draft.ctas.map((c, i) => (
            <div key={i} className="flex gap-2">
              <Input className="w-40" value={c.label} onChange={(e) => setCta(i, { label: e.target.value })} placeholder="Button text" />
              <Input value={c.url} onChange={(e) => setCta(i, { url: e.target.value })} placeholder="https://mbacompass.in/…" />
              <Button type="button" size="icon" variant="ghost" onClick={() => set({ ctas: draft.ctas.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Variables you can use in subject, heading and body:{" "}
          {variables.map((v) => <code key={v} className="mr-1 rounded bg-background px-1">{`{{${v}}}`}</code>)}
          <br />Add a fallback with <code className="rounded bg-background px-1">{"{{name|Aspirant}}"}</code>.
        </div>
      </div>

      <div>
        <Label>Live preview</Label>
        <div className="mt-1 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">From: {draft.fromName || "MBA Compass"}</p>
          <p className="mb-4 text-sm font-semibold">Subject: {previewPersonalize(draft.subject, sampleVars) || "—"}</p>
          {draft.heading && <h2 className="mb-3 text-xl font-semibold">{previewPersonalize(draft.heading, sampleVars)}</h2>}
          <div className="prose prose-sm max-w-none [&_img]:h-auto [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: previewPersonalize(draft.bodyHtml, sampleVars) }} />
          {draft.ctas.some((c) => c.label) && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {draft.ctas.filter((c) => c.label).map((c, i) => (
                <span key={i} className={`rounded-lg px-5 py-2 text-sm font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "border border-primary text-primary"}`}>
                  {previewPersonalize(c.label, sampleVars)}
                </span>
              ))}
            </div>
          )}
          <p className="mt-6 border-t pt-3 text-sm text-muted-foreground">Team MBA Compass · unsubscribe link added automatically</p>
        </div>
      </div>
    </div>
  );
}
