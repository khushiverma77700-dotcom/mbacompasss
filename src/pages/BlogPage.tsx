import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Clock, TrendingUp, BookOpen, User, Search, Flame, Bookmark, ArrowLeft, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

  const featuredList = (() => {
    const flagged = (articles || []).filter(a => a.featured);
    const base = flagged.length >= 3 ? flagged : (articles || []);
    return base.slice(0, 5);
  })();
  const featuredArticle = featuredList[0];
  const featuredIds = new Set(featuredList.map(a => a.id));
  const regularArticles = filtered.filter(a => !featuredIds.has(a.id));
  const recentArticles = (articles || []).slice(0, 5);
  const totalArticles = (articles || []).length;

  // Hero carousel auto-advance
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (featuredList.length < 2) return;
    const t = setInterval(() => setHeroIndex(i => (i + 1) % featuredList.length), 5500);
    return () => clearInterval(t);
  }, [featuredList.length]);
  const activeFeatured = featuredList[heroIndex] || featuredArticle;

  // Secondary "In the Spotlight" auto-slider (marquee-style, top 8 by recency)
  const spotlight = (articles || []).slice(0, 8);

  const getReadTime = (content: string | null) => {
    if (!content) return "3 min read";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const listToShow = selectedCategory === "all" && !searchQuery ? regularArticles : filtered;

  return (
    <div className="min-h-screen bg-white text-slate-900">
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

      {/* Editorial Hero */}
      <header className="relative overflow-hidden border-b border-sky-100/70">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] bg-sky-100/40 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-10 pb-16 md:pt-14 md:pb-20 relative">
          {/* Utility row */}
          <div className="flex items-center justify-between mb-10">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex items-center gap-1.5 text-slate-600 hover:text-sky-600 text-sm font-medium transition-colors bg-white border border-sky-100 px-3 py-1.5 rounded-full shadow-sm">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>

          <div className="text-center max-w-4xl mx-auto space-y-6">
            <motion.span
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="inline-block px-3 py-1 bg-sky-50 text-sky-600 text-xs font-semibold tracking-[0.2em] uppercase rounded-full border border-sky-100"
            >
              Advisor Insights
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-[-0.02em] text-slate-900"
            >
              The MBA <span className="font-editorial italic font-normal text-sky-500">Compass</span> Journal
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="max-w-2xl mx-auto text-slate-500 text-base md:text-lg font-light leading-relaxed"
            >
              Expert perspectives on admissions, strategy, and leadership for the next generation of Indian business leaders.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="pt-2 flex flex-col items-center gap-6 max-w-3xl mx-auto"
            >
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, schools, or strategies..."
                  aria-label="Search articles"
                  className="w-full pl-12 pr-6 py-4 bg-sky-50/40 border border-sky-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-2.5">
                {blogCategories.slice(0, 8).map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                        active
                          ? "bg-sky-500 text-white shadow-md shadow-sky-200 hover:scale-105 active:scale-95"
                          : "border border-sky-100 text-slate-600 hover:bg-sky-50 hover:border-sky-200"
                      }`}
                    >
                      {cat === "all" ? "All Topics" : cat}
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-medium">{totalArticles}+ expert articles & guides</span>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <SiteBreadcrumbs items={[{ name: "Blog", url: "/blog" }]} className="mb-8" />

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-96 rounded-3xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 lg:gap-12">
            {/* Left column */}
            <div className="col-span-12 lg:col-span-8 space-y-16">
              {/* Featured Auto-Slider */}
              {activeFeatured && selectedCategory === "all" && !searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <div className="relative bg-white border border-sky-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-500">
                    <div className="grid md:grid-cols-2">
                      {/* Image side — fills the card fully, no side borders */}
                      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[340px] overflow-hidden bg-sky-50">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeFeatured.id}
                            initial={{ opacity: 0, scale: 1.02 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="absolute inset-0"
                          >
                            {(activeFeatured.image_url || activeFeatured.banner_url) ? (
                              <img
                                src={(activeFeatured.image_url || activeFeatured.banner_url)!}
                                alt={activeFeatured.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-sky-50">
                                <BookOpen className="w-20 h-20 text-sky-300" />
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                        <div className="absolute top-5 left-5 z-10">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-sm text-sky-600 text-xs font-bold rounded-lg shadow-sm">
                            <Flame className="w-3 h-3" /> FEATURED
                          </span>
                        </div>
                        {/* Slide counter */}
                        {featuredList.length > 1 && (
                          <div className="absolute bottom-5 left-5 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
                            <span className="text-sky-600">{String(heroIndex + 1).padStart(2, "0")}</span>
                            <span className="text-slate-300">/</span>
                            <span>{String(featuredList.length).padStart(2, "0")}</span>
                          </div>
                        )}
                      </div>

                      {/* Text side */}
                      <div className="p-6 md:p-8 flex flex-col justify-center space-y-3 relative">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeFeatured.id + "-text"}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-4"
                          >
                            <div className="text-xs font-bold text-sky-500 tracking-[0.2em] uppercase">
                              {activeFeatured.category || "News"}
                            </div>
                            <Link to={`/article/${activeFeatured.slug}`} className="block group">
                              <h2 className="font-editorial text-3xl md:text-4xl leading-[1.1] text-slate-900 group-hover:text-sky-600 transition-colors">
                                {activeFeatured.title}
                              </h2>
                            </Link>
                            {activeFeatured.excerpt && (
                              <p className="text-slate-500 leading-relaxed font-light line-clamp-3">
                                {activeFeatured.excerpt}
                              </p>
                            )}
                            {activeFeatured.author && (
                              <div className="pt-2 flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                                  <User className="w-3.5 h-3.5 text-sky-600" />
                                </span>
                                <span>
                                  <span className="block font-semibold text-slate-700">{activeFeatured.author}</span>
                                  <span className="text-[11px] text-slate-400">Senior MBA Mentor</span>
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(activeFeatured.created_at)}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getReadTime(activeFeatured.content)}</span>
                            </div>
                            <Link
                              to={`/article/${activeFeatured.slug}`}
                              className="pt-1 inline-flex items-center gap-2 text-sm text-sky-600 font-semibold hover:gap-3 transition-all"
                            >
                              Read Full Article <ArrowRight className="w-4 h-4" />
                            </Link>
                          </motion.div>
                        </AnimatePresence>

                        {/* Controls */}
                        {featuredList.length > 1 && (
                          <div className="pt-6 mt-2 border-t border-sky-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {featuredList.map((_, i) => (
                                <button
                                  key={i}
                                  aria-label={`Go to slide ${i + 1}`}
                                  onClick={() => setHeroIndex(i)}
                                  className={`transition-all rounded-full ${
                                    i === heroIndex
                                      ? "w-6 h-1.5 bg-sky-500"
                                      : "w-1.5 h-1.5 bg-sky-200 hover:bg-sky-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                aria-label="Previous slide"
                                onClick={() => setHeroIndex(i => (i - 1 + featuredList.length) % featuredList.length)}
                                className="w-9 h-9 rounded-full border border-sky-100 hover:border-sky-300 hover:bg-sky-50 text-slate-600 hover:text-sky-600 flex items-center justify-center transition-all"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                aria-label="Next slide"
                                onClick={() => setHeroIndex(i => (i + 1) % featuredList.length)}
                                className="w-9 h-9 rounded-full border border-sky-100 hover:border-sky-300 hover:bg-sky-50 text-slate-600 hover:text-sky-600 flex items-center justify-center transition-all"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* In the Spotlight — auto-scrolling marquee strip */}
              {spotlight.length > 3 && selectedCategory === "all" && !searchQuery && (
                <section className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-sky-500 mb-1.5">Now Trending</div>
                      <h3 className="font-editorial text-xl md:text-2xl text-slate-900">
                        In the <span className="italic text-sky-500">Spotlight</span>
                      </h3>
                    </div>
                  </div>
                  <div
                    className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/60 via-white to-sky-50/60"
                    style={{
                      maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                      WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                    }}
                  >
                    <div className="flex gap-4 py-5 animate-marquee group-hover:[animation-play-state:paused]">
                      {[...spotlight, ...spotlight].map((item, i) => (
                        <Link
                          key={`${item.id}-${i}`}
                          to={`/article/${item.slug}`}
                          className="shrink-0 w-[280px] bg-white border border-sky-100 rounded-xl p-3 flex gap-3 items-center hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/5 transition-all"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-sky-50 flex-shrink-0">
                            {(item.image_url || item.banner_url) ? (
                              <img
                                src={(item.image_url || item.banner_url)!}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-sky-50">
                                <BookOpen className="w-5 h-5 text-sky-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-sky-500 uppercase tracking-widest truncate">{item.category || "News"}</div>
                            <div className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{item.title}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}



              {/* Latest Intelligence */}
              <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-sky-100 pb-4">
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-sky-500 mb-1.5">The Reading List</div>
                    <h3 className="font-editorial text-2xl md:text-3xl text-slate-900">
                      Latest <span className="italic text-sky-500">Intelligence</span>
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {filtered.length} {filtered.length === 1 ? "story" : "stories"}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {listToShow.map((item, i) => (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link to={`/article/${item.slug}`} className="group block space-y-4">
                        <div className="aspect-video bg-sky-50 rounded-2xl overflow-hidden border border-sky-100 group-hover:border-sky-300 transition-all duration-300 relative">
                          {(item.image_url || item.banner_url) ? (
                            <img
                              src={(item.image_url || item.banner_url)!}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-sky-50">
                              <span className="font-editorial text-2xl text-sky-300">{item.category}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-sky-500 uppercase tracking-widest">{item.category}</span>
                          <h4 className="text-xl font-semibold leading-snug text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                            {item.title}
                          </h4>
                          {item.excerpt && (
                            <p className="text-sm text-slate-500 font-light line-clamp-2 leading-relaxed">
                              {item.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(item.created_at)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getReadTime(item.content)}</span>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="text-center py-20 bg-sky-50/40 rounded-3xl border border-sky-100">
                    <BookOpen className="w-14 h-14 text-sky-200 mx-auto mb-4" />
                    <p className="text-slate-800 font-semibold text-lg">No articles found</p>
                    <p className="text-sm text-slate-500 mt-1">Try a different category or search term</p>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-24 space-y-8">
                {/* Trending */}
                <div className="bg-sky-50/50 border border-sky-100 rounded-3xl p-8">
                  <h3 className="font-editorial italic text-xl text-slate-900 mb-8 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-500 not-italic" />
                    Trending Conversations
                  </h3>
                  <div className="space-y-8">
                    {recentArticles.map((article, i) => (
                      <Link
                        key={article.id}
                        to={`/article/${article.slug}`}
                        className="flex gap-5 group"
                      >
                        <span className="font-editorial text-4xl text-sky-200/80 leading-none flex-shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="space-y-1.5">
                          <h5 className="font-semibold text-sm leading-snug text-slate-800 group-hover:text-sky-600 transition-colors line-clamp-3">
                            {article.title}
                          </h5>
                          <p className="text-[11px] text-slate-400 uppercase tracking-tight">
                            {getReadTime(article.content)} • {formatDate(article.created_at)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* CTA card */}
                  <div className="mt-10 pt-8 border-t border-sky-100">
                    <div className="p-6 bg-white rounded-2xl border border-sky-200 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900 mb-2">Personalized MBA Roadmap</p>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Get a tailored shortlist of B-schools and articles based on your profile.
                      </p>
                      <Link
                        to="/profile-analyzer"
                        className="block w-full text-center py-2.5 bg-sky-500 text-white text-xs font-bold rounded-xl hover:bg-sky-600 transition-colors"
                      >
                        Start My Profile
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                {blogCategories.length > 2 && (
                  <div className="bg-white border border-sky-100 rounded-3xl p-8">
                    <h3 className="font-editorial italic text-xl text-slate-900 mb-6 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-sky-500 not-italic" />
                      Browse by topic
                    </h3>
                    <div className="space-y-1">
                      {blogCategories.filter(c => c !== "all").map(cat => {
                        const count = (articles || []).filter(a => a.category === cat).length;
                        const active = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                              active
                                ? "bg-sky-50 text-sky-700 font-semibold border border-sky-200"
                                : "text-slate-600 hover:bg-sky-50/60 hover:text-sky-700 border border-transparent"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-sky-500" : "bg-sky-200"}`} />
                              {cat}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-bold px-2 bg-sky-50 text-sky-600 border border-sky-100">{count}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        <PageKeywords contentType="static" recordId="blog" fallbackKeywords={["MBA blog", "CAT preparation tips", "MBA coaching reviews", "MBA career advice"]} />

        <div className="mt-16 max-w-7xl mx-auto">
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
