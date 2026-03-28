import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, Award, TrendingUp, ArrowRight, Gift, Copy, CheckCircle, BookOpen, FileText, Users, Target, Trophy, Zap, GraduationCap, Medal, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { useToast } from "@/hooks/use-toast";

const CoachingOfWeekSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyCoupon = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast({ title: "🎉 Coupon Copied!", description: `Code "${code}" copied to clipboard. Use during enrollment.` });
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <>
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="inline-flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold mb-4">
                <Flame className="w-4 h-4" /> Coaching of the Week
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
                Featured Institutes This Week
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Hand-picked top coaching centres with exclusive offers, proven results, and thousands of successful students
              </p>
            </motion.div>
          </div>

          <div className="space-y-12">
            {cotwItems.map((cotw: any, idx: number) => {
              const inst = cotw.institutes;
              const isCopied = copiedId === cotw.id;

              return (
                <motion.div
                  key={cotw.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15, duration: 0.5 }}
                  className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden group hover:shadow-3xl transition-shadow duration-300"
                >
                  {/* Coupon banner */}
                  {cotw.offer_text && (
                    <div className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-6 py-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 animate-bounce" />
                        <span className="font-bold text-sm md:text-base">{cotw.offer_text}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="font-bold shadow-md"
                        onClick={() => requireLogin("Sign in to copy this exclusive coupon code.", () => handleCopyCoupon(cotw.id, cotw.offer_text || "MBAHUB70"))}
                      >
                        {isCopied ? <><CheckCircle className="w-4 h-4 mr-1" /> Copied!</> : <><Copy className="w-4 h-4 mr-1" /> Copy Code</>}
                      </Button>
                    </div>
                  )}

                  <div className="grid lg:grid-cols-12 gap-0">
                    {/* Left: Banner + Institute Identity */}
                    <div className="lg:col-span-4 relative">
                      {cotw.banner_url ? (
                        <div className="relative h-full min-h-[360px]">
                          <img src={cotw.banner_url} alt={inst?.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <div className="flex items-center gap-3 mb-2">
                              {inst?.logo_url && (
                                <img src={inst.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-lg" />
                              )}
                              <div>
                                <h3 className="text-xl font-bold text-white">{inst?.name}</h3>
                                <p className="text-white/80 text-sm">{inst?.city}</p>
                              </div>
                            </div>
                            {inst?.rating && (
                              <div className="flex items-center gap-1.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-4 h-4 ${i < Math.round(inst.rating) ? "fill-amber-400 text-amber-400" : "text-white/30"}`} />
                                ))}
                                <span className="text-white font-bold ml-1">{inst.rating}</span>
                                <span className="text-white/60 text-xs">({inst.total_reviews || 0} reviews)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-[360px] bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex flex-col items-center justify-center p-8">
                          {inst?.logo_url && <img src={inst.logo_url} alt="" className="w-24 h-24 rounded-2xl object-contain bg-white/10 p-3 mb-4 backdrop-blur-sm" />}
                          <h3 className="text-2xl font-bold text-primary-foreground text-center">{inst?.name}</h3>
                          <p className="text-primary-foreground/70 mt-1">{inst?.city}</p>
                          {inst?.rating && (
                            <div className="flex items-center gap-1 mt-3">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < Math.round(inst.rating) ? "fill-amber-300 text-amber-300" : "text-primary-foreground/30"}`} />
                              ))}
                              <span className="text-primary-foreground font-bold ml-1">{inst.rating}</span>
                            </div>
                          )}
                          <Badge className="mt-3 bg-primary-foreground/20 text-primary-foreground border-none">{inst?.mode || "Offline"}</Badge>
                        </div>
                      )}
                    </div>

                    {/* Middle: Content */}
                    <div className="lg:col-span-5 p-6 md:p-8 flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                          {cotw.headline || inst?.name}
                        </h3>
                        {cotw.description && (
                          <div className="text-sm text-muted-foreground mt-2 prose prose-sm max-w-none line-clamp-3" dangerouslySetInnerHTML={{ __html: cotw.description }} />
                        )}
                      </div>

                      {/* Achievement Stats - Visual Cards */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
                          <Trophy className="w-8 h-8 text-primary/20 absolute -top-1 -right-1" />
                          <Users className="w-5 h-5 text-primary mb-1" />
                          <p className="text-2xl font-bold text-foreground">{inst?.students_count || 500}+</p>
                          <p className="text-xs text-muted-foreground font-medium">Students Enrolled</p>
                        </div>
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 p-4">
                          <Medal className="w-8 h-8 text-green-500/20 absolute -top-1 -right-1" />
                          <Target className="w-5 h-5 text-green-600 mb-1" />
                          <p className="text-2xl font-bold text-foreground">{inst?.success_rate || 85}%</p>
                          <p className="text-xs text-muted-foreground font-medium">Success Rate</p>
                        </div>
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-4">
                          <Star className="w-8 h-8 text-amber-500/20 absolute -top-1 -right-1" />
                          <Star className="w-5 h-5 text-amber-500 mb-1" />
                          <p className="text-2xl font-bold text-foreground">{inst?.rating || 4.5}/5</p>
                          <p className="text-xs text-muted-foreground font-medium">Student Rating</p>
                        </div>
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-4">
                          <GraduationCap className="w-8 h-8 text-blue-500/20 absolute -top-1 -right-1" />
                          <GraduationCap className="w-5 h-5 text-blue-500 mb-1" />
                          <p className="text-2xl font-bold text-foreground">{inst?.total_reviews || 50}+</p>
                          <p className="text-xs text-muted-foreground font-medium">Reviews</p>
                        </div>
                      </div>

                      {/* Key Features */}
                      {(inst?.features || []).length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Why Students Choose Us</h4>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(inst.features as string[]).slice(0, 6).map((f: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-sm text-foreground">
                                <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <span className="line-clamp-1">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {cotw.offer_details && (
                        <div className="bg-accent/20 border border-accent/40 rounded-xl p-4 mb-4">
                          <h4 className="font-bold text-sm text-foreground mb-1 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-primary" /> Exclusive Offers
                          </h4>
                          <div className="text-xs text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.offer_details }} />
                        </div>
                      )}

                      {inst?.slug && (
                        <Link to={`/institute/${inst.slug}`} className="mt-auto inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                          View Full Details & All Courses <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>

                    {/* Right: CTA Panel */}
                    <div className="lg:col-span-3 bg-muted/30 border-l border-border p-6 md:p-8 flex flex-col justify-center gap-4">
                      {/* Visual success meter */}
                      <div className="text-center mb-2">
                        <div className="relative w-28 h-28 mx-auto">
                          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                            <circle
                              cx="60" cy="60" r="50" fill="none"
                              stroke="hsl(var(--primary))"
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={`${((inst?.success_rate || 85) / 100) * 314} 314`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-foreground">{inst?.success_rate || 85}%</span>
                            <span className="text-[10px] text-muted-foreground font-medium">Success</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Selection Rate</p>
                      </div>

                      {/* CTA Buttons */}
                      <Button className="w-full font-bold shadow-md" size="lg" onClick={() => requireLogin("Sign in to enroll for free coaching sessions.")}>
                        <BookOpen className="w-4 h-4 mr-2" /> Enroll for Free
                      </Button>
                      <Button variant="outline" className="w-full font-bold" size="lg" onClick={() => requireLogin("Sign in to access free mock tests.")}>
                        <FileText className="w-4 h-4 mr-2" /> Free Mock Tests
                      </Button>

                      {cotw.offer_text && (
                        <Button
                          variant="secondary"
                          className="w-full font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                          size="lg"
                          onClick={() => requireLogin("Sign in to copy coupon.", () => handleCopyCoupon(cotw.id, cotw.offer_text || "MBAHUB70"))}
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          {isCopied ? "Coupon Copied! ✓" : "Copy 70% Off Coupon"}
                        </Button>
                      )}

                      {cotw.results_summary && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-1">
                          <h4 className="font-bold text-xs text-foreground mb-1.5 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" /> Results Highlights
                          </h4>
                          <div className="text-[11px] text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.results_summary }} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
    </>
  );
};

export default CoachingOfWeekSection;
