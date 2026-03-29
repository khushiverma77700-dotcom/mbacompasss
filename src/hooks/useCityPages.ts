import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCityPages = () =>
  useQuery({
    queryKey: ["city-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_pages")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

export const useCityPageBySlug = (slug?: string) =>
  useQuery({
    queryKey: ["city-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_pages")
        .select("*")
        .eq("slug", slug!)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
