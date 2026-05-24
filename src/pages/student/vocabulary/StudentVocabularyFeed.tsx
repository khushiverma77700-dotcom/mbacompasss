import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Loader2 } from "lucide-react";

export default function StudentVocabularyFeed() {
  const [params, setParams] = useSearchParams();
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const category = params.get("category") || "all";
  const difficulty = params.get("difficulty") || "all";

  document.title = "Vocabulary Feed | MBA Compass";

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("vocab_words").select("*").order("created_at", { ascending: false }).limit(60);
      if (category !== "all") q = q.eq("category", category);
      if (difficulty !== "all") q = q.eq("difficulty", difficulty);
      const { data } = await q;
      setWords(data || []);
      setLoading(false);
    })();
  }, [category, difficulty]);

  const setFilter = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v === "all") p.delete(k); else p.set(k, v);
    setParams(p);
  };

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Daily Vocabulary Feed</h1>
        <p className="text-sm text-muted-foreground">Swipe through MBA-grade vocabulary. Tap any word for AI examples.</p>
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
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : words.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No words match this filter yet.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {words.map((w) => (
            <Link key={w.id} to={`/student/vocabulary/word/${w.slug}`}>
              <Card className="hover:-translate-y-0.5 transition-all hover:border-primary/40 h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-bold text-lg text-foreground">{w.word}</h3>
                      {w.part_of_speech && <p className="text-[11px] italic text-muted-foreground">{w.part_of_speech}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{w.difficulty}</Badge>
                  </div>
                  <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{w.meaning}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="secondary" className="text-[10px] capitalize">{w.category.replace("_", " ")}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
