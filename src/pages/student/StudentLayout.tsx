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
  AlertTriangle,
  Award,
  Download,
  Sigma,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/student/ThemeToggle";

import StudentBottomNav from "@/components/student/StudentBottomNav";
import InstallAppPrompt from "@/components/student/InstallAppPrompt";
import { StudentThemeProvider } from "@/contexts/StudentThemeContext";
import BRAND_LOGO_URL from "@/assets/brandLogo";
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
  { to: "/student/day-planner", label: "My Day Planner", icon: CalendarCheck, feature: "day_planner" },
  // "My Mocks" group is rendered separately as an expandable section.
  // "My Insights" group (Strength / Weak / Performance / Leaderboard) is also rendered separately.
  { to: "/student/buy-mocks", label: "Buy Mocks", icon: ShoppingBag, feature: "buy_mocks" },
  // { to: "/student/goals", label: "CAT Score Engine", icon: Target, feature: "study_planner" }, // hidden
  { to: "/student/orders", label: "My Orders", icon: Receipt },
  { to: "/student/tools", label: "AI Tools", icon: Sparkles, feature: "ai_tools" },
  { to: "/student/vocabulary", label: "B-School Vocabulary", icon: BookOpen, feature: "vocabulary_hub" },
  { to: "/student/formulas", label: "Quant Formula Book", icon: Sigma, feature: "formula_book" },
  { to: "/student/sop-review", label: "AI SOP Review", icon: FileText },
  { to: "/student/support", label: "Support Center", icon: LifeBuoy, feature: "support" },
  { to: "/student/profile", label: "My Profile", icon: UserIcon },
];

// "My Insights" — performance analytics group (Strength, Weak, Performance, Leaderboard)
const insightsGroup: NavItem[] = [
  { to: "/student/all-india-rank", label: "All India Rank", icon: Trophy,         feature: "performance_tracker" },
  { to: "/student/strength-areas", label: "My Strength Areas", icon: Award,          feature: "performance_tracker" },
  { to: "/student/weak-areas",     label: "My Weak Areas",     icon: AlertTriangle,  feature: "performance_tracker" },
  { to: "/student/performance",    label: "Performance",       icon: BarChart3,      feature: "performance_tracker" },
  { to: "/student/leaderboard",    label: "Leaderboard",       icon: Trophy,         feature: "leaderboard" },
];

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const displayName = (user?.user_metadata?.display_name as string | undefined) || user?.email?.split("@")[0] || "Student";

  // Detect whether the app is running as an installed PWA (standalone display
  // mode or iOS home-screen launch). When installed, we hide the "Install App"
  // button in the header since it's no longer needed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;
      setIsStandalone(!!standalone);
    };
    check();
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", check);
    window.addEventListener("appinstalled", check);
    return () => {
      mql?.removeEventListener?.("change", check);
      window.removeEventListener("appinstalled", check);
    };
  }, []);

  // On dashboard.mbacompass.in, the LMS lives at "/" instead of "/student".
  const onDashboardHost =
    typeof window !== "undefined" &&
    window.location.hostname === "dashboard.mbacompass.in";
  const homePath = onDashboardHost ? "/" : "/student";

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

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Keep aggressive/mobile repeated Back presses inside the LMS instead of
  // falling through to public pages or login history entries.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = window.history.state ?? {};
    window.history.replaceState({ ...state, mbcStudentSafe: true }, "", window.location.href);

    const keepInsideDashboard = () => {
      window.setTimeout(() => {
        const path = window.location.pathname;
        const isInside = onDashboardHost
          ? (path === "/" || path.startsWith("/student"))
          : path.startsWith("/student");
        const shouldReturn = path === "/student/login" || !isInside;
        if (shouldReturn) navigate(homePath, { replace: true });
      }, 0);
    };

    window.addEventListener("popstate", keepInsideDashboard);
    return () => window.removeEventListener("popstate", keepInsideDashboard);
  }, [navigate]);

  // Render an instant lightweight shell while auth resolves so the user never
  // sees a blank screen on first hit. The auth check still runs in the
  // background; once `user` is null we redirect from the effect above.
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 dark:from-background dark:via-background dark:to-background">
        <div className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-2">
          <div className="h-8 w-8 rounded-lg overflow-hidden bg-white ring-1 ring-sky-100 grid place-items-center">
            <img src={BRAND_LOGO_URL} alt="MBA Compass" className="h-full w-full object-contain" />
          </div>
          <div className="text-sm font-semibold">MBA Compass</div>
        </div>
        <div className="flex pt-14">
          <aside className="hidden lg:block w-72 shrink-0 border-r border-border bg-card/80 h-[calc(100vh-3.5rem)]">
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          </aside>
          <main className="flex-1 p-6">
            <div className="space-y-4 max-w-5xl">
              <div className="h-8 w-64 bg-muted/40 rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <StudentThemeProvider>
      <div className="student-scope min-h-[100dvh] bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 dark:from-background dark:via-background dark:to-background text-foreground">
        {/* Top bar */}
        <header
          className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-6 h-14">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <button
                className="lg:hidden p-1.5 -ml-1 rounded-md hover:bg-accent shrink-0"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link to={homePath} className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg overflow-hidden bg-white ring-1 ring-sky-100 grid place-items-center shrink-0">
                  <img src={BRAND_LOGO_URL} alt="MBA Compass" className="h-full w-full object-contain" />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-[13px] sm:text-sm font-semibold flex items-center gap-1.5 min-w-0">
                    <span className="truncate">MBA Compass</span>
                    {displayName && (
                      <>
                        <span className="hidden md:inline text-muted-foreground/60">·</span>
                        <span className="hidden md:inline text-sky-600 dark:text-sky-300 font-semibold truncate max-w-[160px]">
                          {displayName}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground hidden sm:block">CAT Prep LMS</div>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
              <ThemeToggle />
              {!isStandalone && (
                <Link
                  to="/student/install"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold px-2.5 py-1.5 shadow hover:from-sky-600 hover:to-blue-700"
                  aria-label="Install app"
                  title="Install MBA Compass - CAT Prep as an app"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Install</span>
                </Link>
              )}
              <Link to="/student/notifications" className="relative p-1.5 sm:p-2 rounded-md hover:bg-accent" aria-label="Notifications">
                <Bell className="h-[18px] w-[18px] sm:h-5 sm:w-5 text-foreground/70" />
              </Link>
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
                className="px-1.5 sm:px-3 h-9"
                onClick={async () => {
                  clearStudentMode();
                  await supabase.auth.signOut();
                  navigate("/student/login", { replace: true });
                }}
                aria-label="Logout"
              >
                <LogOut className="h-[18px] w-[18px] sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <div
          className="flex"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
        >
          {/* Sidebar - desktop: FIXED. Scrolls independently of main content. */}
          <aside
            className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border bg-card/80 backdrop-blur fixed left-0 bottom-0 overflow-y-auto z-20"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
          >
            <SidebarContent />
          </aside>

          {/* Sidebar - mobile drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setMobileOpen(false)} />
              <aside
                className="absolute left-0 top-0 bottom-0 w-[82vw] max-w-sm bg-card shadow-2xl border-r border-border overflow-y-auto animate-in slide-in-from-left duration-300"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3.5rem)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              >
                <SidebarContent />
              </aside>
            </div>
          )}

          {/* Main — offset by sidebar width on desktop; padded for bottom nav on mobile */}
          <main
            className="flex-1 min-w-0 px-3 sm:px-5 lg:px-8 py-4 sm:py-6 lg:ml-72 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] lg:pb-8"
          >
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom tab bar — hidden on lg+ */}
        <StudentBottomNav />

        {/* Floating install banner — handles its own visibility */}
        <InstallAppPrompt />
      </div>
    </StudentThemeProvider>
  );
}

