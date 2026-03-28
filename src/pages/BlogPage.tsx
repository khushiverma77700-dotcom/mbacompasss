import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead, { generateListingSchema } from "@/components/SEOHead";

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-articles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const blogCategories = ["all", ...new Set((articles || []).map(n => n.category).filter(Boolean))];
  const filtered = selectedCategory === "all" ? (articles || []) : (articles || []).filter(n => n.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MBA Blog & News — Exam Tips, Career Advice, Coaching Reviews | BestMBACoaching.com"
        description="Read expert articles on MBA entrance exams, coaching reviews, career advice, interview tips, and the latest MBA news. Get preparation strategies for CAT, GMAT, XAT, SNAP."
        keywords={["MBA blog", "CAT preparation tips", "MBA coaching reviews", "MBA career advice", "GMAT tips", "MBA news India"]}
        canonical="https://bestmbacoaching.com/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "BestMBACoaching Blog",
          url: "https://bestmbacoaching.com/blog",
          description: "Expert articles on MBA preparation, coaching reviews, and career advice",
        }}
      />

      <nav className="container mx-auto px-4 pt-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li className="flex items-center gap-1.5"><span>/</span><span className="text-foreground font-medium">Blog</span></li>
        </ol>
      </nav>

      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">MBA Blog & News</h1>
          <p className="text-primary-foreground/70">Exam tips, career advice, coaching reviews, and the latest MBA news</p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 flex-wrap mb-8">
          {blogCategories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary border border-border"}`}>
              {cat === "all" ? "All Articles" : cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, i) => (
              <motion.article key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/article/${item.slug}`} className="group block bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 border border-border h-full">
                  {item.image_url ? (
                    <div className="h-36 overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  ) : (
                    <div className="h-36 hero-gradient flex items-center justify-center">
                      <span className="font-heading font-bold text-primary-foreground text-sm opacity-60">{item.category}</span>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                    {item.excerpt && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{item.excerpt}</p>}
                    <div className="flex items-center justify-between">
                      {item.author && <span className="text-xs text-muted-foreground">By {item.author}</span>}
                      <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">Read More <ArrowRight className="w-3.5 h-3.5" /></span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
