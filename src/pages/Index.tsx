import { lazy, Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import SEOHead, {
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
} from "@/components/SEOHead";
import { LazyMount } from "@/hooks/useInView";
import BackToTop from "@/components/BackToTop";
import JumpToMenu from "@/components/JumpToMenu";

// Everything below the hero is code-split + mount-on-scroll so the initial
// bundle stays tiny. Blank-screen on slow networks was caused by too much
// eager code (framer-motion, react-query fetches) in the first paint.
const HomeQuickAccessStrip = lazy(() => import("@/components/HomeQuickAccessStrip"));
const MBANewsBar = lazy(() => import("@/components/MBANewsBar"));
const ExamDeadlinesTicker = lazy(() => import("@/components/ExamDeadlinesTicker"));
const TopRankedCollegesSection = lazy(() => import("@/components/TopRankedCollegesSection"));
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
const FAQSection = lazy(() => import("@/components/FAQSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const MBALandscapeSection = lazy(() => import("@/components/MBALandscapeSection"));
const ExamCutoffsTable = lazy(() => import("@/components/ExamCutoffsTable"));
const PlacementsBySectorSection = lazy(() => import("@/components/PlacementsBySectorSection"));
const MBAJourneyStrip = lazy(() => import("@/components/MBAJourneyStrip"));
const FreeToolsShowcase = lazy(() => import("@/components/FreeToolsShowcase"));
const ROIComparisonTable = lazy(() => import("@/components/ROIComparisonTable"));
const FreebiesPreview = lazy(() => import("@/components/FreebiesPreview"));
const TopperWall = lazy(() => import("@/components/TopperWall"));

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

/**
 * Skeleton placeholder for deferred homepage sections.
 * Renders a shimmer title + card grid sized by the section's reserved height,
 * so the page feels populated instantly instead of showing empty gaps while
 * data loads. Variant is chosen from height so we don't need to touch call sites.
 *   - height <= 60   → thin bar (news ticker)
 *   - height <= 240  → title + 2 lines (stats, small strips)
 *   - height <= 400  → title + 3-card row
 *   - height >  400  → title + card grid
 */
const SectionPlaceholder = ({ height = 320 }: { height?: number }) => {
  const shimmer = "bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite] rounded-md";

  let variant: "bar" | "small" | "row" | "grid" = "grid";
  if (height <= 60) variant = "bar";
  else if (height <= 240) variant = "small";
  else if (height <= 400) variant = "row";

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading section"
      style={{ minHeight: height }}
      className="w-full"
    >
      <span className="sr-only">Loading…</span>

      {variant === "bar" && (
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className={`${shimmer} h-6 w-full`} />
        </div>
      )}

      {variant === "small" && (
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
          <div className={`${shimmer} h-7 w-64 mx-auto`} />
          <div className={`${shimmer} h-4 w-96 max-w-full mx-auto`} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${shimmer} h-16`} />
            ))}
          </div>
        </div>
      )}

      {variant === "row" && (
        <div className="mx-auto max-w-7xl px-4 py-10 space-y-6">
          <div className="space-y-2">
            <div className={`${shimmer} h-8 w-72 max-w-full`} />
            <div className={`${shimmer} h-4 w-96 max-w-full`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                <div className={`${shimmer} h-32 w-full`} />
                <div className={`${shimmer} h-4 w-3/4`} />
                <div className={`${shimmer} h-3 w-1/2`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === "grid" && (
        <div className="mx-auto max-w-7xl px-4 py-12 space-y-6">
          <div className="space-y-2">
            <div className={`${shimmer} h-8 w-80 max-w-full`} />
            <div className={`${shimmer} h-4 w-full max-w-xl`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                <div className={`${shimmer} h-36 w-full`} />
                <div className={`${shimmer} h-4 w-4/5`} />
                <div className={`${shimmer} h-3 w-3/5`} />
                <div className="flex gap-2 pt-1">
                  <div className={`${shimmer} h-6 w-16`} />
                  <div className={`${shimmer} h-6 w-12`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Deferred = ({ height, rootMargin = "0px", id, children }: { height: number; rootMargin?: string; id?: string; children: React.ReactNode }) => (
  <LazyMount id={id} rootMargin={rootMargin} minHeight={height} fallback={<SectionPlaceholder height={height} />}>
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
        <Suspense fallback={<SectionPlaceholder height={180} />}>
          <HomeQuickAccessStrip />
        </Suspense>

        {/* Everything else: code-split + mount on scroll */}
        <Deferred height={44} rootMargin="120px"><MBANewsBar /></Deferred>
        <Deferred height={560} rootMargin="200px" id="home-tools"><FreeToolsShowcase /></Deferred>
        <Deferred height={320}><ExamDeadlinesTicker /></Deferred>
        <Deferred height={520}><TopRankedCollegesSection /></Deferred>


        {/* Below-the-fold: code-split + mount on scroll */}
        <Deferred height={200}><StatsCounterSection /></Deferred>
        <Deferred height={520}><MBALandscapeSection /></Deferred>
        <Deferred height={360}><PopularExamsSection /></Deferred>
        <Deferred height={640}><ExamCutoffsTable /></Deferred>
        <Deferred height={520}><ROIComparisonTable /></Deferred>
        <Deferred height={480}><MBAJourneyStrip /></Deferred>
        <Deferred height={520}><PlacementsBySectorSection /></Deferred>
        <Deferred height={320}><CategoryCards /></Deferred>
        <Deferred height={320} id="home-cities"><TopCitiesSection /></Deferred>
        <Deferred height={420} id="home-comparisons"><TopExamComparisonSection /></Deferred>
        <Deferred height={520}><TopperWall /></Deferred>
        <Deferred height={420}><WhyChooseUs /></Deferred>
        <Deferred height={160}><AICoachingFinder /></Deferred>
        <Deferred height={360}><HowItWorksSection /></Deferred>
        <Deferred height={420}><SuccessStoriesSection /></Deferred>
        <Deferred height={360}><TestimonialsSection /></Deferred>
        <Deferred height={480}><FreebiesPreview /></Deferred>
        <Deferred height={360}><LearningResourcesSection /></Deferred>
        <Deferred height={420} id="home-blog"><LatestArticlesSection /></Deferred>
        <Deferred height={360}><NewsSection /></Deferred>
        <Deferred height={420}><FAQSection /></Deferred>
        <Deferred height={280}><CTASection /></Deferred>
      </div>
      <JumpToMenu />
      <BackToTop />
    </>
  );
};

export default Index;
