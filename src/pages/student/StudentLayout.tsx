import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  BookOpenCheck,
  BarChart3,
  Target,
  Bell,
  Sparkles,
  User as UserIcon,
  Menu,
  X,
  LogOut,
  GraduationCap,
  ShoppingBag,
  Trophy,
  Receipt,
  CalendarDays,
  CalendarCheck,
  LifeBuoy,
  ChevronDown,
  Layers,
  BookOpen,
  Repeat,
  History,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/student/NotificationBell";
import ThemeToggle from "@/components/student/ThemeToggle";
import { StudentThemeProvider } from "@/contexts/StudentThemeContext";
import { useEnrolledBundleFeatures } from "@/hooks/useEnrolledBundleFeatures";
import type { FeatureKey } from "@/lib/courseFeatures";
import { useStudentNavBadges } from "@/hooks/useStudentNavBadges";

type NavItem = { to: string; label: string; icon: any; end?: boolean; feature?: FeatureKey };

// "My Mocks" — single, self-explanatory group containing every mock-related section.
// Order matters: most-used first.
const mocksGroup: NavItem[] = [
  { to: "/student/daily-test",        label: "Daily Tests",       icon: CalendarDays, feature: "daily_tests" },
  { to: "/student/mocks/full-length", label: "Full-Length Mocks", icon: Layers,       feature: "daily_mocks" },
  { to: "/student/mocks/sectional",   label: "Sectional Mocks",   icon: Target,       feature: "daily_mocks" },
  { to: "/student/mocks/topic-wise",  label: "Topic-wise Tests",  icon: BookOpen,     feature: "daily_mocks" },
  { to: "/student/mocks/practice",    label: "Practice Sets",     icon: Repeat,       feature: "daily_mocks" },
  { to: "/student/personalized-hub",  label: "Personalized Hub",  icon: Sparkles,     feature: "personalized_hub" },
  { to: "/student/mocks/attempted",   label: "Previous Attempts", icon: History,      feature: "performance_tracker" },
];

const navItems: NavItem[] = [
  { to: "/student", label: "Overview", icon: LayoutDashboard, end: true },
  // "My Mocks" group is rendered separately as an expandable section.
  { to: "/student/buy-mocks", label: "Buy Mocks", icon: ShoppingBag, feature: "buy_mocks" },
  { to: "/student/performance", label: "Performance", icon: BarChart3, feature: "performance_tracker" },
  { to: "/student/goals", label: "CAT Score Engine", icon: Target, feature: "study_planner" },
  { to: "/student/day-planner", label: "My Day Planner", icon: CalendarCheck, feature: "day_planner" },
  { to: "/student/leaderboard", label: "Leaderboard", icon: Trophy, feature: "leaderboard" },
  { to: "/student/orders", label: "My Orders", icon: Receipt },
  { to: "/student/announcements", label: "Announcements", icon: Bell },
  { to: "/student/tools", label: "AI Tools", icon: Sparkles, feature: "ai_tools" },
  { to: "/student/support", label: "Support Center", icon: LifeBuoy, feature: "support" },
  { to: "/student/profile", label: "My Profile", icon: UserIcon },
];

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=" + encodeURIComponent(location.pathname));
  }, [loading, user, navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? "Student"));
  }, [user]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (loading || !user) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <StudentThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 dark:from-background dark:via-background dark:to-background text-foreground">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-md hover:bg-accent"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link to="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Student Dashboard</div>
                  <div className="text-[10px] text-muted-foreground">MBA Compass LMS</div>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
              <div className="hidden sm:block text-right">
                <div className="text-xs text-muted-foreground">Welcome</div>
                <div className="text-sm font-medium">{displayName}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }}
              >
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar - desktop: FIXED. Scrolls independently of main content. */}
          <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-card/80 backdrop-blur fixed left-0 top-14 bottom-0 overflow-y-auto z-20">
            <SidebarContent />
          </aside>

          {/* Sidebar - mobile drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
              <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card shadow-xl border-r border-border pt-14 overflow-y-auto">
                <SidebarContent />
              </aside>
            </div>
          )}

          {/* Main — offset by sidebar width on desktop so layout doesn't overlap */}
          <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:ml-64">
            <Outlet />
          </main>
        </div>
      </div>
    </StudentThemeProvider>
  );
}

function SidebarContent() {
  const { counts, markSeen } = useStudentNavBadges();
  const { isEnabled, loading: featuresLoading } = useEnrolledBundleFeatures();
  // Hide locked items entirely once features have loaded.
  const visibleItems = navItems.filter((item) => {
    if (!item.feature) return true;
    if (featuresLoading) return true;
    return isEnabled(item.feature);
  });
  return (
    <nav className="w-full p-4 space-y-1">
      {visibleItems.map((item) => {
        const badge = counts[item.to] ?? 0;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => badge > 0 && markSeen(item.to)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-gradient-to-r from-sky-100 to-blue-50 text-sky-700 shadow-sm dark:from-sky-500/15 dark:to-blue-500/10 dark:text-sky-200"
                  : "text-foreground/80 hover:bg-accent hover:text-foreground"
              )
            }
          >
            <span className="relative">
              <item.icon className="h-4 w-4" />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-card" />
                </span>
              )}
            </span>
            <span className="flex-1">{item.label}</span>
            {badge > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </NavLink>
        );
      })}
      <div className="pt-4 mt-4 border-t border-border">
        <Link
          to="/mocks"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2"
        >
          Browse all mocks →
        </Link>
      </div>
    </nav>
  );
}
