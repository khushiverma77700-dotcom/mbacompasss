import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, BarChart3, Target, Users } from "lucide-react";

const POPUP_DISMISSED_KEY = "profile_popup_dismissed";
const POPUP_DELAY_MS = 30000; // 30 seconds

const ProfileAnalyzerPopup = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't show on profile analyzer page or admin pages
    if (
      location.pathname === "/profile-analyzer" ||
      location.pathname.startsWith("/admin")
    ) return;

    // Don't show if already dismissed this session
    const dismissed = sessionStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setOpen(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleDismiss = () => {
    setOpen(false);
    sessionStorage.setItem(POPUP_DISMISSED_KEY, "true");
  };

  const handleCTA = () => {
    handleDismiss();
    navigate("/profile-analyzer");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Check Your MBA Profile — Free!
          </DialogTitle>
          <DialogDescription>
            Get your personalised IIM admission probability, college predictions, and AI-powered preparation roadmap in just 2 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {[
            { icon: BarChart3, label: "5-Dimension Score", color: "text-blue-500" },
            { icon: Target, label: "College Predictor", color: "text-green-500" },
            { icon: Users, label: "Peer Comparison", color: "text-amber-500" },
          ].map((f) => (
            <div key={f.label} className="text-center p-3 rounded-xl bg-muted/50 border border-border/50">
              <f.icon className={`w-6 h-6 mx-auto mb-1.5 ${f.color}`} />
              <p className="text-xs font-medium">{f.label}</p>
            </div>
          ))}
        </div>

        <Button onClick={handleCTA} className="w-full rounded-xl group" size="lg">
          Analyse My Profile Free <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          100% Free • No Signup Required • Instant Results
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileAnalyzerPopup;
