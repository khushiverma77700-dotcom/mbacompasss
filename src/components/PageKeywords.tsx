import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag, TrendingUp, Sparkles, Hash, Search, Flame, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

interface PageKeywordsProps {
  contentType: string;
  recordId: string;
  fallbackKeywords?: string[];
}

const KEYWORD_COLORS = [
  "from-blue-500/10 to-indigo-500/10 border-blue-200/60 text-blue-700 hover:from-blue-500/20 hover:to-indigo-500/20",
  "from-emerald-500/10 to-teal-500/10 border-emerald-200/60 text-emerald-700 hover:from-emerald-500/20 hover:to-teal-500/20",
  "from-violet-500/10 to-purple-500/10 border-violet-200/60 text-violet-700 hover:from-violet-500/20 hover:to-purple-500/20",
  "from-amber-500/10 to-orange-500/10 border-amber-200/60 text-amber-700 hover:from-amber-500/20 hover:to-orange-500/20",
  "from-rose-500/10 to-pink-500/10 border-rose-200/60 text-rose-700 hover:from-rose-500/20 hover:to-pink-500/20",
  "from-cyan-500/10 to-sky-500/10 border-cyan-200/60 text-cyan-700 hover:from-cyan-500/20 hover:to-sky-500/20",
];

const PageKeywords = ({ contentType, recordId, fallbackKeywords = [] }: PageKeywordsProps) => {
  const { data: snapshot } = useQuery({
    queryKey: ["page-keywords", contentType, recordId],
    queryFn: async () => {
      const key = `seo_page__${contentType}__${recordId}`;
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return data?.value as Record<string, any> | null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const shortTail = snapshot?.keywordBuckets?.shortTail || [];
  const longTail = snapshot?.keywordBuckets?.longTail || [];
  const trending = snapshot?.keywordBuckets?.trending || [];
  const faq = snapshot?.keywordBuckets?.faq || [];
  const allKeywords = snapshot?.keywords || fallbackKeywords;

  // Always show fallback keywords if no AI keywords exist
  const hasAIKeywords = shortTail.length > 0 || longTail.length > 0;
  const displayKeywords = hasAIKeywords ? [] : allKeywords;

  if (!displayKeywords?.length && !shortTail.length && !longTail.length) return null;

  return (
    <section className="mt-16 pt-12 border-t border-border/20 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-primary/[0.04] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Explore Related Topics
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2">
            Related Topics & Keywords
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Discover more about this topic through popular search terms and detailed keyword insights
          </p>
        </motion.div>

        {/* AI Keywords Grid */}
        {hasAIKeywords && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Short-tail / Popular Topics */}
            {shortTail.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-shadow duration-300"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Popular Topics</h3>
                    <p className="text-[11px] text-muted-foreground">{shortTail.length} trending keywords</p>
                  </div>
                  <Badge className="ml-auto bg-primary/10 text-primary border-0 text-[10px]">
                    <Flame className="w-3 h-3 mr-1" />
                    Hot
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {shortTail.map((kw: string, i: number) => (
                    <motion.div
                      key={`st-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                    >
                      <Badge
                        className={`px-4 py-2.5 text-xs font-semibold bg-gradient-to-r ${KEYWORD_COLORS[i % KEYWORD_COLORS.length]} border cursor-default rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
                      >
                        <Hash className="w-3 h-3 mr-1.5 opacity-60" />
                        {kw}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Long-tail / Detailed Keywords */}
            {longTail.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-lg shadow-accent/5 hover:shadow-xl hover:shadow-accent/10 transition-shadow duration-300"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                    <Search className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Detailed Keywords</h3>
                    <p className="text-[11px] text-muted-foreground">{longTail.length} long-tail phrases</p>
                  </div>
                  <Badge className="ml-auto bg-secondary text-secondary-foreground border-0 text-[10px]">
                    <Tag className="w-3 h-3 mr-1" />
                    Specific
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {longTail.map((kw: string, i: number) => (
                    <motion.div
                      key={`lt-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 200 }}
                    >
                      <Badge
                        variant="outline"
                        className="px-3.5 py-2 text-[11px] text-muted-foreground border-border/40 bg-background/50 hover:border-primary/40 hover:text-foreground hover:bg-primary/5 hover:shadow-sm transition-all duration-200 cursor-default rounded-xl hover:-translate-y-0.5"
                      >
                        <ArrowUpRight className="w-3 h-3 mr-1 opacity-40" />
                        {kw}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Trending & FAQ row */}
        {(trending.length > 0 || faq.length > 0) && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {trending.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10 rounded-2xl border border-orange-200/30 p-5"
              >
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Trending Now
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trending.map((kw: string, i: number) => (
                    <Badge key={`tr-${i}`} className="px-3 py-1.5 text-[11px] bg-orange-100/80 text-orange-700 border border-orange-200/50 rounded-lg cursor-default">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
            {faq.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-sky-50/80 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/10 rounded-2xl border border-sky-200/30 p-5"
              >
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-sky-500" />
                  People Also Ask
                </h3>
                <div className="flex flex-wrap gap-2">
                  {faq.map((kw: string, i: number) => (
                    <Badge key={`fq-${i}`} variant="outline" className="px-3 py-1.5 text-[11px] text-sky-700 border-sky-200/50 bg-sky-50/50 rounded-lg cursor-default">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Fallback: show all keywords beautifully */}
        {!hasAIKeywords && displayKeywords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-8 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Related Keywords</h3>
                <p className="text-[11px] text-muted-foreground">{displayKeywords.length} keywords for this page</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {displayKeywords.map((kw: string, i: number) => (
                <motion.div
                  key={`kw-${i}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 200 }}
                >
                  <Badge
                    className={`px-4 py-2.5 text-xs font-medium bg-gradient-to-r ${KEYWORD_COLORS[i % KEYWORD_COLORS.length]} border cursor-default rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
                  >
                    <Hash className="w-3 h-3 mr-1.5 opacity-50" />
                    {kw}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PageKeywords;
