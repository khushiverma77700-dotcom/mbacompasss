import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, Flame, User, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cdnImage } from "@/lib/imageTransform";

const LatestArticlesSection = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["home-latest-articles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (isLoading || !articles?.length) return null;

  const featured = articles[0];
  const rest = articles.slice(1);

  const getImage = (article: typeof featured) => article.image_url || article.banner_url;

  const getReadTime = (content: string | null) => {
    if (!content) return "3 min";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
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
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Featured */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Link to={`/article/${featured.slug}`} className="group block bg-card rounded-2xl overflow-hidden border border-border shadow-md hover:shadow-xl transition-all duration-300 h-full">
              <div className="h-56 overflow-hidden relative">
                {getImage(featured) ? (
                  <img src={getImage(featured)!} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                ) : (
                  <div className="w-full h-full hero-gradient flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-primary-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground shadow-lg text-[10px]">
                  <Flame className="w-3 h-3 mr-1" /> Latest
                </Badge>
              </div>
              <div className="p-6">
                <Badge variant="secondary" className="text-[10px] mb-3">{featured.category}</Badge>
                <h3 className="font-heading font-bold text-foreground text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-snug">{featured.title}</h3>
                {featured.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{featured.excerpt}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {featured.author && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {featured.author}</span>}
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(featured.created_at)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getReadTime(featured.content)}</span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Rest */}
          <div className="space-y-4">
            {rest.map((article, i) => (
              <motion.div key={article.id} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Link to={`/article/${article.slug}`} className="group flex gap-4 bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
                  <div className="w-28 h-24 rounded-xl overflow-hidden flex-shrink-0">
                    {getImage(article) ? (
                      <img src={getImage(article)!} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <Badge variant="secondary" className="text-[10px] w-fit mb-2">{article.category}</Badge>
                    <h4 className="font-heading font-bold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">{article.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatDate(article.created_at)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {getReadTime(article.content)}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
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
