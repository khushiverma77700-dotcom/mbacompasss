import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  appendMetaCheckHistory,
  loadMetaCheckHistory,
  runProfileAnalyzerMetaCheck,
  topRecurringFailures,
  type MetaCheckRun,
} from "@/lib/profileAnalyzerMetaCheck";
import { toast } from "sonner";

/**
 * Tracks meta/canonical/JSON-LD pass rate over time for profile-analyzer URLs.
 * History is persisted in localStorage so the widget keeps a rolling
 * 30-run timeline even without a backend table.
 */
const MetaPassRateWidget = () => {
  const [history, setHistory] = useState<MetaCheckRun[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setHistory(loadMetaCheckHistory());
  }, []);

  const run = async () => {
    setRunning(true);
    try {
      const r = await runProfileAnalyzerMetaCheck();
      const next = appendMetaCheckHistory(r);
      setHistory(next);
      if (r.failed === 0) toast.success(`All ${r.total} URLs passed (${r.passRate}%)`);
      else toast.warning(`${r.failed}/${r.total} URLs need attention (${r.passRate}% pass)`);
    } catch (e: any) {
      toast.error(e?.message || "Meta check failed");
    } finally {
      setRunning(false);
    }
  };

  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : undefined;
  const trend = useMemo(() => {
    if (!latest || !previous) return 0;
    return Math.round((latest.passRate - previous.passRate) * 10) / 10;
  }, [latest, previous]);

  const chartData = useMemo(
    () =>
      history.map((h, i) => ({
        run: `#${history.length - history.length + i + 1}`,
        passRate: h.passRate,
        failed: h.failed,
      })),
    [history],
  );

  const recurring = useMemo(() => topRecurringFailures(history), [history]);

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Profile-Analyzer Meta / Canonical / JSON-LD Pass Rate
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Rolling history across {history.length} run{history.length === 1 ? "" : "s"} (max 30).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Run check
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">Latest pass rate</div>
            <div className="text-2xl font-bold mt-1 flex items-center gap-2">
              {latest ? `${latest.passRate}%` : "—"}
              {latest && (latest.failed === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">Trend vs previous</div>
            <div className="text-2xl font-bold mt-1 flex items-center gap-2">
              {previous ? `${trend > 0 ? "+" : ""}${trend}%` : "—"}
              {previous && (trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-600" />
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">URLs sampled</div>
            <div className="text-2xl font-bold mt-1">{latest?.total ?? "—"}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">Failing URLs (latest)</div>
            <div className="text-2xl font-bold mt-1 text-amber-700">{latest?.failed ?? "—"}</div>
          </div>
        </div>

        <div className="h-48 w-full">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="run" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Pass rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
              Run the check at least twice to see the trend.
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">Recurring failure patterns</div>
          {recurring.length === 0 ? (
            <p className="text-xs text-muted-foreground">No failure patterns detected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recurring.map((r) => (
                <Badge key={r.issue} variant="outline" className="text-amber-700 border-amber-500/40">
                  {r.issue} · {r.count}× across {r.runs} run{r.runs === 1 ? "" : "s"}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetaPassRateWidget;
