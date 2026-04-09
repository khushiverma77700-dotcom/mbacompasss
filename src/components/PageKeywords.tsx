import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag, TrendingUp, Sparkles, Hash, Search, Flame, ArrowRight, Link2 } from "lucide-react";
import { Link } from "react-router-dom";

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
  const approvedLinks: { path: string; anchorText: string; targetName?: string }[] = snapshot?.internalLinks?.approved || [];

  const hasAIKeywords = shortTail.length > 0 || longTail.length > 0;
  const displayKeywords = hasAIKeywords ? [] : allKeywords;
  const hasLinks = approvedLinks.length > 0;

  if (!displayKeywords?.length && !shortTail.length && !longTail.length && !hasLinks) return null;

  const sections = [
    { label: "Popular", icon: TrendingUp, color: "bg-primary/10 text-primary", items: shortTail },
    { label: "Detailed", icon: Search, color: "bg-secondary text-secondary-foreground", items: longTail },
    { label: "Trending", icon: Flame, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", items: trending },
    { label: "People Also Ask", icon: Search, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", items: faq },
  ].filter(s => s.items.length > 0);

  return (
    <section className="mt-12 pt-8 border-t border-border/30">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Internal Links Section */}
        {hasLinks && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-4 w-4 text-primary" />
              <h2 className="text-base font-heading font-semibold text-foreground">
                Explore Related Pages
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {approvedLinks.map((link, i) => (
                <Link
                  key={i}
                  to={link.path}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ArrowRight className="h-3.5 w-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {link.anchorText}
                    </p>
                    {link.targetName && (
                      <p className="text-[11px] text-muted-foreground truncate">{link.targetName}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Keywords Section */}
        {(hasAIKeywords || (displayKeywords && displayKeywords.length > 0)) && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-heading font-semibold text-foreground">
                Related Topics & Keywords
              </h2>
            </div>

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
        )}
      </div>
    </section>
  );
};

export default PageKeywords;
