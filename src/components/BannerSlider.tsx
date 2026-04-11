import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { bannerSlides as fallbackSlides } from "@/data/mockData";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  link_url: string | null;
  cta_text: string | null;
  active: boolean | null;
  sort_order: number | null;
}

const BannerSlider = () => {
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (data && data.length > 0) {
        setBanners(data);
      }
    };
    fetchBanners();
  }, []);

  // Use DB banners if available, otherwise fall back to mock data
  const useMock = banners.length === 0;
  const totalSlides = useMock ? fallbackSlides.length : banners.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  if (useMock) {
    const slide = fallbackSlides[current % fallbackSlides.length];
    return (
      <section className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="hero-gradient py-16 md:py-24"
          >
            <div className="container mx-auto px-4 text-center">
              <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 max-w-3xl mx-auto">{slide.title}</motion.h2>
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-primary-foreground/80 text-base md:text-lg max-w-2xl mx-auto mb-6">{slide.subtitle}</motion.p>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <Link to={slide.ctaLink}><Button size="lg" variant="secondary" className="font-semibold">{slide.cta}</Button></Link>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
        <button onClick={() => setCurrent((current - 1 + fallbackSlides.length) % fallbackSlides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/30 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => setCurrent((current + 1) % fallbackSlides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/30 transition-colors"><ChevronRight className="w-5 h-5" /></button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {fallbackSlides.map((_, i) => (<button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-primary-foreground w-8" : "bg-primary-foreground/40"}`} />))}
        </div>
      </section>
    );
  }

  const banner = banners[current % banners.length];
  const imageUrl = isMobile && banner.mobile_image_url ? banner.mobile_image_url : banner.image_url;
  const hasImage = !!imageUrl;

  return (
    <section className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative ${hasImage ? "min-h-[250px] md:min-h-[400px]" : "hero-gradient py-16 md:py-24"}`}
        >
          {hasImage && (
            <img
              src={imageUrl!}
              alt={banner.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className={`relative z-10 container mx-auto px-4 text-center ${hasImage ? "py-16 md:py-24 bg-black/40" : ""}`}>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 max-w-3xl mx-auto">
              {banner.title}
            </motion.h2>
            {banner.subtitle && (
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-primary-foreground/80 text-base md:text-lg max-w-2xl mx-auto mb-6">
                {banner.subtitle}
              </motion.p>
            )}
            {banner.link_url && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <Link to={banner.link_url}>
                  <Button size="lg" variant="secondary" className="font-semibold">
                    {banner.cta_text || "Learn More"}
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrent((current - 1 + banners.length) % banners.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/30 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setCurrent((current + 1) % banners.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/30 transition-colors"><ChevronRight className="w-5 h-5" /></button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (<button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-primary-foreground w-8" : "bg-primary-foreground/40"}`} />))}
          </div>
        </>
      )}
    </section>
  );
};

export default BannerSlider;
