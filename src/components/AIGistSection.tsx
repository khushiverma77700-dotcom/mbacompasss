import { useState } from "react";
import { Sparkles, Send, BookOpen, MessageCircleQuestion, Zap, Brain, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import ReactMarkdown from "react-markdown";

interface AIGistSectionProps {
  content: string;
  pageType: "article" | "college" | "institute";
  pageId?: string;
  onScrollToContent?: () => void;
}

const PulsingDots = () => (
  <span className="inline-flex items-center gap-1 ml-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-primary"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </span>
);

const AIGistSection = ({ content, pageType, pageId, onScrollToContent }: AIGistSectionProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"idle" | "summary" | "ask">("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSummarize = async () => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
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
    if (!user) {
      setLoginOpen(true);
      return;
    }
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
    <>
      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} message="Sign in to use B School Buzz AI — get instant summaries and answers." />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-accent/[0.06] p-5 md:p-6 mb-6 shadow-sm"
      >
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start gap-3 mb-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10"
          >
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-snug">
              Get the gist fast — <span className="text-primary">B School Buzz AI</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Converts {pageType === "article" ? "articles" : pageType === "college" ? "college pages" : "institute pages"} into crisp, actionable insights
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} className="relative">
              <Button
                onClick={handleSummarize}
                disabled={loading}
                size="sm"
                className="mt-1 gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/10 transition-all duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing<PulsingDots />
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Get AI Summary
                  </>
                )}
              </Button>
              {!user && (
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <LogIn className="w-3 h-3" /> Login required to use AI features
                </p>
              )}
            </motion.div>
          )}

          {mode === "summary" && summary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-3 space-y-3 relative"
            >
              <motion.div
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                className="bg-background/70 backdrop-blur-sm rounded-xl p-4 border border-border/60 shadow-sm"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Summary</span>
                </div>
                <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary prose-li:marker:text-primary/60">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </motion.div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-all"
                  onClick={() => onScrollToContent?.()}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Still Confused 😵 — Read Full {pageType === "article" ? "Article" : "Page"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs border-accent/30 hover:bg-accent/10 hover:border-accent/40 transition-all"
                  onClick={() => setMode("ask")}
                >
                  <MessageCircleQuestion className="w-3.5 h-3.5" />
                  Tell Me More 👇 — Ask a Question
                </Button>
              </div>
            </motion.div>
          )}

          {mode === "ask" && (
            <motion.div
              key="ask"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-3 space-y-3 relative"
            >
              {summary && (
                <div className="text-xs text-muted-foreground bg-background/50 rounded-lg p-2.5 border border-border/40 line-clamp-2">
                  ✨ {summary.replace(/[*#_]/g, "").slice(0, 120)}...
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask anything about this page..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  className="text-sm rounded-xl h-9 border-primary/20 focus:border-primary/40"
                />
                <Button
                  size="sm"
                  onClick={handleAsk}
                  disabled={askLoading || !question.trim()}
                  className="rounded-xl gap-1.5 px-4 bg-gradient-to-r from-primary to-primary/80 shadow-sm"
                >
                  {askLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {askLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                  Searching our database & AI<PulsingDots />
                </motion.div>
              )}
              {answer && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="bg-background/70 backdrop-blur-sm rounded-xl p-4 border border-border/60 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Answer</span>
                    </div>
                    <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary">
                      <ReactMarkdown>{answer}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="text-xs rounded-xl gap-1 hover:bg-primary/5" onClick={() => { setQuestion(""); setAnswer(null); }}>
                      Ask Another
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs rounded-xl gap-1 hover:bg-accent/10" onClick={() => onScrollToContent?.()}>
                      <BookOpen className="w-3 h-3" /> Read Full Content
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default AIGistSection;
