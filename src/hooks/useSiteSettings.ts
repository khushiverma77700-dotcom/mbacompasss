import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_STALE = 10 * 60 * 1000;

const UI_SETTINGS_KEYS = [
  "header", "hero", "stats", "why_choose_us", "how_it_works",
  "faqs", "footer", "contact_page", "announcement",
];

const UI_KEYS_SET = new Set(UI_SETTINGS_KEYS);

const fetchAllSiteSettings = async () => {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", UI_SETTINGS_KEYS);

  if (error) throw error;

  const map: Record<string, any> = {};
  data?.forEach((row: any) => {
    map[row.key] = row.value;
  });

  return map;
};

export const useAllSiteSettings = () => {
  return useQuery({
    queryKey: ["site_settings_all"],
    queryFn: fetchAllSiteSettings,
    staleTime: SETTINGS_STALE,
    gcTime: 30 * 60 * 1000,
  });
};

export const useSiteSettings = (key: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["site_settings", key],
    queryFn: async () => {
      if (UI_KEYS_SET.has(key)) {
        const allData = await queryClient.ensureQueryData({
          queryKey: ["site_settings_all"],
          queryFn: fetchAllSiteSettings,
          staleTime: SETTINGS_STALE,
          gcTime: 30 * 60 * 1000,
        });

        return allData[key] ?? null;
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
    placeholderData: null,
  });
};
