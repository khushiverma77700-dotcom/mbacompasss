import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Star, Gift, CheckCircle, BookOpen,
  Users, MapPin, ExternalLink, Flame, Tag, X, PartyPopper,
  TrendingUp, GraduationCap, Target, Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";

const CoachingOfWeekSection = () => {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [celebration, setCelebration] = useState<{
    show: boolean; discount: string; name: string; code: string;
  }>({ show: false, discount: "", name: "", code: "" });

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

  const handleClaimCoupon = (cotw: any) => {
    const code = cotw.coupon_code || cotw.offer_text || "COMPASS70";
    const discount = cotw.coupon_discount || cotw.offer_text || "Special Discount";
    navigator.clipboard.writeText(code);
    setClaimedIds(prev => new Set(prev).add(cotw.id));
    setCelebration({ show: true, discount, name: cotw.institutes?.name || "Coaching", code });
    setTimeout(() => setCelebration(prev => ({ ...prev, show: false })), 4000);
  };

  return (
    <>
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold mb-3">
              <Flame className="w-3.5 h-3.5" /> Coaching of the Week
            </span>
            <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-extrabold text-foreground">
              Featured Institutes <span className="text-gradient">This Week</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
              Hand-picked coaching centres with exclusive offers & proven track records
            </p>
          </motion.div>

          {/* Full-width cards */}
          <div className="space-y-6">
            {cotwItems.map((cotw: any, idx: number) => {
              const inst = cotw.institutes;
              const isClaimed = claimedIds.has(cotw.id);
              const couponCode = cotw.coupon_code || "";
              const websiteUrl = cotw.website_url || inst?.website || "";
              const imageUrl = cotw.banner_url || inst?.banner_url;
              const itemResults = (coachingResults || []).filter((r: any) => r.coaching_of_week_id === cotw.id);
              const latestResult = itemResults.length > 0 ? [...itemResults].sort((a: any, b: any) => b.year - a.year)[0] : null;

              return (
                <motion.div
                  key={cotw.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="grid md:grid-cols-5 gap-0">
                    {/* Left: Banner — spans 2 cols */}
                    <div className="md:col-span-2 relative bg-muted">
                      {imageUrl ? (
                        <img src={imageUrl} alt={inst?.name || ""} className="w-full h-48 md:h-full object-contain object-center" loading="lazy" />
                      ) : (
                        <div className="w-full h-48 md:h-full hero-gradient flex items-center justify-center">
                          <span className="font-heading text-5xl font-extrabold text-primary-foreground/20">{inst?.name?.charAt(0)}</span>
                        </div>
                      )}
                      {cotw.coupon_discount && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-bold shadow-lg">
                          {cotw.coupon_discount}
                        </span>
                      )}
                      {/* Logo overlay */}
                      {inst?.logo_url && (
                        <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl bg-card/90 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center p-1.5">
                          <img src={inst.logo_url} alt="" className="w-full h-full object-contain" loading="lazy" />
                        </div>
                      )}
                    </div>

                    {/* Right: Content — spans 3 cols */}
                    <div className="md:col-span-3 p-5 md:p-6 flex flex-col">
                      {/* Title row */}
                      <div className="mb-3">
                        <h3 className="font-heading font-extrabold text-foreground text-lg md:text-xl mb-1.5 line-clamp-1">
                          {cotw.headline || inst?.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary/60" />{inst?.city}</span>
                          {inst?.rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-foreground">{inst.rating}</span>
                              <span>({inst.total_reviews} reviews)</span>
                            </span>
                          )}
                          <Badge variant="secondary" className="text-[10px] py-0">{inst?.mode || "Offline"}</Badge>
                        </div>
                      </div>

                      {/* Description */}
                      {cotw.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4"
                          dangerouslySetInnerHTML={{ __html: cotw.description }} />
                      )}

                      {/* Stats grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                        {[
                          { icon: Users, label: "Students", value: `${inst?.students_count || 500}+`, color: "text-primary" },
                          { icon: TrendingUp, label: "Success Rate", value: `${inst?.success_rate || 85}%`, color: "text-green-600" },
                          ...(latestResult ? [
                            { icon: Award, label: `IIM-A '${String(latestResult.year).slice(-2)}`, value: `${latestResult.iim_a_selections || 0}`, color: "text-amber-600" },
                            { icon: GraduationCap, label: `IIM-B '${String(latestResult.year).slice(-2)}`, value: `${latestResult.iim_b_selections || 0}`, color: "text-blue-600" },
                            { icon: Target, label: "CAT 99+", value: `${latestResult.cat_99_plus || 0}`, color: "text-purple-600" },
                            { icon: CheckCircle, label: "Placed", value: `${latestResult.students_placed || 0}`, color: "text-emerald-600" },
                          ] : [
                            { icon: Star, label: "Rating", value: `${inst?.rating || 4.5}`, color: "text-amber-500" },
                            { icon: GraduationCap, label: "Reviews", value: `${inst?.total_reviews || 50}+`, color: "text-blue-500" },
                          ]),
                        ].map((s, i) => (
                          <div key={i} className="bg-muted/40 rounded-lg p-2.5 text-center border border-border/50">
                            <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                            <div className="text-sm font-extrabold text-foreground leading-none">{s.value}</div>
                            <div className="text-[9px] text-muted-foreground font-semibold mt-0.5 uppercase tracking-wider">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Features pills */}
                      {(inst?.features || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {(inst.features as string[]).slice(0, 4).map((f: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-muted rounded-full px-2.5 py-1 text-foreground font-medium border border-border/50">
                              <CheckCircle className="w-2.5 h-2.5 text-primary flex-shrink-0" />{f}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Coupon */}
                      {couponCode && (
                        <div className="mb-4 bg-muted/30 border border-border rounded-xl p-3 flex items-center justify-between gap-3">
                          {user ? (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <Tag className="w-4 h-4 text-primary flex-shrink-0" />
                                <div>
                                  <span className="text-xs text-muted-foreground">Use code: </span>
                                  <code className="font-mono font-bold text-foreground text-sm tracking-wider">{couponCode}</code>
                                </div>
                              </div>
                              <Button size="sm" onClick={() => handleClaimCoupon(cotw)}
                                className={`text-xs h-8 px-4 ${isClaimed ? "bg-green-500 hover:bg-green-600" : ""}`}>
                                {isClaimed ? <><CheckCircle className="w-3 h-3 mr-1" />Copied</> : <><Gift className="w-3 h-3 mr-1" />Claim</>}
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Gift className="w-4 h-4 text-primary" /> Exclusive coupon available
                              </span>
                              <Button size="sm" variant="outline" className="text-xs h-8"
                                onClick={() => { setLoginMessage("Sign in to unlock this coupon!"); setLoginOpen(true); }}>
                                Unlock
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {/* CTAs */}
                      <div className="flex gap-2 mt-auto">
                        {inst?.slug && (
                          <Link to={`/institute/${inst.slug}`} className="flex-1">
                            <Button className="w-full text-sm h-9 font-semibold" size="sm">
                              <BookOpen className="w-3.5 h-3.5 mr-1.5" />View Details
                            </Button>
                          </Link>
                        )}
                        {websiteUrl && (
                          <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="outline" className="w-full text-sm h-9 font-semibold" size="sm">
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Website
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

      {/* Celebration toast */}
      <AnimatePresence>
        {celebration.show && (
          <motion.div className="fixed bottom-6 right-6 z-50 bg-card border border-border rounded-xl shadow-2xl p-4 max-w-xs"
            initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}>
            <button onClick={() => setCelebration(prev => ({ ...prev, show: false }))} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <PartyPopper className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">🎉 Coupon Copied!</p>
                <p className="text-xs text-muted-foreground">{celebration.discount} on {celebration.name}</p>
                <code className="text-xs font-mono font-bold text-primary">{celebration.code}</code>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
    </>
  );
};

export default CoachingOfWeekSection;
