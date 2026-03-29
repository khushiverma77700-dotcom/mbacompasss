import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, GraduationCap, FileText, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const fallbackOffers = [
  {
    title: "CAT 2026 Registration",
    subtitle: "Top-rated coaching institutes with personalized study plans & expert mentoring.",
    cta: "Explore Coaching",
    link: "/category/cat",
    icon: BookOpen,
    accent: "hsl(220, 70%, 55%)",
    accentLight: "hsl(220, 80%, 95%)",
    accentMid: "hsl(220, 70%, 92%)",
  },
  {
    title: "Flat 10% Off Courses",
    subtitle: "Enroll before April 30th on any MBA coaching program. Limited seats!",
    cta: "Claim Offer",
    link: "/category/cat",
    icon: GraduationCap,
    accent: "hsl(150, 55%, 42%)",
    accentLight: "hsl(150, 60%, 95%)",
    accentMid: "hsl(150, 55%, 90%)",
  },
  {
    title: "Free Mock Test Series",
    subtitle: "Full-length CAT mock test with detailed performance analytics.",
    cta: "Take Mock Test",
    link: "/category/cat",
    icon: FileText,
    accent: "hsl(25, 85%, 52%)",
    accentLight: "hsl(25, 90%, 95%)",
    accentMid: "hsl(25, 85%, 90%)",
  },
  {
    title: "Top MBA Colleges 2026",
    subtitle: "City-wise listings of best colleges accepting CAT, XAT, GMAT scores.",
    cta: "Browse Colleges",
    link: "/colleges",
    icon: Building2,
    accent: "hsl(260, 60%, 55%)",
    accentLight: "hsl(260, 70%, 96%)",
    accentMid: "hsl(260, 60%, 92%)",
  },
];

const colorSets = [
  { accent: "hsl(220, 70%, 55%)", accentLight: "hsl(220, 80%, 95%)", accentMid: "hsl(220, 70%, 92%)" },
  { accent: "hsl(150, 55%, 42%)", accentLight: "hsl(150, 60%, 95%)", accentMid: "hsl(150, 55%, 90%)" },
  { accent: "hsl(25, 85%, 52%)", accentLight: "hsl(25, 90%, 95%)", accentMid: "hsl(25, 85%, 90%)" },
  { accent: "hsl(260, 60%, 55%)", accentLight: "hsl(260, 70%, 96%)", accentMid: "hsl(260, 60%, 92%)" },
];

const icons = [BookOpen, GraduationCap, FileText, Building2];

const OfferBanners = () => {
  const { data: banners } = useQuery({
    queryKey: ["offer-banners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const offers =
    banners && banners.length > 0
      ? banners.map((b, i) => ({
          title: b.title,
          subtitle: b.subtitle || "",
          cta: b.cta_text || "Learn More",
          link: b.link_url || "/",
          icon: icons[i % icons.length],
          ...colorSets[i % colorSets.length],
        }))
      : fallbackOffers;

  return (
    <section className="py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6 md:mb-8"
        >
          <h2 className="text-xl md:text-2xl lg:text-3xl font-heading font-bold text-foreground">
            What's Trending
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Latest offers, updates & resources for MBA aspirants
          </p>
        </motion.div>

        {/* 2x2 grid on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {offers.map((offer, i) => {
            const Icon = offer.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
              >
                <div
                  className="group relative rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col"
                  style={{
                    borderTop: `3px solid ${offer.accent}`,
                  }}
                >
                  {/* Top accent bar background */}
                  <div
                    className="absolute top-0 left-0 right-0 h-16 opacity-40"
                    style={{
                      background: `linear-gradient(135deg, ${offer.accentLight}, ${offer.accentMid}, transparent)`,
                    }}
                  />

                  <div className="relative z-10 p-3 md:p-5 flex flex-col h-full">
                    {/* Icon */}
                    <div
                      className="w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center mb-2.5 md:mb-3 shrink-0"
                      style={{
                        backgroundColor: offer.accentLight,
                        color: offer.accent,
                      }}
                    >
                      <Icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>

                    {/* Content */}
                    <h3 className="font-heading font-semibold text-sm md:text-base text-foreground leading-tight mb-1 md:mb-1.5">
                      {offer.title}
                    </h3>
                    <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3 flex-1 mb-3 md:mb-4">
                      {offer.subtitle}
                    </p>

                    {/* CTA Button */}
                    <Link to={offer.link} className="mt-auto">
                      <Button
                        size="sm"
                        className="w-full text-xs md:text-sm font-medium rounded-lg h-8 md:h-9 text-white transition-all duration-200 hover:opacity-90 shadow-sm"
                        style={{
                          backgroundColor: offer.accent,
                        }}
                      >
                        {offer.cta}
                        <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OfferBanners;
