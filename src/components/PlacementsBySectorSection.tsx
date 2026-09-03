import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Briefcase, TrendingUp, Building2, LineChart, ShoppingBag, Cpu, Banknote, Factory } from "lucide-react";

const ICONS: Record<string, any> = { Briefcase, TrendingUp, Building2, LineChart, ShoppingBag, Cpu, Banknote, Factory };
const DEFAULT_COLOR = "from-sky-500/10 to-sky-500/5 border-sky-500/20 text-sky-700";

type Sector = {
  icon: any;
  name: string;
  share: string;
  avgCTC: string;
  topCTC: string;
  recruiters: string[];
  color: string;
};

const SECTORS: Sector[] = [
  {
    icon: LineChart,
    name: "Consulting",
    share: "28%",
    avgCTC: "₹32–38 LPA",
    topCTC: "₹1.15 Cr",
    recruiters: ["McKinsey", "BCG", "Bain", "Kearney", "Accenture Strategy"],
    color: "from-sky-500/10 to-sky-500/5 border-sky-500/20 text-sky-700",
  },
  {
    icon: Banknote,
    name: "Investment Banking & Finance",
    share: "22%",
    avgCTC: "₹28–35 LPA",
    topCTC: "₹85 LPA",
    recruiters: ["Goldman Sachs", "JP Morgan", "Morgan Stanley", "Citi", "Nomura"],
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-700",
  },
  {
    icon: Cpu,
    name: "Product & Tech",
    share: "18%",
    avgCTC: "₹26–32 LPA",
    topCTC: "₹75 LPA",
    recruiters: ["Amazon", "Google", "Microsoft", "Flipkart", "Uber"],
    color: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-700",
  },
  {
    icon: ShoppingBag,
    name: "FMCG & Marketing",
    share: "12%",
    avgCTC: "₹22–28 LPA",
    topCTC: "₹42 LPA",
    recruiters: ["HUL", "P&G", "Nestlé", "ITC", "Marico"],
    color: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-700",
  },
  {
    icon: Building2,
    name: "General Management",
    share: "10%",
    avgCTC: "₹20–26 LPA",
    topCTC: "₹38 LPA",
    recruiters: ["Tata Group", "Aditya Birla", "Mahindra", "Reliance", "Adani"],
    color: "from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-700",
  },
  {
    icon: Factory,
    name: "Operations & Ops-Consulting",
    share: "10%",
    avgCTC: "₹20–24 LPA",
    topCTC: "₹35 LPA",
    recruiters: ["Delhivery", "Amazon Ops", "Reliance Retail", "Tata Steel", "Flipkart Ops"],
    color: "from-teal-500/10 to-teal-500/5 border-teal-500/20 text-teal-700",
  },
];

export default function PlacementsBySectorSection() {
  const [sectors, setSectors] = useState<Sector[]>(SECTORS);

  // Admin override from site_settings (managed via /admin/tables-manager)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_placements_by_sector")
        .maybeSingle();
      const items: any[] = Array.isArray((data?.value as any)?.items) ? (data!.value as any).items : [];
      if (cancelled || items.length === 0) return;
      const mapped: Sector[] = items
        .filter((r) => r?.name)
        .map((r, i) => ({
          icon: ICONS[r.icon] || SECTORS[i % SECTORS.length]?.icon || Briefcase,
          name: r.name,
          share: r.share || "",
          avgCTC: r.avgCTC || "",
          topCTC: r.topCTC || "",
          recruiters: Array.isArray(r.recruiters) ? r.recruiters : String(r.recruiters || "").split(/[,|]/).map((s: string) => s.trim()).filter(Boolean),
          color: SECTORS[i % SECTORS.length]?.color || DEFAULT_COLOR,
        }));
      setSectors(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="relative py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Briefcase className="w-3.5 h-3.5" /> Placements 2025 · Sector snapshot
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-3">
            Where <span className="font-editorial italic text-primary">top MBAs</span> actually land
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Sector share, salary bands and marquee recruiters — aggregated across the top-20 Indian B-School placement reports for the 2024–25 batch.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.name}
                className={`rounded-2xl border bg-gradient-to-br ${s.color} p-5 hover:shadow-lg transition-all`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sector share</div>
                    <div className="text-2xl font-extrabold text-foreground leading-none">{s.share}</div>
                  </div>
                </div>

                <div className="font-bold text-foreground text-lg mb-3">{s.name}</div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-lg bg-white/70 border border-white/60 px-3 py-2">
                    <div className="text-xs font-bold uppercase text-muted-foreground">Avg CTC</div>
                    <div className="text-sm font-extrabold text-foreground">{s.avgCTC}</div>
                  </div>
                  <div className="rounded-lg bg-white/70 border border-white/60 px-3 py-2">
                    <div className="text-xs font-bold uppercase text-muted-foreground">Top CTC</div>
                    <div className="text-sm font-extrabold text-emerald-700">{s.topCTC}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Top recruiters</div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.recruiters.map((r) => (
                      <span
                        key={r}
                        className="text-xs font-semibold bg-white/80 border border-white/70 text-foreground/80 px-2 py-0.5 rounded-md"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-6xl mx-auto mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5 text-primary" /> Aggregated from IIM A/B/C, XLRI, MDI, SPJIMR, FMS, ISB & IIFT 2025 reports.
          </div>
          <Link to="/colleges" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            View college-wise placement reports →
          </Link>
        </div>
      </div>
    </section>
  );
}
