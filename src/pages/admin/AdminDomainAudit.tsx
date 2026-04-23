import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle2, Loader2, Search, Globe, FileText, Database, Code2 } from "lucide-react";

const NEW_DOMAIN = "https://mbacompass.in";
const OLD_DOMAINS = ["bschoolbuzz.com", "bschoolbus.com", "bestmbacoaching.com"];

type Source = "sitemap" | "robots" | "indexing_urls" | "db" | "code";
type Status = "pending" | "fixed" | "manual";

interface Finding {
  id: string;
  source: Source;
  location: string;        // file path or table.column
  recordId?: string;       // db row id
  match: string;           // the offending URL/string
  preview: string;
  fixable: boolean;
  status: Status;
}

const rewrite = (url: string) => {
  let next = url;
  for (const d of OLD_DOMAINS) {
    next = next.replace(new RegExp(`https?://(www\\.)?${d.replace(/\./g, "\\.")}`, "gi"), NEW_DOMAIN);
    next = next.replace(new RegExp(d.replace(/\./g, "\\."), "gi"), "mbacompass.in");
  }
  return next;
};

const containsLegacy = (s: string) => OLD_DOMAINS.some((d) => s.toLowerCase().includes(d));

const SOURCE_META: Record<Source, { label: string; icon: typeof FileText; color: string }> = {
  sitemap: { label: "Sitemap", icon: Globe, color: "text-blue-600" },
  robots: { label: "Robots.txt", icon: FileText, color: "text-purple-600" },
  indexing_urls: { label: "Indexing Queue", icon: RefreshCw, color: "text-amber-600" },
  db: { label: "Database", icon: Database, color: "text-rose-600" },
  code: { label: "Code", icon: Code2, color: "text-slate-600" },
};

