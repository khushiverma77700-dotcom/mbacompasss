import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Users, Award, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { icon: BookOpen, value: "500+", label: "Coaching Institutes" },
  { icon: GraduationCap, value: "200+", label: "Courses" },
  { icon: Users, value: "1M+", label: "Students Guided" },
  { icon: Award, value: "95%", label: "Success Rate" },
];

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/category/mba?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 hero-gradient opacity-85" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 leading-tight">
            Find the Best Coaching
            <br />
            <span className="opacity-90">for Your Dream Exam</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            Compare top coaching institutes for MBA, NEET, JEE, UPSC & more. Make informed decisions with real reviews and data.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search coaching institute or course..."
                className="h-14 pl-12 pr-32 rounded-xl bg-card text-foreground text-base border-none shadow-lg"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 rounded-lg"
              >
                Search
              </Button>
            </div>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
              <stat.icon className="w-6 h-6 text-primary-foreground mx-auto mb-2" />
              <div className="text-2xl font-heading font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-xs text-primary-foreground/70">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
