import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, FlaskConical, CalendarCheck, BarChart3, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentNavBadges } from "@/hooks/useStudentNavBadges";

/**
 * Mobile-only bottom tab bar for the student dashboard.
 *
 * Sits above the safe-area inset so it looks native when installed.
 * Hidden on lg+ (sidebar takes over).
 */
const tabs = [
  { to: "/student", label: "Home", icon: LayoutDashboard, end: true, match: ["/student"] },
  {
    to: "/student/mocks/full-length",
    label: "Mocks",
    icon: FlaskConical,
    match: ["/student/mocks", "/student/daily-test", "/student/personalized-hub"],
  },
  { to: "/student/day-planner", label: "Planner", icon: CalendarCheck, match: ["/student/day-planner"] },
  {
    to: "/student/all-india-rank",
    label: "Insights",
    icon: BarChart3,
    match: ["/student/all-india-rank", "/student/performance", "/student/strength-areas", "/student/weak-areas", "/student/leaderboard"],
  },
  { to: "/student/profile", label: "Profile", icon: UserIcon, match: ["/student/profile"] },
];

export default function StudentBottomNav() {
  const location = useLocation();
  const { counts } = useStudentNavBadges();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_-8px_rgba(2,132,199,0.15)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Student bottom navigation"
    >
      <ul className="grid grid-cols-5 px-1 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match.some((m) =>
            tab.end ? location.pathname === m : location.pathname === m || location.pathname.startsWith(m + "/")
          );
          const badge = Object.entries(counts).reduce((sum, [route, n]) => {
            const matched = tab.match.some((m) => route === m || route.startsWith(m + "/"));
            return sum + (matched ? n : 0);
          }, 0);

          return (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2 mx-0.5 rounded-xl text-[10px] font-semibold transition-all duration-200",
                  isActive
                    ? "text-white bg-gradient-to-br from-sky-500 to-blue-600 shadow-md shadow-sky-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-[18px] w-[18px] transition-transform", isActive && "scale-110")} />
                  {badge > 0 && (
                    <span className={cn(
                      "absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold ring-2",
                      isActive
                        ? "bg-white text-rose-600 ring-sky-500"
                        : "bg-rose-500 text-white ring-card"
                    )}>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className="leading-none tracking-tight">{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
