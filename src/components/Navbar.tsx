import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, GraduationCap, LogIn, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "CAT Coaching", path: "/category/cat" },
  { label: "GMAT Prep", path: "/category/gmat" },
  { label: "XAT & SNAP", path: "/category/xat-snap" },
  { label: "Compare", path: "/compare" },
  { label: "Colleges", path: "/colleges" },
  { label: "Blog", path: "/blog" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/cat?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg hero-gradient flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-xl text-foreground">
            MBA<span className="text-gradient">Hub</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
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
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search MBA coaching..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48 h-9 text-sm bg-muted border-none"
            />
          </form>
          {user ? (
            <div className="flex items-center gap-2">
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
            {navLinks.map((link) => (
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
