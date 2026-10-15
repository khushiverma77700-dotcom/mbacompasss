import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slugify";
import { Upload, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import type { TrackerRow } from "@/lib/applicationTracker";

/**
 * CSV bulk import: upload → column mapping → validation → preview → import.
 * Kept dependency-free (small hand-rolled CSV parser handling quoted fields).
 */

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: TrackerRow[];
  onImported: () => void;
};

const TARGET_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "name", label: "College / Exam name", required: true },
  { key: "short_name", label: "Short name" },
  { key: "category", label: "Category (exam/iim/tier1/tier2)" },
  { key: "tier", label: "Tier" },
  { key: "program", label: "Programme" },
  { key: "location", label: "Location" },
  { key: "application_open_date", label: "Application open date" },
  { key: "application_deadline", label: "Application deadline", required: true },
  { key: "application_fee", label: "Application fee" },
  { key: "program_fee", label: "Programme fee" },
  { key: "accepted_exams", label: "Accepted exams" },
  { key: "apply_url", label: "Apply URL" },
  { key: "college_website", label: "Official website" },
  { key: "inside_info_url", label: "Inside info document URL" },
  { key: "inside_info_notes", label: "Inside info notes" },
  { key: "short_description", label: "Short description" },
  { key: "eligibility", label: "Eligibility" },
  { key: "selection_process", label: "Selection process" },
  { key: "cutoff_note", label: "Cutoff note" },
  { key: "average_package", label: "Average package" },
  { key: "median_package", label: "Median package" },
  { key: "highest_package", label: "Highest package" },
  { key: "logo_url", label: "Logo URL" },
  { key: "status", label: "Status (open/closing_soon/closed)" },
  { key: "display_order", label: "Display order" },
  { key: "sort_order", label: "Sort order" },
  { key: "deadline_tbd", label: "Application open, deadline undisclosed (yes/no)" },
  { key: "is_recommended", label: "Recommended (yes/no)" },
  { key: "recommendation_label", label: "Recommendation badge label" },
  { key: "recommendation_note", label: "Recommendation note" },
  { key: "recommendation_priority", label: "Recommendation priority" },
  { key: "seo_title", label: "SEO title" },
  { key: "seo_description", label: "SEO description" },
  { key: "seo_h1", label: "SEO H1" },
  { key: "seo_intro", label: "SEO intro" },
  { key: "seo_keywords", label: "SEO keywords" },
  { key: "seo_image_alt", label: "Image alt text" },
];

