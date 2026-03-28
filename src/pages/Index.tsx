import HeroSection from "@/components/HeroSection";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import BannerSlider from "@/components/BannerSlider";
import ExamCategoriesBar from "@/components/ExamCategoriesBar";
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

const Index = () => {
  return (
    <>
      <AnnouncementBanner />
      <HeroSection />
      <ExamCategoriesBar />
      <StatsCounterSection />
      <BannerSlider />
      <OfferBanners />
      <CoachingOfWeekSection />
      <HowItWorksSection />
      <CategoryCards />
      <FeaturedInstitutes />
      <MBACollegesSection />
      <TopCitiesSection />
      <PopularExamsSection />
      <TopExamComparisonSection />
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
