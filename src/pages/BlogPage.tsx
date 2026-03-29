import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, TrendingUp, BookOpen, User, Search, ChevronRight, Flame, Eye, Bookmark } from "lucide-react";
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
  const totalArticles = (articles || []).length;

  const getReadTime = (content: string | null) => {
    if (!content) return "3 min read";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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

      {/* Hero */}
      <div className="hero-gradient py-14 md:py-20 mt-2 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="white" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-5 border border-white/10">
              <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">{totalArticles}+ Expert Articles & Guides</span>
            </div>
            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-4 tracking-tight leading-tight">
              MBA Insights & <br className="hidden md:block" />Expert Strategies
            </h1>
            <p className="text-primary-foreground/75 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Preparation strategies, coaching reviews, career advice, and the latest updates on CAT, GMAT, XAT & more
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 max-w-2xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search articles, tips, guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-13 pr-4 py-3 h-14 rounded-2xl bg-white/95 backdrop-blur-sm border-0 text-foreground shadow-2xl text-base focus:ring-2 focus:ring-white/30"
              />
            </div>
          </motion.div>

          {/* Quick stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap justify-center gap-6 mt-8 text-primary-foreground/70 text-sm">
            {blogCategories.filter(c => c !== "all").slice(0, 5).map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className="hover:text-primary-foreground transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/40" />
                {cat}
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Category Filter Bar */}
        <div className="flex gap-2 flex-wrap mb-10 -mt-6 relative z-10">
          <div className="w-full bg-card rounded-2xl p-4 shadow-lg border border-border flex gap-2 flex-wrap items-center">
            <span className="text-sm font-semibold text-foreground mr-2">Filter:</span>
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat === "all" ? "All Articles" : cat}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} articles</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-96 rounded-2xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Featured Article Hero */}
            {featuredArticle && selectedCategory === "all" && !searchQuery && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                <Link
                  to={`/article/${featuredArticle.slug}`}
                  className="group block relative rounded-2xl overflow-hidden bg-card border border-border shadow-xl hover:shadow-2xl transition-all duration-500"
                >
                  <div className="grid md:grid-cols-5">
                    <div className="md:col-span-3 h-64 md:h-[420px] overflow-hidden relative">
                      {featuredArticle.image_url ? (
                        <img
                          src={featuredArticle.image_url}
                          alt={featuredArticle.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full hero-gradient flex items-center justify-center">
                          <BookOpen className="w-20 h-20 text-primary-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/10" />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-primary text-primary-foreground shadow-lg text-xs px-3 py-1">
                          <Flame className="w-3 h-3 mr-1" /> Featured
                        </Badge>
                      </div>
                    </div>
                    <div className="md:col-span-2 p-6 md:p-10 flex flex-col justify-center">
                      <Badge variant="secondary" className="w-fit mb-4 text-xs">{featuredArticle.category}</Badge>
                      <h2 className="font-heading text-xl md:text-3xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors leading-tight">
                        {featuredArticle.title}
                      </h2>
                      {featuredArticle.excerpt && (
                        <p className="text-muted-foreground mb-6 line-clamp-3 text-sm leading-relaxed">{featuredArticle.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
                        {featuredArticle.author && (
                          <span className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            {featuredArticle.author}
                          </span>
                        )}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(featuredArticle.created_at)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getReadTime(featuredArticle.content)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm text-primary font-bold group-hover:gap-3 transition-all">
                        Read Full Article <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Main Grid + Sidebar */}
            <div className="grid lg:grid-cols-3 gap-10">
              {/* Articles */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    {selectedCategory === "all" ? "Latest Articles" : selectedCategory}
                    <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
                  </h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {(selectedCategory === "all" && !searchQuery ? regularArticles : filtered).map((item, i) => (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        to={`/article/${item.slug}`}
                        className="group flex flex-col bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border h-full hover:-translate-y-1"
                      >
                        <div className="h-48 overflow-hidden relative">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full hero-gradient flex items-center justify-center">
                              <span className="font-heading font-bold text-primary-foreground/30 text-lg">{item.category}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 backdrop-blur-sm text-foreground text-[10px] font-semibold shadow-sm px-2.5 py-0.5">
                              {item.category}
                            </Badge>
                          </div>
                          <div className="absolute bottom-3 right-3 flex gap-1.5">
                            <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {getReadTime(item.content)}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {formatDate(item.created_at)}
                            </span>
                          </div>
                          <h3 className="font-heading font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug text-[15px]">
                            {item.title}
                          </h3>
                          {item.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{item.excerpt}</p>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
                            {item.author ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-3 h-3 text-primary" />
                                </div>
                                {item.author}
                              </span>
                            ) : <span />}
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-bold group-hover:gap-2 transition-all">
                              Read <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <div className="text-center py-20 bg-card rounded-2xl border border-border">
                    <BookOpen className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-foreground font-semibold text-lg">No articles found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different category or search term</p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Trending */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-md">
                  <h3 className="font-heading font-bold text-foreground mb-5 flex items-center gap-2 text-base">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    Trending Articles
                  </h3>
                  <div className="space-y-4">
                    {recentArticles.map((article, i) => (
                      <Link
                        key={article.id}
                        to={`/article/${article.slug}`}
                        className="group flex gap-4 items-start p-2 -mx-2 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(article.created_at)}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {getReadTime(article.content)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-md">
                  <h3 className="font-heading font-bold text-foreground mb-5 flex items-center gap-2 text-base">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-primary" />
                    </div>
                    Categories
                  </h3>
                  <div className="space-y-1.5">
                    {blogCategories.filter(c => c !== "all").map(cat => {
                      const count = (articles || []).filter(a => a.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                            selectedCategory === cat
                              ? "bg-primary/10 text-primary font-bold border border-primary/20"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${selectedCategory === cat ? "bg-primary" : "bg-muted-foreground/30"}`} />
                            {cat}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-bold px-2">{count}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Newsletter CTA */}
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 hero-gradient" />
                  <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                  </div>
                  <div className="relative p-6">
                    <h3 className="font-heading font-bold text-primary-foreground text-lg mb-2">Get Free MBA Guidance</h3>
                    <p className="text-sm text-primary-foreground/75 mb-5 leading-relaxed">Expert counselling for CAT, GMAT, XAT preparation and college selection</p>
                    <Link to="/contact" className="inline-flex items-center gap-2 bg-white text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors shadow-lg">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
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
