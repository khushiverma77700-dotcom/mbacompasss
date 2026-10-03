import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import EmailBlockEditor from "./EmailBlockEditor";
import { layoutColors } from "./emailBlocks";
import { type EmailDraft, previewPersonalize } from "./emailShared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailAiReview from "./EmailAiReview";

interface Props {
  draft: EmailDraft;
  onChange: (d: EmailDraft) => void;
  variables: string[];
  sampleVars: Record<string, string>;
}

export default function EmailComposerFields({ draft, onChange, variables, sampleVars }: Props) {
  const [editorKey, setEditorKey] = useState(0);
  const set = (p: Partial<EmailDraft>) => onChange({ ...draft, ...p });
  const colors = layoutColors(draft.bodyHtml);

  const setCta = (i: number, p: Partial<{ label: string; url: string }>) =>
    set({ ctas: draft.ctas.map((c, j) => (j === i ? { ...c, ...p } : c)) });

  return (
    <Tabs defaultValue="write">
      <TabsList className="mb-4">
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="ai">AI Review</TabsTrigger>
      </TabsList>
      <TabsContent value="ai">
        <EmailAiReview draft={draft} onApply={(d) => { onChange(d); setEditorKey((k) => k + 1); }} />
      </TabsContent>
      <TabsContent value="write">
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
          <Label>Email body — add text, images and dividers, then arrange them</Label>
          <div className="mt-1"><EmailBlockEditor html={draft.bodyHtml} resetKey={editorKey} onChange={(html) => set({ bodyHtml: html })} /></div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Buttons (up to 4)</Label>
            {draft.ctas.length < 4 && (
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
        <div className="mt-1 rounded-xl border p-4" style={{ background: colors.bg }}>
        <div className="rounded-xl border p-6" style={{ background: colors.card }}>
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
    </div>
      </TabsContent>
    </Tabs>
  );
}
