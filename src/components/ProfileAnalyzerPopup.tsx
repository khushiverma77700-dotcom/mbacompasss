import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, BarChart3, Target, TrendingUp, Users, GraduationCap, CheckCircle2, X } from "lucide-react";
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

  const features = [
    { icon: BarChart3, label: "5-Dimension Profile Score", desc: "Academic, work & extracurricular analysis" },
    { icon: Target, label: "IIM Admission Predictor", desc: "College-wise probability scores" },
    { icon: Users, label: "Peer Comparison", desc: "Rank among 25,000+ aspirants" },
    { icon: TrendingUp, label: "AI Study Roadmap", desc: "Personalized preparation plan" },
  ];

  const highlights = [
    "100% Free — No hidden charges",
    "Instant AI-powered results",
    "Used by 25,000+ MBA aspirants",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-[900px] w-[95vw] md:w-[90vw] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl [&>button]:hidden gap-0">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm border border-border/50"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left Panel — Info */}
          <div className="relative md:w-[45%] p-6 md:p-8 overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-sm" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-heading text-lg md:text-xl font-bold text-white leading-tight">AI Profile Analyser</h2>
                  <p className="text-white/60 text-[10px] uppercase tracking-widest font-semibold">Free • Instant • AI-Powered</p>
                </div>
              </div>

              <p className="text-white/90 text-sm leading-relaxed mb-5">
                Get your <span className="font-bold text-white">IIM admission probability</span> & a personalized roadmap — in just 2 minutes.
              </p>

              {/* Features list */}
              <div className="space-y-3 mb-6">
                {features.map((f) => (
                  <div key={f.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                      <f.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold leading-tight">{f.label}</div>
                      <div className="text-white/60 text-xs">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <div className="space-y-1.5">
                {highlights.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                    <span className="text-white/80 text-xs">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel — CTA */}
          <div className="md:w-[55%] p-6 md:p-8 flex flex-col justify-center bg-background">
            {/* Icon + headline */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-foreground leading-tight">
                  Know Your MBA Chances
                </h3>
                <p className="text-muted-foreground text-sm">Get a detailed admission analysis report</p>
              </div>
            </div>

            <div className="border-t border-border my-4" />

            {/* What you'll get */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: BarChart3, title: "Profile Score", sub: "Out of 10 — holistic rating" },
                { icon: Target, title: "College Predictions", sub: "IIM-wise probability %" },
                { icon: TrendingUp, title: "Strengths & Gaps", sub: "Where you stand & improve" },
                { icon: Sparkles, title: "AI Roadmap", sub: "60-day personalized plan" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <item.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-foreground leading-tight">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <Button
              onClick={handleCTA}
              size="lg"
              className="w-full rounded-xl group h-12 text-base font-bold shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Analyse My Profile — It's Free
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>

            <p className="text-center text-[11px] text-muted-foreground mt-3">
              Takes only 2 minutes • No credit card required
            </p>

            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full text-xs text-muted-foreground mt-1 h-8"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileAnalyzerPopup;
