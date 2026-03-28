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
import { User, Heart, Star, Settings, MapPin, Trash2, Save } from "lucide-react";
import { motion } from "framer-motion";

const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [savedInstitutes, setSavedInstitutes] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
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
  }, [user]);

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

  document.title = "My Dashboard | MBAHub";

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">My Dashboard</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="saved" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="saved" className="gap-1"><Heart className="w-4 h-4" /> Saved</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1"><Star className="w-4 h-4" /> Reviews</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1"><Settings className="w-4 h-4" /> Profile</TabsTrigger>
          </TabsList>

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
