import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapPin, Building2, ArrowRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCityPages } from "@/hooks/useCityPages";
import { useColleges } from "@/hooks/useInstitutes";

const fallbackImages: Record<string, string> = {
  mumbai: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&h=400&fit=crop",
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&h=400&fit=crop",
  bangalore: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=600&h=400&fit=crop",
  pune: "https://images.unsplash.com/photo-1572782252655-9c8771392601?w=600&h=400&fit=crop",
  hyderabad: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&h=400&fit=crop",
  chennai: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&h=400&fit=crop",
  kolkata: "https://images.unsplash.com/photo-1558431382-27e303142255?w=600&h=400&fit=crop",
  ahmedabad: "https://images.unsplash.com/photo-1609948543911-7155701b82e1?w=600&h=400&fit=crop",
  jaipur: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&h=400&fit=crop",
  lucknow: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop",
  chandigarh: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=600&h=400&fit=crop",
  indore: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=600&h=400&fit=crop",
};

const defaultFallback = "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&h=400&fit=crop";

const getCityImage = (cp: { hero_image_url?: string | null; name: string; slug: string }) => {
  const slug = cp.name.toLowerCase().replace(/\s+/g, "");
  // Use admin hero_image_url if set, otherwise use curated fallbacks
  return cp.hero_image_url || fallbackImages[slug] || fallbackImages[cp.slug] || defaultFallback;
};

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
    return { ...cp, count, image: getCityImage(cp) };
  });

  // Auto-scroll on desktop: when user reaches near end, nudge forward
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || window.innerWidth < 768) return; // skip on mobile
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/5 pointer-events-none" />

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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

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
