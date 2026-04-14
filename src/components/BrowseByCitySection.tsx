import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapPin, Building2, ArrowRight, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCityPages } from "@/hooks/useCityPages";
import { useColleges } from "@/hooks/useInstitutes";
import { getLocationImage, isGeneratedBanner } from "@/data/cityImages";

const BrowseByCitySection = () => {
  const { data: cityPages } = useCityPages();
  const { data: colleges } = useColleges();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const cities = (cityPages || []).slice(0, 12).map((cp) => {
    const aliases = cp.city_aliases || [cp.name.toLowerCase()];
    const count = (colleges || []).filter((c) =>
      aliases.some(
        (a) =>
          (c.city || "").toLowerCase().includes(a.toLowerCase()) ||
          (c.state || "").toLowerCase().includes(a.toLowerCase())
      )
    ).length;
    const adminImage = cp.hero_image_url && !isGeneratedBanner(cp.hero_image_url) ? cp.hero_image_url : null;
    const image = adminImage || getLocationImage(cp.name, cp.state);
    return { ...cp, count, image };
  });

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons);
    updateScrollButtons();
    return () => el.removeEventListener("scroll", updateScrollButtons);
  }, [updateScrollButtons, cities.length]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (!cities.length) return null;

  const featured = cities[activeIndex] || cities[0];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-muted/20 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2 rounded-full text-sm font-semibold mb-5 backdrop-blur-sm border border-primary/10">
            <MapPin className="w-4 h-4" />
            Explore by Location
          </div>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
            Browse by <span className="text-primary">City</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Find the best MBA colleges and coaching institutes in your preferred city
          </p>
        </motion.div>

        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Featured City — Large Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={featured.slug}
              initial={{ opacity: 0, scale: 0.95, rotateY: -4 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="relative w-full lg:w-[420px] xl:w-[480px] h-[300px] md:h-[400px] rounded-3xl overflow-hidden flex-shrink-0 group shadow-2xl"
              style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
            >
              <img
                src={featured.image}
                alt={`MBA colleges in ${featured.name}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              {/* Premium overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0e08]/90 via-[#2c1810]/50 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/95 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-white font-heading text-2xl md:text-3xl font-extrabold drop-shadow-lg tracking-tight">
                    {featured.name}
                  </h3>
                </div>

                <div>
                  {featured.state && (
                    <p className="text-white/70 text-xs font-medium mb-3 tracking-wide uppercase">
                      {featured.state}, India
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md rounded-full px-3.5 py-1.5 text-white text-xs font-semibold border border-white/10">
                      <Building2 className="w-3.5 h-3.5" />
                      {featured.count} Colleges
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md rounded-full px-3.5 py-1.5 text-white text-xs font-semibold border border-white/10">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Top MBA Programs
                    </span>
                    {featured.count >= 5 && (
                      <span className="inline-flex items-center gap-1.5 bg-primary/60 backdrop-blur-md rounded-full px-3.5 py-1.5 text-white text-xs font-semibold border border-primary/30">
                        🔥 Popular Hub
                      </span>
                    )}
                  </div>
                  <Link to={`/colleges/${featured.slug}`}>
                    <Button
                      size="sm"
                      className="rounded-full text-sm font-bold bg-white text-foreground hover:bg-white/90 shadow-xl gap-2 px-6 py-2.5 transition-all hover:scale-105 hover:shadow-2xl"
                    >
                      Explore {featured.name}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Scrollable City Cards */}
          <div className="flex-1 min-w-0 relative overflow-visible">
            {/* Scroll arrows */}
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border flex items-center justify-center hover:bg-background transition-all hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border flex items-center justify-center hover:bg-background transition-all hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            )}

            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto overflow-y-visible pb-6 pt-6 px-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            >
              {cities.map((city, i) => (
                <motion.div
                  key={city.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 snap-start"
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <Link
                    to={`/colleges/${city.slug}`}
                    className={`relative block rounded-2xl overflow-hidden cursor-pointer group/card
                      w-[150px] md:w-[170px] h-[230px] md:h-[330px]
                      transition-all duration-500 ease-out
                      ${activeIndex === i
                        ? "ring-2 ring-primary shadow-2xl shadow-primary/30 scale-110 z-10"
                        : "ring-1 ring-border/20 hover:ring-primary/40 hover:shadow-xl hover:scale-110 hover:z-10"
                      }`}
                  >
                    <img
                      src={city.image}
                      alt={`MBA coaching in ${city.name}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                      loading="lazy"
                    />
                    {/* Warm tint overlay for consistent look */}
                    <div className="absolute inset-0 bg-[#2c1810]/25 pointer-events-none" />
                    {/* Bottom gradient for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a0e08]/85 via-[#2c1810]/35 to-transparent pointer-events-none" />

                    {/* Hover shine */}
                    <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent" />

                    {/* Active indicator */}
                    {activeIndex === i && (
                      <div className="absolute top-3 right-3">
                        <div className="w-3 h-3 rounded-full bg-primary ring-2 ring-white shadow-lg animate-pulse" />
                      </div>
                    )}

                    {/* City Info */}
                    <div className="absolute bottom-0 inset-x-0 p-4">
                      <h3 className="text-white text-sm md:text-base font-bold leading-tight drop-shadow-lg">
                        {city.name}
                      </h3>
                      <p className="text-white/80 text-[11px] md:text-xs font-medium mt-1.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {city.count} {city.count === 1 ? "College" : "Colleges"}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* View All */}
        <div className="text-center mt-10">
          <Link to="/colleges">
            <Button
              variant="outline"
              className="rounded-full gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/5 hover:scale-105 transition-all px-8 py-3 text-sm shadow-sm hover:shadow-md"
            >
              View All Cities
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrowseByCitySection;
