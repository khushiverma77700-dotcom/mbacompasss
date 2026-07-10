import { useState, useEffect, useRef, useDeferredValue, useTransition, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Users, Award, GraduationCap, TrendingUp, Shield, BarChart3, Star, Headphones, Target, ChevronRight, MapPin, Tag, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type HeroSuggestion = {
  type: "institute" | "exam" | "city" | "category" | "college" | "article";
  label: string;
  sub: string;
  link: string;
};

const suggestionIcons = {
  institute: GraduationCap,
  exam: BookOpen,
  city: MapPin,
  category: Tag,
  college: Building2,
  article: BookOpen,
};

const iconMap: Record<string, any> = { BookOpen, Users, Award, GraduationCap, TrendingUp, Shield, BarChart3, Star, Headphones, Target };

const fallbackStats = [
  { icon: "BookOpen", value: "500+", label: "Coaching Institutes" },
  { icon: "Users", value: "10,000+", label: "Student Reviews" },
  { icon: "GraduationCap", value: "50+", label: "Cities Covered" },
  { icon: "TrendingUp", value: "95%", label: "Satisfaction Rate" },
];

const fallbackSearches = ["CAT Coaching Delhi", "Best GMAT Prep", "Online MBA Coaching", "IIM Coaching"];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<HeroSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  // Mobile-perf: settings hydration is deferred 8s so it can never race the
  // initial paint or the CLS measurement window (which extends ~5s past last
  // input). Heading/subheading/stats render from constant fallbacks first.
  const [hydrateSettings, setHydrateSettings] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const { data: heroSettings } = useSiteSettings("hero", { enabled: hydrateSettings });
  const { data: statsSettings } = useSiteSettings("stats", { enabled: hydrateSettings });

  const heading = heroSettings?.heading || "Find the Best MBA Coaching";
  const subheading = heroSettings?.subheading || "Compare top MBA coaching institutes, read reviews, and make informed decisions";
  const popularSearches = heroSettings?.popular_searches || fallbackSearches;
  const stats = statsSettings?.items || fallbackStats;

  useEffect(() => {
    // Mobile-perf: wait until well after LCP + CLS window before fetching
    // optional site-settings overrides. Use rIC so we never compete with
    // user interaction either.
    const w = window as any;
    let idleHandle: number | undefined;
    const timer = window.setTimeout(() => {
      if (typeof w.requestIdleCallback === "function") {
        idleHandle = w.requestIdleCallback(() => setHydrateSettings(true), { timeout: 3000 });
      } else {
        setHydrateSettings(true);
      }
    }, 8000);
    return () => {
      window.clearTimeout(timer);
      if (idleHandle !== undefined) {
        try { w.cancelIdleCallback?.(idleHandle); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (deferredQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const q = deferredQuery.toLowerCase();
      const results: HeroSuggestion[] = [];
      // Lazy-import supabase only when the user actually searches — keeps it out of the LCP critical path
      const { supabase } = await import("@/integrations/supabase/client");
      const [instRes, examRes, catRes, collegeRes, articleRes] = await Promise.all([
        supabase.from("institutes").select("name, slug, city, rating").ilike("name", `%${q}%`).limit(4),
        supabase.from("exams").select("name, slug, full_name, conducting_body").ilike("name", `%${q}%`).limit(3),
        supabase.from("categories").select("name, slug, description").ilike("name", `%${q}%`).limit(3),
        supabase.from("colleges").select("name, slug, city, ranking, fees").ilike("name", `%${q}%`).limit(4),
        supabase.from("articles").select("title, slug, category, excerpt").eq("published", true).ilike("title", `%${q}%`).limit(4),
      ]);
      instRes.data?.forEach((i) => results.push({ type: "institute", label: i.name, sub: `${i.city || ""} · ${i.rating || 0}★`, link: `/institute/${i.slug}` }));
      examRes.data?.forEach((e) => results.push({ type: "exam", label: `${e.name}${e.full_name ? ` — ${e.full_name}` : ""}`, sub: e.conducting_body || "", link: `/exam/${e.slug}` }));
      catRes.data?.forEach((c) => results.push({ type: "category", label: c.name, sub: c.description || "", link: `/category/${c.slug}` }));
      collegeRes.data?.forEach((c) => results.push({ type: "college", label: c.name, sub: `${c.city || ""} · Rank #${c.ranking || "—"}`, link: `/college/${c.slug}` }));
      articleRes.data?.forEach((a) => results.push({ type: "article" as any, label: a.title, sub: a.category || "Blog", link: `/article/${a.slug}` }));
      if (!controller.signal.aborted) {
        // Non-urgent: don't block keystroke paint on rendering the suggestion list
        startTransition(() => {
          setSuggestions(results.slice(0, 8));
          setShowSuggestions(results.length > 0);
          setSelectedIdx(-1);
        });
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [deferredQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (s: HeroSuggestion) => {
    navigate(s.link);
    setQuery("");
    setShowSuggestions(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIdx >= 0 && suggestions[selectedIdx]) {
      handleSelect(suggestions[selectedIdx]);
      return;
    }
    if (query.trim()) {
      navigate(`/category/cat?q=${encodeURIComponent(query)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, 0)); }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Multi-layer gradient background */}
      <div className="absolute inset-0 hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15 pointer-events-none" />

      {/* Soft light orbs for depth (no animation, no blur on mobile) */}
      <div className="hidden md:block absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="hidden md:block absolute -bottom-32 -left-24 w-[24rem] h-[24rem] rounded-full bg-cyan-200/15 blur-3xl pointer-events-none" />

      {/* Lightweight CSS dot pattern */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "36px 36px" }}
      />

      {/* Subtle decorative icons — desktop only to keep mobile clean */}
      <div className="hidden md:block absolute w-16 h-16 top-[10%] left-[6%] opacity-10 pointer-events-none">
        <GraduationCap className="w-full h-full text-primary-foreground" />
      </div>
      <div className="hidden md:block absolute w-12 h-12 bottom-[28%] right-[12%] opacity-10 pointer-events-none">
        <BookOpen className="w-full h-full text-primary-foreground" />
      </div>

      {/* Main content */}
      <div className="relative container mx-auto px-4 pt-10 pb-24 md:pt-16 md:pb-28 z-10">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full pl-1.5 pr-3 py-1 mb-5 border border-white/30 shadow-lg shadow-black/10">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-yellow-200 to-amber-400">
              <Award className="w-3 h-3 text-amber-900" />
            </span>
            <span className="text-[11px] md:text-xs font-semibold text-primary-foreground tracking-wide">
              India's #1 MBA Discovery Platform
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 pl-2 ml-1 border-l border-white/25 text-[10px] md:text-[11px] text-primary-foreground/80">
              <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" /> 4.8/5
            </span>
          </div>

          {/* Heading — editorial: bold sans + italic serif accent */}
          <h1 className="font-heading text-[2rem] leading-[1.05] sm:text-[2.8rem] md:text-[3.4rem] lg:text-[4rem] font-extrabold text-primary-foreground mb-3 tracking-[-0.025em]">
            Find the Best{" "}
            <span className="font-editorial italic font-normal bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-200 bg-clip-text text-transparent tracking-tight">
              MBA Coaching
            </span>
            <span className="block font-editorial italic font-normal text-lg sm:text-2xl md:text-3xl lg:text-[2.5rem] text-primary-foreground/90 mt-2 tracking-tight">
              for your dream B-School
            </span>
          </h1>

          <div className="mx-auto mb-5 h-px w-16 bg-gradient-to-r from-transparent via-yellow-200/60 to-transparent" />

          <p className="text-primary-foreground/80 text-sm md:text-base mb-6 max-w-xl mx-auto leading-relaxed">
            {subheading}
          </p>


          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-4">
            <div className="relative" ref={searchRef}>
              <div className="relative flex items-center bg-card rounded-2xl shadow-2xl shadow-black/20 overflow-hidden ring-1 ring-white/40">
                <Search className="absolute left-4 w-4 h-4 md:w-5 md:h-5 text-primary z-10" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search coaching, college, exam..."
                  aria-label="Search coaching institutes"
                  className="h-12 md:h-14 pl-11 md:pl-12 pr-24 md:pr-32 rounded-2xl bg-transparent text-foreground text-sm md:text-base border-none shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  className="absolute right-1.5 md:right-2 h-9 md:h-10 px-4 md:px-6 rounded-xl text-sm font-semibold shadow-md"
                >
                  Search
                </Button>
              </div>

              {/* Live suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-[320px] overflow-y-auto animate-fade-in">
                  <div className="px-3 py-2 border-b border-border/50">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggestions</span>
                  </div>
                  {suggestions.map((s, i) => {
                    const Icon = suggestionIcons[s.type];
                    return (
                      <button
                        key={`${s.type}-${s.label}-${i}`}
                        type="button"
                        onClick={() => handleSelect(s)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/30 last:border-b-0 ${selectedIdx === i ? "bg-primary/10" : "hover:bg-muted/60"}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground truncate">{s.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.sub}</div>
                        </div>
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize flex-shrink-0">{s.type}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </form>

          {/* Popular searches */}
          <div className="flex flex-wrap justify-center items-center gap-1.5 md:gap-2 mb-6 text-xs md:text-sm">
            <span className="text-primary-foreground/60 font-medium">Popular:</span>
            {popularSearches.slice(0, 4).map((term: string) => (
              <button
                key={term}
                onClick={() => { setQuery(term); }}
                className="text-primary-foreground/95 hover:text-primary-foreground bg-white/15 hover:bg-white/25 px-3 py-1 rounded-full transition-colors duration-150 border border-white/20 hover:border-white/40 font-medium backdrop-blur-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4 max-w-3xl mx-auto">
          {stats.map((stat: any, i: number) => {
            const Icon = iconMap[stat.icon] || BookOpen;
            return (
              <div
                key={i}
                className="group cursor-default"
              >
                <div className="relative text-center bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-2xl p-3.5 md:p-5 border border-white/30 overflow-hidden transition-all duration-300 group-hover:from-white/30 group-hover:to-white/10 group-hover:border-yellow-200/40 group-hover:-translate-y-1 shadow-lg shadow-black/10">
                  <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-yellow-200/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-2 group-hover:from-yellow-200/30 transition-colors ring-1 ring-white/40">
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                    </div>
                    <div className="text-xl md:text-[1.6rem] font-heading font-extrabold text-primary-foreground mb-0.5 tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-[10px] md:text-xs text-primary-foreground/80 font-medium leading-tight">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none">
        <svg viewBox="0 0 1440 40" fill="none" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,20 C240,40 480,0 720,20 C960,40 1200,0 1440,20 L1440,40 L0,40 Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
