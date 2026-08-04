import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Download, Activity } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { COLORS, exportCsv, scoreBadge } from "./shared";

type HealthRow = {
  path: string; page_name: string | null; page_type: string | null;
  health_score: number; content_score: number; schema_score: number; intent_score: number;
  entity_coverage: number | null; duplication_score: number; word_count: number;
  clicks: number; impressions: number; ctr: number; avg_position: number | null;
  decay_state: string; schema_valid: boolean | null; duplicate_of: string | null;
  issues: string[] | null; last_checked_at: string | null;
};

const OverviewPanel = () => {
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("worst");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("seo_page_health")
      .select("path, page_name, page_type, health_score, content_score, schema_score, intent_score, entity_coverage, duplication_score, word_count, clicks, impressions, ctr, avg_position, decay_state, schema_valid, duplicate_of, issues, last_checked_at")
      .order("health_score", { ascending: true })
      .limit(1000);
    setRows((data ?? []) as HealthRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows
    .filter((r) => (type === "all" ? true : r.page_type === type))
    .filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return r.path.toLowerCase().includes(q) || (r.page_name ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) =>
      sort === "worst" ? a.health_score - b.health_score
      : sort === "best" ? b.health_score - a.health_score
      : sort === "traffic" ? b.clicks - a.clicks
      : b.impressions - a.impressions);

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.health_score), 0) / rows.length) : 0;
  const critical = rows.filter((r) => r.health_score < 40).length;
  const dupes = rows.filter((r) => r.duplication_score >= 70).length;
  const noSchema = rows.filter((r) => r.schema_valid === false).length;
  const decaying = rows.filter((r) => ["decaying", "dying"].includes(r.decay_state)).length;

  const buckets = [
    { name: "0-39 Critical", value: rows.filter((r) => r.health_score < 40).length },
    { name: "40-59 Weak", value: rows.filter((r) => r.health_score >= 40 && r.health_score < 60).length },
    { name: "60-79 Good", value: rows.filter((r) => r.health_score >= 60 && r.health_score < 80).length },
    { name: "80-100 Strong", value: rows.filter((r) => r.health_score >= 80).length },
  ];

  const byType = Object.entries(
    rows.reduce<Record<string, { total: number; n: number }>>((acc, r) => {
      const k = r.page_type ?? "other";
      acc[k] = acc[k] ?? { total: 0, n: 0 };
      acc[k].total += Number(r.health_score);
      acc[k].n += 1;
      return acc;
    }, {}),
  ).map(([name, v]) => ({ name, score: Math.round(v.total / v.n), pages: v.n }));

  const types = Array.from(new Set(rows.map((r) => r.page_type).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Pages scored", value: rows.length },
          { label: "Avg health", value: avg },
          { label: "Critical (<40)", value: critical },
          { label: "Near-duplicates", value: dupes },
          { label: "Decaying pages", value: decaying },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Health distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={buckets} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                  {buckets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Average health by page type</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Bar dataKey="score" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Page health ({filtered.length})
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search path or name" value={search} onChange={(e) => setSearch(e.target.value)} className="w-52" />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="worst">Worst health first</SelectItem>
                <SelectItem value="best">Best health first</SelectItem>
                <SelectItem value="traffic">Most clicks</SelectItem>
                <SelectItem value="impressions">Most impressions</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportCsv("seo-page-health", filtered)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Entities</TableHead>
                <TableHead>Dup</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Impr.</TableHead>
                <TableHead>Pos</TableHead>
                <TableHead>Decay</TableHead>
                <TableHead>Top issue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 300).map((r) => (
                <TableRow key={r.path}>
                  <TableCell className="max-w-[240px]">
                    <p className="font-medium truncate">{r.page_name ?? r.path}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.path}</p>
                  </TableCell>
                  <TableCell>{scoreBadge(r.health_score)}</TableCell>
                  <TableCell>{Math.round(r.content_score)}</TableCell>
                  <TableCell>{r.schema_valid === false ? <Badge variant="destructive">invalid</Badge> : Math.round(r.schema_score)}</TableCell>
                  <TableCell>{Math.round(r.intent_score)}</TableCell>
                  <TableCell>{Math.round(Number(r.entity_coverage ?? 0))}</TableCell>
                  <TableCell>{Math.round(r.duplication_score)}%</TableCell>
                  <TableCell>{r.clicks}</TableCell>
                  <TableCell>{r.impressions}</TableCell>
                  <TableCell>{r.avg_position?.toFixed?.(1) ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={["decaying", "dying"].includes(r.decay_state) ? "destructive" : r.decay_state === "growing" ? "default" : "secondary"}>
                      {r.decay_state}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] text-xs text-muted-foreground truncate">
                    {r.issues?.[0] ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && !loading && (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                  No page health data yet. Run Signal Ingestion, then the Post-Publish Pipeline.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewPanel;
