import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewEmailWithAi, type EmailReviewResult } from "@/lib/emailAiReview.functions";
import type { EmailDraft } from "./emailShared";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const FIELD_LABEL: Record<string, string> = { fromName: "From name", subject: "Subject", heading: "Heading", body: "Body", button: "Button" };
const VERDICT: Record<string, { label: string; cls: string }> = {
  inbox_likely: { label: "Likely Inbox", cls: "bg-emerald-100 text-emerald-800" },
  at_risk: { label: "At risk", cls: "bg-amber-100 text-amber-800" },
  spam_likely: { label: "Likely Spam", cls: "bg-red-100 text-red-800" },
};

interface Props { draft: EmailDraft; onApply: (d: EmailDraft) => void }

export default function EmailAiReview({ draft, onApply }: Props) {
  const review = useServerFn(reviewEmailWithAi);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailReviewResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      setResult(await review({ data: draft }));
    } catch (e: any) {
      toast.error(e?.message || "AI review failed");
    } finally {
      setLoading(false);
    }
  };

  const approve = () => {
    if (!result) return;
    onApply({ ...draft, ...result.suggestion });
    toast.success("AI version applied to your email");
    setResult(null);
  };

  const s = result?.suggestion;
  const v = result ? VERDICT[result.verdict] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">
          AI checks the from name, subject, heading, body and buttons for spam and marketing words, then writes a safer version. Nothing changes until you approve it.
        </p>
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}
          {loading ? "Reviewing…" : result ? "Review again" : "Review with AI"}
        </Button>
      </div>

      {result && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold">{result.score}/100</span>
              {v && <span className={`rounded-full px-3 py-1 text-sm font-medium ${v.cls}`}>{v.label}</span>}
            </div>
            {result.summary && <p className="text-sm">{result.summary}</p>}
            {result.flags.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> No red flags found.</p>
            ) : (
              <ul className="space-y-2">
                {result.flags.map((f, i) => (
                  <li key={i} className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${f.severity === "low" ? "text-amber-500" : "text-red-600"}`} />
                    <div>
                      <Badge variant="outline" className="mr-2">{FIELD_LABEL[f.field]}</Badge>
                      <strong>"{f.text}"</strong> — {f.reason}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {s && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <p className="font-semibold">Suggested inbox-friendly version</p>
              <Row label="From name" before={draft.fromName} after={s.fromName} />
              <Row label="Subject" before={draft.subject} after={s.subject} />
              <Row label="Heading" before={draft.heading} after={s.heading} />
              <div>
                <p className="text-sm text-muted-foreground">Body</p>
                <div className="prose prose-sm max-w-none rounded-md border p-3 [&_img]:h-auto [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.bodyHtml) }} />
              </div>
              {s.ctas.map((c, i) => <Row key={i} label={`Button ${i + 1}`} before={draft.ctas[i]?.label} after={c.label} />)}
              <div className="flex gap-2 pt-2">
                <Button onClick={approve}>Approve &amp; update email</Button>
                <Button variant="outline" onClick={() => setResult(null)}>Keep mine</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, before, after }: { label: string; before?: string; after: string }) {
  const changed = (before || "") !== after;
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {changed && before ? <p className="text-sm text-muted-foreground line-through">{before}</p> : null}
      <p className={changed ? "font-medium text-emerald-800" : ""}>{after || "—"}</p>
    </div>
  );
}
