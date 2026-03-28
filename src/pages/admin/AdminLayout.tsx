import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Building2, BookOpen, Image, Newspaper, Users, MessageSquare, GraduationCap, Mail } from "lucide-react";

const adminNav = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Institutes", path: "/admin/institutes", icon: Building2 },
  { label: "Courses", path: "/admin/courses", icon: BookOpen },
  { label: "Banners", path: "/admin/banners", icon: Image },
  { label: "Articles", path: "/admin/articles", icon: Newspaper },
  { label: "Colleges", path: "/admin/colleges", icon: GraduationCap },
  { label: "Inquiries", path: "/admin/inquiries", icon: MessageSquare },
  { label: "Subscribers", path: "/admin/subscribers", icon: Mail },
];

const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-64 bg-card border-r border-border p-4 hidden lg:block">
        <h2 className="font-heading font-bold text-lg mb-6 text-foreground">Admin Panel</h2>
        <nav className="space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
