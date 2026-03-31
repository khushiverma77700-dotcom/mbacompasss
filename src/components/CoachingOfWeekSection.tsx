import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Star, TrendingUp, Gift, CheckCircle, BookOpen,
  Users, Target, GraduationCap, Flame,
  MapPin, PartyPopper, X, Scissors, Tag, ExternalLink,
  Globe, BadgeCheck, Trophy, Zap, Award, BarChart3
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
          <motion.div className="relative bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-border overflow-hidden"
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
              className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
              <PartyPopper className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="font-heading text-2xl font-extrabold text-foreground mb-2">🎉 Congratulations!</h3>
            <p className="text-muted-foreground mb-3 text-sm">You've claimed an exclusive offer!</p>
            <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-4 mb-4">
              <div className="text-3xl font-extrabold text-primary mb-1">{discount}</div>
              <div className="text-sm font-semibold text-foreground">on {coachingName}</div>
              {courses && <div className="text-xs text-muted-foreground mt-1">{courses}</div>}
              <div className="mt-2 inline-flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <code className="font-mono font-bold text-foreground tracking-wider">{couponCode}</code>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Coupon code copied to clipboard!</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── Compact Animated Bar ── */
const AnimatedBar = ({ value, maxVal, color, delay }: { value: number; maxVal: number; color: string; delay: number }) => {
  const pct = Math.max((value / maxVal) * 100, 8);
  return (
    <motion.div className={`w-full rounded-t-sm ${color}`}
      initial={{ height: 0 }} whileInView={{ height: `${pct}%` }}
      viewport={{ once: true }} transition={{ delay, duration: 0.6, ease: "easeOut" }}
      style={{ minHeight: "4px" }} />
  );
};

