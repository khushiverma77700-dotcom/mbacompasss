import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Volume2, Bookmark, ArrowLeft, Loader2, CheckCircle2, RefreshCw, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentVocabularyWord() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [word, setWord] = useState<any>(null);
  const [isRead, setIsRead] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("vocab_words").select("*").eq("slug", slug).maybeSingle();
    if (data) {
      setWord(data);
      document.title = `${data.word} — MBA Vocabulary`;
      if (user) {
        const { data: bm } = await supabase.from("vocab_bookmarks").select("id").eq("user_id", user.id).eq("word_id", data.id).maybeSingle();
        setBookmarked(!!bm);
        const { data: prog } = await supabase.from("vocab_progress").select("is_read").eq("user_id", user.id).eq("word_id", data.id).maybeSingle();
        setIsRead(!!prog?.is_read);
      }
    }
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { load(); }, [load]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    speechSynthesis.speak(u);
  };

  const toggleBookmark = async () => {
    if (!user || !word) return;
    if (bookmarked) {
      await supabase.from("vocab_bookmarks").delete().eq("user_id", user.id).eq("word_id", word.id);
      setBookmarked(false);
    } else {
      await supabase.from("vocab_bookmarks").insert({ user_id: user.id, word_id: word.id });
      setBookmarked(true);
      toast({ title: "Saved" });
    }
  };

  const markLearned = async () => {
    if (!user || !word) return;
    setMarking(true);
    await supabase.rpc("vocab_mark_read", { _word_id: word.id, _read: true });
    await supabase.rpc("vocab_update_progress", { _word_id: word.id, _correct: true });
    await supabase.rpc("award_vocab_xp", { _xp: 5, _activity_today: true });
    setIsRead(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data: g } = await supabase.from("vocab_daily_goals").select("*").eq("user_id", user.id).eq("on_date", today).maybeSingle();
    if (g) await supabase.from("vocab_daily_goals").update({ words_done: (g.words_done || 0) + 1 }).eq("user_id", user.id).eq("on_date", today);
    else await supabase.from("vocab_daily_goals").insert({ user_id: user.id, on_date: today, words_done: 1 });
    toast({ title: "+5 XP", description: "Marked as read" });
    setMarking(false);
  };

  const enrichAI = async () => {
    if (!word) return;
    setMarking(true);
    try {
      const { data } = await supabase.functions.invoke("vocab-explain", { body: { word: word.word, save: true } });
      if (data?.word) setWord(data.word);
      toast({ title: "Updated with AI examples" });
    } catch (e: any) {
      toast({ title: "AI error", description: e.message, variant: "destructive" });
    }
    setMarking(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!word) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-3">Word not found.</p>
      <Link to="/student/vocabulary"><Button variant="outline">Back to Vocabulary Hub</Button></Link>
    </div>
  );

  return (
    <div className="space-y-5 pb-20">
      <Link to="/student/vocabulary" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Vocabulary Hub
      </Link>

      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">{word.word}</h1>
                <Button variant="ghost" size="icon" onClick={() => speak(word.word)} aria-label="Pronounce"><Volume2 className="w-4 h-4" /></Button>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {word.part_of_speech && <span className="text-xs italic text-muted-foreground">{word.part_of_speech}</span>}
                {word.pronunciation_syllables && (
                  <button onClick={() => speak(word.word)} className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium">
                    <Volume2 className="w-3 h-3" />{word.pronunciation_syllables}
                  </button>
                )}
                {word.pronunciation && <span className="text-xs text-muted-foreground">{word.pronunciation}</span>}
                <Badge variant="outline" className="text-[10px] capitalize">{word.difficulty}</Badge>
                <Badge variant="secondary" className="text-[10px] capitalize">{word.category?.replace("_", " ")}</Badge>
              </div>
              {Array.isArray(word.exam_appearances) && word.exam_appearances.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Appeared in:</span>
                  {word.exam_appearances.map((e: string) => (
                    <Badge key={e} className="text-[10px] bg-primary/10 text-primary hover:bg-primary/15 border-0">{e}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant={bookmarked ? "default" : "outline"} size="sm" onClick={toggleBookmark} className="gap-1">
                <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />{bookmarked ? "Saved" : "Save as Important"}
              </Button>
              <Button size="sm" onClick={markLearned} disabled={marking || isRead} variant={isRead ? "secondary" : "default"} className="gap-1">
                {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {isRead ? "Read" : "Mark as Read"}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">English</span>
              <p className="text-foreground text-base">{word.meaning}</p>
            </div>
            {word.meaning_hindi && (
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Hindi</span>
                <p className="text-foreground text-base">{word.meaning_hindi}</p>
              </div>
            )}
            {word.hinglish_meaning && (
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Hinglish</span>
                <p className="text-sm text-foreground/80 italic">{word.hinglish_meaning}</p>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Synonyms</h4>
              <div className="flex flex-wrap gap-1">
                {(word.synonyms || []).length ? word.synonyms.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Antonyms</h4>
              <div className="flex flex-wrap gap-1">
                {(word.antonyms || []).length ? word.antonyms.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-foreground">Example Sentences</h3>
            <Button variant="outline" size="sm" onClick={enrichAI} disabled={marking} className="gap-1">
              {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Enrich with AI
            </Button>
          </div>
          <Tabs defaultValue="business">
            <TabsList>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="interview">Interview</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>
            <TabsContent value="business" className="pt-3 italic text-foreground/90">{word.example_business || "—"}</TabsContent>
            <TabsContent value="interview" className="pt-3 italic text-foreground/90">{word.example_interview || "—"}</TabsContent>
            <TabsContent value="email" className="pt-3 italic text-foreground/90">{word.example_email || "—"}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
