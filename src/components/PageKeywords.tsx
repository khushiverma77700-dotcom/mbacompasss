import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Hash, Search, Flame, ArrowRight, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface PageKeywordsProps {
  contentType: string;
  recordId: string;
  fallbackKeywords?: string[];
}

const sectionStyles = [
  { label: "Popular Topics", icon: TrendingUp, accent: "from-violet-500 to-purple-600", badgeBg: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 hover:bg-violet-500/20", iconBg: "bg-violet-500/10", iconColor: "text-violet-500" },
  { label: "Detailed Keywords", icon: Search, accent: "from-sky-500 to-blue-600", badgeBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 hover:bg-sky-500/20", iconBg: "bg-sky-500/10", iconColor: "text-sky-500" },
  { label: "Trending Now", icon: Flame, accent: "from-orange-500 to-red-500", badgeBg: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 hover:bg-orange-500/20", iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
  { label: "People Also Ask", icon: Search, accent: "from-emerald-500 to-teal-600", badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
];

const PageKeywords = ({ contentType, recordId, fallbackKeywords = [] }: PageKeywordsProps) => {
  const { data: snapshot } = useQuery({
    queryKey: ["page-keywords", contentType, recordId],
    queryFn: async () => {
      const key = `seo_page__${contentType}__${recordId}`;
      const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
      return (data?.value as Record<string, any> | null) ?? null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const shortTail = snapshot?.keywordBuckets?.shortTail || [];
  const longTail = snapshot?.keywordBuckets?.longTail || [];
  const trending = snapshot?.keywordBuckets?.trending || [];
  const faq = snapshot?.keywordBuckets?.faq || [];
  const faqs: { question?: string; answer?: string; q?: string; a?: string }[] = (snapshot as any)?.faqs || [];
  const allKeywords = snapshot?.keywords || fallbackKeywords;
  const approvedLinks: { path: string; anchorText: string; targetName?: string }[] = snapshot?.internalLinks?.approved || [];

  const hasAIKeywords = shortTail.length > 0 || longTail.length > 0;
  const displayKeywords = hasAIKeywords ? [] : allKeywords;
  const hasLinks = approvedLinks.length > 0;
  const hasFaqs = faqs.length > 0;

  if (!displayKeywords?.length && !shortTail.length && !longTail.length && !hasLinks && !hasFaqs) return null;

  const sections = [
    { ...sectionStyles[0], items: shortTail },
    { ...sectionStyles[1], items: longTail },
    { ...sectionStyles[2], items: trending },
    { ...sectionStyles[3], items: faq },
  ].filter(s => s.items.length > 0);

  return (
    <section className="mt-16 pt-10 border-t border-border/30">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        {/* Internal Links Section */}
        {hasLinks && (
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-heading font-bold text-foreground">Explore Related Pages</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {approvedLinks.map((link, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link
                    to={link.path}
                    className="group flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center group-hover:from-primary/25 group-hover:to-primary/10 transition-all">
                      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {link.anchorText}
                      </p>
                      {link.targetName && <p className="text-[11px] text-muted-foreground truncate">{link.targetName}</p>}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Keywords Section */}
        {(hasAIKeywords || (displayKeywords && displayKeywords.length > 0)) && (
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-heading font-bold text-foreground">Related Topics & Keywords</h2>
            </div>

            {hasAIKeywords && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section, si) => (
                  <motion.div key={section.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: si * 0.08 }}>
                    <div className="rounded-2xl border border-border/40 bg-card p-5 hover:shadow-md transition-shadow h-full">
                      {/* Section header */}
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-9 h-9 rounded-xl ${section.iconBg} flex items-center justify-center`}>
                          <section.icon className={`h-4.5 w-4.5 ${section.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-foreground">{section.label}</h3>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {section.items.length}
                        </span>
                      </div>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {section.items.map((kw: string, i: number) => (
                          <Badge
                            key={`${section.label}-${i}`}
                            variant="outline"
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-full cursor-default transition-all duration-200 ${section.badgeBg}`}
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!hasAIKeywords && displayKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayKeywords.map((kw: string, i: number) => (
                  <Badge
                    key={`kw-${i}`}
                    variant="outline"
                    className="px-3 py-1.5 text-xs font-medium rounded-full cursor-default border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Hash className="w-3 h-3 mr-1 opacity-40" />
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PageKeywords;
