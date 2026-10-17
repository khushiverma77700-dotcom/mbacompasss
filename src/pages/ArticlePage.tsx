import { useParams, Link } from "@/lib/router-compat";
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
import SEOHead from "@/components/SEOHead";
import AnswerBlock from "@/components/AnswerBlock";
import {
  buildArticleSchema,
  buildWebPageSchema,
  buildBreadcrumbSchema,
  buildDirectAnswerSchema,
  buildPageGraph,
  deriveDirectAnswer,
} from "@/lib/aeoSchema";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import AIGistSection from "@/components/AIGistSection";
import InlineAIToolCTA from "@/components/InlineAIToolCTA";
import LastUpdatedBadge from "@/components/LastUpdatedBadge";
import { resolveArticleDisplay } from "@/lib/articleDisplay";
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
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: typeof window === "undefined" ? Infinity : 30 * 60 * 1000,
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
  const display = article ? resolveArticleDisplay(article.content || "", article.prepared_display) : undefined;

  // AEO/GEO: answer-first summary derived from stored content (no AI call).
  const answerText = article
    ? deriveDirectAnswer(
        (article as any).ai_summary,
        (article as any).meta_description,
        article.excerpt,
        article.content?.slice(0, 4096),
      )
    : undefined;
  const answerQuestion = article ? `${(article as any).h1_tag || article.title}` : undefined;

  const jsonLd = article
    ? buildPageGraph(
        buildArticleSchema({ ...article, preparedWordCount: display?.words } as any),
        buildWebPageSchema({
          path: `/article/${article.slug}`,
          name: (article as any).meta_title || article.title,
          description: (article as any).meta_description || article.excerpt || undefined,
          datePublished: article.created_at,
          dateModified: (article as any).updated_at || article.created_at,
          primaryImage: heroImage || undefined,
          breadcrumbs: [
            { name: "Blog", url: "/blog" },
            { name: article.title, url: `/article/${article.slug}` },
          ],
        }),
        buildBreadcrumbSchema(`/article/${article.slug}`, [
          { name: "Blog", url: "/blog" },
          { name: article.title, url: `/article/${article.slug}` },
        ]),
        answerText && answerQuestion
          ? buildDirectAnswerSchema({
              path: `/article/${article.slug}`,
              question: answerQuestion,
              answer: answerText,
            })
          : null,
      )
    : undefined;
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
    if (article && !document.querySelector('meta[name="mba-route-seo"]')) {
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

  const renderContent = (content: string) => (
    <div
      className="ai-content max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: display?.html ?? "" }}
    />
  );

  const readTime = article.content ? `${Math.max(1, Math.ceil((display?.words ?? 0) / 200))} min` : "3 min";
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const sameCategory = (suggestedArticles || []).filter((a: any) => a.category === article.category);
  const otherArticles = (suggestedArticles || []).filter((a: any) => a.category !== article.category);
  const sidebar = [...sameCategory, ...otherArticles].slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead {...resolvedSeo} ogType="article" />
      <ReadingProgress />

      {/* Editorial header — one container for mobile and desktop so the
          banner, title, meta and article body all share the same left edge. */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 pt-6 pb-8 md:pt-10 md:pb-12">
          <SiteBreadcrumbs
            items={[
              { name: "Blog", url: "/blog" },
              { name: article.title, url: `/article/${article.slug}` },
            ]}
            className="mb-5 md:mb-6"
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-4xl"
          >
            <span className="inline-flex items-center gap-1.5 mb-4 bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {article.category}
            </span>

            <h1 className="font-heading text-2xl md:text-4xl font-extrabold text-foreground leading-[1.12] tracking-[-0.02em]">
              {(() => {
                const text = (article as any).h1_tag || article.title || "";
                const parts = text.trim().split(/\s+/);
                if (parts.length < 3) return text;
                const tail = parts.slice(-2).join(" ");
                const head = parts.slice(0, -2).join(" ");
                return <>{head} <span className="font-editorial italic font-normal text-primary">{tail}</span></>;
              })()}
            </h1>

            {article.excerpt && (
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-3xl">
                {article.excerpt}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {article.author && (
                <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground/80">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </span>
                  <span className="truncate">{article.author}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(article.created_at)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {readTime} read</span>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-semibold text-foreground/70 transition-colors hover:bg-muted"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </motion.div>

          {heroImage && (
            <div className="mt-6 md:mt-8 max-w-4xl overflow-hidden rounded-2xl border border-border bg-muted">
              <picture>
                {mobileHeroImage && mobileHeroImage !== heroImage && (
                  <source media="(max-width: 767px)" srcSet={mobileHeroImage} />
                )}
                <img
                  src={heroImage}
                  alt={article.title}
                  className="block w-full h-auto"
                  loading="eager"
                  {...({ fetchpriority: "high" } as any)}
                />
              </picture>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 min-w-0">
          {/* Main Article */}
          <article className="min-w-0 lg:col-span-2">

            <AIGistSection
              content={article.content || article.excerpt || ""}
              pageType="article"
              pageId={article.id}
              onScrollToContent={() => document.getElementById("article-content")?.scrollIntoView({ behavior: "smooth" })}
            />


            {answerText && (
              <AnswerBlock
                question={answerQuestion}
                answer={answerText}
                facts={[
                  { label: "Category", value: article.category },
                  { label: "Author", value: article.author || "MBA Compass Editorial" },
                  { label: "Read time", value: `${readTime} read` },
                ]}
                updatedAt={(article as any).updated_at || article.created_at}
                className="mb-8"
              />
            )}

            {/* Excerpt already shown in the page header — not repeated here. */}



            <div id="article-content" className="article-content-shell w-full min-w-0 overflow-hidden bg-card rounded-2xl border border-border p-4 sm:p-6 md:p-10 shadow-xs text-sm sm:text-base leading-relaxed">
              <div className="flex items-center justify-end mb-4 -mt-1">
                <LastUpdatedBadge date={(article as any).updated_at || article.created_at} />
              </div>

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
              className="hidden lg:block"
              deps={[article.id, article.content]}
            />
            {/* Shared engine occupies existing right-column space, before related cards. */}
            <div data-ad-sidebar className="hidden lg:block lg:sticky lg:top-24" />
            <div className="bg-card rounded-2xl p-6 border border-border shadow-md">
              <h3 className="font-heading font-bold text-foreground mb-5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Related Articles
              </h3>
              <div className="space-y-3">
                {sidebar.map((r: any) => (
                  <Link key={r.id} to={`/article/${r.slug}`} className="group block p-3 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                    <div className="flex gap-3">
                      {(r.image_url || r.banner_url) ? (
                        <img src={(r.image_url || r.banner_url)!} alt="" width={64} height={48} className="w-16 h-12 rounded-lg object-cover shrink-0" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">{r.title}</h4>
                        <span className="text-xs text-muted-foreground mt-1 block">{formatDate(r.created_at)}</span>
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
                    <Badge variant="secondary" className="text-xs mb-3">{r.category}</Badge>
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


