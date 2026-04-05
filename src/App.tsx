import React, { Suspense, useState, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BackButton from "@/components/BackButton";
import { consumePostAuthRedirect } from "@/lib/authRedirect";
import { supabase } from "@/integrations/supabase/client";

// Lazy-loaded public pages
const Index = lazy(() => import("./pages/Index"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const InstitutePage = lazy(() => import("./pages/InstitutePage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const CollegesPage = lazy(() => import("./pages/CollegesPage"));
const ExamDetailPage = lazy(() => import("./pages/ExamDetailPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CollegeDetailPage = lazy(() => import("./pages/CollegeDetailPage"));
const CollegeFilterPage = lazy(() => import("./pages/CollegeFilterPage"));
const ProfileAnalyzerPage = lazy(() => import("./pages/ProfileAnalyzerPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy-loaded admin pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminInstitutes = lazy(() => import("./pages/admin/AdminInstitutes"));
const AdminArticles = lazy(() => import("./pages/admin/AdminArticles"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminInquiries = lazy(() => import("./pages/admin/AdminInquiries"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminColleges = lazy(() => import("./pages/admin/AdminColleges"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers"));
const AdminExams = lazy(() => import("./pages/admin/AdminExams"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminSiteSettings = lazy(() => import("./pages/admin/AdminSiteSettings"));
const AdminTestimonials = lazy(() => import("./pages/admin/AdminTestimonials"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminCoachingOfWeek = lazy(() => import("./pages/admin/AdminCoachingOfWeek"));
const AdminCollegeSections = lazy(() => import("./pages/admin/AdminCollegeSections"));
const AdminInstituteResults = lazy(() => import("./pages/admin/AdminInstituteResults"));
const AdminSitemap = lazy(() => import("./pages/admin/AdminSitemap"));
const AdminClearCache = lazy(() => import("./pages/admin/AdminClearCache"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminCityPages = lazy(() => import("./pages/admin/AdminCityPages"));
const AdminAllLinks = lazy(() => import("./pages/admin/AdminAllLinks"));
const AdminComparisons = lazy(() => import("./pages/admin/AdminComparisons"));
const AdminCoachingResults = lazy(() => import("./pages/admin/AdminCoachingResults"));
const AdminSEODashboard = lazy(() => import("./pages/admin/AdminSEODashboard"));
const AdminProfileAnalyzer = lazy(() => import("./pages/admin/AdminProfileAnalyzer"));
const AdminManageAdmins = lazy(() => import("./pages/admin/AdminManageAdmins"));
const AdminStaticPageSEO = lazy(() => import("./pages/admin/AdminStaticPageSEO"));

// Lazy load heavy popups
const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));
const ProfileAnalyzerPopup = lazy(() => import("@/components/ProfileAnalyzerPopup"));

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    <BackButton />
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
    <Footer />
    <Suspense fallback={null}>
      <ProfileAnalyzerPopup />
    </Suspense>
  </>
);

const OnboardingGate = () => {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  React.useEffect(() => {
    if (loading || !user || checked) return;

    const checkOnboarding = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !(data as any).onboarding_completed) {
        setShowOnboarding(true);
      }
      setChecked(true);
    };

    checkOnboarding();
  }, [loading, user, checked]);

  if (!showOnboarding || !user) return null;

  return (
    <Suspense fallback={null}>
      <OnboardingDialog
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        userId={user.id}
      />
    </Suspense>
  );
};

const OAuthRedirectHandler = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (loading || !user) return;

    const pendingPath = consumePostAuthRedirect();
    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    if (pendingPath && pendingPath !== currentPath) {
      navigate(pendingPath, { replace: true });
    }
  }, [loading, user, location.pathname, location.search, location.hash, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <OAuthRedirectHandler />
          <OnboardingGate />
          <Routes>
            <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>}>
              <Route index element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
              <Route path="institutes" element={<Suspense fallback={<PageLoader />}><AdminInstitutes /></Suspense>} />
              <Route path="articles" element={<Suspense fallback={<PageLoader />}><AdminArticles /></Suspense>} />
              <Route path="banners" element={<Suspense fallback={<PageLoader />}><AdminBanners /></Suspense>} />
              <Route path="inquiries" element={<Suspense fallback={<PageLoader />}><AdminInquiries /></Suspense>} />
              <Route path="courses" element={<Suspense fallback={<PageLoader />}><AdminCourses /></Suspense>} />
              <Route path="colleges" element={<Suspense fallback={<PageLoader />}><AdminColleges /></Suspense>} />
              <Route path="subscribers" element={<Suspense fallback={<PageLoader />}><AdminSubscribers /></Suspense>} />
              <Route path="exams" element={<Suspense fallback={<PageLoader />}><AdminExams /></Suspense>} />
              <Route path="categories" element={<Suspense fallback={<PageLoader />}><AdminCategories /></Suspense>} />
              <Route path="site-settings" element={<Suspense fallback={<PageLoader />}><AdminSiteSettings /></Suspense>} />
              <Route path="testimonials" element={<Suspense fallback={<PageLoader />}><AdminTestimonials /></Suspense>} />
              <Route path="coupons" element={<Suspense fallback={<PageLoader />}><AdminCoupons /></Suspense>} />
              <Route path="coaching-of-week" element={<Suspense fallback={<PageLoader />}><AdminCoachingOfWeek /></Suspense>} />
              <Route path="college-sections" element={<Suspense fallback={<PageLoader />}><AdminCollegeSections /></Suspense>} />
              <Route path="institute-results" element={<Suspense fallback={<PageLoader />}><AdminInstituteResults /></Suspense>} />
              <Route path="sitemap" element={<Suspense fallback={<PageLoader />}><AdminSitemap /></Suspense>} />
              <Route path="clear-cache" element={<Suspense fallback={<PageLoader />}><AdminClearCache /></Suspense>} />
              <Route path="leads" element={<Suspense fallback={<PageLoader />}><AdminLeads /></Suspense>} />
              <Route path="city-pages" element={<Suspense fallback={<PageLoader />}><AdminCityPages /></Suspense>} />
              <Route path="all-links" element={<Suspense fallback={<PageLoader />}><AdminAllLinks /></Suspense>} />
              <Route path="comparisons" element={<Suspense fallback={<PageLoader />}><AdminComparisons /></Suspense>} />
              <Route path="coaching-results" element={<Suspense fallback={<PageLoader />}><AdminCoachingResults /></Suspense>} />
              <Route path="seo-dashboard" element={<Suspense fallback={<PageLoader />}><AdminSEODashboard /></Suspense>} />
              <Route path="profile-analyzer" element={<Suspense fallback={<PageLoader />}><AdminProfileAnalyzer /></Suspense>} />
              <Route path="manage-admins" element={<Suspense fallback={<PageLoader />}><AdminManageAdmins /></Suspense>} />
              <Route path="static-seo" element={<Suspense fallback={<PageLoader />}><AdminStaticPageSEO /></Suspense>} />
            </Route>
            <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
            <Route path="/category/:slug" element={<PublicLayout><CategoryPage /></PublicLayout>} />
            <Route path="/institute/:slug" element={<PublicLayout><InstitutePage /></PublicLayout>} />
            <Route path="/compare" element={<PublicLayout><ComparePage /></PublicLayout>} />
            <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
            <Route path="/article/:slug" element={<PublicLayout><ArticlePage /></PublicLayout>} />
            <Route path="/colleges" element={<PublicLayout><CollegesPage /></PublicLayout>} />
            <Route path="/college/:slug" element={<PublicLayout><CollegeDetailPage /></PublicLayout>} />
            <Route path="/colleges/:region" element={<PublicLayout><CollegeFilterPage /></PublicLayout>} />
            <Route path="/exam/:slug" element={<PublicLayout><ExamDetailPage /></PublicLayout>} />
            <Route path="/auth" element={<PublicLayout><AuthPage /></PublicLayout>} />
            <Route path="/dashboard" element={<PublicLayout><DashboardPage /></PublicLayout>} />
            <Route path="/profile-analyzer" element={<PublicLayout><ProfileAnalyzerPage /></PublicLayout>} />
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
