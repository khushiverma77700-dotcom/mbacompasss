import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Flame, Trophy, Sparkles, Volume2, Bookmark, Search, Brain, Target, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { key: "finance", label: "Finance" },
  { key: "marketing", label: "Marketing" },
  { key: "consulting", label: "Consulting" },
  { key: "hr", label: "HR" },
  { key: "economics", label: "Economics" },
  { key: "corp_comm", label: "Corp Comm" },
];

const DIFFICULTIES = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "cat", label: "CAT Level" },
  { key: "gdpi", label: "GDPI Level" },
];

export default function StudentVocabularyHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wotd, setWotd] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  document.title = "B-School Vocabulary Hub | MBA Compass";

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);
    const [w, s, g, d, b] = await Promise.all([
      supabase.from("vocab_word_of_day").select("word_id, vocab_words(*)").eq("on_date", today).maybeSingle(),
      supabase.from("vocab_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("vocab_daily_goals").select("*").eq("user_id", user.id).eq("on_date", today).maybeSingle(),
      supabase.from("vocab_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).lte("next_review_at", new Date().toISOString()),
      null,
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

    if ((w.data as any)?.word_id) {
      const { data: bm } = await supabase.from("vocab_bookmarks").select("id").eq("user_id", user.id).eq("word_id", (w.data as any).word_id).maybeSingle();
      setBookmarked(!!bm);
    }

    setLoading(false);
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

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" /> B-School Vocabulary Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Build MBA-grade vocabulary with AI explanations, spaced repetition, and daily quizzes.</p>
        </div>
        <Link to="/student/vocabulary/search">
          <Button variant="outline" size="sm" className="gap-1"><Search className="w-4 h-4" /> Smart Search</Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Flame} label="Streak" value={`${streak?.current_streak || 0} days`} hint={`Best: ${streak?.longest_streak || 0}`} />
        <StatCard icon={Trophy} label="XP" value={streak?.total_xp || 0} hint={`Level ${streak?.level || 1}`} />
        <StatCard icon={Brain} label="Due Today" value={dueCount} hint="Spaced repetition" />
        <StatCard icon={Target} label="Daily Goal" value={`${goal?.words_done || 0}/${goal?.words_target || 5}`} hint="Words" />
      </div>

      {/* Word of the Day */}
      {wotd && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-sky-50/50 to-background">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
            <CardContent className="pt-6 relative">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <Badge variant="secondary" className="mb-2 gap-1"><Sparkles className="w-3 h-3" /> Word of the Day</Badge>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">{wotd.word}</h2>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => speak(wotd.word)} aria-label="Pronounce">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    {wotd.pronunciation && <span className="text-xs text-muted-foreground">{wotd.pronunciation}</span>}
                  </div>
                  {wotd.part_of_speech && <p className="text-xs italic text-muted-foreground mt-1">{wotd.part_of_speech}</p>}
                  <p className="text-foreground mt-3 max-w-2xl">{wotd.meaning}</p>
                  {wotd.hinglish_meaning && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Hinglish:</span> {wotd.hinglish_meaning}</p>}
                  {wotd.example_business && (
                    <p className="text-sm text-foreground/80 mt-3 italic border-l-2 border-primary/40 pl-3">"{wotd.example_business}"</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant={bookmarked ? "default" : "outline"} size="sm" onClick={toggleBookmark} className="gap-1">
                    <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} /> {bookmarked ? "Saved" : "Save"}
                  </Button>
                  <Link to={`/student/vocabulary/word/${wotd.slug}`}>
                    <Button size="sm" variant="ghost" className="gap-1 w-full">View <ChevronRight className="w-4 h-4" /></Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Daily progress */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">Words today</h3>
              <span className="text-xs text-muted-foreground">{goal?.words_done || 0}/{goal?.words_target || 5}</span>
            </div>
            <Progress value={wordProgress} />
            <Link to="/student/vocabulary/feed"><Button size="sm" variant="outline" className="mt-3 w-full">Open Daily Feed</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">Quiz today</h3>
              <span className="text-xs text-muted-foreground">{goal?.quiz_done || 0}/{goal?.quiz_target || 10}</span>
            </div>
            <Progress value={quizProgress} />
            <Link to="/student/vocabulary/quiz"><Button size="sm" className="mt-3 w-full">Start Daily Quiz</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink to="/student/vocabulary/revision" icon={Brain} label="Revision Deck" sub={`${dueCount} due`} />
        <QuickLink to="/student/vocabulary/bookmarks" icon={Bookmark} label="My Saved Words" sub="Flashcards" />
        <QuickLink to="/student/vocabulary/leaderboard" icon={Trophy} label="Leaderboard" sub="Compete" />
        <QuickLink to="/student/vocabulary/analytics" icon={Sparkles} label="My Analytics" sub="Progress" />
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Browse by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map(c => (
            <Link key={c.key} to={`/student/vocabulary/feed?category=${c.key}`}>
              <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5">
                <CardContent className="pt-5 pb-5 flex items-center justify-between">
                  <span className="font-medium text-foreground">{c.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Browse by Difficulty</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DIFFICULTIES.map(d => (
            <Link key={d.key} to={`/student/vocabulary/feed?difficulty=${d.key}`}>
              <Card className="hover:border-primary/40 transition-all">
                <CardContent className="pt-5 pb-5 text-center">
                  <span className="font-medium text-foreground">{d.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="w-4 h-4" /> {label}</div>
        <div className="font-heading font-bold text-xl text-foreground mt-1">{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function QuickLink({ to, icon: Icon, label, sub }: any) {
  return (
    <Link to={to}>
      <Card className="hover:-translate-y-0.5 transition-all hover:border-primary/40 h-full">
        <CardContent className="pt-4 pb-4">
          <Icon className="w-5 h-5 text-primary mb-2" />
          <div className="font-semibold text-sm text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
