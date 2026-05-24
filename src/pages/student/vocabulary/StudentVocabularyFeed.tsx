import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Bookmark, Loader2, Volume2, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Daily Vocabulary Feed</h1>
        <p className="text-sm text-muted-foreground">MBA-grade vocabulary with Hindi meaning, syllable pronunciation, and past-exam tags.</p>
      </div>

      <div className="space-y-2">
        <Tabs value={category} onValueChange={(v) => setFilter("category", v)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="consulting">Consulting</TabsTrigger>
            <TabsTrigger value="hr">HR</TabsTrigger>
            <TabsTrigger value="economics">Economics</TabsTrigger>
            <TabsTrigger value="corp_comm">Corp Comm</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={difficulty} onValueChange={(v) => setFilter("difficulty", v)}>
          <TabsList>
            <TabsTrigger value="all">All Levels</TabsTrigger>
            <TabsTrigger value="beginner">Beginner</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
            <TabsTrigger value="cat">CAT</TabsTrigger>
            <TabsTrigger value="gdpi">GDPI</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Switch id="show-read" checked={showRead} onCheckedChange={setShowRead} />
            <Label htmlFor="show-read" className="text-xs text-muted-foreground cursor-pointer">Show words I already marked as read</Label>
          </div>
          <span className="text-xs text-muted-foreground">{visible.length} words</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          {readIds.size > 0 ? "You've read every word in this filter. Switch a filter or toggle 'Show read' to revisit." : "No words match this filter yet."}
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {visible.map((w) => {
            const isRead = readIds.has(w.id);
            const isSaved = bookmarkIds.has(w.id);
            return (
              <Card key={w.id} className={`transition-all h-full flex flex-col ${isRead ? "opacity-70 border-emerald-200" : "hover:border-primary/40"}`}>
                <CardContent className="pt-5 pb-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/student/vocabulary/word/${w.slug}`} className="hover:underline">
                        <h3 className="font-heading font-bold text-lg text-foreground">{w.word}</h3>
                      </Link>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {w.part_of_speech && <span className="text-[11px] italic text-muted-foreground">{w.part_of_speech}</span>}
                        {w.pronunciation_syllables && (
                          <button onClick={() => speak(w.word)} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                            <Volume2 className="w-3 h-3" />{w.pronunciation_syllables}
                          </button>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">{w.difficulty}</Badge>
                  </div>

                  <p className="text-sm text-foreground/90 mt-2"><span className="font-medium">EN: </span>{w.meaning}</p>
                  {w.meaning_hindi && <p className="text-sm text-foreground/80 mt-1"><span className="font-medium">HI: </span>{w.meaning_hindi}</p>}
                  {w.hinglish_meaning && <p className="text-xs text-muted-foreground mt-1 italic">{w.hinglish_meaning}</p>}

                  {Array.isArray(w.exam_appearances) && w.exam_appearances.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-2">
                      <GraduationCap className="w-3 h-3 text-primary" />
                      {w.exam_appearances.slice(0, 4).map((e: string) => (
                        <Badge key={e} className="text-[10px] bg-primary/10 text-primary hover:bg-primary/15 border-0">{e}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
                    <Badge variant="secondary" className="text-[10px] capitalize">{w.category?.replace("_", " ")}</Badge>
                    <div className="flex gap-1.5">
                      <Button
                        variant={isSaved ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={busy === w.id}
                        onClick={() => toggleBookmark(w.id)}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
                        {isSaved ? "Saved" : "Important"}
                      </Button>
                      <Button
                        variant={isRead ? "secondary" : "default"}
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={busy === w.id || isRead}
                        onClick={() => markRead(w.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isRead ? "Read" : "Mark Read"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
