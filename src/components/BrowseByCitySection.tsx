import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Building2, ChevronLeft, ChevronRight, GraduationCap, BookOpen, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCityPages } from "@/hooks/useCityPages";
import { useColleges } from "@/hooks/useInstitutes";

const cityImages: Record<string, string> = {
  mumbai: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&h=800&fit=crop",
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&h=800&fit=crop",
  bangalore: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=600&h=800&fit=crop",
  pune: "https://images.unsplash.com/photo-1572782252655-9c8771392601?w=600&h=800&fit=crop",
  hyderabad: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&h=800&fit=crop",
  chennai: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&h=800&fit=crop",
  kolkata: "https://images.unsplash.com/photo-1558431382-27e303142255?w=600&h=800&fit=crop",
  ahmedabad: "https://images.unsplash.com/photo-1609948543911-7155701b82e1?w=600&h=800&fit=crop",
  jaipur: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&h=800&fit=crop",
  lucknow: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=800&fit=crop",
  chandigarh: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=600&h=800&fit=crop",
  indore: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=600&h=800&fit=crop",
};

const fallbackImage = "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&h=800&fit=crop";

const BrowseByCitySection = () => {
  const { data: cityPages } = useCityPages();
  const { data: colleges } = useColleges();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [cityPages?.length]);

  if (!cityPages?.length) return null;

  const cities = cityPages.slice(0, 12).map((cp) => {
    const aliases = cp.city_aliases || [cp.name.toLowerCase()];
    const count = (colleges || []).filter(c =>
      aliases.some(a => (c.city || "").toLowerCase().includes(a.toLowerCase()) || (c.state || "").toLowerCase().includes(a.toLowerCase()))
    ).length;
    const slug = cp.name.toLowerCase().replace(/\s+/g, "");
    const image = cityImages[slug] || cityImages[cp.slug] || fallbackImage;
    return { ...cp, count, image };
  });

  const featured = cities[activeIndex] || cities[0];

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Browse by <span className="text-primary">City</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            Find the best MBA colleges and coaching institutes in your preferred city
          </p>
        </motion.div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Featured City Card */}
          <motion.div
            key={featured.slug}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="relative w-full lg:w-[380px] xl:w-[420px] h-[300px] md:h-[380px] rounded-3xl overflow-hidden flex-shrink-0 group"
          >
            <img
              src={featured.image}
              alt={featured.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

            <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-7">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-white font-heading text-xl md:text-2xl font-bold drop-shadow-lg">
                  {featured.name}
                </h3>
              </div>

              <div>
                <div className="space-y-2 mb-4">
                  {[
                    { text: `${featured.count} Colleges` },
                    { text: "Top MBA Programs" },
                    { text: "Coaching Institutes" },
                  ].map((s) => (
                    <div key={s.text} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-white/90 flex-shrink-0" />
                      <span className="text-white text-sm font-medium">{s.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link to={`/colleges/${featured.slug}`}>
                    <Button size="sm" variant="secondary" className="rounded-full text-xs font-bold bg-white/95 text-foreground hover:bg-white shadow-md">
                      Explore {featured.name}
                    </Button>
                  </Link>
                  <Link to={`/colleges/${featured.slug}`}>
                    <Button size="sm" variant="secondary" className="rounded-full text-xs font-bold bg-white/95 text-foreground hover:bg-white shadow-md">
                      View Colleges
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Scrollable city cards */}
          <div className="relative flex-1 min-w-0">
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            )}

            <div
              ref={scrollRef}
              className="flex gap-3 md:gap-4 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {cities.map((city, i) => (
                <motion.div
                  key={city.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex-shrink-0"
                >
                  <button
                    onClick={() => setActiveIndex(i)}
                    className={`relative w-[110px] md:w-[130px] h-[260px] md:h-[340px] rounded-[2rem] overflow-hidden group cursor-pointer transition-all duration-300 ${
                      activeIndex === i
                        ? "ring-3 ring-primary ring-offset-2 shadow-xl scale-[1.03]"
                        : "hover:shadow-lg hover:scale-[1.02]"
                    }`}
                  >
                    <img
                      src={city.image}
                      alt={city.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>

                    <div className="absolute bottom-3 inset-x-0 text-center">
                      <span className="text-white text-xs md:text-sm font-bold drop-shadow-lg leading-tight block">
                        {city.name}
                      </span>
                      <span className="text-white/70 text-[10px] font-medium">
                        {city.count} Colleges
                      </span>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrowseByCitySection;
