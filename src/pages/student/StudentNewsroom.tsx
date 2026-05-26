import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsDemo } from "@/contexts/DemoModeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Newspaper, Sparkles, Bookmark, BookmarkCheck, Heart, Check, Clock, Flame,
  Globe, Building2, TrendingUp, GraduationCap, Cpu, Trophy, Leaf, FlaskConical,
  Briefcase, LineChart, Award, Zap, MessagesSquare, Search, RefreshCw,
} from "lucide-react";

type Article = {
  id: string;
  headline: string;
  category: string;
  source_name: string | null;
  source_url: string | null;
  one_liner: string | null;
  short_summary: string | null;
  short_summary_hi: string | null;
  short_summary_hinglish: string | null;
  detailed_summary: string | null;
  why_matters: string | null;
  gdpi_points: string[];
  wat_topics: string[];
  key_facts: string[];
  vocabulary: { word: string; meaning: string }[];
  exam_relevance: Record<string, number>;
  tags: string[];
  importance: "high" | "medium" | "low";
  reading_seconds: number;
  published_at: string;
  news_date?: string | null;
};

type ActionRow = {
  article_id: string;
  is_read: boolean;
  is_saved: boolean;
  is_liked: boolean;
};

const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  "All": { icon: Newspaper, color: "from-sky-500 to-blue-600" },
  "National": { icon: Globe, color: "from-orange-500 to-rose-500" },
  "International": { icon: Globe, color: "from-blue-500 to-indigo-600" },
  "Economy & Finance": { icon: LineChart, color: "from-emerald-500 to-teal-600" },
  "Politics & Government": { icon: Building2, color: "from-amber-500 to-orange-600" },
  "Business & Startups": { icon: Briefcase, color: "from-violet-500 to-fuchsia-600" },
  "MBA & Education": { icon: GraduationCap, color: "from-pink-500 to-rose-600" },
  "AI & Technology": { icon: Cpu, color: "from-cyan-500 to-blue-600" },
  "Sports": { icon: Trophy, color: "from-lime-500 to-emerald-600" },
  "Environment & Climate": { icon: Leaf, color: "from-green-500 to-emerald-600" },
  "Science & Innovation": { icon: FlaskConical, color: "from-indigo-500 to-violet-600" },
  "Corporate Affairs": { icon: Building2, color: "from-slate-500 to-zinc-700" },
  "Stock Market": { icon: TrendingUp, color: "from-emerald-500 to-green-600" },
  "Awards & Events": { icon: Award, color: "from-yellow-500 to-amber-600" },
  "Breaking": { icon: Zap, color: "from-rose-500 to-red-600" },
  "GDPI Important": { icon: MessagesSquare, color: "from-purple-500 to-fuchsia-600" },
};

const TABS = ["All", "Trending", "Today", "Saved", "Read", "GDPI"];

