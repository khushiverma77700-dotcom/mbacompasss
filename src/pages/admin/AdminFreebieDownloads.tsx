import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Loader2, Search, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  freebie_id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  user_agent: string | null;
  referrer: string | null;
  freebie?: { title: string; category: string | null } | null;
};

const AdminFreebieDownloads = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("freebie_downloads")
      .select("*, freebie:freebies(title, category)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      (r.name || "").toLowerCase().includes(s) ||
      (r.email || "").toLowerCase().includes(s) ||
      (r.phone || "").toLowerCase().includes(s) ||
      (r.freebie?.title || "").toLowerCase().includes(s) ||
      (r.freebie?.category || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const exportCsv = () => {
    const header = ["Date", "Freebie", "Category", "Name", "Email", "Phone", "User ID"];
    const body = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      r.freebie?.title || "",
      r.freebie?.category || "",
      r.name || "",
      r.email || "",
      r.phone || "",
      r.user_id || "",
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freebie-downloads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button></Link>
        <h1 className="text-2xl font-bold">Freebie Download Logs</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>All downloads ({filtered.length})</CardTitle>
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, freebie…" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No downloads yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Freebie</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{r.freebie?.title || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{r.freebie?.category || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{r.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs">{r.email || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs">{r.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {r.user_id ? <Badge variant="secondary" className="text-[10px]">Logged-in</Badge> : <Badge variant="outline" className="text-[10px]">Guest</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFreebieDownloads;
