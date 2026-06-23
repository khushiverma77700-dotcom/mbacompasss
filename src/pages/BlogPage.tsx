import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Clock, TrendingUp, BookOpen, User, Search, ChevronRight, Flame, Eye, Bookmark, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import PageKeywords from "@/components/PageKeywords";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";
import TopicClusterLinks, { DEFAULT_MBA_CLUSTER } from "@/components/TopicClusterLinks";

const BlogPage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-articles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id,slug,title,excerpt,category,image_url,banner_url,created_at,featured,content,author")
        .eq("published", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
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
        title="MBA Blog — CAT Tips, Career Advice & B-School News"
        description="Expert blogs on CAT prep, XAT strategies, GD-PI tips, MBA vs PGDM, salary insights, and news from top management institutes."
        keywords={[
          "MBA tips", "CAT strategy", "MBA blog", "B-school news", "career guidance",
          "how to prepare for CAT without coaching", "last minute tips for XAT exam",
          "MBA vs PGDM which is better for career", "salary after MBA in India for freshers",
          "preparation tips for MBA personal interview", "how to write statement of purpose for MBA",
          "current affairs for MBA GD PI sessions", "life at IIM experiences from students",
        ]}
        canonical="https://mbacompass.in/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "MBA Compass Blog",
          url: "https://mbacompass.in/blog",
          description: "Expert articles on MBA preparation, coaching reviews, career advice, and B-school admissions.",
        }}
      />


      {/* Hero — Editorial & Premium */}
      <div className="relative py-14 md:py-24 overflow-hidden bg-gradient-to-b from-secondary/40 via-background to-background border-b border-border/60">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[36rem] h-[36rem] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] bg-accent/40 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          {/* Top bar: Back + Share */}
          <div className="flex items-center justify-between mb-10">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground text-sm font-medium transition-colors bg-card border border-border/70 px-3 py-1.5 rounded-full">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>

          <div className="text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-primary font-semibold mb-5">
                <span className="h-px w-8 bg-primary/40" />
                The Journal
                <span className="h-px w-8 bg-primary/40" />
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-5 tracking-[-0.025em] leading-[1.05]">
                MBA insights, <span className="font-editorial italic font-normal text-primary">told well.</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                Preparation strategies, coaching reviews, career advice and the latest from CAT, GMAT, XAT and the B-school world — written by people who've been there.
              </p>
              <div className="inline-flex items-center gap-2 mt-6 text-xs text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">{totalArticles}+ expert articles & guides</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-10 max-w-2xl mx-auto">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search articles, tips, guides..."
                  aria-label="Search articles"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-13 pr-4 py-3 h-14 rounded-2xl bg-card border border-border/70 text-foreground shadow-[0_18px_50px_-25px_hsl(207_90%_54%_/_0.35)] text-base focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </motion.div>

            {blogCategories.length > 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }} className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-7 text-muted-foreground text-sm">
                {blogCategories.filter(c => c !== "all").slice(0, 6).map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                    <span className="w-1 h-1 rounded-full bg-primary/50" />
                    {cat}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>


      <div className="container mx-auto px-4 py-10">
        <SiteBreadcrumbs items={[{ name: "Blog", url: "/blog" }]} className="mb-6" />
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
                    <div className="md:col-span-3 aspect-[16/9] md:aspect-auto md:h-[420px] overflow-hidden relative">
                      {(featuredArticle.image_url || featuredArticle.banner_url) ? (
                        <img
                          src={(featuredArticle.image_url || featuredArticle.banner_url)!}
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
                        <div className="aspect-[16/9] overflow-hidden relative">
                          {(item.image_url || item.banner_url) ? (
                            <img
                              src={(item.image_url || item.banner_url)!}
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
                    <div className="absolute top-0 right-0 hidden w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 md:block" />
                    <div className="absolute bottom-0 left-0 hidden w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6 md:block" />
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

        <PageKeywords contentType="static" recordId="blog" fallbackKeywords={["MBA blog", "CAT preparation tips", "MBA coaching reviews", "MBA career advice"]} />

        <div className="mt-10">
          <TopicClusterLinks
            title="Beyond the blog — tools and directories"
            subtitle="Take action on what you just read with these MBA Compass tools and hubs."
            links={DEFAULT_MBA_CLUSTER}
          />
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
