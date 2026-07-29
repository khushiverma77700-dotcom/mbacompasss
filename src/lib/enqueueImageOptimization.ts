import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget hook for the image-optimizer edge function.
 * Called after any admin upload so newly uploaded images get audited,
 * hashed, WebP-encoded, and alt-generated automatically.
 */
export const enqueueImageOptimization = async (sourceUrl: string): Promise<void> => {
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return;
  try {
    await supabase.functions.invoke("image-optimizer", { body: { source_url: sourceUrl } });
  } catch (err) {
    // Non-blocking — the audit crawler will pick it up later
    console.warn("enqueueImageOptimization failed", err);
  }
};
