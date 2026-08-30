import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, Flame, User, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { cdnImage, cdnImageSrcSet } from "@/lib/imageTransform";

const LatestArticlesSection = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["home-latest-articles"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("articles")
        .select("id,slug,title,excerpt,category,image_url,banner_url,created_at,content_chars,author")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });


  if (isLoading || !articles?.length) return null;

  const featured = articles[0];
  const rest = articles.slice(1);

  const getImage = (article: typeof featured) => article.image_url || article.banner_url;

  const getReadTime = (chars: number | null | undefined) => {
    if (!chars) return "3 min";
    const words = chars / 5.5;
    return `${Math.max(1, Math.ceil(words / 200))} min`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-10 animate-fade-in">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 mb-3">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Expert Insights</span>
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              Latest from Our <span className="text-gradient">Blog</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-1">MBA preparation tips, career advice, and coaching reviews</p>
          </div>
          <Link to="/blog" className="hidden md:inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:gap-2.5 transition-all">
            All Articles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Featured */}
          <div className="animate-fade-in">
            <Link to={`/article/${featured.slug}`} className="group block bg-card rounded-2xl overflow-hidden border border-border shadow-md hover:shadow-xl transition-all duration-300 h-full">
              <div className="aspect-[16/9] overflow-hidden relative bg-muted">
                {getImage(featured) ? (
                  <img src={cdnImage(getImage(featured), { width: 720, quality: 72 })} srcSet={cdnImageSrcSet(getImage(featured), { width: 720, quality: 72 })} sizes="(max-width: 768px) 100vw, 720px" alt={featured.title} width={720} height={405} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full hero-gradient flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-primary-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground shadow-lg text-xs">
                  <Flame className="w-3 h-3 mr-1" /> Latest
                </Badge>
              </div>
              <div className="p-6">
                <Badge variant="secondary" className="text-xs mb-3">{featured.category}</Badge>
                <h3 className="font-heading font-bold text-foreground text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-snug">{featured.title}</h3>
                {featured.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{featured.excerpt}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {featured.author && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {featured.author}</span>}
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(featured.created_at)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getReadTime(featured.content_chars)}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Rest */}
          <div className="space-y-4">
            {rest.map((article, i) => (
              <div key={article.id} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <Link to={`/article/${article.slug}`} className="group flex gap-4 bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                  <div className="w-32 aspect-[16/9] rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                    {getImage(article) ? (
                      <img src={cdnImage(getImage(article), { width: 280, quality: 70 })} srcSet={cdnImageSrcSet(getImage(article), { width: 280, quality: 70 })} sizes="128px" alt={article.title} width={128} height={72} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}

                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <Badge variant="secondary" className="text-xs w-fit mb-2">{article.category}</Badge>
                    <h4 className="font-heading font-bold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">{article.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatDate(article.created_at)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {getReadTime(article.content_chars)}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold">
            All Articles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LatestArticlesSection;
