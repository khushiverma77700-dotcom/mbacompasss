import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, GraduationCap, Sparkles, Loader2, Building2, TrendingUp, MapPin, Filter, Gauge } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIERS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
const CATEGORIES = ["IIM", "Non-IIM"];
const EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "GMAT", "MAT", "CMAT"];
const COLLEGE_TYPES = ["Government", "Private", "Autonomous", "Deemed University", "Public-Private"];
const ACCREDITATIONS_LIST = ["AACSB", "EQUIS", "AMBA", "NAAC A++", "NAAC A+", "NAAC A", "NBA", "NIRF Top 50", "NIRF Top 100"];
const COURSES_LIST = ["MBA", "PGDM", "PGPM", "Executive MBA", "MBA (Part-Time)", "Ph.D", "FPM", "BBA", "Integrated MBA"];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Chandigarh", "Jammu & Kashmir", "Ladakh", "Puducherry"
];

const STATE_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati", "Guntur"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
  "Delhi": ["Delhi", "New Delhi"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
  "Gujarat": ["Ahmedabad", "Vadodara", "Surat", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurgaon", "Rohtak", "Faridabad", "Hisar", "Karnal"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Karnataka": ["Bangalore", "Mangalore", "Mysore", "Hubli"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Navi Mumbai"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur"],
  "Punjab": ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Pilani"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Secunderabad"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Greater Noida", "Varanasi", "Agra", "Kanpur", "Ghaziabad", "Aligarh"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Nainital"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Kharagpur"],
  "Chandigarh": ["Chandigarh"],
  "Jammu & Kashmir": ["Jammu", "Srinagar"],
  "Puducherry": ["Puducherry"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar"],
  "Sikkim": ["Gangtok"],
};

const FEE_RANGES = [
  "Below ₹5 Lakhs", "₹5 - ₹10 Lakhs", "₹10 - ₹15 Lakhs", "₹15 - ₹20 Lakhs",
  "₹20 - ₹25 Lakhs", "₹25 - ₹30 Lakhs", "₹30 - ₹40 Lakhs", "Above ₹40 Lakhs"
];

const AVG_PACKAGE_RANGES = [
  "Below ₹5 LPA", "₹5 - ₹8 LPA", "₹8 - ₹12 LPA", "₹12 - ₹16 LPA",
  "₹16 - ₹20 LPA", "₹20 - ₹25 LPA", "₹25 - ₹35 LPA", "Above ₹35 LPA"
];

const HIGHEST_PACKAGE_RANGES = [
  "Below ₹10 LPA", "₹10 - ₹20 LPA", "₹20 - ₹40 LPA", "₹40 - ₹60 LPA",
  "₹60 - ₹80 LPA", "₹80 LPA - ₹1 Cr", "₹1 Cr - ₹1.5 Cr", "Above ₹1.5 Cr"
];

const RANKING_RANGES = [
  "1 - 5", "6 - 10", "11 - 20", "21 - 30", "31 - 50", "51 - 75", "76 - 100", "100+"
];

const CAMPUS_SIZES = ["Below 10 Acres", "10 - 25 Acres", "25 - 50 Acres", "50 - 100 Acres", "100 - 200 Acres", "200+ Acres"];

const STUDENT_RANGES = ["Below 200", "200 - 500", "500 - 1000", "1000 - 2000", "2000 - 5000", "5000+"];

const ESTABLISHED_RANGES = [
  "Before 1960", "1960 - 1980", "1980 - 2000", "2000 - 2010", "2010 - 2020", "After 2020"
];

const PERCENTILE_RANGES = [
  "99.5+", "99 - 99.5", "98 - 99", "95 - 98", "90 - 95",
  "85 - 90", "80 - 85", "75 - 80", "70 - 75", "Below 70"
];

const GMAT_SCORE_RANGES = [
  "750+", "720 - 750", "700 - 720", "680 - 700", "650 - 680",
  "600 - 650", "550 - 600", "Below 550"
];

// ─── Weighted Scoring Engine ───
const SCORING_WEIGHTS = {
  tier: 30, ranking: 20, avgPackage: 20, fees: 10, accreditations: 10, category: 10,
};

const tierScore = (tier: string): number => {
  switch (tier) {
    case "Tier 1": return 100; case "Tier 2": return 70; case "Tier 3": return 40; case "Tier 4": return 20; default: return 30;
  }
};

const rankingScore = (ranking: string): number => {
  if (!ranking) return 30;
  if (ranking.startsWith("1 -")) return 100; if (ranking.startsWith("6 -")) return 90;
  if (ranking.startsWith("11")) return 75; if (ranking.startsWith("21")) return 60;
  if (ranking.startsWith("31")) return 50; if (ranking.startsWith("51")) return 40;
  if (ranking.startsWith("76")) return 30; return 20;
};

const avgPackageScore = (pkg: string): number => {
  if (!pkg) return 30;
  const idx = AVG_PACKAGE_RANGES.indexOf(pkg);
  return idx === -1 ? 30 : Math.round(20 + (idx / (AVG_PACKAGE_RANGES.length - 1)) * 80);
};

const feesScore = (fees: string): number => {
  if (!fees) return 30;
  const idx = FEE_RANGES.indexOf(fees);
  return idx === -1 ? 30 : Math.round(20 + (idx / (FEE_RANGES.length - 1)) * 80);
};

const accreditationScore = (accreditations: string[]): number => {
  if (!accreditations || accreditations.length === 0) return 20;
  return Math.min(100, 20 + accreditations.length * 15);
};

const categoryScore = (cat: string): number => cat === "IIM" ? 100 : 40;

const calculateDifficultyScore = (form: any): number => {
  const tS = tierScore(form.tier) * (SCORING_WEIGHTS.tier / 100);
  const rS = rankingScore(form.ranking) * (SCORING_WEIGHTS.ranking / 100);
  const pS = avgPackageScore(form.placement_avg) * (SCORING_WEIGHTS.avgPackage / 100);
  const fS = feesScore(form.fees) * (SCORING_WEIGHTS.fees / 100);
  const aS = accreditationScore(form.accreditations) * (SCORING_WEIGHTS.accreditations / 100);
  const cS = categoryScore(form.college_category) * (SCORING_WEIGHTS.category / 100);
  return Math.round(tS + rS + pS + fS + aS + cS);
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-red-600"; if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-blue-600"; return "text-emerald-600";
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return "Very Hard"; if (score >= 60) return "Hard";
  if (score >= 40) return "Moderate"; return "Easy";
};

type ExamCutoffs = Record<string, string>;

const emptyForm = {
  name: "", city: "", state: "", fees: "", placement_avg: "", placement_highest: "",
  ranking: "", tier: "Tier 2", college_category: "Non-IIM", type: "", established: "",
  exams_accepted: [] as string[], accreditations: [] as string[],
  courses: [] as string[], campus_size: "", total_students: "", website: "",
  exam_cutoffs: {} as ExamCutoffs,
};

const AdminShortlisterColleges = () => {
  const [colleges, setColleges] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  const fetchColleges = async () => {
    const { data } = await supabase.from("colleges").select("id, name, slug, city, state, fees, placement_avg, ranking, tier, college_category, exams_accepted, established, logo_url, accreditations, cutoff_info").order("ranking", { ascending: true, nullsFirst: false });
    if (data) setColleges(data);
  };

  useEffect(() => { fetchColleges(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const difficultyScore = useMemo(() => calculateDifficultyScore(form), [form.tier, form.ranking, form.placement_avg, form.fees, form.accreditations, form.college_category]);

  // Cities filtered by selected state
  const availableCities = useMemo(() => {
    if (!form.state) return [];
    return STATE_CITIES[form.state] || [];
  }, [form.state]);

  const aiEnrich = async () => {
    if (!form.name) { toast({ title: "Enter college name first", variant: "destructive" }); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("college-shortlister", {
        body: { action: "enrich", collegeName: form.name }
      });
      if (error) throw error;
      if (data?.enriched) {
        const e = data.enriched;
        setForm(f => ({
          ...f,
          city: f.city || e.city || "", state: f.state || e.state || "",
          fees: f.fees || e.fees || "", placement_avg: f.placement_avg || e.placement_avg || "",
          placement_highest: f.placement_highest || e.placement_highest || "",
          ranking: f.ranking || (e.ranking?.toString() || ""),
          tier: e.tier || f.tier, college_category: e.college_category || f.college_category,
          type: f.type || e.type || "", established: f.established || (e.established?.toString() || ""),
          exams_accepted: f.exams_accepted.length > 0 ? f.exams_accepted : (e.exams_accepted || []),
          accreditations: f.accreditations.length > 0 ? f.accreditations : (e.accreditations || []),
          courses: f.courses.length > 0 ? f.courses : (e.courses || []),
          campus_size: f.campus_size || e.campus_size || "", website: f.website || e.website || "",
        }));
        toast({ title: "AI enriched college data", description: "Review and adjust before saving" });
      }
    } catch (err: any) {
      toast({ title: "AI enrichment failed", description: err.message, variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!form.tier || !form.college_category) { toast({ title: "Tier and Category are mandatory", variant: "destructive" }); return; }
    const slug = generateSlug(form.name);
    const payload: any = {
      name: form.name, slug, city: form.city || null, state: form.state || null,
      fees: form.fees || null, placement_avg: form.placement_avg || null,
      placement_highest: form.placement_highest || null,
      ranking: form.ranking ? parseInt(form.ranking) : null,
      tier: form.tier, college_category: form.college_category, type: form.type || null,
      established: form.established ? parseInt(form.established) : null,
      exams_accepted: form.exams_accepted.length > 0 ? form.exams_accepted : null,
      accreditations: form.accreditations.length > 0 ? form.accreditations : null,
      courses: form.courses.length > 0 ? form.courses : null,
      campus_size: form.campus_size || null,
      total_students: form.total_students ? parseInt(form.total_students) : null,
      website: form.website || null,
      cutoff_info: Object.keys(form.exam_cutoffs).length > 0 ? form.exam_cutoffs : null,
    };
    if (editId) {
      const { error } = await supabase.from("colleges").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "College updated" });
    } else {
      const { error } = await supabase.from("colleges").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "College added" });
    }
    setDialogOpen(false); setForm(emptyForm); setEditId(null); fetchColleges();
  };

  const handleEdit = (college: any) => {
    const cutoffs = (college.cutoff_info && typeof college.cutoff_info === "object") ? college.cutoff_info as ExamCutoffs : {};
    setForm({
      name: college.name || "", city: college.city || "", state: college.state || "",
      fees: college.fees || "", placement_avg: college.placement_avg || "",
      placement_highest: college.placement_highest || "",
      ranking: college.ranking?.toString() || "", tier: college.tier || "Tier 2",
      college_category: college.college_category || "Non-IIM", type: college.type || "",
      established: college.established?.toString() || "",
      exams_accepted: college.exams_accepted || [], accreditations: college.accreditations || [],
      courses: college.courses || [],
      campus_size: college.campus_size || "", total_students: college.total_students?.toString() || "",
      website: college.website || "", exam_cutoffs: cutoffs,
    });
    setEditId(college.id); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this college? This cannot be undone.")) return;
    await supabase.from("colleges").delete().eq("id", id);
    fetchColleges(); toast({ title: "College deleted" });
  };

  const toggleArrayItem = (field: "exams_accepted" | "accreditations" | "courses", item: string) => {
    setForm(f => {
      const updated = f[field].includes(item) ? f[field].filter(x => x !== item) : [...f[field], item];
      if (field === "exams_accepted" && f[field].includes(item)) {
        const newCutoffs = { ...f.exam_cutoffs };
        delete newCutoffs[item];
        return { ...f, [field]: updated, exam_cutoffs: newCutoffs };
      }
      return { ...f, [field]: updated };
    });
  };

  const updateExamCutoff = (exam: string, value: string) => {
    setForm(f => ({ ...f, exam_cutoffs: { ...f.exam_cutoffs, [exam]: value } }));
  };

  const filtered = colleges.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || c.tier === filterTier;
    const matchCat = filterCategory === "all" || c.college_category === filterCategory;
    return matchSearch && matchTier && matchCat;
  });

  const stats = {
    total: colleges.length,
    iim: colleges.filter(c => c.college_category === "IIM").length,
    tier1: colleges.filter(c => c.tier === "Tier 1").length,
    tier2: colleges.filter(c => c.tier === "Tier 2").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" /> Shortlister Colleges
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage colleges for AI College Shortlister</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); }}><Plus className="w-4 h-4 mr-2" /> Add College</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} College</DialogTitle></DialogHeader>

            <Tabs defaultValue="basic" className="mt-2">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
                <TabsTrigger value="academics" className="text-xs">Academics & Cutoffs</TabsTrigger>
                <TabsTrigger value="placement" className="text-xs">Placement & Fees</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                {/* AI Enrich + Difficulty Score */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground flex-1">Auto-fill missing data using AI</span>
                  <Button size="sm" variant="outline" onClick={aiEnrich} disabled={aiLoading || !form.name}>
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    AI Enrich
                  </Button>
                </div>

                {/* Live Difficulty Score */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Gauge className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">Difficulty Score</p>
                    <p className="text-[10px] text-muted-foreground">Auto-calculated from Tier, Ranking, Package, Fees, Accreditations & Category</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${getScoreColor(difficultyScore)}`}>{difficultyScore}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                    <p className={`text-[10px] font-semibold ${getScoreColor(difficultyScore)}`}>{getScoreLabel(difficultyScore)}</p>
                  </div>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${difficultyScore >= 80 ? 'bg-red-500' : difficultyScore >= 60 ? 'bg-amber-500' : difficultyScore >= 40 ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${difficultyScore}%` }} />
                  </div>
                </div>

                <details className="text-[10px] text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground transition-colors">View scoring weights breakdown</summary>
                  <div className="mt-2 grid grid-cols-3 gap-2 p-2 bg-muted/20 rounded-md">
                    {Object.entries(SCORING_WEIGHTS).map(([key, weight]) => {
                      let raw = 0;
                      switch (key) {
                        case "tier": raw = tierScore(form.tier); break;
                        case "ranking": raw = rankingScore(form.ranking); break;
                        case "avgPackage": raw = avgPackageScore(form.placement_avg); break;
                        case "fees": raw = feesScore(form.fees); break;
                        case "accreditations": raw = accreditationScore(form.accreditations); break;
                        case "category": raw = categoryScore(form.college_category); break;
                      }
                      const weighted = Math.round(raw * (weight / 100));
                      return (
                        <div key={key} className="flex justify-between border border-border/50 rounded px-2 py-1">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-mono font-semibold">{weighted}/{weight}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* ===== BASIC INFO ===== */}
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">College Name <span className="text-destructive">*</span></Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. IIM Ahmedabad" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Category <span className="text-destructive">*</span></Label>
                      <Select value={form.college_category} onValueChange={v => setForm(f => ({ ...f, college_category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Tier <span className="text-destructive">*</span></Label>
                      <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Type</Label>
                      <Select value={form.type || "_none"} onValueChange={v => setForm(f => ({ ...f, type: v === "_none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Select type...</SelectItem>
                          {COLLEGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Established</Label>
                      <Select value={form.established || "_none"} onValueChange={v => setForm(f => ({ ...f, established: v === "_none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Select range...</SelectItem>
                          {ESTABLISHED_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* State → City cascade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">State</Label>
                      <Select value={form.state || "_none"} onValueChange={v => {
                        setForm(f => ({ ...f, state: v === "_none" ? "" : v, city: "" }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select state first" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Select state...</SelectItem>
                          {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">City</Label>
                      <Select value={form.city || "_none"} onValueChange={v => setForm(f => ({ ...f, city: v === "_none" ? "" : v }))} disabled={!form.state}>
                        <SelectTrigger><SelectValue placeholder={form.state ? "Select city" : "Select state first"} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Select city...</SelectItem>
                          {availableCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Website</Label>
                    <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                  </div>
                </TabsContent>

                {/* ===== ACADEMICS & CUTOFFS ===== */}
                <TabsContent value="academics" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">NIRF / Overall Ranking</Label>
                      <Select value={form.ranking || "_none"} onValueChange={v => setForm(f => ({ ...f, ranking: v === "_none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Select range...</SelectItem>
                          {RANKING_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block">Campus Size</Label>
                      <Select value={form.campus_size || "_none"} onValueChange={v => setForm(f => ({ ...f, campus_size: v === "_none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Select size...</SelectItem>
                          {CAMPUS_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Total Students</Label>
                    <Select value={form.total_students || "_none"} onValueChange={v => setForm(f => ({ ...f, total_students: v === "_none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select range...</SelectItem>
                        {STUDENT_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Exams Accepted</Label>
                    <div className="flex flex-wrap gap-2">
                      {EXAMS.map(exam => (
                        <Badge key={exam} variant={form.exams_accepted.includes(exam) ? "default" : "outline"}
                          className="cursor-pointer px-3 py-1.5 text-xs transition-colors"
                          onClick={() => toggleArrayItem("exams_accepted", exam)}>{exam}</Badge>
                      ))}
                    </div>
                  </div>

                  {form.exams_accepted.length > 0 && (
                    <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
                      <Label className="text-xs font-semibold block">📊 Minimum Percentile / Score Required</Label>
                      <p className="text-[10px] text-muted-foreground -mt-1">Set the minimum cutoff for each selected exam</p>
                      <div className="grid grid-cols-2 gap-3">
                        {form.exams_accepted.map(exam => {
                          const isGMAT = exam === "GMAT";
                          const ranges = isGMAT ? GMAT_SCORE_RANGES : PERCENTILE_RANGES;
                          return (
                            <div key={exam}>
                              <Label className="text-[10px] font-semibold mb-1 block text-muted-foreground">
                                {exam} {isGMAT ? "Score" : "Percentile"}
                              </Label>
                              <Select value={form.exam_cutoffs[exam] || "_none"} onValueChange={v => updateExamCutoff(exam, v === "_none" ? "" : v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Select ${isGMAT ? "score" : "percentile"}`} /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">Not set</SelectItem>
                                  {ranges.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Accreditations</Label>
                    <div className="flex flex-wrap gap-2">
                      {ACCREDITATIONS_LIST.map(a => (
                        <Badge key={a} variant={form.accreditations.includes(a) ? "default" : "outline"}
                          className="cursor-pointer px-3 py-1.5 text-xs transition-colors"
                          onClick={() => toggleArrayItem("accreditations", a)}>{a}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Courses / Programs</Label>
                    <div className="flex flex-wrap gap-2">
                      {COURSES_LIST.map(c => (
                        <Badge key={c} variant={form.courses.includes(c) ? "default" : "outline"}
                          className="cursor-pointer px-3 py-1.5 text-xs transition-colors"
                          onClick={() => toggleArrayItem("courses", c)}>{c}</Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ===== PLACEMENT & FEES ===== */}
                <TabsContent value="placement" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Total Fees (Full Program)</Label>
                    <Select value={form.fees || "_none"} onValueChange={v => setForm(f => ({ ...f, fees: v === "_none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select fee range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select fee range...</SelectItem>
                        {FEE_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Average Package (CTC)</Label>
                    <Select value={form.placement_avg || "_none"} onValueChange={v => setForm(f => ({ ...f, placement_avg: v === "_none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select avg package range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select range...</SelectItem>
                        {AVG_PACKAGE_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Highest Package</Label>
                    <Select value={form.placement_highest || "_none"} onValueChange={v => setForm(f => ({ ...f, placement_highest: v === "_none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select highest package range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Select range...</SelectItem>
                        {HIGHEST_PACKAGE_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <Button onClick={handleSave} className="w-full mt-4">{editId ? "Update" : "Create"} College</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Colleges", value: stats.total, icon: Building2, color: "text-primary" },
          { label: "IIM Colleges", value: stats.iim, icon: GraduationCap, color: "text-amber-600" },
          { label: "Tier 1", value: stats.tier1, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Tier 2+", value: stats.tier2, icon: MapPin, color: "text-blue-600" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="pt-4 pb-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search colleges..." className="pl-9" />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[130px]"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">College</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Tier</TableHead>
                <TableHead className="text-xs">City</TableHead>
                <TableHead className="text-xs">Fees</TableHead>
                <TableHead className="text-xs">Avg CTC</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const score = calculateDifficultyScore({
                  tier: c.tier, ranking: c.ranking?.toString() || "",
                  placement_avg: c.placement_avg || "", fees: c.fees || "",
                  accreditations: c.accreditations || [], college_category: c.college_category || "Non-IIM"
                });
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.logo_url ? <img src={c.logo_url} className="w-7 h-7 rounded object-contain" alt="" /> : <Building2 className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-medium text-xs">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={c.college_category === "IIM" ? "default" : "outline"} className="text-[10px]">{c.college_category || "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.tier || "—"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.city || "—"}</TableCell>
                    <TableCell className="text-xs">{c.fees || "—"}</TableCell>
                    <TableCell className="text-xs">{c.placement_avg || "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold ${getScoreColor(score)}`}>{score}</span>
                      <span className="text-[9px] text-muted-foreground ml-0.5">/ 100</span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No colleges found. Add your first college above.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminShortlisterColleges;
