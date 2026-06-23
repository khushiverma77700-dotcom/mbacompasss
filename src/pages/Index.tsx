import HeroSection from "@/components/HeroSection";
import SEOHead, {
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
} from "@/components/SEOHead";
import { LazyMount } from "@/hooks/useInView";

// All homepage sections are bundled into the Index chunk (no per-section lazy
// imports) so that scrolling never triggers additional network fetches — the
// page becomes "instant" once Index is loaded. LazyMount still defers the
// React render of below-the-fold sections to keep first paint cheap.
import TopRankedCollegesSection from "@/components/TopRankedCollegesSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import HowItWorksSection from "@/components/HowItWorksSection";
import CTASection from "@/components/CTASection";
import StatsCounterSection from "@/components/StatsCounterSection";
import AICoachingFinder from "@/components/AICoachingFinder";
import ExamDeadlinesTicker from "@/components/ExamDeadlinesTicker";
import TestimonialsSection from "@/components/TestimonialsSection";
import LatestArticlesSection from "@/components/LatestArticlesSection";
import PopularExamsSection from "@/components/PopularExamsSection";
import CategoryCards from "@/components/CategoryCards";
import TopCitiesSection from "@/components/TopCitiesSection";
import TopExamComparisonSection from "@/components/TopExamComparisonSection";
import SuccessStoriesSection from "@/components/SuccessStoriesSection";
import LearningResourcesSection from "@/components/LearningResourcesSection";
import NewsSection from "@/components/NewsSection";
import FAQSection from "@/components/FAQSection";

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
        {/* 1. Hero — eager (above-the-fold) */}
        <HeroSection />

        {/* 2. Exam Deadlines Ticker — eager, lightweight, near top */}
        <ExamDeadlinesTicker />

        {/* 3. Top Colleges Strip — eager, primary content */}
        <TopRankedCollegesSection />

        {/* Everything below renders only when scrolled near viewport.
            All section code is bundled with Index — no extra network fetches
            occur on scroll, so the page feels instant once loaded. */}
        <LazyMount minHeight={200} fallback={<SectionPlaceholder height={200} />}>
          <StatsCounterSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionPlaceholder height={360} />}>
          <PopularExamsSection />
        </LazyMount>

        <LazyMount minHeight={320} fallback={<SectionPlaceholder height={320} />}>
          <CategoryCards />
        </LazyMount>

        <LazyMount minHeight={320} fallback={<SectionPlaceholder height={320} />}>
          <TopCitiesSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionPlaceholder height={420} />}>
          <TopExamComparisonSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionPlaceholder height={420} />}>
          <WhyChooseUs />
        </LazyMount>

        <LazyMount minHeight={160} fallback={<SectionPlaceholder height={160} />}>
          <AICoachingFinder />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionPlaceholder height={360} />}>
          <HowItWorksSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionPlaceholder height={420} />}>
          <SuccessStoriesSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionPlaceholder height={360} />}>
          <TestimonialsSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionPlaceholder height={360} />}>
          <LearningResourcesSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionPlaceholder height={420} />}>
          <LatestArticlesSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionPlaceholder height={360} />}>
          <NewsSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionPlaceholder height={420} />}>
          <FAQSection />
        </LazyMount>

        <LazyMount minHeight={280} fallback={<SectionPlaceholder height={280} />}>
          <CTASection />
        </LazyMount>
      </div>
    </>
  );
};

export default Index;
