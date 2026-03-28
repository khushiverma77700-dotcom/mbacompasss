import { Link } from "react-router-dom";
import { Building2, Landmark, Cpu, BookOpen, Building, Church, Warehouse, BrickWall } from "lucide-react";
import { motion } from "framer-motion";

const cities = [
  { name: "Delhi", icon: Landmark, count: "50+ Colleges", color: "bg-primary/10 text-primary" },
  { name: "Mumbai", icon: Building2, count: "45+ Colleges", color: "bg-secondary text-secondary-foreground" },
  { name: "Bangalore", icon: Cpu, count: "40+ Colleges", color: "bg-accent text-accent-foreground" },
  { name: "Pune", icon: BookOpen, count: "35+ Colleges", color: "bg-primary/10 text-primary" },
  { name: "Noida", icon: Building, count: "25+ Colleges", color: "bg-secondary text-secondary-foreground" },
  { name: "Hyderabad", icon: Church, count: "30+ Colleges", color: "bg-accent text-accent-foreground" },
  { name: "Chennai", icon: Warehouse, count: "28+ Colleges", color: "bg-primary/10 text-primary" },
  { name: "Kolkata", icon: BrickWall, count: "20+ Colleges", color: "bg-secondary text-secondary-foreground" },
];

const TopCitiesSection = () => (
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
            <motion.div
              key={city.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/colleges/${city.name.toLowerCase()}`}
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

export default TopCitiesSection;
