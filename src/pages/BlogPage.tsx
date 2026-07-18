import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Clock, Search, BookOpen, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
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
  const [email, setEmail] = useState("");

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

  const isDefaultView = selectedCategory === "all" && !searchQuery;

  // Featured = first flagged, otherwise first article
  const flagged = (articles || []).filter(a => a.featured);
  const featuredArticle = (flagged[0] || (articles || [])[0]);

  // Secondary featured (next 2, from flagged then rest)
  const secondaryPool = (flagged.length >= 3 ? flagged : (articles || []))
    .filter(a => a.id !== featuredArticle?.id)
    .slice(0, 2);

  const excludedIds = new Set([featuredArticle?.id, ...secondaryPool.map(a => a.id)].filter(Boolean));
  const gridArticles = isDefaultView
    ? filtered.filter(a => !excludedIds.has(a.id))
    : filtered;

  const trending = (articles || []).slice(0, 3);
  const totalArticles = (articles || []).length;

  const getReadTime = (content: string | null) => {
    if (!content) return "3 min read";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEOHead
        title="MBA Blog — CAT Tips, Career Advice & B-School News"
        description="Expert blogs on CAT prep, XAT strategies, GD-PI tips, MBA vs PGDM, salary insights, and news from top management institutes."
        keywords={[
          "MBA tips", "CAT strategy", "MBA blog", "B-school news", "career guidance",
          "how to prepare for CAT without coaching", "last minute tips for XAT exam",
          "MBA vs PGDM which is better for career", "salary after MBA in India for freshers",
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

      {/* Utility row */}
      <div className="container mx-auto px-6 pt-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex items-center gap-1.5 text-slate-600 hover:text-sky-600 text-sm font-medium transition-colors bg-white border border-sky-100 px-3 py-1.5 rounded-full shadow-sm">
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>

      {/* Masthead */}
      <header className="pt-14 pb-12 border-b border-sky-50 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="inline-block px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-sky-100"
        >
          MBA Compass by B School Buzz
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="font-editorial italic text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight text-slate-950 leading-[0.9]"
        >
          Journal
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mt-6 max-w-2xl mx-auto text-slate-500 text-base md:text-lg font-light leading-relaxed"
        >
          Expert perspectives on admissions, strategy, and leadership for the next generation of Indian business leaders.
        </motion.p>

        {/* Category pills */}
        <nav className="mt-10 flex flex-wrap justify-center gap-2">
          {blogCategories.slice(0, 8).map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-sky-500 text-white shadow-md shadow-sky-200"
                    : "bg-white text-slate-500 border border-slate-100 hover:bg-sky-50 hover:border-sky-100 hover:text-sky-700"
                }`}
              >
                {cat === "all" ? "Latest Stories" : cat}
              </button>
            );
          })}
        </nav>

        {/* Compact search */}
        <div className="mt-8 max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles, schools, strategies..."
            aria-label="Search articles"
            className="w-full pl-11 pr-5 py-3 bg-sky-50/40 border border-sky-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-500">
          <BookOpen className="w-3.5 h-3.5 text-sky-500" />
          <span className="font-medium">{totalArticles}+ expert articles & guides</span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-14">
        <SiteBreadcrumbs items={[{ name: "Blog", url: "/blog" }]} className="mb-8" />

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-96 rounded-3xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left column */}
            <div className="lg:col-span-8">
              {/* Featured article — image never cropped */}
              {featuredArticle && isDefaultView && (
                <motion.article
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="group mb-16"
                >
                  <Link to={`/article/${featuredArticle.slug}`} className="block">
                    <div className="rounded-2xl overflow-hidden bg-sky-50 border border-sky-50 aspect-[16/9] relative">
                      {(featuredArticle.image_url || featuredArticle.banner_url) ? (
                        <>
                          {/* Blurred backdrop so uncropped image sits cleanly */}
                          <img
                            src={(featuredArticle.image_url || featuredArticle.banner_url)!}
                            alt=""
                            aria-hidden
                            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
                          />
                          <img
                            src={(featuredArticle.image_url || featuredArticle.banner_url)!}
                            alt={featuredArticle.title}
                            className="relative w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-700"
                            loading="lazy"
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-sky-50">
                          <BookOpen className="w-20 h-20 text-sky-300" />
                        </div>
                      )}
                    </div>
                    <div className="mt-8 max-w-2xl">
                      <div className="flex items-center gap-3 text-sky-500 font-semibold text-xs uppercase mb-4 tracking-wider">
                        <span>{featuredArticle.category || "News"}</span>
                        <span className="w-1 h-1 rounded-full bg-sky-200" />
                        <span className="text-slate-400 normal-case">{formatDate(featuredArticle.created_at)}</span>
                      </div>
                      <h2 className="font-editorial text-4xl md:text-5xl font-bold leading-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                        {featuredArticle.title}
                      </h2>
                      {featuredArticle.excerpt && (
                        <p className="mt-6 text-slate-500 text-lg leading-relaxed font-light line-clamp-3">
                          {featuredArticle.excerpt}
                        </p>
                      )}
                      <div className="mt-6 inline-flex items-center gap-2 text-sm text-sky-600 font-semibold group-hover:gap-3 transition-all">
                        Read Full Article <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                </motion.article>
              )}

              {/* Secondary featured pair */}
              {isDefaultView && secondaryPool.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16 mb-16">
                  {secondaryPool.map((item) => (
                    <article key={item.id} className="group">
                      <Link to={`/article/${item.slug}`} className="block">
                        <div className="rounded-xl overflow-hidden bg-sky-50 border border-sky-50 aspect-[16/9] relative">
                          {(item.image_url || item.banner_url) ? (
                            <>
                              <img src={(item.image_url || item.banner_url)!} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" />
                              <img
                                src={(item.image_url || item.banner_url)!}
                                alt={item.title}
                                className="relative w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-700"
                                loading="lazy"
                              />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-sky-50">
                              <span className="font-editorial text-2xl text-sky-300">{item.category}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-6">
                          <span className="text-sky-500 font-bold text-[10px] uppercase tracking-wider">{item.category}</span>
                          <h3 className="mt-3 text-xl font-bold leading-snug text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                            {item.title}
                          </h3>
                          <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(item.created_at)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getReadTime(item.content)}</span>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              )}

              {/* Latest grid */}
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

                <div className="grid md:grid-cols-2 gap-x-10 gap-y-14">
                  {gridArticles.map((item, i) => (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <Link to={`/article/${item.slug}`} className="group block">
                        <div className="aspect-[16/9] bg-sky-50 rounded-xl overflow-hidden border border-sky-50 relative">
                          {(item.image_url || item.banner_url) ? (
                            <>
                              <img src={(item.image_url || item.banner_url)!} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" />
                              <img
                                src={(item.image_url || item.banner_url)!}
                                alt={item.title}
                                className="relative w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
                                loading="lazy"
                              />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-sky-50">
                              <span className="font-editorial text-2xl text-sky-300">{item.category}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-5">
                          <span className="text-[11px] font-bold text-sky-500 uppercase tracking-widest">{item.category}</span>
                          <h4 className="mt-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                            {item.title}
                          </h4>
                          {item.excerpt && (
                            <p className="mt-2 text-sm text-slate-500 font-light line-clamp-2 leading-relaxed">
                              {item.excerpt}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
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
            <aside className="lg:col-span-4 space-y-16">
              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-8 pb-3 border-b border-sky-50">
                  Trending Intelligence
                </h3>
                <div className="space-y-10">
                  {trending.map((article, i) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.slug}`}
                      className="flex gap-6 group"
                    >
                      <span className="font-editorial italic text-4xl text-sky-100 group-hover:text-sky-200 transition-colors leading-none flex-shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-800 leading-tight group-hover:text-sky-600 transition-colors line-clamp-3">
                          {article.title}
                        </h4>
                        <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {article.category || "News"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Personalized roadmap CTA (replaces marketing newsletter) */}
              <section className="bg-sky-50 rounded-3xl p-8 md:p-10 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-editorial font-bold text-slate-900">Personalized MBA Roadmap</h3>
                  <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                    Get a tailored shortlist of B-schools and articles curated for your profile — free, in under 2 minutes.
                  </p>
                  <div className="mt-8 space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email"
                      className="w-full px-5 py-4 bg-white border border-sky-100 rounded-xl text-sm focus:ring-2 focus:ring-sky-300 outline-none placeholder:text-slate-400"
                    />
                    <Link
                      to={email ? `/profile-analyzer?email=${encodeURIComponent(email)}` : "/profile-analyzer"}
                      className="block w-full text-center bg-sky-500 text-white font-bold py-4 rounded-xl text-sm hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
                    >
                      Start My Profile
                    </Link>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />
              </section>

              {/* Categories */}
              {blogCategories.length > 2 && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 pb-3 border-b border-sky-50">
                    Browse by Topic
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
                              ? "bg-sky-50 text-sky-700 font-semibold"
                              : "text-slate-600 hover:bg-sky-50/60 hover:text-sky-700"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-sky-500" : "bg-sky-200"}`} />
                            {cat}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}

        <PageKeywords contentType="static" recordId="blog" fallbackKeywords={["MBA blog", "CAT preparation tips", "MBA coaching reviews", "MBA career advice"]} />

        <div className="mt-20 max-w-7xl mx-auto">
          <TopicClusterLinks
            title="Beyond the blog — tools and directories"
            subtitle="Take action on what you just read with these MBA Compass tools and hubs."
            links={DEFAULT_MBA_CLUSTER}
          />
        </div>
      </main>
    </div>
  );
};

export default BlogPage;
