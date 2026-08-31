import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useInstitutes = (categorySlug?: string) => {
  return useQuery({
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
        // First get category id
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
        if (cat) query = query.eq("category_id", cat.id);
      }
      const { data, error } = await query
        .order("listing_sort_order", { ascending: true, nullsFirst: false })
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data || []).filter((item) => item.name?.trim() && item.slug?.trim());
    },
  });
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

export const useColleges = () => {
  return useQuery({
    queryKey: ["colleges"],
    queryFn: async () => {
      const all: any[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .rpc("colleges_listing")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const page = data || [];
        all.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
      return all;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

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
