import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";

type Probe = {
  url: string;
  ok: boolean;
  status: number;
  ttfb_ms: number | null;
  cf_cache_status: string | null;
  age: number | null;
  cache_control: string | null;
  server: string | null;
};

type Row = { route: string; cold: Probe; warm: Probe };

type Result = {
  summary: { hits: number; misses: number; total: number; origin: string; generated_at: string };
  results: Row[];
};

const statusColor = (s: string | null) => {
  if (!s) return "bg-slate-200 text-slate-700";
  if (s === "HIT" || s === "REVALIDATED") return "bg-emerald-100 text-emerald-800";
  if (s === "MISS" || s === "EXPIRED") return "bg-amber-100 text-amber-800";
  if (s === "BYPASS" || s === "DYNAMIC") return "bg-red-100 text-red-800";
  return "bg-slate-200 text-slate-700";
};

const AdminCacheDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [routes, setRoutes] = useState("/, /colleges, /coaching, /blog, /exam/cat");
  const [origin, setOrigin] = useState("https://mbacompass.in");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("cache-diagnostics", {
        body: null,
        method: "GET" as any,
      });
      // functions.invoke doesn't accept query params directly — fall back to fetch
      // if we need custom routes/origin.
      const needsCustom =
        routes.trim() !== "/, /colleges, /coaching, /blog, /exam/cat" ||
        origin !== "https://mbacompass.in";
      if (needsCustom) {
        const params = new URLSearchParams({
          routes: routes.split(",").map((s) => s.trim()).filter(Boolean).join(","),
          origin,
        });
        const { data: { session } } = await supabase.auth.getSession();
        const url = `https://mttoiqruzzxooveooldo.supabase.co/functions/v1/cache-diagnostics?${params}`;
        const r = await fetch(url, {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });
        setData(await r.json());
      } else {
        if (err) throw err;
        setData(res as Result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cache Diagnostics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Probes public routes twice (cold + warm) and reports Cloudflare cache
          status headers so you can verify edge HTML caching is working.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="font-medium mb-1">Origin</div>
            <input
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="font-medium mb-1">Routes (comma-separated)</div>
            <input
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={routes}
              onChange={(e) => setRoutes(e.target.value)}
            />
          </label>
        </div>
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Run probe
        </Button>
      </Card>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-sm text-red-800">{error}</Card>
      )}

      {data && (
        <>
          <Card className="p-4 flex flex-wrap gap-4 text-sm">
            <div><span className="text-muted-foreground">Origin:</span> <span className="font-mono">{data.summary.origin}</span></div>
            <div><span className="text-muted-foreground">Warm HITs:</span> <span className="font-semibold text-emerald-700">{data.summary.hits}</span> / {data.summary.total}</div>
            <div><span className="text-muted-foreground">Generated:</span> {new Date(data.summary.generated_at).toLocaleString()}</div>
          </Card>

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Route</th>
                  <th className="px-3 py-2 font-medium">Cold status</th>
                  <th className="px-3 py-2 font-medium">Cold TTFB</th>
                  <th className="px-3 py-2 font-medium">Warm status</th>
                  <th className="px-3 py-2 font-medium">Warm TTFB</th>
                  <th className="px-3 py-2 font-medium">Age</th>
                  <th className="px-3 py-2 font-medium">Cache-Control</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.route} className="border-t">
                    <td className="px-3 py-2 font-mono">{r.route}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className={statusColor(r.cold.cf_cache_status)}>
                        {r.cold.cf_cache_status ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{r.cold.ttfb_ms != null ? `${r.cold.ttfb_ms} ms` : "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className={statusColor(r.warm.cf_cache_status)}>
                        {r.warm.cf_cache_status ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{r.warm.ttfb_ms != null ? `${r.warm.ttfb_ms} ms` : "—"}</td>
                    <td className="px-3 py-2">{r.warm.age != null ? `${r.warm.age}s` : "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground truncate max-w-[220px]">
                      {r.warm.cache_control ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <p className="text-xs text-muted-foreground">
            Expected after Cloudflare Cache Rule for HTML is active: warm status =
            <span className="font-mono"> HIT</span>, warm TTFB &lt; 300 ms, and{" "}
            <span className="font-mono">Age</span> increasing on repeat runs.
          </p>
        </>
      )}
    </div>
  );
};

export default AdminCacheDiagnostics;