function SidebarContent() {
  const { counts, markSeen } = useStudentNavBadges();
  const location = useLocation();

  const visibleItems = navItems;
  const mocksItems = mocksGroup.map((item) => ({ ...item, enabled: true }));

  // Auto-open the group when any mock-related route is active.
  const isMocksActive =
    location.pathname.startsWith("/student/mocks") ||
    location.pathname.startsWith("/student/daily-test") ||
    location.pathname.startsWith("/student/personalized-hub");

  const [mocksOpen, setMocksOpen] = useState(true);
  useEffect(() => {
    if (isMocksActive) setMocksOpen(true);
  }, [isMocksActive]);

  // Auto-open the Insights group when on any of its routes.
  const isInsightsActive =
    location.pathname.startsWith("/student/all-india-rank") ||
    location.pathname.startsWith("/student/strength-areas") ||
    location.pathname.startsWith("/student/weak-areas") ||
    location.pathname.startsWith("/student/performance") ||
    location.pathname.startsWith("/student/leaderboard");
  const [insightsOpen, setInsightsOpen] = useState(true);
  useEffect(() => {
    if (isInsightsActive) setInsightsOpen(true);
  }, [isInsightsActive]);

  const groupBadgeTotal = mocksItems.reduce((s, m) => s + (counts[m.to] ?? 0), 0);
  const insightsBadgeTotal = insightsGroup.reduce((s, m) => s + (counts[m.to] ?? 0), 0);

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

  // Order: Overview → Updates → My Mocks group → My Insights → PerformX → Knowledge Duo → rest.
  const overview = visibleItems.find((i) => i.to === "/student");
  const updates = visibleItems.find((i) => i.to === "/student/notifications");
  const vocabItem = visibleItems.find((i) => i.to === "/student/vocabulary");
  const formulaItem = visibleItems.find((i) => i.to === "/student/formulas");
  const restItems = visibleItems.filter(
    (i) =>
      i.to !== "/student" &&
      i.to !== "/student/notifications" &&
      i.to !== "/student/vocabulary" &&
      i.to !== "/student/formulas"
  );

  // Knowledge Duo block renderer — 3D premium card look for Vocab + Formula Book
  const renderKnowledgeDuo = (item: NavItem, opts: { iconBg: string; gradient: string; activeBorder: string; badge?: string }) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          cn(
            "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold overflow-hidden border transition-all duration-300 group",
            isActive
              ? cn(opts.activeBorder, "bg-white shadow-lg scale-[1.02] translate-x-0.5")
              : cn("border-slate-200/60 bg-gradient-to-br", opts.gradient, "text-foreground hover:shadow-xl hover:-translate-y-0.5 hover:border-slate-300/80 dark:border-slate-500/20")
          )
        }
      >
        {/* shimmer sweep on hover */}
        <span className="absolute inset-1 rounded-[10px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full pointer-events-none" />
        {/* soft top highlight line for 3D depth */}
        <span className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60" />
        {/* bottom inner shadow for depth */}
        <span className="absolute inset-x-0 bottom-1 h-2 rounded-b-xl bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
        <span className={cn("relative h-8 w-8 rounded-xl grid place-items-center text-white shadow-lg ring-2 ring-white/50", opts.iconBg)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="relative flex-1 text-left truncate">
          {item.label}
          {opts.badge && (
            <span className={cn("ml-1.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded text-white font-black", opts.badge)}>
              Hot
            </span>
          )}
        </span>
      </NavLink>
    );
  };

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
              {mocksItems.map((m) => renderRow(m, { indent: true }))}
            </div>
          </div>
        </div>
      </div>

      {/* My Insights — highlighted analytics block (Strength, Weak, Performance, Leaderboard) */}
      <div
        className={cn(
          "rounded-xl border my-2 overflow-hidden transition-colors",
          isInsightsActive
            ? "border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-sky-50/40 dark:border-violet-500/25 dark:from-violet-500/10 dark:to-sky-500/5"
            : "border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-sky-50/20 dark:border-violet-500/15 dark:from-violet-500/5 dark:to-sky-500/5"
        )}
      >
        <button
          type="button"
          onClick={() => setInsightsOpen((v) => !v)}
          aria-expanded={insightsOpen}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/40 transition-colors"
        >
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-sky-600 grid place-items-center text-white shadow-sm">
            <BarChart3 className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-left">My Insights</span>
          {insightsBadgeTotal > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {insightsBadgeTotal > 9 ? "9+" : insightsBadgeTotal}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-300",
              insightsOpen && "rotate-180"
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            insightsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="px-2 pb-2 pt-1 space-y-0.5">
              {insightsGroup.map((m) => renderRow(m, { indent: true }))}
            </div>
          </div>
        </div>
      </div>

      {/* PerformX — premium gamification block (Apex Arena) */}
      <NavLink
        to="/student/performx"
        className={({ isActive }) =>
          cn(
            "relative my-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold overflow-hidden border transition-all group",
            isActive
              ? "border-amber-300/60 bg-gradient-to-r from-amber-100 via-rose-50 to-violet-100 text-rose-700 shadow-md dark:from-amber-500/20 dark:via-rose-500/15 dark:to-violet-500/20 dark:border-amber-400/30 dark:text-amber-200"
              : "border-violet-200/60 bg-gradient-to-r from-amber-50/70 via-rose-50/50 to-violet-50/70 text-foreground hover:shadow-md dark:border-violet-500/20 dark:from-amber-500/10 dark:via-rose-500/5 dark:to-violet-500/10"
          )
        }
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full" />
        <span className="relative h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 via-rose-500 to-violet-600 grid place-items-center text-white shadow-md">
          <Trophy className="h-3.5 w-3.5" />
        </span>
        <span className="relative flex-1 text-left flex items-center gap-1.5">
          PerformX
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black">
            New
          </span>
        </span>
      </NavLink>

      {/* Knowledge Duo — B-School Vocabulary + Quant Formula Book side by side / stacked premium cards */}
      <div className="my-2 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-sky-50/80 dark:from-slate-800/40 dark:via-slate-900/20 dark:to-sky-900/10 dark:border-slate-700/40 shadow-sm backdrop-blur p-2 space-y-1.5">
        <div className="flex items-center gap-2 px-1 pb-1">
          <span className="h-5 w-5 rounded-md bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white text-[10px] shadow-sm">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
            Knowledge Hub
          </span>
        </div>
        {vocabItem &&
          renderKnowledgeDuo(vocabItem, {
            iconBg: "bg-gradient-to-br from-emerald-400 to-teal-600",
            gradient: "from-emerald-50/80 to-teal-50/60",
            activeBorder: "border-emerald-300/80 ring-1 ring-emerald-300/40 text-emerald-700 dark:text-emerald-300",
          })}
        {formulaItem &&
          renderKnowledgeDuo(formulaItem, {
            iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-600",
            gradient: "from-violet-50/80 to-fuchsia-50/60",
            activeBorder: "border-violet-300/80 ring-1 ring-violet-300/40 text-violet-700 dark:text-violet-300",
          })}
      </div>

      {restItems.map((item) => renderRow(item))}

      <div className="pt-4 mt-4 border-t border-border space-y-1">
        <Link
          to="/student/mocks/full-length"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2"
        >
          Browse all mocks →
        </Link>
        <Link
          to="/student/install"
          className="flex items-center gap-2 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-md px-3 py-2"
        >
          <span className="h-5 w-5 rounded-md bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white text-[10px]">↓</span>
          Install app
        </Link>
      </div>
    </nav>
  );
}
