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
              <div className="bg-card rounded-xl p-3 md:p-4 text-center border border-border shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <div className={`w-9 h-9 md:w-10 md:h-10 mx-auto rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <p className="text-lg md:text-2xl font-extrabold text-foreground mb-0.5 tracking-tight font-heading leading-tight">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-foreground font-semibold text-[11px] md:text-xs mb-0.5 leading-tight">{stat.label}</p>
                <p className="text-muted-foreground text-[9px] md:text-[11px] leading-tight">{stat.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default StatsCounterSection;
