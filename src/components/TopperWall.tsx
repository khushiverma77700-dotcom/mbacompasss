import { Star, Quote, TrendingUp, Award } from "lucide-react";

type Topper = {
  name: string;
  batch: string;
  percentile: string;
  converted: string;
  quote: string;
  avatar: string;
};

const TOPPERS: Topper[] = [
  {
    name: "Ananya Kapoor",
    batch: "MBA 2025-27",
    percentile: "99.87 %ile",
    converted: "IIM Ahmedabad",
    quote: "MBA Compass's shortlister gave me a realistic list of 8 schools. Cracked 6 interviews.",
    avatar: "AK",
  },
  {
    name: "Rohan Mehta",
    batch: "MBA 2024-26",
    percentile: "99.62 %ile",
    converted: "IIM Bangalore",
    quote: "Profile Analyzer flagged my average acads early. Rebuilt my ECs — got the call.",
    avatar: "RM",
  },
  {
    name: "Sneha Reddy",
    batch: "MBA 2025-27",
    percentile: "99.45 %ile",
    converted: "SPJIMR Mumbai",
    quote: "The ROI calculator convinced my parents about the fee. Payback in 8 months, not 3 years.",
    avatar: "SR",
  },
  {
    name: "Aditya Sharma",
    batch: "MBA 2024-26",
    percentile: "99.71 %ile",
    converted: "XLRI Jamshedpur",
    quote: "Compared 12 coaching institutes in one afternoon. Saved ₹40k on my prep.",
    avatar: "AS",
  },
];

const TopperWall = () => (
  <section className="py-12 md:py-16 bg-white">
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center mb-8 md:mb-10">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
          <Award className="w-3.5 h-3.5" /> Toppers of 2025
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mt-3 text-foreground">
          Real students. Real IIM calls.
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-2">
          420+ students converted an IIM, ISB, XLRI or FMS call using MBA Compass tools this year.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOPPERS.map((t) => (
          <article
            key={t.name}
            className="relative rounded-2xl bg-gradient-to-b from-sky-50/60 to-white border border-primary/10 p-5 hover:-translate-y-1 hover:shadow-[0_20px_45px_-20px_rgba(14,165,233,0.35)] transition-all"
          >
            <Quote className="absolute top-4 right-4 w-6 h-6 text-primary/15" />
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center font-bold text-white text-sm shadow-inner">
                {t.avatar}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-foreground truncate">{t.name}</div>
                <div className="text-[11px] text-muted-foreground">{t.batch}</div>
              </div>
            </div>

            <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed italic">
              "{t.quote}"
            </p>

            <div className="mt-4 pt-3 border-t border-primary/10 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CAT</div>
                <div className="text-sm font-bold text-primary inline-flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> {t.percentile}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Converted</div>
                <div className="text-sm font-bold text-emerald-700">{t.converted}</div>
              </div>
            </div>

            <div className="flex gap-0.5 mt-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default TopperWall;
