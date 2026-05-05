import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, RefreshCcw, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { INSTITUTE_SECTIONS, getSection } from "@/lib/instituteSections";
import { validateTitle, validateMetaDescription, validateUrl, scoreContent, validateKeywordPlacement } from "@/lib/seoValidators";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institute: any;
  sections: Record<string, any>;
  /** Persist updated sections + meta back to DB and update parent state. */
  onApply: (next: { sections: Record<string, any>; meta?: any }) => Promise<void> | void;
}

type RowState = { id: string; label: string; status: "skip" | "pending" | "running" | "done" | "error"; before: number; after?: number; message?: string };

const PROSE_KINDS = new Set(["overview", "teaching_methodology", "results", "fees", "study_material", "mock_tests", "admission_process", "eligibility", "scholarships", "demo_classes", "doubt_solving", "mentorship", "infrastructure", "tech_platform", "batch_details"]);

const AISeoInstitutePanel = ({ open, onOpenChange, institute, sections, onApply }: Props) => {
  const { toast } = useToast();
  const [auditing, setAuditing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);

  const primaryKw = institute?.primary_keyword || institute?.meta_title || institute?.name || "";
  const titleR = validateTitle(institute?.meta_title || institute?.name, primaryKw);
  const metaR = validateMetaDescription(institute?.meta_description, primaryKw);
  const urlR = validateUrl(institute?.slug, primaryKw);

  const buildAudit = () => {
    setAuditing(true);
    const next: RowState[] = [];
    for (const def of INSTITUTE_SECTIONS) {
      if (!PROSE_KINDS.has(def.id)) continue;
      const s = getSection(sections, def.id);
      const html = s?.data?.body || "";
      if (!s.enabled && !html) continue;
      const sc = scoreContent(html);
      const kp = validateKeywordPlacement(primaryKw, { html, h1: institute?.name, url: institute?.slug });
      const score = Math.round((sc.score + kp.score) / 2);
      next.push({
        id: def.id, label: def.label,
        status: score < 70 ? "pending" : "skip",
        before: score,
        message: score < 70 ? `Score ${score} – will rewrite` : `Score ${score} – OK`,
      });
    }
    setRows(next);
    setAuditing(false);
  };

  const runRewrite = async () => {
    setRewriting(true);
    const updated: Record<string, any> = { ...sections };
    const nextRows = [...rows];
    for (let i = 0; i < nextRows.length; i++) {
      const r = nextRows[i];
      if (r.status !== "pending") continue;
      nextRows[i] = { ...r, status: "running" };
      setRows([...nextRows]);
      try {
        const cur = updated[r.id]?.data || {};
        const { data, error } = await supabase.functions.invoke("ai-coaching-institute-rewrite-section", {
          body: {
            instituteName: institute.name,
            city: institute.city || "",
            primaryKeyword: primaryKw,
            secondaryKeywords: institute?.keywords || [],
            sectionId: r.id,
            sectionLabel: r.label,
            currentBody: cur.body || "",
          },
        });
        if (error) throw error;
        const newHtml = (data as any)?.html || "";
        if (!newHtml) throw new Error("Empty rewrite");
        updated[r.id] = { enabled: true, data: { ...cur, body: newHtml } };
        const sc = scoreContent(newHtml);
        const kp = validateKeywordPlacement(primaryKw, { html: newHtml, h1: institute?.name, url: institute?.slug });
        const after = Math.round((sc.score + kp.score) / 2);
        nextRows[i] = { ...nextRows[i], status: "done", after, message: `Score ${r.before} → ${after}` };
      } catch (e: any) {
        nextRows[i] = { ...nextRows[i], status: "error", message: e?.message || String(e) };
      }
      setRows([...nextRows]);
    }
    // Refresh FAQ schema via auto-seo-engine if institute exists
    if (institute?.id) {
      try {
        await supabase.functions.invoke("auto-seo-engine", {
          body: { mode: "faq_generate", contentType: "institute", pageId: institute.id },
        });
      } catch (e) { console.warn("FAQ refresh skipped", e); }
    }
    await onApply({ sections: updated });
    setRewriting(false);
    toast({ title: "AI SEO complete", description: "Sections rewritten and saved." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI SEO — Audit & Auto-Rewrite</DialogTitle>
          <DialogDescription>Same engine as the College SEO module. Audits title, meta, URL, content score & keyword placement, then auto-rewrites weak sections.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-xs font-semibold mb-2">Page-level signals</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className={titleR.status === "pass" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>Title {titleR.score}</Badge>
              <Badge variant="outline" className={metaR.status === "pass" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>Meta {metaR.score}</Badge>
              <Badge variant="outline" className={urlR.status === "pass" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>URL {urlR.score}</Badge>
              <Badge variant="outline">Primary KW: {primaryKw || "(none)"}</Badge>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <Button onClick={buildAudit} disabled={auditing}>
                {auditing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-1" />}
                Run audit
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.message}</div>
                  </div>
                  <div>
                    {r.status === "skip" && <Badge variant="outline" className="border-emerald-200 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>}
                    {r.status === "pending" && <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Will rewrite</Badge>}
                    {r.status === "running" && <Badge variant="outline" className="text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Rewriting</Badge>}
                    {r.status === "done" && <Badge className="text-xs">Improved</Badge>}
                    {r.status === "error" && <Badge variant="destructive" className="text-xs">Error</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={rewriting}>Close</Button>
            {rows.length > 0 && (
              <Button onClick={runRewrite} disabled={rewriting || !rows.some((r) => r.status === "pending")}>
                {rewriting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Auto-rewrite weak sections
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AISeoInstitutePanel;
