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
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/student/NotificationBell";
import ThemeToggle from "@/components/student/ThemeToggle";
import { StudentThemeProvider } from "@/contexts/StudentThemeContext";
import { useEnrolledBundleFeatures } from "@/hooks/useEnrolledBundleFeatures";
import type { FeatureKey } from "@/lib/courseFeatures";
import { useStudentNavBadges } from "@/hooks/useStudentNavBadges";
import { markStudentMode, clearStudentMode } from "@/lib/studentModeNav";

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
  { to: "/student/notifications", label: "Updates", icon: Bell },
  // "My Mocks" group is rendered separately as an expandable section.
  { to: "/student/buy-mocks", label: "Buy Mocks", icon: ShoppingBag, feature: "buy_mocks" },
  { to: "/student/performance", label: "Performance", icon: BarChart3, feature: "performance_tracker" },
  { to: "/student/goals", label: "CAT Score Engine", icon: Target, feature: "study_planner" },
  { to: "/student/day-planner", label: "My Day Planner", icon: CalendarCheck, feature: "day_planner" },
  { to: "/student/leaderboard", label: "Leaderboard", icon: Trophy, feature: "leaderboard" },
  { to: "/student/orders", label: "My Orders", icon: Receipt },
  { to: "/student/announcements", label: "Announcements", icon: Bell },
  { to: "/student/tools", label: "AI Tools", icon: Sparkles, feature: "ai_tools" },
  { to: "/student/sop-review", label: "AI SOP Review", icon: FileText },
  { to: "/student/support", label: "Support Center", icon: LifeBuoy, feature: "support" },
  { to: "/student/profile", label: "My Profile", icon: UserIcon },
];

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [latestUnread, setLatestUnread] = useState<{ id: string; title: string } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Mark "student mode" so mock pages know the user lives inside the dashboard
  // and route their back / post-submit navigation back into /student/*.
  useEffect(() => {
    markStudentMode();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/student/login?redirect=" + encodeURIComponent(location.pathname), { replace: true });
    }
  }, [loading, user, navigate, location.pathname]);

  // Note: we no longer block the dashboard or sign the user out when they
  // have no purchased course. Students who land here from the credentials
  // popup after buying may take a moment for enrollments to propagate, and
  // logging them out caused a confusing "kicked back to login" experience.
  // Empty-state CTAs inside the dashboard guide them to /courses to purchase.

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

  // Track latest unread notification for the top alert bar
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const loadLatest = async () => {
      const { data } = await supabase
        .from("student_notifications")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (alive) setLatestUnread(data ?? null);
    };
    loadLatest();
    const ch = supabase
      .channel(`layout-notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "student_notifications", filter: `user_id=eq.${user.id}` },
        (p: any) => { setLatestUnread({ id: p.new.id, title: p.new.title }); setBannerDismissed(false); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "student_notifications", filter: `user_id=eq.${user.id}` }, loadLatest)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);

  // Auto-hide banner when user is on the timeline page itself
  useEffect(() => {
    if (location.pathname.startsWith("/student/notifications")) setBannerDismissed(true);
  }, [location.pathname]);

  if (loading || !user) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <StudentThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 dark:from-background dark:via-background dark:to-background text-foreground">
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-6 h-14">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                className="lg:hidden p-2 -ml-1 rounded-md hover:bg-accent shrink-0"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link to="/student" className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shrink-0">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5 min-w-0">
                    <span className="truncate">Student Dashboard</span>
                    {displayName && (
                      <>
                        <span className="hidden md:inline text-muted-foreground/60">·</span>
                        <span className="hidden md:inline text-sky-600 dark:text-sky-300 font-semibold truncate max-w-[160px]">
                          {displayName}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground hidden sm:block">MBA Compass LMS</div>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <ThemeToggle />
              <NotificationBell />
              <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-border">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white text-xs font-semibold">
                  {(displayName || "S").charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="text-[10px] text-muted-foreground">Welcome</div>
                  <div className="text-sm font-medium truncate max-w-[140px]">{displayName || "Student"}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
                onClick={async () => {
                  clearStudentMode();
                  await supabase.auth.signOut();
                  navigate("/student/login", { replace: true });
                }}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Top alert bar — surfaces newest unread update */}
        {latestUnread && !bannerDismissed && (
          <div className="fixed top-14 left-0 right-0 z-20 bg-gradient-to-r from-sky-500 via-blue-500 to-sky-500 text-white shadow-md animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 px-4 sm:px-6 h-9 text-xs sm:text-sm">
              <Bell className="h-3.5 w-3.5 shrink-0 animate-pulse" />
              <span className="hidden sm:inline font-semibold uppercase tracking-wider opacity-90">New update:</span>
              <span className="truncate flex-1">{latestUnread.title}</span>
              <Link to="/student/notifications" className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 font-medium whitespace-nowrap">
                View
              </Link>
              <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss" className="p-1 rounded hover:bg-white/20">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className={cn("flex pt-14", latestUnread && !bannerDismissed && "pt-[5.75rem]")}>
          {/* Sidebar - desktop: FIXED. Scrolls independently of main content. */}
          <aside className={cn("hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-card/80 backdrop-blur fixed left-0 bottom-0 overflow-y-auto z-20", latestUnread && !bannerDismissed ? "top-[5.75rem]" : "top-14")}>
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
          <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:ml-64">
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
  const location = useLocation();

  // Filter top-level items by enrolled-bundle features.
  const visibleItems = navItems.filter((item) => {
    if (!item.feature) return true;
    if (featuresLoading) return true;
    return isEnabled(item.feature);
  });

  // Mocks group: keep all items visible, but mark locked ones so the student
  // can see what they're missing and tap "Upgrade" to unlock.
  const mocksItems = mocksGroup.map((item) => ({
    ...item,
    enabled: !item.feature || featuresLoading || isEnabled(item.feature),
  }));
  const anyMockEnabled = mocksItems.some((m) => m.enabled);

  // Auto-open the group when any mock-related route is active.
  const isMocksActive =
    location.pathname.startsWith("/student/mocks") ||
    location.pathname.startsWith("/student/daily-test") ||
    location.pathname.startsWith("/student/personalized-hub");

  const [mocksOpen, setMocksOpen] = useState(true);
  useEffect(() => {
    if (isMocksActive) setMocksOpen(true);
  }, [isMocksActive]);

  const groupBadgeTotal = mocksItems.reduce((s, m) => s + (counts[m.to] ?? 0), 0);

  // Single row renderer used by top-level items and group children.
  const renderRow = (
    item: NavItem & { enabled?: boolean },
    opts: { indent?: boolean; locked?: boolean } = {}
  ) => {
    const Icon = item.icon;
    if (opts.locked) {
      return (
        <Link
          key={item.to}
          to="/courses"
          title="Upgrade your course to access this section"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
            opts.indent && "ml-3",
            "text-muted-foreground/70 hover:bg-accent/60 hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 opacity-70" />
          <span className="flex-1 truncate">{item.label}</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold">
            Locked
          </span>
        </Link>
      );
    }
    const badge = counts[item.to] ?? 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => badge > 0 && markSeen(item.to)}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
            opts.indent && "ml-3 py-1.5 text-[13px]",
            isActive
              ? "bg-gradient-to-r from-sky-100 to-blue-50 text-sky-700 shadow-sm dark:from-sky-500/20 dark:to-blue-500/10 dark:text-sky-200"
              : "text-foreground/80 hover:bg-accent hover:text-foreground"
          )
        }
      >
        <span className="relative">
          <Icon className="h-4 w-4" />
          {badge > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-card" />
            </span>
          )}
        </span>
        <span className="flex-1 truncate">{item.label}</span>
        {badge > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </NavLink>
    );
  };

  // Order: Overview → Updates → My Mocks group → rest.
  const overview = visibleItems.find((i) => i.to === "/student");
  const updates = visibleItems.find((i) => i.to === "/student/notifications");
  const restItems = visibleItems.filter(
    (i) => i.to !== "/student" && i.to !== "/student/notifications"
  );

  return (
    <nav className="w-full p-3 space-y-0.5">
      {overview && renderRow(overview)}
      {updates && renderRow(updates)}

      {/* My Mocks — subtle highlight so students immediately recognise it as the primary section */}
      <div
        className={cn(
          "rounded-xl border my-2 overflow-hidden transition-colors",
          isMocksActive
            ? "border-sky-200/80 bg-gradient-to-br from-sky-50/70 to-blue-50/40 dark:border-sky-500/25 dark:from-sky-500/10 dark:to-blue-500/5"
            : "border-border/60 bg-muted/30 dark:bg-muted/20"
        )}
      >
        <button
          type="button"
          onClick={() => setMocksOpen((v) => !v)}
          aria-expanded={mocksOpen}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/40 transition-colors"
        >
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-sm">
            <FlaskConical className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-left">My Mocks</span>
          {groupBadgeTotal > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {groupBadgeTotal > 9 ? "9+" : groupBadgeTotal}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-300",
              mocksOpen && "rotate-180"
            )}
          />
        </button>

        {/* Smooth grid-row collapse — animates to natural height */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            mocksOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="px-2 pb-2 pt-1 space-y-0.5">
              {!anyMockEnabled && !featuresLoading ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  No mock sections in your course yet.{" "}
                  <Link to="/courses" className="text-sky-600 dark:text-sky-300 font-medium hover:underline">
                    Browse courses
                  </Link>
                </div>
              ) : (
                mocksItems.map((m) => renderRow(m, { indent: true, locked: !m.enabled }))
              )}
            </div>
          </div>
        </div>
      </div>

      {restItems.map((item) => renderRow(item))}

      <div className="pt-4 mt-4 border-t border-border">
        <Link
          to="/student/mocks/full-length"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2"
        >
          Browse all mocks →
        </Link>
      </div>
    </nav>
  );
}
