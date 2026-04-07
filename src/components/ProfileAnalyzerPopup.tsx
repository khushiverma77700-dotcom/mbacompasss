import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const POPUP_DISMISSED_KEY = "profile_popup_dismissed";
const POPUP_DELAY_MS = 8000;

const ProfileAnalyzerPopup = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (location.pathname === "/profile-analyzer" || location.pathname.startsWith("/admin")) return;
    const dismissed = sessionStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissed) return;

    if (user) {
      const checkExisting = async () => {
        const { data } = await supabase
          .from("profile_analyses")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (data && data.length > 0) {
          sessionStorage.setItem(POPUP_DISMISSED_KEY, "true");
          return;
        }
        const timer = setTimeout(() => setOpen(true), POPUP_DELAY_MS);
        return () => clearTimeout(timer);
      };
      const cleanup = checkExisting();
      return () => { cleanup?.then(fn => fn?.()); };
    }

    const timer = setTimeout(() => setOpen(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [location.pathname, user]);

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
      <DialogContent className="max-w-[340px] w-[90vw] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl [&>button]:hidden">
        {/* Header */}
        <div className="relative hero-gradient px-5 pt-5 pb-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-sm font-bold text-white">AI Profile Analyser</h2>
                <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">Free • Instant</p>
              </div>
            </div>
            <p className="text-white/90 text-xs leading-relaxed">
              Get your <span className="font-bold text-white">IIM admission probability</span> & personalized roadmap in 2 minutes.
            </p>
          </div>
        </div>

        {/* Simple highlights */}
        <div className="px-5 pt-4 pb-1">
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { label: "5-D Score", sub: "Profile breakdown" },
              { label: "IIM Predictor", sub: "Admission chances" },
              { label: "Peer Rank", sub: "Among 25K+ users" },
              { label: "AI Roadmap", sub: "Study plan" },
            ].map((f) => (
              <div key={f.label} className="bg-muted/50 rounded-lg p-2.5">
                <div className="text-xs font-bold text-foreground">{f.label}</div>
                <div className="text-[10px] text-muted-foreground">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA + Dismiss */}
        <div className="px-5 pb-5 pt-3 space-y-2">
          <Button onClick={handleCTA} className="w-full rounded-xl group h-9 text-sm font-bold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Analyse My Profile — Free
            <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full text-xs text-muted-foreground h-8">
            I'll do it later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileAnalyzerPopup;
