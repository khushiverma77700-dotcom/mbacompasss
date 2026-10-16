import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parse, isValid } from "date-fns";

function parseExamDate(value: string | null): Date | null {
  if (!value) return null;
  const direct = new Date(value);
  if (isValid(direct) && direct.getFullYear() > 2000) return direct;
  for (const format of ["dd MMM yyyy", "MMM dd, yyyy", "dd MMMM yyyy", "MMMM dd, yyyy", "yyyy-MM-dd"]) {
    const date = parse(value, format, new Date());
    if (isValid(date) && date.getFullYear() > 2000) return date;
  }
  return null;
}

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
    qc.ensureQueryData({ queryKey: ["popular-exams-countdown"], queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("name, slug, full_name, exam_date, registration_deadline, conducting_body");
      if (error) throw error;
      const now = Date.now();
      return (data || []).filter((row) => row.name?.trim()).sort((a, b) => {
        const da = parseExamDate(a.exam_date), db = parseExamDate(b.exam_date);
        const af = da && da.getTime() >= now - 86400000, bf = db && db.getTime() >= now - 86400000;
        if (af && bf && da && db) return da.getTime() - db.getTime();
        if (af) return -1;
        if (bf) return 1;
        if (da && db) return da.getTime() - db.getTime();
        return da ? -1 : db ? 1 : 0;
      }).slice(0, 6);
    }}),
    qc.ensureQueryData({ queryKey: ["testimonials"], queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    }}),
    qc.ensureQueryData({ queryKey: ["success-stories-featured"], queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").eq("active", true).eq("featured", true).order("sort_order").limit(6);
      if (error) throw error;
      return data || [];
    }}),
    qc.ensureQueryData({ queryKey: ["comparisons-with-articles"], queryFn: async () => {
      const [{ data: comparisons, error }, { data: articles, error: articleError }] = await Promise.all([
        supabase.from("comparisons").select("id, title, description, link").eq("active", true).order("sort_order"),
        supabase.from("articles").select("title, slug, excerpt, comparison_id").eq("published", true).eq("is_comparison", true).not("comparison_id", "is", null),
      ]);
      if (error || articleError) throw error || articleError;
      return (comparisons || []).map((row) => {
        const article = articles?.find((a) => a.comparison_id === row.id);
        return { title: row.title, description: article?.excerpt || row.description || "", link: article ? `/article/${article.slug}` : row.link || "/blog" };
      });
    }}),
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
  const keys = ["hero", "stats", "faqs", "how_it_works", "why_choose_us", "footer", "header"];
  const { data, error } = await supabase.from("site_settings").select("key,value").in("key", keys);
  if (error) throw error;
  for (const key of keys) qc.setQueryData(["site_settings", key], data?.find((row) => row.key === key)?.value ?? null);
}