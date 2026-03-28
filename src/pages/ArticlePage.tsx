import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Calendar, Clock, User, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead, { generateArticleSchema } from "@/components/SEOHead";

const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", id!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: suggestedArticles } = useQuery({
    queryKey: ["suggested-articles", article?.category, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .neq("slug", id!)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!article,
  });

  useEffect(() => {
    if (article) {
      document.title = `${(article as any).meta_title || article.title} | MBAHub Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", (article as any).meta_description || article.excerpt || article.title);
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-10"><div className="container mx-auto px-4"><Skeleton className="h-8 w-64 mb-3" /><Skeleton className="h-6 w-96" /></div></div>
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2"><Skeleton className="h-96" /></div>
          <div><Skeleton className="h-64" /></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Article not found</h1>
          <Link to="/blog"><Button>Back to Blog</Button></Link>
        </div>
      </div>
    );
  }

  // Render content with support for HTML tables
  const renderContent = (content: string) => {
    if (content.includes("<table") || content.includes("<h") || content.includes("<p")) {
      return <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    // Split by double newlines for paragraphs
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert space-y-4">
        {content.split("\n\n").map((para, i) => (
          <p key={i} className="text-muted-foreground leading-relaxed text-base">{para}</p>
        ))}
      </div>
    );
  };

  const readTime = article.content ? `${Math.max(1, Math.ceil(article.content.length / 1200))} min` : "3 min";
  const articleKeywords = (article as any).keywords || [];

  const jsonLd = generateArticleSchema(article);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4">
          <Link to="/blog" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Articles
          </Link>
          <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground border-none">{article.category}</Badge>
          <h1 className="font-heading text-xl md:text-3xl font-bold text-primary-foreground mb-3 max-w-3xl">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-primary-foreground/80 text-sm">
            {article.author && <span className="flex items-center gap-1"><User className="w-4 h-4" /> {article.author}</span>}
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(article.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {readTime} read</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Article */}
          <article className="lg:col-span-2">
            {article.image_url && (
              <div className="rounded-xl overflow-hidden mb-6 aspect-video">
                <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
              </div>
            )}

            {article.excerpt && (
              <div className="bg-secondary/30 border-l-4 border-primary rounded-r-lg p-4 mb-6">
                <p className="text-foreground font-medium italic">{article.excerpt}</p>
              </div>
            )}

            {article.content ? renderContent(article.content) : (
              <p className="text-muted-foreground">Full article content coming soon.</p>
            )}

            {/* Tags */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary">{article.category}</Badge>
                <Badge variant="outline">MBA</Badge>
                <Badge variant="outline">Education</Badge>
              </div>
            </div>
          </article>

          {/* Sidebar - Suggested Articles */}
          <aside className="space-y-4">
            <div className="bg-card rounded-xl p-5 border border-border card-shadow sticky top-20">
              <h3 className="font-heading font-semibold text-foreground mb-4">Suggested Articles</h3>
              <div className="space-y-3">
                {(suggestedArticles || []).map((r: any) => (
                  <Link key={r.id} to={`/article/${r.slug}`} className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <Badge variant="secondary" className="text-xs mb-1">{r.category}</Badge>
                    <h4 className="text-sm font-medium text-foreground line-clamp-2">{r.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </Link>
                ))}
                {(suggestedArticles || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No more articles yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Suggested Articles */}
        {(suggestedArticles || []).length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="font-heading text-xl font-bold text-foreground mb-6">More Articles You Might Like</h3>
            <div className="grid md:grid-cols-3 gap-5">
              {(suggestedArticles || []).slice(0, 3).map((r: any) => (
                <Link key={r.id} to={`/article/${r.slug}`} className="group block bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 border border-border">
                  <div className="h-32 hero-gradient flex items-center justify-center">
                    <span className="font-heading font-bold text-primary-foreground text-sm opacity-60">{r.category}</span>
                  </div>
                  <div className="p-4">
                    <Badge variant="secondary" className="text-xs mb-2">{r.category}</Badge>
                    <h4 className="font-heading font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors text-sm">{r.title}</h4>
                    {r.excerpt && <p className="text-xs text-muted-foreground line-clamp-2">{r.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticlePage;
