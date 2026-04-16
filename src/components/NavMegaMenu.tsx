import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, GraduationCap, Building2, MapPin, Star, Trophy, Landmark, BookOpen, Users, Award, Globe, Layers } from "lucide-react";

interface MegaMenuColumn {
  title: string;
  icon: React.ReactNode;
  links: { label: string; path: string }[];
}

interface MegaMenuProps {
  label: string;
  columns: MegaMenuColumn[];
  onNavigate?: () => void;
}

const NavMegaMenu = ({ label, columns, onNavigate }: MegaMenuProps) => {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const ref = useRef<HTMLDivElement>(null);

  const enter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };

  const leave = () => {
    timeout.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => () => clearTimeout(timeout.current), []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button
        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onFocus={enter}
      >
        {label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl min-w-[640px] max-w-[820px] p-6 grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {columns.map((col) => (
              <div key={col.title}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                  <span className="text-primary">{col.icon}</span>
                  <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
                </div>
                <ul className="space-y-1">
                  {col.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        onClick={() => { setOpen(false); onNavigate?.(); }}
                        className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-accent/60 rounded-md transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const collegeMenuColumns: MegaMenuColumn[] = [
  {
    title: "By Category",
    icon: <Landmark className="w-4 h-4" />,
    links: [
      { label: "IIM Colleges", path: "/colleges?tier=IIM" },
      { label: "Non-IIM Top Colleges", path: "/colleges?tier=Tier 1" },
      { label: "Tier 2 Colleges", path: "/colleges?tier=Tier 2" },
      { label: "Private B-Schools", path: "/colleges?type=Private" },
      { label: "Government Colleges", path: "/colleges?type=Government" },
      { label: "All Colleges", path: "/colleges" },
    ],
  },
  {
    title: "City Wise",
    icon: <MapPin className="w-4 h-4" />,
    links: [
      { label: "MBA in Mumbai", path: "/colleges?city=Mumbai" },
      { label: "MBA in Delhi", path: "/colleges?city=Delhi" },
      { label: "MBA in Bangalore", path: "/colleges?city=Bangalore" },
      { label: "MBA in Pune", path: "/colleges?city=Pune" },
      { label: "MBA in Hyderabad", path: "/colleges?city=Hyderabad" },
      { label: "MBA in Chennai", path: "/colleges?city=Chennai" },
    ],
  },
  {
    title: "Featured & Tools",
    icon: <Star className="w-4 h-4" />,
    links: [
      { label: "Featured Colleges", path: "/colleges?featured=true" },
      { label: "College Shortlister", path: "/college-shortlister" },
      { label: "College Finder (AI)", path: "/college-finder" },
      { label: "Compare Colleges", path: "/compare" },
      { label: "Profile Analyzer", path: "/profile-analyzer" },
    ],
  },
];

export const coachingMenuColumns: MegaMenuColumn[] = [
  {
    title: "By Exam",
    icon: <BookOpen className="w-4 h-4" />,
    links: [
      { label: "CAT Coaching", path: "/category/cat" },
      { label: "GMAT Coaching", path: "/category/gmat" },
      { label: "XAT Coaching", path: "/category/xat" },
      { label: "NMAT Coaching", path: "/category/nmat" },
      { label: "CMAT Coaching", path: "/category/cmat" },
      { label: "All Categories", path: "/category/cat" },
    ],
  },
  {
    title: "By City",
    icon: <MapPin className="w-4 h-4" />,
    links: [
      { label: "Coaching in Mumbai", path: "/category/cat?city=Mumbai" },
      { label: "Coaching in Delhi", path: "/category/cat?city=Delhi" },
      { label: "Coaching in Bangalore", path: "/category/cat?city=Bangalore" },
      { label: "Coaching in Pune", path: "/category/cat?city=Pune" },
      { label: "Coaching in Hyderabad", path: "/category/cat?city=Hyderabad" },
      { label: "Online Coaching", path: "/category/cat?mode=Online" },
    ],
  },
  {
    title: "Top Picks",
    icon: <Trophy className="w-4 h-4" />,
    links: [
      { label: "Featured Institutes", path: "/#featured" },
      { label: "Coaching of the Week", path: "/#coaching-of-week" },
      { label: "AI Coaching Finder", path: "/#ai-coaching" },
      { label: "Success Stories", path: "/#testimonials" },
    ],
  },
];

export default NavMegaMenu;
