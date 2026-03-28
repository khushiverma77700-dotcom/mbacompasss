import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground/80 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg text-primary-foreground">CoachingHai</span>
            </Link>
            <p className="text-sm text-primary-foreground/60">
              India's trusted platform to find and compare coaching institutes for competitive exams.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/category/mba" className="hover:text-primary-foreground transition-colors">MBA Coaching</Link></li>
              <li><Link to="/category/medical" className="hover:text-primary-foreground transition-colors">Medical (NEET)</Link></li>
              <li><Link to="/category/engineering" className="hover:text-primary-foreground transition-colors">Engineering (JEE)</Link></li>
              <li><Link to="/category/government" className="hover:text-primary-foreground transition-colors">Government Exams</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/compare" className="hover:text-primary-foreground transition-colors">Compare Courses</Link></li>
              <li><Link to="/blog" className="hover:text-primary-foreground transition-colors">Blog & Tips</Link></li>
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">About Us</Link></li>
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>info@coachinghai.com</li>
              <li>+91 98765 43210</li>
              <li>New Delhi, India</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/40">
          © 2026 CoachingHai. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
