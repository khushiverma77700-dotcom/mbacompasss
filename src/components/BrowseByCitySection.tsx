import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useCityPages } from "@/hooks/useCityPages";
import { useColleges } from "@/hooks/useInstitutes";

const cityGradients = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
  "from-teal-500 to-teal-600",
];

const BrowseByCitySection = () => {
  const { data: cityPages } = useCityPages();
  const { data: colleges } = useColleges();

  if (!cityPages?.length) return null;

  const cities = cityPages.slice(0, 8).map((cp, i) => {
    const aliases = cp.city_aliases || [cp.name.toLowerCase()];
    const count = (colleges || []).filter(c =>
      aliases.some(a => (c.city || "").toLowerCase().includes(a.toLowerCase()) || (c.state || "").toLowerCase().includes(a.toLowerCase()))
    ).length;
    return { ...cp, count, gradient: cityGradients[i % cityGradients.length] };
  });

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
            <MapPin className="w-3.5 h-3.5" /> City-wise Colleges
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-3">
            Browse by <span className="text-gradient">City</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Find the best MBA colleges and coaching institutes in your preferred city</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {cities.map((city, i) => (
            <motion.div
              key={city.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/colleges/${city.slug}`}
                className="group block bg-card rounded-2xl p-5 md:p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center relative overflow-hidden"
              >
                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none`} />
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${city.gradient} shadow-md flex items-center justify-center mx-auto mb-4 group-hover:bg-white/20 transition-all`}>
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-heading font-bold text-foreground text-sm md:text-base mb-1 group-hover:text-white transition-colors">{city.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3 group-hover:text-white/70 transition-colors">{city.count} Colleges</p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary font-bold group-hover:text-white group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrowseByCitySection;
