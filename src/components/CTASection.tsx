import { Link } from "react-router-dom";
import { ArrowRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => (
  <section className="py-20 bg-primary">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto"
      >
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Ready to Start Your MBA Journey?
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
          Get personalized guidance, exclusive discounts, and connect with top institutes across India. Join thousands of students who found their perfect MBA match through us.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/colleges">
            <Button size="lg" variant="secondary" className="gap-2 text-base px-8">
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
