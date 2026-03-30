import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Users, Award, GraduationCap, TrendingUp, Shield, BarChart3, Star, Headphones, Target, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import heroBg from "@/assets/hero-bg.jpg";

const iconMap: Record<string, any> = { BookOpen, Users, Award, GraduationCap, TrendingUp, Shield, BarChart3, Star, Headphones, Target };

const fallbackStats = [
  { icon: "BookOpen", value: "500+", label: "Coaching Institutes" },
  { icon: "Users", value: "10,000+", label: "Student Reviews" },
  { icon: "GraduationCap", value: "50+", label: "Cities Covered" },
  { icon: "TrendingUp", value: "95%", label: "Satisfaction Rate" },
];

const fallbackSearches = ["CAT Coaching Delhi", "Best GMAT Prep", "Online MBA Coaching", "IIM Coaching"];

// Floating 3D graduation cap SVG
const FloatingCap = ({ className, delay = 0, duration = 6 }: { className?: string; delay?: number; duration?: number }) => (
  <motion.div
    className={`absolute pointer-events-none ${className}`}
    initial={{ y: 0, rotate: -10, opacity: 0.12 }}
    animate={{
      y: [0, -18, 0, 12, 0],
      rotate: [-10, 5, -8, 12, -10],
      opacity: [0.12, 0.18, 0.12, 0.15, 0.12],
    }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    <GraduationCap className="w-full h-full text-primary-foreground drop-shadow-lg" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }} />
  </motion.div>
);

// Floating book SVG
const FloatingBook = ({ className, delay = 0, duration = 7 }: { className?: string; delay?: number; duration?: number }) => (
  <motion.div
    className={`absolute pointer-events-none ${className}`}
    initial={{ y: 0, rotate: 5, opacity: 0.1 }}
    animate={{
      y: [0, 14, -10, 0],
      rotate: [5, -8, 10, 5],
      opacity: [0.1, 0.16, 0.1, 0.14],
    }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    <BookOpen className="w-full h-full text-primary-foreground drop-shadow-lg" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }} />
  </motion.div>
);

// Glowing orb
const GlowOrb = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <motion.div
    className={`absolute rounded-full pointer-events-none ${className}`}
    animate={{
      scale: [1, 1.3, 1],
      opacity: [0.15, 0.3, 0.15],
    }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const smoothEase = [0.22, 1, 0.36, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: smoothEase as unknown as [number, number, number, number] },
  },
};

const statVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, delay: 0.5 + i * 0.1, ease: smoothEase as unknown as [number, number, number, number] },
  }),
};

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
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
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

      {/* Background image with parallax feel */}
      <motion.img
        src={heroBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.07] mix-blend-overlay"
        width={1920}
        height={1080}
        aria-hidden="true"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-40" />

      {/* Floating 3D elements */}
      <FloatingCap className="w-16 h-16 md:w-24 md:h-24 top-[8%] left-[5%]" delay={0} duration={7} />
      <FloatingCap className="w-10 h-10 md:w-14 md:h-14 top-[15%] right-[8%]" delay={1.5} duration={5.5} />
      <FloatingCap className="w-12 h-12 md:w-20 md:h-20 bottom-[20%] left-[12%]" delay={0.8} duration={6.5} />
      <FloatingCap className="w-8 h-8 md:w-12 md:h-12 bottom-[30%] right-[15%]" delay={2} duration={8} />
      <FloatingBook className="w-12 h-12 md:w-16 md:h-16 top-[25%] right-[20%]" delay={1} duration={6} />
      <FloatingBook className="w-10 h-10 md:w-14 md:h-14 bottom-[15%] right-[5%]" delay={0.5} duration={7.5} />
      <FloatingBook className="w-8 h-8 md:w-10 md:h-10 top-[40%] left-[3%]" delay={2.5} duration={5} />

      {/* Glowing orbs for depth */}
      <GlowOrb className="w-64 h-64 -top-20 -left-20 bg-white/5 blur-3xl" delay={0} />
      <GlowOrb className="w-96 h-96 -bottom-32 -right-32 bg-white/5 blur-3xl" delay={2} />
      <GlowOrb className="w-48 h-48 top-1/3 right-1/4 bg-white/3 blur-2xl" delay={1} />

      {/* Animated diagonal lines */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <motion.div
          className="absolute w-[1px] h-[200%] bg-gradient-to-b from-transparent via-white/10 to-transparent -top-1/2 left-[20%] rotate-[15deg]"
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[1px] h-[200%] bg-gradient-to-b from-transparent via-white/8 to-transparent -top-1/2 left-[55%] rotate-[15deg]"
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 10, delay: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[1px] h-[200%] bg-gradient-to-b from-transparent via-white/6 to-transparent -top-1/2 left-[80%] rotate-[15deg]"
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 12, delay: 5, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Main content */}
      <div className="relative container mx-auto px-4 py-16 md:py-24 z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-5 py-2 mb-8 border border-white/20 shadow-lg shadow-black/5">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Award className="w-4 h-4 text-yellow-300" />
              </motion.div>
              <span className="text-sm font-semibold text-primary-foreground tracking-wide">
                India's #1 MBA Coaching Discovery Platform
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-primary-foreground/60" />
            </div>
          </motion.div>

          {/* Heading with per-line animation */}
          <motion.h1
            variants={itemVariants}
            className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-3 leading-[1.1] tracking-tight"
          >
            {heading}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground/85 mb-6 leading-tight"
          >
            for Your Dream B-School
          </motion.p>

          <motion.p
            variants={itemVariants}
            className="text-primary-foreground/75 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed"
          >
            {subheading}
          </motion.p>

          {/* Search bar with glow effect */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto mb-8"
          >
            <motion.div
              className="relative"
              animate={isFocused ? { scale: 1.02 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Glow ring behind search */}
              <motion.div
                className="absolute -inset-1 rounded-2xl bg-white/20 blur-md"
                animate={isFocused ? { opacity: 0.6, scale: 1.02 } : { opacity: 0.2, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
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
            </motion.div>
          </motion.form>

          {/* Popular searches */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2.5 mb-14 text-sm">
            <span className="text-primary-foreground/50 font-medium self-center">Popular:</span>
            {popularSearches.map((term: string, i: number) => (
              <motion.button
                key={term}
                onClick={() => setQuery(term)}
                className="text-primary-foreground/90 hover:text-primary-foreground bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full transition-all duration-200 border border-white/10 hover:border-white/25 font-medium"
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {term}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats cards with 3D effect */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-3xl mx-auto">
          {stats.map((stat: any, i: number) => {
            const Icon = iconMap[stat.icon] || BookOpen;
            return (
              <motion.div
                key={i}
                custom={i}
                variants={statVariants}
                initial="hidden"
                animate="visible"
                whileHover={{
                  y: -6,
                  rotateX: 5,
                  rotateY: -3,
                  transition: { type: "spring", stiffness: 300, damping: 15 },
                }}
                className="group cursor-default"
                style={{ perspective: "800px" }}
              >
                <div className="relative text-center bg-white/10 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-white/15 overflow-hidden transition-all duration-300 group-hover:bg-white/15 group-hover:border-white/25 group-hover:shadow-xl group-hover:shadow-white/5">
                  {/* Shimmer effect on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                    whileHover={{ translateX: "200%" }}
                    transition={{ duration: 0.6 }}
                  />

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
              </motion.div>
            );
          })}
        </div>

        {/* Bottom wave decoration */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <svg viewBox="0 0 1440 60" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <motion.path
              d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z"
              fill="hsl(var(--background))"
              animate={{
                d: [
                  "M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z",
                  "M0,35 C240,10 480,50 720,25 C960,10 1200,50 1440,35 L1440,60 L0,60 Z",
                  "M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
