import { useMemo, useState } from "react";
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
import { Sparkles, RefreshCw, Trash2, Newspaper, CalendarDays } from "lucide-react";

const CATEGORIES = [
  "National", "International", "Economy & Finance", "Politics & Government",
  "Business & Startups", "MBA & Education", "AI & Technology", "Sports",
  "Environment & Climate", "Science & Innovation", "Corporate Affairs",
  "Stock Market", "Awards & Events", "Breaking", "GDPI Important",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AdminNewsroom() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(CATEGORIES);
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [perCategory, setPerCategory] = useState(3);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

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
      if (error) throw error;
      toast({ title: "News generated", description: `${data?.inserted ?? 0} articles added.` });
      qc.invalidateQueries({ queryKey: ["admin-news"] });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || "Try again later.", variant: "destructive" });
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
                    <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{a.importance?.toUpperCase()}</Badge>
                    <span className="text-[11px] text-muted-foreground">{a.news_date}</span>
                    {a.short_summary_hi && <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200" variant="outline">हिंदी</Badge>}
                    {a.short_summary_hinglish && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">Hinglish</Badge>}
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
