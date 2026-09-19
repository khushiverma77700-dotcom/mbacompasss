import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared query definitions for the big public listings.
 *
 * These live outside the hooks so route loaders can prefetch them on the
 * server with the EXACT same query key the component hook subscribes to.
 * If a key ever drifts, SSR dehydration silently stops matching and the
 * client re-fetches from scratch (skeleton on first paint again), so the
 * hooks below MUST be the only consumers of these keys.
 */

const COLLEGES_PAGE_SIZE = 1000;
// PostgREST caps a single response at 1000 rows, and every `range()` call
// re-runs colleges_listing() in full — so fetching the ~4.2k catalogue
// sequentially cost 5 x ~2.4s. Pages are independent, so request them in
// parallel batches instead (same rows, same order, ~4x faster TTFB).
const COLLEGES_BATCH = 6;

const fetchCollegesPage = async (from: number) => {
  const { data, error } = await supabase
    .rpc("colleges_listing")
    .range(from, from + COLLEGES_PAGE_SIZE - 1);
  if (error) throw error;
  return data || [];
};

export const collegesListingQuery = queryOptions({
  queryKey: ["colleges"],
  queryFn: async () => {
    const all: any[] = [];
    for (let batch = 0; ; batch++) {
      const offsets = Array.from(
        { length: COLLEGES_BATCH },
        (_, i) => (batch * COLLEGES_BATCH + i) * COLLEGES_PAGE_SIZE,
      );
      const pages = await Promise.all(offsets.map(fetchCollegesPage));
      let done = false;
      for (const page of pages) {
        all.push(...page);
        if (page.length < COLLEGES_PAGE_SIZE) {
          done = true;
          break;
        }
      }
      if (done) break;
    }
    return all;
  },
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});


export const institutesQuery = (categorySlug?: string) =>
  queryOptions({
    queryKey: ["institutes", categorySlug],
    queryFn: async () => {
      let query = supabase.from("institutes").select(`
        id,
        name,
        slug,
        city,
        state,
        description,
        logo_url,
        banner_url,
        featured,
        rating,
        total_reviews,
        students_count,
        success_rate,
        mode,
        discount,
        offer,
        fees_lakhs,
        category_id,
        features,
        specializations,
        listing_sort_order,
        courses(id, name, fees),
        faculty(id, name),
        categories:category_id(name, slug)
      `);
      if (categorySlug) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        if (cat) query = query.eq("category_id", cat.id);
      }
      const { data, error } = await query
        .order("listing_sort_order", { ascending: true, nullsFirst: false })
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data || []).filter((item) => item.name?.trim() && item.slug?.trim());
    },
  });

export const mocksLandingSettingsQuery = queryOptions({
  queryKey: ["mocks-landing-settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("mocks_landing_settings")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
});

export const blogArticlesQuery = queryOptions({
  queryKey: ["blog-articles"],
  queryFn: async () => {
    const { data } = await supabase
      .from("articles")
      .select("id,slug,title,excerpt,category,image_url,banner_url,created_at,featured,content_chars,author")
      .eq("published", true)
      .order("created_at", { ascending: false });
    return data || [];
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
});

export const mbaCompassCoursesQuery = queryOptions({
  queryKey: ["mba-compass-courses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("mba_compass_courses")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

/**
 * First screen of the colleges directory (SEO + first paint).
 *
 * The /colleges route used to server-prefetch the ENTIRE 5.2k catalogue, which
 * meant the SSR HTML shipped ~5.8 MB of dehydrated JSON to every visitor before
 * anything was interactive. Only this small slice is prefetched now; the full
 * catalogue loads in the background on the client for filters/sorting.
 */
export const collegesListingPreviewQuery = queryOptions({
  queryKey: ["colleges", "preview"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("colleges_listing").range(0, 119);
    if (error) throw error;
    return data || [];
  },
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});
