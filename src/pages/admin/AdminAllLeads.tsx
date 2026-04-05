import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Search, Calendar, Mail, Phone, UserCheck, BarChart3, Sparkles, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface UnifiedLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: "signup" | "profile-analyzer" | "inquiry" | "newsletter";
  source_page: string;
  target_exams: string[];
  work_experience: string;
  score: number | null;
  created_at: string;
  extra: Record<string, any>;
}

const sourceConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  signup: { label: "Signup", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: UserCheck },
  "profile-analyzer": { label: "Profile Analyzer", color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: Sparkles },
  inquiry: { label: "Inquiry", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: MessageSquare },
  newsletter: { label: "Newsletter", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: Mail },
};

const AdminAllLeads = () => {
  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchAllLeads = async () => {
    setLoading(true);
    const unified: UnifiedLead[] = [];

    // 1. Profiles (signups)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // We need emails from auth - fetch via profile user_ids
    // Since we can't query auth.users, we'll show what we have

    if (profiles) {
      for (const p of profiles) {
        unified.push({
          id: `signup-${p.id}`,
          name: p.display_name || "—",
          email: "—", // Will be enriched below
          phone: p.phone || "—",
          source: "signup",
          source_page: p.signup_page_name || "Direct",
          target_exams: p.target_exams || [],
          work_experience: p.work_experience || "—",
          score: null,
          created_at: p.created_at,
          extra: { city: p.city, signup_url: p.signup_page_url },
        });
      }
    }

    // 2. Profile Analyses
    const { data: analyses } = await supabase
      .from("profile_analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (analyses) {
      for (const a of analyses) {
        unified.push({
          id: `analyzer-${a.id}`,
          name: a.email?.split("@")[0] || "—",
          email: a.email || "—",
          phone: a.phone || "—",
          source: "profile-analyzer",
          source_page: "Profile Analyzer",
          target_exams: [a.target_exam],
          work_experience: a.work_experience_months ? `${a.work_experience_months} mo` : "—",
          score: a.profile_score ? Number(a.profile_score) : null,
          created_at: a.created_at,
          extra: {
            graduation_stream: a.graduation_stream,
            category: a.category,
            unlocked: a.report_unlocked,
          },
        });
      }
    }

    // 3. Inquiries
    const { data: inquiries } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (inquiries) {
      for (const i of inquiries) {
        unified.push({
          id: `inquiry-${i.id}`,
          name: i.name || "—",
          email: i.email || "—",
          phone: i.phone || "—",
          source: "inquiry",
          source_page: i.type || "General",
          target_exams: [],
          work_experience: "—",
          score: null,
          created_at: i.created_at,
          extra: { message: i.message },
        });
      }
    }

    // 4. Newsletter
    const { data: subs } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("created_at", { ascending: false });

    if (subs) {
      for (const s of subs) {
        unified.push({
          id: `newsletter-${s.id}`,
          name: s.email.split("@")[0],
          email: s.email,
          phone: "—",
          source: "newsletter",
          source_page: "Footer / Newsletter",
          target_exams: [],
          work_experience: "—",
          score: null,
          created_at: s.created_at,
          extra: {},
        });
      }
    }

    // Sort by date descending
    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLeads(unified);
    setLoading(false);
  };

  useEffect(() => { fetchAllLeads(); }, []);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length, signup: 0, "profile-analyzer": 0, inquiry: 0, newsletter: 0 };
    leads.forEach(l => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return counts;
  }, [leads]);

  const filtered = useMemo(() => {
    let result = leads;

    if (activeTab !== "all") {
      result = result.filter(l => l.source === activeTab);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.source_page.toLowerCase().includes(q)
      );
    }

    if (dateFrom) result = result.filter(l => l.created_at >= dateFrom);
    if (dateTo) {
      const toEnd = dateTo + "T23:59:59";
      result = result.filter(l => l.created_at <= toEnd);
    }

    return result;
  }, [leads, search, dateFrom, dateTo, activeTab]);

  const stats = useMemo(() => {
    const withEmail = leads.filter(l => l.email !== "—").length;
    const withPhone = leads.filter(l => l.phone !== "—").length;
    const withBoth = leads.filter(l => l.email !== "—" && l.phone !== "—").length;
    return { total: leads.length, withEmail, withPhone, withBoth };
  }, [leads]);

  const downloadCSV = () => {
    const headers = ["Name", "Email", "Phone", "Source", "Source Page", "Target Exams", "Work Exp", "Score", "Date"];
    const rows = filtered.map(l => [
      l.name, l.email, l.phone, l.source, l.source_page,
      l.target_exams.join("; "), l.work_experience,
      l.score ?? "", l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd HH:mm") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_leads_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" /> All Leads — Unified View
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All leads from every source in one place</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Leads</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.withEmail}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> With Email</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.withPhone}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Phone className="w-3 h-3" /> With Phone</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.withBoth}</div>
          <div className="text-xs text-muted-foreground">Email + Phone</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone, page..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
              <span className="text-sm text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">All ({sourceCounts.all})</TabsTrigger>
              <TabsTrigger value="signup">Signups ({sourceCounts.signup})</TabsTrigger>
              <TabsTrigger value="profile-analyzer">Analyzer ({sourceCounts["profile-analyzer"]})</TabsTrigger>
              <TabsTrigger value="inquiry">Inquiries ({sourceCounts.inquiry})</TabsTrigger>
              <TabsTrigger value="newsletter">Newsletter ({sourceCounts.newsletter})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Showing {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Source Page</TableHead>
                  <TableHead>Target Exams</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading all sources...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
                ) : (
                  filtered.map((lead) => {
                    const sc = sourceConfig[lead.source];
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell className="text-xs">{lead.email}</TableCell>
                        <TableCell className="text-xs">{lead.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${sc.color}`}>
                            <sc.icon className="w-3 h-3 mr-1" />
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{lead.source_page}</TableCell>
                        <TableCell>
                          {lead.target_exams.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lead.target_exams.slice(0, 3).map(e => (
                                <span key={e} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">{e}</span>
                              ))}
                              {lead.target_exams.length > 3 && <span className="text-[10px] text-muted-foreground">+{lead.target_exams.length - 3}</span>}
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {lead.score !== null ? (
                            <div className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3 text-primary" />
                              <span className="text-xs font-bold">{lead.score}</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(lead.created_at), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAllLeads;
