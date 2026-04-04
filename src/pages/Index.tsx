import HeroSection from "@/components/HeroSection";
import CategoryCards from "@/components/CategoryCards";
import FeaturedInstitutes from "@/components/FeaturedInstitutes";
import MBACollegesSection from "@/components/MBACollegesSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import NewsSection from "@/components/NewsSection";
import OfferBanners from "@/components/OfferBanners";
import TestimonialsSection from "@/components/TestimonialsSection";
import CoachingOfWeekSection from "@/components/CoachingOfWeekSection";
import CollegeTestimonialsSection from "@/components/CollegeTestimonialsSection";
import TopCitiesSection from "@/components/TopCitiesSection";
import PopularExamsSection from "@/components/PopularExamsSection";
import StatsCounterSection from "@/components/StatsCounterSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TopExamComparisonSection from "@/components/TopExamComparisonSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import TopRankedCollegesSection from "@/components/TopRankedCollegesSection";
import ExamDeadlinesTicker from "@/components/ExamDeadlinesTicker";
import SuccessStoriesSection from "@/components/SuccessStoriesSection";
import LearningResourcesSection from "@/components/LearningResourcesSection";
import TopCollegeSpotlight from "@/components/TopCollegeSpotlight";
import LatestArticlesSection from "@/components/LatestArticlesSection";
import BrowseByCitySection from "@/components/BrowseByCitySection";
import SEOHead, { generateWebsiteSchema, generateOrganizationSchema, generateFAQSchema, generateBreadcrumbSchema } from "@/components/SEOHead";

const homepageFAQs = [
  { q: "What is the best MBA coaching in India?", a: "The best MBA coaching depends on your target exam. For CAT, top choices include IMS, TIME, and Career Launcher. Compare fees, success rates, and student reviews on BestMBACoaching.com." },
  { q: "How much does MBA coaching cost in India?", a: "MBA coaching fees range from ₹15,000 to ₹1,50,000 depending on the institute, course duration, and mode (online/offline). Use our comparison tool to find the best value." },
  { q: "Which coaching is best for CAT preparation?", a: "Top CAT coaching institutes include IMS Learning Resources, TIME Institute, Career Launcher, and Unacademy. Each has unique strengths — compare them side-by-side on our platform." },
  { q: "Can I prepare for MBA entrance exams online?", a: "Yes! Many top coaching institutes now offer online MBA preparation courses with live classes, recorded lectures, mock tests, and personalized mentoring." },
  { q: "When should I start preparing for CAT exam?", a: "Ideally, start CAT preparation 8-12 months before the exam. CAT usually happens in November-December, so beginning in January-February gives adequate time." },
  { q: "What are the top MBA colleges in India?", a: "Top MBA colleges include IIM Ahmedabad, IIM Bangalore, IIM Calcutta, XLRI Jamshedpur, FMS Delhi, ISB Hyderabad, and MDI Gurgaon. Browse our rankings for the complete list." },
];

const Index = () => {
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
        title="Best MBA Coaching 2025 — Compare Top MBA Coaching Institutes India"
        description="India's #1 platform to find, compare & review the best MBA coaching institutes for CAT, GMAT, XAT, SNAP & GRE. Compare fees, success rates, faculty & 10,000+ student reviews. Updated daily."
        keywords={[
          "best MBA coaching", "MBA coaching institutes India", "CAT coaching", "GMAT preparation",
          "XAT coaching", "MBA entrance exam coaching", "IIM preparation coaching", "best CAT coaching",
          "MBA coaching fees comparison", "top MBA coaching centres", "MBA coaching near me",
          "online MBA coaching", "CAT preparation 2025", "MBA coaching reviews", "top 10 MBA coaching India",
          "CAT coaching fees", "GMAT coaching India", "MBA entrance exam preparation",
          "best coaching for IIM", "MBA coaching online classes",
        ]}
        canonical="https://bestmbacoaching.com"
        ogType="website"
        ogTitle="Best MBA Coaching 2025 — India's #1 Coaching Comparison Platform"
        ogDescription="Compare 500+ MBA coaching institutes. Find the best CAT, GMAT, XAT coaching near you with verified reviews and success rates."
        twitterTitle="Best MBA Coaching India 2025 | Compare Top Institutes"
        twitterDescription="India's most trusted MBA coaching comparison. Compare fees, reviews, success rates of 500+ institutes."
        jsonLd={jsonLdSchemas}
      />
      <HeroSection />
      <StatsCounterSection />
      <OfferBanners />
      <CoachingOfWeekSection />
      <ExamDeadlinesTicker />
      <HowItWorksSection />
      <CategoryCards />
      <FeaturedInstitutes />
      <TopCollegeSpotlight />
      <TopRankedCollegesSection />
      <MBACollegesSection />
      <BrowseByCitySection />
      <LearningResourcesSection />
      <TopCitiesSection />
      <PopularExamsSection />
      <TopExamComparisonSection />
      <LatestArticlesSection />
      <SuccessStoriesSection />
      <CollegeTestimonialsSection />
      <TestimonialsSection />
      <WhyChooseUs />
      <FAQSection />
      <NewsSection />
      <CTASection />
    </>
  );
};

export default Index;
