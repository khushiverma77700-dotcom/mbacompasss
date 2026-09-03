import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, TrendingUp, MapPin, IndianRupee, ArrowRight, Sparkles } from "lucide-react";

type Row = {
  rank: number;
  name: string;
  slug: string;
  city: string;
  fees: string;
  cutoff: string;
  medianCTC: string;
  highlight?: string;
};

const IIMS: Row[] = [
  { rank: 1, name: "IIM Ahmedabad", slug: "iim-ahmedabad", city: "Ahmedabad", fees: "₹28.0 L", cutoff: "99.5%ile", medianCTC: "₹34.5 LPA", highlight: "Top NIRF #1" },
  { rank: 2, name: "IIM Bangalore", slug: "iim-bangalore", city: "Bangalore", fees: "₹27.5 L", cutoff: "99.0%ile", medianCTC: "₹33.8 LPA" },
  { rank: 3, name: "IIM Calcutta", slug: "iim-calcutta", city: "Kolkata", fees: "₹31.0 L", cutoff: "99.0%ile", medianCTC: "₹33.0 LPA" },
  { rank: 4, name: "IIM Lucknow", slug: "iim-lucknow", city: "Lucknow", fees: "₹21.5 L", cutoff: "97.5%ile", medianCTC: "₹30.4 LPA" },
  { rank: 5, name: "IIM Kozhikode", slug: "iim-kozhikode", city: "Kozhikode", fees: "₹22.5 L", cutoff: "97.0%ile", medianCTC: "₹31.0 LPA" },
  { rank: 6, name: "IIM Indore", slug: "iim-indore", city: "Indore", fees: "₹21.0 L", cutoff: "97.0%ile", medianCTC: "₹28.5 LPA" },
];

const PRIVATE: Row[] = [
  { rank: 1, name: "XLRI Jamshedpur", slug: "xlri-jamshedpur", city: "Jamshedpur", fees: "₹27.5 L", cutoff: "94+ XAT", medianCTC: "₹32.7 LPA", highlight: "XAT · HR flagship" },
  { rank: 2, name: "SPJIMR Mumbai", slug: "spjimr-mumbai", city: "Mumbai", fees: "₹22.0 L", cutoff: "85%ile CAT", medianCTC: "₹32.5 LPA" },
  { rank: 3, name: "MDI Gurgaon", slug: "mdi-gurgaon", city: "Gurgaon", fees: "₹24.0 L", cutoff: "95%ile CAT", medianCTC: "₹27.5 LPA" },
  { rank: 4, name: "SIBM Pune", slug: "sibm-pune", city: "Pune", fees: "₹22.5 L", cutoff: "98%ile SNAP", medianCTC: "₹26.5 LPA" },
  { rank: 5, name: "IMT Ghaziabad", slug: "imt-ghaziabad", city: "Ghaziabad", fees: "₹20.5 L", cutoff: "90%ile CAT", medianCTC: "₹18.9 LPA" },
  { rank: 6, name: "NMIMS Mumbai", slug: "nmims-mumbai", city: "Mumbai", fees: "₹23.5 L", cutoff: "220 NMAT", medianCTC: "₹22.2 LPA" },
];

const GOVT: Row[] = [
  { rank: 1, name: "FMS Delhi", slug: "fms-delhi", city: "Delhi", fees: "₹2.0 L", cutoff: "98%ile CAT", medianCTC: "₹34.3 LPA", highlight: "Best ROI" },
  { rank: 2, name: "JBIMS Mumbai", slug: "jbims-mumbai", city: "Mumbai", fees: "₹6.0 L", cutoff: "99.7 MAH-CET", medianCTC: "₹32.2 LPA" },
  { rank: 3, name: "DMS IIT Delhi", slug: "dms-iit-delhi", city: "Delhi", fees: "₹10.4 L", cutoff: "96%ile CAT", medianCTC: "₹24.5 LPA" },
  { rank: 4, name: "SJMSOM IIT Bombay", slug: "sjmsom-iit-bombay", city: "Mumbai", fees: "₹8.5 L", cutoff: "95%ile CAT", medianCTC: "₹25.8 LPA" },
  { rank: 5, name: "VGSOM IIT Kharagpur", slug: "vgsom-iit-kharagpur", city: "Kharagpur", fees: "₹5.5 L", cutoff: "90%ile CAT", medianCTC: "₹22.6 LPA" },
  { rank: 6, name: "DoMS IIT Madras", slug: "doms-iit-madras", city: "Chennai", fees: "₹8.0 L", cutoff: "94%ile CAT", medianCTC: "₹22.9 LPA" },
];

