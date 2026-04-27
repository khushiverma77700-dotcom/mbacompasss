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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/student", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/student/mocks", label: "My Mocks", icon: BookOpenCheck },
  { to: "/student/buy-mocks", label: "Buy Mocks", icon: ShoppingBag },
  { to: "/student/performance", label: "Performance", icon: BarChart3 },
  { to: "/student/goals", label: "CAT Score Engine", icon: Target },
  { to: "/student/announcements", label: "Announcements", icon: Bell },
  { to: "/student/tools", label: "AI Tools", icon: Sparkles },
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-sky-100">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-md hover:bg-sky-50"
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
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-sky-100 bg-white/70 backdrop-blur min-h-[calc(100vh-3.5rem)] sticky top-14">
          <SidebarContent />
        </aside>

        {/* Sidebar - mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl border-r border-sky-100 pt-14">
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <nav className="w-full p-4 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-gradient-to-r from-sky-100 to-blue-50 text-sky-700 shadow-sm"
                : "text-gray-700 hover:bg-sky-50 hover:text-sky-700"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
      <div className="pt-4 mt-4 border-t border-sky-100">
        <Link
          to="/mocks"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-sky-700 px-3 py-2"
        >
          Browse all mocks →
        </Link>
      </div>
    </nav>
  );
}
