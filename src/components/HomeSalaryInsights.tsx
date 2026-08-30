import { Link } from "react-router-dom";
import { TrendingUp, IndianRupee, Briefcase, GraduationCap } from "lucide-react";

type Band = { label: string; schools: string; avg: number; top: number };

const BANDS: Band[] = [
  { label: "IIM ABC + ISB", schools: "IIM A / B / C, ISB", avg: 34, top: 60 },
  { label: "Older IIMs + XLRI", schools: "L, K, I, XLRI, FMS", avg: 27, top: 45 },
  { label: "Tier-1 Private", schools: "SPJIMR, MDI, IIFT, SIBM", avg: 22, top: 35 },
  { label: "New IIMs", schools: "Baby & new IIMs", avg: 17, top: 28 },
  { label: "Tier-2 B-schools", schools: "NMIMS, GIM, TAPMI, IMT", avg: 13, top: 22 },
];

const MAX = 60;

const STATS = [
  { icon: IndianRupee, value: "₹13–34 L", label: "Average CTC range across tiers" },
  { icon: TrendingUp, value: "3.1x", label: "Typical salary jump post-MBA" },
  { icon: Briefcase, value: "Consulting", label: "Highest paying recruiter sector" },
  { icon: GraduationCap, value: "2–3 yrs", label: "Median payback on fees" },
];

/**
 * Placement-salary benchmark bands. Rendered with CSS-only grow animation
 * (no chart library, no fetch) so it costs nothing at load time.
 */
const HomeSalaryInsights = () => (
  <section className="py-16 md:py-24 bg-white" id="home-salary">
    <div className="container mx-auto px-4">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <TrendingUp className="w-3.5 h-3.5" /> Placement Benchmarks
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
            What an MBA actually <span className="font-editorial italic text-primary">pays back</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-xl">
            Indicative average and top domestic CTC bands from latest published placement reports. Use them to
            sanity-check your shortlist before you pay a single application fee.
          </p>

          <ul className="space-y-4">
            {BANDS.map((b, i) => (
              <li key={b.label}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="font-heading text-sm md:text-base font-bold text-foreground">{b.label}</span>
                  <span className="text-xs md:text-sm font-semibold text-primary tabular-nums">
                    ₹{b.avg} L avg · ₹{b.top} L top
                  </span>
                </div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{b.schools}</p>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-sky-50">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/15"
                    style={{ width: `${(b.top / MAX) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 origin-left rounded-full bg-gradient-to-r from-primary to-sky-400 animate-[grow-x_1.1s_cubic-bezier(.22,1,.36,1)_both]"
                    style={{ width: `${(b.avg / MAX) * 100}%`, animationDelay: `${i * 90}ms` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <Link
            to="/colleges"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-sky-200/60 transition-transform hover:-translate-y-0.5"
          >
            Compare placement reports
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-primary/10 bg-gradient-to-br from-sky-50/70 via-white to-white p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-sky-200/40"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 shadow-md shadow-sky-200/60">
                <Icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
              </div>
              <p className="font-heading text-xl md:text-2xl font-extrabold text-foreground tabular-nums">{value}</p>
              <p className="mt-1 text-xs md:text-sm text-muted-foreground leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HomeSalaryInsights;
