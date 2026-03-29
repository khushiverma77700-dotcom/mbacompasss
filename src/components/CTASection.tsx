import { Link } from "react-router-dom";
import { ArrowRight, PhoneCall, GraduationCap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => (
  <section className="py-20 md:py-24 relative overflow-hidden">
    <div className="absolute inset-0 hero-gradient" />
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
    </div>
    <div className="container mx-auto px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
          <GraduationCap className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground">Start Your MBA Journey Today</span>
        </div>
        <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-primary-foreground mb-5 leading-tight">
          Ready to Get Into Your
          <br />
          Dream B-School?
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed max-w-2xl mx-auto">
          Get personalized guidance, exclusive coaching discounts, and connect with top institutes across India. Join thousands of students who found their perfect MBA match.
        </p>

        <div className="flex items-center justify-center gap-3 mb-8">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          ))}
          <span className="text-primary-foreground/80 text-sm ml-1">Trusted by 50,000+ students</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/colleges">
            <Button size="lg" className="gap-2 text-base px-8 bg-white text-primary hover:bg-white/90 shadow-lg">
              Explore Colleges <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/contact">
            <Button size="lg" variant="outline" className="gap-2 text-base px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <PhoneCall className="w-5 h-5" /> Talk to Expert
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
