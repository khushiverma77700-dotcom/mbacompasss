import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Brain, Download, Users, TrendingUp, Target, BarChart3, Eye, Phone, Mail } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";
import { format } from "date-fns";

interface Lead {
  id: string;
  name: string | null;
  tenth_score: number;
  twelfth_score: number;
  graduation_score: number;
  graduation_stream: string;
  graduation_year: number | null;
  is_pursuing_graduation: boolean | null;
  work_experience_months: number;
  category: string;
  gender: string | null;
  target_exam: string;
  target_exams: string[] | null;
  target_colleges: string[];
  target_states: string[] | null;
  preferred_specialization: string | null;
  phone: string | null;
  email: string | null;
  report_unlocked: boolean;
  profile_score: number | null;
  fee_budget_lakhs: number | null;
  expected_salary_lakhs: number | null;
  current_employer_type: string[] | null;
  has_certifications: string[] | null;
  extracurriculars: string[] | null;
  leadership_roles: string | null;
  preparation_months_remaining: number | null;
  current_city: string | null;
  has_gap_years: boolean | null;
  gap_year_reason: string | null;
  created_at: string;
}

const AdminProfileAnalyzer = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profile_analyses")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.name?.toLowerCase().includes(q) &&
          !l.phone?.includes(q) &&
          !l.email?.toLowerCase().includes(q) &&
          !l.target_exam?.toLowerCase().includes(q) &&
          !l.graduation_stream?.toLowerCase().includes(q) &&
          !l.current_city?.toLowerCase().includes(q)
        ) return false;
      }
      if (examFilter !== "all" && l.target_exam !== examFilter) return false;
      if (dateFrom && l.created_at < dateFrom) return false;
      if (dateTo && l.created_at > dateTo + "T23:59:59") return false;
      if (activeTab === "unlocked" && !l.report_unlocked) return false;
      if (activeTab === "locked" && l.report_unlocked) return false;
      if (activeTab === "high-score" && (l.profile_score || 0) < 7) return false;
      return true;
    });
  }, [leads, search, examFilter, dateFrom, dateTo, activeTab]);

  const { sortedItems: sortedFiltered, sortConfig, handleSort } = useTableSort(filtered);

  const stats = useMemo(() => {
    const total = leads.length;
    const unlocked = leads.filter((l) => l.report_unlocked).length;
    const avgScore = leads.length > 0
      ? (leads.reduce((a, l) => a + (l.profile_score || 0), 0) / leads.length).toFixed(1)
      : "0";
    const examBreakdown: Record<string, number> = {};
    leads.forEach((l) => { examBreakdown[l.target_exam] = (examBreakdown[l.target_exam] || 0) + 1; });
    const topExam = Object.entries(examBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    return { total, unlocked, avgScore, topExam, conversionRate: total > 0 ? ((unlocked / total) * 100).toFixed(1) : "0" };
  }, [leads]);

  const uniqueExams = useMemo(() => [...new Set(leads.map((l) => l.target_exam))], [leads]);

  const downloadCSV = () => {
    const headers = [
      "Date", "Name", "Phone", "Email", "City", "Score", "Exam", "All Exams", "Stream",
      "Graduation Year", "Pursuing Graduation", "10th%", "12th%", "Graduation%",
      "Experience (mo)", "Category", "Gender", "Fee Budget (L)", "Expected Salary (L)",
      "Employer Type", "Certifications", "Extracurriculars", "Leadership",
      "Prep Months Left", "Gap Years", "Gap Reason", "Specialization",
      "Target Colleges", "Target States", "Unlocked",
    ];
    const rows = filtered.map((l) => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm"),
      l.name || "",
      l.phone || "",
      l.email || "",
      l.current_city || "",
      l.profile_score || "",
      l.target_exam,
      l.target_exams?.join("; ") || "",
      l.graduation_stream,
      l.graduation_year || "",
      l.is_pursuing_graduation ? "Yes" : "No",
      l.tenth_score,
      l.twelfth_score,
      l.graduation_score,
      l.work_experience_months,
      l.category,
      l.gender || "",
      l.fee_budget_lakhs || "",
      l.expected_salary_lakhs || "",
      l.current_employer_type?.join("; ") || "",
      l.has_certifications?.join("; ") || "",
      l.extracurriculars?.join("; ") || "",
      l.leadership_roles || "",
      l.preparation_months_remaining || "",
      l.has_gap_years ? "Yes" : "No",
      l.gap_year_reason || "",
      l.preferred_specialization || "",
      l.target_colleges?.join("; ") || "",
      l.target_states?.join("; ") || "",
      l.report_unlocked ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profile-analyzer-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> Profile Analyzer Leads
          </h1>
          <p className="text-sm text-muted-foreground">Track and manage MBA profile analysis submissions</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Analyses", value: stats.total, icon: Users, color: "text-blue-600" },
          { label: "Reports Unlocked", value: stats.unlocked, icon: Target, color: "text-green-600" },
          { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-purple-600" },
          { label: "Avg Score", value: `${stats.avgScore}/10`, icon: BarChart3, color: "text-amber-600" },
          { label: "Top Exam", value: stats.topExam, icon: Brain, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search by name, phone, email, exam, city..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={examFilter} onValueChange={setExamFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Exam" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {uniqueExams.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
          <TabsTrigger value="unlocked">Unlocked ({leads.filter((l) => l.report_unlocked).length})</TabsTrigger>
          <TabsTrigger value="locked">Locked ({leads.filter((l) => !l.report_unlocked).length})</TabsTrigger>
          <TabsTrigger value="high-score">High Score 7+ ({leads.filter((l) => (l.profile_score || 0) >= 7).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <p className="text-center py-10 text-muted-foreground">Loading leads...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No leads found.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                   <TableRow>
                     <SortableTableHead label="Date" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                     <SortableTableHead label="Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                     <TableHead>Contact</TableHead>
                     <SortableTableHead label="Score" sortKey="profile_score" sortConfig={sortConfig} onSort={handleSort} />
                     <SortableTableHead label="Exam" sortKey="target_exam" sortConfig={sortConfig} onSort={handleSort} />
                     <SortableTableHead label="Stream" sortKey="graduation_stream" sortConfig={sortConfig} onSort={handleSort} />
                     <SortableTableHead label="City" sortKey="current_city" sortConfig={sortConfig} onSort={handleSort} />
                     <SortableTableHead label="Experience" sortKey="work_experience_months" sortConfig={sortConfig} onSort={handleSort} />
                     <SortableTableHead label="Budget" sortKey="fee_budget_lakhs" sortConfig={sortConfig} onSort={handleSort} />
                     <SortableTableHead label="Status" sortKey="report_unlocked" sortConfig={sortConfig} onSort={handleSort} />
                     <TableHead>Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFiltered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(lead.created_at), "dd MMM yyyy")}
                        <br />
                        <span className="text-muted-foreground">{format(new Date(lead.created_at), "hh:mm a")}</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{lead.name || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.phone && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                          {lead.email && <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /> {lead.email}</span>}
                          {!lead.phone && !lead.email && <span className="text-xs text-muted-foreground">No contact</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(lead.profile_score || 0) >= 8 ? "default" : (lead.profile_score || 0) >= 6 ? "secondary" : "destructive"}>
                          {lead.profile_score?.toFixed(1) || "N/A"}/10
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{lead.target_exam}</Badge></TableCell>
                      <TableCell className="text-sm">{lead.graduation_stream}</TableCell>
                      <TableCell className="text-sm">{lead.current_city || "—"}</TableCell>
                      <TableCell className="text-sm">{lead.work_experience_months} mo</TableCell>
                      <TableCell className="text-sm">{lead.fee_budget_lakhs ? `₹${lead.fee_budget_lakhs}L` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={lead.report_unlocked ? "default" : "secondary"}>
                          {lead.report_unlocked ? "Unlocked" : "Locked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedLead(lead)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details — {selectedLead?.name || "Unknown"}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Score:</strong> {selectedLead.profile_score?.toFixed(1)}/10</div>
                <div><strong>Primary Exam:</strong> {selectedLead.target_exam}</div>
                <div><strong>Phone:</strong> {selectedLead.phone || "N/A"}</div>
                <div><strong>Email:</strong> {selectedLead.email || "N/A"}</div>
                <div><strong>City:</strong> {selectedLead.current_city || "N/A"}</div>
                <div><strong>Gender:</strong> {selectedLead.gender || "N/A"}</div>
                <div><strong>Category:</strong> {selectedLead.category}</div>
                <div><strong>Status:</strong> {selectedLead.report_unlocked ? "Unlocked ✅" : "Locked 🔒"}</div>
              </div>

              <h4 className="font-semibold border-b pb-1">Academics</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><strong>10th:</strong> {selectedLead.tenth_score}%</div>
                <div><strong>12th:</strong> {selectedLead.twelfth_score}%</div>
                <div><strong>Graduation:</strong> {selectedLead.graduation_score}% ({selectedLead.graduation_stream})</div>
                <div><strong>Grad Year:</strong> {selectedLead.graduation_year || "N/A"}</div>
                <div><strong>Pursuing:</strong> {selectedLead.is_pursuing_graduation ? "Yes" : "No"}</div>
                <div><strong>Gap Years:</strong> {selectedLead.has_gap_years ? `Yes — ${selectedLead.gap_year_reason || ""}` : "No"}</div>
              </div>

              <h4 className="font-semibold border-b pb-1">Professional</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Experience:</strong> {selectedLead.work_experience_months} months</div>
                <div><strong>Employer Type:</strong> {selectedLead.current_employer_type?.join(", ") || "N/A"}</div>
                <div><strong>Leadership:</strong> {selectedLead.leadership_roles || "N/A"}</div>
                <div><strong>Prep Months:</strong> {selectedLead.preparation_months_remaining || "N/A"}</div>
              </div>

              <h4 className="font-semibold border-b pb-1">Financial</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Fee Budget:</strong> {selectedLead.fee_budget_lakhs ? `₹${selectedLead.fee_budget_lakhs}L` : "N/A"}</div>
                <div><strong>Expected Salary:</strong> {selectedLead.expected_salary_lakhs ? `₹${selectedLead.expected_salary_lakhs}L` : "N/A"}</div>
              </div>

              <h4 className="font-semibold border-b pb-1">Aspirations</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Specialization:</strong> {selectedLead.preferred_specialization || "N/A"}</div>
              </div>
              {selectedLead.target_exams && selectedLead.target_exams.length > 0 && (
                <div>
                  <strong>All Target Exams:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLead.target_exams.map((e) => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
                  </div>
                </div>
              )}
              {selectedLead.target_colleges?.length > 0 && (
                <div>
                  <strong>Target Colleges:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLead.target_colleges.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                  </div>
                </div>
              )}
              {selectedLead.target_states && selectedLead.target_states.length > 0 && (
                <div>
                  <strong>Target States:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLead.target_states.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
              )}
              {selectedLead.has_certifications && selectedLead.has_certifications.length > 0 && (
                <div>
                  <strong>Certifications:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLead.has_certifications.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                  </div>
                </div>
              )}
              {selectedLead.extracurriculars && selectedLead.extracurriculars.length > 0 && (
                <div>
                  <strong>Extracurriculars:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLead.extracurriculars.map((e) => <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>)}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2">
                Submitted: {format(new Date(selectedLead.created_at), "dd MMM yyyy, hh:mm a")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProfileAnalyzer;
