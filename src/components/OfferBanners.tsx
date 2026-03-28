import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fallbackOffers = [
  {
    title: "CAT 2026 Coaching",
    subtitle: "Expert mentoring & study plans",
    cta: "Explore Coaching",
    link: "/category/cat",
    gradient: "from-[hsl(270,80%,55%)] to-[hsl(320,75%,55%)]",
  },
  {
    title: "Flat 10% Off All Courses",
    subtitle: "Enroll before April 30th",
    cta: "Claim Offer",
    link: "/category/cat",
    gradient: "from-[hsl(15,90%,55%)] to-[hsl(30,95%,50%)]",
  },
  {
    title: "Free CAT Mock Tests",
    subtitle: "Full-length with analytics",
    cta: "Take Mock Test",
    link: "/category/cat",
    gradient: "from-[hsl(200,90%,50%)] to-[hsl(210,85%,60%)]",
  },
  {
    title: "Top MBA Colleges 2026",
    subtitle: "City & category-wise listings",
    cta: "Browse Colleges",
    link: "/colleges",
    gradient: "from-[hsl(160,75%,45%)] to-[hsl(140,70%,50%)]",
  },
];

const gradients = [
  "from-[hsl(270,80%,55%)] to-[hsl(320,75%,55%)]",
  "from-[hsl(15,90%,55%)] to-[hsl(30,95%,50%)]",
  "from-[hsl(200,90%,50%)] to-[hsl(210,85%,60%)]",
  "from-[hsl(160,75%,45%)] to-[hsl(140,70%,50%)]",
  "from-[hsl(45,90%,50%)] to-[hsl(35,95%,45%)]",
  "from-[hsl(240,70%,55%)] to-[hsl(260,80%,60%)]",
];

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
          gradient: gradients[i % gradients.length],
        }))
      : fallbackOffers;

  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {offers.map((offer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <Link
                to={offer.link}
                className={`group relative block rounded-2xl bg-gradient-to-br ${offer.gradient} p-5 md:p-6 text-white overflow-hidden transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl min-h-[160px] flex flex-col justify-between`}
              >
                {/* Decorative circle */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />

                <div className="relative z-10">
                  <h3 className="font-heading font-bold text-base md:text-lg leading-snug mb-1.5">
                    {offer.title}
                  </h3>
                  <p className="text-xs md:text-sm opacity-85 leading-relaxed">
                    {offer.subtitle}
                  </p>
                </div>

                <div className="relative z-10 mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
                  <span>{offer.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OfferBanners;
