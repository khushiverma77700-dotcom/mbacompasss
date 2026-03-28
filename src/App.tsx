import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BackButton from "@/components/BackButton";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import InstitutePage from "./pages/InstitutePage";
import ComparePage from "./pages/ComparePage";
import BlogPage from "./pages/BlogPage";
import ArticlePage from "./pages/ArticlePage";
import CollegesPage from "./pages/CollegesPage";
import ExamDetailPage from "./pages/ExamDetailPage";
import AuthPage from "./pages/AuthPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminInstitutes from "./pages/admin/AdminInstitutes";
import AdminArticles from "./pages/admin/AdminArticles";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminColleges from "./pages/admin/AdminColleges";
import AdminSubscribers from "./pages/admin/AdminSubscribers";
import AdminExams from "./pages/admin/AdminExams";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";
import AdminTestimonials from "./pages/admin/AdminTestimonials";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminCoachingOfWeek from "./pages/admin/AdminCoachingOfWeek";
import AdminCollegeSections from "./pages/admin/AdminCollegeSections";
import AdminInstituteResults from "./pages/admin/AdminInstituteResults";
import AdminSitemap from "./pages/admin/AdminSitemap";
import DashboardPage from "./pages/DashboardPage";
import CollegeDetailPage from "./pages/CollegeDetailPage";
import CollegeFilterPage from "./pages/CollegeFilterPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    <BackButton />
    {children}
    <Footer />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="institutes" element={<AdminInstitutes />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="inquiries" element={<AdminInquiries />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="colleges" element={<AdminColleges />} />
              <Route path="subscribers" element={<AdminSubscribers />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="site-settings" element={<AdminSiteSettings />} />
              <Route path="testimonials" element={<AdminTestimonials />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="coaching-of-week" element={<AdminCoachingOfWeek />} />
              <Route path="college-sections" element={<AdminCollegeSections />} />
              <Route path="institute-results" element={<AdminInstituteResults />} />
              <Route path="sitemap" element={<AdminSitemap />} />
            </Route>
            <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
            <Route path="/category/:slug" element={<PublicLayout><CategoryPage /></PublicLayout>} />
            <Route path="/institute/:slug" element={<PublicLayout><InstitutePage /></PublicLayout>} />
            <Route path="/compare" element={<PublicLayout><ComparePage /></PublicLayout>} />
            <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
            <Route path="/article/:id" element={<PublicLayout><ArticlePage /></PublicLayout>} />
            <Route path="/colleges" element={<PublicLayout><CollegesPage /></PublicLayout>} />
            <Route path="/college/:slug" element={<PublicLayout><CollegeDetailPage /></PublicLayout>} />
            <Route path="/colleges/:region" element={<PublicLayout><CollegeFilterPage /></PublicLayout>} />
            <Route path="/exam/:slug" element={<PublicLayout><ExamDetailPage /></PublicLayout>} />
            <Route path="/auth" element={<PublicLayout><AuthPage /></PublicLayout>} />
            <Route path="/dashboard" element={<PublicLayout><DashboardPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
