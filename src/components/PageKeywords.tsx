import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag, TrendingUp } from "lucide-react";

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

  // If no keywords at all, don't render
  if (!allKeywords?.length && !shortTail.length && !longTail.length) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border/40">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Related Topics & Keywords
        </h2>

        {shortTail.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Popular Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {shortTail.map((kw: string, i: number) => (
                <Badge
                  key={`st-${i}`}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-medium bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-colors cursor-default"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {longTail.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Detailed Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {longTail.map((kw: string, i: number) => (
                <Badge
                  key={`lt-${i}`}
                  variant="outline"
                  className="px-3 py-1.5 text-xs text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground transition-colors cursor-default"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: show all keywords if no buckets */}
        {!shortTail.length && !longTail.length && allKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allKeywords.map((kw: string, i: number) => (
              <Badge
                key={`kw-${i}`}
                variant="outline"
                className="px-3 py-1.5 text-xs text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground transition-colors cursor-default"
              >
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
