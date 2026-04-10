import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import PageKeywords from "@/components/PageKeywords";

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { data: settings } = useSiteSettings("contact_page");

  const heading = settings?.heading || "Contact Us";
  const email = settings?.email || "info@bschoolbuzz.com";
  const phone = settings?.phone || "+91 98765 43210";
  const address = settings?.address || "Connaught Place, New Delhi, India 110001";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert({ ...form, type: "general" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setForm({ name: "", email: "", phone: "", message: "" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Contact Us — BSchoolBuzz.com | Get MBA Coaching Guidance"
        description="Contact BSchoolBuzz.com for personalized MBA coaching guidance. Get help choosing the right coaching institute for CAT, GMAT, XAT preparation."
        keywords={["contact MBA coaching", "MBA guidance", "CAT coaching help", "MBA preparation support"]}
        canonical="https://bschoolbuzz.com/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact BSchoolBuzz.com",
          url: "https://bschoolbuzz.com/contact",
        }}
      />

      <nav className="container mx-auto px-4 pt-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li className="flex items-center gap-1.5"><span>/</span><span className="text-foreground font-medium">Contact Us</span></li>
        </ol>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">{heading}</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader><CardTitle>Send us a message</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Your Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <Input type="tel" placeholder="Phone Number *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} required minLength={10} maxLength={10} />
                <Textarea placeholder="Your Message *" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={5} />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send Message"}</Button>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Mail className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground">Email</h3>
                <p className="text-muted-foreground">{email}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground">Phone</h3>
                <p className="text-muted-foreground">{phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground">Address</h3>
                <p className="text-muted-foreground">{address}</p>
              </div>
            </div>
          </div>
        </div>

        <PageKeywords contentType="static" recordId="contact" fallbackKeywords={["contact MBA coaching", "MBA guidance", "CAT coaching help"]} />
      </div>
    </div>
  );
};

export default ContactPage;
