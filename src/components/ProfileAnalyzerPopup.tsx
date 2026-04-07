import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, BarChart3, Target, Users, Brain, CheckCircle2, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const POPUP_DISMISSED_KEY = "profile_popup_dismissed";
const POPUP_DELAY_MS = 8000;

const ProfileAnalyzerPopup = () => {
  const [open, setOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (
      location.pathname === "/profile-analyzer" ||
      location.pathname.startsWith("/admin")
    ) return;

    const dismissed = sessionStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissed) return;

    // If user is logged in, check if they already have an analysis
    if (user) {
      const checkExisting = async () => {
        const { data } = await supabase
          .from("profile_analyses")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (data && data.length > 0) {
          // User already analyzed — don't show popup
          sessionStorage.setItem(POPUP_DISMISSED_KEY, "true");
          return;
        }
        // No existing analysis, show popup after delay
        const timer = setTimeout(() => setOpen(true), POPUP_DELAY_MS);
        return () => clearTimeout(timer);
      };
      const cleanup = checkExisting();
      return () => { cleanup?.then(fn => fn?.()); };
    }

    const timer = setTimeout(() => {
      setOpen(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [location.pathname, user]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, [open]);

  const handleDismiss = () => {
    setOpen(false);
    sessionStorage.setItem(POPUP_DISMISSED_KEY, "true");
  };

  const handleCTA = () => {
    handleDismiss();
    navigate("/profile-analyzer");
  };

  const features = [
    { icon: BarChart3, label: "5-D Score", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Target, label: "Predictor", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Users, label: "Peer Rank", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Brain, label: "AI Plan", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const bars = [
    { label: "Academics", width: "82%", color: "bg-blue-500" },
    { label: "Work Exp", width: "65%", color: "bg-emerald-500" },
    { label: "Diversity", width: "74%", color: "bg-amber-500" },
    { label: "Leadership", width: "58%", color: "bg-purple-500" },
    { label: "Consistency", width: "90%", color: "bg-rose-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-[360px] w-[90vw] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
        {/* Compact gradient header */}
        <div className="relative hero-gradient px-5 pt-5 pb-8 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-white leading-tight">
                  AI Profile Analyser
                </h2>
                <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">Free • Instant • No Signup</p>
              </div>
            </div>
            <p className="text-white/80 text-xs leading-relaxed">
              Get your <span className="font-bold text-white">IIM admission probability</span> & AI roadmap in 2 minutes.
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-white/70" />
              <span className="text-[10px] font-bold text-white/90">25,000+ Users Already Analysed — Check Where You Stand</span>
            </div>
          </div>
        </div>

        {/* Score preview card — overlapping header */}
        <div className="px-4 -mt-5 relative z-10">
          <div className="bg-card rounded-xl border border-border shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Sample Preview</span>
              <span className="text-[9px] font-bold text-primary flex items-center gap-0.5 animate-pulse">
                <Zap className="w-2.5 h-2.5" /> LIVE
              </span>
            </div>

            <div className="space-y-1.5">
              {bars.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] font-medium text-muted-foreground">{item.label}</span>
                    <span className="text-[9px] font-bold text-foreground">{item.width}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-1000`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground">Overall Score</span>
              <div className="flex items-center gap-1">
                <div className="w-7 h-7 rounded-md hero-gradient flex items-center justify-center">
                  <span className="text-[10px] font-extrabold text-white">74</span>
                </div>
                <span className="text-[9px] text-muted-foreground">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature icons row */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-4 gap-1.5">
            {features.map((f, i) => (
              <button
                key={f.label}
                onClick={() => setActiveFeature(i)}
                className={`text-center p-2 rounded-lg border transition-all ${
                  activeFeature === i
                    ? `${f.bg} border-current/20 shadow-sm`
                    : "bg-muted/30 border-border/50"
                }`}
              >
                <f.icon className={`w-4 h-4 mx-auto mb-0.5 ${activeFeature === i ? f.color : "text-muted-foreground"}`} />
                <p className={`text-[8px] font-bold leading-tight ${activeFeature === i ? "text-foreground" : "text-muted-foreground"}`}>
                  {f.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-4 pt-3 space-y-2">
          <Button onClick={handleCTA} className="w-full rounded-xl group h-10 text-sm font-bold shadow-lg hover:shadow-xl transition-all">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Analyse My Profile — Free
            <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <div className="flex items-center justify-center gap-3 text-[9px] text-muted-foreground">
            {["100% Free", "No Signup", "Instant", "AI Powered"].map((t) => (
              <span key={t} className="flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 text-primary/60" /> {t}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileAnalyzerPopup;
