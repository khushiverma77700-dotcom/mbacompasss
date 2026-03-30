import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Star, Award, TrendingUp, ArrowRight, Gift, Copy, CheckCircle, BookOpen,
  FileText, Users, Target, Trophy, Zap, GraduationCap, Medal, Flame,
  MapPin, Sparkles, PartyPopper, X, Scissors, Tag
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
    if (show) {
      const t = setTimeout(onClose, 6000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative bg-card rounded-3xl p-8 md:p-10 max-w-md w-full text-center shadow-2xl border border-border overflow-hidden"
            initial={{ scale: 0.5, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
          >
            {/* Confetti particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ["hsl(var(--primary))", "#fbbf24", "#ef4444", "#22c55e", "#8b5cf6", "#f97316"][i % 6],
                  left: `${10 + Math.random() * 80}%`,
                  top: "-10px",
                }}
                animate={{
                  y: [0, 400 + Math.random() * 200],
                  x: [0, (Math.random() - 0.5) * 150],
                  rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}

            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10">
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-5 shadow-lg shadow-green-500/30"
            >
              <PartyPopper className="w-10 h-10 text-white" />
            </motion.div>

            <motion.h3
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-heading text-2xl md:text-3xl font-extrabold text-foreground mb-2"
            >
              🎉 Congratulations!
            </motion.h3>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-4"
            >
              You've claimed an exclusive offer!
            </motion.p>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-dashed border-primary/30 rounded-2xl p-5 mb-5"
            >
              <div className="text-4xl md:text-5xl font-extrabold text-primary mb-1">{discount}</div>
              <div className="text-sm font-semibold text-foreground">on {coachingName}</div>
              {courses && <div className="text-xs text-muted-foreground mt-1">{courses}</div>}
              <div className="mt-3 inline-flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
                <Tag className="w-4 h-4 text-primary" />
                <code className="font-mono font-bold text-foreground tracking-wider text-lg">{couponCode}</code>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-muted-foreground"
            >
              Coupon code copied to clipboard! Use it during enrollment.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── Coupon Card Component ── */
const CouponCard = ({
  couponCode, discount, onClaim, isClaimed
}: {
  couponCode: string; discount: string; onClaim: () => void; isClaimed: boolean;
}) => (
  <motion.div
    className="relative bg-gradient-to-r from-primary/5 to-accent/5 border-2 border-dashed border-primary/25 rounded-2xl p-4 md:p-5 overflow-hidden"
    whileHover={{ scale: 1.01 }}
  >
    {/* Scissors decoration */}
    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-2 border-dashed border-primary/25" />
    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-2 border-dashed border-primary/25" />

    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Scissors className="w-6 h-6 text-primary" />
        </div>
        <div>
          <div className="text-lg md:text-xl font-extrabold text-foreground">{discount}</div>
          <div className="text-xs text-muted-foreground font-medium">Use code below during enrollment</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-card border border-border rounded-lg px-4 py-2 font-mono font-bold text-foreground tracking-widest text-base md:text-lg">
          {couponCode}
        </div>
        <Button
          size="sm"
          onClick={onClaim}
          className={`font-bold shadow-md transition-all ${isClaimed ? "bg-green-500 hover:bg-green-600" : ""}`}
        >
          {isClaimed ? (
            <><CheckCircle className="w-4 h-4 mr-1" /> Claimed!</>
          ) : (
            <><Gift className="w-4 h-4 mr-1" /> Claim Offer</>
          )}
        </Button>
      </div>
    </div>
  </motion.div>
);

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
        .select("*, institutes(name, slug, logo_url, rating, city, students_count, success_rate, mode, features, total_reviews)")
        .eq("active", true)
        .order("created_at", { ascending: false });
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
    const code = cotw.coupon_code || cotw.offer_text || "MBAHUB70";
    const discount = cotw.coupon_discount || cotw.offer_text || "Special Discount";
    const courses = cotw.selected_courses || "All Courses";

    navigator.clipboard.writeText(code);
    setClaimedIds(prev => new Set(prev).add(cotw.id));

    setCelebration({
      show: true,
      discount,
      coachingName: inst?.name || "Selected Coaching",
      courses,
      couponCode: code,
    });
  };

  return (
    <>
      <section className="py-16 md:py-20 relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold mb-5 border border-primary/20">
              <Flame className="w-4 h-4" /> Coaching of the Week
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
              Featured Institutes <span className="text-gradient">This Week</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
              Hand-picked top coaching centres with exclusive coupon codes, proven results, and thousands of successful students
            </p>
          </motion.div>

          {/* Coaching Cards */}
          <div className="space-y-10 md:space-y-14">
            {cotwItems.map((cotw: any, idx: number) => {
              const inst = cotw.institutes;
              const isClaimed = claimedIds.has(cotw.id);
              const couponCode = cotw.coupon_code || cotw.offer_text || "";
              const hasCoupon = !!couponCode;

              return (
                <motion.div
                  key={cotw.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden group"
                >
                  {/* Top ribbon for offer */}
                  {cotw.offer_text && (
                    <div className="bg-gradient-to-r from-destructive via-destructive/90 to-destructive/80 text-destructive-foreground px-6 py-2.5 flex items-center justify-center gap-2 text-sm font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>{cotw.offer_text}</span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  {/* Mobile-first stacked / Desktop side-by-side */}
                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Banner & Identity */}
                    <div className="lg:w-[340px] xl:w-[400px] flex-shrink-0 relative">
                      {cotw.banner_url ? (
                        <div className="relative h-60 sm:h-72 lg:h-full min-h-[300px]">
                          <img src={cotw.banner_url} alt={inst?.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                            <div className="flex items-center gap-3 mb-3">
                              {inst?.logo_url && (
                                <img src={inst.logo_url} alt="" className="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 shadow-xl" />
                              )}
                              <div>
                                <h3 className="text-xl font-bold text-white leading-tight">{inst?.name}</h3>
                                <div className="flex items-center gap-1 text-white/70 text-sm mt-0.5">
                                  <MapPin className="w-3.5 h-3.5" /> {inst?.city}
                                </div>
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
                          {inst?.logo_url && <img src={inst.logo_url} alt="" className="w-20 h-20 rounded-2xl object-contain bg-white/10 p-2 mb-4 backdrop-blur-sm" />}
                          <h3 className="text-2xl font-bold text-primary-foreground text-center">{inst?.name}</h3>
                          <p className="text-primary-foreground/70 mt-1 text-sm flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{inst?.city}</p>
                          {inst?.rating && (
                            <div className="flex items-center gap-1 mt-3 bg-white/10 rounded-lg px-3 py-1.5">
                              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                              <span className="text-primary-foreground font-bold">{inst.rating}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Content area */}
                    <div className="flex-1 p-5 md:p-7 lg:p-8 flex flex-col">
                      {/* Headline & Description */}
                      <div className="mb-5">
                        <h3 className="text-xl md:text-2xl font-extrabold text-foreground mb-2 leading-tight">
                          {cotw.headline || inst?.name}
                        </h3>
                        {cotw.description && (
                          <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: cotw.description }} />
                        )}
                      </div>

                      {/* Quick Stats Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        {[
                          { icon: Users, value: `${inst?.students_count || 500}+`, label: "Students", color: "text-primary", bg: "bg-primary/10" },
                          { icon: Target, value: `${inst?.success_rate || 85}%`, label: "Success Rate", color: "text-green-600", bg: "bg-green-500/10" },
                          { icon: Star, value: `${inst?.rating || 4.5}/5`, label: "Rating", color: "text-amber-500", bg: "bg-amber-500/10" },
                          { icon: GraduationCap, value: `${inst?.total_reviews || 50}+`, label: "Reviews", color: "text-blue-500", bg: "bg-blue-500/10" },
                        ].map((s, i) => (
                          <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
                            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                            <div className="text-lg font-extrabold text-foreground">{s.value}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Features */}
                      {(inst?.features || []).length > 0 && (
                        <div className="mb-5">
                          <div className="flex flex-wrap gap-2">
                            {(inst.features as string[]).slice(0, 6).map((f: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded-lg px-3 py-1.5 text-foreground font-medium">
                                <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coupon Code Section */}
                      {hasCoupon && (
                        <div className="mb-5">
                          <CouponCard
                            couponCode={couponCode}
                            discount={cotw.coupon_discount || cotw.offer_text || "Special Discount"}
                            isClaimed={isClaimed}
                            onClaim={() => requireLogin(
                              "Sign in to claim this exclusive coupon code and get a special discount!",
                              () => handleClaimCoupon(cotw)
                            )}
                          />
                        </div>
                      )}

                      {/* Offer Details */}
                      {cotw.offer_details && (
                        <div className="bg-accent/30 border border-accent/50 rounded-xl p-4 mb-5">
                          <h4 className="font-bold text-sm text-foreground mb-1 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-primary" /> Offer Details
                          </h4>
                          <div className="text-xs text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.offer_details }} />
                        </div>
                      )}

                      {/* Bottom row: Results + CTA */}
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
                              <Button className="w-full font-bold shadow-md" size="lg">
                                <BookOpen className="w-4 h-4 mr-2" /> View Details
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="outline"
                            className="w-full font-bold"
                            onClick={() => requireLogin("Sign in to access free mock tests.")}
                          >
                            <FileText className="w-4 h-4 mr-2" /> Free Mock Test
                          </Button>
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

      {/* Celebration Overlay */}
      <CelebrationOverlay
        show={celebration.show}
        onClose={() => setCelebration(prev => ({ ...prev, show: false }))}
        discount={celebration.discount}
        coachingName={celebration.coachingName}
        courses={celebration.courses}
        couponCode={celebration.couponCode}
      />

      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
    </>
  );
};

export default CoachingOfWeekSection;
