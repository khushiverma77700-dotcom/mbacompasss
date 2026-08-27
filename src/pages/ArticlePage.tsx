import { useParams, Link } from "react-router-dom";
import PageKeywords from "@/components/PageKeywords";
import { useEffect, useRef } from "react";
import { Calendar, Clock, User, Tag, Share2, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEOHead, { generateArticleSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import AIGistSection from "@/components/AIGistSection";
import InlineAIToolCTA from "@/components/InlineAIToolCTA";
import LastUpdatedBadge from "@/components/LastUpdatedBadge";
import { enhanceAIContent } from "@/lib/aiContentEnhancer";
import { canonicalUrl } from "@/lib/canonical";
import MobileActionBar from "@/components/mobile/MobileActionBar";
import ReadingProgress from "@/components/mobile/ReadingProgress";
import { Bookmark } from "lucide-react";
import NotFound from "@/pages/NotFound";
import AutoTOC from "@/components/AutoTOC";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import TopicClusterLinks, { DEFAULT_MBA_CLUSTER } from "@/components/TopicClusterLinks";
import { useScrollableTables } from "@/hooks/useScrollableTables";


const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: () => {
      // Seed from blog list / suggested lists so the page paints instantly
      // while the full article fetch resolves.
      const blog = qc.getQueryData<any[]>(["blog-articles"]);
      const hit = blog?.find((a) => a?.slug === slug);
      if (hit) return hit;
      const news = qc.getQueryData<any[]>(["homepage-news"]);
      return news?.find((a) => a?.slug === slug);
    },
  });

  const { data: suggestedArticles } = useQuery({
    queryKey: ["suggested-articles", article?.category, slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id,slug,title,excerpt,category,image_url,banner_url,created_at")
        .eq("published", true)
        .neq("slug", slug!)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!article,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const articleKeywords = ((article as any)?.keywords || []) as string[];
  const heroImage = article?.banner_url || article?.image_url;
  const mobileHeroImage = (article as any)?.mobile_banner_url || heroImage;
  const jsonLd = article ? generateArticleSchema(article) : undefined;
  const { seo: resolvedSeo } = useResolvedSeo(
    "article",
    article?.id,
    article
      ? {
          title: `${(article as any).meta_title || article.title} | MBA Compass Blog`,
          description: (article as any).meta_description || article.excerpt || undefined,
          keywords: articleKeywords,
          canonical: canonicalUrl(`/article/${article.slug}`),
          jsonLd,
          ogImage: article.image_url || article.banner_url || (article as any).mobile_banner_url || undefined,
        }
      : {},
  );

  useEffect(() => {
    if (article) {
      document.title = `${(article as any).meta_title || article.title} | MBA Compass`;
    }
  }, [article]);

  // Auto-wrap every table in the article body in a horizontal slider.
  useScrollableTables(contentRef, [article?.id, article?.content]);


  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: article?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-12">
          <div className="container mx-auto px-4"><Skeleton className="h-8 w-64 max-w-full mb-3 bg-white/20" /><Skeleton className="h-10 w-full max-w-[500px] bg-white/20" /></div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-4xl"><Skeleton className="h-[500px] rounded-2xl" /></div>
      </div>
    );
  }

  if (!article) {
    return <NotFound />;
  }

  const renderContent = (content: string) => {
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
      return (
        <div
          className="ai-content max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: enhanceAIContent(content) }}
        />
      );
    }
    return (
      <div className="prose prose-lg max-w-none dark:prose-invert space-y-4">
        {content.split("\n\n").map((para, i) => (
          <p key={i} className="text-muted-foreground leading-relaxed">{para}</p>
        ))}
      </div>
    );
  };

  const readTime = article.content ? `${Math.max(1, Math.ceil(article.content.replace(/<[^>]*>/g, "").split(/\s+/).length / 200))} min` : "3 min";
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const sameCategory = (suggestedArticles || []).filter((a: any) => a.category === article.category);
  const otherArticles = (suggestedArticles || []).filter((a: any) => a.category !== article.category);
  const sidebar = [...sameCategory, ...otherArticles].slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead {...resolvedSeo} ogType="article" />
      <ReadingProgress />

      {/* Mobile hero — stacked, no text-over-banner */}
      <div className="md:hidden bg-card border-b border-border">
        <div className="px-4 pt-5 pb-4">
          <span className="inline-flex items-center gap-1.5 mb-3 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {article.category}
          </span>
          <h1 className="font-heading text-[1.6rem] font-extrabold text-foreground leading-[1.15] tracking-[-0.02em]">
            {(article as any).h1_tag || article.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground">
            {article.author && (
              <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </span>
                {article.author}
              </span>
            )}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(article.created_at)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readTime} read</span>
          </div>
        </div>
        {mobileHeroImage && (
          <div className="px-4 pb-5">
            <div className="relative overflow-hidden rounded-2xl bg-muted aspect-[16/9] border border-border">
              <img
                src={mobileHeroImage}
                alt={article.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                {...({ fetchpriority: "high" } as any)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Cinematic Hero (desktop) */}
      <div className="relative hidden overflow-hidden aspect-[16/9] max-h-[620px] min-h-[340px] md:min-h-[420px] md:flex items-end bg-[hsl(210,45%,12%)]">

        {/* Background */}
        <div className="absolute inset-0">
          {heroImage ? (
            <>
              {/* Blurred fill so no letterbox bars, while the real image stays fully visible */}
              <img
                src={heroImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-60 pointer-events-none"
                loading="eager"
              />
              <picture>
                {mobileHeroImage && <source media="(max-width: 767px)" srcSet={mobileHeroImage} />}
                <img
                  src={heroImage}
                  alt={article.title}
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="eager"
                  {...({fetchpriority:"high"} as any)}
                />
              </picture>
            </>
          ) : (

            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,80%,30%)] via-[hsl(200,75%,35%)] to-[hsl(185,65%,40%)]" />
          )}
          {!heroImage && (
            <>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 70% 50% at 80% 20%, hsl(200 80% 55% / 0.35), transparent), radial-gradient(ellipse 60% 60% at 10% 80%, hsl(220 70% 50% / 0.25), transparent)'
              }} />
              <div className="absolute top-12 right-[12%] hidden w-24 h-24 border border-white/[0.06] rounded-3xl rotate-12 pointer-events-none sm:block" />
              <div className="absolute bottom-16 right-[30%] hidden w-16 h-16 border border-white/[0.05] rounded-2xl -rotate-6 pointer-events-none sm:block" />
              <div className="absolute top-[30%] left-[8%] hidden w-20 h-20 border border-white/[0.04] rounded-full pointer-events-none sm:block" />
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </>
          )}
        </div>

        {/* Overlay gradient — only under the text band so the banner stays visible */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />


        {/* Content */}
        <div className="relative z-10 w-full pt-24 pb-10 md:pt-32 md:pb-14">
          <div className="container mx-auto px-4">


            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Category pill */}
              <span className="inline-flex items-center gap-1.5 mb-4 bg-white/[0.12] backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-[0.14em] px-3.5 py-1.5 rounded-full border border-white/[0.1]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {article.category}
              </span>

              {/* Title */}
              <h1 className="font-heading text-[1.85rem] md:text-[2.6rem] lg:text-[3.2rem] font-extrabold text-white mb-6 max-w-4xl leading-[1.08] tracking-[-0.025em]" style={{ textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}>
                {(() => {
                  const text = (article as any).h1_tag || article.title || "";
                  const parts = text.trim().split(/\s+/);
                  if (parts.length < 3) return text;
                  const tail = parts.slice(-2).join(" ");
                  const head = parts.slice(0, -2).join(" ");
                  return <>{head} <span className="font-editorial italic font-normal text-amber-100/95">{tail}</span></>;
                })()}
              </h1>

              {/* Meta bar - frosted glass */}
              <div className="inline-flex flex-wrap items-center gap-3 md:gap-4 bg-white/[0.07] backdrop-blur-md rounded-full px-4 py-2.5 border border-white/[0.08]">
                {article.author && (
                  <span className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                      <User className="w-3 h-3 text-white/80" />
                    </div>
                    <span className="font-semibold text-white/90 text-[13px]">{article.author}</span>
                  </span>
                )}
                {article.author && <span className="w-px h-3.5 bg-white/15 hidden sm:block" />}
                <span className="flex items-center gap-1.5 text-white/55 text-xs"><Calendar className="w-3 h-3" /> {formatDate(article.created_at)}</span>
                <span className="flex items-center gap-1.5 text-white/55 text-xs"><Clock className="w-3 h-3" /> {readTime} read</span>
                <button onClick={handleShare} className="flex items-center gap-1.5 text-white/55 hover:text-white transition-colors text-xs font-medium hover:bg-white/10 px-2 py-1 rounded-full">
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <SiteBreadcrumbs
          items={[
            { name: "Blog", url: "/blog" },
            { name: article.title, url: `/article/${article.slug}` },
          ]}
          className="mb-6"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 min-w-0">
          {/* Main Article */}
          <article className="min-w-0 lg:col-span-2">

            <AIGistSection
              content={article.content || article.excerpt || ""}
              pageType="article"
              pageId={article.id}
              onScrollToContent={() => document.getElementById("article-content")?.scrollIntoView({ behavior: "smooth" })}
            />

            {article.excerpt && (
              <div className="bg-gradient-to-r from-primary/[0.06] to-transparent border-l-[3px] border-primary rounded-r-xl p-5 mb-8">
                <p className="text-foreground/80 font-medium italic text-[15px] leading-relaxed">{article.excerpt}</p>
              </div>
            )}

            <div id="article-content" className="article-content-shell w-full min-w-0 overflow-hidden bg-card rounded-2xl border border-border p-4 sm:p-6 md:p-10 shadow-sm text-[15px] sm:text-base leading-relaxed">
              <div className="flex items-center justify-end mb-4 -mt-1">
                <LastUpdatedBadge date={(article as any).updated_at || article.created_at} />
              </div>

              {/* Mobile / inline auto Table of Contents */}
              <AutoTOC
                contentRef={contentRef}
                className="mb-6 lg:hidden"
                deps={[article.id, article.content]}
              />

              <div ref={contentRef}>
                {article.content ? renderContent(article.content) : (
                  <p className="text-muted-foreground text-center py-10">Full article content coming soon.</p>
                )}
              </div>
            </div>

            <InlineAIToolCTA variant="profile-analyzer" />

            {/* Tags */}
            <div className="mt-8 p-5 bg-card rounded-2xl border border-border">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-semibold">{article.category}</Badge>
                {articleKeywords.slice(0, 5).map((kw: string) => (
                  <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                ))}
                {articleKeywords.length === 0 && (
                  <>
                    <Badge variant="outline" className="text-xs">MBA</Badge>
                    <Badge variant="outline" className="text-xs">Education</Badge>
                  </>
                )}
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="min-w-0 space-y-6">
            <AutoTOC
              contentRef={contentRef}
              className="hidden lg:block sticky top-20"
              deps={[article.id, article.content]}
            />
            <div className="bg-card rounded-2xl p-6 border border-border shadow-md">
              <h3 className="font-heading font-bold text-foreground mb-5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Related Articles
              </h3>
              <div className="space-y-3">
                {sidebar.map((r: any) => (
                  <Link key={r.id} to={`/article/${r.slug}`} className="group block p-3 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                    <div className="flex gap-3">
                      {(r.image_url || r.banner_url) ? (
                        <img src={(r.image_url || r.banner_url)!} alt="" width={64} height={48} className="w-16 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">{r.title}</h4>
                        <span className="text-[11px] text-muted-foreground mt-1 block">{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {sidebar.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No related articles yet.</p>}
              </div>
            </div>

            {/* CTA */}
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 hero-gradient" />
              <div className="absolute top-0 right-0 hidden w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8 pointer-events-none lg:block" />
              <div className="relative p-6">
                <h3 className="font-heading font-bold text-primary-foreground mb-2">Need MBA Guidance?</h3>
                <p className="text-sm text-primary-foreground/75 mb-4">Get free expert counselling for your MBA journey</p>
                <Link to="/contact" className="inline-flex items-center gap-1.5 bg-white text-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors shadow-md">
                  Talk to Expert <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Related */}
        {(suggestedArticles || []).length > 0 && (
          <div className="mt-16 pt-10 border-t border-border">
            <h3 className="font-heading text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> More Articles You'll Love
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(suggestedArticles || []).slice(0, 3).map((r: any) => (
                <Link key={r.id} to={`/article/${r.slug}`} className="group block bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:-translate-y-1">
                  <div className="aspect-[16/9] overflow-hidden relative bg-muted">
                    {(r.image_url || r.banner_url) ? (
                      <img src={(r.image_url || r.banner_url)!} alt={r.title} width={640} height={360} className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full hero-gradient flex items-center justify-center">
                        <span className="font-heading font-bold text-primary-foreground/30 text-sm">{r.category}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                  <div className="p-5">
                    <Badge variant="secondary" className="text-[10px] mb-3">{r.category}</Badge>
                    <h4 className="font-heading font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors text-sm leading-snug">{r.title}</h4>
                    {r.excerpt && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {article?.id && <PageKeywords contentType="article" recordId={article.id} fallbackKeywords={article.keywords || []} />}

        <div className="mt-12">
          <TopicClusterLinks links={DEFAULT_MBA_CLUSTER} />
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <MobileActionBar
        actions={[
          { icon: <Share2 />, label: "Share", primary: true, onClick: handleShare },
          { icon: <Bookmark />, label: "Save", onClick: () => { try { const list = JSON.parse(localStorage.getItem("savedArticles") || "[]"); if (!list.includes(article.slug)) list.push(article.slug); localStorage.setItem("savedArticles", JSON.stringify(list)); toast({ title: "Saved to your reading list" }); } catch { /* noop */ } } },
          { icon: <ArrowRight />, label: "Top", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
        ]}
      />
      <div className="md:hidden h-20" aria-hidden />
    </div>
  );
};

export default ArticlePage;
