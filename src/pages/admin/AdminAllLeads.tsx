import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, Search, Mail, Phone, UserCheck, Sparkles, MessageSquare, Briefcase, Calculator, Ticket, ChevronLeft, ChevronRight, TrendingUp, CalendarCheck } from "lucide-react";
import { format, subDays, isToday, startOfDay, eachDayOfInterval } from "date-fns";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface MasterLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  source_page: string;
  created_at: string;
  extras: string;
}

const sourceConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  signup: { label: "Signup", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: UserCheck },
  "profile-analyzer": { label: "Profile Analyzer", color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: Sparkles },
  inquiry: { label: "Inquiry", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: MessageSquare },
  newsletter: { label: "Newsletter", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: Mail },
  "business-inquiry": { label: "Business Inquiry", color: "bg-rose-500/10 text-rose-700 border-rose-200", icon: Briefcase },
  "cat-score": { label: "CAT Score", color: "bg-cyan-500/10 text-cyan-700 border-cyan-200", icon: Calculator },
  "coupon-claim": { label: "Coupon Claim", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: Ticket },
};

const ROWS_PER_PAGE = 50;

const AdminAllLeads = () => {
  const [leads, setLeads] = useState<MasterLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchAllLeads = async () => {
    setLoading(true);
    const unified: MasterLead[] = [];

    const [
      { data: profiles },
      { data: analyses },
      { data: inquiries },
      { data: subs },
      { data: bizInquiries },
      { data: catScores },
      { data: couponClaims },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("profile_analyses").select("*").order("created_at", { ascending: false }),
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("business_inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("cat_score_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("coupon_claims").select("*, coupons(code, institute_id)").order("claimed_at", { ascending: false }),
    ]);

    if (profiles) {
      for (const p of profiles) {
        const extras: string[] = [];
        if (p.city) extras.push(`City: ${p.city}`);
        if (p.target_exams?.length) extras.push(`Exams: ${p.target_exams.join(", ")}`);
        if (p.work_experience) extras.push(`Exp: ${p.work_experience}`);
        unified.push({
          id: `signup-${p.id}`, name: p.display_name || "—", email: "—",
          phone: p.phone || "—", source: "signup",
          source_page: p.signup_page_url || p.signup_page_name || "Direct Signup",
          created_at: p.created_at, extras: extras.join(" | "),
        });
      }
    }

    if (analyses) {
      for (const a of analyses) {
        const extras: string[] = [];
        if (a.target_exam) extras.push(`Exam: ${a.target_exam}`);
        if (a.graduation_stream) extras.push(`Stream: ${a.graduation_stream}`);
        if (a.category) extras.push(`Cat: ${a.category}`);
        if (a.work_experience_months) extras.push(`Exp: ${a.work_experience_months}mo`);
        if (a.profile_score) extras.push(`Score: ${a.profile_score}`);
        if (a.current_city) extras.push(`City: ${a.current_city}`);
        unified.push({
          id: `analyzer-${a.id}`, name: a.name || a.email?.split("@")[0] || "—",
          email: a.email || "—", phone: a.phone || "—", source: "profile-analyzer",
          source_page: "Profile Analyzer", created_at: a.created_at,
          extras: extras.join(" | "),
        });
      }
    }

    if (inquiries) {
      for (const i of inquiries) {
        const extras: string[] = [];
        if (i.type) extras.push(`Type: ${i.type}`);
        if (i.message) extras.push(`Msg: ${i.message.slice(0, 80)}`);
        unified.push({
          id: `inquiry-${i.id}`, name: i.name || "—", email: i.email || "—",
          phone: i.phone || "—", source: "inquiry",
          source_page: i.type ? `Inquiry - ${i.type}` : "General Inquiry",
          created_at: i.created_at, extras: extras.join(" | "),
        });
      }
    }

    if (subs) {
      for (const s of subs) {
        unified.push({
          id: `newsletter-${s.id}`, name: s.email.split("@")[0],
          email: s.email, phone: "—", source: "newsletter",
          source_page: "Newsletter Signup", created_at: s.created_at, extras: "",
        });
      }
    }

    if (bizInquiries) {
      for (const b of bizInquiries) {
        const extras: string[] = [];
        extras.push(`Institute: ${b.institute_name}`);
        extras.push(`Type: ${b.institute_type}`);
        if (b.website_url) extras.push(`Web: ${b.website_url}`);
        extras.push(`WhatsApp: ${b.whatsapp_number}`);
        if (b.status) extras.push(`Status: ${b.status}`);
        unified.push({
          id: `biz-${b.id}`, name: b.poc_name, email: b.poc_email,
          phone: b.contact_number, source: "business-inquiry",
          source_page: "Business Inquiry Form", created_at: b.created_at,
          extras: extras.join(" | "),
        });
      }
    }

    if (catScores) {
      for (const c of catScores) {
        const extras: string[] = [];
        if (c.total_score) extras.push(`Score: ${c.total_score}/${c.max_score}`);
        if (c.estimated_percentile) extras.push(`%ile: ${c.estimated_percentile}`);
        if (c.state) extras.push(`State: ${c.state}`);
        if (c.subject) extras.push(`Subject: ${c.subject}`);
        unified.push({
          id: `cat-${c.id}`, name: c.candidate_name || "—", email: c.email || "—",
          phone: c.phone || "—", source: "cat-score",
          source_page: "CAT Score Calculator", created_at: c.created_at,
          extras: extras.join(" | "),
        });
      }
    }

    if (couponClaims) {
      for (const cc of couponClaims) {
        const extras: string[] = [];
        if ((cc as any).coupons?.code) extras.push(`Code: ${(cc as any).coupons.code}`);
        if (cc.login_source) extras.push(`Via: ${cc.login_source}`);
        if (cc.target_exam) extras.push(`Exam: ${cc.target_exam}`);
        unified.push({
          id: `coupon-${cc.id}`, name: "—", email: "—",
          phone: "—", source: "coupon-claim",
          source_page: "Coupon Claim", created_at: cc.claimed_at,
          extras: extras.join(" | "),
        });
      }
    }

    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLeads(unified);
    setLoading(false);
  };

  useEffect(() => { fetchAllLeads(); }, []);

  // Deduplicate by phone and email — keep earliest entry per unique contact
  const uniqueLeads = useMemo(() => {
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const deduped: MasterLead[] = [];

    for (const lead of leads) {
      const phone = lead.phone !== "—" ? lead.phone : null;
      const email = lead.email !== "—" ? lead.email.toLowerCase() : null;

      const phoneDup = phone ? seenPhones.has(phone) : false;
      const emailDup = email ? seenEmails.has(email) : false;

      if (phoneDup || emailDup) continue;

      if (phone) seenPhones.add(phone);
      if (email) seenEmails.add(email);
      deduped.push(lead);
    }
    return deduped;
  }, [leads]);

  const todaysLeads = useMemo(() => {
    return uniqueLeads.filter(l => isToday(new Date(l.created_at))).length;
  }, [uniqueLeads]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: uniqueLeads.length };
    uniqueLeads.forEach(l => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return counts;
  }, [uniqueLeads]);

  const filtered = useMemo(() => {
    let result = uniqueLeads;
    if (sourceFilter !== "all") result = result.filter(l => l.source === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) ||
        l.phone.includes(q) || l.source_page.toLowerCase().includes(q) ||
        l.extras.toLowerCase().includes(q)
      );
    }
    if (dateFrom) result = result.filter(l => l.created_at >= dateFrom);
    if (dateTo) result = result.filter(l => l.created_at <= dateTo + "T23:59:59");
    return result;
  }, [uniqueLeads, search, dateFrom, dateTo, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, sourceFilter]);

  const stats = useMemo(() => {
    const withEmail = uniqueLeads.filter(l => l.email !== "—").length;
    const withPhone = uniqueLeads.filter(l => l.phone !== "—").length;
    const withBoth = uniqueLeads.filter(l => l.email !== "—" && l.phone !== "—").length;
    return { total: uniqueLeads.length, withEmail, withPhone, withBoth };
  }, [uniqueLeads]);

  // Daily cumulative graph data (last 30 days)
  const graphData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    const dailyCounts: Record<string, number> = {};
    for (const d of days) {
      dailyCounts[format(d, "yyyy-MM-dd")] = 0;
    }

    for (const lead of uniqueLeads) {
      const day = format(new Date(lead.created_at), "yyyy-MM-dd");
      if (dailyCounts[day] !== undefined) {
        dailyCounts[day]++;
      }
    }

    const entries = days.map(d => ({
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "dd MMM"),
      daily: dailyCounts[format(d, "yyyy-MM-dd")] || 0,
    }));

    // Cumulative
    let cumulative = 0;
    // Count all leads before the 30 day window
    const beforeWindow = uniqueLeads.filter(l => new Date(l.created_at) < startOfDay(thirtyDaysAgo)).length;
    cumulative = beforeWindow;

    return entries.map(e => {
      cumulative += e.daily;
      return { ...e, cumulative };
    });
  }, [uniqueLeads]);


  const downloadCSV = () => {
    const headers = ["Name", "Email", "Mobile", "Source", "Page Link", "Lead Date", "Extra Details"];
    const rows = filtered.map(l => [
      l.name, l.email, l.phone, sourceConfig[l.source]?.label || l.source,
      l.source_page, l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd HH:mm") : "",
      l.extras,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `master_data_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" /> Master Data
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All unique leads — deduplicated by mobile & email</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAllLeads} variant="outline" size="sm" disabled={loading}>
            Refresh
          </Button>
          <Button onClick={downloadCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" /> Download CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Unique Leads</div>
        </CardContent></Card>
        <Card className="border-primary/30 bg-primary/5"><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
            <CalendarCheck className="w-5 h-5" /> {todaysLeads}
          </div>
          <div className="text-xs text-muted-foreground font-medium">Today's Leads</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.withEmail}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> With Email</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.withPhone}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Phone className="w-3 h-3" /> With Phone</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.withBoth}</div>
          <div className="text-xs text-muted-foreground">Email + Phone</div>
        </CardContent></Card>
      </div>

      {/* Daily Cumulative Graph */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Daily Leads (Last 30 Days) — Cumulative Growth
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={graphData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval={4}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))",
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}
              />
              <Bar
                yAxisId="left"
                dataKey="daily"
                name="Daily Leads"
                fill="hsl(var(--primary) / 0.3)"
                radius={[4, 4, 0, 0]}
                barSize={12}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="Cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Name, email, phone, page..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources ({sourceCounts.all})</SelectItem>
                  {Object.entries(sourceConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label} ({sourceCounts[key] || 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            </div>
            {(search || dateFrom || dateTo || sourceFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setSourceFilter("all"); }}>
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Showing {paginated.length} of {filtered.length} unique leads (Page {page}/{totalPages})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Mobile</TableHead>
                  <TableHead className="whitespace-nowrap">Lead Date</TableHead>
                  <TableHead className="whitespace-nowrap">Page / Source</TableHead>
                  <TableHead className="whitespace-nowrap">Category</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[250px]">Extra Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading all sources...</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
                ) : (
                  paginated.map((lead) => {
                    const sc = sourceConfig[lead.source] || sourceConfig.signup;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium whitespace-nowrap">{lead.name}</TableCell>
                        <TableCell className="text-xs">{lead.email}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{lead.phone}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(lead.created_at), "dd MMM yyyy, hh:mm a")}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate" title={lead.source_page}>
                          {lead.source_page}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${sc.color}`}>
                            <sc.icon className="w-3 h-3 mr-1" />
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[350px]">
                          {lead.extras || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAllLeads;