export default function AdminDomainAudit() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const total = findings.length;
    const fixed = findings.filter((f) => f.status === "fixed").length;
    const pending = findings.filter((f) => f.status === "pending").length;
    const manual = findings.filter((f) => f.status === "manual").length;
    return { total, fixed, pending, manual };
  }, [findings]);

  const runScan = async () => {
    setScanning(true);
    const all: Finding[] = [];
    try {
      // 1. sitemap.xml
      try {
        const res = await fetch("/sitemap.xml", { cache: "no-store" });
        if (res.ok) {
          const txt = await res.text();
          const matches = txt.match(/https?:\/\/[^\s<"]+/g) || [];
          matches.filter(containsLegacy).forEach((m, i) =>
            all.push({
              id: `sitemap-${i}-${m}`,
              source: "sitemap",
              location: "/sitemap.xml",
              match: m,
              preview: m,
              fixable: false,
              status: "manual",
            }),
          );
        }
      } catch { /* ignore */ }

      // 2. robots.txt
      try {
        const res = await fetch("/robots.txt", { cache: "no-store" });
        if (res.ok) {
          const txt = await res.text();
          txt.split("\n").forEach((line, i) => {
            if (containsLegacy(line)) {
              all.push({
                id: `robots-${i}`,
                source: "robots",
                location: "/robots.txt",
                match: line.trim(),
                preview: line.trim(),
                fixable: false,
                status: "manual",
              });
            }
          });
        }
      } catch { /* ignore */ }

      // 3. indexing_urls table
      const { data: idx } = await supabase
        .from("indexing_urls")
        .select("id, url, page_type")
        .or(OLD_DOMAINS.map((d) => `url.ilike.%${d}%`).join(","))
        .limit(500);
      (idx || []).forEach((r: any) =>
        all.push({
          id: `idx-${r.id}`,
          source: "indexing_urls",
          location: `indexing_urls.url (${r.page_type})`,
          recordId: r.id,
          match: r.url,
          preview: `${r.url} → ${rewrite(r.url)}`,
          fixable: true,
          status: "pending",
        }),
      );

      // 4. DB text fields across content tables
      const targets: { table: string; columns: string[] }[] = [
        { table: "articles", columns: ["title", "content", "meta_title", "meta_description", "excerpt"] },
        { table: "colleges", columns: ["name", "description", "meta_title", "meta_description"] },
        { table: "institutes", columns: ["name", "description", "meta_title", "meta_description"] },
        { table: "exams", columns: ["name", "description", "meta_title", "meta_description"] },
        { table: "city_pages", columns: ["name", "intro_content", "detailed_content", "meta_title", "meta_description"] },
        { table: "banners", columns: ["title", "subtitle", "link_url"] },
      ];

      for (const t of targets) {
        const orFilter = t.columns
          .flatMap((c) => OLD_DOMAINS.map((d) => `${c}.ilike.%${d}%`))
          .join(",");
        const { data, error } = await (supabase as any)
          .from(t.table)
          .select(["id", ...t.columns].join(","))
          .or(orFilter)
          .limit(200);
        if (error) continue;
        for (const row of (data as any[]) || []) {
          for (const col of t.columns) {
            const val: string = row?.[col] ?? "";
            if (val && containsLegacy(val)) {
              all.push({
                id: `db-${t.table}-${row.id}-${col}`,
                source: "db",
                location: `${t.table}.${col}`,
                recordId: row.id,
                match: OLD_DOMAINS.find((d) => val.toLowerCase().includes(d)) || "",
                preview: val.slice(0, 160),
                fixable: true,
                status: "pending",
              });
            }
          }
        }
      }

      setFindings(all);
      if (all.length === 0) toast.success("No legacy domain references found anywhere.");
      else toast.warning(`Found ${all.length} legacy reference(s).`);
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fixOne = async (f: Finding) => {
    setBusyId(f.id);
    try {
      if (f.source === "indexing_urls" && f.recordId) {
        const newUrl = rewrite(f.match);
        await supabase
          .from("indexing_urls")
          .upsert(
            [{ url: newUrl, page_type: "other", status: "pending", retry_count: 0, next_retry_at: new Date().toISOString() }],
            { onConflict: "url", ignoreDuplicates: true },
          );
        await supabase.from("indexing_urls").delete().eq("id", f.recordId);
      } else if (f.source === "db" && f.recordId) {
        const [table, column] = f.location.split(".");
        // Re-read full value, rewrite, then update
        const { data } = await (supabase as any).from(table).select(`id, ${column}`).eq("id", f.recordId).maybeSingle();
        if (data?.[column]) {
          const updated = rewrite(data[column]);
          const { error } = await (supabase as any).from(table).update({ [column]: updated }).eq("id", f.recordId);
          if (error) throw error;
        }
      } else {
        toast.info("This source must be fixed manually in code/files.");
        return;
      }
      setFindings((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: "fixed" } : x)));
      toast.success("Fixed.");
    } catch (e: any) {
      toast.error(e?.message || "Fix failed");
    } finally {
      setBusyId(null);
    }
  };

  const fixAll = async () => {
    const fixable = findings.filter((f) => f.fixable && f.status === "pending");
    if (fixable.length === 0) { toast.info("Nothing fixable in queue."); return; }
    if (!confirm(`Apply automatic fix to ${fixable.length} item(s)?`)) return;
    for (const f of fixable) {
      // sequential to keep RLS-friendly
      // eslint-disable-next-line no-await-in-loop
      await fixOne(f);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Old-Domain Audit</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scans the sitemap, robots.txt, indexing queue and content tables for legacy domains
          (<span className="font-mono">{OLD_DOMAINS.join(", ")}</span>) and rewrites them to{" "}
          <span className="font-mono">{NEW_DOMAIN}</span>.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total found</div>
          <div className="text-2xl font-bold text-foreground mt-1">{counts.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Fixed</div>
          <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-5 h-5" /> {counts.fixed}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending (auto)</div>
          <div className="text-2xl font-bold text-amber-600 flex items-center gap-2 mt-1">
            <AlertTriangle className="w-5 h-5" /> {counts.pending}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Manual (file edits)</div>
          <div className="text-2xl font-bold text-slate-600 mt-1">{counts.manual}</div>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <Button onClick={runScan} disabled={scanning} variant="outline">
          {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Re-scan everything
        </Button>
        <Button onClick={fixAll} disabled={scanning || counts.pending === 0}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Fix all auto-fixable ({counts.pending})
        </Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-foreground">Findings ({findings.length})</h2>
        </div>
        {findings.length === 0 ? (
          <div className="p-6 text-sm text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Nothing left — site is fully on {NEW_DOMAIN}.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((f) => {
                const meta = SOURCE_META[f.source];
                const Icon = meta.icon;
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5" /> {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[220px] truncate" title={f.location}>
                      {f.location}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md break-all">
                      {f.preview}
                    </TableCell>
                    <TableCell>
                      {f.status === "fixed" && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">Fixed</Badge>
                      )}
                      {f.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                      {f.status === "manual" && <Badge variant="outline">Manual</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {f.fixable && f.status === "pending" ? (
                        <Button size="sm" variant="outline" onClick={() => fixOne(f)} disabled={busyId === f.id}>
                          {busyId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Fix"}
                        </Button>
                      ) : f.status === "fixed" ? (
                        <span className="text-xs text-emerald-600">✓ Done</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Edit file</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
