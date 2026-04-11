import { useParams, Link } from "react-router-dom";
import PageKeywords from "@/components/PageKeywords";
import { useEffect } from "react";
import { ArrowLeft, Calendar, Clock, User, Tag, Share2, ChevronRight, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEOHead, { generateArticleSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import AIGistSection from "@/components/AIGistSection";
import InlineAIToolCTA from "@/components/InlineAIToolCTA";

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

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
  });

  const { data: suggestedArticles } = useQuery({
    queryKey: ["suggested-articles", article?.category, slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .neq("slug", slug!)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!article,
  });

  const articleKeywords = ((article as any)?.keywords || []) as string[];
  const jsonLd = article ? generateArticleSchema(article) : undefined;
  const { seo: resolvedSeo } = useResolvedSeo(
    "article",
    article?.id,
    article
      ? {
          title: `${(article as any).meta_title || article.title} | BSchoolBuzz Blog`,
          description: (article as any).meta_description || article.excerpt || undefined,
          keywords: articleKeywords,
          canonical: `${window.location.origin}/article/${article.slug}`,
          jsonLd,
          ogImage: article.image_url || article.banner_url || undefined,
        }
      : {},
  );

  useEffect(() => {
    if (article) {
      document.title = `${(article as any).meta_title || article.title} | BSchoolBuzz`;
    }
  }, [article]);

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
          <div className="container mx-auto px-4"><Skeleton className="h-8 w-64 mb-3 bg-white/20" /><Skeleton className="h-10 w-[500px] bg-white/20" /></div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-4xl"><Skeleton className="h-[500px] rounded-2xl" /></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-4">This article may not be published yet, or the URL may be incorrect.</p>
          <Link to="/blog"><Button>Back to Blog</Button></Link>
        </div>
      </div>
    );
  }

  const renderContent = (content: string) => {
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
      return (
        <div
          className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-img:rounded-xl prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-table:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted/50 [&_th]:font-semibold prose-hr:my-6 prose-hr:border-border prose-h1:text-3xl prose-h1:font-bold prose-h1:my-4 prose-h2:text-2xl prose-h2:font-bold prose-h2:my-3 prose-h3:text-xl prose-h3:font-semibold prose-h3:my-2 prose-p:my-2 prose-p:leading-relaxed [&_mark]:bg-yellow-200 [&_mark]:px-1"
          dangerouslySetInnerHTML={{ __html: content }}
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
      <SEOHead {...resolvedSeo} />

      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Main gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(200,85%,45%)] via-primary to-[hsl(190,75%,40%)]" />
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-60" style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 80%, hsl(200 90% 60% / 0.4), transparent), radial-gradient(ellipse 60% 50% at 80% 20%, hsl(180 70% 50% / 0.3), transparent), radial-gradient(ellipse 50% 40% at 50% 50%, hsl(210 80% 55% / 0.2), transparent)'
        }} />

        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Light streak */}
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[300px] bg-white/[0.04] rounded-full blur-3xl" />
          {/* Floating geometric shapes */}
          <div className="absolute top-16 right-[15%] w-20 h-20 border border-white/[0.08] rounded-2xl rotate-12" />
          <div className="absolute bottom-20 left-[10%] w-14 h-14 border border-white/[0.06] rounded-xl -rotate-12" />
          <div className="absolute top-1/3 right-[8%] w-2 h-2 bg-white/25 rounded-full" />
          <div className="absolute top-[60%] left-[20%] w-1.5 h-1.5 bg-white/15 rounded-full" />
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 pt-10 pb-16 md:pt-14 md:pb-20">
          <div className="container mx-auto px-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[11px] text-white/45 mb-8 font-medium" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white/75 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/blog" className="hover:text-white/75 transition-colors">Blog</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/60 line-clamp-1 max-w-[180px]">{article.title}</span>
            </nav>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              {/* Category pill */}
              <div className="inline-flex items-center gap-1.5 mb-5 bg-white/[0.12] backdrop-blur-md text-white/90 text-[11px] font-bold uppercase tracking-[0.12em] px-3.5 py-1.5 rounded-full border border-white/[0.12]">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                {article.category}
              </div>

              {/* Title */}
              <h1 className="font-heading text-[1.75rem] md:text-[2.5rem] lg:text-[3rem] font-extrabold text-white mb-8 max-w-3xl leading-[1.1] tracking-[-0.02em]" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.15)' }}>
                {(article as any).h1_tag || article.title}
              </h1>

              {/* Author & Meta - glassmorphism card */}
              <div className="inline-flex flex-wrap items-center gap-4 bg-white/[0.08] backdrop-blur-md rounded-2xl px-5 py-3 border border-white/[0.1]">
                {article.author && (
                  <span className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-white/80" />
                    </div>
                    <span className="font-semibold text-white/90 text-sm">{article.author}</span>
                  </span>
                )}
                {article.author && <span className="w-px h-4 bg-white/15 hidden sm:block" />}
                <span className="flex items-center gap-1.5 text-white/55 text-xs"><Calendar className="w-3.5 h-3.5" /> {formatDate(article.created_at)}</span>
                <span className="flex items-center gap-1.5 text-white/55 text-xs"><Clock className="w-3.5 h-3.5" /> {readTime} read</span>
                <button onClick={handleShare} className="flex items-center gap-1.5 text-white/60 hover:text-white/90 transition-colors text-xs font-medium ml-auto sm:ml-2 hover:bg-white/10 px-2.5 py-1 rounded-lg">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block" preserveAspectRatio="none">
            <path d="M0 48V24C360 0 720 0 1080 12C1260 18 1350 24 1440 24V48H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Article */}
          <article className="lg:col-span-2">
            {(article.image_url || article.banner_url) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden mb-8 shadow-xl -mt-8 relative z-10">
                <img src={(article.image_url || article.banner_url)!} alt={article.title} className="w-full aspect-video object-cover" />
              </motion.div>
            )}

            <AIGistSection
              content={article.content || article.excerpt || ""}
              pageType="article"
              pageId={article.id}
              onScrollToContent={() => document.getElementById("article-content")?.scrollIntoView({ behavior: "smooth" })}
            />

            {article.excerpt && (
              <div className="bg-primary/5 border-l-4 border-primary rounded-r-2xl p-5 mb-8">
                <p className="text-foreground font-medium italic text-base leading-relaxed">{article.excerpt}</p>
              </div>
            )}

            <div id="article-content" className="bg-card rounded-2xl border border-border p-6 md:p-10 shadow-sm">
              {article.content ? renderContent(article.content) : (
                <p className="text-muted-foreground text-center py-10">Full article content coming soon.</p>
              )}
            </div>

            <InlineAIToolCTA variant="profile-analyzer" />

            {/* Tags */}
            <div className="mt-8 p-6 bg-card rounded-2xl border border-border">
              <div className="flex items-center gap-3 flex-wrap">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">{article.category}</Badge>
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
          <aside className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-md sticky top-20">
              <h3 className="font-heading font-bold text-foreground mb-5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Related Articles
              </h3>
              <div className="space-y-3">
                {sidebar.map((r: any) => (
                  <Link key={r.id} to={`/article/${r.slug}`} className="group block p-3 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                    <div className="flex gap-3">
                      {(r.image_url || r.banner_url) ? (
                        <img src={(r.image_url || r.banner_url)!} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
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
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
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
                  <div className="h-40 overflow-hidden relative">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
      </div>
    </div>
  );
};

export default ArticlePage;
