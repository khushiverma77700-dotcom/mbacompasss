import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Star, TrendingUp, Gift, CheckCircle, BookOpen,
  Users, Target, GraduationCap, Flame,
  MapPin, Sparkles, PartyPopper, X, Scissors, Tag, ExternalLink, Clipboard,
  ClipboardCheck, Globe, BadgeCheck, Trophy, Zap, Award, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { useToast } from "@/hooks/use-toast";

/* ── Celebration Overlay ── */
const CelebrationOverlay = ({
  show, onClose, discount, coachingName, courses, couponCode
}: {
  show: boolean; onClose: () => void;
  discount: string; coachingName: string; courses: string; couponCode: string;
}) => {
  useEffect(() => {
    if (show) { const t = setTimeout(onClose, 6000); return () => clearTimeout(t); }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div className="relative bg-card rounded-3xl p-8 md:p-10 max-w-md w-full text-center shadow-2xl border border-border overflow-hidden"
            initial={{ scale: 0.5, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}>
            {[...Array(20)].map((_, i) => (
              <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                style={{ background: ["hsl(var(--primary))", "#fbbf24", "#ef4444", "#22c55e", "#8b5cf6", "#f97316"][i % 6], left: `${10 + Math.random() * 80}%`, top: "-10px" }}
                animate={{ y: [0, 400 + Math.random() * 200], x: [0, (Math.random() - 0.5) * 150], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)], opacity: [1, 0] }}
                transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5, ease: "easeOut" }} />
            ))}
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"><X className="w-5 h-5" /></button>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -10, 10, 0] }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-5 shadow-lg shadow-green-500/30">
              <PartyPopper className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h3 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="font-heading text-2xl md:text-3xl font-extrabold text-foreground mb-2">🎉 Congratulations!</motion.h3>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-muted-foreground mb-4">You've claimed an exclusive offer!</motion.p>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: "spring" }}
              className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-dashed border-primary/30 rounded-2xl p-5 mb-5">
              <div className="text-4xl md:text-5xl font-extrabold text-primary mb-1">{discount}</div>
              <div className="text-sm font-semibold text-foreground">on {coachingName}</div>
              {courses && <div className="text-xs text-muted-foreground mt-1">{courses}</div>}
              <div className="mt-3 inline-flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
                <Tag className="w-4 h-4 text-primary" />
                <code className="font-mono font-bold text-foreground tracking-wider text-lg">{couponCode}</code>
              </div>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-xs text-muted-foreground">Coupon code copied to clipboard!</motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── Animated Step Progress ── */
