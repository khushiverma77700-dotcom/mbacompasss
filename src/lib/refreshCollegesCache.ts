import { supabase } from "@/integrations/supabase/client";

/**
 * The public /colleges directory is served from a pre-built snapshot
 * (materialised view `colleges_listing_cache`) because rebuilding the 5k-row
 * listing per request cost ~2.6s. Admin writes must therefore ask the database
 * to rebuild the snapshot, otherwise edits only appear after the hourly
 * reconciliation job.
 *
 * Fire-and-forget by design: a failed refresh must never block an admin save.
 */
export const refreshCollegesCache = async (): Promise<void> => {
  try {
    // Function is newer than the generated types.
    await (supabase.rpc as unknown as (fn: string) => Promise<unknown>)(
      "refresh_colleges_listing_cache",
    );
  } catch {
    /* snapshot falls back to the hourly refresh */
  }
};
