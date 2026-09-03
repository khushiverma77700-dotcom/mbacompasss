import { Link } from "@/lib/router-compat";
import { ArrowRight, Calendar, Clock, User, BookOpen, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cdnImage, cdnImageSrcSet } from "@/lib/imageTransform";


const NewsSection = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["homepage-news"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("articles")
        .select("id,slug,title,excerpt,category,image_url,banner_url,created_at,content_chars,author")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const getReadTime = (chars: number | null | undefined) => {
    if (!chars) return "3 min";
    const words = chars / 5.5;
    return `${Math.max(1, Math.ceil(words / 200))} min`;
  };

  const featured = articles?.[0];
  const rest = articles?.slice(1, 4) || [];

  const getImage = (a: any) => a?.image_url || a?.banner_url;

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-2xl" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!articles?.length) return null;

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <BookOpen className="w-3.5 h-3.5" /> Latest Updates
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">
                MBA News & <span className="text-gradient">Expert Tips</span>
              </h2>
              <p className="text-muted-foreground text-sm">Exam updates, preparation strategies, and career advice from experts</p>
            </div>
          </div>
          <Link to="/blog">
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:inline-flex">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Featured Article */}
          {featured && (
            <div className="animate-fade-in">
              <Link
                to={`/article/${featured.slug}`}
                className="group block bg-card rounded-2xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 border border-border h-full"
              >
                <div className="h-48 md:h-56 overflow-hidden relative">
                  {getImage(featured) ? (
                    <img src={cdnImage(getImage(featured), { width: 720, quality: 72 })} srcSet={cdnImageSrcSet(getImage(featured), { width: 720, quality: 72 })} sizes="(max-width: 768px) 100vw, 640px" alt={featured.title} width={720} height={405} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full hero-gradient flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-primary-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-primary text-primary-foreground shadow-md">
                      <TrendingUp className="w-3 h-3 mr-1" /> Latest
                    </Badge>
                    <Badge className="bg-white/90 backdrop-blur-sm text-foreground">{featured.category}</Badge>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {featured.title}
                  </h3>
                  {featured.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{featured.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {featured.author && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {featured.author}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(featured.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getReadTime(featured.content_chars)}</span>
                    </div>
                    <span className="text-primary font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Side list */}
          <div className="flex flex-col gap-4">
            {rest.map((item, i) => (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Link
                  to={`/article/${item.slug}`}
                  className="group flex gap-4 bg-card rounded-xl p-4 card-shadow hover:card-shadow-hover transition-all duration-300 border border-border hover:-translate-y-0.5"
                >
                  <div className="w-28 h-24 rounded-lg overflow-hidden shrink-0">
                    {getImage(item) ? (
                      <img src={cdnImage(getImage(item), { width: 220, quality: 70 })} srcSet={cdnImageSrcSet(getImage(item), { width: 220, quality: 70 })} sizes="112px" alt={item.title} width={112} height={96} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full hero-gradient flex items-center justify-center">
                        <span className="text-primary-foreground/40 text-xs font-bold">{item.category}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {getReadTime(item.content_chars)}
                        </span>
                      </div>
                      <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}

            {/* View All Mobile */}
            <Link to="/blog" className="sm:hidden">
              <Button variant="outline" className="w-full gap-1.5">
                View All Articles <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
