import { useState, useEffect, useRef } from "react";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Phone, MapPin, ArrowRight, Sparkles, ShieldCheck, Gift,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/SEOHead";
import PageKeywords from "@/components/PageKeywords";
import GuidanceForm from "@/components/contact/GuidanceForm";
import GuidanceSuccessDialog from "@/components/contact/GuidanceSuccessDialog";
import StickyGuidanceCTA from "@/components/contact/StickyGuidanceCTA";
import {
  HelpCategoriesSection, FreeHighlightSection, ReviewSpotlightSection,
  CollegeGuidanceSection, CatPlannerSection, MentorshipJourneySection,
  QuestionsSection, WhoAndHowSection, TrustSection, GuidanceFAQ, FinalCTASection,
  AdmissionAndCareerSection, RelatedResourcesSection,
} from "@/components/contact/ContactSections";
import { guidanceFaqs } from "@/components/contact/guidanceData";


const ContactPage = () => {
  const { data: settings } = useSiteSettings("contact_page");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [stickyHidden, setStickyHidden] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const email = settings?.email || "info@mbacompass.in";
  const phone = settings?.phone || "+91 98765 43210";
  const address = settings?.address || "Connaught Place, New Delhi, India 110001";

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const selectTopic = (topic: string) => {
    setSelectedTopics((prev) => (prev.includes(topic) ? prev : [...prev, topic]));
    document.getElementById("guidance-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyHidden(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "-80px 0px 0px 0px" }
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  const scrollToForm = () =>
    document.getElementById("guidance-form")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const PAGE_URL = "https://mbacompass.in/contact";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Free MBA Counselling & Guidance | Profile Review | MBA Compass",
      url: PAGE_URL,
      description:
        "Free MBA counselling and guidance from MBA Compass — profile review, resume review, CAT strategy, college selection, admission guidance and mentorship.",
      inLanguage: "en-IN",
      isPartOf: { "@type": "WebSite", name: "MBA Compass", url: "https://mbacompass.in" },
      about: { "@type": "Thing", name: "MBA Counselling" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://mbacompass.in/" },
        { "@type": "ListItem", position: 2, name: "Free MBA Counselling & Guidance", item: PAGE_URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guidanceFaqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Free MBA Counselling & Guidance — MBA Compass",
      url: PAGE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Free MBA Counselling & Guidance",
      serviceType: "MBA Counselling",
      provider: { "@type": "Organization", name: "MBA Compass", url: "https://mbacompass.in" },
      areaServed: { "@type": "Country", name: "India" },
      audience: { "@type": "AudienceType", audienceType: "MBA aspirants" },
      description:
        "Free MBA counselling, MBA profile review, resume review, CAT planner, CAT mentorship, MBA college selection and shortlisting, admission guidance and career guidance for students.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "MBA Compass",
      url: "https://mbacompass.in",
      email,
      telephone: phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: address,
        addressLocality: "New Delhi",
        addressRegion: "Delhi",
        postalCode: "110001",
        addressCountry: "IN",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Free MBA Counselling & Guidance | Profile Review | MBA Compass"
        description="Get free MBA counselling and guidance from MBA Compass. Get profile & resume reviews, CAT strategy, college selection, admission guidance, mentorship and more — 100% free for students."
        keywords={[
          "MBA counselling", "free MBA counselling", "free MBA guidance",
          "MBA profile review", "free resume review", "CAT guidance",
          "CAT mentorship", "free CAT planner", "MBA college selection",
          "MBA admission guidance",
        ]}
        canonical={PAGE_URL}
        ogTitle="Free MBA Counselling & Guidance | Profile Review | MBA Compass"
        ogDescription="Get free MBA counselling, profile review, CAT guidance, college selection support and MBA mentorship from MBA Compass."
        twitterTitle="Free MBA Counselling & Guidance | MBA Compass"
        twitterDescription="Free MBA profile review, resume review, CAT guidance, college selection and mentorship for students."
        jsonLd={jsonLd}
      />


      {/* Hero */}
      <section className="relative overflow-hidden bg-background pt-10 pb-14 md:pt-14 md:pb-20" ref={formRef}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left: value prop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pt-2 lg:pt-8"
            >
              <Badge
                variant="secondary"
                className="mb-4 px-3 py-1 text-xs font-semibold tracking-wide bg-primary/10 text-primary border-primary/20"
              >
                <Gift className="w-3.5 h-3.5 mr-1.5" /> FREE MBA COUNSELLING FOR STUDENTS
              </Badge>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Free MBA Guidance & Counselling for Students
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-4 leading-relaxed max-w-xl">
                Confused about your MBA journey? Get free MBA counselling from MBA Compass — from CAT
                guidance and profile review to MBA college selection, resume review, admission
                guidance, placements and mentorship. Every service on this page is free for students
                during our current one-month initiative.

              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Badge variant="outline" className="text-xs font-medium px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  100% FREE FOR STUDENTS
                </Badge>
                <Badge variant="outline" className="text-xs font-medium px-3 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Available for the next one month
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button size="lg" className="min-h-12 px-7 text-base font-semibold" onClick={scrollToForm}>
                  Get My Free Guidance <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>


              <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-muted-foreground">{email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Phone</p>
                    <p className="text-muted-foreground">{phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Address</p>
                    <p className="text-muted-foreground">{address}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <GuidanceForm
                selectedTopics={selectedTopics}
                onToggleTopic={toggleTopic}
                onSuccess={() => setSuccessOpen(true)}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <HelpCategoriesSection onSelect={selectTopic} />
      <FreeHighlightSection />
      <ReviewSpotlightSection />
      <CollegeGuidanceSection />
      <CatPlannerSection />
      <MentorshipJourneySection />
      <AdmissionAndCareerSection />
      <QuestionsSection />
      <WhoAndHowSection />
      <TrustSection />
      <RelatedResourcesSection />
      <GuidanceFAQ />

      <FinalCTASection />

      <div className="container mx-auto px-4 py-10">
        <PageKeywords contentType="static" recordId="contact" fallbackKeywords={["free MBA guidance", "MBA consultation", "CAT mentorship"]} />
      </div>

      <GuidanceSuccessDialog open={successOpen} onOpenChange={setSuccessOpen} />
      <StickyGuidanceCTA onClick={scrollToForm} hidden={stickyHidden} />
    </div>
  );
};

export default ContactPage;
