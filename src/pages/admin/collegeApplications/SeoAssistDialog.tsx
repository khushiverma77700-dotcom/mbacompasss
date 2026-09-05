import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TrackerRow, TrackerFaq } from "@/lib/applicationTracker";
import { APPLICATION_YEAR } from "@/lib/applicationSeo";
import {
  generateApplicationSeo,
  type ApplicationSeoSuggestion,
} from "@/lib/applicationSeoAi.functions";

const promptRow = (row: TrackerRow) => ({
  name: row.name,
  short_name: row.short_name,
  category: row.category,
  tier: row.tier,
  program: row.program,
  location: row.location,
  application_open_date: row.application_open_date,
  application_deadline: row.application_deadline,
  application_fee: row.application_fee,
  program_fee: row.program_fee,
  accepted_exams: row.accepted_exams,
  eligibility: row.eligibility,
  selection_process: row.selection_process,
  cutoff_note: row.cutoff_note,
  average_package: row.average_package,
  median_package: row.median_package,
  highest_package: row.highest_package,
  short_description: row.short_description,
});

const saveSuggestion = async (id: string, s: ApplicationSeoSuggestion) => {
  const { error } = await supabase
    .from("application_trackers")
    .update({
      seo_title: s.seo_title || null,
      seo_description: s.seo_description || null,
      seo_h1: s.seo_h1 || null,
      seo_intro: s.seo_intro || null,
      seo_keywords: s.seo_keywords,
      seo_faqs: s.seo_faqs as unknown as never,
      seo_image_alt: s.seo_image_alt || null,
    })
    .eq("id", id);
  if (error) throw error;
};

type SingleProps = {
  row: TrackerRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export function SeoAssistDialog({ row, onClose, onSaved }: SingleProps) {
  const runGenerate = useServerFn(generateApplicationSeo);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ApplicationSeoSuggestion | null>(null);

  useEffect(() => {
    if (!row) {
      setDraft(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDraft(null);
    runGenerate({ data: { row: promptRow(row), year: APPLICATION_YEAR } })
      .then((res) => {
        if (!cancelled) setDraft(res.suggestion);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast({
          title: "Could not write the SEO content",
          description: e instanceof Error ? e.message : "Please try again.",
          variant: "destructive",
        });
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  const patch = (next: Partial<ApplicationSeoSuggestion>) =>
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));

  const patchFaq = (index: number, next: Partial<TrackerFaq>) =>
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            seo_faqs: prev.seo_faqs.map((f, i) => (i === index ? { ...f, ...next } : f)),
          }
        : prev,
    );

  const handleSave = async () => {
    if (!row || !draft) return;
    setSaving(true);
    try {
      await saveSuggestion(row.id, draft);
      toast({ title: "SEO content saved", description: row.name });
      onSaved();
      onClose();
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI SEO writer
          </DialogTitle>
          <DialogDescription>
            {row?.name} — written only from the details saved for this record. Review and edit before
            saving.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Writing the title, description, intro, headings, keywords and FAQs…</p>
          </div>
        )}

        {!loading && draft && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Meta title ({draft.seo_title.length}/62)</Label>
              <Input
                value={draft.seo_title}
                onChange={(e) => patch({ seo_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta description ({draft.seo_description.length}/158)</Label>
              <Textarea
                rows={3}
                value={draft.seo_description}
                onChange={(e) => patch({ seo_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>H1 heading</Label>
              <Input value={draft.seo_h1} onChange={(e) => patch({ seo_h1: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Opening summary</Label>
              <Textarea
                rows={7}
                value={draft.seo_intro}
                onChange={(e) => patch({ seo_intro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Image alt text</Label>
              <Input
                value={draft.seo_image_alt}
                onChange={(e) => patch({ seo_image_alt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Keywords (comma separated)</Label>
              <Textarea
                rows={3}
                value={draft.seo_keywords.join(", ")}
                onChange={(e) =>
                  patch({
                    seo_keywords: e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>FAQs ({draft.seo_faqs.length})</Label>
              <div className="space-y-3">
                {draft.seo_faqs.map((faq, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                    <Input
                      value={faq.question}
                      onChange={(e) => patchFaq(i, { question: e.target.value })}
                    />
                    <Textarea
                      rows={3}
                      value={faq.answer}
                      onChange={(e) => patchFaq(i, { answer: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {draft.h2_outline.length > 0 && (
              <div className="space-y-2">
                <Label>Suggested page headings (reference only)</Label>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {draft.h2_outline.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {draft.internal_links.length > 0 && (
              <div className="space-y-2">
                <Label>Suggested internal links (reference only)</Label>
                <div className="flex flex-wrap gap-2">
                  {draft.internal_links.map((l) => (
                    <Badge key={l} variant="secondary">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {draft.slug_suggestion && (
              <p className="text-muted-foreground">
                Suggested address: <span className="font-medium">{draft.slug_suggestion}</span>{" "}
                (change it in the edit form if you want to use it)
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!draft || saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save SEO content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type BulkProps = {
  open: boolean;
  rows: TrackerRow[];
  onClose: () => void;
  onDone: () => void;
};

export function BulkSeoDialog({ open, rows, onClose, onDone }: BulkProps) {
  const runGenerate = useServerFn(generateApplicationSeo);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setDone(0);
      setFailed([]);
      setCurrent(null);
      setFinished(false);
    }
  }, [open]);

  const start = async () => {
    setRunning(true);
    setFinished(false);
    setDone(0);
    setFailed([]);
    for (const row of rows) {
      setCurrent(row.name);
      try {
        const res = await runGenerate({
          data: { row: promptRow(row), year: APPLICATION_YEAR },
        });
        await saveSuggestion(row.id, res.suggestion);
      } catch {
        setFailed((prev) => [...prev, row.name]);
      }
      setDone((prev) => prev + 1);
    }
    setCurrent(null);
    setRunning(false);
    setFinished(true);
    onDone();
  };

  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Bulk AI SEO
          </DialogTitle>
          <DialogDescription>
            Writes and saves the title, description, H1, summary, keywords and FAQs for{" "}
            {rows.length} record{rows.length === 1 ? "" : "s"} that currently have no SEO title.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Progress value={pct} />
          <p className="text-muted-foreground">
            {done} of {rows.length} finished
            {current ? ` — writing ${current}…` : ""}
          </p>
          {failed.length > 0 && (
            <p className="text-destructive">
              Skipped {failed.length}: {failed.slice(0, 5).join(", ")}
              {failed.length > 5 ? "…" : ""}
            </p>
          )}
          {finished && <p className="font-medium">All done. Review each record before publishing.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={running}>
            {finished ? "Close" : "Cancel"}
          </Button>
          {!finished && (
            <Button onClick={start} disabled={running || rows.length === 0}>
              {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
