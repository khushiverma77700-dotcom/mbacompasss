import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpDown, Download, Loader2, Upload } from "lucide-react";

type Props = {
  /** Table to read/write (must have slug, name and the sort column). */
  table: "colleges" | "exams" | "institutes";
  /** Plural label, e.g. "colleges". */
  entityLabel: string;
  /** Column that stores the manual order. */
  sortColumn?: string;
  /** File name prefix for the downloaded CSV. */
  filePrefix?: string;
  /** Called after a successful upload so the list can refresh. */
  onApplied?: () => void;
};

const csvEscape = (v: any) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const parseLine = (l: string) => {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '"') {
      if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
};

export default function BulkSortOrderDialog({
  table,
  entityLabel,
  sortColumn = "listing_sort_order",
  filePrefix,
  onApplied,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });

  const parsed = (): { slug: string; order: number | null }[] => {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return [];
    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    const slugIdx = headers.indexOf("slug");
    let orderIdx = headers.indexOf(sortColumn);
    if (orderIdx === -1) orderIdx = headers.findIndex((h) => h.includes("sort"));
    if (slugIdx === -1 || orderIdx === -1) return [];
    return lines.slice(1).map((l) => {
      const cells = parseLine(l);
      const slug = (cells[slugIdx] || "").trim();
      if (!slug) return null;
      const raw = (cells[orderIdx] || "").trim();
      const num = raw === "" ? null : parseInt(raw, 10);
      return { slug, order: num != null && Number.isFinite(num) ? num : null };
    }).filter(Boolean) as { slug: string; order: number | null }[];
  };

  const download = async () => {
    setDownloading(true);
    try {
      const all: any[] = [];
      const PAGE = 1000;
      for (let page = 0; ; page++) {
        const { data, error } = await (supabase.from(table as any) as any)
          .select(`slug, name, ${sortColumn}`)
          .order(sortColumn, { ascending: true, nullsFirst: false })
          .order("name", { ascending: true })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }
      const rows = all
        .filter((r) => r.slug && r.name)
        .map((r) => [r.slug, r.name, r[sortColumn] ?? ""].map(csvEscape).join(","));
      const content = [["slug", "name", sortColumn].join(","), ...rows].join("\n");
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filePrefix || table}-sort-order-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV downloaded", description: `${rows.length} ${entityLabel} exported with their current sort order.` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const apply = async () => {
    const rows = parsed();
    if (!rows.length) {
      toast({
        title: "No valid rows",
        description: `CSV needs a "slug" column and a "${sortColumn}" column.`,
        variant: "destructive",
      });
      return;
    }
    setRunning(true);
    setProgress({ done: 0, total: rows.length, failed: 0 });
    let done = 0, failed = 0;
    const CONCURRENCY = 6;
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (r) => {
        const { error } = await (supabase.from(table as any) as any)
          .update({ [sortColumn]: r.order })
          .eq("slug", r.slug);
        if (error) failed++;
        done++;
        setProgress({ done, total: rows.length, failed });
      }));
    }
    setRunning(false);
    toast({
      title: "Sort order updated",
      description: `${done - failed}/${rows.length} ${entityLabel} updated${failed ? ` • ${failed} failed (check slugs)` : ""}.`,
    });
    setOpen(false);
    setCsv("");
    onApplied?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!running) { setOpen(o); if (!o) setCsv(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="w-4 h-4 mr-1" /> Bulk Sort Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Sort Order via CSV</DialogTitle>
          <DialogDescription>
            Download the full list of {entityLabel} with their current sort order, edit the{" "}
            <b>{sortColumn}</b> column (1, 2, 3… — lower shows first), then upload the same file back here.
            Rows are matched by <code>slug</code>; blank values reset the order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={download} disabled={downloading || running}>
              {downloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              Download full list (CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`bulk-sort-file-${table}`)?.click()}
              disabled={running}
            >
              <Upload className="w-4 h-4 mr-1" /> Choose CSV file
            </Button>
            <input
              id={`bulk-sort-file-${table}`}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setCsv(await f.text());
                e.target.value = "";
              }}
            />
          </div>

          <Textarea
            rows={10}
            placeholder={`Or paste CSV contents here…\nslug,name,${sortColumn}\nexample-slug,Example Name,1`}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            disabled={running}
            className="font-mono text-xs"
          />

          {running && (
            <div className="text-sm text-muted-foreground">
              Updating… {progress.done}/{progress.total}
              {progress.failed ? ` • ${progress.failed} failed` : ""}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>Cancel</Button>
          <Button onClick={apply} disabled={running || !csv.trim()}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Apply to {parsed().length || 0} {entityLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
