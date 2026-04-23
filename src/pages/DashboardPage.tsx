import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, Heart, Star, Settings, MapPin, Trash2, Save, Calculator, TrendingUp, Eye, FileBarChart2, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";

const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [savedInstitutes, setSavedInstitutes] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [roiReports, setRoiReports] = useState<any[]>([]);
  const [profileReports, setProfileReports] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState({ display_name: "", phone: "", city: "", target_exam: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchSaved();
    fetchReviews();
    fetchRoiReports();
    fetchProfileReports();
  }, [user]);

  const fetchRoiReports = async () => {
    const { data } = await supabase
      .from("roi_analyses")
      .select("id, name, target_exams, expected_tier, payback_years, roi_score, roi_category, total_investment_lakhs, expected_salary_lakhs, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setRoiReports(data || []);
  };

  const fetchProfileReports = async () => {
    const { data } = await supabase
      .from("profile_analyses")
      .select("id, name, target_exam, profile_score, created_at, report_unlocked")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setProfileReports(data || []);
  };

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      setProfile(data);
      setProfileForm({
        display_name: data.display_name || "",
        phone: data.phone || "",
        city: data.city || "",
        target_exam: data.target_exam || "",
      });
    }
  };

  const fetchSaved = async () => {
    const { data } = await supabase
      .from("saved_institutes")
      .select("id, institute_id, created_at, institutes:institute_id(id, name, slug, city, state, rating)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setSavedInstitutes(data || []);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, title, content, created_at, verified, institutes:institute_id(name, slug)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setReviews(data || []);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(profileForm)
      .eq("user_id", user!.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile Updated" });
    }
    setSaving(false);
  };

  const handleUnsave = async (savedId: string) => {
    await supabase.from("saved_institutes").delete().eq("id", savedId);
    setSavedInstitutes((prev) => prev.filter((s) => s.id !== savedId));
    toast({ title: "Removed from saved" });
  };

  if (authLoading || !user) return null;

  document.title = "My Dashboard | MBA Compass";

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">My Dashboard</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="reports" className="gap-1"><FileBarChart2 className="w-4 h-4" /> Reports</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1"><Heart className="w-4 h-4" /> Saved</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1"><Star className="w-4 h-4" /> Reviews</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1"><Settings className="w-4 h-4" /> Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-8">
            {/* ROI Reports */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" /> MBA ROI Reports ({roiReports.length})
                </h2>
                <Link to="/roi-calculator"><Button size="sm" variant="outline" className="gap-1"><Calculator className="w-3.5 h-3.5" /> New Report</Button></Link>
              </div>
              {roiReports.length === 0 ? (
                <Card><CardContent className="pt-6 text-center">
                  <FileBarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No ROI reports yet.</p>
                  <Link to="/roi-calculator"><Button variant="outline" className="mt-3">Generate Your First Report</Button></Link>
                </CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {roiReports.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="hover:-translate-y-1 transition-all duration-300 border-primary/10">
                        <CardContent className="pt-5">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-heading font-semibold text-foreground text-sm">{r.name || "MBA ROI Analysis"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString()} · {r.expected_tier}</p>
                            </div>
                            {r.roi_category && <Badge variant={r.roi_category === "High" ? "default" : "secondary"} className="text-[10px]">{r.roi_category} ROI</Badge>}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60">
                            <div><p className="text-[10px] text-muted-foreground">Investment</p><p className="text-sm font-bold text-foreground">₹{r.total_investment_lakhs || 0}L</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Salary</p><p className="text-sm font-bold text-emerald-600">₹{r.expected_salary_lakhs || 0}L</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Payback</p><p className="text-sm font-bold text-primary">{r.payback_years || 0}y</p></div>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Score: <span className="font-semibold text-foreground">{r.roi_score || 0}/100</span>
                          </div>
                          <Link to="/roi-calculator"><Button size="sm" variant="ghost" className="mt-3 w-full gap-1"><Eye className="w-3.5 h-3.5" /> View Report</Button></Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Analyzer Reports */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Profile Analyzer Reports ({profileReports.length})
                </h2>
                <Link to="/profile-analyzer"><Button size="sm" variant="outline" className="gap-1"><User className="w-3.5 h-3.5" /> New Analysis</Button></Link>
              </div>
              {profileReports.length === 0 ? (
                <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">No profile analyses yet.</CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {profileReports.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card>
                        <CardContent className="pt-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-heading font-semibold text-foreground text-sm">{r.name || "Profile Analysis"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString()} · Target: {r.target_exam}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">Score {r.profile_score || 0}/10</Badge>
                          </div>
                          <Link to="/profile-analyzer"><Button size="sm" variant="ghost" className="mt-3 w-full gap-1"><Eye className="w-3.5 h-3.5" /> View</Button></Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>


          <TabsContent value="saved">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Saved Coaching Institutes ({savedInstitutes.length})</h2>
            {savedInstitutes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No saved institutes yet.</p>
                  <Link to="/category/cat"><Button variant="outline" className="mt-3">Browse Institutes</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedInstitutes.map((item, i) => {
                  const inst = item.institutes as any;
                  if (!inst) return null;
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="pt-5">
                          <Link to={`/institute/${inst.slug}`} className="font-heading font-semibold text-foreground hover:text-primary transition-colors">{inst.name}</Link>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" /> {inst.city}, {inst.state}
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-semibold">{inst.rating}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="mt-3 text-destructive hover:text-destructive" onClick={() => handleUnsave(item.id)}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">My Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">You haven't written any reviews yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const inst = review.institutes as any;
                  return (
                    <Card key={review.id}>
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between">
                          <div>
                            {inst && <Link to={`/institute/${inst.slug}`} className="text-sm text-primary hover:underline font-medium">{inst.name}</Link>}
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} className={`w-3.5 h-3.5 ${j < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {review.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                            <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {review.title && <h4 className="font-semibold text-foreground mt-2">{review.title}</h4>}
                        {review.content && <p className="text-sm text-muted-foreground mt-1">{review.content}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card className="max-w-lg">
              <CardHeader><CardTitle className="font-heading">Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Display Name</label>
                  <Input value={profileForm.display_name} onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                  <Input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Target Exam</label>
                  <Input value={profileForm.target_exam} onChange={(e) => setProfileForm({ ...profileForm, target_exam: e.target.value })} placeholder="e.g. CAT 2025" />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="gap-1">
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
