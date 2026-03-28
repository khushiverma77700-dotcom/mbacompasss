import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, GraduationCap, LogIn, LogOut, Shield, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartSearch from "@/components/SmartSearch";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const fallbackLinks = [
  { label: "Home", path: "/" },
  { label: "CAT Coaching", path: "/category/cat" },
  { label: "GMAT Prep", path: "/category/gmat" },
  { label: "Compare", path: "/compare" },
  { label: "Colleges", path: "/colleges" },
  { label: "Blog", path: "/blog" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { data: header } = useSiteSettings("header");

  const navLinks = header?.nav_links || fallbackLinks;
  const brandName = header?.brand_name || "MBAHub";

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg hero-gradient flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-xl text-foreground">
            {brandName.includes("Hub") ? (
              <>{brandName.replace("Hub", "")}<span className="text-gradient">Hub</span></>
            ) : brandName}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link: any) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.path
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <SmartSearch className="w-56" />
          {user ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard</Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin"><Shield className="w-4 h-4 mr-1" /> Admin</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth"><LogIn className="w-4 h-4 mr-1" /> Sign In</Link>
            </Button>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-foreground"
          aria-label="Toggle mobile menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-card border-b border-border px-4 pb-4">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link: any) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === link.path
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {user ? (
            <div className="mt-3 space-y-2">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}><LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard</Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" className="w-full" size="sm" asChild>
                  <Link to="/admin" onClick={() => setMobileOpen(false)}><Shield className="w-4 h-4 mr-1" /> Admin Panel</Link>
                </Button>
              )}
              <Button variant="ghost" className="w-full" size="sm" onClick={() => { signOut(); setMobileOpen(false); }}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button className="w-full mt-3" size="sm" asChild>
              <Link to="/auth" onClick={() => setMobileOpen(false)}>Sign In</Link>
            </Button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
