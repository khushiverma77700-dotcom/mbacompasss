import React, { Suspense, useState, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, matchPath, useLocation, useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ScrollToTop from "@/components/ScrollToTop";
import BackButton from "@/components/BackButton";
import { consumePostAuthRedirect } from "@/lib/authRedirect";
import { supabase } from "@/integrations/supabase/client";
import { useAllSiteSettings } from "@/hooks/useSiteSettings";

type LazyWithPreload<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

const lazyWithPreload = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyWithPreload<T> => {
  const Component = lazy(factory) as LazyWithPreload<T>;
  Component.preload = factory;
  return Component;
};

// Lazy below-the-fold + interaction-only chrome (keep out of initial bundle)
const Footer = lazyWithPreload(() => import("@/components/Footer"));
const Toaster = lazyWithPreload(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazyWithPreload(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

// Home eager so first paint is instant; everything else lazy to shrink initial bundle
import Index from "./pages/Index";
const CategoryPage = lazyWithPreload(() => import("./pages/CategoryPage"));
const BlogPage = lazyWithPreload(() => import("./pages/BlogPage"));
const CollegesPage = lazyWithPreload(() => import("./pages/CollegesPage"));
const CoachingPage = lazyWithPreload(() => import("./pages/CoachingPage"));
const AuthPage = lazyWithPreload(() => import("./pages/AuthPage"));
const InstitutePage = lazyWithPreload(() => import("./pages/InstitutePage"));
const ComparePage = lazyWithPreload(() => import("./pages/ComparePage"));
const ArticlePage = lazyWithPreload(() => import("./pages/ArticlePage"));
const ExamDetailPage = lazyWithPreload(() => import("./pages/ExamDetailPage"));
const AboutPage = lazyWithPreload(() => import("./pages/AboutPage"));
const ContactPage = lazyWithPreload(() => import("./pages/ContactPage"));
const DashboardPage = lazyWithPreload(() => import("./pages/DashboardPage"));
const CollegeDetailPage = lazyWithPreload(() => import("./pages/CollegeDetailPage"));
const CollegeFilterPage = lazyWithPreload(() => import("./pages/CollegeFilterPage"));
const CoachingFilterPage = lazyWithPreload(() => import("./pages/CoachingFilterPage"));
const ProfileAnalyzerPage = lazyWithPreload(() => import("./pages/ProfileAnalyzerPage"));
const SharedReportPage = lazyWithPreload(() => import("./pages/SharedReportPage"));
const CollegeFinderPage = lazyWithPreload(() => import("./pages/CollegeFinderPage"));
const CollegeShortlisterPage = lazyWithPreload(() => import("./pages/CollegeShortlisterPage"));
const BusinessInquiryPage = lazyWithPreload(() => import("./pages/BusinessInquiryPage"));
const NotFound = lazyWithPreload(() => import("./pages/NotFound"));

// Lazy-loaded admin pages
const AdminLayout = lazyWithPreload(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazyWithPreload(() => import("./pages/admin/AdminDashboard"));
const AdminInstitutes = lazyWithPreload(() => import("./pages/admin/AdminInstitutes"));
const AdminArticles = lazyWithPreload(() => import("./pages/admin/AdminArticles"));
const AdminBanners = lazyWithPreload(() => import("./pages/admin/AdminBanners"));
const AdminInquiries = lazyWithPreload(() => import("./pages/admin/AdminInquiries"));
const AdminCourses = lazyWithPreload(() => import("./pages/admin/AdminCourses"));
const AdminColleges = lazyWithPreload(() => import("./pages/admin/AdminColleges"));
const AdminSubscribers = lazyWithPreload(() => import("./pages/admin/AdminSubscribers"));
const AdminExams = lazyWithPreload(() => import("./pages/admin/AdminExams"));
const AdminCategories = lazyWithPreload(() => import("./pages/admin/AdminCategories"));
const AdminSiteSettings = lazyWithPreload(() => import("./pages/admin/AdminSiteSettings"));
const AdminTestimonials = lazyWithPreload(() => import("./pages/admin/AdminTestimonials"));
const AdminCoupons = lazyWithPreload(() => import("./pages/admin/AdminCoupons"));
const AdminCoachingOfWeek = lazyWithPreload(() => import("./pages/admin/AdminCoachingOfWeek"));
const AdminCollegeSections = lazyWithPreload(() => import("./pages/admin/AdminCollegeSections"));
const AdminInstituteResults = lazyWithPreload(() => import("./pages/admin/AdminInstituteResults"));
const AdminSitemap = lazyWithPreload(() => import("./pages/admin/AdminSitemap"));
const AdminClearCache = lazyWithPreload(() => import("./pages/admin/AdminClearCache"));
const AdminLeads = lazyWithPreload(() => import("./pages/admin/AdminLeads"));

const AdminAllLinks = lazyWithPreload(() => import("./pages/admin/AdminAllLinks"));
const AdminComparisons = lazyWithPreload(() => import("./pages/admin/AdminComparisons"));
const AdminCoachingResults = lazyWithPreload(() => import("./pages/admin/AdminCoachingResults"));
const AdminSEODashboard = lazyWithPreload(() => import("./pages/admin/AdminSEODashboard"));
const AdminProfileAnalyzer = lazyWithPreload(() => import("./pages/admin/AdminProfileAnalyzer"));
const AdminManageAdmins = lazyWithPreload(() => import("./pages/admin/AdminManageAdmins"));
const AdminStaticPageSEO = lazyWithPreload(() => import("./pages/admin/AdminStaticPageSEO"));
const AdminAllLeads = lazyWithPreload(() => import("./pages/admin/AdminAllLeads"));
const AdminBusinessInquiries = lazyWithPreload(() => import("./pages/admin/AdminBusinessInquiries"));
const AdminShortlisterColleges = lazyWithPreload(() => import("./pages/admin/AdminShortlisterColleges"));
const AdminCallbacks = lazyWithPreload(() => import("./pages/admin/AdminCallbacks"));
const AdminDatabaseBackup = lazyWithPreload(() => import("./pages/admin/AdminDatabaseBackup"));
const AdminAIUsage = lazyWithPreload(() => import("./pages/admin/AdminAIUsage"));
const AdminCitationsAudit = lazyWithPreload(() => import("./pages/admin/AdminCitationsAudit"));
const AdminContentRefreshes = lazyWithPreload(() => import("./pages/admin/AdminContentRefreshes"));
const AdminCourseCategories = lazyWithPreload(() => import("./pages/admin/AdminCourseCategories"));
const AdminCATScores = lazyWithPreload(() => import("./pages/admin/AdminCATScores"));
const AdminMegaMenu = lazyWithPreload(() => import("./pages/admin/AdminMegaMenu"));
const AdminGoogleIndexing = lazyWithPreload(() => import("./pages/admin/AdminGoogleIndexing"));
const AdminIndexingRequeue = lazyWithPreload(() => import("./pages/admin/AdminIndexingRequeue"));
const AdminSpecializations = lazyWithPreload(() => import("./pages/admin/AdminSpecializations"));
const AdminDomainAudit = lazyWithPreload(() => import("./pages/admin/AdminDomainAudit"));
const AdminMetaValidator = lazyWithPreload(() => import("./pages/admin/AdminMetaValidator"));
const AdminDNSStatus = lazyWithPreload(() => import("./pages/admin/AdminDNSStatus"));
const CATScoreCalculatorPage = lazyWithPreload(() => import("./pages/CATScoreCalculatorPage"));
const MBARoiCalculatorPage = lazyWithPreload(() => import("./pages/MBARoiCalculatorPage"));
const ForgotPasswordPage = lazyWithPreload(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyWithPreload(() => import("./pages/ResetPasswordPage"));
const AdminROIAnalyses = lazyWithPreload(() => import("./pages/admin/AdminROIAnalyses"));
const ListYourBusinessPage = lazyWithPreload(() => import("./pages/ListYourBusinessPage"));
const ListingPocPage = lazyWithPreload(() => import("./pages/ListingPocPage"));
const ListingFormPage = lazyWithPreload(() => import("./pages/ListingFormPage"));
const MyListingsPage = lazyWithPreload(() => import("./pages/MyListingsPage"));
const AdminUserSubmissions = lazyWithPreload(() => import("./pages/admin/AdminUserSubmissions"));
const AdminListingChangeRequests = lazyWithPreload(() => import("./pages/admin/AdminListingChangeRequests"));
const AdminWriteBlog = lazyWithPreload(() => import("./pages/admin/AdminWriteBlog"));
const AdminWriteCollege = lazyWithPreload(() => import("./pages/admin/AdminWriteCollege"));
const AdminWriteInstitute = lazyWithPreload(() => import("./pages/admin/AdminWriteInstitute"));
const AdminWriteCourses = lazyWithPreload(() => import("./pages/admin/AdminWriteCourses"));
const AdminWebsiteOptimizer = lazyWithPreload(() => import("./pages/admin/AdminWebsiteOptimizer"));

// Lazy load heavy popups
const OnboardingDialog = lazyWithPreload(() => import("@/components/OnboardingDialog"));
const ProfileAnalyzerPopup = lazyWithPreload(() => import("@/components/ProfileAnalyzerPopup"));

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
    {children}
    <Suspense fallback={null}>
      <Footer />
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
      <Suspense fallback={null}>
        <Toaster />
        <Sonner />
      </Suspense>
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
              <Route path="citations-audit" element={<LazyPage><AdminCitationsAudit /></LazyPage>} />
              <Route path="content-refreshes" element={<LazyPage><AdminContentRefreshes /></LazyPage>} />
              <Route path="course-categories" element={<LazyPage><AdminCourseCategories /></LazyPage>} />
              <Route path="cat-scores" element={<LazyPage><AdminCATScores /></LazyPage>} />
              <Route path="mega-menu" element={<LazyPage><AdminMegaMenu /></LazyPage>} />
              <Route path="google-indexing" element={<LazyPage><AdminGoogleIndexing /></LazyPage>} />
              <Route path="indexing-requeue" element={<LazyPage><AdminIndexingRequeue /></LazyPage>} />
              <Route path="specializations" element={<LazyPage><AdminSpecializations /></LazyPage>} />
              <Route path="domain-audit" element={<LazyPage><AdminDomainAudit /></LazyPage>} />
              <Route path="meta-validator" element={<LazyPage><AdminMetaValidator /></LazyPage>} />
              <Route path="dns-status" element={<LazyPage><AdminDNSStatus /></LazyPage>} />
              <Route path="roi-analyses" element={<LazyPage><AdminROIAnalyses /></LazyPage>} />
              <Route path="user-submissions" element={<LazyPage><AdminUserSubmissions /></LazyPage>} />
              <Route path="listing-change-requests" element={<LazyPage><AdminListingChangeRequests /></LazyPage>} />
              <Route path="seo/write-blog" element={<LazyPage><AdminWriteBlog /></LazyPage>} />
              <Route path="colleges/generate-ai" element={<LazyPage><AdminWriteCollege /></LazyPage>} />
              <Route path="institutes/generate-ai" element={<LazyPage><AdminWriteInstitute /></LazyPage>} />
              <Route path="courses/generate-ai" element={<LazyPage><AdminWriteCourses /></LazyPage>} />
              <Route path="website-optimizer" element={<LazyPage><AdminWebsiteOptimizer /></LazyPage>} />
            </Route>

            {/* Home eager; rest lazy with invisible fallback */}
            <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
            <Route path="/category/:slug" element={<PublicLayout><LazyPage><CategoryPage /></LazyPage></PublicLayout>} />
            <Route path="/blog" element={<PublicLayout><LazyPage><BlogPage /></LazyPage></PublicLayout>} />
            <Route path="/colleges" element={<PublicLayout><LazyPage><CollegesPage /></LazyPage></PublicLayout>} />
            <Route path="/coaching" element={<PublicLayout><LazyPage><CoachingPage /></LazyPage></PublicLayout>} />
            <Route path="/auth" element={<PublicLayout><LazyPage><AuthPage /></LazyPage></PublicLayout>} />
            <Route path="/institute/:slug" element={<PublicLayout><LazyPage><InstitutePage /></LazyPage></PublicLayout>} />
            <Route path="/compare" element={<PublicLayout><LazyPage><ComparePage /></LazyPage></PublicLayout>} />
            <Route path="/article/:slug" element={<PublicLayout><LazyPage><ArticlePage /></LazyPage></PublicLayout>} />
            <Route path="/college/:slug" element={<PublicLayout><LazyPage><CollegeDetailPage /></LazyPage></PublicLayout>} />
            <Route path="/colleges/:region" element={<PublicLayout><LazyPage><CollegeFilterPage /></LazyPage></PublicLayout>} />
            <Route path="/coaching/:region" element={<PublicLayout><LazyPage><CoachingFilterPage /></LazyPage></PublicLayout>} />
            <Route path="/exam/:slug" element={<PublicLayout><LazyPage><ExamDetailPage /></LazyPage></PublicLayout>} />
            <Route path="/dashboard" element={<PublicLayout><LazyPage><DashboardPage /></LazyPage></PublicLayout>} />
            <Route path="/profile-analyzer" element={<PublicLayout><LazyPage><ProfileAnalyzerPage /></LazyPage></PublicLayout>} />
            <Route path="/report/:id" element={<PublicLayout><LazyPage><SharedReportPage /></LazyPage></PublicLayout>} />
            <Route path="/college-finder" element={<PublicLayout><LazyPage><CollegeFinderPage /></LazyPage></PublicLayout>} />
            <Route path="/college-shortlister" element={<PublicLayout><LazyPage><CollegeShortlisterPage /></LazyPage></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><LazyPage><AboutPage /></LazyPage></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><LazyPage><ContactPage /></LazyPage></PublicLayout>} />
            <Route path="/cat-score-calculator" element={<PublicLayout><LazyPage><CATScoreCalculatorPage /></LazyPage></PublicLayout>} />
            <Route path="/roi-calculator" element={<PublicLayout><LazyPage><MBARoiCalculatorPage /></LazyPage></PublicLayout>} />
            <Route path="/business-inquiries" element={<PublicLayout><LazyPage><BusinessInquiryPage /></LazyPage></PublicLayout>} />
            <Route path="/forgot-password" element={<PublicLayout><LazyPage><ForgotPasswordPage /></LazyPage></PublicLayout>} />
            <Route path="/reset-password" element={<PublicLayout><LazyPage><ResetPasswordPage /></LazyPage></PublicLayout>} />
            <Route path="/list-your-business" element={<PublicLayout><LazyPage><ListYourBusinessPage /></LazyPage></PublicLayout>} />
            <Route path="/list-your-business/poc" element={<PublicLayout><LazyPage><ListingPocPage /></LazyPage></PublicLayout>} />
            <Route path="/list-your-business/:type/:id" element={<PublicLayout><LazyPage><ListingFormPage /></LazyPage></PublicLayout>} />
            <Route path="/my-listings" element={<PublicLayout><LazyPage><MyListingsPage /></LazyPage></PublicLayout>} />
            <Route path="*" element={<PublicLayout><LazyPage><NotFound /></LazyPage></PublicLayout>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
