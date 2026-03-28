import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useInstitutes = (categorySlug?: string) => {
  return useQuery({
    queryKey: ["institutes", categorySlug],
    queryFn: async () => {
      let query = supabase.from("institutes").select(`
        *,
        courses(*),
        faculty(*),
        categories:category_id(name, slug)
      `);
      if (categorySlug) {
        // First get category id
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
        if (cat) query = query.eq("category_id", cat.id);
      }
      const { data, error } = await query.order("rating", { ascending: false });
      if (error) throw error;
      return data || [];
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
          courses(*),
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
        .select("*, courses(*), categories:category_id(name, slug)")
        .eq("featured", true)
        .order("rating", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
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
      const { data, error } = await supabase.from("colleges").select("*").order("ranking");
      if (error) throw error;
      return data || [];
    },
  });
};
