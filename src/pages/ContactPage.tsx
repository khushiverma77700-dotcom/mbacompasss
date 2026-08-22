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


      {/* Hero — content-first, no side form */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.07] via-background to-background pt-10 pb-10 md:pt-14 md:pb-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute top-32 right-0 h-96 w-96 rounded-full bg-sky-400/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/5 blur-[90px]" />
        </div>

        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <Badge
              variant="secondary"
              className="mb-5 inline-flex px-4 py-1.5 text-xs font-semibold tracking-wide bg-primary/10 text-primary border-primary/20"
            >
              <Gift className="w-3.5 h-3.5 mr-1.5" /> FREE MBA COUNSELLING FOR STUDENTS
            </Badge>

            <h1 className="font-heading text-3xl md:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-[1.08] tracking-tight">
              Free MBA Guidance &{" "}
              <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                Counselling
              </span>{" "}
              Built for You
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
              Talk to MBA Compass advisors for free. Get CAT strategy, profile review, resume
              feedback, college shortlisting, admission guidance, placements support and 1:1
              mentorship — everything a serious MBA aspirant needs.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="min-h-12 px-7 text-base font-semibold shadow-lg shadow-primary/25"
                onClick={scrollToForm}
              >
                Get My Free Guidance <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-12 px-6 text-base font-medium"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                How It Works
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 bg-card">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
                100% Free for Students
              </Badge>
              <Badge variant="outline" className="text-xs font-medium px-3 py-1.5 bg-card">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
                No Hidden Charges
              </Badge>
            </div>
          </motion.div>

          {/* Trust stats + contact tiles */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-10"
          >
            <div className="grid gap-4 md:grid-cols-12">
              {/* Stats */}
              <div className="md:col-span-7 grid grid-cols-3 gap-3 rounded-2xl border border-primary/10 bg-card/80 p-4 backdrop-blur-sm">
                {[
                  { value: "2,000+", label: "Aspirants mentored" },
                  { value: "600+", label: "B-schools covered" },
                  { value: "₹0", label: "Consultation fee" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center px-2">
                    <p className="font-heading text-xl md:text-2xl font-bold text-primary">{stat.value}</p>
                    <p className="mt-1 text-[11px] md:text-xs leading-tight text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Contact tiles */}
              <div className="md:col-span-5 grid sm:grid-cols-3 md:grid-cols-3 gap-3">
                {[
                  { icon: Mail, label: "Email", value: email },
                  { icon: Phone, label: "Phone", value: phone },
                  { icon: MapPin, label: "Address", value: address },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/70 p-3 text-center"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight break-words">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Student-focused promise cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                title: "Profile Review",
                desc: "Academic score, work experience & target colleges reviewed.",
              },
              {
                title: "CAT Strategy",
                desc: "Personalised study plan and section-wise prep roadmap.",
              },
              {
                title: "College Shortlist",
                desc: "Safe, target & ambitious colleges matched to your profile.",
              },
              {
                title: "Mentorship",
                desc: "1:1 guidance from MBA grads and admissions experts.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-primary/10 bg-card/70 p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-[0_16px_40px_-18px_hsl(var(--primary)/0.18)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-heading text-sm font-bold">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 font-heading text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>

          {/* Free AI tools auto-slider */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10"
          >
            <GuidanceToolsSlider />
          </motion.div>
        </div>
      </section>

      {/* Form section — below the slider, full-width centered */}
      <section className="relative pb-16 md:pb-20" ref={formRef}>
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
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
