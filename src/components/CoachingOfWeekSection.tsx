import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, Award, TrendingUp, ArrowRight, Gift, Copy, CheckCircle, BookOpen, FileText, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { useToast } from "@/hooks/use-toast";

const CoachingOfWeekSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [couponCopied, setCouponCopied] = useState(false);

  const { data: cotw } = useQuery({
    queryKey: ["coaching-of-week"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coaching_of_week")
        .select("*, institutes(name, slug, logo_url, rating, city, students_count, success_rate)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (!cotw) return null;

  const institute = (cotw as any).institutes;

  const requireLogin = (message: string, callback?: () => void) => {
    if (!user) {
      setLoginMessage(message);
      setLoginOpen(true);
    } else {
      callback?.();
    }
  };

  const handleCopyCoupon = () => {
    const code = cotw.offer_text || "MBAHUB70";
    navigator.clipboard.writeText(code);
    setCouponCopied(true);
    toast({ title: "Coupon Copied!", description: `Code "${code}" copied to clipboard.` });
    setTimeout(() => setCouponCopied(false), 3000);
  };

  return (
    <>
      <section className="py-14 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-3">
              <Award className="w-4 h-4" /> Coaching of the Week
            </span>
            <h2 className="font-heading text-3xl font-bold text-foreground">
              {cotw.headline || "Featured Institute This Week"}
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden"
          >
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: Banner */}
              <div className="relative">
                {cotw.banner_url ? (
                  <img src={cotw.banner_url} alt={institute?.name} className="w-full h-full object-cover min-h-[350px]" />
                ) : (
                  <div className="w-full h-full min-h-[350px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <div className="text-center text-primary-foreground">
                      {institute?.logo_url && <img src={institute.logo_url} alt="" className="w-24 h-24 mx-auto rounded-xl mb-4 object-contain bg-white/10 p-2" />}
                      <h3 className="text-2xl font-bold">{institute?.name}</h3>
                      <p className="text-primary-foreground/80 mt-1">{institute?.city}</p>
                    </div>
                  </div>
                )}
                {cotw.offer_text && (
                  <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-bold text-lg shadow-lg animate-pulse">
                    <Gift className="w-5 h-5 inline mr-2" />
                    {cotw.offer_text}
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  {institute?.logo_url && <img src={institute.logo_url} alt="" className="w-14 h-14 rounded-lg object-contain border border-border bg-white p-1" />}
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{institute?.name}</h3>
                    <p className="text-sm text-muted-foreground">{institute?.city}</p>
                  </div>
                  {institute?.rating && (
                    <div className="ml-auto flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="font-bold text-primary">{institute.rating}</span>
                    </div>
                  )}
                </div>

                {cotw.description && (
                  <div className="text-sm text-muted-foreground mb-5 prose prose-sm max-w-none line-clamp-4" dangerouslySetInnerHTML={{ __html: cotw.description }} />
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {institute?.students_count && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{institute.students_count}+</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                  )}
                  {institute?.success_rate && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{institute.success_rate}%</p>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                    </div>
                  )}
                  {institute?.rating && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{institute.rating}/5</p>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <Button
                    size="lg"
                    className="w-full font-semibold"
                    onClick={() => requireLogin("Sign in to enroll for free coaching sessions.")}
                  >
                    <BookOpen className="w-4 h-4 mr-2" /> Enroll for Free
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full font-semibold"
                    onClick={() => requireLogin("Sign in to access free mock tests.")}
                  >
                    <FileText className="w-4 h-4 mr-2" /> Free Mocks
                  </Button>
                  <Button
                    size="lg"
                    variant={couponCopied ? "secondary" : "destructive"}
                    className="w-full font-semibold col-span-2"
                    onClick={() => requireLogin("Sign in to copy this exclusive coupon code.", handleCopyCoupon)}
                  >
                    {couponCopied ? (
                      <><CheckCircle className="w-4 h-4 mr-2" /> Coupon Copied!</>
                    ) : (
                      <><Ticket className="w-4 h-4 mr-2" /> Copy Coupon Code — {cotw.offer_text || "70% OFF"}</>
                    )}
                  </Button>
                </div>

                {cotw.offer_details && (
                  <div className="bg-accent/30 border border-accent rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Special Offers</h4>
                    <div className="text-sm text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.offer_details }} />
                  </div>
                )}

                {cotw.results_summary && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-foreground mb-1">Results</h4>
                    <div className="text-sm text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.results_summary }} />
                  </div>
                )}

                {institute?.slug && (
                  <Link
                    to={`/institute/${institute.slug}`}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors text-center justify-center"
                  >
                    View Full Details <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
    </>
  );
};

export default CoachingOfWeekSection;
