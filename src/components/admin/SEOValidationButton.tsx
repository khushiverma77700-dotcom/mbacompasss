// SEO validation button — opens a sheet showing validation errors/warnings
// for the current record before publish. Reuses src/lib/seoValidator.ts so
// the same rules run client-side and inside the validate-seo edge function.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { buildValidationInput, validateSEO, type SEOInputPayload, type ValidationResult } from "@/lib/seoValidator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  contentType: SEOInputPayload["contentType"];
  data: Record<string, any>;
  recordId?: string;
  url?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}

export const SEOValidationButton = ({ contentType, data, recordId, url, variant = "outline", size = "sm", className }: Props) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [persisting, setPersisting] = useState(false);
  const { toast } = useToast();

  const run = () => {
    const input = buildValidationInput(contentType, data);
    const r = validateSEO(input);
    setResult(r);
    setOpen(true);
  };

  const persist = async () => {
    if (!result || !recordId) return;
    setPersisting(true);
    try {
      const { error } = await supabase.from("seo_validation_reports").insert({
        content_type: contentType,
        record_id: recordId,
        url: url || null,
        passed: result.ok,
        errors: result.errors as any,
        warnings: result.warnings as any,
        error_count: result.errorCount,
        warning_count: result.warningCount,
      });
      if (error) throw error;
      toast({ title: "Saved", description: "Validation report saved to admin dashboard." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || "Could not save report", variant: "destructive" });
    } finally {
      setPersisting(false);
    }
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={run} className={className}>
        <ShieldCheck className="h-4 w-4 mr-1.5" />
        Validate SEO
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              SEO Validation Report
              {result?.ok ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Passed</Badge>
              ) : result ? (
                <Badge variant="destructive">{result.errorCount} error{result.errorCount === 1 ? "" : "s"}</Badge>
              ) : null}
            </SheetTitle>
            <SheetDescription>
              Pre-publish check for meta tags, slug, keywords, OG/Twitter, and JSON-LD schema.
            </SheetDescription>
          </SheetHeader>

          {result && (
            <ScrollArea className="mt-4 h-[calc(100vh-220px)] pr-3">
              {result.errors.length > 0 && (
                <section className="mb-5">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="h-4 w-4" /> Errors ({result.errors.length})
                  </h4>
                  <ul className="space-y-2">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-sm border-l-2 border-destructive bg-destructive/5 px-3 py-2 rounded">
                        <div className="font-mono text-xs text-muted-foreground">{e.field}</div>
                        <div>{e.message}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.warnings.length > 0 && (
                <section className="mb-5">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle className="h-4 w-4" /> Warnings ({result.warnings.length})
                  </h4>
                  <ul className="space-y-2">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-sm border-l-2 border-amber-400 bg-amber-50 px-3 py-2 rounded">
                        <div className="font-mono text-xs text-muted-foreground">{w.field}</div>
                        <div>{w.message}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.passed.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Passed ({result.passed.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {result.passed.map((p, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-600 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </ScrollArea>
          )}

          {result && recordId && (
            <div className="mt-4 flex gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="flex-1">Close</Button>
              <Button size="sm" onClick={persist} disabled={persisting} className="flex-1">
                {persisting ? "Saving…" : "Save to dashboard"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SEOValidationButton;
