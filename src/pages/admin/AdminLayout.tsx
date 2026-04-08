import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Building2, BookOpen, Image, Newspaper, MessageSquare, GraduationCap, Mail, FileText, Tag, Menu, X, Settings, MessageCircle, Trophy, Ticket, Star, BarChart3, MapPin, Trash2, Users, Globe, Link2, GitCompare, TrendingUp, Sparkles, ShieldCheck, Lock, Briefcase } from "lucide-react";
import { useState } from "react";

const adminNav = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Site Settings", path: "/admin/site-settings", icon: Settings },
  { label: "Institutes", path: "/admin/institutes", icon: Building2 },
  { label: "Courses", path: "/admin/courses", icon: BookOpen },
  { label: "Colleges", path: "/admin/colleges", icon: GraduationCap },
  { label: "Exams", path: "/admin/exams", icon: FileText },
  { label: "Categories", path: "/admin/categories", icon: Tag },
  { label: "Banners", path: "/admin/banners", icon: Image },
  { label: "Articles", path: "/admin/articles", icon: Newspaper },
  { label: "Testimonials", path: "/admin/testimonials", icon: MessageCircle },
  { label: "Inquiries", path: "/admin/inquiries", icon: MessageSquare },
  { label: "Subscribers", path: "/admin/subscribers", icon: Mail },
  { label: "Coupons", path: "/admin/coupons", icon: Ticket },
  { label: "Coaching of Week", path: "/admin/coaching-of-week", icon: Trophy },
  { label: "Coaching Results", path: "/admin/coaching-results", icon: TrendingUp },
  { label: "Comparisons", path: "/admin/comparisons", icon: GitCompare },
  { label: "College Sections", path: "/admin/college-sections", icon: Star },
  { label: "Institute Results", path: "/admin/institute-results", icon: BarChart3 },
  { label: "Sitemap", path: "/admin/sitemap", icon: MapPin },
  { label: "Student Leads", path: "/admin/leads", icon: Users },
  { label: "All Leads (Unified)", path: "/admin/all-leads-unified", icon: BarChart3 },
  { label: "City/State Pages", path: "/admin/city-pages", icon: Globe },
  { label: "All Site Links", path: "/admin/all-links", icon: Link2 },
  { label: "Clear Caches", path: "/admin/clear-cache", icon: Trash2 },
  { label: "AI SEO Dashboard", path: "/admin/seo-dashboard", icon: Sparkles },
  { label: "Static Page SEO", path: "/admin/static-seo", icon: Globe },
  { label: "Profile Analyzer", path: "/admin/profile-analyzer", icon: BarChart3 },
  { label: "Business Inquiries", path: "/admin/business-inquiries", icon: Briefcase },
  { label: "Manage Admins", path: "/admin/manage-admins", icon: ShieldCheck },
];

const AdminLayout = () => {
  const { user, isAdmin, allowedSections, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/auth" replace />;

  const isActive = (path: string) => location.pathname === path;

  // null = super admin (full access), array = restricted
  const isSuperAdmin = allowedSections === null;
  const hasAccess = (path: string) => isSuperAdmin || (allowedSections?.includes(path) ?? false);

  // Filter nav items based on permissions
  const visibleNav = adminNav.filter(item => hasAccess(item.path));

  // Check if current route is accessible
  const currentRouteAllowed = hasAccess(location.pathname) || location.pathname === "/admin";

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-lg text-foreground">Admin Panel</h2>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
      </div>
      <nav className="space-y-1">
        {visibleNav.map((item) => (
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
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      {!isSuperAdmin && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Limited access — {visibleNav.length}/{adminNav.length} sections
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
