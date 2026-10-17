import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { projectHomeCollegeFact } from "@/lib/homeCollegeFact";

export const homeCollegeFactsQuery = queryOptions({
  queryKey: ["home-college-facts"],
  queryFn: async () => {
    const { data: colleges, error } = await supabase.from("colleges")
      .select("id,name,slug,ranking,fees,placement_avg,cutoff_info")
      .in("slug", ["iim-ahmedabad", "iim-bangalore", "iim-calcutta", "iim-lucknow", "iim-kozhikode", "iim-indore", "xlri-jamshedpur", "fms-delhi", "mdi-gurgaon", "spjimr-mumbai", "isb-hyderabad", "jbims-mumbai"])
      .order("ranking", { nullsFirst: false }).order("name");
    if (error) throw error;
    const rows = (colleges || []).filter(row => row.name?.trim() && row.slug?.trim());
    if (!rows.length) return [];
    const { data: sections, error: sectionError } = await supabase.from("college_sections")
      .select("college_id,section_type,version,data").in("college_id", rows.map(row => row.id))
      .eq("is_active", true).in("section_type", ["cutoff", "placements"]);
    if (sectionError) throw sectionError;
    return rows.map(college => projectHomeCollegeFact(college, (sections || []).filter(section => section.college_id === college.id)));
  },
});