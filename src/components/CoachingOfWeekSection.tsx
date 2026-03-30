import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Star, Award, TrendingUp, ArrowRight, Gift, Copy, CheckCircle, BookOpen,
  FileText, Users, Target, Trophy, Zap, GraduationCap, Medal, Flame,
  MapPin, Sparkles, PartyPopper, X, Scissors, Tag, ExternalLink, Clipboard,
  ClipboardCheck, Globe, BadgeCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
          <motion.div
            className="relative bg-card rounded-3xl p-8 md:p-10 max-w-md w-full text-center shadow-2xl border border-border overflow-hidden"
            initial={{ scale: 0.5, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                style={{ background: ["hsl(var(--primary))", "#fbbf24", "#ef4444", "#22c55e", "#8b5cf6", "#f97316"][i % 6], left: `${10 + Math.random() * 80}%`, top: "-10px" }}
                animate={{ y: [0, 400 + Math.random() * 200], x: [0, (Math.random() - 0.5) * 150], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)], opacity: [1, 0] }}
                transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5, ease: "easeOut" }}
              />
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
    { icon: Globe, label: "Visit Website", color: "from-blue-500 to-blue-600", link: websiteUrl },
    { icon: ClipboardCheck, label: "Paste Code", color: "from-amber-500 to-amber-600" },
    { icon: BadgeCheck, label: "Claim Offer", color: "from-green-500 to-green-600" },
  ];

  return (
    <div className="flex items-center justify-between gap-1 w-full">
      {steps.map((step, i) => {
        const isActive = i === activeStep;
        const isDone = i < activeStep;
        const StepIcon = step.icon;

        return (
          <div key={i} className="flex items-center flex-1 last:flex-grow-0">
            <motion.div
              className="flex flex-col items-center gap-1.5 relative"
              animate={isActive ? { scale: [1, 1.08, 1] } : {}}
              transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
            >
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                isDone ? "bg-green-500 text-white shadow-md shadow-green-500/30" :
                isActive ? `bg-gradient-to-br ${step.color} text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20` :
                "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-bold text-center leading-tight ${isActive ? "text-primary" : isDone ? "text-green-600" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {isActive && (
                <motion.div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 rounded-full overflow-hidden bg-muted">
                <motion.div
                  className={`h-full rounded-full ${isDone ? "bg-green-500" : isActive ? "bg-primary" : "bg-transparent"}`}
                  initial={{ width: "0%" }}
                  animate={{ width: isDone ? "100%" : isActive ? "50%" : "0%" }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Mini Results Chart ── */
const MiniResultsChart = ({ results }: { results: any[] }) => {
  if (!results || results.length === 0) return null;
  const maxVal = Math.max(...results.map(r => r.students_placed || 0), 1);

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-4">
      <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-primary" /> Year-on-Year Results
      </h4>
      <div className="flex items-end gap-2 h-24">
        {results.sort((a, b) => a.year - b.year).slice(-5).map((r, i) => {
          const height = Math.max(((r.students_placed || 0) / maxVal) * 100, 8);
          return (
            <motion.div key={r.id || i} className="flex-1 flex flex-col items-center gap-1"
              initial={{ height: 0, opacity: 0 }} whileInView={{ height: "auto", opacity: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <span className="text-[10px] font-bold text-primary">{r.students_placed || 0}</span>
              <motion.div
                className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg"
                initial={{ height: 0 }}
                whileInView={{ height: `${height}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
                style={{ minHeight: "6px" }}
              />
              <span className="text-[9px] text-muted-foreground font-semibold">{r.year}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {results.length > 0 && (() => {
          const latest = results.sort((a, b) => b.year - a.year)[0];
          const prev = results.sort((a, b) => b.year - a.year)[1];
          const growth = prev && prev.students_placed ? Math.round(((latest.students_placed - prev.students_placed) / prev.students_placed) * 100) : 0;
          return (
            <>
              <div className="bg-card rounded-lg p-2 border border-border">
                <div className="text-xs font-extrabold text-foreground">{latest.conversions || 0}%</div>
                <div className="text-[9px] text-muted-foreground">Conversion</div>
              </div>
              <div className="bg-card rounded-lg p-2 border border-border">
                <div className="text-xs font-extrabold text-foreground">{latest.total_calls || 0}</div>
                <div className="text-[9px] text-muted-foreground">Total Calls</div>
              </div>
              <div className="bg-card rounded-lg p-2 border border-border">
                <div className={`text-xs font-extrabold ${growth >= 0 ? "text-green-600" : "text-destructive"}`}>{growth > 0 ? "+" : ""}{growth}%</div>
                <div className="text-[9px] text-muted-foreground">YoY Growth</div>
              </div>
            </>
          );
        })()}
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

  // Animate step progress continuously
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

                  {/* Offer ribbon – clean, no red border */}
                  {cotw.offer_text && (
                    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground px-6 py-2.5 flex items-center justify-center gap-2 text-sm font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>{cotw.offer_text}</span>
                      {(cotw as any).coupon_discount && <Badge className="bg-white/20 text-white border-none ml-2 text-xs">{(cotw as any).coupon_discount}</Badge>}
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Banner */}
                    <div className="lg:w-[340px] xl:w-[400px] flex-shrink-0 relative">
                      {cotw.banner_url ? (
                        <div className="relative h-60 sm:h-72 lg:h-full min-h-[300px]">
                          <img src={cotw.banner_url} alt={inst?.name} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                            <div className="flex items-center gap-3 mb-3">
                              {inst?.logo_url && <img src={inst.logo_url} alt="" className="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 shadow-xl" loading="lazy" />}
                              <div>
                                <h3 className="text-xl font-bold text-white leading-tight">{inst?.name}</h3>
                                <div className="flex items-center gap-1 text-white/70 text-sm mt-0.5"><MapPin className="w-3.5 h-3.5" /> {inst?.city}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
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
                      ) : (
                        <div className="h-60 sm:h-72 lg:h-full min-h-[300px] hero-gradient flex flex-col items-center justify-center p-6">
                          {inst?.logo_url && <img src={inst.logo_url} alt="" className="w-20 h-20 rounded-2xl object-contain bg-white/10 p-2 mb-4 backdrop-blur-sm" loading="lazy" />}
                          <h3 className="text-2xl font-bold text-primary-foreground text-center">{inst?.name}</h3>
                          <p className="text-primary-foreground/70 mt-1 text-sm flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{inst?.city}</p>
                        </div>
                      )}
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

                      {/* Results Chart */}
                      {itemResults.length > 0 && (
                        <div className="mb-5">
                          <MiniResultsChart results={itemResults} />
                        </div>
                      )}

                      {/* 4-Step Animated Progress */}
                      {hasCoupon && (
                        <div className="mb-5 bg-gradient-to-r from-muted/50 to-muted/30 border border-border rounded-2xl p-4">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">How to Claim</h4>
                          <StepProgress activeStep={activeSteps[cotw.id] ?? 0} websiteUrl={websiteUrl} />
                        </div>
                      )}

                      {/* Coupon Section – only visible when logged in */}
                      {hasCoupon && (
                        <div className="mb-5">
                          {user ? (
                            <motion.div className="relative bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/15 rounded-2xl p-4 md:p-5 overflow-hidden"
                              whileHover={{ scale: 1.005 }}>
                              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-primary/15" />
                              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-primary/15" />
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Scissors className="w-6 h-6 text-primary" />
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
                            <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" className="w-full font-bold" size="sm"><ExternalLink className="w-4 h-4 mr-2" /> Visit Website</Button>
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
