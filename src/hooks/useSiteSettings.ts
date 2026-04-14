import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Batch-fetch all settings in one query, then individual hooks read from cache
const SETTINGS_STALE = 10 * 60 * 1000; // 10 min

// Only fetch the small UI-relevant settings, not huge SEO snapshots
const UI_SETTINGS_KEYS = [
  "header", "hero", "stats", "why_choose_us", "how_it_works",
  "faqs", "footer", "contact_page", "announcement",
];

const UI_KEYS_SET = new Set(UI_SETTINGS_KEYS);

export const useAllSiteSettings = () => {
  return useQuery({
    queryKey: ["site_settings_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", UI_SETTINGS_KEYS);
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach((row: any) => { map[row.key] = row.value; });
      return map;
    },
    staleTime: SETTINGS_STALE,
    gcTime: 30 * 60 * 1000,
  });
};

export const useSiteSettings = (key: string) => {
  const queryClient = useQueryClient();
  const isUIKey = UI_KEYS_SET.has(key);

  return useQuery({
    queryKey: ["site_settings", key],
    queryFn: async () => {
      // For UI keys, read from batch cache (already prefetched)
      if (isUIKey) {
        const allData = queryClient.getQueryData<Record<string, any>>(["site_settings_all"]);
        if (allData) return allData[key] ?? null;
      }
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as Record<string, any>) ?? null;
    },
    staleTime: SETTINGS_STALE,
    gcTime: 30 * 60 * 1000,
    // For UI keys, don't fire until batch is ready — avoids duplicate requests
    enabled: isUIKey
      ? queryClient.getQueryState(["site_settings_all"])?.status === "success"
      : true,
    // Return null immediately so components render with fallbacks, no loading flash
    placeholderData: null,
  });
};
