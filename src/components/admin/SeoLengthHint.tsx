import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Admin-only inline hint that shows live character count + Google SERP truncation
 * warnings under meta_title and meta_description inputs.
 *
 * Targets:
 *   - title:       30–60 chars  (Google SERPs truncate ~55–60)
 *   - description: 80–160 chars (Google SERPs truncate ~155–160)
 *
 * Usage:
 *   <Input value={meta_title} ... />
 *   <SeoLengthHint kind="title" value={meta_title} />
 */
export type SeoLengthKind = "title" | "description";

const RANGES: Record<SeoLengthKind, { min: number; max: number; label: string }> = {
  title:       { min: 30, max: 60,  label: "Meta title" },
  description: { min: 80, max: 160, label: "Meta description" },
};

export default function SeoLengthHint({
  kind,
  value,
}: {
  kind: SeoLengthKind;
  value: string | null | undefined;
}) {
  const range = RANGES[kind];
  const len = (value ?? "").trim().length;
  const tooShort = len > 0 && len < range.min;
  const tooLong  = len > range.max;
  const ok       = !tooShort && !tooLong && len > 0;

  const tone =
    len === 0          ? "text-muted-foreground"
    : tooLong          ? "text-destructive"
    : tooShort         ? "text-amber-600"
    :                    "text-emerald-600";

  const message =
    len === 0  ? `${range.label}: add ${range.min}–${range.max} characters`
    : tooLong  ? `Too long by ${len - range.max} — Google will truncate in SERPs`
    : tooShort ? `Too short by ${range.min - len} — add more detail for better CTR`
    :            `Good length`;

  const Icon = ok ? CheckCircle2 : AlertCircle;

  return (
    <div className={`mt-1 flex items-center gap-1.5 text-xs ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>
        {len}/{range.max} — {message}
      </span>
    </div>
  );
}
