import { GraduationCap, Building2, Users, Award, TrendingUp, BookOpen } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const stats = [
  { icon: Building2, value: 500, suffix: "+", label: "Colleges Listed", desc: "Top MBA colleges across India" },
  { icon: GraduationCap, value: 200, suffix: "+", label: "Coaching Institutes", desc: "Expert-verified coaching centres" },
  { icon: Users, value: 50000, suffix: "+", label: "Students Guided", desc: "And counting every day" },
  { icon: Award, value: 15, suffix: "+", label: "MBA Exams Covered", desc: "CAT, XAT, GMAT & more" },
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
            // Ease out cubic
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
  <section className="relative py-20 md:py-24 overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-sky-400" />

    {/* Decorative shapes */}
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
      <div className="absolute top-1/2 -right-16 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 left-1/3 w-80 h-80 rounded-full bg-white/3" />
      {/* Dotted pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="white" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    </div>

    <div className="container mx-auto px-4 relative z-10">
      {/* Section header */}
      <motion.div
        className="text-center mb-14"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold mb-3 backdrop-blur-sm">
          <TrendingUp className="w-3.5 h-3.5" />
          Our Impact
        </span>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">
          Trusted by Thousands of MBA Aspirants
        </h2>
        <p className="text-white/70 max-w-lg mx-auto text-sm">
          India's fastest-growing platform for MBA preparation resources and guidance
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative group"
            >
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 md:p-7 text-center h-full">
                {/* Icon */}
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-white/15 flex items-center justify-center mb-4 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>

                {/* Number */}
                <p className="text-3xl md:text-5xl font-extrabold text-white mb-1 tracking-tight">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </p>

                {/* Label */}
                <p className="text-white font-semibold text-sm md:text-base mb-1">{stat.label}</p>

                {/* Description */}
                <p className="text-white/50 text-[11px] md:text-xs">{stat.desc}</p>

                {/* Bottom accent line */}
                <div className="mt-4 mx-auto w-10 h-0.5 rounded-full bg-white/20" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default StatsCounterSection;
