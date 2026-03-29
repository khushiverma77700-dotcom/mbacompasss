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
import SEOHead, { generateWebsiteSchema, generateOrganizationSchema } from "@/components/SEOHead";

const Index = () => {
  return (
    <>
      <SEOHead
        title="Best MBA Coaching — Find & Compare Top MBA Coaching Institutes in India"
        description="India's #1 platform to find, compare & review the best MBA coaching institutes for CAT, GMAT, XAT, SNAP & GRE preparation. Compare fees, success rates, faculty & student reviews."
        keywords={["best MBA coaching", "MBA coaching institutes India", "CAT coaching", "GMAT preparation", "XAT coaching", "MBA entrance exam coaching", "IIM preparation coaching", "best CAT coaching", "MBA coaching fees comparison", "top MBA coaching centres"]}
        canonical="https://bestmbacoaching.com"
        ogType="website"
        jsonLd={[generateWebsiteSchema(), generateOrganizationSchema()]}
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
