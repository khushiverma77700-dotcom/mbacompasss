import { useState, useRef, useEffect } from "react";
import { GraduationCap, Send, Loader2, Sparkles, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import SEOHead from "@/components/SEOHead";
import mbaHubLogo from "@/assets/mbahub-logo-sm.png";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mba-college-finder`;

const QUICK_OPTIONS: Record<number, { label: string; options: string[] }> = {
  0: { label: "What type of colleges?", options: ["Only IIMs", "Tier 1 B-Schools", "Tier 2 Colleges", "Open to all options"] },
};

function detectStep(messages: Msg[]): number {
  const assistantCount = messages.filter(m => m.role === "assistant").length;
  return Math.min(assistantCount, 8);
}

const CollegeFinderPage = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message || "Something went wrong. Please try again."}` }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleStart = () => {
    setStarted(true);
    streamChat([{ role: "user", content: "Hi, I want to find the best MBA college for me." }]);
    setMessages([{ role: "user", content: "Hi, I want to find the best MBA college for me." }]);
  };

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    const userMsg: Msg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    streamChat(newMessages);
  };

  const handleReset = () => {
    setMessages([]);
    setStarted(false);
  };

  const currentStep = detectStep(messages);
  const totalSteps = 8;
  const progressPct = Math.min((currentStep / totalSteps) * 100, 100);

  // Show quick options only for the first question (before user answers)
  const showQuickOptions = started && messages.length === 2 && messages[messages.length - 1]?.role === "assistant" && !isLoading;

  return (
    <>
      <SEOHead
        title="AI MBA College Finder — Find Your Perfect B-School | BestMBACoaching"
        description="Use our AI-powered MBA College Finder to get personalized college recommendations based on your profile, budget, exam scores, and career goals."
        keywords={["MBA college finder", "best MBA college for me", "AI college recommendation", "MBA admission predictor", "IIM finder"]}
        canonical="https://bestmbacoaching.com/college-finder"
      />

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center shadow-md">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-base font-bold text-foreground">AI College Finder</h1>
                <p className="text-[10px] text-muted-foreground">Powered by AI • Real College Data</p>
              </div>
            </div>
            {started && (
              <div className="flex items-center gap-3">
                {/* Progress */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {currentStep >= totalSteps ? "Done" : `${currentStep}/${totalSteps}`}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 max-w-3xl">
            {!started ? (
              /* Landing state */
              <motion.div
                className="flex flex-col items-center justify-center min-h-[60vh] text-center py-16"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-16 h-16 rounded-2xl hero-gradient flex items-center justify-center shadow-xl mb-6">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground mb-2">
                  AI MBA College Finder
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mb-2">
                  Answer a few quick questions and get AI-powered college recommendations personalized to your profile, budget, and career goals.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-[11px] text-muted-foreground">
                  {["Real College Data", "AI-Powered Match", "ROI Analysis", "Personalized Strategy"].map(t => (
                    <span key={t} className="bg-muted/50 border border-border/50 rounded-full px-3 py-1 font-medium">{t}</span>
                  ))}
                </div>
                <Button onClick={handleStart} size="lg" className="rounded-xl gap-2 font-bold shadow-lg text-sm px-8">
                  <Sparkles className="w-4 h-4" /> Find My College
                </Button>
              </motion.div>
            ) : (
              /* Chat messages */
              <div className="py-6 space-y-4 pb-32">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] md:max-w-[75%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5"
                        : "bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 [&_table]:border-border [&_th]:border-border [&_td]:border-border [&_a]:text-primary [&_a]:font-semibold">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children }) => (
                                <a href={href} className="text-primary font-semibold hover:underline">{children}</a>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Quick option buttons */}
                {showQuickOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 pl-2"
                  >
                    {QUICK_OPTIONS[0].options.map(opt => (
                      <Button
                        key={opt}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs h-8"
                        onClick={() => handleSend(opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </motion.div>
                )}

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        {started && (
          <div className="sticky bottom-0 bg-background/80 backdrop-blur-lg border-t border-border">
            <div className="container mx-auto px-4 max-w-3xl py-3">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your answer..."
                  disabled={isLoading}
                  className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl h-10 w-10 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                AI recommendations based on real college data from our database
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CollegeFinderPage;
