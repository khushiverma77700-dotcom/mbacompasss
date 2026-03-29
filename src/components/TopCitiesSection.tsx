import { Link } from "react-router-dom";
import { Building2, Landmark, Cpu, BookOpen, Building, Church, Warehouse, BrickWall } from "lucide-react";
import { motion } from "framer-motion";
import { useCityPages } from "@/hooks/useCityPages";

const iconMap: Record<string, any> = {
  Delhi: Landmark, Mumbai: Building2, Bangalore: Cpu, Pune: BookOpen,
  Noida: Building, Hyderabad: Church, Chennai: Warehouse, Kolkata: BrickWall,
};
const colorCycle = [
  "bg-primary/10 text-primary",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
];

const TopCitiesSection = () => {
  const { data: cityPages } = useCityPages();

  const cities = (cityPages || []).filter(p => p.type === "city").slice(0, 8).map((p, i) => ({
    name: p.name,
    slug: p.slug,
    icon: iconMap[p.name] || Building,
    count: "View Colleges",
    color: colorCycle[i % 3],
  }));

  if (cities.length === 0) return null;

  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Top MBA Cities</h2>
          <p className="text-muted-foreground">Find the best colleges in your preferred city</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {cities.map((city, i) => {
            const Icon = city.icon;
            return (
              <motion.div key={city.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Link
                  to={`/colleges/${city.slug}`}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${city.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{city.name}</h3>
                  <p className="text-xs text-muted-foreground">{city.count}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TopCitiesSection;
