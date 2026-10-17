import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { projectHomeCollegeFact } from "@/lib/homeCollegeFact";
import { formatMoney, formatRank } from "@/lib/collegeMetrics";
import { Link } from "@/lib/router-compat";
import { TrendingUp, MapPin, IndianRupee, ArrowRight, Sparkles } from "lucide-react";

type Row = {
  rank: string;
  name: string;
  slug: string;
  city: string;
  fees: string;
  cutoff: string;
  avgCTC: string;
};

const TABS = [
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

const MBALandscapeSection = () => {
  const { data: bySlug } = useSuspenseQuery(landscapeCollegesQuery);
  const tabs = TABS.map(t => ({ ...t, rows: t.slugs.map(s => bySlug[s]).filter(Boolean) as Row[] })).filter(t => t.rows.length);
  const [active, setActive] = useState(TABS[0].id);
  if (!tabs.length) return null;

  const current = tabs.find((t) => t.id === active) || tabs[0];


  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-b from-white via-sky-50/40 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> The MBA Landscape 2026
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-3">
            Every B-School that <span className="font-editorial italic text-primary">matters</span>, at a glance
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Category-wise view of India's top MBA programs — fees, recorded cut-offs and average CTC from each college profile.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-all border ${
                active === t.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                  : "bg-white text-foreground/70 border-primary/15 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mb-4">{current.note}</p>

        {/* Table */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-primary/10 bg-white shadow-[0_10px_40px_-15px_rgba(14,165,233,0.2)] overflow-hidden">
          <div
            className="max-h-[540px] overflow-y-auto focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-b-2xl"
            tabIndex={0}
            role="region"
            aria-label="B-Schools table, scrollable"
          >
          <div className="hidden md:grid grid-cols-[60px_1.4fr_1fr_0.9fr_0.9fr_1fr] gap-3 px-4 py-2.5 bg-sky-50/95 backdrop-blur border-b border-primary/10 text-xs font-bold uppercase tracking-wider text-primary/80 sticky top-0 z-10">

            <div>Rank</div>
            <div>B-School</div>
            <div><MapPin className="inline w-3 h-3 mr-1" />Location</div>
            <div><IndianRupee className="inline w-3 h-3 mr-1" />Fees</div>
            <div>Cutoff</div>
            <div><TrendingUp className="inline w-3 h-3 mr-1" />Avg CTC</div>
          </div>

          {current.rows.map((row) => (
            <Link
              key={row.slug}
              to={`/college/${row.slug}`}
              className="grid grid-cols-[auto_1fr] md:grid-cols-[60px_1.4fr_1fr_0.9fr_0.9fr_1fr] gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 border-b border-primary/5 last:border-0 hover:bg-sky-50/60 transition-colors group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-primary/15 to-sky-100 flex items-center justify-center">
                  <span className="font-heading font-extrabold text-primary text-sm md:text-base">{row.rank || "—"}</span>
                </div>
              </div>
              <div className="min-w-0 md:col-span-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-foreground text-sm md:text-sm group-hover:text-primary transition-colors truncate">
                    {row.name}
                  </div>
                </div>
                <div className="md:hidden mt-0.5 grid grid-cols-2 gap-1 text-xs text-muted-foreground leading-tight">
                  <div>{row.city} · {row.fees}</div>
                  <div>{row.cutoff} · <span className="text-emerald-700 font-semibold">{row.avgCTC}</span></div>
                </div>
              </div>
              <div className="hidden md:flex items-center text-xs md:text-sm text-foreground/70">{row.city}</div>
              <div className="hidden md:flex items-center text-xs md:text-sm font-semibold text-foreground">{row.fees}</div>
              <div className="hidden md:flex items-center text-xs md:text-sm text-foreground/70">{row.cutoff}</div>
              <div className="hidden md:flex items-center text-xs md:text-sm font-bold text-emerald-700">{row.avgCTC}</div>
            </Link>
          ))}
          </div>
        </div>


        <div className="text-center mt-6">
          <Link
            to="/colleges"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            View complete list of 5,000+ B-Schools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MBALandscapeSection;
