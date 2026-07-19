import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Database, Upload, Download, Plus, Trash2, Save, ExternalLink,
  Table as TableIcon, FileSpreadsheet, AlertCircle, CheckCircle2,
} from "lucide-react";

/**
 * Unified Homepage Tables Manager.
 *
 * Zero-storage bulk upload: CSVs are parsed in the browser (Papa.parse),
 * previewed, and then written directly into the target `site_settings` row.
 * No intermediate server-side storage of the CSV itself.
 */

type ColType = "text" | "number" | "longtext" | "list"; // list = comma / pipe separated -> string[]

type ColumnDef = {
  key: string;
  label: string;
  type?: ColType;
  required?: boolean;
  placeholder?: string;
};

type TableCfg = {
  id: string;
  label: string;
  description: string;
  storageKey: string; // key in site_settings
  columns: ColumnDef[];
  csvSample: string[][]; // first row = headers, remaining = 1-2 example rows
  helperLink?: { label: string; to: string };
};

const TABLES: TableCfg[] = [
  {
    id: "mba_newsroom_bar",
    label: "MBA Newsroom Bar (Ticker)",
    description: "Live news ticker that runs across the top of the homepage.",
    storageKey: "mba_newsroom_bar",
    columns: [
      { key: "tag", label: "Tag", required: true, placeholder: "CAT 2026" },
      { key: "text", label: "Headline", type: "longtext", required: true },
      { key: "href", label: "Link URL", required: true, placeholder: "/exam/cat" },
    ],
    csvSample: [
      ["tag", "text", "href"],
      ["CAT 2026", "IIM Kozhikode releases CAT 2026 notification", "/exam/cat"],
      ["XAT 2026", "XLRI opens XAT 2026 registrations", "/exam/xat"],
    ],
    helperLink: { label: "Open legacy Newsroom page", to: "/admin/mba-newsroom-bar" },
  },
  {
    id: "exam_cutoffs",
    label: "Exam Cutoffs Table",
    description: "Category-wise cut-offs shown in the 'Exam Cutoffs' section of the homepage.",
    storageKey: "home_exam_cutoffs",
    columns: [
      { key: "exam", label: "Exam", required: true, placeholder: "CAT / XAT / NMAT / SNAP / CMAT / IIFT" },
      { key: "college", label: "College Name", required: true },
      { key: "slug", label: "College Slug", required: true },
      { key: "general", label: "General" },
      { key: "obc", label: "OBC" },
      { key: "sc", label: "SC" },
      { key: "st", label: "ST" },
      { key: "ews", label: "EWS" },
      { key: "fees", label: "Fees" },
      { key: "avgCTC", label: "Avg CTC" },
      { key: "intake", label: "Intake" },
    ],
    csvSample: [
      ["exam", "college", "slug", "general", "obc", "sc", "st", "ews", "fees", "avgCTC", "intake"],
      ["CAT", "IIM Ahmedabad", "iim-ahmedabad", "99.0", "90.0", "70.0", "60.0", "94.0", "₹28.0 L", "₹34.5 LPA", "395"],
      ["XAT", "XLRI Jamshedpur (BM)", "xlri-jamshedpur", "94.0", "85.0", "60.0", "45.0", "88.0", "₹27.5 L", "₹32.7 LPA", "180"],
    ],
  },
  {
    id: "placements_by_sector",
    label: "Placements by Sector",
    description: "Sector-wise placement mix cards on the homepage.",
    storageKey: "home_placements_by_sector",
    columns: [
      { key: "name", label: "Sector Name", required: true },
      { key: "share", label: "% Share", placeholder: "28%" },
      { key: "avgCTC", label: "Avg CTC", placeholder: "₹32–38 LPA" },
      { key: "topCTC", label: "Top CTC", placeholder: "₹1.15 Cr" },
      { key: "recruiters", label: "Recruiters (comma-separated)", type: "list" },
      { key: "icon", label: "Icon key", placeholder: "LineChart / Banknote / Cpu / ShoppingBag / Building2 / Factory / Briefcase / TrendingUp" },
    ],
    csvSample: [
      ["name", "share", "avgCTC", "topCTC", "recruiters", "icon"],
      ["Consulting", "28%", "₹32–38 LPA", "₹1.15 Cr", "McKinsey, BCG, Bain, Kearney, Accenture Strategy", "LineChart"],
      ["Product & Tech", "18%", "₹26–32 LPA", "₹75 LPA", "Amazon, Google, Microsoft, Flipkart, Uber", "Cpu"],
    ],
  },
  {
    id: "mba_journey_strip",
    label: "MBA Journey Roadmap",
    description: "6-step MBA journey roadmap on the homepage.",
    storageKey: "home_mba_journey_strip",
    columns: [
      { key: "n", label: "Step No.", required: true, placeholder: "01" },
      { key: "title", label: "Title", required: true },
      { key: "sub", label: "Description", type: "longtext" },
      { key: "link", label: "Link", required: true },
      { key: "cta", label: "CTA Label" },
      { key: "icon", label: "Icon key", placeholder: "Compass / BookOpenCheck / FileEdit / PenTool / LineChart / Award" },
    ],
    csvSample: [
      ["n", "title", "sub", "link", "cta", "icon"],
      ["01", "Discover", "Explore B-schools & specialisations that fit your goals.", "/colleges", "Explore Colleges", "Compass"],
      ["02", "Prepare", "Coaching, mocks, sectionals — CAT, XAT, GMAT, SNAP.", "/mba-compass", "Start Prep", "BookOpenCheck"],
    ],
  },
  {
    id: "roi_comparison",
    label: "ROI Comparison (Fees vs Avg CTC)",
    description: "'Fees vs Average CTC — Top B-Schools' table on the homepage.",
    storageKey: "home_roi_comparison",
    columns: [
      { key: "college", label: "B-School", required: true },
      { key: "slug", label: "Slug", placeholder: "iim-ahmedabad" },
      { key: "fees", label: "Fees (in Lakhs, number)", type: "number", required: true, placeholder: "24.5" },
      { key: "avgCtc", label: "Avg CTC (in Lakhs, number)", type: "number", required: true, placeholder: "35.2" },
      { key: "payback", label: "Payback", placeholder: "0.7 yrs" },
      { key: "tag", label: "Tier (Elite / Premium / Value)", required: true, placeholder: "Elite" },
    ],
    csvSample: [
      ["college", "slug", "fees", "avgCtc", "payback", "tag"],
      ["IIM Ahmedabad", "iim-ahmedabad", "24.5", "35.2", "0.7 yrs", "Elite"],
      ["FMS Delhi", "fms-delhi", "2.0", "34.4", "0.06 yrs", "Value"],
    ],
  },
];

