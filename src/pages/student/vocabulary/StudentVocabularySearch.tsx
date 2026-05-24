import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentVocabularySearch() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  document.title = "Vocabulary Search | MBA Compass";

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setAiResult(null);
    const { data } = await supabase.from("vocab_words").select("*").ilike("word", `%${query.trim()}%`).limit(20);
    setResults(data || []);
    setSearching(false);
    if (!data || data.length === 0) askAI();
  };

  const askAI = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vocab-explain", { body: { word: query.trim(), save: true } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiResult(data.word);
    } catch (e: any) {
      toast({ title: "AI search failed", description: e.message, variant: "destructive" });
    }
    setAiLoading(false);
  };

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Smart Vocabulary Search</h1>
        <p className="text-sm text-muted-foreground">Search the library or let AI explain any new word instantly.</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a word, e.g. arbitrage" onKeyDown={(e) => e.key === "Enter" && doSearch()} />
            <Button onClick={doSearch} disabled={searching} className="gap-1">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">From library ({results.length})</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {results.map((w) => (
              <Link key={w.id} to={`/student/vocabulary/word/${w.slug}`}>
                <Card className="hover:border-primary/40 transition-all">
                  <CardContent className="pt-4 pb-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground">{w.word}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{w.meaning}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !searching && query && !aiResult && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-3">No exact matches. Try AI explanation.</p>
            <Button onClick={askAI} disabled={aiLoading} className="gap-1">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Ask AI
            </Button>
          </CardContent>
        </Card>
      )}

      {aiResult && (
        <Card className="border-primary/20">
          <CardContent className="pt-5">
            <Badge variant="secondary" className="mb-2 gap-1"><Sparkles className="w-3 h-3" /> AI Explanation</Badge>
            <h3 className="font-heading text-2xl font-bold text-foreground">{aiResult.word}</h3>
            <p className="text-foreground mt-2">{aiResult.meaning}</p>
            {aiResult.hinglish_meaning && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Hinglish:</span> {aiResult.hinglish_meaning}</p>}
            {aiResult.example_business && <p className="text-sm italic text-foreground/80 mt-3 border-l-2 border-primary/40 pl-3">{aiResult.example_business}</p>}
            <Link to={`/student/vocabulary/word/${aiResult.slug}`}>
              <Button size="sm" variant="outline" className="mt-3">Open full word page</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
