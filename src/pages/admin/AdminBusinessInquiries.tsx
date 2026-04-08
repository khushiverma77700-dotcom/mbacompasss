import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BusinessInquiry {
  id: string;
  institute_type: string;
  institute_name: string;
  poc_name: string;
  website_url: string | null;
  contact_number: string;
  whatsapp_number: string;
  poc_email: string;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-amber-100 text-amber-700 border-amber-200",
  onboarded: "bg-green-100 text-green-700 border-green-200",
};

const AdminBusinessInquiries = () => {
  const [data, setData] = useState<BusinessInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("business_inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load inquiries");
    setData((rows as BusinessInquiry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("business_inquiries").update({ status }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Status updated to ${status}`);
    setData(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const filtered = data.filter(r => {
    if (typeFilter !== "all" && r.institute_type !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.institute_name.toLowerCase().includes(q) || r.poc_name.toLowerCase().includes(q) || r.poc_email.toLowerCase().includes(q);
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ["Institute Name", "Type", "POC Name", "Contact", "WhatsApp", "Email", "Website", "Status", "Date"];
    const rows = filtered.map(r => [
      r.institute_name, r.institute_type, r.poc_name, r.contact_number,
      r.whatsapp_number, r.poc_email, r.website_url || "", r.status,
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business_inquiries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Business Inquiries</h1>
          <p className="text-sm text-muted-foreground">Manage college & coaching onboarding requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Coaching Institute">Coaching Institute</SelectItem>
            <SelectItem value="College">College</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="onboarded">Onboarded</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-[220px]" />
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Institute Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>POC Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No inquiries found</TableCell></TableRow>
            ) : (
              filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.institute_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{r.institute_type}</Badge>
                  </TableCell>
                  <TableCell>{r.poc_name}</TableCell>
                  <TableCell className="text-xs">{r.contact_number}</TableCell>
                  <TableCell className="text-xs">{r.whatsapp_number}</TableCell>
                  <TableCell className="text-xs">{r.poc_email}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate">
                    {r.website_url ? <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{r.website_url}</a> : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className={`h-7 text-xs border ${statusColors[r.status] || ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="onboarded">Onboarded</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminBusinessInquiries;
