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
  BookOpen, Flame, Trophy, Sparkles, Volume2, Bookmark, Search, Brain,
  Target, ChevronRight, ArrowUpRight, GraduationCap, Layers, Briefcase,
  Megaphone, LineChart, Users, Globe2, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { key: "finance", label: "Finance", icon: LineChart, accent: "from-sky-500/15 to-sky-500/0" },
  { key: "marketing", label: "Marketing", icon: Megaphone, accent: "from-blue-500/15 to-blue-500/0" },
  { key: "consulting", label: "Consulting", icon: Briefcase, accent: "from-cyan-500/15 to-cyan-500/0" },
  { key: "hr", label: "Human Resources", icon: Users, accent: "from-indigo-400/15 to-indigo-400/0" },
  { key: "economics", label: "Economics", icon: Globe2, accent: "from-sky-400/15 to-sky-400/0" },
  { key: "corp_comm", label: "Corporate Comm.", icon: MessageSquare, accent: "from-blue-400/15 to-blue-400/0" },
];

const DIFFICULTIES = [
  { key: "beginner", label: "Beginner", hint: "Foundations" },
  { key: "intermediate", label: "Intermediate", hint: "B-school core" },
  { key: "cat", label: "CAT Level", hint: "Verbal mastery" },
  { key: "gdpi", label: "GDPI Level", hint: "Interview ready" },
];

