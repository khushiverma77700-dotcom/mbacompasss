import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://bschoolbuzz.com";

type PageType = "article" | "institute" | "college" | "exam" | "city_page";

const pathMap: Record<PageType, (slug: string) => string> = {
  article: (s) => `/article/${s}`,
  institute: (s) => `/institute/${s}`,
  college: (s) => `/college/${s}`,
  exam: (s) => `/exam/${s}`,
  city_page: (s) => `/colleges/${s}`,
};

/**
 * Submit a newly created page URL to Google Indexing API.
 * Call this after successfully inserting a new record.
 */
export const submitToGoogleIndexing = async (
  pageType: PageType,
  slug: string,
  recordId?: string
) => {
  if (!slug) return;

  const url = `${SITE_URL}${pathMap[pageType](slug)}`;

  try {
    await supabase.functions.invoke("google-indexing", {
      body: {
        action: "submit_url",
        url,
        page_type: pageType,
        record_id: recordId,
      },
    });
  } catch (e) {
    console.error("Google Indexing submission failed:", e);
  }
};
