import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Star, Gift, CheckCircle, BookOpen,
  Users, MapPin, ExternalLink, Flame, Scissors, Tag, X, PartyPopper
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
        .select("*, institutes(name, slug, logo_url, banner_url, rating, city, students_count, success_rate, mode, total_reviews, website)")
        .eq("active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (!cotwItems || cotwItems.length === 0) return null;

  const handleClaimCoupon = (cotw: any) => {
    const code = cotw.coupon_code || cotw.offer_text || "MBAHUB70";
    const discount = cotw.coupon_discount || cotw.offer_text || "Special Discount";
    navigator.clipboard.writeText(code);
    setClaimedIds(prev => new Set(prev).add(cotw.id));
    setCelebration({ show: true, discount, name: cotw.institutes?.name || "Coaching", code });
    setTimeout(() => setCelebration(prev => ({ ...prev, show: false })), 4000);
  };

  return (
    <>
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold mb-3">
              <Flame className="w-3.5 h-3.5" /> Coaching of the Week
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">
              Featured Institutes <span className="text-gradient">This Week</span>
            </h2>
          </motion.div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-5">
            {cotwItems.map((cotw: any, idx: number) => {
              const inst = cotw.institutes;
              const isClaimed = claimedIds.has(cotw.id);
              const couponCode = cotw.coupon_code || "";
              const websiteUrl = cotw.website_url || inst?.website || "";
              const imageUrl = cotw.banner_url || inst?.banner_url;

              return (
                <motion.div
                  key={cotw.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Banner */}
                  <div className="relative h-36 bg-muted">
                    {imageUrl ? (
                      <img src={imageUrl} alt={inst?.name || ""} className="w-full h-full object-contain object-center" loading="lazy" />
                    ) : (
                      <div className="w-full h-full hero-gradient flex items-center justify-center">
                        <span className="font-heading text-4xl font-extrabold text-primary-foreground/20">{inst?.name?.charAt(0)}</span>
                      </div>
                    )}
                    {cotw.coupon_discount && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-green-500 text-white text-[10px] font-bold shadow">
                        {cotw.coupon_discount}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-heading font-bold text-foreground text-base mb-1 line-clamp-1">
                      {cotw.headline || inst?.name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inst?.city}</span>
                      {inst?.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{inst.rating}
                          <span className="text-muted-foreground">({inst.total_reviews})</span>
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[10px] py-0">{inst?.mode || "Offline"}</Badge>
                    </div>

                    {/* Mini stats */}
                    <div className="flex items-center gap-4 mb-3 text-xs">
                      <span className="flex items-center gap-1 text-foreground font-semibold">
                        <Users className="w-3.5 h-3.5 text-primary/70" />{inst?.students_count || 500}+ Students
                      </span>
                      <span className="flex items-center gap-1 text-foreground font-semibold">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />{inst?.success_rate || 85}% Success
                      </span>
                    </div>

                    {/* Coupon */}
                    {couponCode && (
                      <div className="mb-3 bg-muted/50 border border-border rounded-lg p-2.5 flex items-center justify-between gap-2">
                        {user ? (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <code className="font-mono font-bold text-foreground text-xs tracking-wider truncate">{couponCode}</code>
                            </div>
                            <Button size="sm" onClick={() => handleClaimCoupon(cotw)}
                              className={`text-xs h-7 px-3 ${isClaimed ? "bg-green-500 hover:bg-green-600" : ""}`}>
                              {isClaimed ? "Copied!" : "Copy"}
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Gift className="w-3.5 h-3.5 text-primary" /> Exclusive coupon available
                            </span>
                            <Button size="sm" variant="outline" className="text-xs h-7"
                              onClick={() => { setLoginMessage("Sign in to unlock this coupon!"); setLoginOpen(true); }}>
                              Unlock
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* CTAs */}
                    <div className="flex gap-2">
                      {inst?.slug && (
                        <Link to={`/institute/${inst.slug}`} className="flex-1">
                          <Button className="w-full text-xs h-8" size="sm">
                            <BookOpen className="w-3.5 h-3.5 mr-1" />View Details
                          </Button>
                        </Link>
                      )}
                      {websiteUrl && (
                        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full text-xs h-8" size="sm">
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />Website
                          </Button>
                        </a>
                      )}
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
