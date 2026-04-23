import { lazy, Suspense, useEffect, useState } from "react";
import HeroSection from "@/components/HeroSection";
import SEOHead, { generateWebsiteSchema, generateOrganizationSchema, generateFAQSchema, generateBreadcrumbSchema } from "@/components/SEOHead";

// Lazy load — these pull framer-motion which would bloat the initial bundle
const StatsCounterSection = lazy(() => import("@/components/StatsCounterSection"));

const CategoryCards = lazy(() => import("@/components/CategoryCards"));

// Lazy load below-the-fold sections
const CoachingOfWeekSection = lazy(() => import("@/components/CoachingOfWeekSection"));
const FeaturedInstitutes = lazy(() => import("@/components/FeaturedInstitutes"));
const OfferBanners = lazy(() => import("@/components/OfferBanners"));
const TopRankedCollegesSection = lazy(() => import("@/components/TopRankedCollegesSection"));
const BrowseByCitySection = lazy(() => import("@/components/BrowseByCitySection"));
const ExamDeadlinesTicker = lazy(() => import("@/components/ExamDeadlinesTicker"));
const PopularExamsSection = lazy(() => import("@/components/PopularExamsSection"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const LearningResourcesSection = lazy(() => import("@/components/LearningResourcesSection"));
const ProfileAnalyzerCTA = lazy(() => import("@/components/ProfileAnalyzerCTA"));
const LatestArticlesSection = lazy(() => import("@/components/LatestArticlesSection"));
const SuccessStoriesSection = lazy(() => import("@/components/SuccessStoriesSection"));
const WhyChooseUs = lazy(() => import("@/components/WhyChooseUs"));
const FAQSection = lazy(() => import("@/components/FAQSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const PageKeywords = lazy(() => import("@/components/PageKeywords"));
const AIToolsSection = lazy(() => import("@/components/AIToolsSection"));

const homepageFAQs = [
  { q: "What is the best MBA coaching in India?", a: "The best MBA coaching depends on your target exam. For CAT, top choices include IMS, TIME, and Career Launcher. Compare fees, success rates, and student reviews on MBA Compass." },
  { q: "How much does MBA coaching cost in India?", a: "MBA coaching fees range from ₹15,000 to ₹1,50,000 depending on the institute, course duration, and mode (online/offline). Use our comparison tool to find the best value." },
  { q: "Which coaching is best for CAT preparation?", a: "Top CAT coaching institutes include IMS Learning Resources, TIME Institute, Career Launcher, and Unacademy. Each has unique strengths — compare them side-by-side on our platform." },
  { q: "Can I prepare for MBA entrance exams online?", a: "Yes! Many top coaching institutes now offer online MBA preparation courses with live classes, recorded lectures, mock tests, and personalized mentoring." },
  { q: "When should I start preparing for CAT exam?", a: "Ideally, start CAT preparation 8-12 months before the exam. CAT usually happens in November-December, so beginning in January-February gives adequate time." },
  { q: "What are the top MBA colleges in India?", a: "Top MBA colleges include IIM Ahmedabad, IIM Bangalore, IIM Calcutta, XLRI Jamshedpur, FMS Delhi, ISB Hyderabad, and MDI Gurgaon. Browse our rankings for the complete list." },
];

const Index = () => {
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  useEffect(() => {
    // Mount deferred sections right after first paint (next frame, idle if available)
    const w = window as any;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 0));
    const handle = schedule(() => setShowDeferredSections(true));
    return () => {
      const cancel = w.cancelIdleCallback ?? window.clearTimeout;
      cancel(handle);
    };
  }, []);

  const jsonLdSchemas = [
    generateWebsiteSchema(),
    generateOrganizationSchema(),
    generateFAQSchema(homepageFAQs),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "MBA Coaching", url: "/category/cat" },
      { name: "Top Colleges", url: "/colleges" },
      { name: "Blog", url: "/blog" },
    ]),
  ];

  return (
    <>
      <SEOHead
        title="MBA Compass — Top MBA Colleges, Coaching & Entrance Exams India 2026"
        description="India's #1 platform to find, compare & review best MBA coaching institutes & top B-schools for CAT, GMAT, XAT, SNAP. Compare fees, placements, success rates & 10,000+ student reviews. Updated daily."
        keywords={[
          "MBA admissions", "top MBA colleges", "MBA entrance exams", "business schools India", "B-school news",
          "best MBA coaching", "MBA coaching institutes India", "CAT coaching", "GMAT preparation",
          "XAT coaching", "MBA entrance exam coaching", "IIM preparation coaching", "best CAT coaching",
          "MBA coaching fees comparison", "top MBA coaching centres", "MBA coaching near me",
          "online MBA coaching", "CAT preparation 2026", "MBA coaching reviews",
          "top ranked MBA colleges in India for placement", "how to prepare for MBA admissions in India",
          "MBA specializations with highest salary in India", "latest MBA admission notifications 2026",
          "upcoming MBA entrance exam dates 2026", "comprehensive guide for MBA aspirants in India",
        ]}
        canonical="https://mbacompass.in"
        ogType="website"
        ogTitle="MBA Compass — Top MBA Colleges, Coaching & Entrance Exams India 2026"
        ogDescription="Compare 500+ MBA coaching institutes & 2000+ colleges. Find the best CAT, GMAT, XAT coaching with verified reviews, fees & success rates."
        twitterTitle="MBA Compass — MBA Colleges, Coaching & Exams India 2026"
        twitterDescription="India's most trusted MBA coaching & college comparison. Compare fees, reviews, placements of 2000+ institutes."
        jsonLd={jsonLdSchemas}
      />
      
      {/* Above-the-fold: loaded eagerly */}
      <HeroSection />
      <Suspense fallback={null}>
        <StatsCounterSection />
        
        <CategoryCards />
      </Suspense>

      {/* Below-the-fold: mount after first paint so hero appears immediately */}
      {showDeferredSections && (
        <Suspense fallback={null}>
          <AIToolsSection />
          <CoachingOfWeekSection />
          <OfferBanners />
          <FeaturedInstitutes />
          <TopRankedCollegesSection />
          <BrowseByCitySection />
          <ExamDeadlinesTicker />
          <PopularExamsSection />
          <HowItWorksSection />
          <LearningResourcesSection />
          <ProfileAnalyzerCTA />
          <LatestArticlesSection />
          <SuccessStoriesSection />
          <WhyChooseUs />
          <FAQSection />
          <CTASection />
        </Suspense>
      )}

      {showDeferredSections && (
        <div className="container mx-auto px-4 pb-8">
          <Suspense fallback={null}>
            <PageKeywords contentType="static" recordId="homepage" fallbackKeywords={["best MBA coaching", "MBA coaching institutes India", "CAT coaching", "MBA entrance exam", "IIM preparation"]} />
          </Suspense>
        </div>
      )}
    </>
  );
};

export default Index;
