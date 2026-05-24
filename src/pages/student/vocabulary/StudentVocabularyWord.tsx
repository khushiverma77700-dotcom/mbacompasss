import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Volume2, Bookmark, ArrowLeft, Loader2, CheckCircle2, RefreshCw, GraduationCap, Sparkles, Quote, Briefcase, Mail, MessageSquare } from "lucide-react";
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-sky-600" /></div>;
  if (!word) return (
    <div className="text-center py-12">
      <p className="text-slate-600 mb-3">Word not found.</p>
      <Link to="/student/vocabulary"><Button variant="outline">Back to Vocabulary Hub</Button></Link>
    </div>
  );

  const syllables = word.pronunciation_syllables ? word.pronunciation_syllables.split(/[-·•\s]+/).filter(Boolean) : [];

  return (
    <div className="space-y-6 pb-24">
      <Link to="/student/vocabulary" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sky-700">
        <ArrowLeft className="w-4 h-4" /> Vocabulary Hub
      </Link>

      {/* Hero card */}
      <Card className="relative overflow-hidden border-sky-100 bg-white shadow-sm">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />
        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-sky-100 text-sky-700 hover:bg-sky-100">
                  <Sparkles className="mr-1 h-3 w-3" /> {word.category?.replace("_", " ") || "Word"}
                </Badge>
                <Badge variant="outline" className="border-sky-200 capitalize text-sky-700">{word.difficulty}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">{word.word}</h1>
                <Button variant="ghost" size="icon" onClick={() => speak(word.word)} aria-label="Pronounce" className="h-10 w-10 rounded-full text-sky-600 hover:bg-sky-50">
                  <Volume2 className="h-5 w-5" />
                </Button>
                {word.part_of_speech && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium italic text-slate-600">{word.part_of_speech}</span>
                )}
              </div>

              {syllables.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Pronunciation</div>
                  <button onClick={() => speak(word.word)} className="mt-1 inline-flex flex-wrap items-center gap-1.5">
                    {syllables.map((p: string, i: number) => (
                      <span key={i} className="rounded-md border border-sky-200 bg-sky-50/70 px-2 py-0.5 text-sm font-mono font-semibold text-sky-700">
                        {p}
                      </span>
                    ))}
                    <Volume2 className="ml-1 h-3.5 w-3.5 text-sky-600" />
                  </button>
                </div>
              )}

              {word.pronunciation && !syllables.length && (
                <div className="mt-2 text-sm text-slate-500">{word.pronunciation}</div>
              )}

              {Array.isArray(word.exam_appearances) && word.exam_appearances.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                  <GraduationCap className="h-4 w-4 text-sky-600" />
                  <span className="text-xs font-medium text-slate-600">Appeared in</span>
                  {word.exam_appearances.map((e: string) => (
                    <Badge key={e} className="border-0 bg-white text-[10px] text-sky-700 shadow-sm hover:bg-white">{e}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
              <Button variant={bookmarked ? "default" : "outline"} size="sm" onClick={toggleBookmark} className="flex-1 gap-1 sm:flex-none">
                <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />{bookmarked ? "Saved" : "Save"}
              </Button>
              <Button
                size="sm"
                onClick={markLearned}
                disabled={marking || isRead}
                variant={isRead ? "secondary" : "default"}
                className={`flex-1 gap-1 sm:flex-none ${!isRead ? "bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95" : ""}`}
              >
                {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {isRead ? "Read" : "Mark Read"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meaning blocks */}
      <div className="grid gap-4 lg:grid-cols-3">
        <MeaningCard label="English" tone="sky">{word.meaning}</MeaningCard>
        <MeaningCard label="हिन्दी" tone="blue">{word.meaning_hindi || "—"}</MeaningCard>
        <MeaningCard label="Hinglish" tone="cyan" italic>{word.hinglish_meaning || "—"}</MeaningCard>
      </div>

      {/* Syn/Ant */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Synonyms</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(word.synonyms || []).length
                ? word.synonyms.map((s: string) => (
                    <Badge key={s} variant="outline" className="border-sky-200 text-sky-700">{s}</Badge>
                  ))
                : <span className="text-xs text-slate-400">—</span>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600">Antonyms</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(word.antonyms || []).length
                ? word.antonyms.map((s: string) => (
                    <Badge key={s} variant="outline" className="border-rose-200 text-rose-600">{s}</Badge>
                  ))
                : <span className="text-xs text-slate-400">—</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Examples */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">In Context</div>
              <h3 className="font-heading text-lg font-semibold text-slate-900">Example Sentences</h3>
            </div>
            <Button variant="outline" size="sm" onClick={enrichAI} disabled={marking} className="gap-1 border-sky-200 text-sky-700 hover:bg-sky-50">
              {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Enrich with AI
            </Button>
          </div>
          <Tabs defaultValue="business">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="business" className="gap-1 data-[state=active]:bg-white"><Briefcase className="h-3.5 w-3.5" /> Business</TabsTrigger>
              <TabsTrigger value="interview" className="gap-1 data-[state=active]:bg-white"><MessageSquare className="h-3.5 w-3.5" /> Interview</TabsTrigger>
              <TabsTrigger value="email" className="gap-1 data-[state=active]:bg-white"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
            </TabsList>
            <TabsContent value="business" className="pt-3"><ExampleQuote text={word.example_business} /></TabsContent>
            <TabsContent value="interview" className="pt-3"><ExampleQuote text={word.example_interview} /></TabsContent>
            <TabsContent value="email" className="pt-3"><ExampleQuote text={word.example_email} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function MeaningCard({ label, tone, italic, children }: any) {
  const grad = tone === "sky" ? "from-sky-500 to-cyan-500"
    : tone === "blue" ? "from-blue-500 to-indigo-500"
    : "from-cyan-500 to-teal-500";
  return (
    <Card className="relative overflow-hidden border-slate-200">
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${grad}`} />
      <CardContent className="p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
        <p className={`mt-1.5 text-[15px] leading-relaxed text-slate-800 ${italic ? "italic" : ""}`}>{children}</p>
      </CardContent>
    </Card>
  );
}

function ExampleQuote({ text }: { text?: string }) {
  if (!text) return <p className="text-sm text-slate-400">No example yet. Use "Enrich with AI" to generate one.</p>;
  return (
    <blockquote className="relative rounded-xl border-l-2 border-sky-400 bg-sky-50/40 px-5 py-4 text-sm italic leading-relaxed text-slate-700">
      <Quote className="absolute -left-1 -top-2 h-5 w-5 text-sky-300" />
      {text}
    </blockquote>
  );
}
