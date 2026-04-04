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

const stepColors = [
  { gradient: "from-blue-500 to-blue-600", light: "bg-blue-50", text: "text-blue-600" },
  { gradient: "from-violet-500 to-violet-600", light: "bg-violet-50", text: "text-violet-600" },
  { gradient: "from-amber-500 to-amber-600", light: "bg-amber-50", text: "text-amber-600" },
  { gradient: "from-emerald-500 to-emerald-600", light: "bg-emerald-50", text: "text-emerald-600" },
];

const HowItWorksSection = () => {
  const { data: settings } = useSiteSettings("how_it_works");

  const heading = settings?.heading || "How It Works";
  const subheading = settings?.subheading || "Your journey from exploring MBA options to getting admitted — simplified in 4 easy steps";
  const steps = settings?.steps || fallbackSteps;

  return (
    <section className="py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
            <Search className="w-3.5 h-3.5" /> Simple Process
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">{heading}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative max-w-6xl mx-auto">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-24 left-[12%] right-[12%] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-blue-300 via-violet-300 via-amber-300 to-emerald-300 rounded-full" />
          </div>

          {steps.map((step: any, i: number) => {
            const Icon = iconMap[step.icon] || Search;
            const colors = stepColors[i % stepColors.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative text-center"
              >
                <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group h-full">
                  <div className="relative mx-auto mb-5">
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <span className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border ${colors.text} text-xs font-extrabold flex items-center justify-center shadow-md z-20`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-foreground mb-2 text-base md:text-lg">{step.title}</h3>
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
