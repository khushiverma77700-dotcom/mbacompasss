import { Search, ListFilter, PhoneCall, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Search & Explore",
    description: "Browse through 500+ colleges and coaching institutes. Use filters to narrow down by city, exam, fees, and ranking.",
  },
  {
    icon: ListFilter,
    step: "02",
    title: "Compare & Shortlist",
    description: "Compare colleges side by side on placements, fees, cutoffs, and campus life. Shortlist your top picks.",
  },
  {
    icon: PhoneCall,
    step: "03",
    title: "Connect & Apply",
    description: "Get in touch directly with institutes, download brochures, and apply through our streamlined process.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Get Admitted",
    description: "Secure your admission with exclusive offers, coupon codes, and expert guidance throughout the journey.",
  },
];

const HowItWorksSection = () => (
  <section className="py-16 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="font-heading text-3xl font-bold text-foreground mb-2">How It Works</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your journey from exploring MBA options to getting admitted — simplified in 4 easy steps
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center p-6 bg-card rounded-xl border border-border hover:border-primary/30 transition-all group"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                Step {step.step}
              </div>
              <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4 mt-2 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
