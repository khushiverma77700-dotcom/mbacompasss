import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag, TrendingUp, Sparkles, Hash, Search, Flame } from "lucide-react";

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
  const trending = snapshot?.keywordBuckets?.trending || [];
  const faq = snapshot?.keywordBuckets?.faq || [];
  const allKeywords = snapshot?.keywords || fallbackKeywords;

  const hasAIKeywords = shortTail.length > 0 || longTail.length > 0;
  const displayKeywords = hasAIKeywords ? [] : allKeywords;

  if (!displayKeywords?.length && !shortTail.length && !longTail.length) return null;

  // Collect all buckets into a single flat list for compact display
  const sections = [
    { label: "Popular", icon: TrendingUp, color: "bg-primary/10 text-primary", items: shortTail },
    { label: "Detailed", icon: Search, color: "bg-secondary text-secondary-foreground", items: longTail },
    { label: "Trending", icon: Flame, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", items: trending },
    { label: "People Also Ask", icon: Search, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", items: faq },
  ].filter(s => s.items.length > 0);

  return (
    <section className="mt-12 pt-8 border-t border-border/30">
      <div className="max-w-5xl mx-auto">
        {/* Compact header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-heading font-semibold text-foreground">
            Related Topics & Keywords
          </h2>
        </div>

        {/* AI keywords - compact grouped layout */}
        {hasAIKeywords && (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-2">
                  <section.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">({section.items.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {section.items.map((kw: string, i: number) => (
                    <Badge
                      key={`${section.label}-${i}`}
                      variant="outline"
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-default border-border/40 hover:border-primary/30 transition-colors ${section.color}`}
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fallback keywords */}
        {!hasAIKeywords && displayKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displayKeywords.map((kw: string, i: number) => (
              <Badge
                key={`kw-${i}`}
                variant="outline"
                className="px-2.5 py-1 text-[11px] font-medium rounded-md cursor-default border-border/40 bg-muted/50 text-muted-foreground"
              >
                <Hash className="w-2.5 h-2.5 mr-1 opacity-50" />
                {kw}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PageKeywords;
