import { normalizeCollegeSectionData } from "./collegeSectionData";
type Section = { section_type: string; version: string | null; data: unknown };
export function projectHomeCollegeFact<T extends { fees: string | null; placement_avg: string | null; cutoff_info: unknown }>(college: T, sections: Section[]) {
  const get = (type: string) => {
    const matched = sections.filter(section => section.section_type === type);
    return normalizeCollegeSectionData((matched.find(section => !section.version || section.version === "original") || matched[0])?.data);
  };
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
  return { ...college, placement_avg: String(college.placement_avg || ""), cutoffs };
}