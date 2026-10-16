import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const homeFreebiesQuery = queryOptions({
  queryKey: ["home-freebies"],
  queryFn: async () => {
    const { data, error } = await supabase.from("freebies")
      .select("id,title,category,cover_image_url,download_count,is_featured,featured_order,created_at")
      .eq("is_published", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(4);
    if (error) throw error;
    return data || [];
  },
});

/** Only the public editorial queries displayed on the home page. */
export async function prefetchHomepage(qc: QueryClient) {
  await Promise.all([
    qc.ensureQueryData(homeFreebiesQuery),
    qc.ensureQueryData({ queryKey: ["top-ranked-colleges"], queryFn: async () => {
      const { data, error } = await supabase.from("colleges").select("name, slug, city, state, ranking, fees, placement_avg, type, logo_url")
        .not("ranking", "is", null).order("ranking").limit(6);
      if (error) throw error;
      return data || [];
    }}),
    qc.ensureQueryData({ queryKey: ["categories-homepage"], queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug,description,icon")
        .not("name", "is", null).not("slug", "is", null).order("name").limit(6);
      if (error) throw error;
      return data || [];
    }}),
    ...[4, 6].map((limit) => qc.ensureQueryData({ queryKey: [limit === 4 ? "home-latest-articles" : "homepage-news"], queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("id,slug,title,excerpt,category,image_url,banner_url,created_at,content_chars,author")
        .eq("published", true).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    }})),
    qc.ensureQueryData({ queryKey: ["exam-deadlines-ticker"], queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("name, slug, registration_deadline, exam_date, conducting_body")
        .order("registration_deadline").limit(6);
      if (error) throw error;
      return data || [];
    }}),
    qc.ensureQueryData({ queryKey: ["homepage-college-application-deadlines"], queryFn: async () => {
      const { data, error } = await supabase.from("application_trackers")
        .select("id, name, slug, logo_url, program, application_deadline, application_fee, average_package, highest_package, apply_url, homepage_order")
        .eq("is_homepage_featured", true).eq("is_active", true).eq("is_archived", false).neq("category", "exam")
        .order("homepage_order").order("application_deadline", { ascending: true, nullsFirst: false }).limit(20);
      if (error) throw error;
      return (data || []).filter((row) => row.name?.trim() && row.slug?.trim());
    }}),
  ]);
}