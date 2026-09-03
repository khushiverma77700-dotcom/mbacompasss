import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Save, Rocket, AlertTriangle } from "lucide-react";
import {
  EXAM_BATCHES, EXAM_MODULE_LABELS, EXAM_MODULE_ORDER, hasModuleContent,
  type ExamSections, type ExamSource,
} from "@/lib/examSections";

interface Props {
  examName: string;
  examYear?: number | null;
  officialWebsite?: string | null;
  examCategory?: string | null;
  logoUrl?: string | null;
  sections: ExamSections;
  sources: ExamSource[];
  existingExamId?: string | null;
  sortOrder?: number | null;
  onSectionsChange: (next: ExamSections) => void;
  onPublished: (examId: string, slug: string) => void;
}

const HTML_MODULES = new Set(["overview", "admit_card", "after_exam"]);

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

const ExamSectionsEditor = ({
  examName, examYear, officialWebsite, examCategory, logoUrl,
  sections, sources, existingExamId, sortOrder, onSectionsChange, onPublished,
}: Props) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyBatch, setBusyBatch] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [reviewedBy, setReviewedBy] = useState("MBA Compass Editorial Team");
  const [slug, setSlug] = useState(slugify(examName));

  const presentModules = useMemo(
    () => EXAM_MODULE_ORDER.filter((key) => hasModuleContent(sections[key])),
    [sections],
  );
  const missingModules = useMemo(
    () => EXAM_MODULE_ORDER.filter((key) => !hasModuleContent(sections[key])),
    [sections],
  );

  const rawFor = (key: keyof ExamSections) => {
    if (drafts[key] !== undefined) return drafts[key];
    const value = sections[key];
    if (typeof value === "string") return value;
    return JSON.stringify(value ?? null, null, 2);
  };

  const commit = (key: keyof ExamSections, raw: string) => {
    setDrafts((d) => ({ ...d, [key]: raw }));
    if (HTML_MODULES.has(key as string) || typeof sections[key] === "string") {
      onSectionsChange({ ...sections, [key]: raw });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      onSectionsChange({ ...sections, [key]: parsed });
    } catch {
      /* keep the draft text; the field shows an invalid-JSON hint */
    }
  };

  const isInvalid = (key: keyof ExamSections) => {
    const raw = drafts[key];
    if (raw === undefined) return false;
    if (HTML_MODULES.has(key as string) || typeof sections[key] === "string") return false;
    try { JSON.parse(raw); return false; } catch { return true; }
  };

  const regenerate = async (batchKey: string) => {
    setBusyBatch(batchKey);
    try {
      const { data, error } = await supabase.functions.invoke("ai-exam-writer", {
        body: {
          exam_name: examName,
          exam_year: examYear,
          official_website: officialWebsite,
          exam_category: examCategory,
          batches: [batchKey],
        },
      });
      if (error) throw error;
      const next = { ...sections, ...(data?.sections || {}) };
      onSectionsChange(next);
      setDrafts({});
      toast({ title: "Regenerated", description: `${EXAM_BATCHES.find((b) => b.key === batchKey)?.label} modules refreshed.` });
    } catch (e: any) {
      toast({ title: "Regeneration failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBusyBatch(null);
    }
  };

  const publish = async () => {
    if (!slug) { toast({ title: "Slug required", variant: "destructive" }); return; }
    setPublishing(true);
    try {
      const hero = sections.hero || {};
      const seo = sections.seo || {};
      const payload: Record<string, any> = {
        name: examName,
        slug,
        full_name: hero.full_form || examName,
        description: sections.overview || null,
        conducting_body: hero.conducting_body || null,
        frequency: hero.frequency || null,
        duration: hero.duration || null,
        exam_mode: hero.exam_mode || null,
        exam_level: hero.exam_level || null,
        exam_category: examCategory || hero.exam_category || null,
        exam_status: hero.exam_status || null,
        registration_status: hero.registration_status || null,
        official_website: officialWebsite || hero.official_website || null,
        logo_url: logoUrl || null,
        exam_year: examYear || null,
        eligibility: sections.eligibility?.summary || null,
        exam_date: sections.dates?.find((d) => /exam(ination)?\b/i.test(d.event || ""))?.date || null,
        registration_deadline: sections.dates?.find((d) => /registration end|last date|registration close/i.test(d.event || ""))?.date || null,
        important_dates: sections.dates?.length ? sections.dates : null,
        pattern: sections.pattern || null,
        cutoffs: sections.cutoffs || null,
        faqs: sections.faqs?.length ? sections.faqs : null,
        syllabus: sections.syllabus?.length ? sections.syllabus.map((s) => s.subject || "").filter(Boolean) : null,
        meta_title: seo.meta_title || `${examName}${examYear ? ` ${examYear}` : ""}: Dates, Syllabus, Pattern, Eligibility & Cutoff`,
        meta_description: seo.meta_description || null,
        h1_tag: seo.h1 || `${examName}${examYear ? ` ${examYear}` : ""}`,
        primary_keyword: seo.primary_keyword || null,
        keywords: seo.keywords?.length ? seo.keywords : null,
        reviewed_by: reviewedBy || null,
        ...(sortOrder === null || sortOrder === undefined ? {} : { listing_sort_order: sortOrder }),
        sources: sources?.length ? sources : null,
        sections,
        updated_at: new Date().toISOString(),
        last_seo_refresh: new Date().toISOString(),
      };

      let examId = existingExamId ?? null;
      if (examId) {
        const { error } = await supabase.from("exams").update(payload as any).eq("id", examId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("exams").insert(payload as any).select("id").single();
        if (error) throw error;
        examId = data.id;
      }

      try {
        const { submitToGoogleIndexing } = await import("@/lib/googleIndexing");
        submitToGoogleIndexing("exam", slug, examId ?? undefined).catch(() => {});
      } catch { /* indexing is best-effort */ }

      toast({ title: "Exam page published", description: `/exam/${slug} is live.` });
      onPublished(examId!, slug);
    } catch (e: any) {
      toast({ title: "Publish failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Publish settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="font-mono text-sm" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Reviewed by</Label>
            <Input value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={publish} disabled={publishing} className="w-full gap-2">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {existingExamId ? "Save & publish" : "Publish exam page"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {EXAM_BATCHES.map((batch) => (
          <Button key={batch.key} size="sm" variant="outline" className="gap-2"
            disabled={!!busyBatch} onClick={() => regenerate(batch.key)}>
            {busyBatch === batch.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate {batch.label}
          </Button>
        ))}
      </div>

      {missingModules.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong className="text-foreground">Hidden on the live page ({missingModules.length}):</strong>{" "}
            {missingModules.map((m) => EXAM_MODULE_LABELS[m]).join(", ")}. Nothing unverified is shown — regenerate a group to try filling these.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {presentModules.map((key) => (
          <Card key={key}>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">{EXAM_MODULE_LABELS[key]}</CardTitle>
              <div className="flex items-center gap-2">
                {isInvalid(key) && <Badge variant="destructive" className="text-xs">Invalid JSON</Badge>}
                <Badge variant="secondary" className="text-xs font-mono">{key}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rawFor(key)}
                onChange={(e) => commit(key, e.target.value)}
                className="font-mono text-xs min-h-[140px]"
                spellCheck={false}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {sources?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Official sources ({sources.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline truncate">
                {s.title || s.url}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Button onClick={publish} disabled={publishing} className="w-full gap-2">
        {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {existingExamId ? "Save & publish" : "Publish exam page"}
      </Button>
    </div>
  );
};

export default ExamSectionsEditor;
