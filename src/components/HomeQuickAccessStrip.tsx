import { Link } from "react-router-dom";
import {
  Building2, Scale, GraduationCap, Compass, ClipboardList, Gift,
  UserSearch, ListChecks, Calculator, Sigma, BookOpenCheck, Newspaper,
  ArrowUpRight, Sparkles,
} from "lucide-react";

type Item = {
  icon: any;
  label: string;
  sub: string;
  to: string;
  tone: string;
  tag?: "Free" | "New";
};

const ITEMS: Item[] = [
  { icon: Building2, label: "Explore Colleges", sub: "2000+ B-Schools", to: "/colleges", tone: "from-sky-100 to-sky-50" },
  { icon: Scale, label: "Compare Colleges", sub: "Side-by-side", to: "/compare", tone: "from-violet-100 to-violet-50" },
  { icon: GraduationCap, label: "Coaching Finder", sub: "Top coachings", to: "/coaching", tone: "from-teal-100 to-teal-50" },
  { icon: Compass, label: "MBA Compass", sub: "Paid courses", to: "/mba-compass", tone: "from-cyan-100 to-cyan-50" },
  { icon: ClipboardList, label: "Mock Tests", sub: "CAT · XAT · NMAT", to: "/mocks", tone: "from-blue-100 to-blue-50" },
  { icon: Gift, label: "Free Resources", sub: "PDFs · Notes", to: "/freebies", tone: "from-pink-100 to-pink-50" },
  { icon: UserSearch, label: "Profile Analyzer", sub: "AI evaluation", to: "/profile-analyzer", tone: "from-emerald-100 to-emerald-50", tag: "Free" },
  { icon: ListChecks, label: "College Shortlister", sub: "Smart match", to: "/college-shortlister", tone: "from-indigo-100 to-indigo-50", tag: "Free" },
  { icon: Calculator, label: "ROI Calculator", sub: "MBA payback", to: "/roi-calculator", tone: "from-amber-100 to-amber-50", tag: "Free" },
  { icon: Sigma, label: "CAT Score Calc", sub: "Percentile → score", to: "/cat-score-calculator", tone: "from-orange-100 to-orange-50", tag: "Free" },
  { icon: BookOpenCheck, label: "Formula Book", sub: "Quant essentials", to: "/formulas", tone: "from-lime-100 to-lime-50" },
  { icon: Newspaper, label: "Blog & News", sub: "Latest updates", to: "/blog", tone: "from-rose-100 to-rose-50" },
];

const HomeQuickAccessStrip = () => (
  <section className="relative -mt-8 md:-mt-10 z-20">
    <div className="container mx-auto px-4">
      <div className="rounded-2xl bg-white border border-primary/10 shadow-[0_10px_40px_-10px_rgba(14,165,233,0.25)] p-3 md:p-4">
        <div className="flex items-center justify-between px-1 pb-2 md:pb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Access &amp; Free Tools
          </div>
          <Link to="/freebies" className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
          {ITEMS.map(({ icon: Icon, label, sub, to, tone, tag }) => (
            <Link
              key={label}
              to={to}
              className="group relative flex flex-col items-center text-center gap-1.5 md:gap-2 rounded-xl p-2.5 md:p-3 hover:bg-sky-50/70 transition-colors"
            >
              {tag && (
                <span className="absolute top-1.5 left-1.5 text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20">
                  {tag}
                </span>
              )}
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${tone} flex items-center justify-center ring-1 ring-primary/10 group-hover:ring-primary/30 transition`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-xs md:text-sm font-bold text-foreground leading-tight">{label}</div>
                <div className="hidden md:block text-xs text-muted-foreground mt-0.5">{sub}</div>
              </div>
              <ArrowUpRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 absolute top-2 right-2 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HomeQuickAccessStrip;
