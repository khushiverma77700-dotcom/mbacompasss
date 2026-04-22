import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, FileWarning, Calendar } from "lucide-react";
import type { CompletenessReport } from "@/lib/seoCompletenessChecker";
import type { HtmlValidationReport } from "@/lib/htmlValidator";
import type { CycleReport } from "@/lib/cycleChecker";

interface Props {
  seo?: CompletenessReport | null;
  html?: HtmlValidationReport | null;
  cycle?: CycleReport | null;
  title?: string;
}

const levelBadge = (level: "pass" | "warn" | "fail") => {
  if (level === "pass") return { cls: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: <CheckCircle2 className="w-3 h-3" /> };
  if (level === "warn") return { cls: "bg-amber-100 text-amber-800 border-amber-300", icon: <AlertTriangle className="w-3 h-3" /> };
  return { cls: "bg-red-100 text-red-800 border-red-300", icon: <XCircle className="w-3 h-3" /> };
};

const PrePublishReport = ({ seo, html, cycle, title = "Pre-publish checks" }: Props) => {
  if (!seo && !html && !cycle) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {seo && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" /> SEO completeness
              </div>
              <Badge variant="outline" className={levelBadge(seo.level).cls}>
                {seo.overall}/100 · {seo.summary}
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {seo.checks.map((c) => {
                const b = levelBadge(c.status);
                return (
                  <li key={c.key} className="flex items-start gap-2">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${b.cls}`}>{b.icon}{c.status}</Badge>
                    <span><strong>{c.label}:</strong> {c.message}{c.fix ? <span className="text-muted-foreground"> — {c.fix}</span> : null}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {html && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <FileWarning className="w-4 h-4 text-primary" /> HTML structure
              </div>
              <Badge variant="outline" className={html.ok ? levelBadge("pass").cls : levelBadge("fail").cls}>
                {html.ok ? "Valid" : `${html.issues.filter(i => i.level === "error").length} blocker(s)`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {html.stats.wordCount} words · {html.stats.h2} H2 · {html.stats.h3} H3 · {html.stats.tables} table(s) · {html.stats.lists} list(s)
            </p>
            {html.issues.length === 0 ? (
              <p className="text-xs text-emerald-700">No structural issues found.</p>
            ) : (
              <ul className="space-y-1.5">
                {html.issues.map((i, idx) => {
                  const b = levelBadge(i.level === "error" ? "fail" : "warn");
                  return (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge variant="outline" className={`text-[10px] gap-1 ${b.cls}`}>{b.icon}{i.level}</Badge>
                      <span><strong>{i.rule}:</strong> {i.message}{i.fix ? <span className="text-muted-foreground"> — {i.fix}</span> : null}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {cycle && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Calendar className="w-4 h-4 text-primary" /> Latest-cycle check
              </div>
              <Badge variant="outline" className={cycle.ok ? levelBadge("pass").cls : levelBadge("warn").cls}>
                Active cycle: {cycle.activeCycle}
              </Badge>
            </div>
            {cycle.ok ? (
              <p className="text-xs text-emerald-700">
                All admission/placement/ranking years align with {cycle.activeCycle} window.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {cycle.mismatches
                  .filter(m => m.category !== "general")
                  .slice(0, 8)
                  .map((m, idx) => {
                    const b = levelBadge(m.severity === "high" ? "fail" : "warn");
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <Badge variant="outline" className={`text-[10px] gap-1 ${b.cls}`}>{b.icon}{m.severity}</Badge>
                        <span>
                          <strong>{m.year}</strong> ({m.category}) — &ldquo;…{m.context}…&rdquo;
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrePublishReport;
