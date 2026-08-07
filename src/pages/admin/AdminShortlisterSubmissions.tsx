import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Eye, Download } from "lucide-react";

interface Submission {
  id: string;
  user_id: string | null;
  status: string;
  form_data: Record<string, any> | null;
  payload: Record<string, any> | null;
  results_count: number | null;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  login_incomplete: "Login Incomplete",
  completed: "Completed",
};

const prettyKey = (k: string) =>
  k.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^./, c => c.toUpperCase());

const prettyValue = (v: any): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(", ") || "—";
  return String(v);
};

const AdminShortlisterSubmissions = () => {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [active, setActive] = useState<Submission | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shortlister_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast({ title: "Failed to load submissions", description: error.message, variant: "destructive" });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.email, r.full_name, r.form_data?.targetYear, r.form_data?.mbaGoal]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    incomplete: rows.filter(r => r.status === "login_incomplete").length,
    completed: rows.filter(r => r.status === "completed").length,
  }), [rows]);

  const exportCsv = () => {
    const keys = Array.from(new Set(filtered.flatMap(r => Object.keys(r.form_data || {}))));
    const header = ["created_at", "status", "name", "email", "results", ...keys];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const vals = [
        new Date(r.created_at).toISOString(),
        r.status,
        r.full_name || "",
        r.email || "",
        r.results_count ?? "",
        ...keys.map(k => prettyValue(r.form_data?.[k])),
      ];
      lines.push(vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shortlister-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">College Shortlister Submissions</h1>
          <p className="text-sm text-muted-foreground">Every form submitted — including ones where the student never finished logging in.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Submissions", value: stats.total },
          { label: "Login Incomplete", value: stats.incomplete },
          { label: "Completed", value: stats.completed },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">{s.label}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Submissions ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search name or email" value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="login_incomplete">Login Incomplete</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Exams</TableHead>
                <TableHead>Target Year</TableHead>
                <TableHead>Colleges</TableHead>
                <TableHead className="text-right">Answers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{r.full_name || "Guest"}</div>
                    <div className="text-muted-foreground text-xs">{r.email || "no email captured"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                      {STATUS_LABEL[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{prettyValue(r.form_data?.exams)}</TableCell>
                  <TableCell className="text-sm">{prettyValue(r.form_data?.targetYear)}</TableCell>
                  <TableCell className="text-sm">{r.results_count ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setActive(r)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && !loading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No submissions yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={o => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {active?.full_name || "Guest"} — {STATUS_LABEL[active?.status || ""] || active?.status}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(active?.form_data || {}).map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{prettyKey(k)}</div>
                <div className="text-sm font-medium break-words">{prettyValue(v)}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminShortlisterSubmissions;
