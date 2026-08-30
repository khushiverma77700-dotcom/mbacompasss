// Shared safe-rendering + payload-validation helpers for the admin SEO suite.
//
// Backend tables store a lot of JSONB (progress, evidence, meta, before/after
// values). Rendering those objects directly as React children throws React
// error #31, which used to crash the whole SEO Intelligence Center. Every admin
// SEO component must funnel database-provided values through `safeText` so a
// JSON object can never reach the React tree as a child again.

export type Primitive = string | number | boolean;

/** Render ANY value as a plain string that is always a valid React child. */
export function safeText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (value.length === 0) return fallback;
    return value.map((v) => safeText(v, "")).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Prefer human-readable keys when the payload carries one.
    for (const key of ["detail", "message", "text", "label", "note", "step", "status", "reason"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/** Pretty-printed JSON for debug drawers. Never throws. */
export function safeJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/* ── formatting helpers (null-safe, locale aware) ── */
export const fmtInt = (v: unknown, fallback = "—") =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? fallback
    : Math.round(Number(v)).toLocaleString("en-IN");

export const fmtDec = (v: unknown, digits = 2, fallback = "—") =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? fallback
    : Number(v).toFixed(digits);

/** value is a 0–1 ratio */
export const fmtRatioPct = (v: unknown, digits = 2, fallback = "—") =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? fallback
    : `${(Number(v) * 100).toFixed(digits)}%`;

/** value is already a percentage number */
export const fmtPct = (v: unknown, digits = 1, fallback = "—") =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? fallback
    : `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(digits)}%`;

export const fmtDate = (v: unknown, fallback = "—") => {
  if (!v) return fallback;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime())
    ? safeText(v, fallback)
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtWhen = (v: unknown, fallback = "—") => {
  if (!v) return fallback;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime())
    ? safeText(v, fallback)
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export const agoText = (v: unknown, fallback = "never") => {
  if (!v) return fallback;
  const t = new Date(String(v)).getTime();
  if (Number.isNaN(t)) return fallback;
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

/* ── runtime schema validation for backend payloads ── */

export type FieldKind = "string" | "number" | "boolean" | "object" | "array" | "any";

export interface FieldSpec {
  kind: FieldKind;
  required?: boolean;
}

export type PayloadSpec = Record<string, FieldSpec>;

export interface ValidationIssue {
  field: string;
  expected: FieldKind;
  received: string;
  reason: "missing" | "wrong_type";
  sample: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

const typeOf = (v: unknown): string => {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
};

const matches = (v: unknown, kind: FieldKind): boolean => {
  if (kind === "any") return true;
  if (kind === "array") return Array.isArray(v);
  if (kind === "object") return typeOf(v) === "object";
  return typeOf(v) === kind;
};

/**
 * Validate one payload object against a spec. Optional fields may be null or
 * absent; a present-but-wrong-typed field is always reported so the UI can name
 * exactly which field is malformed.
 */
export function validatePayload(
  payload: unknown,
  spec: PayloadSpec,
  label = "payload",
): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (typeOf(payload) !== "object") {
    return {
      ok: false,
      issues: [{
        field: label,
        expected: "object",
        received: typeOf(payload),
        reason: "wrong_type",
        sample: safeText(payload, "(empty)").slice(0, 160),
      }],
    };
  }
  const obj = payload as Record<string, unknown>;
  for (const [field, fs] of Object.entries(spec)) {
    const value = obj[field];
    const absent = value === undefined || value === null;
    if (absent) {
      if (fs.required) {
        issues.push({ field, expected: fs.kind, received: typeOf(value), reason: "missing", sample: "(absent)" });
      }
      continue;
    }
    if (!matches(value, fs.kind)) {
      issues.push({
        field,
        expected: fs.kind,
        received: typeOf(value),
        reason: "wrong_type",
        sample: safeText(value, "(empty)").slice(0, 160),
      });
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Validate every row of a list payload, reporting the row index in the field. */
export function validateRows(
  rows: unknown,
  spec: PayloadSpec,
  label = "rows",
): ValidationResult {
  if (!Array.isArray(rows)) {
    return {
      ok: false,
      issues: [{ field: label, expected: "array", received: typeOf(rows), reason: "wrong_type", sample: safeText(rows, "(empty)").slice(0, 160) }],
    };
  }
  const issues: ValidationIssue[] = [];
  rows.forEach((row, i) => {
    const res = validatePayload(row, spec, `${label}[${i}]`);
    res.issues.forEach((iss) => issues.push({ ...iss, field: `${label}[${i}].${iss.field}` }));
  });
  return { ok: issues.length === 0, issues: issues.slice(0, 25) };
}

/* Specs for the payloads the SEO dashboard consumes. */
export const ACTIVITY_SPEC: PayloadSpec = {
  event: { kind: "string", required: true },
  detail: { kind: "any" },
  level: { kind: "string" },
  job_type: { kind: "string" },
  records: { kind: "number" },
  data_source: { kind: "string" },
  created_at: { kind: "string", required: true },
};

export const AUDIT_SPEC: PayloadSpec = {
  action: { kind: "string", required: true },
  entity: { kind: "string" },
  path: { kind: "string" },
  before_value: { kind: "any" },
  after_value: { kind: "any" },
  actor_label: { kind: "string" },
  created_at: { kind: "string", required: true },
};

export const PERFORMANCE_SERIES_SPEC: PayloadSpec = {
  date: { kind: "string", required: true },
  clicks: { kind: "number", required: true },
  impressions: { kind: "number", required: true },
  ctr: { kind: "number" },
  avg_position: { kind: "number" },
  cum_clicks: { kind: "number" },
  growth_clicks_pct: { kind: "number" },
};
