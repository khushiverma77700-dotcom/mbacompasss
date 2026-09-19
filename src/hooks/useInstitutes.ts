import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { collegesListingQuery, institutesQuery } from "@/lib/queries/listingQueries";

// Query definition lives in @/lib/queries/listingQueries so the /coaching route
// loader can prefetch it server-side under the identical query key.
export const useInstitutes = (categorySlug?: string) => {
  return useQuery(institutesQuery(categorySlug));
};

export const useInstituteBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["institute", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select(`
          *,
          courses(*, course_categories(id, name, slug)),
          faculty(*),
          categories:category_id(name, slug),
          reviews(*)
        `)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

export const useFeaturedInstitutes = () => {
  return useQuery({
    queryKey: ["featured-institutes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes")
        .select(`
          id,
          name,
          slug,
          city,
          state,
          logo_url,
          banner_url,
          rating,
          total_reviews,
          students_count,
          success_rate,
          discount,
          courses(id, fees),
          categories:category_id(name, slug)
        `)
        .eq("featured", true)
        .order("rating", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data || []).filter((item) => item.name?.trim() && item.slug?.trim());
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });
};

// Listing variant — uses RPC `colleges_listing()` which trims description to 250 chars
// server-side. Cuts payload from ~4 MB to ~400 KB and dramatically speeds /colleges.
// NOTE: the Data API caps every response at 1000 rows, so we page through with
// `.range()` until the full catalogue is loaded (otherwise newer colleges vanish).
const PAGE_SIZE = 1000;

// Query definition lives in @/lib/queries/listingQueries so the /colleges route
// loader can prefetch it server-side under the identical query key.
export const useColleges = () => {
  return useQuery(collegesListingQuery);
};

/**
 * Six related colleges for a detail page. Previously the page downloaded the
 * entire catalogue and sliced the first six off it.
 */
export const useSuggestedColleges = (excludeSlug?: string) => {
  return useQuery({
    queryKey: ["colleges_suggested", excludeSlug ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("id, name, slug, city, state, logo_url, fees, placement_avg, ranking, type")
        .not("slug", "is", null)
        .neq("slug", excludeSlug ?? "")
        .order("ranking")
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export interface CollegeLocationCount {
  city: string;
  state: string;
  total: number;
}

/**
 * City/state college counts, aggregated in the database. The homepage used to
 * download all ~5,200 college rows just to count them per city; this returns a
 * few hundred grouped rows instead.
 */
export const useCollegeLocationCounts = () => {
  return useQuery({
    queryKey: ["colleges_location_counts"],
    queryFn: async (): Promise<CollegeLocationCount[]> => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
        ) => PromiseLike<{ data: CollegeLocationCount[] | null; error: { message: string } | null }>
      )("colleges_location_counts");
      if (error) throw new Error(error.message);
      return (data || []).map((r) => ({ ...r, total: Number(r.total) || 0 }));
    },
    staleTime: 30 * 60 * 1000,
  });
};

/** Sum the grouped counts whose city or state matches any of a city page's aliases. */
export const countCollegesForAliases = (
  rows: CollegeLocationCount[] | undefined,
  aliases: string[],
): number =>
  (rows || []).reduce((sum, r) => {
    const city = (r.city || "").toLowerCase();
    const state = (r.state || "").toLowerCase();
    const hit = aliases.some((a) => {
      const alias = a.toLowerCase();
      return city.includes(alias) || state.includes(alias);
    });
    return hit ? sum + r.total : sum;
  }, 0);

// Light variant — for homepage city counts, spotlight cards, related-college sidebars.
// Drops description (huge HTML blob) + specializations/recruiters/accreditations arrays.
// Cuts the colleges payload from ~1.8s/large to a fast lean response.
export const useCollegesLight = () => {
  return useQuery({
    queryKey: ["colleges_light"],
    queryFn: async () => {
      const all: any[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("colleges")
          .select("id, name, slug, city, state, logo_url, fees, placement_avg, placement_highest, ranking, type, exams_accepted")
          .order("ranking")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const page = data || [];
        all.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
      return all;
    },
    staleTime: 10 * 60 * 1000,
  });
};


export const useCollegeBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["college", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};
