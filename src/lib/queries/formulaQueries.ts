import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared query definitions for the public formula book.
 *
 * Route loaders prefetch these on the server with the EXACT same query keys
 * the page components subscribe to, so formula links and content are present
 * in the served HTML (crawlable) instead of appearing only after client-side
 * fetches. Keep these keys as the only consumers of this data.
 */

export const formulasListQuery = queryOptions({
  queryKey: ["quant-formulas", "published"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("quant_formulas")
      .select("slug,name,topic_slug,difficulty,importance,is_high_weightage,is_shortcut,exam_tags,explanation")
      .eq("published", true)
      .order("importance", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data || [];
  },
  staleTime: 10 * 60 * 1000,
  gcTime: typeof window === "undefined" ? Infinity : 30 * 60 * 1000,
});

export const quantTopicsQuery = queryOptions({
  queryKey: ["quant-topics"],
  queryFn: async () => {
    const { data, error } = await supabase.from("quant_topics").select("*").order("sort_order");
    if (error) throw error;
    return data || [];
  },
  staleTime: 30 * 60 * 1000,
  gcTime: typeof window === "undefined" ? Infinity : 60 * 60 * 1000,
});

export const formulaDetailQuery = (slug: string) =>
  queryOptions({
    queryKey: ["quant-formula", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quant_formulas")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: typeof window === "undefined" ? Infinity : 30 * 60 * 1000,
  });

export const formulaRelatedQuery = (topicSlug: string, excludeSlug: string) =>
  queryOptions({
    queryKey: ["quant-formula-related", topicSlug, excludeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quant_formulas")
        .select("slug,name,topic_slug,difficulty,importance,is_high_weightage")
        .eq("topic_slug", topicSlug)
        .neq("slug", excludeSlug)
        .eq("published", true)
        .order("importance", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: typeof window === "undefined" ? Infinity : 30 * 60 * 1000,
  });
