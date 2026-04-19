import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const fallbackFaqs = [
  {
    q: "What is the best MBA entrance exam in India?",
    a: "CAT (Common Admission Test) is widely considered the most important MBA entrance exam in India, accepted by all IIMs and top B-schools. Other popular exams include XAT, GMAT, SNAP, MAT, and CMAT.",
  },
  {
    q: "How do I choose the right MBA college?",
    a: "Consider factors like NIRF ranking, placement statistics (average & median salary), faculty quality, alumni network, location, specializations offered, and total cost of the program including living expenses.",
  },
  {
    q: "What is the average fee for an MBA in India?",
    a: "MBA fees vary significantly — from ₹2-5 lakhs at state universities to ₹15-25 lakhs at top IIMs and private institutes. PGDM programs at premier institutes can cost ₹10-20 lakhs.",
  },
  {
    q: "Are coaching institutes worth it for MBA preparation?",
    a: "Coaching can be valuable for structured preparation, expert guidance, mock tests, and peer learning. However, many students also crack exams through self-study. It depends on your discipline and learning style.",
  },
  {
    q: "What is the difference between MBA and PGDM?",
    a: "MBA is offered by universities and is a degree program. PGDM is offered by autonomous institutes (like IIMs) and is a diploma. Both are equally valued by employers and have similar curricula.",
  },
  {
    q: "How do I claim a coupon code for coaching discounts?",
    a: "Simply sign up or log in to our platform, select your target exam, and you'll see available coupon codes for coaching institutes. Copy the code and share it with the institute during enrollment.",
  },
];

const FAQSection = () => {
  const { data: settings } = useSiteSettings("faqs");

  const heading = settings?.heading || "Frequently Asked Questions";
  const subheading = settings?.subheading || "Everything you need to know about MBA admissions";
  const faqs: { q: string; a: string }[] = settings?.items || fallbackFaqs;

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left Info */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <HelpCircle className="w-3.5 h-3.5" /> FAQs
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
              {heading}
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">{subheading}</p>
            <div className="bg-card rounded-xl border border-border p-5 card-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-foreground text-sm">Still have questions?</h4>
                  <p className="text-xs text-muted-foreground">Our experts are here to help</p>
                </div>
              </div>
              <a
                href="/contact"
                className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
              >
                Contact Us →
              </a>
            </div>
          </motion.div>

          {/* Right Accordion */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 data-[state=open]:shadow-md transition-all"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary transition-colors text-sm md:text-base py-4">
                    <span className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {faq.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5 pl-10">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>

      {/*
        FAQ JSON-LD is injected centrally by SEOHead on the homepage
        (Index.tsx → generateFAQSchema). Do NOT duplicate it here —
        Google flags duplicate FAQPage schemas as an error.
      */}
    </section>
  );
};

export default FAQSection;
