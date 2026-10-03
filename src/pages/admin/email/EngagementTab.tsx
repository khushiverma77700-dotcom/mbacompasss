import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Download, Minus, Search } from "lucide-react";

export interface EngagementRow {
  id: string; campaign: string; name: string | null; email: string; test: boolean;
  sent: boolean; sent_at: string | null; delivery: string; opened: boolean; open_count: number;
  read: boolean; clicked: boolean; click_count: number; devices: number; possible_forward: boolean;
  last_activity: string | null;
}

const FILTERS: [string, string][] = [
  ["all", "All recipients"], ["opened", "Opened"], ["not_opened", "Sent, not opened"], ["read", "Read"],
  ["clicked", "Clicked"], ["not_clicked", "Opened, not clicked"], ["forward", "Possible forward"],
  ["failed", "Failed / bounced"], ["waiting", "Not sent yet"],
];
const PAGE = 50;
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");
const Yes = ({ on, n }: { on: boolean; n?: number }) => on
  ? <span className="inline-flex items-center gap-1 text-primary"><Check className="h-4 w-4" />{n && n > 1 ? `×${n}` : ""}</span>
  : <Minus className="h-4 w-4 text-muted-foreground/50" />;
const deliveryBadge = (d: string) => d === "delivered" ? "bg-primary/10 text-primary" : d === "failed" || d === "bounced" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";

export default function EngagementTab({ rows, onExport }: { rows: EngagementRow[]; onExport: (rows: EngagementRow[]) => void }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (s && !`${r.name ?? ""} ${r.email} ${r.campaign}`.toLowerCase().includes(s)) return false;
      switch (f) {
        case "opened": return r.opened;
        case "not_opened": return r.sent && !r.opened;
        case "read": return r.read;
        case "clicked": return r.clicked;
        case "not_clicked": return r.opened && !r.clicked;
        case "forward": return r.possible_forward;
        case "failed": return r.delivery === "failed" || r.delivery === "bounced";
        case "waiting": return !r.sent;
        default: return true;
      }
    });
  }, [rows, q, f]);

  const s = useMemo(() => ({
    total: rows.length, sent: rows.filter((r) => r.sent).length, delivered: rows.filter((r) => r.delivery === "delivered").length,
    opened: rows.filter((r) => r.opened).length, read: rows.filter((r) => r.read).length, clicked: rows.filter((r) => r.clicked).length,
    opens: rows.reduce((a, r) => a + r.open_count, 0), forwards: rows.filter((r) => r.possible_forward).length,
  }), [rows]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const view = filtered.slice(cur * PAGE, cur * PAGE + PAGE);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {([["Recipients", s.total], ["Sent", s.sent], ["Delivered", s.delivered], ["Opened", s.opened], ["Read", s.read], ["Clicked", s.clicked], ["Total opens", s.opens], ["Possible forwards", s.forwards]] as [string, number][]).map(([l, v]) => (
          <Card key={l} className="p-3"><div className="text-sm text-muted-foreground">{l}</div><div className="text-xl font-semibold">{v}</div></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email or campaign" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <Select value={f} onValueChange={(v) => { setF(v); setPage(0); }}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{FILTERS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} of {rows.length}</span>
        <Button variant="outline" className="ml-auto" onClick={() => onExport(filtered)}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Campaign</TableHead>
              <TableHead>Sent</TableHead><TableHead>Delivered</TableHead><TableHead>Opened</TableHead>
              <TableHead>Read</TableHead><TableHead>Clicked</TableHead><TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No recipients match.</TableCell></TableRow>}
            {view.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name || "—"}{r.test && <Badge variant="secondary" className="ml-2">Test</Badge>}</TableCell>
                <TableCell>{r.email}{r.possible_forward && <Badge variant="outline" className="ml-2" title={`Opened on ${r.devices} different devices or apps`}>Possible forward</Badge>}</TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">{r.campaign}</TableCell>
                <TableCell title={fmt(r.sent_at)}><Yes on={r.sent} /></TableCell>
                <TableCell><span className={`rounded px-2 py-0.5 text-sm ${deliveryBadge(r.delivery)}`}>{r.delivery}</span></TableCell>
                <TableCell><Yes on={r.opened} n={r.open_count} /></TableCell>
                <TableCell><Yes on={r.read} /></TableCell>
                <TableCell><Yes on={r.clicked} n={r.click_count} /></TableCell>
                <TableCell className="whitespace-nowrap text-sm">{fmt(r.last_activity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</Button>
          <span className="text-sm">Page {cur + 1} of {pages}</span>
          <Button variant="outline" size="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Opened counts every time the tracking image loads. Read means opened more than once or a link was clicked, which filters out automatic image pre-loading. Possible forward means the email was opened on 3 or more different devices or apps; email cannot report forwards directly, so treat it as an estimate.
      </p>
    </div>
  );
}
