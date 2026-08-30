import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, ClipboardList, Sparkles, RefreshCw, Trash2, Newspaper, CalendarDays } from "lucide-react";

const CATEGORIES = [
  "National", "International", "Economy & Finance", "Politics & Government",
  "Business & Startups", "MBA & Education", "AI & Technology", "Sports",
  "Environment & Climate", "Science & Innovation", "Corporate Affairs",
  "Stock Market", "Awards & Events", "Breaking", "GDPI Important",
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const NEWS_LAST_RUN_KEY = "mba-admin-news-last-run";

type NewsLastRun = {
  status: "success" | "partial" | "failed" | "zero";
  completedAt: string;
  requested: number;
  inserted: number;
  errors: { category: string; error: string }[];
  diagnostics?: any;
  raw?: string;
};

const parseFunctionError = async (error: any) => {
  const context = error?.context;
  const raw = typeof context?.text === "function" ? await context.text().catch(() => "") : "";
  if (!raw) return { payload: null, raw: error?.message || "Unknown function error" };
  try {
    return { payload: JSON.parse(raw), raw };
  } catch {
    return { payload: null, raw };
  }
};

const saveLastRun = (run: NewsLastRun) => {
  try {
    localStorage.setItem(NEWS_LAST_RUN_KEY, JSON.stringify(run));
  } catch {
    // Ignore local storage failures; the current run still renders from state.
  }
};

const formatJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
};