const EXTERNAL_TABLES = [
  {
    id: "landscape_colleges",
    label: "Landscape Colleges (Ranked B-Schools)",
    description: "Dedicated manager with tabbed categories, CSV template & export.",
    to: "/admin/college-tables",
  },
];

const emptyRow = (cfg: TableCfg): Record<string, any> =>
  Object.fromEntries(cfg.columns.map((c) => [c.key, c.type === "list" ? [] : ""]));

const normalizeRow = (cfg: TableCfg, raw: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const col of cfg.columns) {
    const v = raw?.[col.key];
    if (col.type === "list") {
      if (Array.isArray(v)) out[col.key] = v.filter(Boolean).map(String);
      else if (typeof v === "string" && v.trim()) {
        out[col.key] = v.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
      } else out[col.key] = [];
    } else {
      out[col.key] = v == null ? "" : String(v);
    }
  }
  return out;
};

const AdminTablesManager = () => {
  const [tableId, setTableId] = useState(TABLES[0].id);
  const cfg = useMemo(() => TABLES.find((t) => t.id === tableId)!, [tableId]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<{ rows: Record<string, any>[]; mode: "append" | "replace" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch current data whenever table selection changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setDirty(false);
      setPreview(null);
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", cfg.storageKey)
        .maybeSingle();
      if (cancelled) return;
      if (error && error.code !== "PGRST116") {
        toast.error(`Failed to load: ${error.message}`);
      }
      const v: any = data?.value;
      const items: any[] = Array.isArray(v?.items) ? v.items : [];
      setRows(items.map((r) => normalizeRow(cfg, r)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [cfg]);

  const updateCell = (idx: number, key: string, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(cfg)]);
    setDirty(true);
  };

  const deleteRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const save = async () => {
    // Validate required columns
    for (const [i, r] of rows.entries()) {
      for (const col of cfg.columns) {
        if (col.required) {
          const v = r[col.key];
          const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
          if (empty) {
            toast.error(`Row ${i + 1}: "${col.label}" is required`);
            return;
          }
        }
      }
    }
    setSaving(true);
    const payload = { items: rows.map((r) => normalizeRow(cfg, r)), updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: cfg.storageKey, value: payload }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    setDirty(false);
    toast.success(`${cfg.label} saved (${rows.length} rows)`);
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse(cfg.csvSample);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.id}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrent = () => {
    const header = cfg.columns.map((c) => c.key);
    const body = rows.map((r) =>
      cfg.columns.map((c) => {
        const v = r[c.key];
        if (Array.isArray(v)) return v.join(", ");
        return v ?? "";
      })
    );
    const csv = Papa.unparse([header, ...body]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.id}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onCsvChosen = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = (res.data as any[]).map((r) => normalizeRow(cfg, r));
        if (parsed.length === 0) {
          toast.error("CSV had no rows");
          return;
        }
        setPreview({ rows: parsed, mode: "append" });
        toast.success(`Parsed ${parsed.length} rows — review and confirm`);
      },
      error: (err) => toast.error(`CSV parse error: ${err.message}`),
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = () => {
    if (!preview) return;
    const next = preview.mode === "replace" ? preview.rows : [...rows, ...preview.rows];
    setRows(next);
    setDirty(true);
    setPreview(null);
    toast.success(`${preview.rows.length} rows staged — click Save to publish`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Tables Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            One place to manage every homepage table — inline edit, bulk CSV upload (zero-storage), and CSV export.
          </p>
        </div>
      </header>

      {/* Table dropdown */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Select a table to manage
        </label>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Select value={tableId} onValueChange={setTableId}>
            <SelectTrigger className="md:w-[420px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1 text-sm text-muted-foreground">{cfg.description}</div>
        </div>

        {cfg.helperLink && (
          <Link
            to={cfg.helperLink.to}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> {cfg.helperLink.label}
          </Link>
        )}

        {/* External tables */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Also manageable
          </div>
          <div className="flex flex-wrap gap-2">
            {EXTERNAL_TABLES.map((t) => (
              <Link
                key={t.id}
                to={t.to}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted hover:bg-muted/70 border border-border rounded-lg px-3 py-1.5 transition-colors"
              >
                <TableIcon className="w-3.5 h-3.5 text-primary" />
                {t.label}
                <ExternalLink className="w-3 h-3 opacity-60" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-1.5" /> CSV Template
        </Button>
        <Button size="sm" variant="outline" onClick={exportCurrent} disabled={rows.length === 0}>
          <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Export Current
        </Button>
        <label className="inline-flex">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onCsvChosen(e.target.files[0])}
          />
          <Button size="sm" variant="outline" asChild>
            <span onClick={() => fileRef.current?.click()} className="cursor-pointer">
              <Upload className="w-4 h-4 mr-1.5" /> Bulk Upload CSV
            </span>
          </Button>
        </label>
        <Button size="sm" variant="outline" onClick={addRow}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Row
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {rows.length} row{rows.length === 1 ? "" : "s"} {dirty && <span className="text-orange-600 font-semibold">· unsaved</span>}
        </span>
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* CSV preview modal */}
      {preview && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-primary" />
            Preview: {preview.rows.length} rows parsed. Nothing is stored server-side until you save.
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={preview.mode === "append"}
                onChange={() => setPreview({ ...preview, mode: "append" })}
              />
              Append to existing ({rows.length + preview.rows.length} total)
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={preview.mode === "replace"}
                onChange={() => setPreview({ ...preview, mode: "replace" })}
              />
              Replace all existing
            </label>
          </div>
          <div className="max-h-64 overflow-auto border border-border rounded-lg bg-background">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {cfg.columns.map((c) => (
                    <th key={c.key} className="text-left px-2 py-1.5 font-semibold">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    {cfg.columns.map((c) => (
                      <td key={c.key} className="px-2 py-1 truncate max-w-[220px]">
                        {Array.isArray(r[c.key]) ? r[c.key].join(", ") : r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 50 && (
              <div className="text-center py-2 text-xs text-muted-foreground">
                +{preview.rows.length - 50} more rows…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmImport}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Stage {preview.rows.length} rows
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Rows editor */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <TableIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <div className="text-sm text-muted-foreground mb-3">No rows yet</div>
            <Button size="sm" onClick={addRow}>
              <Plus className="w-4 h-4 mr-1.5" /> Add first row
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-2 py-2 font-semibold w-10">#</th>
                  {cfg.columns.map((c) => (
                    <th key={c.key} className="text-left px-2 py-2 font-semibold">
                      {c.label}
                      {c.required && <span className="text-destructive ml-0.5">*</span>}
                    </th>
                  ))}
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-t border-border/60 align-top">
                    <td className="px-2 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                    {cfg.columns.map((c) => (
                      <td key={c.key} className="px-1.5 py-1.5 min-w-[140px]">
                        {c.type === "longtext" ? (
                          <Textarea
                            value={row[c.key] || ""}
                            onChange={(e) => updateCell(idx, c.key, e.target.value)}
                            placeholder={c.placeholder}
                            className="min-h-[52px] text-xs"
                          />
                        ) : c.type === "list" ? (
                          <Input
                            value={Array.isArray(row[c.key]) ? row[c.key].join(", ") : ""}
                            onChange={(e) =>
                              updateCell(
                                idx,
                                c.key,
                                e.target.value.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
                              )
                            }
                            placeholder={c.placeholder || "Comma-separated"}
                            className="h-8 text-xs"
                          />
                        ) : (
                          <Input
                            value={row[c.key] || ""}
                            onChange={(e) => updateCell(idx, c.key, e.target.value)}
                            placeholder={c.placeholder}
                            className="h-8 text-xs"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteRow(idx)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border/60">
        <strong>Zero-storage bulk upload:</strong> CSV is parsed in your browser, previewed, and only the final rows are written to <code>site_settings</code>. The uploaded file itself is never stored on the server.
      </div>
    </div>
  );
};

export default AdminTablesManager;
