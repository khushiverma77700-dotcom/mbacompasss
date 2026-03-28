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

const Index = () => {
  return (
    <>
      <AnnouncementBanner />
      <HeroSection />
      <ExamCategoriesBar />
      <BannerSlider />
      <OfferBanners />
      <CategoryCards />
      <FeaturedInstitutes />
      <MBACollegesSection />
      <WhyChooseUs />
      <NewsSection />
    </>
  );
};

export default Index;
