import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Bookmark, Volume2, GraduationCap, BookOpen, Filter, Sparkles,
  ArrowUpRight, Target, Flame, Trophy, Crown, Zap, TrendingUp, PlusCircle, Settings2, Star,
  Search, X, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// MBA exam-focused filters (CAT + OMETs)
const EXAMS = [
  { k: "all", l: "All Exams" },
  { k: "CAT", l: "CAT" },
  { k: "XAT", l: "XAT" },
  { k: "NMAT", l: "NMAT" },
  { k: "SNAP", l: "SNAP" },
  { k: "IIFT", l: "IIFT" },
  { k: "CMAT", l: "CMAT" },
  { k: "MAT", l: "MAT" },
  { k: "GDPI", l: "GDPI / WAT" },
];

const LEVELS = [
  { k: "all", l: "All Levels" },
  { k: "intermediate", l: "Intermediate" },
  { k: "cat", l: "CAT Level" },
  { k: "gdpi", l: "GDPI Level" },
];

const TARGET_PRESETS = [3, 5, 10, 15, 20];


export default function StudentVocabularyFeed() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [words, setWords] = useState<any[]>([]);
  const [wotd, setWotd] = useState<any>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [readTodayCount, setReadTodayCount] = useState(0);
  const [newToday, setNewToday] = useState<any[]>([]);
  const [totalLibrary, setTotalLibrary] = useState(0);
  const [streak, setStreak] = useState<any>(null);
  const [showRead, setShowRead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState(5);
  const [celebrated, setCelebrated] = useState(false);

  const category = params.get("category") || "all";
  const difficulty = params.get("difficulty") || "all";

  document.title = "Vocabulary Feed | MBA Compass";

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    let q = supabase
      .from("vocab_words")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(120);
    if (category !== "all") q = q.eq("category", category as any);
    if (difficulty !== "all") q = q.eq("difficulty", difficulty as any);

    const [{ data: wordsData }, { count: libCount }, { data: newTodayData }, wotdRes] = await Promise.all([
      q,
      supabase.from("vocab_words").select("id", { count: "exact", head: true }),
      supabase
        .from("vocab_words")
        .select("id,word,slug,meaning,difficulty,category")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("vocab_word_of_day")
        .select("on_date,word_id,vocab_words(*)")
        .eq("on_date", today)
        .maybeSingle(),
    ]);

    setWords(wordsData || []);
    setTotalLibrary(libCount || 0);
    setNewToday(newTodayData || []);

    // Auto-fallback WOTD: first word from today's new, else top of feed
    let resolvedWotd = (wotdRes.data as any)?.vocab_words || null;
    if (!resolvedWotd) {
      resolvedWotd = (newTodayData && newTodayData[0]) || (wordsData && wordsData[0]) || null;
    }
    setWotd(resolvedWotd);

    if (user) {
      const [{ data: prog }, { data: bm }, { data: streakRow }, { count: readToday }] = await Promise.all([
        supabase.from("vocab_progress").select("word_id,is_read").eq("user_id", user.id).eq("is_read", true),
        supabase.from("vocab_bookmarks").select("word_id").eq("user_id", user.id),
        supabase.from("vocab_streaks").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("vocab_progress")
          .select("word_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", true)
          .gte("read_at", `${today}T00:00:00.000Z`),
      ]);
      setReadIds(new Set((prog || []).map((p: any) => p.word_id)));
      setBookmarkIds(new Set((bm || []).map((b: any) => b.word_id)));
      setStreak(streakRow);
      setReadTodayCount(readToday || 0);
      setTargetDraft(streakRow?.daily_target_words || 5);
    }
    setLoading(false);
  }, [category, difficulty, user]);

  useEffect(() => { load(); }, [load]);

  const dailyTarget = streak?.daily_target_words || 5;
  const targetPct = Math.min(100, Math.round((readTodayCount / Math.max(1, dailyTarget)) * 100));
  const targetMet = readTodayCount >= dailyTarget;

  useEffect(() => {
    if (targetMet && !celebrated && dailyTarget > 0 && readTodayCount > 0) {
      setCelebrated(true);
      toast({
        title: "Daily target hit!",
        description: `${readTodayCount}/${dailyTarget} words learned today. +20 bonus XP awarded.`,
      });
      supabase.rpc("award_vocab_xp", { _xp: 20, _activity_today: true });
    }
  }, [targetMet, celebrated, readTodayCount, dailyTarget, toast]);

  const setFilter = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v === "all") p.delete(k); else p.set(k, v);
    setParams(p);
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    speechSynthesis.speak(u);
  };

  const markRead = async (wordId: string) => {
    if (!user) return;
    setBusy(wordId);
    await supabase.rpc("vocab_mark_read", { _word_id: wordId, _read: true });
    await supabase.rpc("award_vocab_xp", { _xp: 5, _activity_today: true });
    setReadIds((s) => new Set(s).add(wordId));
    setReadTodayCount((c) => c + 1);
    toast({ title: "+5 XP", description: "Marked as read" });
    setBusy(null);
  };

  const toggleBookmark = async (wordId: string) => {
    if (!user) return;
    setBusy(wordId);
    if (bookmarkIds.has(wordId)) {
      await supabase.from("vocab_bookmarks").delete().eq("user_id", user.id).eq("word_id", wordId);
      setBookmarkIds((s) => { const n = new Set(s); n.delete(wordId); return n; });
    } else {
      await supabase.from("vocab_bookmarks").insert({ user_id: user.id, word_id: wordId });
      setBookmarkIds((s) => new Set(s).add(wordId));
      toast({ title: "Saved as important" });
    }
    setBusy(null);
  };

  const saveDailyTarget = async () => {
    if (!user) return;
    const clean = Math.max(1, Math.min(50, Math.round(targetDraft)));
    const { error } = await supabase
      .from("vocab_streaks")
      .upsert({ user_id: user.id, daily_target_words: clean }, { onConflict: "user_id" });
    if (error) { toast({ title: "Couldn't save target", variant: "destructive" }); return; }
    setStreak((s: any) => ({ ...(s || {}), daily_target_words: clean }));
    setCelebrated(false);
    setTargetOpen(false);
    toast({ title: "Daily target updated", description: `Aim for ${clean} words/day` });
  };

  const visible = useMemo(
    () => (showRead ? words : words.filter((w) => !readIds.has(w.id))),
    [words, showRead, readIds],
  );
  const totalRead = readIds.size;
  const totalSaved = bookmarkIds.size;
  const xp = streak?.total_xp || 0;
  const level = streak?.level || 1;
  const currentStreak = streak?.current_streak || 0;
  const xpInLevel = xp % 500;
  const xpPct = (xpInLevel / 500) * 100;

  // SVG ring for daily target
  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (targetPct / 100) * ringC;

  return (
    <div className="space-y-6 pb-24">
      {/* HERO — Gamified header */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-blue-50/50 p-5 md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700 backdrop-blur">
                <Sparkles className="h-3 w-3" /> B-School Vocabulary
              </div>
              <h1 className="font-heading mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                Level {level} · {xp.toLocaleString()} XP
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Daily streak builds your CAT/GDPI vocabulary muscle. Hit your target every day.
              </p>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatPill icon={<Flame className="h-4 w-4" />} label="Day streak" value={currentStreak} tone="orange" />
              <StatPill icon={<Trophy className="h-4 w-4" />} label="Words read" value={totalRead} tone="emerald" />
              <StatPill icon={<Bookmark className="h-4 w-4" />} label="Saved" value={totalSaved} tone="sky" />
              <StatPill icon={<BookOpen className="h-4 w-4" />} label="Library" value={totalLibrary} tone="violet" />
            </div>

            {/* XP bar */}
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Level {level}</span>
                <span>{xpInLevel} / 500 XP to Lv {level + 1}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-sky-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Target ring */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-sky-100 bg-white/70 p-5 backdrop-blur lg:min-w-[240px]">
            <div className="flex items-center justify-between gap-2 self-stretch">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Target className="h-3.5 w-3.5 text-sky-600" /> Daily Target
              </span>
              <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-sky-700 hover:bg-sky-50">
                    <Settings2 className="h-3.5 w-3.5" /> Set
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set your daily word target</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label className="text-xs text-slate-600">Words per day</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={targetDraft}
                        onChange={(e) => setTargetDraft(parseInt(e.target.value || "5", 10))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Quick picks</div>
                      <div className="flex flex-wrap gap-1.5">
                        {TARGET_PRESETS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setTargetDraft(n)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                              targetDraft === n
                                ? "border-sky-500 bg-sky-50 text-sky-700"
                                : "border-slate-200 text-slate-600 hover:border-sky-300",
                            )}
                          >
                            {n} words
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTargetOpen(false)}>Cancel</Button>
                    <Button onClick={saveDailyTarget}>Save target</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative h-32 w-32">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={ringR} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" className="text-sky-100" />
                <circle
                  cx="50" cy="50" r={ringR} fill="none"
                  stroke="url(#ringGrad)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-heading text-2xl font-bold text-slate-900">{readTodayCount}<span className="text-base text-slate-400">/{dailyTarget}</span></div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{targetPct}%</div>
              </div>
            </div>

            {targetMet ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                <Crown className="h-3.5 w-3.5" /> Target smashed!
              </div>
            ) : (
              <div className="text-center text-[11px] text-slate-500">
                {dailyTarget - readTodayCount} more to lock today's streak
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WORD OF THE DAY — Featured */}
      {wotd && (
        <section className="relative overflow-hidden rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50/40 p-6 md:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-white">
                <Star className="mr-1 h-3 w-3 fill-current" /> Word of the Day
              </Badge>
              {wotd.difficulty && (
                <Badge variant="outline" className="border-amber-300 text-[10px] uppercase tracking-wide text-amber-800">
                  {wotd.difficulty}
                </Badge>
              )}
              {wotd.category && (
                <Badge variant="secondary" className="bg-white/80 text-[10px] capitalize text-slate-700">
                  {String(wotd.category).replace("_", " ")}
                </Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 className="font-heading text-4xl font-bold leading-none tracking-tight text-slate-900 md:text-5xl">
                  {wotd.word}
                </h2>
                {wotd.part_of_speech && (
                  <div className="mt-1 text-sm italic text-slate-500">{wotd.part_of_speech}</div>
                )}

                {/* Pronunciation - bigger, tap-to-play */}
                <button
                  onClick={() => speak(wotd.word)}
                  className="group mt-4 inline-flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-white/80 px-4 py-3 shadow-sm transition-all hover:scale-[1.02] hover:border-amber-400 hover:shadow-md active:scale-95"
                  aria-label={`Play pronunciation of ${wotd.word}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow group-hover:from-amber-600 group-hover:to-orange-600">
                    <Volume2 className="h-5 w-5" />
                  </span>
                  <span className="flex flex-col text-left">
                    <span className="flex flex-wrap gap-1">
                      {(wotd.pronunciation_syllables || wotd.word).split(/[-·•\s]+/).filter(Boolean).map((p: string, i: number) => (
                        <span key={i} className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-sm font-semibold text-amber-900">
                          {p}
                        </span>
                      ))}
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">Tap to play</span>
                  </span>
                </button>

                <div className="mt-4 space-y-1.5">
                  <p className="text-base leading-relaxed text-slate-800">{wotd.meaning}</p>
                  {wotd.meaning_hindi && (
                    <p className="text-sm text-slate-600">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">हिन्दी · </span>
                      {wotd.meaning_hindi}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={bookmarkIds.has(wotd.id) ? "default" : "outline"}
                  onClick={() => toggleBookmark(wotd.id)}
                  disabled={busy === wotd.id}
                  className="gap-1.5"
                >
                  <Bookmark className={`h-4 w-4 ${bookmarkIds.has(wotd.id) ? "fill-current" : ""}`} />
                  {bookmarkIds.has(wotd.id) ? "Saved" : "Save"}
                </Button>
                {!readIds.has(wotd.id) ? (
                  <Button
                    onClick={() => markRead(wotd.id)}
                    disabled={busy === wotd.id}
                    className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Read
                  </Button>
                ) : (
                  <Button variant="secondary" disabled className="gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DAILY REPORT */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-900">Today's Report</h3>
              <p className="text-xs text-slate-500">Your activity at a glance</p>
            </div>
            <TrendingUp className="h-5 w-5 text-sky-600" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ReportTile label="Read today" value={readTodayCount} accent="emerald" />
            <ReportTile label="Total read" value={totalRead} accent="sky" />
            <ReportTile label="Total saved" value={totalSaved} accent="amber" />
            <ReportTile label="New today" value={newToday.length} accent="violet" badge={newToday.length > 0 ? "NEW" : undefined} />
          </div>

          {newToday.length > 0 && (
            <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                <PlusCircle className="h-3 w-3" /> Just added today
              </div>
              <div className="flex flex-wrap gap-1.5">
                {newToday.slice(0, 8).map((w) => (
                  <Link
                    key={w.id}
                    to={`/student/vocabulary/word/${w.slug}`}
                    className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-100"
                  >
                    {w.word}
                  </Link>
                ))}
                {newToday.length > 8 && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">+{newToday.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FILTERS */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="space-y-3 p-4">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Filter className="h-3 w-3" /> Domain
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <Chip key={c.k} active={category === c.k} onClick={() => setFilter("category", c.k)}>{c.l}</Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Level</div>
            <div className="flex flex-wrap gap-1.5">
              {LEVELS.map((c) => (
                <Chip key={c.k} active={difficulty === c.k} onClick={() => setFilter("difficulty", c.k)}>{c.l}</Chip>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch id="show-read" checked={showRead} onCheckedChange={setShowRead} />
              <Label htmlFor="show-read" className="cursor-pointer text-xs text-slate-600">Show words I've marked as read</Label>
            </div>
            <span className="text-[11px] text-slate-500">{visible.length} of {words.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* FEED */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-sky-400" />
            <p className="text-slate-600">
              {readIds.size > 0
                ? "You've read every word in this filter. Switch a filter or toggle 'Show read' to revisit."
                : "No words match this filter yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((w) => {
            const isRead = readIds.has(w.id);
            const isSaved = bookmarkIds.has(w.id);
            const syllables = (w.pronunciation_syllables || w.word).split(/[-·•\s]+/).filter(Boolean);
            return (
              <Card
                key={w.id}
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl",
                  isRead && "opacity-85",
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-1",
                    isRead ? "bg-emerald-400" : "bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500",
                  )}
                />
                <CardContent className="relative flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link to={`/student/vocabulary/word/${w.slug}`} className="block">
                        <h3 className="font-heading text-3xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-sky-700 md:text-4xl">
                          {w.word}
                        </h3>
                      </Link>
                      {w.part_of_speech && (
                        <div className="mt-1 text-xs italic text-slate-500">{w.part_of_speech}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 border-sky-200 text-[10px] uppercase tracking-wide text-sky-700">
                      {w.difficulty}
                    </Badge>
                  </div>

                  {/* Pronunciation - tap to play */}
                  <button
                    onClick={() => speak(w.word)}
                    className="group/p mt-3 inline-flex items-start gap-2 self-start rounded-xl border border-sky-200 bg-sky-50/50 px-3 py-2 transition-all hover:scale-[1.02] hover:border-sky-400 hover:bg-sky-50 active:scale-95"
                    aria-label={`Play pronunciation of ${w.word}`}
                  >
                    <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                      <Volume2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex flex-col text-left">
                      <span className="flex flex-wrap gap-0.5">
                        {syllables.map((p: string, i: number) => (
                          <span key={i} className="rounded border border-sky-200 bg-white px-1.5 py-px font-mono text-[11px] font-semibold text-sky-800">
                            {p}
                          </span>
                        ))}
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700">Tap to play</span>
                    </span>
                  </button>

                  <div className="mt-4 space-y-2">
                    <p className="text-[15px] leading-relaxed text-slate-800">{w.meaning}</p>
                    {w.meaning_hindi && (
                      <p className="text-sm text-slate-600">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">HI · </span>
                        {w.meaning_hindi}
                      </p>
                    )}
                    {w.hinglish_meaning && (
                      <p className="text-xs italic text-slate-500">{w.hinglish_meaning}</p>
                    )}
                  </div>

                  {Array.isArray(w.exam_appearances) && w.exam_appearances.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-sky-600" />
                      {w.exam_appearances.slice(0, 4).map((e: string) => (
                        <Badge key={e} className="border-0 bg-sky-100 text-[10px] text-sky-700 hover:bg-sky-100">{e}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <Badge variant="secondary" className="bg-slate-100 text-[10px] capitalize text-slate-600">
                      {w.category?.replace("_", " ")}
                    </Badge>
                    <div className="flex gap-1.5">
                      <Button
                        variant={isSaved ? "default" : "outline"}
                        size="sm"
                        className="h-8 gap-1 px-3 text-xs"
                        disabled={busy === w.id}
                        onClick={() => toggleBookmark(w.id)}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                      <Button
                        variant={isRead ? "secondary" : "default"}
                        size="sm"
                        className={cn(
                          "h-8 gap-1 px-3 text-xs",
                          !isRead && "bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95",
                        )}
                        disabled={busy === w.id || isRead}
                        onClick={() => markRead(w.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isRead ? "Read" : "Mark Read"}
                      </Button>
                    </div>
                  </div>

                  <Link
                    to={`/student/vocabulary/word/${w.slug}`}
                    className="absolute right-3 top-3 hidden h-7 w-7 place-items-center rounded-full bg-white text-sky-600 opacity-0 shadow ring-1 ring-sky-100 transition-opacity group-hover:opacity-100 sm:grid"
                    aria-label="Open"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-all",
        active
          ? "border-transparent bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700",
      )}
    >
      {children}
    </button>
  );
}

const TONE: Record<string, string> = {
  orange: "from-orange-500/20 to-amber-500/5 text-orange-700",
  emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-700",
  sky: "from-sky-500/20 to-blue-500/5 text-sky-700",
  violet: "from-violet-500/20 to-fuchsia-500/5 text-violet-700",
  amber: "from-amber-500/20 to-orange-500/5 text-amber-700",
};

function StatPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: keyof typeof TONE }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-white/60 bg-gradient-to-br p-3 backdrop-blur", TONE[tone])}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-90">
        {icon} {label}
      </div>
      <div className="mt-1 font-heading text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ReportTile({ label, value, accent, badge }: { label: string; value: number; accent: keyof typeof TONE; badge?: string }) {
  return (
    <div className={cn("relative rounded-xl border border-slate-100 bg-gradient-to-br p-3", TONE[accent])}>
      {badge && (
        <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-1.5 py-px text-[9px] font-bold text-white">{badge}</span>
      )}
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
