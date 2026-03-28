import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

const cities = [
  { name: "Delhi", image: "🏛️", count: "50+ Colleges" },
  { name: "Mumbai", image: "🌊", count: "45+ Colleges" },
  { name: "Bangalore", image: "💻", count: "40+ Colleges" },
  { name: "Pune", image: "📚", count: "35+ Colleges" },
  { name: "Noida", image: "🏢", count: "25+ Colleges" },
  { name: "Hyderabad", image: "🕌", count: "30+ Colleges" },
  { name: "Chennai", image: "🛕", count: "28+ Colleges" },
  { name: "Kolkata", image: "🌉", count: "20+ Colleges" },
];

const TopCitiesSection = () => (
  <section className="py-14 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-10">
        <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Top MBA Cities</h2>
        <p className="text-muted-foreground">Find the best colleges in your preferred city</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {cities.map((city, i) => (
          <motion.div
            key={city.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/colleges/${city.name.toLowerCase()}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <span className="text-3xl">{city.image}</span>
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{city.name}</h3>
              <p className="text-xs text-muted-foreground">{city.count}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TopCitiesSection;
