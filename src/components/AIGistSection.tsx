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
  pageType: "article" | "college" | "institute" | "exam";
  pageId?: string;
  onScrollToContent?: () => void;
}

const PulsingDots = () => (
  <span className="inline-flex items-center gap-1 ml-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-current"
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
    if (!user) { setLoginOpen(true); return; }
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
    } finally { setLoading(false); }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    if (!user) { setLoginOpen(true); return; }
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
    } finally { setAskLoading(false); }
  };

  const pageLabel = pageType === "article" ? "Article" : pageType === "college" ? "College Page" : pageType === "exam" ? "Exam Page" : "Institute Page";

  return (
    <>
      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} message="Sign in to use B School Buzz AI — get instant summaries and answers." />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mb-6 rounded-2xl p-[2px] ai-gist-border"
      >
        {/* Inner card */}
        <div className="relative overflow-hidden rounded-[14px] bg-background p-5 md:p-6">
          {/* Subtle internal glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-blue-500/[0.04] blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-purple-500/[0.04] blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-start gap-3 mb-3">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-pink-500/15 flex items-center justify-center shrink-0 border border-blue-500/10"
            >
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-pulse pointer-events-none" />
            </motion.div>
            <div>
              <p className="text-sm font-bold text-foreground leading-snug flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">B School Buzz AI</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider border border-blue-500/15">Beta</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get the gist fast — converts {pageLabel.toLowerCase()}s into crisp, actionable insights ✨
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
                  className="mt-1 gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing</span><PulsingDots />
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
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-3 space-y-3 relative"
              >
                <div className="relative rounded-xl p-[1px] ai-gist-border-inner">
                  <div className="bg-background/90 backdrop-blur-sm rounded-[11px] p-4">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Brain className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider">AI Summary</span>
                    </div>
                    <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-strong:text-foreground prose-li:marker:text-purple-500/60 prose-ul:space-y-1 prose-p:my-1.5">
                      <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs border-blue-500/20 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all"
                    onClick={() => onScrollToContent?.()}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Still Confused 😵 — Read Full {pageLabel}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs border-purple-500/20 hover:bg-purple-500/5 hover:border-purple-500/30 transition-all"
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
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-3 space-y-3 relative"
              >
                {summary && (
                  <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 border border-border/40 line-clamp-2">
                    ✨ {summary.replace(/[*#_]/g, "").slice(0, 120)}...
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1 rounded-xl p-[1px] ai-gist-input-border focus-within:shadow-lg focus-within:shadow-purple-500/10 transition-shadow">
                    <Input
                      placeholder="Ask anything about this page..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                      className="text-sm rounded-[11px] h-9 border-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAsk}
                    disabled={askLoading || !question.trim()}
                    className="rounded-xl gap-1.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md border-0"
                  >
                    {askLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {askLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                    Searching our database & AI<PulsingDots />
                  </motion.div>
                )}
                {answer && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <div className="relative rounded-xl p-[1px] ai-gist-border-inner">
                      <div className="bg-background/90 backdrop-blur-sm rounded-[11px] p-4">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider">AI Answer</span>
                        </div>
                        <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-strong:text-foreground prose-li:marker:text-blue-500/60 prose-ul:space-y-1 prose-p:my-1.5">
                          <ReactMarkdown>{answer}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="text-xs rounded-xl gap-1 hover:bg-purple-500/5" onClick={() => { setQuestion(""); setAnswer(null); }}>
                        Ask Another
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs rounded-xl gap-1 hover:bg-blue-500/5" onClick={() => onScrollToContent?.()}>
                        <BookOpen className="w-3 h-3" /> Read Full Content
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default AIGistSection;
