import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, Search, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const NEW_DOMAIN = "https://mbacompass.in";
const OLD_DOMAINS = ["bschoolbuzz.com", "bschoolbus.com", "bestmbacoaching.com"];

type IndexingRow = {
  id: string;
  url: string;
  page_type: string;
  status: string;
  retry_count: number;
  last_submitted_at: string | null;
  updated_at: string;
};

type ScanFinding = {
  table: string;
  column: string;
  id: string;
  matches: string[];
  preview: string;
};

const isOldDomain = (url: string) => OLD_DOMAINS.some((d) => url.includes(d));

const rewriteUrl = (url: string) => {
  let next = url;
  for (const d of OLD_DOMAINS) {
    next = next.replace(new RegExp(`https?://(www\\.)?${d.replace(/\./g, "\\.")}`, "gi"), NEW_DOMAIN);
  }
  return next;
};

export default function AdminIndexingRequeue() {
  const [rows, setRows] = useState<IndexingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [findings, setFindings] = useState<ScanFinding[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("indexing_urls")
      .select("id, url, page_type, status, retry_count, last_submitted_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);
    if (error) toast.error(error.message);
    setRows((data || []) as IndexingRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const oldRows = useMemo(() => rows.filter((r) => isOldDomain(r.url)), [rows]);
  const newRows = useMemo(() => rows.filter((r) => !isOldDomain(r.url)), [rows]);

  const requeueAll = async () => {
    if (oldRows.length === 0) {
      toast.info("Nothing to requeue — all URLs already on mbacompass.in");
      return;
    }
    if (!confirm(`Rewrite and requeue ${oldRows.length} old-domain URL(s) for ${NEW_DOMAIN}?`)) return;
    setBusy(true);
    try {
      // Insert rewritten URLs (ignore conflicts), then delete old rows
      const inserts = oldRows.map((r) => ({
        url: rewriteUrl(r.url),
        page_type: r.page_type,
        status: "pending" as const,
        retry_count: 0,
        next_retry_at: new Date().toISOString(),
      }));

      const { error: insErr } = await supabase
        .from("indexing_urls")
        .upsert(inserts, { onConflict: "url", ignoreDuplicates: true });
      if (insErr) throw insErr;

      const { error: delErr } = await supabase
        .from("indexing_urls")
        .delete()
        .in("id", oldRows.map((r) => r.id));
      if (delErr) throw delErr;

      toast.success(`Requeued ${oldRows.length} URL(s) on the new domain.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Requeue failed");
    } finally {
      setBusy(false);
    }
  };

  const requeueOne = async (row: IndexingRow) => {
    setBusy(true);
    try {
      const { error: insErr } = await supabase
        .from("indexing_urls")
        .upsert(
          [
            {
              url: rewriteUrl(row.url),
              page_type: row.page_type,
              status: "pending",
              retry_count: 0,
              next_retry_at: new Date().toISOString(),
            },
          ],
          { onConflict: "url", ignoreDuplicates: true },
        );
      if (insErr) throw insErr;
      await supabase.from("indexing_urls").delete().eq("id", row.id);
      toast.success("Requeued.");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  /** Scan key text fields in the database for legacy brand strings. */
  const scanDatabase = async () => {
    setScanning(true);
    setFindings(null);
    try {
      const targets: { table: string; columns: string[]; id: string }[] = [
        { table: "articles", columns: ["title", "content", "meta_title", "meta_description", "excerpt"], id: "id" },
        { table: "colleges", columns: ["name", "description", "meta_title", "meta_description"], id: "id" },
        { table: "institutes", columns: ["name", "description", "meta_title", "meta_description"], id: "id" },
        { table: "exams", columns: ["name", "description", "meta_title", "meta_description"], id: "id" },
        { table: "city_pages", columns: ["name", "intro_content", "detailed_content", "meta_title", "meta_description"], id: "id" },
        { table: "categories", columns: ["name", "description"], id: "id" },
      ];

      const needles = ["MBA Hub", "MBAHub", "bschoolbus.com", "bschoolbuzz.com"];
      const found: ScanFinding[] = [];

      for (const t of targets) {
        const orFilter = t.columns
          .flatMap((c) => needles.map((n) => `${c}.ilike.%${n}%`))
          .join(",");
        const { data, error } = await (supabase as any)
          .from(t.table)
          .select([t.id, ...t.columns].join(","))
          .or(orFilter)
          .limit(200);
        if (error) {
          // Skip tables/cols that don't exist in this env
          continue;
        }
        for (const row of (data as any[]) || []) {
          for (const col of t.columns) {
            const val: string = row?.[col] ?? "";
            const matches = needles.filter((n) => val.toLowerCase().includes(n.toLowerCase()));
            if (matches.length > 0) {
              found.push({
                table: t.table,
                column: col,
                id: row[t.id],
                matches,
                preview: val.slice(0, 140),
              });
            }
          }
        }
      }

      setFindings(found);
      if (found.length === 0) toast.success("Database is clean — no legacy brand strings found.");
      else toast.warning(`Found ${found.length} field(s) still containing legacy strings.`);
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Indexing Requeue & Brand Audit</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Audit the Google indexing queue for legacy domains and re-sync everything to{" "}
          <span className="font-mono">{NEW_DOMAIN}</span>.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">On new domain</div>
          <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-5 h-5" />
            {newRows.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Still on old domain</div>
          <div className="text-2xl font-bold text-amber-600 flex items-center gap-2 mt-1">
            <AlertTriangle className="w-5 h-5" />
            {oldRows.length}
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Total queued</div>
            <div className="text-2xl font-bold text-foreground mt-1">{rows.length}</div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
        </Card>
      </div>

      {/* Actions */}
      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <Button onClick={requeueAll} disabled={busy || oldRows.length === 0}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Requeue {oldRows.length} for mbacompass.in
        </Button>
        <Button variant="outline" onClick={scanDatabase} disabled={scanning}>
          {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Scan DB for legacy brand strings
        </Button>
      </Card>

      {/* Old-domain table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-foreground">Old-domain URLs ({oldRows.length})</h2>
        </div>
        {oldRows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">All clear — no legacy URLs left in the queue.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oldRows.slice(0, 100).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs break-all max-w-md">
                    <div className="text-amber-600">{r.url}</div>
                    <div className="text-muted-foreground mt-0.5">→ {rewriteUrl(r.url)}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.page_type}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => requeueOne(r)} disabled={busy}>
                      Requeue
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Scan findings */}
      {findings !== null && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-foreground">DB scan results ({findings.length})</h2>
          </div>
          {findings.length === 0 ? (
            <div className="p-6 text-sm text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> No legacy brand strings found in scanned tables.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Column</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((f, i) => (
                  <TableRow key={`${f.table}-${f.id}-${f.column}-${i}`}>
                    <TableCell className="font-mono text-xs">{f.table}</TableCell>
                    <TableCell className="font-mono text-xs">{f.column}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.matches.map((m) => (
                          <Badge key={m} variant="destructive" className="text-xs">{m}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">{f.preview}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
