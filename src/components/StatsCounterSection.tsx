import { GraduationCap, Building2, Users, Award } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { icon: Building2, value: "500+", label: "Colleges Listed", color: "text-primary" },
  { icon: GraduationCap, value: "200+", label: "Coaching Institutes", color: "text-primary" },
  { icon: Users, value: "50,000+", label: "Students Guided", color: "text-primary" },
  { icon: Award, value: "15+", label: "MBA Exams Covered", color: "text-primary" },
];

const StatsCounterSection = () => (
  <section className="py-16 bg-primary">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-primary-foreground/10 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">{stat.value}</p>
              <p className="text-primary-foreground/80 text-sm">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default StatsCounterSection;
