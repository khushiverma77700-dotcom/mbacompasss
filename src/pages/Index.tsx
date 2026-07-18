import { lazy, Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import HomeQuickAccessStrip from "@/components/HomeQuickAccessStrip";
import MBANewsBar from "@/components/MBANewsBar";
import ExamDeadlinesTicker from "@/components/ExamDeadlinesTicker";
import TopRankedCollegesSection from "@/components/TopRankedCollegesSection";
import SEOHead, {
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
} from "@/components/SEOHead";
import { LazyMount } from "@/hooks/useInView";

// Below-the-fold sections are code-split (React.lazy) so the initial JS bundle
// stays tiny — this is the biggest lever for LCP on a React SPA.
const StatsCounterSection = lazy(() => import("@/components/StatsCounterSection"));
const PopularExamsSection = lazy(() => import("@/components/PopularExamsSection"));
const CategoryCards = lazy(() => import("@/components/CategoryCards"));
const TopCitiesSection = lazy(() => import("@/components/TopCitiesSection"));
const TopExamComparisonSection = lazy(() => import("@/components/TopExamComparisonSection"));
const WhyChooseUs = lazy(() => import("@/components/WhyChooseUs"));
const AICoachingFinder = lazy(() => import("@/components/AICoachingFinder"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const SuccessStoriesSection = lazy(() => import("@/components/SuccessStoriesSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const LearningResourcesSection = lazy(() => import("@/components/LearningResourcesSection"));
const LatestArticlesSection = lazy(() => import("@/components/LatestArticlesSection"));
const NewsSection = lazy(() => import("@/components/NewsSection"));
const FAQSection = lazy(() => import("@/components/FAQSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const MBALandscapeSection = lazy(() => import("@/components/MBALandscapeSection"));
const MBAJourneyStrip = lazy(() => import("@/components/MBAJourneyStrip"));

const homepageFAQs = [
  { q: "What is the best MBA coaching in India?", a: "The best MBA coaching depends on your target exam. For CAT, top choices include IMS, TIME, and Career Launcher. Compare fees, success rates, and student reviews on MBA Compass." },
  { q: "How much does MBA coaching cost in India?", a: "MBA coaching fees range from ₹15,000 to ₹1,50,000 depending on the institute, course duration, and mode (online/offline). Use our comparison tool to find the best value." },
  { q: "Which coaching is best for CAT preparation?", a: "Top CAT coaching institutes include IMS Learning Resources, TIME Institute, Career Launcher, and Unacademy. Each has unique strengths — compare them side-by-side on our platform." },
  { q: "Can I prepare for MBA entrance exams online?", a: "Yes! Many top coaching institutes now offer online MBA preparation courses with live classes, recorded lectures, mock tests, and personalized mentoring." },
  { q: "When should I start preparing for CAT exam?", a: "Ideally, start CAT preparation 8-12 months before the exam. CAT usually happens in November-December, so beginning in January-February gives adequate time." },
  { q: "What are the top MBA colleges in India?", a: "Top MBA colleges include IIM Ahmedabad, IIM Bangalore, IIM Calcutta, XLRI Jamshedpur, FMS Delhi, ISB Hyderabad, and MDI Gurgaon. Browse our rankings for the complete list." },
];

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

const SectionPlaceholder = ({ height = 320 }: { height?: number }) => (
  <div style={{ minHeight: height }} aria-hidden="true" />
);

const Deferred = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <LazyMount minHeight={height} fallback={<SectionPlaceholder height={height} />}>
    <Suspense fallback={<SectionPlaceholder height={height} />}>{children}</Suspense>
  </LazyMount>
);

const Index = () => {
  return (
    <>
      <SEOHead
        title="MBA Compass — MBA Colleges, Coaching & Exams India 2026"
        description="Compare India's top MBA coaching institutes & B-schools for CAT, XAT, GMAT, SNAP. Fees, placements, reviews & rankings — updated daily."
        keywords={[
          "MBA admissions", "top MBA colleges", "MBA entrance exams", "business schools India", "B-school news",
          "best MBA coaching", "MBA coaching institutes India", "CAT coaching", "GMAT preparation",
          "XAT coaching", "MBA entrance exam coaching", "IIM preparation coaching", "best CAT coaching",
          "MBA coaching fees comparison", "top MBA coaching centres", "MBA coaching near me",
          "online MBA coaching", "CAT preparation 2026", "MBA coaching reviews",
        ]}
        canonical="https://mbacompass.in"
        ogType="website"
        ogTitle="MBA Compass — Top MBA Colleges, Coaching & Entrance Exams India 2026"
        ogDescription="Compare 500+ MBA coaching institutes & 2000+ colleges. Find the best CAT, GMAT, XAT coaching with verified reviews, fees & success rates."
        twitterTitle="MBA Compass — MBA Colleges, Coaching & Exams India 2026"
        twitterDescription="India's most trusted MBA coaching & college comparison. Compare fees, reviews, placements of 2000+ institutes."
        jsonLd={jsonLdSchemas}
      />

      <div>
        {/* Above-the-fold: eager, in the initial chunk */}
        <HeroSection />
        <ExamDeadlinesTicker />
        <TopRankedCollegesSection />

        {/* Below-the-fold: code-split + mount on scroll */}
        <Deferred height={200}><StatsCounterSection /></Deferred>
        <Deferred height={360}><PopularExamsSection /></Deferred>
        <Deferred height={320}><CategoryCards /></Deferred>
        <Deferred height={320}><TopCitiesSection /></Deferred>
        <Deferred height={420}><TopExamComparisonSection /></Deferred>
        <Deferred height={420}><WhyChooseUs /></Deferred>
        <Deferred height={160}><AICoachingFinder /></Deferred>
        <Deferred height={360}><HowItWorksSection /></Deferred>
        <Deferred height={420}><SuccessStoriesSection /></Deferred>
        <Deferred height={360}><TestimonialsSection /></Deferred>
        <Deferred height={360}><LearningResourcesSection /></Deferred>
        <Deferred height={420}><LatestArticlesSection /></Deferred>
        <Deferred height={360}><NewsSection /></Deferred>
        <Deferred height={420}><FAQSection /></Deferred>
        <Deferred height={280}><CTASection /></Deferred>
      </div>
    </>
  );
};

export default Index;
