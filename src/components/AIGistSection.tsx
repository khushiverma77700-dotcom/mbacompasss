import { useState } from "react";
import { Sparkles, Send, BookOpen, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface AIGistSectionProps {
  content: string;
  pageType: "article" | "college" | "institute";
  pageId?: string;
  onScrollToContent?: () => void;
}

const AIGistSection = ({ content, pageType, pageId, onScrollToContent }: AIGistSectionProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"idle" | "summary" | "ask">("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const { toast } = useToast();

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-page-summary", {
        body: { action: "summarize", content, pageType, pageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary);
      setMode("summary");
    } catch (e: any) {
      toast({ title: "Couldn't generate summary", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAskLoading(true);
    setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-page-summary", {
        body: { action: "ask", content, question: question.trim(), pageType, pageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnswer(data.answer);
    } catch (e: any) {
      toast({ title: "Couldn't get answer", description: e.message, variant: "destructive" });
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 border border-primary/15 rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Get the gist fast — <span className="text-primary">B School Buzz AI</span> converts {pageType === "article" ? "articles" : "pages"} into 60-word insights.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {mode === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              onClick={handleSummarize}
              disabled={loading}
              size="sm"
              className="mt-2 gap-2 rounded-xl"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Summarizing..." : "Get Summary Now"}
            </Button>
          </motion.div>
        )}

        {mode === "summary" && summary && (
          <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 space-y-3">
            <p className="text-sm text-foreground/85 leading-relaxed bg-background/60 rounded-xl p-3 border border-border/50">
              {summary}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-xs"
                onClick={() => {
                  onScrollToContent?.();
                }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Still Confused 😵 — Read {pageType === "article" ? "Article" : "Full Page"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-xs"
                onClick={() => setMode("ask")}
              >
                <MessageCircleQuestion className="w-3.5 h-3.5" />
                Tell Me More 👇 — Ask a Question
              </Button>
            </div>
          </motion.div>
        )}

        {mode === "ask" && (
          <motion.div key="ask" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 space-y-3">
            {summary && (
              <p className="text-xs text-muted-foreground bg-background/60 rounded-lg p-2 border border-border/50">
                ✨ {summary}
              </p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Ask anything about this page..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                className="text-sm rounded-xl h-9"
              />
              <Button size="sm" onClick={handleAsk} disabled={askLoading || !question.trim()} className="rounded-xl gap-1.5 px-3">
                <Send className="w-3.5 h-3.5" />
                {askLoading ? "..." : "Ask"}
              </Button>
            </div>
            {answer && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-sm text-foreground/85 leading-relaxed bg-background/60 rounded-xl p-3 border border-border/50">
                  {answer}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="text-xs rounded-xl gap-1" onClick={() => { setQuestion(""); setAnswer(null); }}>
                    Ask Another
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs rounded-xl gap-1" onClick={() => onScrollToContent?.()}>
                    <BookOpen className="w-3 h-3" /> Read Full Content
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIGistSection;
