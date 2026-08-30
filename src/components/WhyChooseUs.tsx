import { Shield, BarChart3, Star, Headphones, Award, Users, BookOpen, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const iconMap: Record<string, any> = {
  Shield, BarChart3, Star, Headphones, Award, Users, BookOpen, Target,
};

const fallbackFeatures = [
  { icon: "Shield", title: "Verified Institutes", description: "Every coaching institute is verified and reviewed by real students." },
  { icon: "BarChart3", title: "Compare Side-by-Side", description: "Compare fees, faculty, success rates, and reviews." },
  { icon: "Star", title: "Genuine Reviews", description: "Read authentic reviews from verified students." },
  { icon: "Headphones", title: "Free Counselling", description: "Get free expert counselling for your MBA journey." },
];

const WhyChooseUs = () => {
  const { data: settings } = useSiteSettings("why_choose_us");

  const heading = settings?.heading || "Why Choose MBA Compass";
  const subheading = settings?.subheading || "We help you make the right choice for your MBA journey";
  const features = settings?.features || fallbackFeatures;

  return (
    <section className="py-20 md:py-24 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-primary font-semibold mb-4">
            <span className="h-px w-8 bg-primary/40" />
            Why students trust us
            <span className="h-px w-8 bg-primary/40" />
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground mb-4 tracking-[-0.02em] leading-[1.1]">
            Decisions made <span className="font-editorial italic font-normal text-primary">with clarity</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">{subheading}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-6xl mx-auto">
          {features.map((feature: any, i: number) => {
            const Icon = iconMap[feature.icon] || Star;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.08, 0.24) }}
                className="group relative bg-card rounded-2xl p-7 border border-border/70 hover:border-primary/40 hover:shadow-[0_20px_50px_-25px_hsl(207_90%_54%_/_0.3)] transition-all duration-300"
              >
                <div className="absolute top-6 right-6 font-editorial italic text-3xl text-primary/15 leading-none select-none">
                  0{i + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-2 leading-snug">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


export default WhyChooseUs;
