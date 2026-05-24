import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Bookmark, Loader2, Volume2, GraduationCap, BookOpen, Filter, Sparkles, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATS = [
  { k: "all", l: "All" },
  { k: "finance", l: "Finance" },
  { k: "marketing", l: "Marketing" },
  { k: "consulting", l: "Consulting" },
  { k: "hr", l: "HR" },
  { k: "economics", l: "Economics" },
  { k: "corp_comm", l: "Corp Comm" },
];

const LEVELS = [
  { k: "all", l: "All Levels" },
  { k: "beginner", l: "Beginner" },
  { k: "intermediate", l: "Intermediate" },
  { k: "cat", l: "CAT" },
  { k: "gdpi", l: "GDPI" },
];

export default function StudentVocabularyFeed() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [words, setWords] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [showRead, setShowRead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const category = params.get("category") || "all";
  const difficulty = params.get("difficulty") || "all";

  document.title = "Vocabulary Feed | MBA Compass";

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("vocab_words").select("*").order("created_at", { ascending: false }).limit(120);
    if (category !== "all") q = q.eq("category", category as any);
    if (difficulty !== "all") q = q.eq("difficulty", difficulty as any);
    const { data } = await q;
    setWords(data || []);

    if (user) {
      const { data: prog } = await supabase.from("vocab_progress").select("word_id,is_read").eq("user_id", user.id).eq("is_read", true);
      setReadIds(new Set((prog || []).map((p: any) => p.word_id)));
      const { data: bm } = await supabase.from("vocab_bookmarks").select("word_id").eq("user_id", user.id);
      setBookmarkIds(new Set((bm || []).map((b: any) => b.word_id)));
    }
    setLoading(false);
  }, [category, difficulty, user]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v === "all") p.delete(k); else p.set(k, v);
    setParams(p);
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
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

  const visible = showRead ? words : words.filter((w) => !readIds.has(w.id));
  const totalRead = readIds.size;
  const totalSaved = bookmarkIds.size;

  return (
    <div className="space-y-6 pb-24">
      {/* Header banner */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/60 to-blue-50/40 px-6 py-6 md:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700 backdrop-blur">
              <Sparkles className="h-3 w-3" /> Daily Feed
            </div>
            <h1 className="font-heading mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Today's Vocabulary</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              MBA-grade words with Hindi meaning, syllable pronunciation and past-exam tags. Mark as read to keep the feed fresh.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="rounded-xl border border-sky-100 bg-white/70 px-3 py-2 text-center backdrop-blur">
              <div className="font-heading text-base font-bold text-slate-900">{totalRead}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Read</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-white/70 px-3 py-2 text-center backdrop-blur">
              <div className="font-heading text-base font-bold text-slate-900">{totalSaved}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Saved</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-white/70 px-3 py-2 text-center backdrop-blur">
              <div className="font-heading text-base font-bold text-slate-900">{visible.length}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">In feed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter bar */}
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

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-slate-100" />
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((w) => {
            const isRead = readIds.has(w.id);
            const isSaved = bookmarkIds.has(w.id);
            const syllables = w.pronunciation_syllables ? w.pronunciation_syllables.split(/[-·•\s]+/).filter(Boolean) : [];
            return (
              <Card
                key={w.id}
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg",
                  isRead && "opacity-80"
                )}
              >
                <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5", isRead ? "bg-emerald-400" : "bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500")} />
                <CardContent className="relative flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/student/vocabulary/word/${w.slug}`} className="block">
                        <h3 className="font-heading text-xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-sky-700">{w.word}</h3>
                      </Link>
                      {w.part_of_speech && (
                        <div className="mt-0.5 text-[11px] italic text-slate-500">{w.part_of_speech}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 border-sky-200 text-[10px] uppercase tracking-wide text-sky-700">
                      {w.difficulty}
                    </Badge>
                  </div>

                  {syllables.length > 0 && (
                    <button onClick={() => speak(w.word)} className="mt-2 inline-flex items-center gap-1 self-start">
                      <Volume2 className="h-3 w-3 text-sky-600" />
                      <span className="flex flex-wrap gap-0.5">
                        {syllables.map((p: string, i: number) => (
                          <span key={i} className="rounded border border-sky-200 bg-sky-50/60 px-1.5 py-px text-[10px] font-mono font-medium text-sky-700">{p}</span>
                        ))}
                      </span>
                    </button>
                  )}

                  <div className="mt-3 space-y-1.5">
                    <p className="text-sm leading-relaxed text-slate-800">{w.meaning}</p>
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

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <Badge variant="secondary" className="bg-slate-100 text-[10px] capitalize text-slate-600">
                      {w.category?.replace("_", " ")}
                    </Badge>
                    <div className="flex gap-1.5">
                      <Button
                        variant={isSaved ? "default" : "outline"}
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
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
                          "h-7 gap-1 px-2 text-xs",
                          !isRead && "bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95"
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
          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
      )}
    >
      {children}
    </button>
  );
}