function importanceBadge(level: Article["importance"]) {
  if (level === "high") return "bg-rose-100 text-rose-700 border-rose-200";
  if (level === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function StudentNewsroom() {
  const { user } = useAuth();
  const isDemo = useIsDemo();
  const qc = useQueryClient();
  const [tab, setTab] = useState("All");
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Article | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<"en" | "hi" | "hinglish">("en");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["newsroom-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data as unknown) as Article[]) || [];
    },
  });

  const { data: actions } = useQuery({
    queryKey: ["newsroom-actions", user?.id],
    enabled: !!user?.id && !isDemo,
    queryFn: async () => {
      const { data } = await supabase
        .from("news_user_actions")
        .select("article_id,is_read,is_saved,is_liked")
        .eq("user_id", user!.id);
      return (data as ActionRow[]) || [];
    },
  });

  const actionMap = useMemo(() => {
    const m = new Map<string, ActionRow>();
    (actions || []).forEach((a) => m.set(a.article_id, a));
    return m;
  }, [actions]);

  const filtered = useMemo(() => {
    let list = articles || [];
    if (category !== "All") list = list.filter((a) => a.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.headline.toLowerCase().includes(q) ||
          a.one_liner?.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (tab === "Trending") list = [...list].sort((a, b) => (b.importance === "high" ? 1 : 0) - (a.importance === "high" ? 1 : 0));
    if (tab === "Today") {
      const today = new Date().toDateString();
      list = list.filter((a) => new Date(a.published_at).toDateString() === today);
    }
    if (tab === "Saved") list = list.filter((a) => actionMap.get(a.id)?.is_saved);
    if (tab === "Read") list = list.filter((a) => actionMap.get(a.id)?.is_read);
    if (tab === "GDPI") list = list.filter((a) => a.category === "GDPI Important" || (a.gdpi_points?.length || 0) >= 3);
    return list;
  }, [articles, category, search, tab, actionMap]);

  const updateAction = async (article: Article, patch: Partial<ActionRow>) => {
    if (!user?.id) {
      toast({ title: "Sign in", description: "Please sign in to save or like." });
      return;
    }
    const existing = actionMap.get(article.id);
    const row = {
      user_id: user.id,
      article_id: article.id,
      is_read: existing?.is_read ?? false,
      is_saved: existing?.is_saved ?? false,
      is_liked: existing?.is_liked ?? false,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("news_user_actions").upsert(row);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["newsroom-actions", user.id] });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-news", {
        body: { count: 12 },
      });
      if (error) throw error;
      toast({ title: "Newsroom updated", description: `${data?.inserted ?? 0} fresh stories added.` });
      qc.invalidateQueries({ queryKey: ["newsroom-articles"] });
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e?.message || "Try again later.", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const openArticle = (a: Article) => {
    setOpen(a);
    if (!actionMap.get(a.id)?.is_read) void updateAction(a, { is_read: true });
  };

  const categoryList = useMemo(() => {
    const s = new Set<string>(["All"]);
    (articles || []).forEach((a) => s.add(a.category));
    return Array.from(s);
  }, [articles]);

  const pickSummary = (a: Article): string =>
    (lang === "hi" && a.short_summary_hi) ||
    (lang === "hinglish" && a.short_summary_hinglish) ||
    a.short_summary ||
    a.one_liner ||
    "";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 md:p-6 mb-5 shadow-sm">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-sky-300/30 to-indigo-300/30 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center text-white shadow-lg">
            <Newspaper className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-xl md:text-2xl text-foreground">News &amp; Insights</h1>
              <Badge className="bg-gradient-to-r from-rose-500 to-orange-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" /> AI-Curated
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Daily current affairs, business, policy & GDPI-ready briefs — built for CAT, XAT, SNAP, NMAT aspirants.
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} size="sm" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Updating…" : "Refresh"}
          </Button>
        </div>

        {/* Language toggle */}
        <div className="relative mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Read in</span>
          {([
            { k: "en", label: "English" },
            { k: "hi", label: "हिंदी" },
            { k: "hinglish", label: "Hinglish" },
          ] as const).map((o) => (
            <button
              key={o.k}
              onClick={() => setLang(o.k)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                lang === o.k
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search news, topics, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {categoryList.map((c) => {
          const meta = CATEGORY_META[c] || CATEGORY_META["All"];
          const Icon = meta.icon;
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                active
                  ? `bg-gradient-to-r ${meta.color} text-white border-transparent shadow`
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {c}
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full overflow-x-auto justify-start h-auto p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs md:text-sm">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <Newspaper className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No news here yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {tab === "Saved" ? "Bookmark stories to find them here." :
                  tab === "Read" ? "Open any card to mark it read." :
                    "Tap Refresh to pull a fresh AI-curated brief."}
              </p>
              {tab !== "Saved" && tab !== "Read" && (
                <Button onClick={handleRefresh} disabled={refreshing} size="sm" className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Generate today’s brief
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => {
                const meta = CATEGORY_META[a.category] || CATEGORY_META["All"];
                const Icon = meta.icon;
                const act = actionMap.get(a.id);
                return (
                  <Card
                    key={a.id}
                    className="group p-4 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden border-border/60"
                    onClick={() => openArticle(a)}
                  >
                    <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${meta.color}`} />
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-6 w-6 rounded-md bg-gradient-to-br ${meta.color} grid place-items-center text-white`}>
                          <Icon className="h-3 w-3" />
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">{a.category}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${importanceBadge(a.importance)}`}>
                        {a.importance === "high" && <Flame className="h-2.5 w-2.5 mr-0.5" />}
                        {a.importance.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm md:text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1.5">
                      {a.headline}
                    </h3>
                    {(pickSummary(a) || a.one_liner) && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3" lang={lang === "hi" ? "hi" : "en"}>
                        {pickSummary(a) || a.one_liner}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {a.source_name && <span className="font-medium">{a.source_name}</span>}
                        <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {Math.max(15, a.reading_seconds)}s</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateAction(a, { is_saved: !act?.is_saved }); }}
                          className="p-1 rounded hover:bg-accent"
                          aria-label="Save"
                        >
                          {act?.is_saved ? <BookmarkCheck className="h-3.5 w-3.5 text-sky-600" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateAction(a, { is_liked: !act?.is_liked }); }}
                          className="p-1 rounded hover:bg-accent"
                          aria-label="Like"
                        >
                          <Heart className={`h-3.5 w-3.5 ${act?.is_liked ? "fill-rose-500 text-rose-500" : ""}`} />
                        </button>
                        {act?.is_read && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={`bg-gradient-to-r ${(CATEGORY_META[open.category] || CATEGORY_META["All"]).color} text-white border-0`}>
                    {open.category}
                  </Badge>
                  <Badge variant="outline" className={importanceBadge(open.importance)}>
                    {open.importance.toUpperCase()}
                  </Badge>
                  {open.source_name && (
                    <span className="text-xs text-muted-foreground">{open.source_name}</span>
                  )}
                </div>
                <DialogTitle className="text-left text-lg md:text-xl">{open.headline}</DialogTitle>
              </DialogHeader>

              {open.one_liner && (
                <p className="text-sm font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-lg p-3">
                  {open.one_liner}
                </p>
              )}

              {open.short_summary && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Quick Summary</h4>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{open.short_summary}</p>
                </section>
              )}

              {open.detailed_summary && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Detailed View</h4>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{open.detailed_summary}</p>
                </section>
              )}

              {open.why_matters && (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Why this matters</h4>
                  <p className="text-sm text-amber-900">{open.why_matters}</p>
                </section>
              )}

              {open.key_facts?.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Key Facts</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {open.key_facts.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </section>
              )}

              {open.gdpi_points?.length > 0 && (
                <section className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1.5 flex items-center gap-1">
                    <MessagesSquare className="h-3.5 w-3.5" /> GDPI / Interview Angles
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-violet-900">
                    {open.gdpi_points.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </section>
              )}

              {open.wat_topics?.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">WAT / Essay Topics</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {open.wat_topics.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </section>
              )}

              {open.vocabulary?.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Vocabulary Builder</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {open.vocabulary.map((v, i) => (
                      <div key={i} className="rounded-md border border-border bg-card p-2">
                        <div className="text-sm font-bold">{v.word}</div>
                        <div className="text-xs text-muted-foreground">{v.meaning}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {open.exam_relevance && Object.keys(open.exam_relevance).length > 0 && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Exam Relevance</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(open.exam_relevance).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-[11px]">
                        {k.toUpperCase()} · {v}/10
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant={actionMap.get(open.id)?.is_saved ? "default" : "outline"}
                  onClick={() => updateAction(open, { is_saved: !actionMap.get(open.id)?.is_saved })}
                  className="gap-1.5"
                >
                  {actionMap.get(open.id)?.is_saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {actionMap.get(open.id)?.is_saved ? "Saved" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant={actionMap.get(open.id)?.is_liked ? "default" : "outline"}
                  onClick={() => updateAction(open, { is_liked: !actionMap.get(open.id)?.is_liked })}
                  className="gap-1.5"
                >
                  <Heart className={`h-4 w-4 ${actionMap.get(open.id)?.is_liked ? "fill-current" : ""}`} />
                  {actionMap.get(open.id)?.is_liked ? "Liked" : "Like"}
                </Button>
                {open.source_url && (
                  <Button size="sm" variant="ghost" asChild className="ml-auto">
                    <a href={open.source_url} target="_blank" rel="noreferrer">Open source ↗</a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
