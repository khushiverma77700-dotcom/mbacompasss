import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Loader2, Search, RefreshCw, Users } from "lucide-react";

type Row = {
  created_at: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  freebie_id: string;
  freebie?: { title: string } | null;
};

type Aggregated = {
  key: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  user_id: string | null;
  first_seen: string;
  last_seen: string;
  downloads: number;
  freebies: Set<string>;
};

const AdminFreebieUsers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("freebie_downloads")
      .select("created_at, user_id, name, email, phone, freebie_id, freebie:freebies(title)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const users = useMemo<Aggregated[]>(() => {
    const map = new Map<string, Aggregated>();
    for (const r of rows) {
      const key = (r.user_id || (r.email || "").toLowerCase() || (r.phone || "") || "guest").trim();
      if (!key || key === "guest") continue;
      const existing = map.get(key);
      if (existing) {
        existing.downloads += 1;
        if (r.freebie?.title) existing.freebies.add(r.freebie.title);
        if (r.created_at < existing.first_seen) existing.first_seen = r.created_at;
        if (r.created_at > existing.last_seen) existing.last_seen = r.created_at;
        if (!existing.name && r.name) existing.name = r.name;
        if (!existing.phone && r.phone) existing.phone = r.phone;
        if (!existing.email && r.email) existing.email = r.email;
      } else {
        map.set(key, {
          key,
          email: r.email,
          name: r.name,
          phone: r.phone,
          user_id: r.user_id,
          first_seen: r.created_at,
          last_seen: r.created_at,
          downloads: 1,
          freebies: new Set(r.freebie?.title ? [r.freebie.title] : []),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.downloads - a.downloads);
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      (u.name || "").toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s) ||
      (u.phone || "").toLowerCase().includes(s)
    );
  }, [users, q]);

  const guests = rows.filter((r) => !r.user_id && !r.email && !r.phone).length;

  const exportCsv = () => {
    const header = ["Name", "Email", "Phone", "Downloads", "Unique Freebies", "First seen", "Last seen"];
    const body = filtered.map((u) => [
      u.name || "",
      u.email || "",
      u.phone || "",
      u.downloads,
      u.freebies.size,
      new Date(u.first_seen).toISOString(),
      new Date(u.last_seen).toISOString(),
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freebie-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button></Link>
        <h1 className="text-2xl font-bold">Unique Freebie Users</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Unique users</div><div className="text-2xl font-bold">{users.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total downloads</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Logged-in users</div><div className="text-2xl font-bold">{users.filter(u => u.user_id).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Anonymous guests</div><div className="text-2xl font-bold">{guests}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Users ({filtered.length})</CardTitle>
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / email / phone…" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No user records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Unique freebies</TableHead>
                    <TableHead>First seen</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.key}>
                      <TableCell>{u.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs">{u.email || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs">{u.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell><Badge>{u.downloads}</Badge></TableCell>
                      <TableCell>{u.freebies.size}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(u.first_seen).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(u.last_seen).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {u.user_id ? <Badge variant="secondary" className="text-xs">Logged-in</Badge> : <Badge variant="outline" className="text-xs">Lead</Badge>}
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

export default AdminFreebieUsers;