export default function AdminNewsroom() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(CATEGORIES);
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [perCategory, setPerCategory] = useState(3);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [lastRun, setLastRun] = useState<NewsLastRun | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NEWS_LAST_RUN_KEY);
      if (saved) setLastRun(JSON.parse(saved));
    } catch {
      setLastRun(null);
    }
  }, []);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["admin-news", filterCat],
    queryFn: async () => {
      let q = supabase.from("news_articles").select("*")
        .order("news_date", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(200);
      if (filterCat !== "all") q = q.eq("category", filterCat);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleCat = (c: string) =>
    setSelected((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const totalToGenerate = selected.length * perCategory;

  const generate = async () => {
    if (!selected.length) return toast({ title: "Pick at least one category", variant: "destructive" });
    if (dateFrom > dateTo) return toast({ title: "Invalid date range", description: "From must be ≤ To", variant: "destructive" });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-news", {
        body: {
          categories: selected,
          count_per_category: perCategory,
          date_from: dateFrom,
          date_to: dateTo,
          focus: focus.trim() || undefined,
        },
      });
      if (error) {
        const { payload, raw } = await parseFunctionError(error);
        const failedRun: NewsLastRun = {
          status: "failed",
          completedAt: new Date().toISOString(),
          requested: totalToGenerate,
          inserted: Number(payload?.inserted || 0),
          errors: payload?.errors?.length
            ? payload.errors
            : [{ category: "Function", error: payload?.error || error.message || raw }],
          diagnostics: payload?.diagnostics,
          raw,
        };
        setLastRun(failedRun);
        saveLastRun(failedRun);
        toast({ title: "Generation failed", description: failedRun.errors[0]?.error || "See last-run logs below.", variant: "destructive" });
        return;
      }
      const inserted = Number(data?.inserted || 0);
      const errors = Array.isArray(data?.errors) ? data.errors : [];
      const run: NewsLastRun = {
        status: inserted === 0 ? "zero" : errors.length ? "partial" : "success",
        completedAt: new Date().toISOString(),
        requested: Number(data?.requested || totalToGenerate),
        inserted,
        errors,
        diagnostics: data?.diagnostics,
        raw: formatJson(data),
      };
      setLastRun(run);
      saveLastRun(run);
      toast({ title: "News generated", description: `${data?.inserted ?? 0} articles added.` });
      qc.invalidateQueries({ queryKey: ["admin-news"] });
    } catch (e: any) {
      const failedRun: NewsLastRun = {
        status: "failed",
        completedAt: new Date().toISOString(),
        requested: totalToGenerate,
        inserted: 0,
        errors: [{ category: "Client", error: e?.message || "Try again later." }],
        raw: e?.stack || e?.message || String(e),
      };
      setLastRun(failedRun);
      saveLastRun(failedRun);
      toast({ title: "Generation failed", description: e?.message || "See last-run logs below.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("news_articles").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["admin-news"] });
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    (articles || []).forEach((a: any) => { m[a.category] = (m[a.category] || 0) + 1; });
    return m;
  }, [articles]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center text-white">
          <Newspaper className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">News &amp; Insights — Admin</h1>
          <p className="text-sm text-muted-foreground">Generate AI current-affairs cards (trilingual) for students.</p>
        </div>
      </div>

      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">AI Generator</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Articles per category</Label>
            <Input type="number" min={1} max={8} value={perCategory}
              onChange={(e) => setPerCategory(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
              className="mt-1" />
          </div>
        </div>

        <div>
          <Label>Optional focus / theme</Label>
          <Textarea
            placeholder="e.g. RBI monetary policy, Union Budget impact, AI regulation in India…"
            value={focus} onChange={(e) => setFocus(e.target.value)}
            className="mt-1 min-h-[60px]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Categories ({selected.length}/{CATEGORIES.length})</Label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(CATEGORIES)}>Select all</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <label key={c} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                selected.includes(c) ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              }`}>
                <Checkbox checked={selected.includes(c)} onCheckedChange={() => toggleCat(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            Will generate ~<strong>{totalToGenerate}</strong> articles
          </span>
          <Button onClick={generate} disabled={busy || !selected.length} className="gap-2">
            <Sparkles className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
            {busy ? "Generating…" : "Generate News"}
          </Button>
        </div>

        {lastRun && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-2">
                {lastRun.status === "failed" || lastRun.status === "zero" ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                )}
                <div>
                  <h3 className="text-sm font-semibold">Last-run logs and error output</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(lastRun.completedAt).toLocaleString()} · {lastRun.inserted}/{lastRun.requested} articles inserted · Status: {lastRun.status}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLastRun(null);
                  localStorage.removeItem(NEWS_LAST_RUN_KEY);
                }}
              >
                Clear logs
              </Button>
            </div>

            {lastRun.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-destructive">Errors</p>
                <div className="space-y-2">
                  {lastRun.errors.map((item, index) => (
                    <div key={`${item.category}-${index}`} className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs">
                      <span className="font-semibold">{item.category}:</span> {item.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastRun.diagnostics?.category_results?.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {lastRun.diagnostics.category_results.map((item: any) => (
                  <div key={item.category} className="rounded-md border border-border bg-background p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{item.category}</span>
                      <Badge variant={item.inserted > 0 ? "default" : item.status === "failed" ? "destructive" : "secondary"}>{item.status}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-muted-foreground">
                      <span>AI: <b className="text-foreground">{item.ai_returned || 0}</b></span>
                      <span>Ready: <b className="text-foreground">{item.rows_prepared || 0}</b></span>
                      <span>Saved: <b className="text-foreground">{item.inserted || 0}</b></span>
                    </div>
                    {item.error && <p className="mt-2 text-destructive line-clamp-3">{item.error}</p>}
                  </div>
                ))}
              </div>
            )}

            {lastRun.diagnostics?.logs?.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><ClipboardList className="h-3.5 w-3.5" /> Execution log</p>
                <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {lastRun.diagnostics.logs.join("\n")}
                </pre>
              </div>
            )}

            {lastRun.raw && (
              <details className="rounded-md border border-border bg-background p-3">
                <summary className="cursor-pointer text-xs font-semibold">Raw function response</summary>
                <pre className="mt-2 max-h-64 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap">{lastRun.raw}</pre>
              </details>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold">Recent Articles ({articles?.length || 0})</h2>
          <div className="flex items-center gap-2">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}{counts[c] ? ` (${counts[c]})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["admin-news"] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !articles?.length ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No articles yet. Generate the first batch above.</div>
        ) : (
          <div className="space-y-2">
            {articles.map((a: any) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-accent/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-xs">{a.category}</Badge>
                    <Badge variant="secondary" className="text-xs">{a.importance?.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">{a.news_date}</span>
                    {a.short_summary_hi && <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200" variant="outline">हिंदी</Badge>}
                    {a.short_summary_hinglish && <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">Hinglish</Badge>}
                  </div>
                  <p className="font-medium text-sm line-clamp-2">{a.headline}</p>
                  {a.one_liner && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.one_liner}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteArticle(a.id)} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
