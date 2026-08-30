import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  /** Rows exactly as shown in the list (already filtered/sorted). */
  rows: any[];
  /** File name without extension. */
  fileName: string;
  /** Sheet tab name (max 31 chars, Excel limit). */
  sheetName?: string;
  /**
   * Optional column whitelist in output order: [key, header].
   * When omitted every key present in the rows is exported.
   */
  columns?: [string, string][];
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
};

const stringify = (v: any): string | number | boolean => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  if (v instanceof Date) return v.toISOString();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

/**
 * Downloads the current admin list as a real .xlsx file.
 * The `xlsx` library is imported dynamically so it never lands in the
 * initial admin bundle.
 */
const ExportExcelButton = ({
  rows,
  fileName,
  sheetName = "Data",
  columns,
  label = "Download Excel",
  className,
  variant = "outline",
}: Props) => {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!rows || rows.length === 0) {
      toast.error("Nothing to export — the list is empty.");
      return;
    }
    setBusy(true);
    try {
      const XLSX = await import("xlsx");

      const cols: [string, string][] =
        columns && columns.length > 0
          ? columns
          : Array.from(
              rows.reduce((set: Set<string>, r: any) => {
                Object.keys(r || {}).forEach((k) => set.add(k));
                return set;
              }, new Set<string>())
            ).map((k) => [k, k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())] as [string, string]);

      const aoa: any[][] = [
        ["S.No", ...cols.map(([, header]) => header)],
        ...rows.map((r, i) => [i + 1, ...cols.map(([key]) => stringify(r?.[key]))]),
      ];

      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      sheet["!cols"] = aoa[0].map((_, colIdx) => {
        const width = aoa.reduce((max, row) => Math.max(max, String(row[colIdx] ?? "").length), 8);
        return { wch: Math.min(width + 2, 60) };
      });
      sheet["!freeze"] = { xSplit: 0, ySplit: 1 };

      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(book, `${fileName}-${stamp}.xlsx`);
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to Excel`);
    } catch (err: any) {
      toast.error(err?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} onClick={handleExport} disabled={busy} className={className} title="Download the list currently shown as an Excel file">
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      {label} {rows?.length ? `(${rows.length})` : ""}
    </Button>
  );
};

export default ExportExcelButton;
