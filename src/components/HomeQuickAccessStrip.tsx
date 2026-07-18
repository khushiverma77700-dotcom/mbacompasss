import { Link } from "react-router-dom";
import {
  Building2, BookOpen, Trophy, Target, Scale, Compass,
  GraduationCap, Gift, ArrowUpRight
} from "lucide-react";

const ITEMS = [
  { icon: Building2, label: "Explore Colleges", sub: "2000+ B-Schools", to: "/colleges", tone: "from-sky-100 to-sky-50" },
  { icon: BookOpen, label: "MBA Exams", sub: "CAT · XAT · SNAP", to: "/exams", tone: "from-blue-100 to-blue-50" },
  { icon: Trophy, label: "Rankings 2026", sub: "NIRF · Category-wise", to: "/rankings", tone: "from-amber-100 to-amber-50" },
  { icon: Target, label: "Predict Your Call", sub: "AI-based predictor", to: "/tools/predictor", tone: "from-emerald-100 to-emerald-50" },
  { icon: Scale, label: "Compare Colleges", sub: "Side-by-side", to: "/compare", tone: "from-violet-100 to-violet-50" },
  { icon: Compass, label: "MBA Compass", sub: "Paid Courses", to: "/mba-compass", tone: "from-cyan-100 to-cyan-50" },
  { icon: GraduationCap, label: "Coaching Finder", sub: "AI Match", to: "/ai-coaching-finder", tone: "from-teal-100 to-teal-50" },
  { icon: Gift, label: "Free Resources", sub: "PDFs · Notes", to: "/freebies", tone: "from-pink-100 to-pink-50" },
];

const HomeQuickAccessStrip = () => (
  <section className="relative -mt-8 md:-mt-10 z-20">
    <div className="container mx-auto px-4">
      <div className="rounded-2xl bg-white border border-primary/10 shadow-[0_10px_40px_-10px_rgba(14,165,233,0.25)] p-3 md:p-4">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
          {ITEMS.map(({ icon: Icon, label, sub, to, tone }) => (
            <Link
              key={label}
              to={to}
              className="group relative flex flex-col items-center text-center gap-1.5 md:gap-2 rounded-xl p-2.5 md:p-3 hover:bg-sky-50/70 transition-colors"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${tone} flex items-center justify-center ring-1 ring-primary/10 group-hover:ring-primary/30 transition`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[11px] md:text-[13px] font-bold text-foreground leading-tight">{label}</div>
                <div className="hidden md:block text-[10px] text-muted-foreground mt-0.5">{sub}</div>
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
