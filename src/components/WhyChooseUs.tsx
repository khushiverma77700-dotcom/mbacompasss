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

  const heading = settings?.heading || "Why Choose MBAHub";
  const subheading = settings?.subheading || "We help you make the right choice for your MBA journey";
  const features = settings?.features || fallbackFeatures;

  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
            {heading.includes("MBAHub") ? (
              <>{heading.replace("MBAHub", "")}<span className="text-gradient">MBAHub</span></>
            ) : heading}
          </h2>
          <p className="text-muted-foreground">{subheading}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map((feature: any, i: number) => {
            const Icon = iconMap[feature.icon] || Star;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 text-center card-shadow border border-border"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
