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

const Index = () => {
  return (
    <>
      <AnnouncementBanner />
      <HeroSection />
      <ExamCategoriesBar />
      <BannerSlider />
      <OfferBanners />
      <CoachingOfWeekSection />
      <CategoryCards />
      <FeaturedInstitutes />
      <MBACollegesSection />
      <TopCitiesSection />
      <PopularExamsSection />
      <CollegeTestimonialsSection />
      <TestimonialsSection />
      <WhyChooseUs />
      <NewsSection />
    </>
  );
};

export default Index;
