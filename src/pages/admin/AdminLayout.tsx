import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Building2, BookOpen, Image, Newspaper, MessageSquare, GraduationCap, Mail, FileText, Tag, Menu, X, Settings, MessageCircle, Trophy, Ticket, Star, BarChart3, MapPin, Trash2, Users, Globe, Link2, GitCompare, TrendingUp, Sparkles, ShieldCheck, Lock, Briefcase, Target, PhoneCall, Database, Activity, Calculator, ChevronDown, Bell, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const adminNavGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { label: "Site Settings", path: "/admin/site-settings", icon: Settings },
    ],
  },
  {
    label: "Institutes & Coaching",
    items: [
      { label: "Institutes", path: "/admin/institutes", icon: Building2 },
      { label: "Courses", path: "/admin/courses", icon: BookOpen },
      { label: "Course Categories", path: "/admin/course-categories", icon: Tag },
      { label: "Coaching of Week", path: "/admin/coaching-of-week", icon: Trophy },
      { label: "Coaching Performance Stats", path: "/admin/coaching-results", icon: TrendingUp },
      { label: "Institute Placement Results", path: "/admin/institute-results", icon: BarChart3 },
      { label: "Comparisons", path: "/admin/comparisons", icon: GitCompare },
    ],
  },
  {
    label: "Colleges & Exams",
    items: [
      { label: "Colleges", path: "/admin/colleges", icon: GraduationCap },
      { label: "College Sections", path: "/admin/college-sections", icon: Star },
      { label: "Shortlister Colleges", path: "/admin/shortlister-colleges", icon: Target },
      { label: "Exams", path: "/admin/exams", icon: FileText },
      { label: "Categories", path: "/admin/categories", icon: Tag },
      { label: "Specializations", path: "/admin/specializations", icon: Tag },
    ],
  },
  {
    label: "Content & Media",
    items: [
      { label: "Banners", path: "/admin/banners", icon: Image },
      { label: "Articles", path: "/admin/articles", icon: Newspaper },
      { label: "Testimonials", path: "/admin/testimonials", icon: MessageCircle },
      { label: "Coupons", path: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Leads & Inquiries",
    items: [
      { label: "Callback Requests", path: "/admin/callbacks", icon: PhoneCall, dotKey: "callbacks" },
      { label: "Inquiries", path: "/admin/inquiries", icon: MessageSquare, dotKey: "inquiries" },
      { label: "Student Leads", path: "/admin/leads", icon: Users, dotKey: "leads" },
      { label: "Master Data", path: "/admin/all-leads-unified", icon: Database, dotKey: "master" },
      { label: "Subscribers", path: "/admin/subscribers", icon: Mail, dotKey: "subscribers" },
      { label: "Business Inquiries", path: "/admin/business-inquiries", icon: Briefcase, dotKey: "business" },
      { label: "User Submissions", path: "/admin/user-submissions", icon: ShieldCheck, dotKey: "submissions" },
      { label: "Listing Edit Requests", path: "/admin/listing-change-requests", icon: GitCompare, dotKey: "changeRequests" },
    ],
  },
  {
    label: "SEO & AI Tools",
    items: [
      { label: "AI SEO Dashboard", path: "/admin/seo-dashboard", icon: Sparkles },
      { label: "Website Optimizer", path: "/admin/website-optimizer", icon: Sparkles },
      { label: "Static Page SEO", path: "/admin/static-seo", icon: Globe },
      { label: "Google Indexing", path: "/admin/google-indexing", icon: Globe },
      { label: "Sitemap", path: "/admin/sitemap", icon: MapPin },
      { label: "All Site Links", path: "/admin/all-links", icon: Link2 },
      { label: "Profile Analyzer", path: "/admin/profile-analyzer", icon: BarChart3 },
      { label: "CAT Score Submissions", path: "/admin/cat-scores", icon: Calculator },
      { label: "MBA ROI Analyses", path: "/admin/roi-analyses", icon: TrendingUp },
      { label: "Citation Sources Audit", path: "/admin/citations-audit", icon: Link2 },
      { label: "Content Refresh Queue", path: "/admin/content-refreshes", icon: RefreshCw },
    ],
  },
  {
    label: "System & Admin",
    items: [
      { label: "Mega Menu", path: "/admin/mega-menu", icon: Menu },
      { label: "Manage Admins", path: "/admin/manage-admins", icon: ShieldCheck },
      { label: "Database Backup", path: "/admin/database-backup", icon: Database },
      { label: "AI & Cloud Usage", path: "/admin/ai-usage", icon: Activity },
      { label: "Clear Caches", path: "/admin/clear-cache", icon: Trash2 },
    ],
  },
];

// Flat list for permission checks
const allAdminNavItems = adminNavGroups.flatMap(g => g.items);

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

    checkNewLeads();

    // Realtime listener for new entries
    const channel = supabase
      .channel("admin-lead-dots")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inquiries" }, () => checkNewLeads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => checkNewLeads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "newsletter_subscribers" }, () => checkNewLeads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "business_inquiries" }, () => checkNewLeads())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

    checkNightlyIndexing();
    const interval = window.setInterval(checkNightlyIndexing, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, isAdmin]);

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

  const currentRouteAllowed = hasAccess(location.pathname) || location.pathname === "/admin";

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-lg text-foreground">Admin Panel</h2>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
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
    <div className="min-h-screen flex bg-muted/30">
      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-sm" onClick={() => setSidebarOpen(true)}>
        <Menu className="w-5 h-5" />
      </button>

      {sidebarOpen && <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-50" : "hidden"} lg:flex lg:sticky lg:top-0 lg:h-screen w-64 bg-card border-r border-border p-4 flex-col overflow-y-auto`}>
        <SidebarContent />
      </aside>
      <main className="flex-1 p-6 overflow-auto lg:ml-0">
        {currentRouteAllowed ? (
          <Outlet />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">You don't have permission to access this section. Contact a super admin to request access.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLayout;
