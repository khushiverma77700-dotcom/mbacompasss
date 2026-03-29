import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, TrendingUp, BookOpen, User, Search, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
  
  const filtered = (articles || []).filter(item => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const featuredArticle = (articles || []).find(a => a.featured) || (articles || [])[0];
  const regularArticles = filtered.filter(a => a.id !== featuredArticle?.id);
  const recentArticles = (articles || []).slice(0, 5);

  const getReadTime = (content: string | null) => {
    if (!content) return "3 min read";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MBA Blog & News — Exam Tips, Career Advice, Coaching Reviews | BestMBACoaching.com"
        description="Read expert articles on MBA entrance exams, coaching reviews, career advice, interview tips, and the latest MBA news."
        keywords={["MBA blog", "CAT preparation tips", "MBA coaching reviews", "MBA career advice", "GMAT tips"]}
        canonical="https://bestmbacoaching.com/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "BestMBACoaching Blog",
          url: "https://bestmbacoaching.com/blog",
          description: "Expert articles on MBA preparation, coaching reviews, and career advice",
        }}
      />

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 pt-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /><span className="text-foreground font-medium">Blog</span></li>
        </ol>
      </nav>

      {/* Hero Section */}
      <div className="hero-gradient py-12 md:py-16 mt-2 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-white/15 text-primary-foreground border-white/20 mb-4">
              <BookOpen className="w-3 h-3 mr-1" /> Expert Insights & Guides
            </Badge>
            <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-primary-foreground mb-3 tracking-tight">
              MBA Blog & News
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-base md:text-lg">
              Expert preparation strategies, coaching reviews, career advice, and the latest updates on CAT, GMAT, XAT & more
            </p>
          </motion.div>
          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search articles, tips, guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 h-12 rounded-xl bg-white/95 backdrop-blur-sm border-0 text-foreground shadow-lg text-base"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Categories */}
        <div className="flex gap-2 flex-wrap mb-8 -mt-4 relative z-10">
          <div className="w-full bg-card rounded-xl p-3 card-shadow border border-border flex gap-2 flex-wrap">
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {cat === "all" ? "All Articles" : cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-80 rounded-2xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Featured Article Hero */}
            {featuredArticle && selectedCategory === "all" && !searchQuery && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                <Link
                  to={`/article/${featuredArticle.slug}`}
                  className="group block relative rounded-2xl overflow-hidden bg-card border border-border card-shadow hover:card-shadow-hover transition-all duration-500"
                >
                  <div className="grid md:grid-cols-2">
                    <div className="h-56 md:h-80 overflow-hidden">
                      {featuredArticle.image_url ? (
                        <img
                          src={featuredArticle.image_url}
                          alt={featuredArticle.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full hero-gradient flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-primary-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 md:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">
                          <TrendingUp className="w-3 h-3 mr-1" /> Featured
                        </Badge>
                        <Badge variant="secondary">{featuredArticle.category}</Badge>
                      </div>
                      <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-tight">
                        {featuredArticle.title}
                      </h2>
                      {featuredArticle.excerpt && (
                        <p className="text-muted-foreground mb-4 line-clamp-3 text-sm leading-relaxed">{featuredArticle.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                        {featuredArticle.author && (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> {featuredArticle.author}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> {new Date(featuredArticle.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {getReadTime(featuredArticle.content)}
                        </span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary font-semibold group-hover:gap-2.5 transition-all">
                        Read Full Article <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Main Grid + Sidebar */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Articles Grid */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-heading text-lg font-bold text-foreground">
                    {selectedCategory === "all" ? "Latest Articles" : selectedCategory}
                    <span className="text-sm font-normal text-muted-foreground ml-2">({filtered.length})</span>
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {(selectedCategory === "all" && !searchQuery ? regularArticles : filtered).map((item, i) => (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        to={`/article/${item.slug}`}
                        className="group flex flex-col bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 border border-border h-full hover:-translate-y-1"
                      >
                        <div className="h-44 overflow-hidden relative">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full hero-gradient flex items-center justify-center">
                              <span className="font-heading font-bold text-primary-foreground/40 text-lg">{item.category}</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 backdrop-blur-sm text-foreground text-xs font-semibold shadow-sm">
                              {item.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {getReadTime(item.content)}
                            </span>
                          </div>
                          <h3 className="font-heading font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                            {item.title}
                          </h3>
                          {item.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{item.excerpt}</p>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                            {item.author && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-3 h-3 text-primary" />
                                </div>
                                {item.author}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold group-hover:gap-2 transition-all">
                              Read <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <div className="text-center py-16 bg-card rounded-xl border border-border">
                    <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No articles found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different category or search term</p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Popular Articles */}
                <div className="bg-card rounded-xl border border-border p-5 card-shadow">
                  <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Trending Articles
                  </h3>
                  <div className="space-y-4">
                    {recentArticles.map((article, i) => (
                      <Link
                        key={article.id}
                        to={`/article/${article.slug}`}
                        className="group flex gap-3 items-start"
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                            {article.title}
                          </h4>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {new Date(article.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Categories List */}
                <div className="bg-card rounded-xl border border-border p-5 card-shadow">
                  <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Categories
                  </h3>
                  <div className="space-y-2">
                    {blogCategories.filter(c => c !== "all").map(cat => {
                      const count = (articles || []).filter(a => a.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                            selectedCategory === cat
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span>{cat}</span>
                          <Badge variant="secondary" className="text-xs">{count}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CTA Card */}
                <div className="hero-gradient rounded-xl p-6 text-primary-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <h3 className="font-heading font-bold mb-2">Get Free MBA Guidance</h3>
                  <p className="text-sm text-primary-foreground/80 mb-4">Expert counselling for CAT, GMAT, XAT preparation</p>
                  <Link to="/contact" className="inline-flex items-center gap-1.5 bg-white text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors">
                    Get Started <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
