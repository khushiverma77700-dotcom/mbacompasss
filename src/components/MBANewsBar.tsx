import { Newspaper, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const NEWS = [
  { tag: "CAT 2026", text: "IIM Kozhikode releases official CAT 2026 notification & exam calendar", href: "/exam/cat" },
  { tag: "XAT 2026", text: "XLRI opens XAT 2026 registrations — key dates and syllabus changes", href: "/exam/xat" },
  { tag: "IIM-A", text: "IIM Ahmedabad PGP 2026-28 shortlist criteria & Academic Rating weightage", href: "/college/iim-ahmedabad" },
  { tag: "Placements", text: "ISB Hyderabad Class of 2025 posts highest median CTC of ₹36.5 LPA", href: "/college/isb-hyderabad" },
  { tag: "SNAP", text: "Symbiosis announces 3-slot SNAP 2026 with revised marking scheme", href: "/exam/snap" },
  { tag: "NMAT", text: "NMIMS opens NMAT by GMAC 2026 registrations — 75-day testing window", href: "/exam/nmat" },
  { tag: "GMAT", text: "GMAC confirms GMAT Focus Edition as default from Q1 2026 globally", href: "/exam/gmat" },
  { tag: "FMS", text: "FMS Delhi shortlist ratio widens for CAT 2025 aspirants across categories", href: "/college/fms-delhi" },
];

const MBANewsBar = () => {
  const loop = [...NEWS, ...NEWS];
  return (
    <div className="relative border-y border-primary/15 bg-gradient-to-r from-sky-50 via-white to-sky-50">
      <div className="container mx-auto px-4">
        <div className="flex items-stretch gap-4 py-2.5">
          <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-primary/15">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <Newspaper className="w-4 h-4 text-primary" />
            <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-primary">
              MBA Newsroom
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="flex gap-10 whitespace-nowrap animate-[marquee_50s_linear_infinite] hover:[animation-play-state:paused]">
              {loop.map((n, i) => (
                <Link
                  key={i}
                  to={n.href}
                  className="inline-flex items-center gap-2 text-xs md:text-sm text-foreground/80 hover:text-primary transition-colors"
                >
                  <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {n.tag}
                  </span>
                  <span className="font-medium">{n.text}</span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </Link>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-sky-50 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-sky-50 to-transparent" />
          </div>
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
};

export default MBANewsBar;
