// Shared bulk-action runner for the AI SEO Intelligence Center approval flows.
//
// Each recommendation is still processed by the same single-item `rec_action`
// backend call (so the audit log, experiments and tasks stay identical) — this
// helper only drives them in a small concurrency pool and reports progress.

import { supabase } from "@/integrations/supabase/client";

export type SeoRecAct = "approve" | "reject" | "apply" | "verify";

export interface BulkResult {
  total: number;
  ok: number;
  failed: number;
  errors: { id: string; message: string }[];
}

async function callRecAction(id: string, act: SeoRecAct) {
  const { data, error } = await supabase.functions.invoke("seo-intel-control", {
    body: { action: "rec_action", id, act },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data;
}

/**
 * Runs `act` over every id with a bounded concurrency pool.
 * @param onProgress called after each item with (done, total).
 */
export async function bulkRecAction(
  ids: string[],
  act: SeoRecAct,
  onProgress?: (done: number, total: number) => void,
  concurrency = 4,
): Promise<BulkResult> {
  const queue = [...ids];
  const result: BulkResult = { total: ids.length, ok: 0, failed: 0, errors: [] };
  let done = 0;

  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      if (!id) break;
      try {
        await callRecAction(id, act);
        result.ok++;
      } catch (e) {
        result.failed++;
        if (result.errors.length < 5) result.errors.push({ id, message: (e as Error).message });
      }
      done++;
      onProgress?.(done, result.total);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, ids.length)) }, worker));
  return result;
}

export function bulkSummary(act: SeoRecAct, r: BulkResult): string {
  const verb = act === "approve" ? "approved" : act === "reject" ? "rejected" : act === "apply" ? "applied" : "queued for verification";
  const base = `${r.ok} of ${r.total} ${verb}`;
  if (!r.failed) return base;
  return `${base} · ${r.failed} skipped (${r.errors[0]?.message ?? "see console"})`;
}
