import { queryOptions } from "@tanstack/react-query";
import { projectHomeCollegeFact } from "@/lib/homeCollegeFact";
import { formatMoney, formatRank } from "@/lib/collegeMetrics";

export type Row = {
  rank: string;
  name: string;
  slug: string;
  city: string;
  fees: string;
  cutoff: string;
  avgCTC: string;
};

export const TABS = [
  { id: "iim", label: "Top IIMs", note: "Flagship IIM PGP/MBA programmes", slugs: ["iim-ahmedabad", "iim-bangalore", "iim-calcutta", "iim-lucknow", "iim-kozhikode", "iim-indore"] },
  { id: "private", label: "Top Private", note: "XLRI · SPJIMR · MDI · SIBM · IMT · NMIMS", slugs: ["xlri-jamshedpur", "spjimr-mumbai", "mdi-gurgaon", "sibm-pune", "imt-ghaziabad", "nmims-mumbai"] },
  { id: "govt", label: "Top Government", note: "FMS · JBIMS · IIT management schools", slugs: ["fms-delhi", "jbims-mumbai", "dms-iit-delhi", "sjmsom-iit-bombay", "vgsom-iit-kharagpur", "doms-iit-madras"] },
  { id: "global", label: "Global / 1-Year", note: "ISB · Great Lakes · SPJain · IPM · MICA · IIFT", slugs: ["isb-hyderabad", "great-lakes-chennai", "spjain-global", "iim-indore-ipm", "mica-ahmedabad", "iift-delhi"] },
];

/** Same college records, fields and formatting as /colleges and each college page. */
export const landscapeCollegesQuery = queryOptions({
  queryKey: ["home-landscape-colleges"],
  queryFn: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const slugs = TABS.flatMap(t => t.slugs);
    const { data, error } = await supabase.from("colleges").select("id,name,slug,city,ranking,fees,placement_avg,cutoff_info").in("slug", slugs);
    if (error) throw error;
    const rows = (data || []).filter(r => r.name?.trim() && r.slug?.trim());
    const { data: sections } = rows.length
      ? await supabase.from("college_sections").select("college_id,section_type,version,data").in("college_id", rows.map(r => r.id)).eq("is_active", true).eq("section_type", "cutoff")
      : { data: [] };
    const bySlug: Record<string, Row> = {};
    for (const r of rows) {
      const fact = projectHomeCollegeFact(r, (sections || []).filter(s => s.college_id === r.id));
      const general = fact.cutoffs.find(c => /general/i.test(c.category)) || fact.cutoffs[0];
      bySlug[r.slug] = {
        rank: formatRank(r.ranking), name: r.name, slug: r.slug, city: r.city || "",
        fees: formatMoney(r.fees) || "Not disclosed",
        cutoff: general ? [general.percentile, general.exam].filter(Boolean).join(" ") : "Not disclosed",
        avgCTC: formatMoney(r.placement_avg) || "Not disclosed",
      };
    }
    return bySlug;
  },
});

