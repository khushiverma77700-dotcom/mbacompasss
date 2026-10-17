import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCollegeSectionData } from "@/lib/collegeSectionData";

export const homeCollegeFactsQuery = queryOptions({
  queryKey: ["home-college-facts"],
  queryFn: async () => {
    const { data: colleges, error } = await supabase.from("colleges")
      .select("id,name,slug,ranking,fees,placement_avg,cutoff_info")
      .not("ranking", "is", null).order("ranking").limit(12);
    if (error) throw error;
    const rows = (colleges || []).filter(row => row.name?.trim() && row.slug?.trim());
    if (!rows.length) return [];
    const { data: sections, error: sectionError } = await supabase.from("college_sections")
      .select("college_id,section_type,version,data").in("college_id", rows.map(row => row.id))
      .eq("is_active", true).in("section_type", ["cutoff", "placements"]);
    if (sectionError) throw sectionError;
    return rows.map(college => {
      const get = (type: string) => {
        const matched = (sections || []).filter(section => section.college_id === college.id && section.section_type === type);
        return normalizeCollegeSectionData((matched.find(section => !section.version || section.version === "original") || matched[0])?.data);
      };
      const placement = get("placements");
      const cutoff = get("cutoff");
      const cutoffs: { category: string; exam: string; year: string; percentile: string }[] = [];
      if (Array.isArray(cutoff.cutoffs) && cutoff.cutoffs.length) {
        for (const item of cutoff.cutoffs) {
          if (!item || typeof item !== "object") continue;
          const value = item as Record<string, unknown>;
          cutoffs.push({ category: String(value.category || ""), exam: String(value.exam || ""), year: String(value.year || ""), percentile: String(value.percentile || "") });
        }
      } else if (college.cutoff_info && typeof college.cutoff_info === "object" && !Array.isArray(college.cutoff_info)) {
        for (const [category, value] of Object.entries(college.cutoff_info)) {
          if (typeof value === "string" || typeof value === "number") cutoffs.push({ category, exam: "", year: "", percentile: String(value) });
        }
      }
      return { ...college, placement_avg: String(placement.avg_package || college.placement_avg || ""), cutoffs };
    });
  },
});