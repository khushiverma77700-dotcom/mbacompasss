import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag, TrendingUp, Sparkles, Hash } from "lucide-react";
import { motion } from "framer-motion";

interface PageKeywordsProps {
  contentType: string;
  recordId: string;
  fallbackKeywords?: string[];
}

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
  const allKeywords = snapshot?.keywords || fallbackKeywords;

  if (!allKeywords?.length && !shortTail.length && !longTail.length) return null;

  return (
    <section className="mt-16 pt-10 border-t border-border/30">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">
              Related Topics & Keywords
            </h2>
            <p className="text-xs text-muted-foreground">Explore more about this topic</p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Short-tail / Popular Topics */}
          {shortTail.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm"
            >
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
                Popular Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {shortTail.map((kw: string, i: number) => (
                  <motion.div
                    key={`st-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Badge
                      className="px-3.5 py-2 text-xs font-semibold bg-primary/8 text-primary border border-primary/15 hover:bg-primary/15 hover:shadow-md transition-all duration-200 cursor-default rounded-xl"
                    >
                      <Hash className="w-3 h-3 mr-1 opacity-50" />
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
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm"
            >
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Detailed Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {longTail.map((kw: string, i: number) => (
                  <motion.div
                    key={`lt-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Badge
                      variant="outline"
                      className="px-3 py-1.5 text-[11px] text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground hover:shadow-sm transition-all duration-200 cursor-default rounded-lg"
                    >
                      {kw}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Fallback: show all keywords */}
        {!shortTail.length && !longTail.length && allKeywords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm"
          >
            <div className="flex flex-wrap gap-2">
              {allKeywords.map((kw: string, i: number) => (
                <motion.div
                  key={`kw-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Badge
                    variant="outline"
                    className="px-3.5 py-2 text-xs text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground hover:bg-primary/5 transition-all duration-200 cursor-default rounded-xl"
                  >
                    <Hash className="w-3 h-3 mr-1 opacity-40" />
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