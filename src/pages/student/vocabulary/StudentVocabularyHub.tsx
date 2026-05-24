import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, Flame, Trophy, Sparkles, Volume2, Bookmark, Brain,
  Target, ArrowUpRight, Layers, Search, LineChart, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentVocabularyHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wotd, setWotd] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [dueCount, setDueCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [totalLearned, setTotalLearned] = useState(0);

  document.title = "B-School Vocabulary | MBA Compass";

  const load = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const [w, s, g, d, learned] = await Promise.all([
      supabase.from("vocab_word_of_day").select("word_id, vocab_words(*)").eq("on_date", today).maybeSingle(),
      supabase.from("vocab_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("vocab_daily_goals").select("*").eq("user_id", user.id).eq("on_date", today).maybeSingle(),
      supabase.from("vocab_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).lte("next_review_at", new Date().toISOString()),
      supabase.from("vocab_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", true),
    ]);

    setWotd((w.data as any)?.vocab_words || null);
    setStreak(s.data || { current_streak: 0, longest_streak: 0, total_xp: 0, level: 1 });

    if (!g.data) {
      await supabase.from("vocab_daily_goals").insert({ user_id: user.id, on_date: today, words_target: 5, quiz_target: 10 });
      setGoal({ words_target: 5, words_done: 0, quiz_target: 10, quiz_done: 0 });
    } else {
      setGoal(g.data);
    }

    setDueCount(d.count || 0);
    setTotalLearned(learned.count || 0);

    if ((w.data as any)?.word_id) {
      const { data: bm } = await supabase.from("vocab_bookmarks").select("id").eq("user_id", user.id).eq("word_id", (w.data as any).word_id).maybeSingle();
      setBookmarked(!!bm);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    speechSynthesis.speak(u);
  };

  const toggleBookmark = async () => {
    if (!user || !wotd) return;
    if (bookmarked) {
      await supabase.from("vocab_bookmarks").delete().eq("user_id", user.id).eq("word_id", wotd.id);
      setBookmarked(false);
    } else {
      await supabase.from("vocab_bookmarks").insert({ user_id: user.id, word_id: wotd.id });
      setBookmarked(true);
      toast({ title: "Saved to your revision list" });
    }
  };

  const wordProgress = goal ? Math.min(100, Math.round((goal.words_done / Math.max(goal.words_target, 1)) * 100)) : 0;
  const xp = streak?.total_xp || 0;
  const level = streak?.level || 1;
  const currentStreak = streak?.current_streak || 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Hero — clean, single CTA */}
      <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-blue-50/40 shadow-[0_8px_30px_-12px_rgba(56,118,191,0.18)]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative px-5 py-7 sm:px-8 sm:py-9 md:px-10 md:py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-700 backdrop-blur">
            <Sparkles className="h-3 w-3" /> B-School Vocabulary
          </div>
          <h1 className="font-heading mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
            Learn 5 new MBA words today.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 md:text-base">
            One simple feed. Tap a word, hear it, save it. Daily streak builds your CAT &amp; GDPI verbal muscle.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link to="/student/vocabulary/feed">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-sky-600 to-blue-600 shadow-md hover:opacity-95">
                <BookOpen className="h-4 w-4" /> Start Learning
              </Button>
            </Link>
            <Link to="/student/vocabulary/quiz">
              <Button size="lg" variant="outline" className="gap-2 border-sky-200 bg-white/70 backdrop-blur">
                <Brain className="h-4 w-4" /> Quick Quiz
              </Button>
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <HeroStat icon={Flame} tint="text-orange-500" label="Streak" value={`${currentStreak}d`} hint={`Best ${streak?.longest_streak || 0}`} />
            <HeroStat icon={Trophy} tint="text-amber-500" label="Total XP" value={xp.toLocaleString()} hint={`Level ${level}`} />
            <HeroStat icon={BookOpen} tint="text-sky-600" label="Learned" value={totalLearned} hint="words" />
            <HeroStat icon={Brain} tint="text-blue-600" label="Due" value={dueCount} hint="Revise" />
          </div>
        </div>
      </section>

      {/* Today's progress bar */}
      <Card className="border-sky-100 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-slate-900">Today's goal</h3>
                <p className="text-[11px] text-slate-500">Learn {goal?.words_target || 5} new words</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-700">{goal?.words_done || 0}/{goal?.words_target || 5}</span>
          </div>
          <Progress value={wordProgress} className="mt-3 h-2.5" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">{wordProgress}% complete</span>
            <Link to="/student/vocabulary/feed" className="text-[11px] font-semibold text-sky-700 hover:underline inline-flex items-center gap-0.5">
              Open feed <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Word of the Day */}
      {wotd && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative overflow-hidden border-sky-100 bg-white shadow-sm">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500" />
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-100/70 blur-3xl" />
            <CardContent className="relative p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1 border-0 bg-sky-100 text-sky-700 hover:bg-sky-100">
                  <Sparkles className="h-3 w-3" /> Word of the Day
                </Badge>
                <span className="text-[11px] text-slate-500">{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2 sm:gap-3">
                <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl break-words">{wotd.word}</h2>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-sky-600 hover:bg-sky-50" onClick={() => speak(wotd.word)} aria-label="Pronounce">
                  <Volume2 className="h-4 w-4" />
                </Button>
                {wotd.part_of_speech && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium italic text-slate-600">{wotd.part_of_speech}</span>
                )}
              </div>

              <div className="mt-4 space-y-1.5">
                <p className="text-[15px] leading-relaxed text-slate-800">{wotd.meaning}</p>
                {wotd.meaning_hindi && (
                  <p className="text-sm text-slate-700"><span className="font-medium text-slate-500">हिन्दी · </span>{wotd.meaning_hindi}</p>
                )}
                {wotd.hinglish_meaning && (
                  <p className="text-sm italic text-slate-500">{wotd.hinglish_meaning}</p>
                )}
              </div>

              {wotd.example_business && (
                <blockquote className="mt-4 rounded-xl border-l-2 border-sky-400 bg-sky-50/50 px-4 py-3 text-sm italic text-slate-700">
                  "{wotd.example_business}"
                </blockquote>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant={bookmarked ? "default" : "outline"} size="sm" onClick={toggleBookmark} className="gap-1">
                  <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} /> {bookmarked ? "Saved" : "Save"}
                </Button>
                <Link to={`/student/vocabulary/word/${wotd.slug}`}>
                  <Button size="sm" variant="ghost" className="gap-1 text-sky-700 hover:bg-sky-50">
                    Deep dive <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* Quick toolkit */}
      <section>
        <div className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Your toolkit</div>
          <h2 className="font-heading text-xl font-bold text-slate-900">Practice &amp; track</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ToolCard to="/student/vocabulary/revision" icon={Layers} label="Revision" sub={`${dueCount} due`} />
          <ToolCard to="/student/vocabulary/bookmarks" icon={Bookmark} label="Saved" sub="Your list" />
          <ToolCard to="/student/vocabulary/search" icon={Search} label="Search" sub="Any word" />
          <ToolCard to="/student/vocabulary/leaderboard" icon={Trophy} label="Leaderboard" sub="Top XP" />
        </div>
      </section>
    </div>
  );
}

function HeroStat({ icon: Icon, tint, label, value, hint }: any) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-3.5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <Icon className={`h-3.5 w-3.5 ${tint}`} /> {label}
      </div>
      <div className="font-heading mt-1 text-xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

function ToolCard({ to, icon: Icon, label, sub }: any) {
  return (
    <Link to={to} className="group">
      <Card className="h-full border-slate-200 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
        <CardContent className="p-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="font-heading mt-3 text-sm font-semibold text-slate-900">{label}</div>
          <div className="text-[11px] text-slate-500">{sub}</div>
          <div className="mt-2 inline-flex items-center text-[11px] font-medium text-sky-700 opacity-0 transition-opacity group-hover:opacity-100">
            Open <ChevronRight className="ml-0.5 h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
