import React, { Suspense, useState, lazy, useEffect } from "react";
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
import { useAllSiteSettings } from "@/hooks/useSiteSettings";

// Eagerly load most-visited pages — no spinner
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import BlogPage from "./pages/BlogPage";
import CollegesPage from "./pages/CollegesPage";
import AuthPage from "./pages/AuthPage";
import InstitutePage from "./pages/InstitutePage";
import ComparePage from "./pages/ComparePage";
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const ExamDetailPage = lazy(() => import("./pages/ExamDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CollegeDetailPage = lazy(() => import("./pages/CollegeDetailPage"));
const CollegeFilterPage = lazy(() => import("./pages/CollegeFilterPage"));
const ProfileAnalyzerPage = lazy(() => import("./pages/ProfileAnalyzerPage"));
const CollegeFinderPage = lazy(() => import("./pages/CollegeFinderPage"));
const CollegeShortlisterPage = lazy(() => import("./pages/CollegeShortlisterPage"));
const BusinessInquiryPage = lazy(() => import("./pages/BusinessInquiryPage"));
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
const AdminAllLeads = lazy(() => import("./pages/admin/AdminAllLeads"));
const AdminBusinessInquiries = lazy(() => import("./pages/admin/AdminBusinessInquiries"));
const AdminShortlisterColleges = lazy(() => import("./pages/admin/AdminShortlisterColleges"));
const AdminCallbacks = lazy(() => import("./pages/admin/AdminCallbacks"));
const AdminDatabaseBackup = lazy(() => import("./pages/admin/AdminDatabaseBackup"));
const AdminAIUsage = lazy(() => import("./pages/admin/AdminAIUsage"));

// Lazy load heavy popups
const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));
const ProfileAnalyzerPopup = lazy(() => import("@/components/ProfileAnalyzerPopup"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Minimal fallback — invisible so no flash
const PageLoader = () => (
  <div className="min-h-[40vh]" />
);

// Prefetch all site settings in one batch on app mount
const SettingsPrefetcher = () => {
  useAllSiteSettings();
  return null;
};

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    <BackButton />
    {children}
    <Footer />
    <Suspense fallback={null}>
      <ProfileAnalyzerPopup />
    </Suspense>
  </>
);

// Wrap only lazy pages in Suspense
const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
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
      <SettingsPrefetcher />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <OAuthRedirectHandler />
          <OnboardingGate />
          <Routes>
            <Route path="/admin" element={<LazyPage><AdminLayout /></LazyPage>}>
              <Route index element={<LazyPage><AdminDashboard /></LazyPage>} />
              <Route path="institutes" element={<LazyPage><AdminInstitutes /></LazyPage>} />
              <Route path="articles" element={<LazyPage><AdminArticles /></LazyPage>} />
              <Route path="banners" element={<LazyPage><AdminBanners /></LazyPage>} />
              <Route path="inquiries" element={<LazyPage><AdminInquiries /></LazyPage>} />
              <Route path="courses" element={<LazyPage><AdminCourses /></LazyPage>} />
              <Route path="colleges" element={<LazyPage><AdminColleges /></LazyPage>} />
              <Route path="subscribers" element={<LazyPage><AdminSubscribers /></LazyPage>} />
              <Route path="exams" element={<LazyPage><AdminExams /></LazyPage>} />
              <Route path="categories" element={<LazyPage><AdminCategories /></LazyPage>} />
              <Route path="site-settings" element={<LazyPage><AdminSiteSettings /></LazyPage>} />
              <Route path="testimonials" element={<LazyPage><AdminTestimonials /></LazyPage>} />
              <Route path="coupons" element={<LazyPage><AdminCoupons /></LazyPage>} />
              <Route path="coaching-of-week" element={<LazyPage><AdminCoachingOfWeek /></LazyPage>} />
              <Route path="college-sections" element={<LazyPage><AdminCollegeSections /></LazyPage>} />
              <Route path="institute-results" element={<LazyPage><AdminInstituteResults /></LazyPage>} />
              <Route path="sitemap" element={<LazyPage><AdminSitemap /></LazyPage>} />
              <Route path="clear-cache" element={<LazyPage><AdminClearCache /></LazyPage>} />
              <Route path="leads" element={<LazyPage><AdminLeads /></LazyPage>} />
              <Route path="city-pages" element={<LazyPage><AdminCityPages /></LazyPage>} />
              <Route path="all-links" element={<LazyPage><AdminAllLinks /></LazyPage>} />
              <Route path="comparisons" element={<LazyPage><AdminComparisons /></LazyPage>} />
              <Route path="coaching-results" element={<LazyPage><AdminCoachingResults /></LazyPage>} />
              <Route path="seo-dashboard" element={<LazyPage><AdminSEODashboard /></LazyPage>} />
              <Route path="profile-analyzer" element={<LazyPage><AdminProfileAnalyzer /></LazyPage>} />
              <Route path="manage-admins" element={<LazyPage><AdminManageAdmins /></LazyPage>} />
              <Route path="static-seo" element={<LazyPage><AdminStaticPageSEO /></LazyPage>} />
              <Route path="all-leads-unified" element={<LazyPage><AdminAllLeads /></LazyPage>} />
              <Route path="business-inquiries" element={<LazyPage><AdminBusinessInquiries /></LazyPage>} />
              <Route path="shortlister-colleges" element={<LazyPage><AdminShortlisterColleges /></LazyPage>} />
              <Route path="callbacks" element={<LazyPage><AdminCallbacks /></LazyPage>} />
              <Route path="database-backup" element={<LazyPage><AdminDatabaseBackup /></LazyPage>} />
              <Route path="ai-usage" element={<LazyPage><AdminAIUsage /></LazyPage>} />
            </Route>

            {/* Eagerly loaded — no spinner */}
            <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
            <Route path="/category/:slug" element={<PublicLayout><CategoryPage /></PublicLayout>} />
            <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
            <Route path="/colleges" element={<PublicLayout><CollegesPage /></PublicLayout>} />
            <Route path="/auth" element={<PublicLayout><AuthPage /></PublicLayout>} />

            {/* Lazy loaded — invisible fallback */}
            <Route path="/institute/:slug" element={<PublicLayout><InstitutePage /></PublicLayout>} />
            <Route path="/compare" element={<PublicLayout><ComparePage /></PublicLayout>} />
            <Route path="/article/:slug" element={<PublicLayout><LazyPage><ArticlePage /></LazyPage></PublicLayout>} />
            <Route path="/college/:slug" element={<PublicLayout><LazyPage><CollegeDetailPage /></LazyPage></PublicLayout>} />
            <Route path="/colleges/:region" element={<PublicLayout><LazyPage><CollegeFilterPage /></LazyPage></PublicLayout>} />
            <Route path="/exam/:slug" element={<PublicLayout><LazyPage><ExamDetailPage /></LazyPage></PublicLayout>} />
            <Route path="/dashboard" element={<PublicLayout><LazyPage><DashboardPage /></LazyPage></PublicLayout>} />
            <Route path="/profile-analyzer" element={<PublicLayout><LazyPage><ProfileAnalyzerPage /></LazyPage></PublicLayout>} />
            <Route path="/college-finder" element={<PublicLayout><LazyPage><CollegeFinderPage /></LazyPage></PublicLayout>} />
            <Route path="/college-shortlister" element={<PublicLayout><LazyPage><CollegeShortlisterPage /></LazyPage></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><LazyPage><AboutPage /></LazyPage></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><LazyPage><ContactPage /></LazyPage></PublicLayout>} />
            <Route path="/business-inquiries" element={<PublicLayout><LazyPage><BusinessInquiryPage /></LazyPage></PublicLayout>} />
            <Route path="*" element={<PublicLayout><LazyPage><NotFound /></LazyPage></PublicLayout>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
