import HeroSection from "@/components/HeroSection";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CategoryCards from "@/components/CategoryCards";
import FeaturedInstitutes from "@/components/FeaturedInstitutes";
import WhyChooseUs from "@/components/WhyChooseUs";
import NewsSection from "@/components/NewsSection";

const Index = () => {
  return (
    <>
      <AnnouncementBanner />
      <HeroSection />
      <CategoryCards />
      <FeaturedInstitutes />
      <WhyChooseUs />
      <NewsSection />
    </>
  );
};

export default Index;
