import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Users, Award, GraduationCap, TrendingUp, Shield, BarChart3, Star, Headphones, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const iconMap: Record<string, any> = { BookOpen, Users, Award, GraduationCap, TrendingUp, Shield, BarChart3, Star, Headphones, Target };

const fallbackStats = [
  { icon: "BookOpen", value: "300+", label: "MBA Coaching Centres" },
  { icon: "GraduationCap", value: "50+", label: "MBA Courses" },
  { icon: "Users", value: "5L+", label: "Students Guided" },
  { icon: "TrendingUp", value: "92%", label: "Avg. Success Rate" },
];

const fallbackSearches = ["CAT Coaching", "GMAT Prep", "XAT Coaching", "Online MBA Coaching"];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: heroSettings } = useSiteSettings("hero");
  const { data: statsSettings } = useSiteSettings("stats");

  const heading = heroSettings?.heading || "Find the Best MBA Coaching";
  const subheading = heroSettings?.subheading || "Compare top coaching institutes for CAT, GMAT, XAT, SNAP & more.";
  const popularSearches = heroSettings?.popular_searches || fallbackSearches;
  const stats = statsSettings?.items || fallbackStats;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/category/cat?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50" />

      <div className="relative container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
            <Award className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">India's #1 MBA Coaching Discovery Platform</span>
          </div>
          
          <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 leading-tight">
            {heading}
            <br />
            <span className="opacity-90">for Your Dream B-School</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">{subheading}</p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by coaching name, city, or exam..."
                className="h-14 pl-12 pr-32 rounded-xl bg-card text-foreground text-base border-none shadow-lg"
              />
              <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 rounded-lg">
                Search
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mb-10 text-sm">
            <span className="text-primary-foreground/60">Popular:</span>
            {popularSearches.map((term: string) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="text-primary-foreground/90 hover:text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-1 rounded-full transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-2xl mx-auto"
        >
          {stats.map((stat: any, i: number) => {
            const Icon = iconMap[stat.icon] || BookOpen;
            return (
              <div key={i} className="text-center bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
                <Icon className="w-5 h-5 text-primary-foreground mx-auto mb-2" />
                <div className="text-xl md:text-2xl font-heading font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-xs text-primary-foreground/70">{stat.label}</div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
