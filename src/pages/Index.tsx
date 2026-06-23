import { lazy, Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import SEOHead, {
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
} from "@/components/SEOHead";
import { LazyMount } from "@/hooks/useInView";

// Homepage is intentionally minimal: 5 sections only, no scroll/entrance
// animations, no intersection-observer mounting. Sections render immediately
// after Hero so the page feels static and complete on first paint.
//   1. Hero
//   2. Top Colleges Strip
//   3. Key Features (Why Choose Us)
//   4. How It Works
//   5. CTA
// Heavier marketing sections (testimonials, stats, blog preview, etc.)
// have been moved to inner pages to keep the homepage light.
const TopRankedCollegesSection = lazy(() => import("@/components/TopRankedCollegesSection"));
const WhyChooseUs = lazy(() => import("@/components/WhyChooseUs"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const StatsCounterSection = lazy(() => import("@/components/StatsCounterSection"));
const AICoachingFinder = lazy(() => import("@/components/AICoachingFinder"));
const ExamDeadlinesTicker = lazy(() => import("@/components/ExamDeadlinesTicker"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const LatestArticlesSection = lazy(() => import("@/components/LatestArticlesSection"));
const PopularExamsSection = lazy(() => import("@/components/PopularExamsSection"));
const CategoryCards = lazy(() => import("@/components/CategoryCards"));
const TopCitiesSection = lazy(() => import("@/components/TopCitiesSection"));
const TopExamComparisonSection = lazy(() => import("@/components/TopExamComparisonSection"));
const SuccessStoriesSection = lazy(() => import("@/components/SuccessStoriesSection"));
const LearningResourcesSection = lazy(() => import("@/components/LearningResourcesSection"));
const NewsSection = lazy(() => import("@/components/NewsSection"));
const FAQSection = lazy(() => import("@/components/FAQSection"));

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

const SectionFallback = ({ height = 320 }: { height?: number }) => (
  <div
    style={{ minHeight: height }}
    className="container mx-auto px-4 py-8"
    aria-hidden="true"
  >
    <div className="h-6 w-48 rounded bg-muted/40 animate-pulse mb-4" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 rounded-xl bg-muted/30 animate-pulse" />
      ))}
    </div>
  </div>
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
        <Suspense fallback={<SectionFallback height={80} />}>
          <ExamDeadlinesTicker />
        </Suspense>

        {/* 3. Top Colleges Strip — eager, primary content */}
        <Suspense fallback={<SectionFallback height={520} />}>
          <TopRankedCollegesSection />
        </Suspense>

        {/* Everything below mounts only when scrolled near viewport */}
        <LazyMount minHeight={200} fallback={<SectionFallback height={200} />}>
          <StatsCounterSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionFallback height={360} />}>
          <PopularExamsSection />
        </LazyMount>

        <LazyMount minHeight={320} fallback={<SectionFallback height={320} />}>
          <CategoryCards />
        </LazyMount>

        <LazyMount minHeight={320} fallback={<SectionFallback height={320} />}>
          <TopCitiesSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionFallback height={420} />}>
          <TopExamComparisonSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionFallback height={420} />}>
          <WhyChooseUs />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionFallback height={420} />}>
          <AICoachingFinder />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionFallback height={360} />}>
          <HowItWorksSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionFallback height={420} />}>
          <SuccessStoriesSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionFallback height={360} />}>
          <TestimonialsSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionFallback height={360} />}>
          <LearningResourcesSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionFallback height={420} />}>
          <LatestArticlesSection />
        </LazyMount>

        <LazyMount minHeight={360} fallback={<SectionFallback height={360} />}>
          <NewsSection />
        </LazyMount>

        <LazyMount minHeight={420} fallback={<SectionFallback height={420} />}>
          <FAQSection />
        </LazyMount>

        <LazyMount minHeight={280} fallback={<SectionFallback height={280} />}>
          <CTASection />
        </LazyMount>
      </div>
    </>
  );
};

export default Index;
