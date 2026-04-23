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
        courses(id, name, fees),
        faculty(id, name),
        categories:category_id(name, slug)
      `);
      if (categorySlug) {
        // First get category id
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
        if (cat) query = query.eq("category_id", cat.id);
      }
      const { data, error } = await query.order("rating", { ascending: false });
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

export const useColleges = () => {
  return useQuery({
    queryKey: ["colleges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select(`
          id,
          name,
          slug,
          city,
          state,
          logo_url,
          description,
          fees,
          fees_lakhs,
          placement_avg,
          placement_highest,
          placement_median,
          ranking,
          type,
          tier,
          established,
          total_students,
          campus_size,
          exams_accepted,
          specializations,
          top_recruiters,
          accreditations
        `)
        .order("ranking");
      if (error) throw error;
      return data || [];
    },
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
