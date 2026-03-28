import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
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

const FAQSection = () => (
  <section className="py-16 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-10">
        <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Frequently Asked Questions</h2>
        <p className="text-muted-foreground">Everything you need to know about MBA admissions</p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto"
      >
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary transition-colors text-sm md:text-base">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQSection;