const GLOBAL: Row[] = [
  { rank: 1, name: "ISB Hyderabad", slug: "isb-hyderabad", city: "Hyderabad", fees: "₹41.8 L", cutoff: "GMAT 710+", medianCTC: "₹36.5 LPA", highlight: "1-year PGP" },
  { rank: 2, name: "Great Lakes Chennai", slug: "great-lakes-chennai", city: "Chennai", fees: "₹24.9 L", cutoff: "CAT/GMAT", medianCTC: "₹18.5 LPA" },
  { rank: 3, name: "SPJain Global", slug: "spjain-global", city: "Mumbai / Dubai", fees: "₹34.0 L", cutoff: "GMAT 650+", medianCTC: "₹19.2 LPA" },
  { rank: 4, name: "IIM Indore IPM", slug: "iim-indore-ipm", city: "Indore", fees: "₹35.0 L", cutoff: "IPMAT", medianCTC: "₹28.5 LPA" },
  { rank: 5, name: "MICA Ahmedabad", slug: "mica-ahmedabad", city: "Ahmedabad", fees: "₹22.0 L", cutoff: "CAT + MICAT", medianCTC: "₹15.5 LPA" },
  { rank: 6, name: "IIFT Delhi", slug: "iift-delhi", city: "Delhi", fees: "₹19.5 L", cutoff: "IIFT Exam", medianCTC: "₹25.1 LPA" },
];

const DEFAULT_TABS = [
  { id: "iim", label: "Top IIMs", rows: IIMS, note: "Baby & older IIMs · Flagship PGP/MBA" },
  { id: "private", label: "Top Private", rows: PRIVATE, note: "XLRI · SPJIMR · MDI · SIBM · IMT" },
  { id: "govt", label: "Top Government", rows: GOVT, note: "FMS · JBIMS · IITs · Central Univs" },
  { id: "global", label: "Global / 1-Year", rows: GLOBAL, note: "ISB · Great Lakes · SPJain · IPM" },
];

const MBALandscapeSection = () => {
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [active, setActive] = useState(DEFAULT_TABS[0].id);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("landscape_colleges")
        .select("category,rank,name,slug,city,fees,cutoff,average_package,highlight,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order").order("rank");
      if (!data || !data.length) return;
      const grouped: Record<string, Row[]> = { iim: [], private: [], govt: [], global: [] };
      for (const r of data as any[]) {
        if (!grouped[r.category]) continue;
        grouped[r.category].push({
          rank: r.rank, name: r.name, slug: r.slug,
          city: r.city || "", fees: r.fees || "", cutoff: r.cutoff || "",
          medianCTC: r.average_package || "", highlight: r.highlight || undefined,
        });
      }
      setTabs(DEFAULT_TABS.map((t) => grouped[t.id]?.length ? { ...t, rows: grouped[t.id] } : t));
    })();
  }, []);

  const current = tabs.find((t) => t.id === active)!;


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
            Category-wise view of India's top MBA programs — fees, cut-offs and placement medians curated from official brochures & audited placement reports.
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
            <div><TrendingUp className="inline w-3 h-3 mr-1" />Median CTC</div>
          </div>

          {current.rows.map((row) => (
            <Link
              key={row.slug}
              to={`/college/${row.slug}`}
              className="grid grid-cols-[auto_1fr] md:grid-cols-[60px_1.4fr_1fr_0.9fr_0.9fr_1fr] gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 border-b border-primary/5 last:border-0 hover:bg-sky-50/60 transition-colors group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-primary/15 to-sky-100 flex items-center justify-center">
                  <span className="font-heading font-extrabold text-primary text-sm md:text-base">#{row.rank}</span>
                </div>
              </div>
              <div className="min-w-0 md:col-span-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-foreground text-sm md:text-sm group-hover:text-primary transition-colors truncate">
                    {row.name}
                  </div>
                  {row.highlight && (
                    <span className="text-xs md:text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-[0.25rem]">
                      <Trophy className="inline w-2.5 h-2.5 mr-0.5 -mt-0.5" />{row.highlight}
                    </span>
                  )}
                </div>
                <div className="md:hidden mt-0.5 grid grid-cols-2 gap-1 text-xs text-muted-foreground leading-tight">
                  <div>{row.city} · {row.fees}</div>
                  <div>{row.cutoff} · <span className="text-emerald-700 font-semibold">{row.medianCTC}</span></div>
                </div>
              </div>
              <div className="hidden md:flex items-center text-xs md:text-sm text-foreground/70">{row.city}</div>
              <div className="hidden md:flex items-center text-xs md:text-sm font-semibold text-foreground">{row.fees}</div>
              <div className="hidden md:flex items-center text-xs md:text-sm text-foreground/70">{row.cutoff}</div>
              <div className="hidden md:flex items-center text-xs md:text-sm font-bold text-emerald-700">{row.medianCTC}</div>
            </Link>
          ))}
          </div>
        </div>


        <div className="text-center mt-6">
          <Link
            to="/colleges"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            View complete list of 2000+ B-Schools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MBALandscapeSection;
