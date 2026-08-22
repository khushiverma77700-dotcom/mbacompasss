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
import GuidanceToolsSlider from "@/components/contact/GuidanceToolsSlider";
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
      <section
        className="relative overflow-hidden bg-gradient-to-b from-primary/[0.07] via-background to-background pt-10 pb-14 md:pt-14 md:pb-20"
        ref={formRef}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-[90px]" />
          <div className="absolute top-40 right-0 h-80 w-80 rounded-full bg-sky-400/10 blur-[110px]" />
        </div>
        <div className="container relative mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_minmax(0,520px)] gap-8 lg:gap-12 items-start">
            {/* Left: value prop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pt-2 lg:pt-6"
            >
              <Badge
                variant="secondary"
                className="mb-4 px-3 py-1 text-xs font-semibold tracking-wide bg-primary/10 text-primary border-primary/20"
              >
                <Gift className="w-3.5 h-3.5 mr-1.5" /> FREE MBA COUNSELLING FOR STUDENTS
              </Badge>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-[3.25rem] font-bold text-foreground leading-[1.1] tracking-tight">
                Free MBA Guidance &{" "}
                <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                  Counselling
                </span>{" "}
                for Students
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-4 leading-relaxed max-w-xl">
                Confused about your MBA journey? Get free MBA counselling from MBA Compass — from CAT
                guidance and profile review to MBA college selection, resume review, admission
                guidance, placements and mentorship. Every service on this page is free for students
                during our current one-month initiative.
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 bg-card">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  100% FREE FOR STUDENTS
                </Badge>
                <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 bg-card">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Available for the next one month
                </Badge>
              </div>

              {/* Trust stats */}
              <div className="mt-7 grid grid-cols-3 gap-3 max-w-lg">
                {[
                  { value: "2,000+", label: "Aspirants mentored" },
                  { value: "600+", label: "B-schools covered" },
                  { value: "₹0", label: "Consultation fee" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-primary/10 bg-card px-3 py-3 text-center"
                  >
                    <p className="font-heading text-lg md:text-xl font-bold text-primary">{stat.value}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-7">
                <Button size="lg" className="min-h-12 px-7 text-base font-semibold shadow-lg shadow-primary/25" onClick={scrollToForm}>
                  Get My Free Guidance <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="mt-9 grid sm:grid-cols-3 gap-3 text-sm">
                {[
                  { icon: Mail, label: "Email", value: email },
                  { icon: Phone, label: "Phone", value: phone },
                  { icon: MapPin, label: "Address", value: address },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/70 p-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="text-muted-foreground break-words">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Free AI tools auto-slider filling the space below */}
              <GuidanceToolsSlider />
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
