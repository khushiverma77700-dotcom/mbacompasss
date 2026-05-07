import { useState, useEffect, useRef } from "react";
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
  const [hydrateSettings, setHydrateSettings] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: heroSettings } = useSiteSettings("hero", { enabled: hydrateSettings });
  const { data: statsSettings } = useSiteSettings("stats", { enabled: hydrateSettings });

  const heading = heroSettings?.heading || "Find the Best MBA Coaching";
  const subheading = heroSettings?.subheading || "Compare top MBA coaching institutes, read reviews, and make informed decisions";
  const popularSearches = heroSettings?.popular_searches || fallbackSearches;
  const stats = statsSettings?.items || fallbackStats;

  useEffect(() => {
    const w = window as any;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 3000));
    const handle = schedule(() => setHydrateSettings(true), { timeout: 5500 });
    return () => {
      const cancel = w.cancelIdleCallback ?? window.clearTimeout;
      try { cancel(handle); } catch {}
    };
  }, []);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const q = query.toLowerCase();
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
        setSuggestions(results.slice(0, 8));
        setShowSuggestions(results.length > 0);
        setSelectedIdx(-1);
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 pointer-events-none" />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-40 pointer-events-none" />

      {/* Lightweight static decorative elements (no animation, no blur — keeps LCP fast) */}
      <div className="absolute w-12 h-12 md:w-20 md:h-20 top-[8%] left-[5%] opacity-10 pointer-events-none">
        <GraduationCap className="w-full h-full text-primary-foreground" />
      </div>
      <div className="absolute w-10 h-10 md:w-14 md:h-14 bottom-[25%] right-[15%] opacity-10 pointer-events-none">
        <BookOpen className="w-full h-full text-primary-foreground" />
      </div>

      {/* Main content */}
      <div className="relative container mx-auto px-4 pt-6 pb-16 md:pt-8 md:pb-20 z-10">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-1 mb-3 border border-white/20 shadow-lg shadow-black/5">
            <Award className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-xs md:text-sm font-semibold text-primary-foreground tracking-wide">
              India's #1 MBA Coaching Discovery Platform
            </span>
            <ChevronRight className="w-3 h-3 text-primary-foreground/60" />
          </div>

          {/* Heading */}
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-1.5 leading-[1.15] tracking-tight">
            {heading}
          </h1>

          <p className="font-heading text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary-foreground/85 mb-2 leading-tight">
            for Your Dream B-School
          </p>

          <p className="text-primary-foreground/75 text-xs md:text-sm mb-4 max-w-xl mx-auto leading-relaxed">
            {subheading}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-4">
            <div className="relative" ref={searchRef}>
              <div className="absolute -inset-1 rounded-xl bg-white/20 blur-md opacity-20 pointer-events-none" />
              <div className="relative flex items-center bg-card rounded-xl shadow-2xl shadow-black/10 overflow-hidden">
                <Search className="absolute left-4 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search by coaching name, city, or exam..."
                  className="h-11 md:h-12 pl-11 pr-28 md:pr-32 rounded-xl bg-transparent text-foreground text-sm md:text-base border-none shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  className="absolute right-2 h-8 md:h-9 px-5 md:px-6 rounded-lg text-sm font-semibold shadow-md"
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
          <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-4 text-xs md:text-sm">
            <span className="text-primary-foreground/50 font-medium self-center">Popular:</span>
            {popularSearches.map((term: string) => (
              <button
                key={term}
                onClick={() => { setQuery(term); }}
                className="text-primary-foreground/90 hover:text-primary-foreground bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full transition-all duration-200 border border-white/10 hover:border-white/25 font-medium"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 max-w-2xl mx-auto">
          {stats.map((stat: any, i: number) => {
            const Icon = iconMap[stat.icon] || BookOpen;
            return (
              <div
                key={i}
                className="group cursor-default animate-fade-in"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className="relative text-center bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/15 overflow-hidden transition-all duration-300 group-hover:bg-white/15 group-hover:border-white/25 group-hover:shadow-lg group-hover:-translate-y-0.5">
                  <div className="relative z-10">
                    <div className="w-8 h-8 mx-auto rounded-lg bg-white/15 flex items-center justify-center mb-1.5 group-hover:bg-white/20 transition-colors">
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                    </div>
                    <div className="text-lg md:text-xl font-heading font-extrabold text-primary-foreground mb-0.5 tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-[10px] md:text-xs text-primary-foreground/65 font-medium">
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