const TEMPLATE_SAMPLE: Record<string, string> = {
  name: "Indian Institute of Management Ahmedabad",
  short_name: "IIM Ahmedabad",
  category: "iim",
  tier: "Tier 1",
  program: "PGP (MBA)",
  location: "Ahmedabad, Gujarat",
  application_open_date: "2026-08-01",
  application_deadline: "2026-09-20",
  application_fee: "2500",
  program_fee: "2500000",
  accepted_exams: "CAT; GMAT",
  apply_url: "https://example.ac.in/apply",
  college_website: "https://example.ac.in",
  inside_info_url: "",
  inside_info_notes: "Round-wise interview tips for this campus",
  short_description: "Flagship two-year MBA programme",
  eligibility: "Bachelor's degree with 50% marks",
  selection_process: "CAT score, WAT, personal interview",
  cutoff_note: "General category around 99 percentile",
  average_package: "3400000",
  median_package: "3200000",
  highest_package: "7000000",
  logo_url: "",
  status: "open",
  display_order: "1",
  sort_order: "0",
  deadline_tbd: "no",
  is_recommended: "yes",
  recommendation_label: "Closing soon",
  recommendation_note: "Strong placements and an early deadline",
  recommendation_priority: "1",
  seo_title: "",
  seo_description: "",
  seo_h1: "",
  seo_intro: "",
  seo_keywords: "iim ahmedabad application, iim a admission",
  seo_image_alt: "",
};

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const downloadTemplate = () => {
  const keys = TARGET_FIELDS.map((f) => f.key);
  const csv = [
    keys.join(","),
    keys.map((k) => csvCell(TEMPLATE_SAMPLE[k] ?? "")).join(","),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mba-applications-upload-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
};

const normalizeDate = (raw: string): string | null => {
  const v = raw.trim();
  if (!v) return null;
  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const iso = `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
    return Number.isNaN(new Date(iso).getTime()) ? null : iso;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const numberOrNull = (raw: string): number | null => {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

type PreparedRow = {
  values: Record<string, unknown>;
  errors: string[];
  name: string;
};

export default function BulkImportDialog({ open, onOpenChange, existing, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setHeaders([]);
    setDataRows([]);
    setMapping({});
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      toast({ title: "CSV needs a header row and at least one data row", variant: "destructive" });
      return;
    }
    const head = rows[0]!.map((h) => h.trim());
    setHeaders(head);
    setDataRows(rows.slice(1));
    // auto-map by fuzzy header name
    const auto: Record<string, string> = {};
    for (const field of TARGET_FIELDS) {
      const match = head.find(
        (h) =>
          h.toLowerCase().replace(/[^a-z]/g, "") === field.key.replace(/[^a-z]/g, "") ||
          h.toLowerCase().includes(field.key.split("_")[0]!),
      );
      if (match) auto[field.key] = match;
    }
    setMapping(auto);
  };

  const prepared = useMemo<PreparedRow[]>(() => {
    if (!headers.length) return [];
    const index: Record<string, number> = {};
    headers.forEach((h, i) => { index[h] = i; });
    const seen = new Set(existing.map((e) => e.name.trim().toLowerCase()));

    return dataRows.map((cells) => {
      const get = (field: string): string => {
        const header = mapping[field];
        if (!header) return "";
        const i = index[header];
        return i === undefined ? "" : (cells[i] ?? "").trim();
      };
      const errors: string[] = [];
      const name = get("name");
      if (!name) errors.push("Missing name");
      const deadlineRaw = get("application_deadline");
      const deadline = normalizeDate(deadlineRaw);
      if (!deadlineRaw) errors.push("Missing deadline");
      else if (!deadline) errors.push("Invalid deadline date");
      const openRaw = get("application_open_date");
      const openDate = normalizeDate(openRaw);
      if (openRaw && !openDate) errors.push("Invalid open date");
      const applyUrl = get("apply_url");
      if (applyUrl && !/^https?:\/\//i.test(applyUrl)) errors.push("Invalid apply URL");
      if (name && seen.has(name.toLowerCase())) errors.push("Duplicate college");
      const category = (get("category") || "iim").toLowerCase();
      if (!["exam", "iim", "tier1", "tier2"].includes(category)) errors.push("Invalid category");
      const fee = get("application_fee");
      const progFee = get("program_fee");

      return {
        name,
        errors,
        values: {
          name,
          slug: slugify(name || `row-${Math.random().toString(36).slice(2, 8)}`),
          category,
          tier: get("tier") || null,
          program: get("program") || null,
          location: get("location") || null,
          application_open_date: openDate,
          application_deadline: deadline ? new Date(deadline).toISOString() : null,
          application_fee: fee ? Number(fee.replace(/[^\d.]/g, "")) : null,
          program_fee: progFee ? Number(progFee.replace(/[^\d.]/g, "")) : null,
          accepted_exams: get("accepted_exams")
            ? get("accepted_exams").split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
            : [],
          apply_url: applyUrl || null,
          inside_info_url: get("inside_info_url") || null,
          inside_info_notes: get("inside_info_notes") || null,
          short_description: get("short_description") || null,
          short_name: get("short_name") || null,
          college_website: get("college_website") || null,
          eligibility: get("eligibility") || null,
          selection_process: get("selection_process") || null,
          cutoff_note: get("cutoff_note") || null,
          average_package: numberOrNull(get("average_package")),
          median_package: numberOrNull(get("median_package")),
          highest_package: numberOrNull(get("highest_package")),
          logo_url: get("logo_url") || null,
          display_order: numberOrNull(get("display_order")) ?? 0,
          sort_order: numberOrNull(get("sort_order")) ?? 0,
          deadline_tbd: /^(yes|true|1|y)$/i.test(get("deadline_tbd")),
          is_recommended: /^(yes|true|1|y)$/i.test(get("is_recommended")),
          recommendation_label: get("recommendation_label") || null,
          recommendation_note: get("recommendation_note") || null,
          recommendation_priority: numberOrNull(get("recommendation_priority")) ?? 0,
          seo_title: get("seo_title") || null,
          seo_description: get("seo_description") || null,
          seo_h1: get("seo_h1") || null,
          seo_intro: get("seo_intro") || null,
          seo_keywords: get("seo_keywords")
            ? get("seo_keywords").split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
            : [],
          seo_image_alt: get("seo_image_alt") || null,
          status: ["open", "closing_soon", "closed"].includes(get("status").toLowerCase())
            ? get("status").toLowerCase()
            : "open",
        },
      };
    });
  }, [headers, dataRows, mapping, existing]);

  const valid = prepared.filter((r) => r.errors.length === 0);
  const invalid = prepared.filter((r) => r.errors.length > 0);

  const runImport = async () => {
    if (!valid.length) return;
    setImporting(true);
    const { error } = await supabase.from("application_trackers").insert(valid.map((v) => v.values) as never);
    setImporting(false);
    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Imported ${valid.length} application${valid.length > 1 ? "s" : ""}` });
    reset();
    onOpenChange(false);
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk import applications (CSV)</DialogTitle>
        </DialogHeader>

        {!headers.length ? (
          <div className="space-y-4 py-6 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Upload className="h-4 w-4" /> Choose CSV file
              </Button>
              <Button variant="outline" onClick={downloadTemplate} className="gap-1.5">
                <Download className="h-4 w-4" /> Download template
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Include at least a college name and an application deadline column. You’ll map columns in the next step.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="pb-2 text-sm font-medium">Step 1 — Map your columns</p>
              <div className="grid gap-3 md:grid-cols-2">
                {TARGET_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-sm">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={mapping[f.key] ?? "__none__"}
                      onValueChange={(v) =>
                        setMapping((m) => {
                          const next = { ...m };
                          if (v === "__none__") delete next[f.key];
                          else next[f.key] = v;
                          return next;
                        })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Not mapped" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not mapped</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="pb-2 text-sm font-medium">Step 2 — Validation &amp; preview</p>
              <div className="flex flex-wrap gap-2 pb-3">
                <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {valid.length} ready
                </Badge>
                <Badge variant="outline" className="gap-1.5 border-rose-200 bg-rose-50 text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> {invalid.length} with errors
                </Badge>
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Deadline</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepared.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2">{r.name || "—"}</td>
                        <td className="px-3 py-2">
                          {typeof r.values["application_deadline"] === "string"
                            ? (r.values["application_deadline"] as string).slice(0, 10)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">{String(r.values["category"] ?? "—")}</td>
                        <td className="px-3 py-2 text-destructive">{r.errors.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {headers.length > 0 && (
            <Button variant="outline" onClick={reset}>Choose another file</Button>
          )}
          <Button onClick={() => void runImport()} disabled={!valid.length || importing}>
            {importing ? "Importing…" : `Import ${valid.length} row${valid.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
