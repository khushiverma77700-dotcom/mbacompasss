import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, BarChart3, Target, Users, TrendingUp, Award, Brain, CheckCircle2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const POPUP_DISMISSED_KEY = "profile_popup_dismissed";
const POPUP_DELAY_MS = 30000;

const AnimatedBar = ({ delay, width, color }: { delay: number; width: string; color: string }) => (
  <motion.div
    className={`h-2 rounded-full ${color}`}
    initial={{ width: "0%" }}
    animate={{ width }}
    transition={{ delay: delay + 0.5, duration: 1.2, ease: "easeOut" }}
  />
);

const ProfileAnalyzerPopup = () => {
  const [open, setOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      location.pathname === "/profile-analyzer" ||
      location.pathname.startsWith("/admin")
    ) return;

    const dismissed = sessionStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setOpen(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Cycle through features
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
    { icon: BarChart3, label: "5-Dimension Score", desc: "Academic, Work Exp, Diversity & more", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Target, label: "College Predictor", desc: "IIM admission probability analysis", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Users, label: "Peer Comparison", desc: "Rank among 25,000+ MBA aspirants", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Brain, label: "AI Roadmap", desc: "Personalized preparation strategy", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Top gradient banner */}
        <div className="relative hero-gradient px-6 pt-7 pb-10 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-5 -left-5 w-32 h-32 bg-white/10 rounded-full blur-2xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            />
          </div>
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 mb-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-white leading-tight">
                  AI Profile Analyser
                </h2>
                <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">Free • Instant • No Signup</p>
              </div>
            </motion.div>
            <p className="text-white/80 text-sm leading-relaxed">
              Get your personalised <span className="font-bold text-white">IIM admission probability</span>, college predictions & AI roadmap in 2 minutes.
            </p>
          </div>
        </div>

        {/* Mini report preview */}
        <div className="px-6 -mt-6 relative z-10">
          <div className="bg-card rounded-xl border border-border shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Sample Analysis Preview</span>
              <motion.span 
                className="text-[10px] font-bold text-primary flex items-center gap-0.5"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-3 h-3" /> LIVE
              </motion.span>
            </div>

            {/* Animated score bars */}
            <div className="space-y-2.5">
              {[
                { label: "Academics", width: "82%", color: "bg-blue-500" },
                { label: "Work Experience", width: "65%", color: "bg-emerald-500" },
                { label: "Profile Diversity", width: "74%", color: "bg-amber-500" },
                { label: "Leadership", width: "58%", color: "bg-purple-500" },
                { label: "Consistency", width: "90%", color: "bg-rose-500" },
              ].map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                    <span className="text-[10px] font-bold text-foreground">{item.width}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <AnimatedBar delay={i * 0.15} width={item.width} color={item.color} />
                  </div>
                </div>
              ))}
            </div>

            {/* Overall score */}
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Overall Profile Score</span>
              <motion.div
                className="flex items-center gap-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                  <span className="text-xs font-extrabold text-white">74</span>
                </div>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Features carousel */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-4 gap-2">
            {features.map((f, i) => (
              <motion.button
                key={f.label}
                onClick={() => setActiveFeature(i)}
                className={`text-center p-2.5 rounded-xl border transition-all duration-300 ${
                  activeFeature === i
                    ? `${f.bg} border-current/20 shadow-md scale-[1.02]`
                    : "bg-muted/30 border-border/50 hover:bg-muted/60"
                }`}
                whileTap={{ scale: 0.97 }}
              >
                <f.icon className={`w-5 h-5 mx-auto mb-1 ${activeFeature === i ? f.color : "text-muted-foreground"}`} />
                <p className={`text-[9px] font-bold leading-tight ${activeFeature === i ? "text-foreground" : "text-muted-foreground"}`}>
                  {f.label}
                </p>
              </motion.button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={activeFeature}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-center text-xs text-muted-foreground mt-2"
            >
              {features[activeFeature].desc}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-3 space-y-3">
          <Button onClick={handleCTA} className="w-full rounded-xl group h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all" size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            Analyse My Profile — Free
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </Button>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            {["100% Free", "No Signup", "Instant Results", "AI Powered"].map((t) => (
              <span key={t} className="flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-primary/60" /> {t}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileAnalyzerPopup;