import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronRight, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentVocabularyBookmarks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  document.title = "My Saved Words | MBA Compass";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("vocab_bookmarks").select("id, created_at, vocab_words(*)").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("vocab_bookmarks").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    toast({ title: "Removed" });
  };

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Saved Words</h1>
        <p className="text-sm text-muted-foreground">Your personal revision list. Tap to study or remove.</p>
      </div>

      {loading ? null : items.length === 0 ? (
        <Card><CardContent className="pt-6 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">You haven't saved any words yet.</p>
          <Link to="/student/vocabulary/feed"><Button variant="outline" className="mt-3">Browse Feed</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((it) => {
            const w = it.vocab_words;
            if (!w) return null;
            return (
              <Card key={it.id} className="hover:border-primary/40 transition-all">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/student/vocabulary/word/${w.slug}`} className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground">{w.word}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{w.meaning}</p>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => remove(it.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
