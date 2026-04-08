import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import mbahubLogo from "@/assets/mbahub-logo-sm.png";

const Footer = () => {
  const { data: footer } = useSiteSettings("footer");

  const brandDesc = footer?.brand_description || "India's trusted platform to find and compare the best MBA coaching institutes.";
  const examLinks = footer?.exam_links || [];
  const quickLinks = footer?.quick_links || [];
  const email = footer?.contact_email || "info@mbahub.com";
  const phone = footer?.contact_phone || "+91 98765 43210";
  const address = footer?.contact_address || "New Delhi, India";
  const copyright = footer?.copyright || "2026 MBAHub. All rights reserved.";

  return (
    <footer className="bg-foreground text-primary-foreground/80 py-12">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={mbahubLogo} alt="MBAHub Logo" className="w-8 h-8 rounded-lg object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="font-heading font-bold text-lg text-primary-foreground">MBAHub</span>
                <span className="text-[8px] font-medium text-primary-foreground/50 -mt-0.5 tracking-wide">by B School Buzz</span>
              </div>
            </Link>
            <p className="text-sm text-primary-foreground/60">{brandDesc}</p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">MBA Exams</h4>
            <ul className="space-y-2 text-sm">
              {examLinks.map((link: any, i: number) => (
                <li key={i}><Link to={link.path} className="hover:text-primary-foreground transition-colors">{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link: any, i: number) => (
                <li key={i}><Link to={link.path} className="hover:text-primary-foreground transition-colors">{link.label}</Link></li>
              ))}
              <li><Link to="/profile-analyzer" className="hover:text-primary-foreground transition-colors">AI Profile Analyser</Link></li>
              <li><Link to="/business-inquiries" className="hover:text-primary-foreground transition-colors">Business Inquiries</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-3 text-sm">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {email}</li>
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {phone}</li>
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {address}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/40">
          &copy; {copyright}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
