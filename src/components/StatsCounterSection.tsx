import { GraduationCap, Building2, Users, Award, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const stats = [
  { icon: Building2, value: 500, suffix: "+", label: "Colleges Listed", desc: "Top MBA colleges across India", color: "from-blue-500 to-cyan-400" },
  { icon: GraduationCap, value: 200, suffix: "+", label: "Coaching Institutes", desc: "Expert-verified coaching centres", color: "from-violet-500 to-purple-400" },
  { icon: Users, value: 50000, suffix: "+", label: "Students Guided", desc: "And counting every day", color: "from-emerald-500 to-teal-400" },
  { icon: Award, value: 15, suffix: "+", label: "MBA Exams Covered", desc: "CAT, XAT, GMAT & more", color: "from-amber-500 to-orange-400" },
];

const AnimatedNumber = ({ target, suffix }: { target: number; suffix: string }) => {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1800;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            setDisplay(current.toLocaleString("en-IN"));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
};

const StatsCounterSection = () => (
  <section className="relative py-0 -mt-16 z-20">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group"
            >
              <div className="bg-card rounded-2xl p-5 md:p-6 text-center border border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 md:w-14 md:h-14 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <p className="text-2xl md:text-4xl font-extrabold text-foreground mb-0.5 tracking-tight font-heading">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-foreground font-semibold text-xs md:text-sm mb-0.5">{stat.label}</p>
                <p className="text-muted-foreground text-[10px] md:text-xs">{stat.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default StatsCounterSection;
