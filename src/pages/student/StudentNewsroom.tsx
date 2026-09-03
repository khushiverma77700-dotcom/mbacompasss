import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsDemo } from "@/contexts/DemoModeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Newspaper, Bookmark, BookmarkCheck, Star, Check, Clock, Flame,
  Globe, Building2, TrendingUp, GraduationCap, Cpu, Trophy, Leaf, FlaskConical,
  Briefcase, LineChart, Award, Zap, MessagesSquare, BookOpen, Lightbulb, PenLine,
  Calendar, ArrowRight, ArrowLeft, Sparkles,
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
  is_liked: boolean; // reused as "Important"
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

const TABS = ["All", "Today", "Trending", "Important", "Saved", "Read", "GDPI"];

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
  const [open, setOpen] = useState<Article | null>(null);
  const [lang, setLang] = useState<"en" | "hi" | "hinglish">("en");
  const [focusSection, setFocusSection] = useState<string | null>(null);
  

  const { data: articles, isLoading } = useQuery({
    queryKey: ["newsroom-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
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
    if (tab === "Trending") list = [...list].sort((a, b) => (b.importance === "high" ? 1 : 0) - (a.importance === "high" ? 1 : 0));
    if (tab === "Today") {
      const today = new Date().toDateString();
      list = list.filter((a) => new Date(a.published_at).toDateString() === today);
    }
    if (tab === "Saved") list = list.filter((a) => actionMap.get(a.id)?.is_saved);
    if (tab === "Read") list = list.filter((a) => actionMap.get(a.id)?.is_read);
    if (tab === "Important") list = list.filter((a) => actionMap.get(a.id)?.is_liked);
    if (tab === "GDPI") list = list.filter((a) => a.category === "GDPI Important" || (a.gdpi_points?.length || 0) >= 3);
    return list;
  }, [articles, category, tab, actionMap]);

  const updateAction = async (article: Article, patch: Partial<ActionRow>, jumpToTab?: string) => {
    if (!user?.id) {
      toast({ title: "Sign in", description: "Please sign in to save or mark." });
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
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["newsroom-actions", user.id] });
    if (jumpToTab) {
      const becameTrue =
        (jumpToTab === "Saved" && patch.is_saved) ||
        (jumpToTab === "Important" && patch.is_liked) ||
        (jumpToTab === "Read" && patch.is_read);
      if (becameTrue) {
        toast({ title: `Moved to ${jumpToTab}`, description: "Find it in that tab." });
        setTab(jumpToTab);
      }
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

  const openWithSection = (a: Article, section: string | null) => {
    setFocusSection(section);
    openArticle(a);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (d.toDateString() === now.toDateString()) return "Today";
    const yest = new Date(now); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };


  useEffect(() => {
    if (!open) setFocusSection(null);
  }, [open]);

  useEffect(() => {
    if (open && focusSection) {
      const id = window.setTimeout(() => {
        const node = document.getElementById(`news-sec-${focusSection}`);
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return () => window.clearTimeout(id);
    }
  }, [open, focusSection]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 md:p-6 mb-5 shadow-xs">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-sky-300/30 to-indigo-300/30 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center text-white shadow-lg">
            <Newspaper className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-xl md:text-2xl text-foreground">News &amp; Insights</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Daily current affairs, business, policy & GDPI-ready briefs — built for CAT, XAT, SNAP, NMAT aspirants.
            </p>
          </div>
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
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
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
                  ? `bg-gradient-to-r ${meta.color} text-white border-transparent shadow-sm`
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
        <TabsList className="flex w-full h-auto gap-1 overflow-x-auto whitespace-nowrap justify-start p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="shrink-0 whitespace-nowrap text-xs md:text-sm">
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
              <h3 className="font-semibold mb-1">Nothing here yet</h3>
              <p className="text-sm text-muted-foreground">
                {tab === "Saved" ? "Bookmark stories to find them here." :
                  tab === "Important" ? "Mark stories as important to collect them here." :
                  tab === "Read" ? "Open any card to mark it read." :
                    "Fresh briefs will appear here automatically."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {filtered.map((a) => {
                const meta = CATEGORY_META[a.category] || CATEGORY_META["All"];
                const Icon = meta.icon;
                const act = actionMap.get(a.id);
                const dateLabel = formatDate(a.published_at);
                const isFresh = (Date.now() - new Date(a.published_at).getTime()) < 24 * 3600 * 1000;
                return (
                  <Card
                    key={a.id}
                    className="group relative overflow-hidden border border-slate-200/80 rounded-2xl flex flex-col bg-gradient-to-b from-white to-slate-50/40 shadow-xs hover:shadow-xl hover:-translate-y-0.5 hover:border-sky-300 transition-all duration-300"
                  >
                    {/* Top accent + freshness shimmer */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${meta.color}`} />
                    <div className="p-5 md:p-6 flex flex-col flex-1">
                      {/* Category + Importance */}
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${meta.color} grid place-items-center text-white shadow-xs`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate">{a.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isFresh && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Fresh
                            </span>
                          )}
                          <Badge variant="outline" className={`text-xs ${importanceBadge(a.importance)}`}>
                            {a.importance === "high" && <Flame className="h-2.5 w-2.5 mr-0.5" />}
                            {a.importance.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {/* Date + meta strip */}
                      <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 font-semibold">
                          <Calendar className="h-3 w-3" />
                          {dateLabel}
                        </span>
                        {a.source_name && <span className="font-medium truncate max-w-[140px]">· {a.source_name}</span>}
                        <span className="inline-flex items-center gap-0.5 ml-auto"><Clock className="h-3 w-3" /> {Math.max(15, a.reading_seconds)}s read</span>
                      </div>

                      <h3
                        className="font-bold text-base md:text-lg leading-snug text-slate-900 line-clamp-2 mb-2 cursor-pointer hover:text-sky-700 transition-colors"
                        onClick={() => openWithSection(a, null)}
                      >
                        {a.headline}
                      </h3>
                      {(pickSummary(a) || a.one_liner) && (
                        <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed" lang={lang === "hi" ? "hi" : "en"}>
                          {pickSummary(a) || a.one_liner}
                        </p>
                      )}

                      {/* Section quick-jump chips → open popup at that section */}
                      <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                        {a.detailed_summary && (
                          <button
                            onClick={() => openWithSection(a, "detail")}
                            className="group/chip flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/60 hover:bg-sky-100 px-2.5 py-2 text-xs font-semibold text-sky-800 transition dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200 dark:hover:bg-sky-500/25"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="truncate">Detailed</span>
                            <ArrowRight className="h-3 w-3 ml-auto opacity-60 group-hover/chip:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                        {a.why_matters && (
                          <button
                            onClick={() => openWithSection(a, "why")}
                            className="group/chip flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100 px-2.5 py-2 text-xs font-semibold text-amber-800 transition dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25"
                          >
                            <Lightbulb className="h-3.5 w-3.5" />
                            <span className="truncate">Why matters</span>
                            <ArrowRight className="h-3 w-3 ml-auto opacity-60 group-hover/chip:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                        {a.wat_topics?.length > 0 && (
                          <button
                            onClick={() => openWithSection(a, "wat")}
                            className="group/chip flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50/60 hover:bg-violet-100 px-2.5 py-2 text-xs font-semibold text-violet-800 transition dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25"
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            <span className="truncate">WAT/Essay</span>
                            <ArrowRight className="h-3 w-3 ml-auto opacity-60 group-hover/chip:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                        {a.gdpi_points?.length > 0 && (
                          <button
                            onClick={() => openWithSection(a, "gdpi")}
                            className="group/chip flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 hover:bg-fuchsia-100 px-2.5 py-2 text-xs font-semibold text-fuchsia-800 transition dark:border-fuchsia-400/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/25"
                          >
                            <MessagesSquare className="h-3.5 w-3.5" />
                            <span className="truncate">GDPI</span>
                            <ArrowRight className="h-3 w-3 ml-auto opacity-60 group-hover/chip:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                      </div>

                      {/* Big CTA */}
                      <Button
                        onClick={() => openWithSection(a, null)}
                        className="mt-4 w-full h-10 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-semibold gap-1.5 shadow-xs"
                      >
                        <Sparkles className="h-4 w-4" />
                        View Full Brief
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>

                      {/* Action row */}
                      <div className="mt-3 pt-3 border-t border-dashed flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={act?.is_read ? "default" : "outline"}
                          className="h-8 px-2.5 text-xs gap-1 flex-1 min-w-[80px]"
                          onClick={(e) => { e.stopPropagation(); updateAction(a, { is_read: !act?.is_read }, "Read"); }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Read
                        </Button>
                        <Button
                          size="sm"
                          variant={act?.is_saved ? "default" : "outline"}
                          className="h-8 px-2.5 text-xs gap-1 flex-1 min-w-[80px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !act?.is_saved;
                            updateAction(a, { is_saved: next }, next ? "Saved" : undefined);
                            if (next) setTab("Saved");
                          }}
                        >
                          {act?.is_saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                          {act?.is_saved ? "Saved" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant={act?.is_liked ? "default" : "outline"}
                          className="h-8 px-2.5 text-xs gap-1 flex-1 min-w-[80px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !act?.is_liked;
                            updateAction(a, { is_liked: next }, next ? "Important" : undefined);
                            if (next) setTab("Important");
                          }}
                        >
                          <Star className={`h-3.5 w-3.5 ${act?.is_liked ? "fill-current" : ""}`} />
                          Important
                        </Button>
                      </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          {open && (
            <>
              <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-3 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
                <button
                  onClick={() => setOpen(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 active:scale-95 transition"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
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
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-md px-1.5 py-0.5">
                    <Calendar className="h-2.5 w-2.5" /> {formatDate(open.published_at)}
                  </span>
                </div>
                <DialogTitle className="text-left text-lg md:text-xl">{open.headline}</DialogTitle>
              </DialogHeader>

              {open.one_liner && (
                <p className="text-sm font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-lg p-3">
                  {open.one_liner}
                </p>
              )}

              {(open.short_summary || open.short_summary_hi || open.short_summary_hinglish) && (
                <section>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Summary</h4>
                    <div className="flex gap-1">
                      {([
                        { k: "en", label: "EN", available: !!open.short_summary },
                        { k: "hi", label: "हिं", available: !!open.short_summary_hi },
                        { k: "hinglish", label: "Hi-EN", available: !!open.short_summary_hinglish },
                      ] as const).map((o) => (
                        <button
                          key={o.k}
                          disabled={!o.available}
                          onClick={() => setLang(o.k)}
                          className={`text-xs font-bold px-2 py-0.5 rounded-[0.25rem] border transition ${
                            lang === o.k
                              ? "bg-primary text-primary-foreground border-primary"
                              : o.available
                                ? "bg-card border-border hover:bg-accent"
                                : "opacity-40 cursor-not-allowed border-border"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-line" lang={lang === "hi" ? "hi" : "en"}>
                    {pickSummary(open)}
                  </p>
                </section>
              )}

              {open.detailed_summary && (
                <section id="news-sec-detail" className={`rounded-lg p-3 transition ${focusSection === "detail" ? "ring-2 ring-sky-300 bg-sky-50/50" : ""}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 mb-1.5 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Detailed View</h4>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{open.detailed_summary}</p>
                </section>
              )}

              {open.why_matters && (
                <section id="news-sec-why" className={`rounded-lg border border-amber-200 bg-amber-50 p-3 ${focusSection === "why" ? "ring-2 ring-amber-300" : ""}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" /> Why this matters</h4>
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
                <section id="news-sec-gdpi" className={`rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/40 dark:bg-violet-500/10 ${focusSection === "gdpi" ? "ring-2 ring-violet-300 dark:ring-violet-400/60" : ""}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-1.5 flex items-center gap-1">
                    <MessagesSquare className="h-3.5 w-3.5" /> GDPI / Interview Angles
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-violet-900 dark:text-violet-100">
                    {open.gdpi_points.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </section>
              )}

              {open.wat_topics?.length > 0 && (
                <section id="news-sec-wat" className={`rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/10 ${focusSection === "wat" ? "ring-2 ring-fuchsia-300 dark:ring-fuchsia-400/60" : ""}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300 mb-1.5 flex items-center gap-1"><PenLine className="h-3.5 w-3.5" /> WAT / Essay Topics</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-fuchsia-900 dark:text-fuchsia-100">
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
                      <Badge key={k} variant="secondary" className="text-xs">
                        {k.toUpperCase()} · {v}/10
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                <Button
                  size="sm"
                  variant={actionMap.get(open.id)?.is_read ? "default" : "outline"}
                  onClick={() => updateAction(open, { is_read: !actionMap.get(open.id)?.is_read }, "Read")}
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {actionMap.get(open.id)?.is_read ? "Read" : "Mark Read"}
                </Button>
                <Button
                  size="sm"
                  variant={actionMap.get(open.id)?.is_saved ? "default" : "outline"}
                  onClick={() => updateAction(open, { is_saved: !actionMap.get(open.id)?.is_saved }, "Saved")}
                  className="gap-1.5"
                >
                  {actionMap.get(open.id)?.is_saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {actionMap.get(open.id)?.is_saved ? "Saved" : "Save for later"}
                </Button>
                <Button
                  size="sm"
                  variant={actionMap.get(open.id)?.is_liked ? "default" : "outline"}
                  onClick={() => updateAction(open, { is_liked: !actionMap.get(open.id)?.is_liked }, "Important")}
                  className="gap-1.5"
                >
                  <Star className={`h-4 w-4 ${actionMap.get(open.id)?.is_liked ? "fill-current" : ""}`} />
                  {actionMap.get(open.id)?.is_liked ? "Important" : "Mark Important"}
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
