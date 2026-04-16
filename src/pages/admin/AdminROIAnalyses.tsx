import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, Download, Eye, Phone, Mail, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface ROILead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  graduation_stream: string;
  current_salary_lakhs: number;
  work_experience_years: number;
  target_exams: string[];
  expected_tier: string;
  preferred_specialization: string | null;
  budget_lakhs: number;
  preferred_location: string | null;
  target_states: string[] | null;
  total_investment_lakhs: number | null;
  expected_salary_lakhs: number | null;
  payback_years: number | null;
  roi_score: number | null;
  roi_category: string | null;
  ai_insights: any;
  college_recommendations: any;
  report_unlocked: boolean;
  created_at: string;
}

const AdminROIAnalyses = () => {
  const [leads, setLeads] = useState<ROILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [examFilter, setExamFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<ROILead | null>(null);
  const [tab, setTab] = useState("all");

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from("roi_analyses").select("*").order("created_at", { ascending: false });
    setLeads((data as ROILead[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => leads.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.name?.toLowerCase().includes(q) && !l.phone?.includes(q) && !l.email?.toLowerCase().includes(q) && !l.graduation_stream?.toLowerCase().includes(q)) return false;
    }
    if (catFilter !== "all" && l.roi_category !== catFilter) return false;
    if (examFilter !== "all" && !l.target_exams?.includes(examFilter)) return false;
    if (dateFrom && l.created_at < dateFrom) return false;
    if (dateTo && l.created_at > dateTo + "T23:59:59") return false;
    if (tab === "unlocked" && !l.report_unlocked) return false;
    if (tab === "locked" && l.report_unlocked) return false;
    if (tab === "high-roi" && l.roi_category !== "High") return false;
    return true;
  }), [leads, search, catFilter, examFilter, dateFrom, dateTo, tab]);

  const stats = useMemo(() => {
    const total = leads.length;
    const unlocked = leads.filter(l => l.report_unlocked).length;
    const high = leads.filter(l => l.roi_category === "High").length;
    const avgPayback = leads.length > 0 ? (leads.reduce((a, l) => a + (Number(l.payback_years) || 0), 0) / leads.length).toFixed(1) : "0";
    return { total, unlocked, high, avgPayback, conv: total > 0 ? ((unlocked / total) * 100).toFixed(1) : "0" };
  }, [leads]);

  const uniqueExams = useMemo(() => Array.from(new Set(leads.flatMap(l => l.target_exams || []))), [leads]);

  const downloadCSV = () => {
    const headers = ["Date", "Name", "Phone", "Email", "Stream", "Current Salary (L)", "Experience (yr)", "Exams", "Tier", "Specialization", "Budget (L)", "Location", "Investment (L)", "Salary Post (L)", "Payback (yr)", "ROI Score", "ROI Cat", "Unlocked"];
    const rows = filtered.map(l => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm"),
      l.name || "", l.phone || "", l.email || "", l.graduation_stream,
      l.current_salary_lakhs, l.work_experience_years,
      l.target_exams?.join("; ") || "", l.expected_tier, l.preferred_specialization || "",
      l.budget_lakhs, l.preferred_location || "",
      l.total_investment_lakhs || "", l.expected_salary_lakhs || "", l.payback_years || "",
      l.roi_score || "", l.roi_category || "", l.report_unlocked ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mba-roi-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6 text-primary" /> MBA ROI Calculator Leads</h1>
          <p className="text-sm text-muted-foreground">Track ROI Calculator submissions and AI-generated reports.</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Reports", value: stats.total, icon: Users, color: "text-blue-600" },
          { label: "Unlocked", value: stats.unlocked, icon: Target, color: "text-emerald-600" },
          { label: "Conversion", value: `${stats.conv}%`, icon: TrendingUp, color: "text-violet-600" },
          { label: "High ROI", value: stats.high, icon: BarChart3, color: "text-amber-600" },
          { label: "Avg Payback", value: `${stats.avgPayback} yr`, icon: Calculator, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]"><Input placeholder="Search name, phone, email, stream…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="ROI Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="High">High ROI</SelectItem>
            <SelectItem value="Medium">Medium ROI</SelectItem>
            <SelectItem value="Low">Low ROI</SelectItem>
          </SelectContent>
        </Select>
        <Select value={examFilter} onValueChange={setExamFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Exam" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {uniqueExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
          <TabsTrigger value="unlocked">Unlocked ({leads.filter(l => l.report_unlocked).length})</TabsTrigger>
          <TabsTrigger value="locked">Locked ({leads.filter(l => !l.report_unlocked).length})</TabsTrigger>
          <TabsTrigger value="high-roi">High ROI ({leads.filter(l => l.roi_category === "High").length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <p className="text-center py-10 text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No leads found.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Payback</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Exams</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(l.created_at), "dd MMM")}<br />
                        <span className="text-muted-foreground">{format(new Date(l.created_at), "hh:mm a")}</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{l.name || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {l.phone && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {l.phone}</span>}
                          {l.email && <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /> {l.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.roi_category === "High" ? "default" : l.roi_category === "Medium" ? "secondary" : "destructive"}>
                          {l.roi_score || "—"} ({l.roi_category || "—"})
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{l.payback_years ? `${l.payback_years} yr` : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.expected_tier}</Badge></TableCell>
                      <TableCell className="text-sm">{l.graduation_stream}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{l.target_exams?.join(", ")}</TableCell>
                      <TableCell className="text-sm">₹{l.budget_lakhs}L</TableCell>
                      <TableCell><Badge variant={l.report_unlocked ? "default" : "secondary"}>{l.report_unlocked ? "Unlocked" : "Locked"}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected(l)}><Eye className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ROI Lead — {selected?.name || "Unknown"}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <h4 className="font-semibold border-b pb-1">Contact</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Phone:</strong> {selected.phone}</div>
                <div><strong>Email:</strong> {selected.email}</div>
              </div>

              <h4 className="font-semibold border-b pb-1">Inputs</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Stream:</strong> {selected.graduation_stream}</div>
                <div><strong>Experience:</strong> {selected.work_experience_years} yr</div>
                <div><strong>Current Salary:</strong> ₹{selected.current_salary_lakhs}L</div>
                <div><strong>Tier:</strong> {selected.expected_tier}</div>
                <div><strong>Specialization:</strong> {selected.preferred_specialization || "—"}</div>
                <div><strong>Budget:</strong> ₹{selected.budget_lakhs}L</div>
                <div><strong>Location:</strong> {selected.preferred_location}</div>
                <div><strong>States:</strong> {selected.target_states?.join(", ") || "Any"}</div>
              </div>
              <div><strong>Exams:</strong> <div className="flex flex-wrap gap-1 mt-1">{selected.target_exams?.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}</div></div>

              <h4 className="font-semibold border-b pb-1">Computed ROI</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Investment:</strong> ₹{selected.total_investment_lakhs}L</div>
                <div><strong>Expected Salary:</strong> ₹{selected.expected_salary_lakhs}L</div>
                <div><strong>Payback:</strong> {selected.payback_years} yr</div>
                <div><strong>ROI Score:</strong> {selected.roi_score} ({selected.roi_category})</div>
              </div>

              {selected.ai_insights?.verdict && (
                <>
                  <h4 className="font-semibold border-b pb-1">AI Verdict</h4>
                  <div><Badge>{selected.ai_insights.verdict}</Badge></div>
                  <p className="text-muted-foreground">{selected.ai_insights.verdict_summary}</p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminROIAnalyses;
