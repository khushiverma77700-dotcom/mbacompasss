import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, Database, HardDrive, FileJson, Shield, ImageIcon, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALL_TABLES = [
  "site_settings", "categories", "institutes", "courses", "faculty",
  "colleges", "college_sections", "exams", "articles", "banners",
  "testimonials", "inquiries", "newsletter_subscribers", "coupons",
  "coupon_claims", "coaching_of_week", "coaching_results", "comparisons",
  "institute_results", "reviews", "city_pages", "business_inquiries",
  "profile_analyses", "analysis_results", "admin_permissions", "profiles",
  "user_roles", "saved_institutes",
] as const;

type TableName = typeof ALL_TABLES[number];

interface BackupData {
  version: string;
  created_at: string;
  tables: Record<string, any[]>;
  table_counts: Record<string, number>;
}

interface StorageFile {
  name: string;
  id?: string;
  created_at?: string;
  metadata?: { size?: number; mimetype?: string };
}

const BUCKET = "uploads";

const AdminDatabaseBackup = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [lastBackup, setLastBackup] = useState<{ date: string; tables: number; rows: number } | null>(null);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Media state
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloadingMedia, setDownloadingMedia] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [mediaCurrentFile, setMediaCurrentFile] = useState("");

  useEffect(() => {
    fetchStorageFiles();
  }, []);

  const fetchStorageFiles = async () => {
    setLoadingFiles(true);
    try {
      const allFiles: StorageFile[] = [];
      const listRecursive = async (folder: string) => {
        const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
        if (error) throw error;
        for (const item of data || []) {
          const fullPath = folder ? `${folder}/${item.name}` : item.name;
          if (item.id) {
            allFiles.push({ ...item, name: fullPath });
          } else {
            await listRecursive(fullPath);
          }
        }
      };
      await listRecursive("");
      setStorageFiles(allFiles);
    } catch (err: any) {
      console.warn("Failed to list storage:", err.message);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchAllPages = async (table: TableName) => {
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) { hasMore = false; } else {
        allData = [...allData, ...data];
        from += PAGE_SIZE;
        if (data.length < PAGE_SIZE) hasMore = false;
      }
    }
    return allData;
  };

  // ─── DATABASE EXPORT ───
  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    try {
      const backup: BackupData = { version: "1.0", created_at: new Date().toISOString(), tables: {}, table_counts: {} };
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
      downloadJSON(backup, `database-backup-${new Date().toISOString().slice(0, 10)}.json`);
      setLastBackup({ date: new Date().toLocaleString(), tables: ALL_TABLES.length, rows: totalRows });
      toast({ title: "Backup downloaded!", description: `${totalRows} rows across ${ALL_TABLES.length} tables.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
      setCurrentTable("");
      setProgress(0);
    }
  };

  // ─── DATABASE RESTORE ───
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as BackupData;
        if (!data.version || !data.tables) {
          toast({ title: "Invalid backup file", variant: "destructive" });
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
    if (!window.confirm("⚠️ WARNING: This will OVERWRITE existing data. Are you sure?")) return;
    setImporting(true);
    setProgress(0);
    const tableNames = Object.keys(importPreview.tables);
    let restored = 0, failed = 0;
    for (let i = 0; i < tableNames.length; i++) {
      const table = tableNames[i];
      setCurrentTable(table);
      setProgress(Math.round(((i + 1) / tableNames.length) * 100));
      const rows = importPreview.tables[table];
      if (!rows || rows.length === 0) continue;
      try {
        const BATCH = 500;
        for (let j = 0; j < rows.length; j += BATCH) {
          const batch = rows.slice(j, j + BATCH);
          const { error } = await (supabase.from(table as any) as any).upsert(batch, { onConflict: "id", ignoreDuplicates: false });
          if (error) throw error;
        }
        restored++;
      } catch (err: any) {
        console.warn(`Failed to restore ${table}:`, err.message);
        failed++;
      }
    }
    toast({ title: "Restore complete", description: `${restored} tables restored, ${failed} failed.`, variant: failed > 0 ? "destructive" : "default" });
    setImporting(false);
    setCurrentTable("");
    setProgress(0);
    setImportPreview(null);
  };

  // ─── MEDIA DOWNLOAD ───
  const handleMediaDownload = async () => {
    if (storageFiles.length === 0) {
      toast({ title: "No files found", description: "No files in storage to download.", variant: "destructive" });
      return;
    }
    setDownloadingMedia(true);
    setMediaProgress(0);

    try {
      const mediaManifest: { files: { path: string; url: string; size?: number; type?: string }[] } = { files: [] };

      for (let i = 0; i < storageFiles.length; i++) {
        const file = storageFiles[i];
        setMediaCurrentFile(file.name);
        setMediaProgress(Math.round(((i + 1) / storageFiles.length) * 100));

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(file.name);
        mediaManifest.files.push({
          path: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size,
          type: file.metadata?.mimetype,
        });
      }

      downloadJSON(mediaManifest, `media-manifest-${new Date().toISOString().slice(0, 10)}.json`);
      toast({ title: "Media manifest downloaded!", description: `${storageFiles.length} file URLs exported. Use this to re-upload files.` });
    } catch (err: any) {
      toast({ title: "Media export failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingMedia(false);
      setMediaCurrentFile("");
      setMediaProgress(0);
    }
  };

  // ─── MEDIA UPLOAD (batch) ───
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    setMediaProgress(0);
    let uploaded = 0, failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setMediaCurrentFile(file.name);
      setMediaProgress(Math.round(((i + 1) / files.length) * 100));

      try {
        const ext = file.name.split(".").pop();
        const fileName = `restore/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;
        uploaded++;
      } catch (err: any) {
        console.warn(`Failed to upload ${file.name}:`, err.message);
        failed++;
      }
    }

    toast({
      title: "Media upload complete",
      description: `${uploaded} files uploaded, ${failed} failed.`,
      variant: failed > 0 ? "destructive" : "default",
    });

    setUploadingMedia(false);
    setMediaCurrentFile("");
    setMediaProgress(0);
    if (mediaRef.current) mediaRef.current.value = "";
    fetchStorageFiles();
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalStorageSize = storageFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
  const isBusy = exporting || importing || downloadingMedia || uploadingMedia;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" /> Full Backup & Restore
        </h1>
        <p className="text-muted-foreground mt-1">Database + Media files — everything you need to rebuild your entire website.</p>
      </div>

      {/* Progress Bar */}
      {isBusy && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {exporting ? "Exporting DB" : importing ? "Restoring DB" : downloadingMedia ? "Exporting Media" : "Uploading Media"}
                : <span className="text-primary">{currentTable || mediaCurrentFile}</span>
              </span>
              <span className="text-muted-foreground">{progress || mediaProgress}%</span>
            </div>
            <Progress value={progress || mediaProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="database" className="gap-2"><Database className="w-4 h-4" /> Database ({ALL_TABLES.length} tables)</TabsTrigger>
          <TabsTrigger value="media" className="gap-2"><ImageIcon className="w-4 h-4" /> Media Files ({storageFiles.length})</TabsTrigger>
        </TabsList>

        {/* ═══════ DATABASE TAB ═══════ */}
        <TabsContent value="database" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Card */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="w-5 h-5 text-primary" /> Export Database
                </CardTitle>
                <CardDescription>Download all {ALL_TABLES.length} tables as a single JSON file.</CardDescription>
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

                <Button onClick={handleExport} disabled={isBusy} className="w-full gap-2" size="lg">
                  {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {exporting ? "Exporting..." : "Download Full Database Backup"}
                </Button>

                {lastBackup && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs text-foreground">
                      <p className="font-medium">Last backup: {lastBackup.date}</p>
                      <p className="text-muted-foreground">{lastBackup.tables} tables • {lastBackup.rows.toLocaleString()} total rows</p>
                    </div>
                  </div>
                )}

                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium hover:text-foreground">View all {ALL_TABLES.length} tables included</summary>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ALL_TABLES.map((t) => (
                      <span key={t} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>

            {/* Restore Card */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive to-destructive/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="w-5 h-5 text-destructive" /> Restore Database
                </CardTitle>
                <CardDescription>Upload a backup JSON file to restore all data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div className="text-xs text-destructive">
                    <p className="font-medium">Warning: This overwrites existing data</p>
                    <p>Always download a fresh backup before restoring.</p>
                  </div>
                </div>

                <div>
                  <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
                  <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={isBusy} className="w-full gap-2" size="lg">
                    <Upload className="w-4 h-4" /> Select Database Backup (.json)
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
                      <Button onClick={handleRestore} disabled={importing} variant="destructive" className="flex-1 gap-2">
                        {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {importing ? "Restoring..." : "Restore Database Now"}
                      </Button>
                      <Button variant="ghost" onClick={() => setImportPreview(null)} disabled={importing}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════ MEDIA TAB ═══════ */}
        <TabsContent value="media" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Media Export */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="w-5 h-5 text-primary" /> Export Media Manifest
                </CardTitle>
                <CardDescription>Download a JSON file listing all {storageFiles.length} media files with their public URLs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <ImageIcon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold text-foreground">{storageFiles.length}</p>
                    <p className="text-xs text-muted-foreground">Files</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <HardDrive className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold text-foreground">{formatSize(totalStorageSize)}</p>
                    <p className="text-xs text-muted-foreground">Total Size</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <FolderOpen className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold text-foreground">{BUCKET}</p>
                    <p className="text-xs text-muted-foreground">Bucket</p>
                  </div>
                </div>

                <Button onClick={handleMediaDownload} disabled={isBusy || loadingFiles} className="w-full gap-2" size="lg">
                  {downloadingMedia ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloadingMedia ? "Exporting..." : "Download Media Manifest"}
                </Button>

                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <p className="text-xs font-medium text-foreground mb-1">What's in the manifest?</p>
                  <p className="text-xs text-muted-foreground">A JSON file with every file's path, public URL, size, and type. You can use these URLs to download files individually, or re-upload them below.</p>
                </div>

                {loadingFiles ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading file list...
                  </div>
                ) : storageFiles.length > 0 ? (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-medium hover:text-foreground">View all {storageFiles.length} files</summary>
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {storageFiles.map((f) => (
                        <div key={f.name} className="flex items-center justify-between bg-muted/50 px-2 py-1 rounded text-[11px]">
                          <span className="truncate max-w-[70%]">{f.name}</span>
                          <span className="text-muted-foreground shrink-0">{formatSize(f.metadata?.size)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <p className="text-xs text-muted-foreground">No files found in storage.</p>
                )}
              </CardContent>
            </Card>

            {/* Media Upload */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive to-destructive/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="w-5 h-5 text-destructive" /> Upload Media Files
                </CardTitle>
                <CardDescription>Bulk upload images, logos, banners, and documents back to storage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">How media restore works:</p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Select all media files (images, PDFs, etc.) from your local backup</li>
                    <li>Files get uploaded to the <span className="font-mono bg-muted px-1 rounded">uploads</span> bucket</li>
                    <li>Database references from your DB restore will automatically point to the correct URLs</li>
                  </ol>
                </div>

                <div>
                  <input
                    ref={mediaRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.svg,.webp"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => mediaRef.current?.click()}
                    disabled={isBusy}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Upload className="w-4 h-4" /> Select Files to Upload (multi-select)
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchStorageFiles} disabled={loadingFiles} className="gap-1.5">
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? "animate-spin" : ""}`} /> Refresh File List
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDatabaseBackup;