export default function StudentVocabularyHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wotd, setWotd] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [dueCount, setDueCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [totalLearned, setTotalLearned] = useState(0);

  document.title = "B-School Vocabulary Hub | MBA Compass";

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
  const quizProgress = goal ? Math.min(100, Math.round((goal.quiz_done / Math.max(goal.quiz_target, 1)) * 100)) : 0;
  const xp = streak?.total_xp || 0;
  const level = streak?.level || 1;
  const xpInLevel = xp % 500;
  const xpProgress = Math.round((xpInLevel / 500) * 100);

  return (
    <div className="space-y-8 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/60 to-blue-50/40 shadow-[0_8px_30px_-12px_rgba(56,118,191,0.18)]">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px", color: "#1e3a8a" }} />

        <div className="relative px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-sky-700 backdrop-blur">
                <Sparkles className="h-3 w-3" /> B-School Vocabulary
              </div>
              <h1 className="font-heading mt-3 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                Speak like a strategist.<br className="hidden md:block" />
                <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Read like a CEO.</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600 md:text-base">
                Curated MBA-grade words with native pronunciation, Hindi & Hinglish meaning, past-exam tagging and spaced-repetition revision.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/student/vocabulary/feed">
                  <Button size="sm" className="gap-1 bg-gradient-to-r from-sky-600 to-blue-600 shadow-md hover:opacity-95">
                    <BookOpen className="h-4 w-4" /> Open Daily Feed
                  </Button>
                </Link>
                <Link to="/student/vocabulary/quiz">
                  <Button size="sm" variant="outline" className="gap-1 border-sky-200 bg-white/70 backdrop-blur">
                    <Brain className="h-4 w-4" /> Start Today's Quiz
                  </Button>
                </Link>
                <Link to="/student/vocabulary/search">
                  <Button size="sm" variant="ghost" className="gap-1 text-slate-700">
                    <Search className="h-4 w-4" /> Smart Search
                  </Button>
                </Link>
              </div>
            </div>

            {/* Level ring */}
            <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur">
              <LevelRing percent={xpProgress} level={level} />
              <div className="text-sm">
                <div className="font-heading text-base font-semibold text-slate-900">Level {level}</div>
                <div className="text-xs text-slate-600">{xpInLevel} / 500 XP</div>
                <div className="mt-1 text-[11px] text-slate-500">{totalLearned} words learned</div>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            <HeroStat icon={Flame} tint="text-orange-500" label="Current streak" value={`${streak?.current_streak || 0}d`} hint={`Best ${streak?.longest_streak || 0}`} />
            <HeroStat icon={Trophy} tint="text-amber-500" label="Total XP" value={xp.toLocaleString()} hint={`Level ${level}`} />
            <HeroStat icon={Brain} tint="text-sky-600" label="Due to revise" value={dueCount} hint="Spaced repetition" />
            <HeroStat icon={Target} tint="text-blue-600" label="Today's goal" value={`${goal?.words_done || 0}/${goal?.words_target || 5}`} hint="Words" />
          </div>
        </div>
      </section>

      {/* Word of the Day + Daily progress */}
      <section className="grid gap-5 lg:grid-cols-3">
        {wotd && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
            <Card className="relative h-full overflow-hidden border-sky-100 bg-white shadow-sm">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500" />
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-100/70 blur-3xl" />
              <CardContent className="relative p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="gap-1 border-0 bg-sky-100 text-sky-700 hover:bg-sky-100">
                        <Sparkles className="h-3 w-3" /> Word of the Day
                      </Badge>
                      <span className="text-[11px] text-slate-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <h2 className="font-heading text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">{wotd.word}</h2>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-sky-600 hover:bg-sky-50" onClick={() => speak(wotd.word)} aria-label="Pronounce">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      {wotd.part_of_speech && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium italic text-slate-600">{wotd.part_of_speech}</span>
                      )}
                    </div>
                    {wotd.pronunciation_syllables && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {wotd.pronunciation_syllables.split(/[-·•\s]+/).filter(Boolean).map((p: string, i: number) => (
                          <span key={i} className="rounded-md border border-sky-200 bg-sky-50/70 px-2 py-0.5 text-xs font-mono font-medium text-sky-700">{p}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 space-y-1.5">
                      <p className="text-[15px] leading-relaxed text-slate-800">{wotd.meaning}</p>
                      {wotd.meaning_hindi && (
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-500">हिन्दी · </span>{wotd.meaning_hindi}
                        </p>
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

                    {Array.isArray(wotd.exam_appearances) && wotd.exam_appearances.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <GraduationCap className="h-3.5 w-3.5 text-sky-600" />
                        <span className="text-[11px] text-slate-500">Seen in</span>
                        {wotd.exam_appearances.slice(0, 5).map((e: string) => (
                          <Badge key={e} variant="outline" className="border-sky-200 text-[10px] text-sky-700">{e}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
                    <Button variant={bookmarked ? "default" : "outline"} size="sm" onClick={toggleBookmark} className="flex-1 gap-1 sm:flex-none">
                      <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} /> {bookmarked ? "Saved" : "Save"}
                    </Button>
                    <Link to={`/student/vocabulary/word/${wotd.slug}`} className="flex-1 sm:flex-none">
                      <Button size="sm" variant="ghost" className="w-full gap-1 text-sky-700 hover:bg-sky-50">
                        Deep dive <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="space-y-4">
          <GoalCard title="Words mastered" done={goal?.words_done || 0} target={goal?.words_target || 5} percent={wordProgress} tone="sky" cta="Open Feed" to="/student/vocabulary/feed" icon={BookOpen} />
          <GoalCard title="Quiz progress" done={goal?.quiz_done || 0} target={goal?.quiz_target || 10} percent={quizProgress} tone="blue" cta="Take Quiz" to="/student/vocabulary/quiz" icon={Brain} />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <SectionTitle eyebrow="Your toolkit" title="Practice & track" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickLink to="/student/vocabulary/revision" icon={Layers} label="Revision Deck" sub={`${dueCount} flashcards due`} />
          <QuickLink to="/student/vocabulary/bookmarks" icon={Bookmark} label="Saved Words" sub="Your shortlist" />
          <QuickLink to="/student/vocabulary/leaderboard" icon={Trophy} label="Leaderboard" sub="Climb the ranks" />
          <QuickLink to="/student/vocabulary/analytics" icon={LineChart} label="My Analytics" sub="Progress insights" />
        </div>
      </section>

      {/* Categories */}
      <section>
        <SectionTitle eyebrow="Curated paths" title="Browse by domain" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={`/student/vocabulary/feed?category=${c.key}`} className="group">
              <Card className="relative h-full overflow-hidden border-slate-200 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-60`} />
                <CardContent className="relative flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-sky-100">
                      <c.icon className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                      <div className="font-heading text-[15px] font-semibold text-slate-900">{c.label}</div>
                      <div className="text-[11px] text-slate-500">Explore words</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-sky-600" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Difficulty */}
      <section>
        <SectionTitle eyebrow="By proficiency" title="Pick your level" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DIFFICULTIES.map((d) => (
            <Link key={d.key} to={`/student/vocabulary/feed?difficulty=${d.key}`}>
              <Card className="h-full border-slate-200 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                <CardContent className="p-5 text-center">
                  <div className="font-heading text-[15px] font-semibold text-slate-900">{d.label}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{d.hint}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroStat({ icon: Icon, tint, label, value, hint }: any) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-3.5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <Icon className={`h-3.5 w-3.5 ${tint}`} /> {label}
      </div>
      <div className="font-heading mt-1 text-xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

function LevelRing({ percent, level }: { percent: number; level: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={r} stroke="hsl(210,40%,92%)" strokeWidth="6" fill="none" />
        <circle
          cx="36" cy="36" r={r}
          stroke="url(#lvlGrad)" strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="lvlGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Lvl</div>
          <div className="font-heading -mt-0.5 text-lg font-bold text-slate-900">{level}</div>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ title, done, target, percent, tone, cta, to, icon: Icon }: any) {
  const grad = tone === "sky"
    ? "from-sky-500 to-cyan-500"
    : "from-blue-500 to-indigo-500";
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white shadow-sm`}>
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="font-heading text-sm font-semibold text-slate-900">{title}</h3>
          </div>
          <span className="text-xs font-medium text-slate-500">{done}/{target}</span>
        </div>
        <Progress value={percent} className="mt-3 h-2" />
        <div className="mt-1 text-[11px] text-slate-500">{percent}% of today's goal</div>
        <Link to={to}>
          <Button size="sm" variant="outline" className="mt-3 w-full border-sky-200 text-sky-700 hover:bg-sky-50">{cta}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickLink({ to, icon: Icon, label, sub }: any) {
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
            Open <ArrowUpRight className="ml-0.5 h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">{eyebrow}</div>
        <h2 className="font-heading text-xl font-bold text-slate-900 md:text-2xl">{title}</h2>
      </div>
    </div>
  );
}
