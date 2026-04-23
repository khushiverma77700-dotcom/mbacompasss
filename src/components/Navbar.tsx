import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, Shield, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import NavMegaMenu, { MobileMegaMenu } from "@/components/NavMegaMenu";
import GooglePreferredSourceCTA from "@/components/GooglePreferredSourceCTA";
import mbahubLogo from "@/assets/brandLogo";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileCollegeOpen, setMobileCollegeOpen] = useState(false);
  const [mobileCoachingOpen, setMobileCoachingOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { data: header } = useSiteSettings("header");

  const handleSignOut = () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setShowSignOutDialog(false);
    setMobileOpen(false);
    signOut().finally(() => {
      setIsSigningOut(false);
      navigate("/auth", { replace: true });
    });
  };

  const brandName = header?.brand_name || "MBA Compass";
  const brandHasCompass = brandName.includes("Compass");

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileCollegeOpen(false);
    setMobileCoachingOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={mbahubLogo} alt="MBA Compass Logo" className="w-9 h-9 rounded-lg object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="font-heading font-bold text-xl text-foreground">
              {brandHasCompass ? (
                <>
                  {brandName.replace("Compass", "")}
                  <span className="text-gradient">Compass</span>
                </>
              ) : (
                brandName
              )}
            </span>
            <span className="text-[9px] font-medium text-muted-foreground -mt-0.5 tracking-wide">
              by B School Buzz
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Home
          </Link>

          <NavMegaMenu label="Colleges" menuType="college" />
          <NavMegaMenu label="Coaching" menuType="coaching" />

          <Link
            to="/blog"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/blog"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Blogs
          </Link>

          <Link
            to="/compare"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/compare"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Compare
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3 min-w-0">
          <GooglePreferredSourceCTA size="compact" className="inline-flex shrink-0" />
          
          {user ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin">
                    <Shield className="w-4 h-4 mr-1" /> Admin
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowSignOutDialog(true)}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">
                <LogIn className="w-4 h-4 mr-1" /> Sign In
              </Link>
            </Button>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-foreground"
          aria-label="Toggle mobile menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 pb-4 max-h-[80vh] overflow-y-auto animate-fade-in">
          <nav className="flex flex-col gap-1">
            <Link
              to="/"
              onClick={closeMobile}
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>

            <button
              onClick={() => setMobileCollegeOpen(!mobileCollegeOpen)}
              className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Colleges
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileCollegeOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileCollegeOpen && <MobileMegaMenu menuType="college" onNavigate={closeMobile} />}

            <button
              onClick={() => setMobileCoachingOpen(!mobileCoachingOpen)}
              className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Coaching
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileCoachingOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileCoachingOpen && <MobileMegaMenu menuType="coaching" onNavigate={closeMobile} />}

            <Link
              to="/blog"
              onClick={closeMobile}
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Blogs
            </Link>
            <Link
              to="/compare"
              onClick={closeMobile}
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Compare
            </Link>
          </nav>

          <div className="mt-3" onClick={closeMobile}>
            <GooglePreferredSourceCTA size="full" />
          </div>

          {user ? (
            <div className="mt-3 space-y-2">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link to="/dashboard" onClick={closeMobile}>
                  <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" className="w-full" size="sm" asChild>
                  <Link to="/admin" onClick={closeMobile}>
                    <Shield className="w-4 h-4 mr-1" /> Admin Panel
                  </Link>
                </Button>
              )}
              <Button variant="ghost" className="w-full" size="sm" onClick={() => setShowSignOutDialog(true)}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button className="w-full mt-3" size="sm" asChild>
              <Link to="/auth" onClick={closeMobile}>
                Sign In
              </Link>
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
            <Button onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};

export default Navbar;
