import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Zap, ImageIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AssetRow {
  id: string;
  source_url: string;
  alt: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
  status: string;
  status_reason: string | null;
  variants: Record<string, string> | null;
  page_context: Array<Record<string, unknown>>;
  last_optimized_at: string | null;
  updated_at: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, string> = {
    optimized: "bg-green-100 text-green-800",
    discovered: "bg-slate-100 text-slate-700",
    optimizing: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-700",
    broken: "bg-red-100 text-red-700",
  };
  return <Badge className={variants[status] ?? "bg-slate-100"}>{status}</Badge>;
};

const AdminImageSeo = () => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | "audit" | "batch">(null);
  const [search, setSearch] = useState("");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["image-assets-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_assets")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AssetRow[];
    },
  });

  const stats = useMemo(() => {
    const total = assets.length;
    const optimized = assets.filter((a) => a.status === "optimized").length;
    const missingAlt = assets.filter((a) => !a.alt || a.alt.length < 3).length;
    const failed = assets.filter((a) => a.status === "failed" || a.status === "broken").length;
    const withWebp = assets.filter((a) => a.variants?.webp).length;
    const seoScore = total ? Math.round((optimized / total) * 100) : 0;
    const aiScore = total ? Math.round(((total - missingAlt) / total) * 100) : 0;
    return { total, optimized, missingAlt, failed, withWebp, seoScore, aiScore };
  }, [assets]);

  const filtered = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter((a) =>
      a.source_url.toLowerCase().includes(q) ||
      (a.alt ?? "").toLowerCase().includes(q) ||
      (a.title ?? "").toLowerCase().includes(q),
    );
  }, [assets, search]);

  const runAudit = async () => {
    setBusy("audit");
    try {
      const { data, error } = await supabase.functions.invoke("image-audit-crawler", { body: {} });
      if (error) throw error;
      toast.success(`Audit complete: ${(data as any)?.uniqueImages ?? 0} images tracked`);
      qc.invalidateQueries({ queryKey: ["image-assets-admin"] });
    } catch (err: any) {
      toast.error(`Audit failed: ${err.message ?? "unknown"}`);
    } finally {
      setBusy(null);
    }
  };

  const runBatch = async () => {
    setBusy("batch");
    try {
      const { data, error } = await supabase.functions.invoke("image-optimizer", { body: { limit: 15 } });
      if (error) throw error;
      toast.success(`Optimized ${(data as any)?.processed ?? 0} images`);
      qc.invalidateQueries({ queryKey: ["image-assets-admin"] });
    } catch (err: any) {
      toast.error(`Optimization failed: ${err.message ?? "unknown"}`);
    } finally {
      setBusy(null);
    }
  };

  const optimizeOne = async (url: string) => {
    try {
      await supabase.functions.invoke("image-optimizer", { body: { source_url: url } });
      toast.success("Optimization triggered");
      qc.invalidateQueries({ queryKey: ["image-assets-admin"] });
    } catch (err: any) {
      toast.error(err.message ?? "failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Image SEO Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Site-wide image audit, WebP delivery, alt-text automation, and image sitemap — no visual changes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAudit} disabled={busy !== null} variant="outline">
            {busy === "audit" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Rescan Library
          </Button>
          <Button onClick={runBatch} disabled={busy !== null}>
            {busy === "batch" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Optimize Next 15
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Images</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Optimized</div><div className="text-2xl font-bold text-green-700">{stats.optimized}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">WebP Ready</div><div className="text-2xl font-bold text-blue-700">{stats.withWebp}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Missing ALT</div><div className="text-2xl font-bold text-amber-700">{stats.missingAlt}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">SEO Health</div><div className="text-2xl font-bold">{stats.seoScore}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">AI Readiness</div><div className="text-2xl font-bold">{stats.aiScore}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="w-4 h-4" /> All Images</CardTitle>
          <Input placeholder="Filter by URL, alt, title..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Preview</th>
                    <th className="text-left py-2 px-2">Source</th>
                    <th className="text-left py-2 px-2">ALT</th>
                    <th className="text-left py-2 px-2">Dims</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 px-2">
                        <img
                          src={a.variants?.webp || a.source_url}
                          alt=""
                          className="w-12 h-12 object-cover rounded-[0.25rem] border"
                          loading="lazy"
                          decoding="async"
                        />
                      </td>
                      <td className="py-2 px-2 max-w-[280px] truncate">
                        <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                          {a.source_url.split("/").pop()}
                        </a>
                      </td>
                      <td className="py-2 px-2 max-w-[240px] truncate text-xs">
                        {a.alt ? (
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" />{a.alt}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-3 h-3" />missing</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs">{a.width ? `${a.width}×${a.height}` : "—"}</td>
                      <td className="py-2 px-2"><StatusBadge status={a.status} /></td>
                      <td className="py-2 px-2">
                        <Button size="sm" variant="ghost" onClick={() => optimizeOne(a.source_url)}>Re-optimize</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 200 && (
                <p className="text-xs text-muted-foreground text-center py-3">Showing first 200 of {filtered.length} results — refine the filter to see more.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminImageSeo;
