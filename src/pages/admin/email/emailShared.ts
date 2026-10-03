export interface EmailCta { label: string; url: string }

export interface EmailDraft {
  fromName: string;
  subject: string;
  heading: string;
  bodyHtml: string;
  ctas: EmailCta[];
}

export const emptyDraft = (): EmailDraft => ({
  fromName: "MBA Compass",
  subject: "",
  heading: "",
  bodyHtml: "",
  ctas: [],
});

export const BUILTIN_VARS = ["name", "first_name", "email"];

/** Client-side preview personalization (mirrors the server). */
export function previewPersonalize(input: string, vars: Record<string, string>): string {
  return (input || "").replace(/\{\{\s*([\w.-]+)\s*(?:\|\s*([^}]*))?\}\}/g, (_m, key: string, fb?: string) => {
    const v = vars[key.toLowerCase()] ?? "";
    return String(v).trim() || (fb ?? "").trim();
  });
}

export const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "0%");