/* ── Compact Results Dashboard ── */
const ResultsDashboard = ({ results }: { results: any[] }) => {
  if (!results || results.length === 0) return null;
  const sorted = [...results].sort((a, b) => a.year - b.year).slice(-5);
  const latest = [...results].sort((a, b) => b.year - a.year)[0];
  const prev = [...results].sort((a, b) => b.year - a.year)[1];
  const maxPlaced = Math.max(...sorted.map(r => r.students_placed || 0), 1);
  const maxPercentile = Math.max(...sorted.map(r => (r.cat_99_plus || 0) + (r.xat_99_plus || 0)), 1);
  const maxCalls = Math.max(...sorted.map(r => r.total_calls || 0), 1);
  const growth = prev?.students_placed ? Math.round(((latest.students_placed - prev.students_placed) / prev.students_placed) * 100) : 0;

  const stats = [
    { label: "Calls", value: latest.total_calls || 0, icon: Users, accent: "text-primary", bg: "bg-primary/10" },
    { label: "Converts", value: latest.students_placed || 0, icon: TrendingUp, accent: "text-secondary-foreground", bg: "bg-secondary" },
    { label: "IIM-A", value: latest.iim_a_selections || 0, icon: Award, accent: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "IIM-B", value: latest.iim_b_selections || 0, icon: GraduationCap, accent: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "CAT 99+", value: latest.cat_99_plus || 0, icon: Target, accent: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "XAT 99+", value: latest.xat_99_plus || 0, icon: BarChart3, accent: "text-rose-600", bg: "bg-rose-500/10" },
    { label: "Conv %", value: `${latest.conversions || 0}%`, icon: Trophy, accent: "text-accent-foreground", bg: "bg-accent" },
    { label: "Growth", value: `${growth > 0 ? "+" : ""}${growth}%`, icon: TrendingUp, accent: growth >= 0 ? "text-green-600" : "text-destructive", bg: growth >= 0 ? "bg-green-500/10" : "bg-destructive/10" },
  ];

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-muted/20">
      <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Results {latest.year}</h4>
      </div>
      <div className="p-3">
        {/* Stats Grid - compact */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {stats.map((s, i) => (
            <motion.div key={i} className={`${s.bg} rounded-lg p-2 text-center`}
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
              <div className={`text-sm font-extrabold ${s.accent}`}>{s.value}</div>
              <div className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row - compact */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-lg p-3">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Students Placed</h5>
            <div className="flex items-end gap-2 h-20">
              {sorted.map((r, i) => (
                <div key={r.id || i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                  <span className="text-[9px] font-bold text-primary">{r.students_placed || 0}</span>
                  <div className="w-full flex-1 flex items-end">
                    <AnimatedBar value={r.students_placed || 0} maxVal={maxPlaced} color="bg-gradient-to-t from-primary to-primary/60" delay={i * 0.1} />
                  </div>
                  <span className="text-[8px] text-muted-foreground font-medium">{String(r.year).slice(-2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">99+ Percentile</h5>
            <div className="flex items-end gap-2 h-20">
              {sorted.map((r, i) => {
                const catVal = r.cat_99_plus || 0;
                const xatVal = r.xat_99_plus || 0;
                return (
                  <div key={r.id || i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                    <span className="text-[9px] font-bold text-foreground">{catVal + xatVal}</span>
                    <div className="w-full flex-1 flex flex-col items-stretch justify-end gap-px">
                      <AnimatedBar value={xatVal} maxVal={maxPercentile} color="bg-amber-500" delay={i * 0.1 + 0.05} />
                      <AnimatedBar value={catVal} maxVal={maxPercentile} color="bg-purple-500" delay={i * 0.1} />
                    </div>
                    <span className="text-[8px] text-muted-foreground font-medium">{String(r.year).slice(-2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-purple-500" /><span className="text-[8px] text-muted-foreground">CAT</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-500" /><span className="text-[8px] text-muted-foreground">XAT</span></div>
            </div>
          </div>
        </div>

        {/* Calls vs Converts Trend */}
        <div className="mt-3 bg-card border border-border rounded-lg p-3">
          <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Converts</h5>
          <div className="space-y-2">
            {sorted.map((r, i) => {
              const calls = r.total_calls || 0;
              const converts = r.students_placed || 0;
              const callsPct = (calls / maxCalls) * 100;
              const convertsPct = (converts / maxCalls) * 100;

              return (
                <motion.div key={r.id || i} className="rounded-md bg-muted/30 p-1.5"
                  initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground w-7">{String(r.year).slice(-2)}</span>
                    <span className="text-[9px] font-bold text-primary">Calls {calls}</span>
                    <span className="text-[9px] font-bold text-secondary-foreground">Converts {converts}</span>
                  </div>
                  <div className="pl-7 space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${callsPct}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08, duration: 0.5 }}
                      />
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-secondary"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${convertsPct}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 + 0.05, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-primary" /><span className="text-[8px] text-muted-foreground">Calls</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-secondary" /><span className="text-[8px] text-muted-foreground">Converts</span></div>
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
  const [celebration, setCelebration] = useState<{
    show: boolean; discount: string; coachingName: string; courses: string; couponCode: string;
  }>({ show: false, discount: "", coachingName: "", courses: "", couponCode: "" });

  const { data: cotwItems } = useQuery({
    queryKey: ["coaching-of-week-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coaching_of_week")
        .select("*, institutes(name, slug, logo_url, banner_url, rating, city, students_count, success_rate, mode, features, total_reviews, website)")
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
      <section className="py-8 md:py-10 relative overflow-hidden bg-gradient-to-b from-background to-muted/15">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-6 md:mb-8" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold mb-3 border border-primary/20">
              <Flame className="w-3.5 h-3.5" /> Coaching of the Week
            </span>
            <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-extrabold text-foreground mb-2">
              Featured Institutes <span className="text-gradient">This Week</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Hand-picked coaching centres with exclusive offers & proven results
            </p>
          </motion.div>

          <div className="space-y-5 md:space-y-6">
            {cotwItems.map((cotw: any, idx: number) => {
              const inst = cotw.institutes;
              const isClaimed = claimedIds.has(cotw.id);
              const couponCode = (cotw as any).coupon_code || "";
              const hasCoupon = !!couponCode;
              const websiteUrl = (cotw as any).website_url || inst?.website || "";
              const itemResults = (coachingResults || []).filter((r: any) => r.coaching_of_week_id === cotw.id);
              const imageUrl = cotw.banner_url || inst?.banner_url;

              return (
                <motion.div key={cotw.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }} transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">

                  <div className="flex flex-col">
                    {/* Top: Horizontal banner image */}
                    <div className="relative w-full bg-muted border-b border-border">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={inst?.name || "Institute"}
                          className="w-full h-36 sm:h-40 md:h-44 object-contain object-center"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-36 sm:h-40 md:h-44 hero-gradient flex items-center justify-center">
                          <GraduationCap className="w-12 h-12 text-primary-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 p-4 md:p-5 flex flex-col">
                      <div className="mb-3">
                        <h3 className="text-lg font-extrabold text-foreground mb-1 leading-tight">{cotw.headline || inst?.name}</h3>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{inst?.city}</span>
                          {inst?.rating && (
                            <span className="flex items-center gap-0.5 bg-card rounded px-1.5 py-0.5 text-xs text-foreground border border-border">
                              <Star className="w-3 h-3 fill-primary text-primary" />{inst.rating}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-[10px] py-0">{inst?.mode || "Offline"}</Badge>
                        </div>
                        {cotw.description && <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: cotw.description }} />}
                      </div>

                      {/* Compact Stats */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                          { icon: Users, value: `${inst?.students_count || 500}+`, label: "Students", color: "text-primary" },
                          { icon: Target, value: `${inst?.success_rate || 85}%`, label: "Success", color: "text-green-600" },
                          { icon: Star, value: `${inst?.rating || 4.5}`, label: "Rating", color: "text-amber-500" },
                          { icon: GraduationCap, value: `${inst?.total_reviews || 50}+`, label: "Reviews", color: "text-blue-500" },
                        ].map((s, i) => (
                          <div key={i} className="text-center py-2 bg-muted/50 rounded-lg">
                            <s.icon className={`w-3.5 h-3.5 ${s.color} mx-auto mb-0.5`} />
                            <div className="text-sm font-extrabold text-foreground">{s.value}</div>
                            <div className="text-[8px] text-muted-foreground font-semibold uppercase">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Features - compact */}
                      {(inst?.features || []).length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {(inst.features as string[]).slice(0, 5).map((f: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-muted rounded-md px-2 py-1 text-foreground font-medium">
                              <CheckCircle className="w-2.5 h-2.5 text-primary flex-shrink-0" />{f}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Results Dashboard */}
                      {itemResults.length > 0 && (
                        <div className="mb-3">
                          <ResultsDashboard results={itemResults} />
                        </div>
                      )}

                      {/* Coupon Section - compact */}
                      {hasCoupon && (
                        <div className="mb-3">
                          {user ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Scissors className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                <div>
                                  <span className="text-sm font-extrabold text-foreground">{(cotw as any).coupon_discount || "Discount"}</span>
                                  <span className="text-xs text-muted-foreground ml-2">Use code:</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="bg-card border border-border rounded-lg px-3 py-1.5 font-mono font-bold text-foreground tracking-widest text-sm">{couponCode}</code>
                                <Button size="sm" onClick={() => handleClaimCoupon(cotw)}
                                  className={`font-bold text-xs ${isClaimed ? "bg-green-500 hover:bg-green-600" : ""}`}>
                                  {isClaimed ? <><CheckCircle className="w-3.5 h-3.5 mr-1" />Copied</> : <><Gift className="w-3.5 h-3.5 mr-1" />Claim</>}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Gift className="w-5 h-5 text-primary" />
                                <span className="text-xs font-semibold text-foreground">Exclusive coupon available</span>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => requireLogin("Sign in to unlock this exclusive coupon!")}>
                                Sign In to Reveal
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom CTA - compact */}
                      <div className="mt-auto flex items-center gap-2 pt-2 border-t border-border">
                        {inst?.slug && (
                          <Link to={`/institute/${inst.slug}`} className="flex-1">
                            <Button className="w-full font-bold text-sm" size="sm"><BookOpen className="w-3.5 h-3.5 mr-1.5" />View Details</Button>
                          </Link>
                        )}
                        {websiteUrl && (
                          <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="outline" className="w-full font-bold text-sm gap-1.5" size="sm">
                              <ExternalLink className="w-3.5 h-3.5" />Visit Website
                            </Button>
                          </a>
                        )}
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
