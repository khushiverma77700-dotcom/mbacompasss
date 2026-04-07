import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Users, Award, GraduationCap, TrendingUp, Shield, BarChart3, Star, Headphones, Target, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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
  const navigate = useNavigate();
  const { data: heroSettings } = useSiteSettings("hero");
  const { data: statsSettings } = useSiteSettings("stats");

  const heading = heroSettings?.heading || "Find the Best MBA Coaching";
  const subheading = heroSettings?.subheading || "Compare top MBA coaching institutes, read reviews, and make informed decisions";
  const popularSearches = heroSettings?.popular_searches || fallbackSearches;
  const stats = statsSettings?.items || fallbackStats;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/category/cat?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center">
      {/* Multi-layer gradient background */}
      <div className="absolute inset-0 hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 pointer-events-none" />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-40 pointer-events-none" />

      {/* Floating decorative elements — CSS only, no JS animation overhead */}
      <div className="absolute w-16 h-16 md:w-24 md:h-24 top-[8%] left-[5%] opacity-10 animate-bounce" style={{ animationDuration: '7s' }}>
        <GraduationCap className="w-full h-full text-primary-foreground" />
      </div>
      <div className="absolute w-10 h-10 md:w-14 md:h-14 top-[15%] right-[8%] opacity-10 animate-bounce" style={{ animationDuration: '5.5s', animationDelay: '1s' }}>
        <GraduationCap className="w-full h-full text-primary-foreground" />
      </div>
      <div className="absolute w-12 h-12 md:w-16 md:h-16 bottom-[20%] right-[20%] opacity-10 animate-bounce" style={{ animationDuration: '6s', animationDelay: '2s' }}>
        <BookOpen className="w-full h-full text-primary-foreground" />
      </div>

      {/* Glowing orbs — CSS only */}
      <div className="absolute w-64 h-64 -top-20 -left-20 bg-white/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />
      <div className="absolute w-96 h-96 -bottom-32 -right-32 bg-white/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '6s', animationDelay: '2s' }} />

      {/* Main content */}
      <div className="relative container mx-auto px-4 py-16 md:py-24 z-10">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-5 py-2 mb-8 border border-white/20 shadow-lg shadow-black/5">
            <Award className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-semibold text-primary-foreground tracking-wide">
              India's #1 MBA Coaching Discovery Platform
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-primary-foreground/60" />
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-3 leading-[1.1] tracking-tight">
            {heading}
          </h1>

          <p className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground/85 mb-6 leading-tight">
            for Your Dream B-School
          </p>

          <p className="text-primary-foreground/75 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            {subheading}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-white/20 blur-md opacity-20" />
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by coaching name, city, or exam..."
                  className="h-16 pl-14 pr-36 rounded-2xl bg-card text-foreground text-base md:text-lg border-none shadow-2xl shadow-black/10 focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-11 px-7 rounded-xl text-base font-semibold shadow-lg"
                >
                  Search
                </Button>
              </div>
            </div>
          </form>

          {/* Popular searches */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-14 text-sm">
            <span className="text-primary-foreground/50 font-medium self-center">Popular:</span>
            {popularSearches.map((term: string) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="text-primary-foreground/90 hover:text-primary-foreground bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full transition-all duration-200 border border-white/10 hover:border-white/25 font-medium"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-3xl mx-auto">
          {stats.map((stat: any, i: number) => {
            const Icon = iconMap[stat.icon] || BookOpen;
            return (
              <div
                key={i}
                className="group cursor-default animate-fade-in"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className="relative text-center bg-white/10 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-white/15 overflow-hidden transition-all duration-300 group-hover:bg-white/15 group-hover:border-white/25 group-hover:shadow-xl group-hover:-translate-y-1">
                  <div className="relative z-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 mx-auto rounded-xl bg-white/15 flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                    </div>
                    <div className="text-2xl md:text-3xl font-heading font-extrabold text-primary-foreground mb-0.5 tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-xs md:text-sm text-primary-foreground/65 font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
