import { Link } from "react-router-dom";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground/80 py-12">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg text-primary-foreground">MBAHub</span>
            </Link>
            <p className="text-sm text-primary-foreground/60">
              India's trusted platform to find and compare the best MBA coaching institutes for CAT, GMAT, XAT & more.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">MBA Exams</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/category/cat" className="hover:text-primary-foreground transition-colors">CAT Coaching</Link></li>
              <li><Link to="/category/gmat" className="hover:text-primary-foreground transition-colors">GMAT Preparation</Link></li>
              <li><Link to="/category/xat-snap" className="hover:text-primary-foreground transition-colors">XAT & SNAP</Link></li>
              <li><Link to="/category/gre-toefl" className="hover:text-primary-foreground transition-colors">GRE & TOEFL</Link></li>
              <li><Link to="/category/mat-cmat" className="hover:text-primary-foreground transition-colors">MAT & CMAT</Link></li>
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
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> info@mbahub.com</li>
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> New Delhi, India</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/40">
          &copy; 2026 MBAHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
