import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// Batch-fetch all settings in one query, then individual hooks read from cache
const SETTINGS_STALE = 10 * 60 * 1000; // 10 min

// Only fetch the small UI-relevant settings, not huge SEO snapshots
const UI_SETTINGS_KEYS = [
  "header", "hero", "stats", "why_choose_us", "how_it_works",
  "faqs", "footer", "contact_page", "announcement",
];

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

  // Seed individual cache from batch if available
  useEffect(() => {
    const allData = queryClient.getQueryData<Record<string, any>>(["site_settings_all"]);
    if (allData && allData[key] !== undefined) {
      queryClient.setQueryData(["site_settings", key], allData[key]);
    }
  }, [key, queryClient]);

  return useQuery({
    queryKey: ["site_settings", key],
    queryFn: async () => {
      // Check batch cache first
      const allData = queryClient.getQueryData<Record<string, any>>(["site_settings_all"]);
      if (allData && allData[key] !== undefined) {
        return allData[key] as Record<string, any>;
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
  });
};