const StepProgress = ({ activeStep, websiteUrl }: { activeStep: number; websiteUrl?: string }) => {
  const steps = [
    { icon: Clipboard, label: "Copy Code", color: "from-primary to-primary/80" },
    { icon: Globe, label: "Visit Website", color: "from-blue-500 to-blue-600" },
    { icon: ClipboardCheck, label: "Paste Code", color: "from-amber-500 to-amber-600" },
    { icon: BadgeCheck, label: "Claim Offer", color: "from-green-500 to-green-600" },
  ];

  return (
    <div className="flex items-center justify-between gap-1 w-full">
      {steps.map((step, i) => {
        const isActive = i === activeStep;
        const isDone = i < activeStep;
        const StepIcon = step.icon;
        const isWebsiteStep = i === 1 && websiteUrl;

        const stepContent = (
          <motion.div className="flex flex-col items-center gap-1.5 relative"
            animate={isActive ? { scale: [1, 1.08, 1] } : {}}
            transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}>
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
              isDone ? "bg-green-500 text-white shadow-md shadow-green-500/30" :
              isActive ? `bg-gradient-to-br ${step.color} text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20` :
              "bg-muted text-muted-foreground"
            }`}>
              {isDone ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
            </div>
            <span className={`text-[10px] font-bold text-center leading-tight ${
              isActive ? "text-primary" : isDone ? "text-green-600" : "text-muted-foreground"
            } ${isWebsiteStep ? "underline decoration-dotted" : ""}`}>
              {step.label}
            </span>
            {isActive && (
              <motion.div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }} />
            )}
          </motion.div>
        );

        return (
          <div key={i} className="flex items-center flex-1 last:flex-grow-0">
            {isWebsiteStep ? (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer hover:opacity-80 transition-opacity">
                {stepContent}
              </a>
            ) : stepContent}
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 rounded-full overflow-hidden bg-muted">
                <motion.div
                  className={`h-full rounded-full ${isDone ? "bg-green-500" : isActive ? "bg-primary" : "bg-transparent"}`}
                  initial={{ width: "0%" }}
                  animate={{ width: isDone ? "100%" : isActive ? "50%" : "0%" }}
                  transition={{ duration: 0.8, ease: "easeInOut" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Animated Bar ── */
const AnimatedBar = ({ value, maxVal, color, delay }: { value: number; maxVal: number; color: string; delay: number }) => {
  const pct = Math.max((value / maxVal) * 100, 8);
  return (
    <motion.div className={`w-full rounded-t-md ${color}`}
      initial={{ height: 0 }} whileInView={{ height: `${pct}%` }}
      viewport={{ once: true }} transition={{ delay, duration: 0.7, ease: "easeOut" }}
      style={{ minHeight: "6px" }} />
  );
};

/* ── Professional Results Dashboard ── */
const ResultsDashboard = ({ results }: { results: any[] }) => {
  if (!results || results.length === 0) return null;
  const sorted = [...results].sort((a, b) => a.year - b.year).slice(-5);
  const latest = [...results].sort((a, b) => b.year - a.year)[0];
  const prev = [...results].sort((a, b) => b.year - a.year)[1];
  const maxPlaced = Math.max(...sorted.map(r => r.students_placed || 0), 1);
  const maxPercentile = Math.max(...sorted.map(r => (r.cat_99_plus || 0) + (r.xat_99_plus || 0)), 1);
  const growth = prev?.students_placed ? Math.round(((latest.students_placed - prev.students_placed) / prev.students_placed) * 100) : 0;

  const highlightStats = [
    { label: "Total Calls", value: latest.total_calls || 0, icon: Users, accent: "text-primary", bg: "bg-primary/10" },
    { label: "Conversions", value: `${latest.conversions || 0}%`, icon: TrendingUp, accent: "text-green-600", bg: "bg-green-500/10" },
    { label: "IIM-A Selections", value: latest.iim_a_selections || 0, icon: Award, accent: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "IIM-B Selections", value: latest.iim_b_selections || 0, icon: GraduationCap, accent: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "CAT 99+%ile", value: latest.cat_99_plus || 0, icon: Target, accent: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "XAT 99+%ile", value: latest.xat_99_plus || 0, icon: BarChart3, accent: "text-rose-600", bg: "bg-rose-500/10" },
    { label: "Students Placed", value: latest.students_placed || 0, icon: Trophy, accent: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "YoY Growth", value: `${growth > 0 ? "+" : ""}${growth}%`, icon: TrendingUp, accent: growth >= 0 ? "text-green-600" : "text-destructive", bg: growth >= 0 ? "bg-green-500/10" : "bg-destructive/10" },
  ];

  return (
    <div className="bg-gradient-to-br from-muted/40 via-background to-muted/30 border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <h4 className="font-heading font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Results & Performance — {latest.year}
        </h4>
      </div>

      {/* Stats Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {highlightStats.map((s, i) => (
            <motion.div key={i} className={`${s.bg} rounded-xl p-3 text-center`}
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <s.icon className={`w-4 h-4 ${s.accent} mx-auto mb-1.5`} />
              <div className={`text-base md:text-lg font-extrabold ${s.accent}`}>{s.value}</div>
              <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider leading-tight">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Students Placed Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Students Placed (Year-on-Year)</h5>
            <div className="flex items-end gap-3 h-32">
              {sorted.map((r, i) => (
                <div key={r.id || i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <motion.span className="text-[10px] font-bold text-primary"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.5 }}>
                    {r.students_placed || 0}
                  </motion.span>
                  <div className="w-full flex-1 flex items-end">
                    <AnimatedBar value={r.students_placed || 0} maxVal={maxPlaced} color="bg-gradient-to-t from-primary to-primary/50" delay={i * 0.12} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{r.year}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 99+ Percentile Stacked Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">99+ Percentile Achievers</h5>
            <div className="flex items-end gap-3 h-32">
              {sorted.map((r, i) => {
                const catVal = r.cat_99_plus || 0;
                const xatVal = r.xat_99_plus || 0;
                const total = catVal + xatVal;
                return (
                  <div key={r.id || i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <motion.span className="text-[10px] font-bold text-foreground"
                      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.5 }}>
                      {total}
                    </motion.span>
                    <div className="w-full flex-1 flex flex-col items-stretch justify-end gap-0.5">
                      <AnimatedBar value={xatVal} maxVal={maxPercentile} color="bg-gradient-to-t from-amber-500 to-amber-400" delay={i * 0.12 + 0.1} />
                      <AnimatedBar value={catVal} maxVal={maxPercentile} color="bg-gradient-to-t from-purple-600 to-purple-400" delay={i * 0.12} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold">{r.year}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500" /><span className="text-[10px] text-muted-foreground font-medium">CAT</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-[10px] text-muted-foreground font-medium">XAT</span></div>
            </div>
          </div>
        </div>

        {/* IIM Selections Trend */}
        <div className="mt-5 bg-card border border-border rounded-xl p-4">
          <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">IIM Selections Trend</h5>
          <div className="space-y-3">
            {sorted.map((r, i) => {
              const iimA = r.iim_a_selections || 0;
              const iimB = r.iim_b_selections || 0;
              const maxIIM = Math.max(...sorted.map(s => (s.iim_a_selections || 0) + (s.iim_b_selections || 0)), 1);
              const totalIIM = iimA + iimB;
              const pct = (totalIIM / maxIIM) * 100;
              return (
                <motion.div key={r.id || i} className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <span className="text-xs font-bold text-muted-foreground w-10">{r.year}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden flex">
                    <motion.div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center"
                      initial={{ width: 0 }} whileInView={{ width: `${(iimA / Math.max(totalIIM, 1)) * pct}%` }}
                      viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}>
                      {iimA > 3 && <span className="text-[9px] font-bold text-white px-1">A: {iimA}</span>}
                    </motion.div>
                    <motion.div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center"
                      initial={{ width: 0 }} whileInView={{ width: `${(iimB / Math.max(totalIIM, 1)) * pct}%` }}
                      viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.1, duration: 0.6 }}>
                      {iimB > 3 && <span className="text-[9px] font-bold text-white px-1">B: {iimB}</span>}
                    </motion.div>
                  </div>
                  <span className="text-xs font-extrabold text-foreground w-8 text-right">{totalIIM}</span>
                </motion.div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-[10px] text-muted-foreground font-medium">IIM Ahmedabad</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /><span className="text-[10px] text-muted-foreground font-medium">IIM Bangalore</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Section ── */
const CoachingOfWeekSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [activeSteps, setActiveSteps] = useState<Record<string, number>>({});
  const [celebration, setCelebration] = useState<{
    show: boolean; discount: string; coachingName: string; courses: string; couponCode: string;
  }>({ show: false, discount: "", coachingName: "", courses: "", couponCode: "" });

  const { data: cotwItems } = useQuery({
    queryKey: ["coaching-of-week-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coaching_of_week")
        .select("*, institutes(name, slug, logo_url, rating, city, students_count, success_rate, mode, features, total_reviews, website)")
        .eq("active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: coachingResults } = useQuery({
    queryKey: ["coaching-results"],
    queryFn: async () => {
      const { data } = await supabase.from("coaching_results").select("*").order("year", { ascending: true });
      return data || [];
    },
  });

  useEffect(() => {
    if (!cotwItems || cotwItems.length === 0) return;
    const interval = setInterval(() => {
      setActiveSteps(prev => {
        const next: Record<string, number> = {};
        cotwItems.forEach((c: any) => {
          const current = prev[c.id] ?? 0;
          next[c.id] = (current + 1) % 4;
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [cotwItems]);

  if (!cotwItems || cotwItems.length === 0) return null;

  const requireLogin = (message: string, callback?: () => void) => {
    if (!user) { setLoginMessage(message); setLoginOpen(true); }
    else { callback?.(); }
  };

  const handleClaimCoupon = (cotw: any) => {
    const inst = cotw.institutes;
    const code = (cotw as any).coupon_code || cotw.offer_text || "MBAHUB70";
    const discount = (cotw as any).coupon_discount || cotw.offer_text || "Special Discount";
    const courses = (cotw as any).selected_courses || "All Courses";
    navigator.clipboard.writeText(code);
    setClaimedIds(prev => new Set(prev).add(cotw.id));
    setCelebration({ show: true, discount, coachingName: inst?.name || "Selected Coaching", courses, couponCode: code });
  };

  return (
    <>
      <section className="py-16 md:py-20 relative overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-12 md:mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold mb-5 border border-primary/20">
              <Flame className="w-4 h-4" /> Coaching of the Week
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
              Featured Institutes <span className="text-gradient">This Week</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
              Hand-picked coaching centres with exclusive offers, proven results & thousands of successful students
            </p>
          </motion.div>

          <div className="space-y-10 md:space-y-14">
            {cotwItems.map((cotw: any, idx: number) => {
              const inst = cotw.institutes;
              const isClaimed = claimedIds.has(cotw.id);
              const couponCode = (cotw as any).coupon_code || "";
              const hasCoupon = !!couponCode;
              const websiteUrl = (cotw as any).website_url || inst?.website || "";
              const itemResults = (coachingResults || []).filter((r: any) => r.coaching_of_week_id === cotw.id);

              return (
                <motion.div key={cotw.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }} transition={{ delay: idx * 0.1, duration: 0.6 }}
                  className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden group hover:shadow-2xl transition-shadow duration-500">

                  {/* Clean offer ribbon – NO top blue coupon border */}
                  {cotw.offer_text && (
                    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white px-6 py-2.5 flex items-center justify-center gap-2 text-sm font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>{cotw.offer_text}</span>
                      {(cotw as any).coupon_discount && (
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-1">{(cotw as any).coupon_discount}</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Institute Info Panel – static gradient, no cropped images */}
                    <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0 relative">
                      <div className="h-64 sm:h-80 lg:h-full min-h-[320px] hero-gradient flex flex-col items-center justify-center p-6 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                          {[...Array(6)].map((_, i) => (
                            <motion.div key={i} className="absolute w-20 h-20 border border-white/20 rounded-2xl"
                              style={{ left: `${15 + i * 15}%`, top: `${10 + (i % 3) * 30}%`, rotate: `${i * 15}deg` }}
                              animate={{ rotate: [i * 15, i * 15 + 360] }}
                              transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "linear" }} />
                          ))}
                        </div>
                        {inst?.logo_url && (
                          <img src={inst.logo_url} alt="" className="w-24 h-24 rounded-2xl object-contain bg-white/10 p-2 mb-4 backdrop-blur-sm relative z-10" loading="lazy" />
                        )}
                        <h3 className="text-2xl font-bold text-primary-foreground text-center relative z-10">{inst?.name}</h3>
                        <p className="text-primary-foreground/70 mt-1 text-sm flex items-center gap-1 relative z-10"><MapPin className="w-3.5 h-3.5" />{inst?.city}</p>
                        <div className="flex items-center gap-3 flex-wrap mt-4 relative z-10">
                          {inst?.rating && (
                            <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <span className="text-white font-bold text-sm">{inst.rating}</span>
                              <span className="text-white/60 text-xs">({inst.total_reviews || 0})</span>
                            </div>
                          )}
                          <Badge className="bg-white/15 text-white border-none backdrop-blur-sm">{inst?.mode || "Offline"}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 p-5 md:p-7 lg:p-8 flex flex-col">
                      <div className="mb-5">
                        <h3 className="text-xl md:text-2xl font-extrabold text-foreground mb-2 leading-tight">{cotw.headline || inst?.name}</h3>
                        {cotw.description && <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: cotw.description }} />}
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        {[
                          { icon: Users, value: `${inst?.students_count || 500}+`, label: "Students", bg: "bg-primary/10", color: "text-primary" },
                          { icon: Target, value: `${inst?.success_rate || 85}%`, label: "Success", bg: "bg-green-500/10", color: "text-green-600" },
                          { icon: Star, value: `${inst?.rating || 4.5}/5`, label: "Rating", bg: "bg-amber-500/10", color: "text-amber-500" },
                          { icon: GraduationCap, value: `${inst?.total_reviews || 50}+`, label: "Reviews", bg: "bg-blue-500/10", color: "text-blue-500" },
                        ].map((s, i) => (
                          <motion.div key={i} className={`${s.bg} rounded-xl p-3 text-center`}
                            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                            <div className="text-lg font-extrabold text-foreground">{s.value}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Features */}
                      {(inst?.features || []).length > 0 && (
                        <div className="mb-5 flex flex-wrap gap-2">
                          {(inst.features as string[]).slice(0, 6).map((f: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded-lg px-3 py-1.5 text-foreground font-medium">
                              <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />{f}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Results Dashboard – Professional Charts */}
                      {itemResults.length > 0 && (
                        <div className="mb-5">
                          <ResultsDashboard results={itemResults} />
                        </div>
                      )}

                      {/* 4-Step Animated Progress – with clickable Visit Website */}
                      {hasCoupon && (
                        <div className="mb-5 bg-gradient-to-r from-muted/50 to-muted/30 border border-border rounded-2xl p-4">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">How to Claim Your Offer</h4>
                          <StepProgress activeStep={activeSteps[cotw.id] ?? 0} websiteUrl={websiteUrl} />
                          {websiteUrl && (
                            <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                              className="mt-3 flex items-center justify-center gap-2 text-xs text-primary font-bold hover:underline transition-all">
                              <ExternalLink className="w-3.5 h-3.5" /> Visit {inst?.name} Website →
                            </a>
                          )}
                        </div>
                      )}

                      {/* Coupon Section – only visible when logged in */}
                      {hasCoupon && (
                        <div className="mb-5">
                          {user ? (
                            <motion.div className="relative bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-4 md:p-5 overflow-hidden"
                              whileHover={{ scale: 1.005 }}>
                              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-emerald-200 dark:border-emerald-800/30" />
                              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-emerald-200 dark:border-emerald-800/30" />
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                    <Scissors className="w-6 h-6 text-emerald-600" />
                                  </div>
                                  <div>
                                    <div className="text-lg md:text-xl font-extrabold text-foreground">{(cotw as any).coupon_discount || "Special Discount"}</div>
                                    <div className="text-xs text-muted-foreground font-medium">Use code during enrollment</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="bg-card border border-border rounded-lg px-4 py-2 font-mono font-bold text-foreground tracking-widest text-base md:text-lg">
                                    {couponCode}
                                  </div>
                                  <Button size="sm" onClick={() => handleClaimCoupon(cotw)}
                                    className={`font-bold shadow-md transition-all ${isClaimed ? "bg-green-500 hover:bg-green-600" : ""}`}>
                                    {isClaimed ? <><CheckCircle className="w-4 h-4 mr-1" /> Claimed!</> : <><Gift className="w-4 h-4 mr-1" /> Claim</>}
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div className="bg-muted/50 border border-border rounded-2xl p-5 text-center" whileHover={{ scale: 1.005 }}>
                              <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
                              <p className="text-sm font-bold text-foreground mb-1">Exclusive Coupon Available</p>
                              <p className="text-xs text-muted-foreground mb-3">Sign in to reveal the coupon code & claim your discount</p>
                              <Button size="sm" onClick={() => requireLogin("Sign in to unlock this exclusive coupon code and claim your discount!")}>
                                <Gift className="w-4 h-4 mr-1" /> Sign In to Reveal
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* Offer Details */}
                      {cotw.offer_details && (
                        <div className="bg-accent/20 border border-accent/30 rounded-xl p-4 mb-5">
                          <h4 className="font-bold text-sm text-foreground mb-1 flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Offer Details</h4>
                          <div className="text-xs text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.offer_details }} />
                        </div>
                      )}

                      {/* Bottom CTA */}
                      <div className="mt-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {cotw.results_summary && (
                          <div className="flex-1 bg-primary/5 border border-primary/15 rounded-xl p-3 flex items-start gap-2">
                            <Trophy className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.results_summary }} />
                          </div>
                        )}
                        <div className="flex flex-col gap-2 sm:min-w-[180px]">
                          {inst?.slug && (
                            <Link to={`/institute/${inst.slug}`}>
                              <Button className="w-full font-bold shadow-md" size="lg"><BookOpen className="w-4 h-4 mr-2" /> View Details</Button>
                            </Link>
                          )}
                          {websiteUrl && (
                            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="block">
                              <Button variant="outline" className="w-full font-bold gap-2" size="default">
                                <ExternalLink className="w-4 h-4" /> Visit Website
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <CelebrationOverlay show={celebration.show} onClose={() => setCelebration(prev => ({ ...prev, show: false }))}
        discount={celebration.discount} coachingName={celebration.coachingName} courses={celebration.courses} couponCode={celebration.couponCode} />
      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
    </>
  );
};

export default CoachingOfWeekSection;
