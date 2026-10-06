import { supabase } from "@/integrations/supabase/client";
import { EDITORIAL_TOOLS, type EditorialTarget } from "@/lib/editorialLinks";

let cached: { at: number; targets: EditorialTarget[] } | undefined;
let pending: Promise<EditorialTarget[]> | undefined;

/** Slim, sequential pages avoid full-content reads and database request bursts. */
async function readPool(): Promise<EditorialTarget[]> {
  const targets: EditorialTarget[] = [...EDITORIAL_TOOLS];
  for (const kind of ["colleges", "exams", "coachings"] as const) {
    const table = kind === "coachings" ? "institutes" : kind;
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from(table).select("name,slug").order("slug").range(start, start + 999);
      if (error) throw new Error(`Could not load ${kind}: ${error.message}`);
      for (const row of data || []) {
        if (!row.name?.trim() || !row.slug?.trim()) continue;
        const prefix = kind === "colleges" ? "college" : kind === "exams" ? "exam" : "institute";
        targets.push({ label: row.name.trim(), url: `/${prefix}/${encodeURIComponent(row.slug.trim())}`, kind, aliases: [] });
      }
      if ((data || []).length < 1000) break;
    }
  }
  cached = { at: Date.now(), targets };
  return targets;
}

export function loadEditorialLinkPool(refresh = false) {
  if (!refresh && cached && Date.now() - cached.at < 5 * 60 * 1000) return Promise.resolve(cached.targets);
  if (!pending) pending = readPool().finally(() => { pending = undefined; });
  return pending;
}