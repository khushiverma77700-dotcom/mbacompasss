import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapPin, Building2, ArrowRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCityPages } from "@/hooks/useCityPages";
import { useColleges } from "@/hooks/useInstitutes";
import { getLocationImage, isGeneratedBanner } from "@/data/cityImages";

const BrowseByCitySection = () => {
  const { data: cityPages } = useCityPages();
  const { data: colleges } = useColleges();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const cities = (cityPages || []).slice(0, 12).map((cp) => {
    const aliases = cp.city_aliases || [cp.name.toLowerCase()];
    const count = (colleges || []).filter((c) =>
      aliases.some(
        (a) =>
          (c.city || "").toLowerCase().includes(a.toLowerCase()) ||
          (c.state || "").toLowerCase().includes(a.toLowerCase())
      )
    ).length;
    // Prefer real photos: use hero_image_url only if it's a real upload (not generated)
    const adminImage = cp.hero_image_url && !isGeneratedBanner(cp.hero_image_url) ? cp.hero_image_url : null;
    const image = adminImage || getLocationImage(cp.name, cp.state);
    return { ...cp, count, image };
  });

  // Auto-scroll on desktop: nudge forward near end
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || window.innerWidth < 768) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const distanceFromEnd = scrollWidth - clientWidth - scrollLeft;
    if (distanceFromEnd > 0 && distanceFromEnd < 180) {
      el.scrollBy({ left: 480, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (!cities.length) return null;

  const featured = cities[activeIndex] || cities[0];

  return (
    <section className="py-14 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <MapPin className="w-4 h-4" />
            Explore by Location
          </div>
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Browse by <span className="text-primary">City</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Find the best MBA colleges and coaching institutes in your preferred city
          </p>
        </motion.div>

        {/* Layout: Featured + Grid/Scroll */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Featured City — Large Card */}
          <motion.div
            key={featured.slug}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative w-full lg:w-[380px] xl:w-[420px] h-[260px] md:h-[340px] rounded-2xl overflow-hidden flex-shrink-0 group border border-border/50 shadow-lg"
          >
            <img
              src={featured.image}
              alt={`MBA colleges in ${featured.name}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            {/* Brownish faded overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/85 via-[#3d2317]/40 to-[#4a2c1a]/15 pointer-events-none" />

            <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center shadow">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-white font-heading text-lg md:text-xl font-bold drop-shadow-lg">
                  {featured.name}
                </h3>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-semibold">
                    <Building2 className="w-3.5 h-3.5" />
                    {featured.count} Colleges
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-semibold">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Top MBA Programs
                  </span>
                </div>
                <Link to={`/colleges/${featured.slug}`}>
                  <Button
                    size="sm"
                    className="rounded-full text-xs font-bold bg-white text-foreground hover:bg-white/90 shadow-lg gap-1.5"
                  >
                    Explore {featured.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Scrollable City Cards */}
          <div className="flex-1 min-w-0">
            <div
              ref={scrollRef}
              data-city-scroll
              className="flex gap-3 md:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {cities.map((city, i) => (
                <motion.div
                  key={city.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex-shrink-0 snap-start"
                >
                  <button
                    onClick={() => setActiveIndex(i)}
                    className={`relative w-[150px] md:w-[170px] h-[210px] md:h-[280px] rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 border-2 ${
                      activeIndex === i
                        ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                        : "border-border/30 hover:border-border hover:shadow-md"
                    }`}
                  >
                    <img
                      src={city.image}
                      alt={`MBA coaching in ${city.name}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Brownish faded overlay for small cards */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/80 via-[#3d2317]/20 to-transparent pointer-events-none" />

                    {/* Active indicator */}
                    {activeIndex === i && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white shadow" />
                    )}

                    {/* City Info */}
                    <div className="absolute bottom-0 inset-x-0 p-3.5">
                      <h3 className="text-white text-sm md:text-[15px] font-bold leading-tight drop-shadow-lg">
                        {city.name}
                      </h3>
                      <p className="text-white/75 text-[11px] md:text-xs font-medium mt-1">
                        {city.count} {city.count === 1 ? "College" : "Colleges"}
                      </p>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* View All */}
        <div className="text-center mt-8">
          <Link to="/colleges">
            <Button variant="outline" className="rounded-full gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/5">
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
