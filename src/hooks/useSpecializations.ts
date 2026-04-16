import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Specialization = {
  id: string;
  name: string;
  slug: string;
  type: "college" | "coaching" | "both";
  active: boolean;
  sort_order: number;
};

export const useSpecializations = (kind?: "college" | "coaching") => {
  return useQuery({
    queryKey: ["specializations", kind || "all"],
    queryFn: async () => {
      let q = (supabase as any).from("specializations").select("*").eq("active", true).order("sort_order");
      const { data, error } = await q;
      if (error) throw error;
      const list = (data || []) as Specialization[];
      if (!kind) return list;
      return list.filter(s => s.type === kind || s.type === "both");
    },
  });
};

export const useAllSpecializationsAdmin = () => {
  return useQuery({
    queryKey: ["specializations-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("specializations")
        .select("*")
        .order("type")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Specialization[];
    },
  });
};
