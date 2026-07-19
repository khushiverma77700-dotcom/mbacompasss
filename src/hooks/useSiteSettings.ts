import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const SETTINGS_STALE = 10 * 60 * 1000;

const UI_SETTINGS_KEYS = [
  "header", "hero", "stats", "why_choose_us", "how_it_works",
  "faqs", "footer", "contact_page", "announcement",
];

export const useAllSiteSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["site_settings_all"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
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
    },
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
      // Route through the batch query so we never fire a per-key roundtrip.
      // On the homepage, App.tsx mounts useAllSiteSettings at the root — this
      // ensures Header/Footer/Hero share ONE request instead of racing three.
      const batch = await queryClient.fetchQuery({
        queryKey: ["site_settings_all"],
        queryFn: async () => {
          const { supabase } = await import("@/integrations/supabase/client");
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
      });
      return (batch?.[key] as Record<string, any>) ?? null;
    },
    staleTime: SETTINGS_STALE,
    gcTime: 30 * 60 * 1000,
    placeholderData: null,
    enabled: options?.enabled ?? true,
  });
};

