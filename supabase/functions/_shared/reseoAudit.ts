// Shared: append an entry to seo_reoptimization_audit_log.
// Fire-and-forget — never throws so callers don't break on logging failures.

export type ReseoAuditAction =
  | "run_created"
  | "item_queued"
  | "item_started"
  | "item_completed"
  | "item_failed"
  | "item_applied"
  | "item_discarded"
  | "item_cancelled";

export interface ReseoAuditEntry {
  run_id?: string | null;
  item_id?: string | null;
  url: string;
  slug?: string | null;
  page_type?: string | null;
  page_name?: string | null;
  action: ReseoAuditAction;
  actor_id?: string | null;
  actor_role?: string | null;
  primary_keyword?: string | null;
  secondary_keyword?: string | null;
  score_before?: number | null;
  score_after?: number | null;
  changes?: Record<string, { before: any; after: any }>;
  before_snapshot?: any;
  after_snapshot?: any;
  notes?: string | null;
}

const AUDITED_FIELDS = [
  "meta_title",
  "meta_description",
  "h1",
  "intro_html",
  "body_html",
  "primary_keyword",
  "secondary_keyword",
  "search_intent",
  "long_tail_keywords",
  "related_queries",
  "keywords",
  "faq",
  "json_ld",
];

export function diffSnapshots(before: any, after: any): Record<string, { before: any; after: any }> {
  const out: Record<string, { before: any; after: any }> = {};
  if (!before && !after) return out;
  const b = before || {};
  const a = after || {};
  for (const key of AUDITED_FIELDS) {
    const bv = b[key];
    const av = a[key];
    if (JSON.stringify(bv ?? null) !== JSON.stringify(av ?? null)) {
      out[key] = { before: bv ?? null, after: av ?? null };
    }
  }
  return out;
}

export async function logReseoAudit(sb: any, entry: ReseoAuditEntry): Promise<void> {
  try {
    const row = {
      run_id: entry.run_id ?? null,
      item_id: entry.item_id ?? null,
      url: entry.url,
      slug: entry.slug ?? null,
      page_type: entry.page_type ?? null,
      page_name: entry.page_name ?? null,
      action: entry.action,
      actor_id: entry.actor_id ?? null,
      actor_role: entry.actor_role ?? "system",
      primary_keyword: entry.primary_keyword ?? null,
      secondary_keyword: entry.secondary_keyword ?? null,
      score_before: entry.score_before ?? null,
      score_after: entry.score_after ?? null,
      changes: entry.changes ?? {},
      before_snapshot: entry.before_snapshot ?? null,
      after_snapshot: entry.after_snapshot ?? null,
      notes: entry.notes ?? null,
    };
    const { error } = await sb.from("seo_reoptimization_audit_log").insert(row);
    if (error) console.warn("[reseoAudit] insert failed", error.message);
  } catch (e) {
    console.warn("[reseoAudit] exception", (e as Error).message);
  }
}
