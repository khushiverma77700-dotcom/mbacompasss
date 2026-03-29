import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, GraduationCap, FileText, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fallbackOffers = [
  {
    title: "CAT 2026 Registration Opens Soon",
    subtitle: "Start your preparation today with India's top-rated coaching institutes. Get personalized study plans and expert mentoring.",
    cta: "Explore CAT Coaching",
    link: "/category/cat",
    icon: BookOpen,
    gradient: "from-[hsl(270,80%,55%)] via-[hsl(290,75%,50%)] to-[hsl(320,75%,55%)]",
    glow: "hsl(290,80%,55%)",
  },
  {
    title: "Flat 10% Off on All Courses",
    subtitle: "Enroll before April 30th and save on any MBA coaching program listed on MBAHub. Limited seats available!",
    cta: "Claim Offer Now",
    link: "/category/cat",
    icon: GraduationCap,
    gradient: "from-[hsl(15,90%,55%)] via-[hsl(25,92%,52%)] to-[hsl(35,95%,50%)]",
    glow: "hsl(25,90%,55%)",
  },
  {
    title: "Free CAT Mock Test Series",
    subtitle: "Assess your current preparation level with a full-length CAT mock test. Get detailed performance analytics.",
    cta: "Take Free Mock Test",
    link: "/category/cat",
    icon: FileText,
    gradient: "from-[hsl(200,90%,50%)] via-[hsl(210,85%,55%)] to-[hsl(220,80%,60%)]",
    glow: "hsl(210,85%,55%)",
  },
  {
    title: "Top MBA Colleges in India 2026",
    subtitle: "Explore city-wise and category-wise listings of India's best management colleges accepting CAT, XAT, GMAT scores.",
    cta: "Browse Colleges",
    link: "/colleges",
    icon: Building2,
    gradient: "from-[hsl(155,70%,42%)] via-[hsl(145,65%,48%)] to-[hsl(130,60%,50%)]",
    glow: "hsl(145,65%,48%)",
  },
];

const gradients = [
  { gradient: "from-[hsl(270,80%,55%)] via-[hsl(290,75%,50%)] to-[hsl(320,75%,55%)]", glow: "hsl(290,80%,55%)" },
  { gradient: "from-[hsl(15,90%,55%)] via-[hsl(25,92%,52%)] to-[hsl(35,95%,50%)]", glow: "hsl(25,90%,55%)" },
  { gradient: "from-[hsl(200,90%,50%)] via-[hsl(210,85%,55%)] to-[hsl(220,80%,60%)]", glow: "hsl(210,85%,55%)" },
  { gradient: "from-[hsl(155,70%,42%)] via-[hsl(145,65%,48%)] to-[hsl(130,60%,50%)]", glow: "hsl(145,65%,48%)" },
  { gradient: "from-[hsl(45,90%,50%)] via-[hsl(40,92%,48%)] to-[hsl(35,95%,45%)]", glow: "hsl(40,90%,50%)" },
  { gradient: "from-[hsl(240,70%,55%)] via-[hsl(250,75%,58%)] to-[hsl(260,80%,60%)]", glow: "hsl(250,75%,58%)" },
];

const icons = [BookOpen, GraduationCap, FileText, Building2, BookOpen, GraduationCap];

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
          gradient: gradients[i % gradients.length].gradient,
          glow: gradients[i % gradients.length].glow,
        }))
      : fallbackOffers;

  return (
    <section className="py-10 md:py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
            What's Trending
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Latest offers, updates & resources for MBA aspirants
          </p>
        </motion.div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0">
          {offers.map((offer, i) => {
            const Icon = offer.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
                className="snap-start flex-shrink-0 w-[280px] md:w-auto"
              >
                <Link
                  to={offer.link}
                  className={`group relative block rounded-2xl bg-gradient-to-br ${offer.gradient} p-6 text-white overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl h-full min-h-[220px] md:min-h-[260px] flex flex-col justify-between`}
                  style={{
                    boxShadow: `0 8px 32px -8px ${offer.glow}`,
                  }}
                >
                  {/* Background decorations */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-sm" />
                  <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/[0.07]" />
                  <div className="absolute top-1/2 right-4 w-16 h-16 rounded-full bg-white/[0.05] blur-md" />

                  {/* Icon badge */}
                  <div className="relative z-10 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 ring-1 ring-white/20">
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex-1">
                    <h3 className="font-heading font-bold text-lg md:text-xl leading-snug mb-2">
                      {offer.title}
                    </h3>
                    <p className="text-sm opacity-85 leading-relaxed line-clamp-3">
                      {offer.subtitle}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="relative z-10 mt-4 flex items-center gap-2 text-sm font-semibold">
                    <span className="border-b border-white/40 group-hover:border-white transition-colors pb-0.5">
                      {offer.cta}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>

                  {/* Hover shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OfferBanners;
