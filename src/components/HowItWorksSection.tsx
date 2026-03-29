import { Search, ListFilter, PhoneCall, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const iconMap: Record<string, any> = { Search, ListFilter, PhoneCall, CheckCircle };

const fallbackSteps = [
  { icon: "Search", title: "Search & Explore", description: "Browse through 500+ colleges and coaching institutes. Use filters to narrow down by city, exam, fees, and ranking." },
  { icon: "ListFilter", title: "Compare & Shortlist", description: "Compare colleges side by side on placements, fees, cutoffs, and campus life. Shortlist your top picks." },
  { icon: "PhoneCall", title: "Connect & Apply", description: "Get in touch directly with institutes, download brochures, and apply through our streamlined process." },
  { icon: "CheckCircle", title: "Get Admitted", description: "Secure your admission with exclusive offers, coupon codes, and expert guidance throughout the journey." },
];

const HowItWorksSection = () => {
  const { data: settings } = useSiteSettings("how_it_works");

  const heading = settings?.heading || "How It Works";
  const subheading = settings?.subheading || "Your journey from exploring MBA options to getting admitted — simplified in 4 easy steps";
  const steps = settings?.steps || fallbackSteps;

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-heading text-3xl font-bold text-foreground mb-2">{heading}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-20 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          {steps.map((step: any, i: number) => {
            const Icon = iconMap[step.icon] || Search;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="bg-card rounded-2xl border border-border p-6 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 group">
                  <div className="relative mx-auto mb-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors relative z-10">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md z-20">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
