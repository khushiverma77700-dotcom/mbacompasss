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
    to: "/student/performance",
    label: "Insights",
    icon: BarChart3,
    match: ["/student/performance", "/student/strength-areas", "/student/weak-areas", "/student/leaderboard"],
  },
  { to: "/student/profile", label: "Profile", icon: UserIcon, match: ["/student/profile"] },
];

export default function StudentBottomNav() {
  const location = useLocation();
  const { counts } = useStudentNavBadges();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Student bottom navigation"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match.some((m) =>
            tab.end ? location.pathname === m : location.pathname === m || location.pathname.startsWith(m + "/")
          );
          // Aggregate any badge belonging to a route that matches this tab.
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
                  "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-sky-600 dark:text-sky-300"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-2 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className="leading-none">{tab.label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
