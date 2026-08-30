import { CheckCircle2 } from "lucide-react";

export type KeyFact = { label: string; value?: string | null };

interface AnswerBlockProps {
  /** The question this page answers, e.g. "What is CAT 2026?" */
  question?: string;
  /** 40–60 word direct answer. Rendered first, before any explanation. */
  answer?: string;
  /** 3–6 extractable facts (fees, dates, eligibility, location, mode…). */
  facts?: KeyFact[];
  /** Machine-readable last-updated date (ISO). */
  updatedAt?: string | null;
  className?: string;
}

/**
 * Answer-first block ("Key Answer").
 *
 * Rendered directly under the H1 on content pages. Two jobs:
 *  1. Give the visitor the answer immediately instead of after three paragraphs.
 *  2. Give answer engines one clean, quotable region — it carries
 *     id="answer-summary", which is the cssSelector used by the `speakable`
 *     property in the page's JSON-LD (see src/lib/aeoSchema.ts).
 *
 * Design intentionally matches the existing card language — no new visual style.
 */
const AnswerBlock = ({ question, answer, facts, updatedAt, className = "" }: AnswerBlockProps) => {
  const cleanFacts = (facts || []).filter((f) => f && f.label && f.value && String(f.value).trim()).slice(0, 6);
  if (!answer && !cleanFacts.length) return null;

  return (
    <section
      id="answer-summary"
      aria-label="Summary"
      className={`rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground m-0">
          Summary
        </h2>
      </div>

      {question && (
        <p className="text-sm font-semibold text-foreground/70 mb-1.5">{question}</p>
      )}

      {answer && (
        <p className="text-sm sm:text-base leading-relaxed text-foreground m-0">{answer}</p>
      )}

      {cleanFacts.length > 0 && (
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 border-t border-border pt-4">
          {cleanFacts.map((f) => (
            <div key={f.label} className="flex flex-wrap items-baseline gap-x-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {f.label}
              </dt>
              <dd className="text-sm font-medium text-foreground m-0">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {updatedAt && (
        <p className="mt-4 mb-0 text-xs text-muted-foreground">
          Last updated{" "}
          <time dateTime={new Date(updatedAt).toISOString()}>
            {new Date(updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </time>
        </p>
      )}
    </section>
  );
};

export default AnswerBlock;
