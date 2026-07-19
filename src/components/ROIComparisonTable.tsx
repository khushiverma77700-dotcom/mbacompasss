import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { TrendingUp, IndianRupee, ArrowRight, BadgeCheck } from "lucide-react";

type Row = {
  college: string;
  slug?: string;
  fees: number; // in lakhs
  avgCtc: number; // in lakhs
  payback: string;
  tag: "Elite" | "Premium" | "Value";
};

const DEFAULT_ROWS: Row[] = [
  { college: "IIM Ahmedabad", slug: "iim-ahmedabad", fees: 24.5, avgCtc: 35.2, payback: "0.7 yrs", tag: "Elite" },
  { college: "IIM Bangalore", slug: "iim-bangalore", fees: 24.0, avgCtc: 34.5, payback: "0.7 yrs", tag: "Elite" },
  { college: "IIM Calcutta", slug: "iim-calcutta", fees: 27.0, avgCtc: 33.7, payback: "0.8 yrs", tag: "Elite" },
  { college: "ISB Hyderabad", slug: "isb-hyderabad", fees: 41.7, avgCtc: 36.5, payback: "1.1 yrs", tag: "Premium" },
  { college: "XLRI Jamshedpur", slug: "xlri-jamshedpur", fees: 26.0, avgCtc: 32.7, payback: "0.8 yrs", tag: "Elite" },
  { college: "FMS Delhi", slug: "fms-delhi", fees: 2.0, avgCtc: 34.4, payback: "0.06 yrs", tag: "Value" },
  { college: "IIM Lucknow", slug: "iim-lucknow", fees: 21.0, avgCtc: 30.2, payback: "0.7 yrs", tag: "Elite" },
  { college: "MDI Gurgaon", slug: "mdi-gurgaon", fees: 24.6, avgCtc: 26.4, payback: "0.9 yrs", tag: "Premium" },
  { college: "SPJIMR Mumbai", slug: "spjimr-mumbai", fees: 21.5, avgCtc: 33.1, payback: "0.7 yrs", tag: "Premium" },
  { college: "JBIMS Mumbai", slug: "jbims-mumbai", fees: 6.0, avgCtc: 32.7, payback: "0.2 yrs", tag: "Value" },
];

const tagStyle: Record<Row["tag"], string> = {
  Elite: "bg-primary/10 text-primary ring-primary/20",
  Premium: "bg-amber-100 text-amber-800 ring-amber-300/60",
  Value: "bg-emerald-100 text-emerald-800 ring-emerald-300/60",
};

const ROIComparisonTable = () => {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_roi_comparison")
        .maybeSingle();
      const v: any = data?.value;
      if (Array.isArray(v?.items) && v.items.length) {
        setRows(v.items.map((r: any) => ({
          ...r,
          fees: typeof r.fees === "number" ? r.fees : parseFloat(r.fees) || 0,
          avgCtc: typeof r.avgCtc === "number" ? r.avgCtc : parseFloat(r.avgCtc) || 0,
        })));
      }
    })();
  }, []);

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" /> ROI Snapshot 2026
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mt-3 text-foreground">
              Fees vs Average CTC — Top B-Schools
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Real payback periods based on latest published placement reports & fee structures.
            </p>
          </div>
          <Link
            to="/roi-calculator"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
          >
            Calculate your ROI <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-primary/10 bg-white shadow-[0_10px_40px_-20px_rgba(14,165,233,0.35)] overflow-hidden">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-sky-50/95 backdrop-blur border-b border-primary/10 sticky top-0 z-10">

                <tr className="text-left text-[11px] uppercase tracking-wider text-primary/80">
                  <th className="py-3 px-4 font-semibold">B-School</th>
                  <th className="py-3 px-4 font-semibold text-right"><span className="inline-flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Fees</span></th>
                  <th className="py-3 px-4 font-semibold text-right">Avg CTC</th>
                  <th className="py-3 px-4 font-semibold text-right">Payback</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">Tier</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.college}
                    className={`border-b border-primary/5 hover:bg-sky-50/40 transition-colors ${i === rows.length - 1 ? "border-b-0" : ""}`}
                  >
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {r.slug ? (
                        <Link to={`/college/${r.slug}`} className="hover:text-primary inline-flex items-center gap-1.5">
                          {r.college}
                          <BadgeCheck className="w-3.5 h-3.5 text-primary/60" />
                        </Link>
                      ) : r.college}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">₹{r.fees.toFixed(1)} L</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-700">₹{r.avgCtc.toFixed(1)} L</td>
                    <td className="py-3 px-4 text-right tabular-nums text-primary font-semibold">{r.payback}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${tagStyle[r.tag]}`}>
                        {r.tag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-sky-50/50 text-[11px] text-muted-foreground border-t border-primary/5">
            Payback = Fees ÷ Avg CTC. Approximate figures based on latest institute placement reports.
          </div>
        </div>
      </div>
    </section>
  );
};

export default ROIComparisonTable;
