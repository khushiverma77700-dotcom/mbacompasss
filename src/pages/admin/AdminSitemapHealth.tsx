import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { readSitemapInventory } from "@/lib/sitemapInventory";

interface CheckResult {
  key: string;
  label: string;
  url: string;
  ok: boolean;
  status?: number;
  contentType?: string | null;
  lastModified?: string | null;
  pageCount: number;
  imageCount: number;
  sizeKb: number;
  validXml: boolean;
  error?: string;
  checkedAt: string;
}

const TARGETS = [
  { key: "pages", label: "Pages sitemap", path: "/sitemap.xml", icon: FileText },
  { key: "images", label: "Image sitemap", path: "/sitemap-images.xml", icon: ImageIcon },
];

async function runCheck(label: string, key: string, path: string): Promise<CheckResult> {
  const url = `${window.location.origin}${path}`;
  const base: CheckResult = {
    key, label, url, ok: false, pageCount: 0, imageCount: 0,
    sizeKb: 0, validXml: false, checkedAt: new Date().toISOString(),
  };
  try {
    const res = await fetch(`${url}?cb=${Date.now()}`, { headers: { "cache-control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const inventory = await readSitemapInventory(url);
    const { urlCount: pageCount, imageCount } = inventory;
    const validXml = true;
    return {
      ...base,
      status: res.status,
      contentType: res.headers.get("content-type"),
      lastModified: res.headers.get("last-modified"),
      pageCount,
      imageCount,
      sizeKb: inventory.bytes / 1024,
      validXml,
      ok: res.ok && validXml && (key === "images" ? imageCount > 0 : pageCount > 0),
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { ...base, error: (err as Error).message };
  }
}

const AdminSitemapHealth = () => {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [robots, setRobots] = useState<{ ok: boolean; lines: string[]; missing: string[] } | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const checks = await Promise.all(TARGETS.map((t) => runCheck(t.label, t.key, t.path)));
      setResults(checks);

      const res = await fetch(`/robots.txt?cb=${Date.now()}`);
      const text = res.ok ? await res.text() : "";
      const lines = text.split(/\r?\n/).filter((l) => /^\s*sitemap\s*:/i.test(l)).map((l) => l.trim());
      const missing = ["/sitemap.xml", "/sitemap-images.xml"].filter(
        (p) => !lines.some((l) => l.toLowerCase().endsWith(p)),
      );
      setRobots({ ok: missing.length === 0, lines, missing });
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => { void run(); }, [run]);

  const totalPages = results.find((r) => r.key === "pages")?.pageCount ?? 0;
  const totalImages = results.reduce((sum, r) => Math.max(sum, r.imageCount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sitemap Health Check</h1>
          <p className="text-sm text-muted-foreground">
            Verifies that both sitemap.xml and sitemap-images.xml are served correctly, with counts and last updated time.
          </p>
        </div>
        <Button onClick={() => void run()} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Re-run checks
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Page URLs</p>
          <p className="text-3xl font-bold">{totalPages}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Image entries</p>
          <p className="text-3xl font-bold">{totalImages}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Checks passing</p>
          <p className="text-3xl font-bold">{results.filter((r) => r.ok).length}/{results.length || 2}</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(results.length ? results : TARGETS.map((t) => ({ ...t, ok: false } as any))).map((r: any) => {
          const meta = TARGETS.find((t) => t.key === r.key)!;
          const Icon = meta.icon;
          return (
            <Card key={r.key}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-primary" /> {meta.label}
                </CardTitle>
                {running && !r.checkedAt ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : r.ok ? (
                  <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Healthy</Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failing</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <a href={meta.path} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                  {meta.path}
                </a>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-muted-foreground">HTTP status</dt><dd>{r.status ?? "—"}</dd>
                  <dt className="text-muted-foreground">Valid XML</dt><dd>{r.validXml ? "Yes" : "No"}</dd>
                  <dt className="text-muted-foreground">Page URLs</dt><dd>{r.pageCount ?? 0}</dd>
                  <dt className="text-muted-foreground">Image entries</dt><dd>{r.imageCount ?? 0}</dd>
                  <dt className="text-muted-foreground">Size</dt><dd>{r.sizeKb ? `${r.sizeKb.toFixed(1)} KB` : "—"}</dd>
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd>{r.lastModified ? new Date(r.lastModified).toLocaleString() : "Not reported"}</dd>
                  <dt className="text-muted-foreground">Checked</dt>
                  <dd>{r.checkedAt ? new Date(r.checkedAt).toLocaleTimeString() : "—"}</dd>
                </dl>
                {r.error && <p className="text-destructive text-xs">{r.error}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">robots.txt sitemap directives</CardTitle>
          {robots && (robots.ok
            ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Both declared</Badge>
            : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Incomplete</Badge>)}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {robots?.lines.length
            ? <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{robots.lines.join("\n")}</pre>
            : <p className="text-muted-foreground">No Sitemap directives found.</p>}
          {robots && !robots.ok && (
            <p className="text-destructive text-xs">
              Missing: {robots.missing.join(", ")} — run the sitemap refresh (prebuild) to sync robots.txt automatically.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSitemapHealth;
