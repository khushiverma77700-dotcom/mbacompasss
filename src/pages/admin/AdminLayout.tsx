import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { X, Menu, Lock, ChevronDown, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminThemeToggle, { applyAdminTheme, getInitialAdminTheme } from "@/components/admin/AdminThemeToggle";
import { adminNavGroups, allAdminNavItems } from "./adminNav";

const AdminLayout = () => {
  const { user, isAdmin, allowedSections, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Notification dots state
  const [dots, setDots] = useState<Record<string, boolean>>({});
  const [nightlyIndexingLive, setNightlyIndexingLive] = useState(false);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    if (!user || !isAdmin) return;

    const checkNewLeads = async () => {
      // Use last visited timestamp from localStorage, default to 24h ago
      const lastSeen = localStorage.getItem("admin_leads_last_seen");
      const since = lastSeen || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: callbackCount },
        { count: inquiryCount },
        { count: profileCount },
        { count: subCount },
        { count: bizCount },
      ] = await Promise.all([
        supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("read", false),
        supabase.from("inquiries").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("business_inquiries").select("*", { count: "exact", head: true }).gte("created_at", since),
      ]);

      const hasNew = (callbackCount || 0) + (inquiryCount || 0) + (profileCount || 0) + (subCount || 0) + (bizCount || 0) > 0;

      setDots({
        callbacks: (callbackCount || 0) > 0,
        inquiries: (inquiryCount || 0) > 0,
        leads: (profileCount || 0) > 0,
        master: hasNew,
        subscribers: (subCount || 0) > 0,
        business: (bizCount || 0) > 0,
      });
    };

    const w = window as any;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2500));
    const handle = schedule(checkNewLeads, { timeout: 6000 });

    // Realtime listener for new entries
    const channel = supabase
      .channel("admin-lead-dots")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inquiries" }, () => checkNewLeads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => checkNewLeads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "newsletter_subscribers" }, () => checkNewLeads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "business_inquiries" }, () => checkNewLeads())
      .subscribe();

    return () => {
      const cancel = w.cancelIdleCallback ?? window.clearTimeout;
      try { cancel(handle); } catch {}
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    let cancelled = false;

    const checkNightlyIndexing = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-indexing", {
          body: { action: "current_run_status" },
        });

        if (!cancelled) {
          setNightlyIndexingLive(Boolean(!error && (data as any)?.ok && (data as any)?.data?.is_active));
        }
      } catch {
        if (!cancelled) setNightlyIndexingLive(false);
      }
    };

    const w = window as any;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 3000));
    const handle = schedule(checkNightlyIndexing, { timeout: 8000 });
    const interval = window.setInterval(checkNightlyIndexing, 30000);

    return () => {
      cancelled = true;
      const cancel = w.cancelIdleCallback ?? window.clearTimeout;
      try { cancel(handle); } catch {}
      window.clearInterval(interval);
    };
  }, [user, isAdmin]);

  // Apply admin theme on mount, restore light on unmount
  useEffect(() => {
    applyAdminTheme(getInitialAdminTheme());
    return () => applyAdminTheme("light");
  }, []);

  // Mark as seen when visiting a lead page
  useEffect(() => {
    const leadPaths = ["/admin/callbacks", "/admin/inquiries", "/admin/leads", "/admin/all-leads-unified", "/admin/subscribers", "/admin/business-inquiries"];
    if (leadPaths.includes(location.pathname)) {
      localStorage.setItem("admin_leads_last_seen", new Date().toISOString());
      // Clear the dot for the visited section
      const pathToDotKey: Record<string, string> = {
        "/admin/callbacks": "callbacks",
        "/admin/inquiries": "inquiries",
        "/admin/leads": "leads",
        "/admin/all-leads-unified": "master",
        "/admin/subscribers": "subscribers",
        "/admin/business-inquiries": "business",
      };
      const key = pathToDotKey[location.pathname];
      if (key) {
        setDots(prev => ({ ...prev, [key]: false }));
      }
    }
  }, [location.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/auth" replace />;

  const isActive = (path: string) => location.pathname === path;
  const isSuperAdmin = allowedSections === null;
  const hasAccess = (path: string) => isSuperAdmin || (allowedSections?.includes(path) ?? false);

  const isRouteAllowed = (path: string) => {
    if (isSuperAdmin) return true;
    if (!allowedSections) return false;
    return allowedSections.some(section => path === section || path.startsWith(section + "/"));
  };

  const currentRouteAllowed = isRouteAllowed(location.pathname) || location.pathname === "/admin";

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="font-heading font-bold text-lg text-foreground">Admin Panel</h2>
        <div className="flex items-center gap-2">
          <AdminThemeToggle />
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <nav className="space-y-3">
        {adminNavGroups.map((group) => {
          const visibleItems = group.items.filter(item => hasAccess(item.path));
          if (visibleItems.length === 0) return null;
          const isCollapsed = collapsedGroups[group.label];
          const groupHasActive = visibleItems.some(item => isActive(item.path));
          const groupHasDot = visibleItems.some(item => (item as any).dotKey && dots[(item as any).dotKey]);

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={`flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${
                  groupHasActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {group.label}
                  {isCollapsed && groupHasDot && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                    </span>
                  )}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>
              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.path === "/admin/google-indexing" && nightlyIndexingLive && (
                        <span className="relative flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-500/25" title="Nightly auto-run is live">
                          <Bell className="w-3 h-3 text-emerald-600" />
                          <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          </span>
                        </span>
                      )}
                      {(item as any).dotKey && dots[(item as any).dotKey] && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {!isSuperAdmin && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Limited access — {allAdminNavItems.filter(i => hasAccess(i.path)).length}/{allAdminNavItems.length} sections
          </p>
        </div>
      )}
      <div className="mt-auto pt-6 border-t border-border mt-6">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Website</Link>
      </div>
    </>
  );

  return (
    <div className="admin-scope min-h-screen flex bg-muted/30">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between gap-2 px-3 bg-card/95 backdrop-blur border-b border-border">
        <button
          className="p-2 -ml-1 rounded-lg hover:bg-muted active:scale-95 transition"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-heading font-bold text-base truncate">Admin Panel</h1>
        <AdminThemeToggle />
      </header>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${
          sidebarOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"
        } lg:flex lg:fixed lg:top-0 lg:left-0 lg:h-screen w-[82vw] max-w-[20rem] lg:w-64 bg-card border-r border-border p-4 flex-col overflow-y-auto overscroll-contain`}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pt-[4.25rem] lg:pt-6 lg:ml-64 max-w-full">
        <div className="max-w-full overflow-x-hidden">
          {currentRouteAllowed ? (
            <Outlet />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <Lock className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">You don't have permission to access this section. Contact a super admin to request access.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
