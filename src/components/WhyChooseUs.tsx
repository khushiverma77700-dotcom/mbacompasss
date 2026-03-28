import { Shield, BarChart3, Star, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, title: "Verified Institutes", description: "Every coaching institute is verified and reviewed by real students before listing." },
  { icon: BarChart3, title: "Compare Side-by-Side", description: "Compare fees, faculty, success rates, and reviews of up to 3 courses at once." },
  { icon: Star, title: "Genuine Reviews", description: "Read authentic reviews from verified students who attended these coaching centres." },
  { icon: Headphones, title: "Free Counselling", description: "Get free expert counselling to choose the right MBA coaching for your needs." },
];

const WhyChooseUs = () => {
  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
            Why Choose <span className="text-gradient">MBAHub</span>
          </h2>
          <p className="text-muted-foreground">We help you make the right choice for your MBA journey</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-6 text-center card-shadow border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
