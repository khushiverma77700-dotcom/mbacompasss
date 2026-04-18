import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://bschoolbuzz.com";

type PageType = "article" | "institute" | "college" | "exam" | "city_page" | "category";

const pathMap: Record<PageType, (slug: string) => string> = {
  article: (s) => `/article/${s}`,
  institute: (s) => `/institute/${s}`,
  college: (s) => `/college/${s}`,
  exam: (s) => `/exam/${s}`,
  city_page: (s) => `/colleges/${s}`,
  category: (s) => `/category/${s}`,
};

/**
 * Notify the Google indexing pipeline about a new/updated page.
 *
 * As of the auto-indexing rollout, every insert/update on articles,
 * colleges, institutes, exams, city_pages and categories is
 * automatically queued via a Postgres trigger, and a cron flushes
 * the queue every 5 minutes. This helper now only nudges the queue
 * and pings the sitemap — fire-and-forget, never blocks admin saves.
 */
export const submitToGoogleIndexing = async (
  pageType: PageType,
  slug: string,
  _recordId?: string
): Promise<void> => {
  if (!slug) return;
  // Reference URL kept for log clarity / future use.
  void `${SITE_URL}${pathMap[pageType](slug)}`;

  try {
    await Promise.all([
      supabase.functions.invoke("google-indexing", {
        body: { action: "submit_pending", limit: 5 },
      }),
      supabase.functions.invoke("google-indexing", {
        body: { action: "ping_sitemap" },
      }),
    ]);
  } catch (e) {
    console.warn("Background indexing nudge failed (non-blocking):", e);
  }
};
