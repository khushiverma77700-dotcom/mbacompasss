import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useCityPages } from "@/hooks/useCityPages";
import { useColleges } from "@/hooks/useInstitutes";

const cityColors = [
  "from-blue-500/10 to-blue-600/10 border-blue-200/50 hover:border-blue-400/50",
  "from-purple-500/10 to-purple-600/10 border-purple-200/50 hover:border-purple-400/50",
  "from-emerald-500/10 to-emerald-600/10 border-emerald-200/50 hover:border-emerald-400/50",
  "from-amber-500/10 to-amber-600/10 border-amber-200/50 hover:border-amber-400/50",
  "from-rose-500/10 to-rose-600/10 border-rose-200/50 hover:border-rose-400/50",
  "from-cyan-500/10 to-cyan-600/10 border-cyan-200/50 hover:border-cyan-400/50",
  "from-indigo-500/10 to-indigo-600/10 border-indigo-200/50 hover:border-indigo-400/50",
  "from-teal-500/10 to-teal-600/10 border-teal-200/50 hover:border-teal-400/50",
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
    return { ...cp, count, color: cityColors[i % cityColors.length] };
  });

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">City-wise Colleges</span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
            Browse by <span className="text-gradient">City</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-lg mx-auto">Find the best MBA colleges in your preferred city</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
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
                className={`group block bg-gradient-to-br ${city.color} rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-center`}
              >
                <div className="w-12 h-12 rounded-2xl bg-card shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-foreground text-sm mb-1">{city.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{city.count} Colleges</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrowseByCitySection;
