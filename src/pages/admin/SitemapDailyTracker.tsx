import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, Circle, Download, CalendarCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { buildTracker, istDate, type SitemapSubmission } from "@/lib/sitemapTracker";

type Props = { files: { url: string; urlCount: number }[]; indexUrl: string; totalUrls: number };

export default function SitemapDailyTracker({ files, indexUrl, totalUrls }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<SitemapSubmission[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const today = istDate();
  const required = useMemo(() => [indexUrl, ...files.map(f => f.url)], [files, indexUrl]);
  const counts = useMemo(() => new Map([[indexUrl, totalUrls], ...files.map(f => [f.url, f.urlCount] as [string, number])]), [files, indexUrl, totalUrls]);

  const load = useCallback(async () => {
    const since = istDate(new Date(Date.now() - 90 * 86400000));
    const { data, error } = await supabase.from("sitemap_submissions").select("sitemap_url, submitted_on").gte("submitted_on", since).order("submitted_on");
    if (error) toast({ title: "Could not load tracker", description: error.message, variant: "destructive" });
    else setRows(data ?? []);
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const t = useMemo(() => buildTracker(rows, required, today), [rows, required, today]);
  const doneToday = new Set(rows.filter(r => r.submitted_on === today).map(r => r.sitemap_url));

  const copy = (text: string, label = "URL copied") => { navigator.clipboard.writeText(text); toast({ title: label }); };

  const toggle = async (url: string) => {
    setBusy(url);
    const q = supabase.from("sitemap_submissions");
    const { error } = doneToday.has(url)
      ? await q.delete().eq("sitemap_url", url).eq("submitted_on", today)
      : await q.insert({ sitemap_url: url, submitted_on: today, url_count: counts.get(url) ?? null, submitted_by: (await supabase.auth.getUser()).data.user?.id ?? null });
    if (error) toast({ title: "Not saved", description: error.message, variant: "destructive" });
    await load();
    setBusy(null);
  };

  const markAll = async () => {
    setBusy("all");
    const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
    const pending = t.pendingToday.map(u => ({ sitemap_url: u, submitted_on: today, url_count: counts.get(u) ?? null, submitted_by: uid }));
    if (pending.length) {
      const { error } = await supabase.from("sitemap_submissions").upsert(pending, { onConflict: "sitemap_url,submitted_on" });
      if (error) toast({ title: "Not saved", description: error.message, variant: "destructive" });
    }
    await load();
    setBusy(null);
  };

  const summary = () => [
    `MBA Compass sitemap report — ${today}`,
    `Total URLs: ${totalUrls} across ${files.length} sitemap files`,
    `Today: ${required.length - t.pendingToday.length}/${required.length} submitted${t.pendingToday.length ? ` (pending: ${t.pendingToday.join(", ")})` : " — complete"}`,
    `Completed days: ${t.completedDays} | Missed days: ${t.missedDays} | Overall: ${t.overallProgress}%`,
    `Missed dates: ${t.days.filter(d => d.status === "missed").map(d => d.date).join(", ") || "none"}`,
  ].join("\n");

  const downloadCsv = () => {
    const csv = ["date,status,submitted,required", ...t.days.map(d => `${d.date},${d.status},${d.done},${d.required}`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `sitemap-history-${today}.csv`;
    a.click();
  };

  const todayPct = required.length ? Math.round(((required.length - t.pendingToday.length) / required.length) * 100) : 0;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><CalendarCheck className="w-5 h-5 text-primary" /> Sitemap daily tracking</CardTitle>
        <CardDescription>Copy each sitemap URL, submit it in Google Search Console, then tick it. Days in India time; a day counts only when every sitemap is ticked.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[["Completed days", t.completedDays], ["Missed days", t.missedDays], ["Pending today", t.pendingToday.length], ["Overall progress", `${t.overallProgress}%`]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="text-2xl font-bold text-foreground">{v}</div>
            </div>
          ))}
        </div>

        {t.missedDays > 0 && (
          <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <span>Missed: {t.days.filter(d => d.status === "missed").slice(0, 10).map(d => d.date).join(", ")}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold">Today ({today})</span><span>{todayPct}%</span></div>
          <Progress value={todayPct} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={markAll} disabled={!!busy || !t.pendingToday.length}><CheckCircle className="w-4 h-4 mr-1" /> Mark all submitted today</Button>
          <Button size="sm" variant="outline" onClick={() => copy(required.join("\n"), "All sitemap URLs copied")}><Copy className="w-4 h-4 mr-1" /> Copy all URLs</Button>
          <Button size="sm" variant="outline" onClick={() => copy(summary(), "Daily summary copied")}><Copy className="w-4 h-4 mr-1" /> Copy daily summary</Button>
          <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="w-4 h-4 mr-1" /> History CSV</Button>
          <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline px-2"><ExternalLink className="w-4 h-4" /> Search Console</a>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border">
          {required.map(url => {
            const done = doneToday.has(url);
            return (
              <div key={url} className="flex items-center gap-3 p-3">
                <button aria-label={done ? "Mark not submitted" : "Mark submitted"} onClick={() => toggle(url)} disabled={!!busy} className="shrink-0">
                  {done ? <CheckCircle className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <code className="text-sm text-foreground break-all">{url}</code>
                  <div className="text-xs text-muted-foreground">{url === indexUrl ? `Index · ${totalUrls} URLs total` : `${counts.get(url)} URLs`}</div>
                </div>
                <Badge variant={done ? "default" : "outline"}>{done ? "Submitted" : "Pending"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => copy(url)} aria-label="Copy URL"><Copy className="w-4 h-4" /></Button>
              </div>
            );
          })}
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Date-wise history</div>
          <div className="max-h-72 overflow-auto rounded-lg border border-border divide-y divide-border">
            {t.days.map(d => (
              <div key={d.date} className="flex items-center justify-between p-2 text-sm">
                <span>{d.date}</span>
                <span className="text-muted-foreground">{d.done}/{d.required}</span>
                <Badge variant={d.status === "complete" ? "default" : d.status === "missed" ? "destructive" : "outline"}>{d.status === "complete" ? "Completed" : d.status === "missed" ? "Missed" : "Pending"}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
