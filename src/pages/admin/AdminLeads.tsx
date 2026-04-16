import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Users, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";

interface Lead {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  city: string | null;
  target_exam: string | null;
  target_exams: string[] | null;
  work_experience: string | null;
  signup_page_name: string | null;
  signup_page_url: string | null;
  created_at: string;
  email?: string;
}

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setLeads(data as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = useMemo(() => {
    let result = leads;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.display_name?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.signup_page_name?.toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      result = result.filter((l) => l.created_at >= dateFrom);
    }
    if (dateTo) {
      const toEnd = dateTo + "T23:59:59";
      result = result.filter((l) => l.created_at <= toEnd);
    }

    if (activeTab === "with-exams") {
      result = result.filter((l) => (l.target_exams && l.target_exams.length > 0));
    } else if (activeTab === "incomplete") {
      result = result.filter((l) => !l.target_exams || l.target_exams.length === 0);
    }

    return result;
  const { sortedItems: sortedFiltered, sortConfig, handleSort: onSort } = useTableSort(filtered);

  const downloadCSV = () => {
    const headers = ["Name", "Phone", "City", "Target Exams", "Work Experience", "Signup Page", "Signup URL", "Registered At"];
    const rows = filtered.map((l) => [
      l.display_name || "",
      l.phone || "",
      l.city || "",
      (l.target_exams || []).join("; "),
      l.work_experience || "",
      l.signup_page_name || "",
      l.signup_page_url || "",
      l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd HH:mm") : "",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6" /> Student Leads
        </h1>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, city, page..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
              <span className="text-sm text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
              <TabsTrigger value="with-exams">With Exams ({leads.filter((l) => l.target_exams && l.target_exams.length > 0).length})</TabsTrigger>
              <TabsTrigger value="incomplete">Incomplete ({leads.filter((l) => !l.target_exams || l.target_exams.length === 0).length})</TabsTrigger>
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
                  <TableHead>Phone</TableHead>
                  <TableHead>Target Exams</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Signup Page</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <div>{lead.display_name || "—"}</div>
                        {lead.city && <div className="text-xs text-muted-foreground">{lead.city}</div>}
                      </TableCell>
                      <TableCell>{lead.phone || "—"}</TableCell>
                      <TableCell>
                        {lead.target_exams && lead.target_exams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {lead.target_exams.map((e) => (
                              <span key={e} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                                {e}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>{lead.work_experience ? `${lead.work_experience} yr${lead.work_experience !== "1" ? "s" : ""}` : "—"}</TableCell>
                      <TableCell>
                        {lead.signup_page_name ? (
                          <div>
                            <div className="text-xs font-medium">{lead.signup_page_name}</div>
                            {lead.signup_page_url && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{lead.signup_page_url}</div>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(lead.created_at), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeads;
