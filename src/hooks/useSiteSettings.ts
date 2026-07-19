import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const SETTINGS_STALE = 60 * 1000; // matches server TTL

const UI_SETTINGS_KEYS = [
  "header", "hero", "stats", "why_choose_us", "how_it_works",
  "faqs", "footer", "contact_page", "announcement",
];

// Fetch aggregated homepage settings from the server-side cache first, then
// fall back to a direct DB read on error. Keeps first-paint fast because the
// edge function serves from a warm in-memory cache (TTL 60s).
async function fetchHomepageSettings(): Promise<Record<string, any>> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.functions.invoke("homepage-cache", {
      method: "GET",
    });
    if (!error && data?.settings) return data.settings as Record<string, any>;
  } catch { /* fall through to direct read */ }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", UI_SETTINGS_KEYS);
  if (error) throw error;
  const map: Record<string, any> = {};
  data?.forEach((row: any) => { map[row.key] = row.value; });
  return map;
}

export const useAllSiteSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["site_settings_all"],
    queryFn: fetchHomepageSettings,
    staleTime: SETTINGS_STALE,
    gcTime: 30 * 60 * 1000,
  });

  // Seed individual caches from the batch result so useSiteSettings never fires its own request
  useEffect(() => {
    if (query.data) {
      for (const key of UI_SETTINGS_KEYS) {
        queryClient.setQueryData(["site_settings", key], query.data[key] ?? null);
      }
    }
  }, [query.data, queryClient]);

  return query;
};

export const useSiteSettings = (key: string, options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["site_settings", key],
    queryFn: async () => {
      const batch = await queryClient.fetchQuery({
        queryKey: ["site_settings_all"],
        queryFn: fetchHomepageSettings,
        staleTime: SETTINGS_STALE,
      });
      return (batch?.[key] as Record<string, any>) ?? null;
    },
    staleTime: SETTINGS_STALE,
    gcTime: 30 * 60 * 1000,
    placeholderData: null,
    enabled: options?.enabled ?? true,
  });
};

/**
 * Admin-only: clears the server cache and refetches the homepage batch so
 * changes go live immediately after saves.
 */
export async function purgeHomepageCache(queryClient?: ReturnType<typeof useQueryClient>) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.functions.invoke("homepage-cache", {
      method: "POST",
      body: { action: "purge" },
    });
  } catch { /* non-fatal */ }
  queryClient?.invalidateQueries({ queryKey: ["site_settings_all"] });
  queryClient?.invalidateQueries({ queryKey: ["site_settings"] });
}
