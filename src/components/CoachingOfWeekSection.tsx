import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, Award, TrendingUp, ArrowRight, Gift, Copy, CheckCircle, BookOpen, FileText, Ticket, Users, Target, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "#f59e0b", "#10b981"];

const CoachingOfWeekSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [couponCopied, setCouponCopied] = useState(false);

  const { data: cotwItems } = useQuery({
    queryKey: ["coaching-of-week-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coaching_of_week")
        .select("*, institutes(name, slug, logo_url, rating, city, students_count, success_rate)")
        .eq("active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (!cotwItems || cotwItems.length === 0) return null;

  const requireLogin = (message: string, callback?: () => void) => {
    if (!user) {
      setLoginMessage(message);
      setLoginOpen(true);
    } else {
      callback?.();
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCouponCopied(true);
    toast({ title: "Coupon Copied!", description: `Code "${code}" copied to clipboard.` });
    setTimeout(() => setCouponCopied(false), 3000);
  };

  return (
    <>
      <section className="py-14 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-3">
              <Award className="w-4 h-4" /> Coaching of the Week
            </span>
            <h2 className="font-heading text-3xl font-bold text-foreground">
              Featured Institutes This Week
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Hand-picked top coaching centres with exclusive offers and proven results</p>
          </div>

          <div className="space-y-10">
            {cotwItems.map((cotw: any, idx: number) => {
              const institute = cotw.institutes;

              const successData = [
                { name: "Selected", value: institute?.success_rate || 85 },
                { name: "Others", value: 100 - (institute?.success_rate || 85) },
              ];

              const performanceData = [
                { name: "Students", value: institute?.students_count || 500 },
                { name: "Rating", value: (institute?.rating || 4) * 100 },
                { name: "Success %", value: institute?.success_rate || 85 },
              ];

              return (
                <motion.div
                  key={cotw.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden"
                >
                  {/* Top banner strip */}
                  {cotw.offer_text && (
                    <div className="bg-destructive text-destructive-foreground px-6 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold">
                        <Gift className="w-5 h-5" /> {cotw.offer_text}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="font-semibold"
                        onClick={() => requireLogin("Sign in to copy this exclusive coupon code.", () => handleCopyCoupon(cotw.offer_text || "MBAHUB70"))}
                      >
                        {couponCopied ? <><CheckCircle className="w-4 h-4 mr-1" /> Copied!</> : <><Copy className="w-4 h-4 mr-1" /> Copy Code</>}
                      </Button>
                    </div>
                  )}

                  <div className="grid lg:grid-cols-5 gap-0">
                    {/* Left: Banner - 2 cols */}
                    <div className="lg:col-span-2 relative">
                      {cotw.banner_url ? (
                        <img src={cotw.banner_url} alt={institute?.name} className="w-full h-full object-cover min-h-[320px]" />
                      ) : (
                        <div className="w-full h-full min-h-[320px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                          <div className="text-center text-primary-foreground p-6">
                            {institute?.logo_url && <img src={institute.logo_url} alt="" className="w-20 h-20 mx-auto rounded-xl mb-4 object-contain bg-white/10 p-2" />}
                            <h3 className="text-2xl font-bold">{institute?.name}</h3>
                            <p className="text-primary-foreground/80 mt-1">{institute?.city}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Middle: Details - 2 cols */}
                    <div className="lg:col-span-2 p-6 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3">
                        {institute?.logo_url && <img src={institute.logo_url} alt="" className="w-12 h-12 rounded-lg object-contain border border-border bg-white p-1" />}
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{cotw.headline || institute?.name}</h3>
                          <p className="text-sm text-muted-foreground">{institute?.city}</p>
                        </div>
                        {institute?.rating && (
                          <div className="ml-auto flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full">
                            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                            <span className="font-bold text-sm text-primary">{institute.rating}</span>
                          </div>
                        )}
                      </div>

                      {cotw.description && (
                        <div className="text-sm text-muted-foreground mb-4 prose prose-sm max-w-none line-clamp-3" dangerouslySetInnerHTML={{ __html: cotw.description }} />
                      )}

                      {/* Key stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                          <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
                          <p className="text-base font-bold text-foreground">{institute?.students_count || "500"}+</p>
                          <p className="text-[10px] text-muted-foreground">Students</p>
                        </div>
                        <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                          <Target className="w-4 h-4 mx-auto mb-1 text-primary" />
                          <p className="text-base font-bold text-foreground">{institute?.success_rate || 85}%</p>
                          <p className="text-[10px] text-muted-foreground">Success</p>
                        </div>
                        <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                          <Star className="w-4 h-4 mx-auto mb-1 text-primary" />
                          <p className="text-base font-bold text-foreground">{institute?.rating || 4.5}/5</p>
                          <p className="text-[10px] text-muted-foreground">Rating</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button size="sm" className="w-full font-semibold" onClick={() => requireLogin("Sign in to enroll for free coaching sessions.")}>
                          <BookOpen className="w-4 h-4 mr-1" /> Enroll Free
                        </Button>
                        <Button size="sm" variant="outline" className="w-full font-semibold" onClick={() => requireLogin("Sign in to access free mock tests.")}>
                          <FileText className="w-4 h-4 mr-1" /> Free Mocks
                        </Button>
                      </div>

                      {cotw.offer_details && (
                        <div className="bg-accent/30 border border-accent rounded-lg p-3 mb-3">
                          <h4 className="font-semibold text-sm text-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Special Offers</h4>
                          <div className="text-xs text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cotw.offer_details }} />
                        </div>
                      )}

                      {institute?.slug && (
                        <Link
                          to={`/institute/${institute.slug}`}
                          className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline mt-1"
                        >
                          View Full Details <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>

                    {/* Right: Charts - 1 col */}
                    <div className="lg:col-span-1 p-6 bg-muted/30 border-l border-border flex flex-col justify-center gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Success Rate</h4>
                        <div className="h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={successData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" startAngle={90} endAngle={-270}>
                                {successData.map((_, i) => (
                                  <Cell key={i} fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-center text-xs text-muted-foreground mt-1">{institute?.success_rate || 85}% selection rate</p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Performance</h4>
                        <div className="h-[100px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData} layout="vertical">
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 10 }} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {performanceData.map((_, i) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                              <Tooltip />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {cotw.results_summary && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <h4 className="font-semibold text-xs text-foreground mb-1">Results</h4>
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
