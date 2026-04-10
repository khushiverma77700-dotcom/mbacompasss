import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, Database, HardDrive, FileJson, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRef } from "react";

const ALL_TABLES = [
  "site_settings",
  "categories",
  "institutes",
  "courses",
  "faculty",
  "colleges",
  "college_sections",
  "exams",
  "articles",
  "banners",
  "testimonials",
  "inquiries",
  "newsletter_subscribers",
  "coupons",
  "coupon_claims",
  "coaching_of_week",
  "coaching_results",
  "comparisons",
  "institute_results",
  "reviews",
  "city_pages",
  "business_inquiries",
  "profile_analyses",
  "analysis_results",
  "admin_permissions",
  "profiles",
  "user_roles",
  "saved_institutes",
] as const;

type TableName = typeof ALL_TABLES[number];

interface BackupData {
  version: string;
  created_at: string;
  tables: Record<string, any[]>;
  table_counts: Record<string, number>;
}

const AdminDatabaseBackup = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [lastBackup, setLastBackup] = useState<{ date: string; tables: number; rows: number } | null>(null);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchAllPages = async (table: TableName) => {
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        from += PAGE_SIZE;
        if (data.length < PAGE_SIZE) hasMore = false;
      }
    }
    return allData;
  };

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    try {
      const backup: BackupData = {
        version: "1.0",
        created_at: new Date().toISOString(),
        tables: {},
        table_counts: {},
      };

      let totalRows = 0;

      for (let i = 0; i < ALL_TABLES.length; i++) {
        const table = ALL_TABLES[i];
        setCurrentTable(table);
        setProgress(Math.round(((i + 1) / ALL_TABLES.length) * 100));

        try {
          const data = await fetchAllPages(table);
          backup.tables[table] = data;
          backup.table_counts[table] = data.length;
          totalRows += data.length;
        } catch (err: any) {
          console.warn(`Skipped table ${table}:`, err.message);
          backup.tables[table] = [];
          backup.table_counts[table] = 0;
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `database-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackup({
        date: new Date().toLocaleString(),
        tables: ALL_TABLES.length,
        rows: totalRows,
      });

      toast({ title: "Backup downloaded!", description: `${totalRows} rows across ${ALL_TABLES.length} tables.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
      setCurrentTable("");
      setProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as BackupData;
        if (!data.version || !data.tables) {
          toast({ title: "Invalid backup file", description: "This file doesn't look like a valid backup.", variant: "destructive" });
          return;
        }
        setImportPreview(data);
      } catch {
        toast({ title: "Invalid JSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRestore = async () => {
    if (!importPreview) return;

    const confirmed = window.confirm(
      "⚠️ WARNING: This will OVERWRITE existing data in your database with the backup data. This action cannot be undone. Are you sure?"
    );
    if (!confirmed) return;

    setImporting(true);
    setProgress(0);

    const tableNames = Object.keys(importPreview.tables);
    let restored = 0;
    let failed = 0;

    for (let i = 0; i < tableNames.length; i++) {
      const table = tableNames[i];
      setCurrentTable(table);
      setProgress(Math.round(((i + 1) / tableNames.length) * 100));

      const rows = importPreview.tables[table];
      if (!rows || rows.length === 0) continue;

      try {
        // Upsert in batches of 500
        const BATCH = 500;
        for (let j = 0; j < rows.length; j += BATCH) {
          const batch = rows.slice(j, j + BATCH);
          const { error } = await (supabase.from(table as any) as any).upsert(batch, {
            onConflict: "id",
            ignoreDuplicates: false,
          });
          if (error) throw error;
        }
        restored++;
      } catch (err: any) {
        console.warn(`Failed to restore ${table}:`, err.message);
        failed++;
      }
    }

    toast({
      title: "Restore complete",
      description: `${restored} tables restored, ${failed} failed.`,
      variant: failed > 0 ? "destructive" : "default",
    });

    setImporting(false);
    setCurrentTable("");
    setProgress(0);
    setImportPreview(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" /> Database Backup & Restore
        </h1>
        <p className="text-muted-foreground mt-1">Export your entire database as a JSON file or restore from a previous backup.</p>
      </div>

      {/* Status Bar */}
      {(exporting || importing) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {exporting ? "Exporting" : "Restoring"}: <span className="text-primary">{currentTable}</span>
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" /> Export Backup
            </CardTitle>
            <CardDescription>Download a complete snapshot of all {ALL_TABLES.length} database tables as a single JSON file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <HardDrive className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold text-foreground">{ALL_TABLES.length}</p>
                <p className="text-xs text-muted-foreground">Tables</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <FileJson className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold text-foreground">JSON</p>
                <p className="text-xs text-muted-foreground">Format</p>
              </div>
            </div>

            <Button onClick={handleExport} disabled={exporting || importing} className="w-full gap-2" size="lg">
              {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Exporting..." : "Download Full Backup"}
            </Button>

            {lastBackup && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div className="text-xs text-green-700">
                  <p className="font-medium">Last backup: {lastBackup.date}</p>
                  <p>{lastBackup.tables} tables • {lastBackup.rows.toLocaleString()} total rows</p>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Included tables:</p>
              <div className="flex flex-wrap gap-1">
                {ALL_TABLES.map((t) => (
                  <span key={t} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-500/50" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600" /> Restore from Backup
            </CardTitle>
            <CardDescription>Upload a previously exported JSON backup file to restore your database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-medium">Caution: Restore will overwrite existing data</p>
                <p>Always download a fresh backup before restoring. This cannot be undone.</p>
              </div>
            </div>

            <div>
              <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={exporting || importing}
                className="w-full gap-2"
                size="lg"
              >
                <Upload className="w-4 h-4" />
                Select Backup File (.json)
              </Button>
            </div>

            {importPreview && (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Backup Preview
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created: {new Date(importPreview.created_at).toLocaleString()}</p>
                    <p>Version: {importPreview.version}</p>
                    <p>Tables: {Object.keys(importPreview.tables).length}</p>
                    <p>Total rows: {Object.values(importPreview.table_counts).reduce((a, b) => a + b, 0).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(importPreview.table_counts).map(([table, count]) => (
                      <span key={table} className="bg-background border border-border px-1.5 py-0.5 rounded text-[10px]">
                        {table}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleRestore} disabled={importing} className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700">
                    {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {importing ? "Restoring..." : "Restore Database"}
                  </Button>
                  <Button variant="ghost" onClick={() => setImportPreview(null)} disabled={importing}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDatabaseBackup;
