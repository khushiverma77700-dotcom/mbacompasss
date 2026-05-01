import React, { Suspense, useState, lazy, useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Route, Routes, matchPath, useLocation, useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import { computeSubdomainRedirect } from "@/lib/subdomainRouter";
import { consumePostAuthRedirect } from "@/lib/authRedirect";
import { isStudentMode } from "@/lib/studentModeNav";
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
const Navbar = lazyWithPreload(() => import("@/components/Navbar"));
const Footer = lazyWithPreload(() => import("@/components/Footer"));
const Toaster = lazyWithPreload(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazyWithPreload(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

// Pages are lazy so dashboard visits do not download public homepage/admin code first.
const Index = lazyWithPreload(() => import("./pages/Index"));
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
const ProgrammeDetailPage = lazyWithPreload(() => import("./pages/ProgrammeDetailPage"));
const MBAProgrammeComparePage = lazyWithPreload(() => import("./pages/MBAProgrammeComparePage"));
const IIMWaitlistPage = lazyWithPreload(() => import("./pages/IIMWaitlistPage"));

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
const AdminBulkGenerateSections = lazyWithPreload(() => import("./pages/admin/AdminBulkGenerateSections"));
const AdminInstituteResults = lazyWithPreload(() => import("./pages/admin/AdminInstituteResults"));
const AdminSitemap = lazyWithPreload(() => import("./pages/admin/AdminSitemap"));
const AdminClearCache = lazyWithPreload(() => import("./pages/admin/AdminClearCache"));
const AdminLeads = lazyWithPreload(() => import("./pages/admin/AdminLeads"));

const AdminAllLinks = lazyWithPreload(() => import("./pages/admin/AdminAllLinks"));
const AdminComparisons = lazyWithPreload(() => import("./pages/admin/AdminComparisons"));
const AdminCoachingResults = lazyWithPreload(() => import("./pages/admin/AdminCoachingResults"));
const AdminSEODashboard = lazyWithPreload(() => import("./pages/admin/AdminSEODashboard"));
const AdminPageEditor = lazyWithPreload(() => import("./pages/admin/AdminPageEditor"));
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
const AdminBulkRefresh = lazyWithPreload(() => import("./pages/admin/AdminBulkRefresh"));
const AdminContentStudio = lazyWithPreload(() => import("./pages/admin/AdminContentStudio"));
const AdminCourseCategories = lazyWithPreload(() => import("./pages/admin/AdminCourseCategories"));
const AdminCATScores = lazyWithPreload(() => import("./pages/admin/AdminCATScores"));
const AdminMegaMenu = lazyWithPreload(() => import("./pages/admin/AdminMegaMenu"));
const AdminGoogleIndexing = lazyWithPreload(() => import("./pages/admin/AdminGoogleIndexing"));
const AdminIndexingAudit = lazyWithPreload(() => import("./pages/admin/AdminIndexingAudit"));
const AdminIndexingRequeue = lazyWithPreload(() => import("./pages/admin/AdminIndexingRequeue"));
const AdminSpecializations = lazyWithPreload(() => import("./pages/admin/AdminSpecializations"));
const AdminDomainAudit = lazyWithPreload(() => import("./pages/admin/AdminDomainAudit"));
const AdminMetaValidator = lazyWithPreload(() => import("./pages/admin/AdminMetaValidator"));
const AdminDNSStatus = lazyWithPreload(() => import("./pages/admin/AdminDNSStatus"));
const AdminSafeBrowsingGuide = lazyWithPreload(() => import("./pages/admin/AdminSafeBrowsingGuide"));
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
const AdminBulkCreateColleges = lazyWithPreload(() => import("./pages/admin/AdminBulkCreateColleges"));
const AdminWriteInstitute = lazyWithPreload(() => import("./pages/admin/AdminWriteInstitute"));
const AdminWriteCourses = lazyWithPreload(() => import("./pages/admin/AdminWriteCourses"));
const AdminWebsiteOptimizer = lazyWithPreload(() => import("./pages/admin/AdminWebsiteOptimizer"));
const AdminMockTests = lazyWithPreload(() => import("./pages/admin/AdminMockTests"));
const AdminMockBundles = lazyWithPreload(() => import("./pages/admin/AdminMockBundles"));
const AdminMockBuilder = lazyWithPreload(() => import("./pages/admin/AdminMockBuilder"));
const AdminMocksLanding = lazyWithPreload(() => import("./pages/admin/AdminMocksLanding"));
const AdminStudentMocks = lazyWithPreload(() => import("./pages/admin/AdminStudentMocks"));
const AdminSupportTickets = lazyWithPreload(() => import("./pages/admin/AdminSupportTickets"));
const AdminStudentAnnouncements = lazyWithPreload(() => import("./pages/admin/AdminStudentAnnouncements"));
const StudentLayout = lazyWithPreload(() => import("./pages/student/StudentLayout"));
const StudentOverview = lazyWithPreload(() => import("./pages/student/StudentOverview"));
const StudentMocks = lazyWithPreload(() => import("./pages/student/StudentMocks"));
const StudentBuyMocks = lazyWithPreload(() => import("./pages/student/StudentBuyMocks"));
const StudentPerformance = lazyWithPreload(() => import("./pages/student/StudentPerformance"));
const StudentGoals = lazyWithPreload(() => import("./pages/student/StudentGoals"));
const StudentAnnouncements = lazyWithPreload(() => import("./pages/student/StudentAnnouncements"));
const StudentTools = lazyWithPreload(() => import("./pages/student/StudentTools"));
const StudentProfile = lazyWithPreload(() => import("./pages/student/StudentProfile"));
const StudentRewards = lazyWithPreload(() => import("./pages/student/StudentRewards"));
const StudentDayPlanner = lazyWithPreload(() => import("./pages/student/StudentDayPlanner"));
const StudentPlannerPerformance = lazyWithPreload(() => import("./pages/student/StudentPlannerPerformance"));
const MBACompassCoursesPage = lazyWithPreload(() => import("./pages/MBACompassCoursesPage"));
const MBACompassCourseDetailPage = lazyWithPreload(() => import("./pages/MBACompassCourseDetailPage"));
const MBACompassComparePage = lazyWithPreload(() => import("./pages/MBACompassComparePage"));
const AdminMBACompassCourses = lazyWithPreload(() => import("./pages/admin/AdminMBACompassCourses"));
const StudentLeaderboard = lazyWithPreload(() => import("./pages/student/StudentLeaderboard"));
const StudentNotifications = lazyWithPreload(() => import("./pages/student/StudentNotifications"));
const StudentOrders = lazyWithPreload(() => import("./pages/student/StudentOrders"));
const StudentDeepAnalysis = lazyWithPreload(() => import("./pages/student/StudentDeepAnalysis"));
const StudentDailyTest = lazyWithPreload(() => import("./pages/student/StudentDailyTest"));
const StudentDailyTestReportPage = lazyWithPreload(() => import("./pages/student/StudentDailyTestReportPage"));
const StudentAttempts = lazyWithPreload(() => import("./pages/student/StudentAttempts"));
const StudentSupport = lazyWithPreload(() => import("./pages/student/StudentSupport"));
const StudentPersonalizedHub = lazyWithPreload(() => import("./pages/student/StudentPersonalizedHub"));
const PersonalizedMockRunnerPage = lazyWithPreload(() => import("./pages/student/PersonalizedMockRunnerPage"));
const PersonalizedMockResultPage = lazyWithPreload(() => import("./pages/student/PersonalizedMockResultPage"));
const StudentLogin = lazyWithPreload(() => import("./pages/student/StudentLogin"));
const StudentSOPReview = lazyWithPreload(() => import("./pages/student/StudentSOPReview"));
const AdminPersonalizedHub = lazyWithPreload(() => import("./pages/admin/AdminPersonalizedHub"));
const AdminDailyTests = lazyWithPreload(() => import("./pages/admin/AdminDailyTests"));
const AdminStudentNotificationsBroadcast = lazyWithPreload(() => import("./pages/admin/AdminStudentNotificationsBroadcast"));
const MocksListPage = lazyWithPreload(() => import("./pages/mocks/MocksListPage"));
const MockBundlesListPage = lazyWithPreload(() => import("./pages/courses/MockBundlesListPage"));
const MockBundleDetailPage = lazyWithPreload(() => import("./pages/courses/MockBundleDetailPage"));
const MockTestIntroPage = lazyWithPreload(() => import("./pages/mocks/MockTestIntroPage"));
const MockTestRunnerPage = lazyWithPreload(() => import("./pages/mocks/MockTestRunnerPage"));
const MockResultPage = lazyWithPreload(() => import("./pages/mocks/MockResultPage"));
const MyMocksPage = lazyWithPreload(() => import("./pages/mocks/MyMocksPage"));
const AdminHyperlinkUpdate = lazyWithPreload(() => import("./pages/admin/AdminHyperlinkUpdate"));
const AdminBulkAIEdit = lazyWithPreload(() => import("./pages/admin/AdminBulkAIEdit"));
const AdminIIMWaitlist = lazyWithPreload(() => import("./pages/admin/AdminIIMWaitlist"));
const MockReviewPage = lazyWithPreload(() => import("./pages/mocks/MockReviewPage"));
const MockLeaderboardPage = lazyWithPreload(() => import("./pages/mocks/MockLeaderboardPage"));
const MockCheckoutReturnPage = lazyWithPreload(() => import("./pages/mocks/MockCheckoutReturnPage"));
const MockThankYouPage = lazyWithPreload(() => import("./pages/mocks/MockThankYouPage"));

// Lazy load heavy popups
const OnboardingDialog = lazyWithPreload(() => import("@/components/OnboardingDialog"));
const ProfileAnalyzerPopup = lazyWithPreload(() => import("@/components/ProfileAnalyzerPopup"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000, // 24h — kept for persistence
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// Persist React Query cache to localStorage so repeat visits load instantly from cache
const queryPersister = typeof window !== "undefined"
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: "mbc-rq-cache-v1",
      throttleTime: 1000,
    })
  : undefined;

const ROUTE_PREFETCHERS = {
  "/blog": [BlogPage.preload],
  "/compare": [ComparePage.preload],
  "/about": [AboutPage.preload],
  "/contact": [ContactPage.preload],
  "/auth": [AuthPage.preload],
  "/dashboard": [DashboardPage.preload],
  "/college-finder": [CollegeFinderPage.preload],
  "/college-shortlister": [CollegeShortlisterPage.preload],
  "/profile-analyzer": [ProfileAnalyzerPage.preload],
  "/cat-score-calculator": [CATScoreCalculatorPage.preload],
  "/roi-calculator": [MBARoiCalculatorPage.preload],
  "/business-inquiries": [BusinessInquiryPage.preload],
  "/forgot-password": [ForgotPasswordPage.preload],
  "/reset-password": [ResetPasswordPage.preload],
  "/colleges": [CollegesPage.preload],
  "/coaching": [CoachingPage.preload],
  "/admin": [AdminLayout.preload, AdminDashboard.preload],
};

const ROUTE_MATCH_PREFETCHERS = [
  { pattern: "/category/:slug", preloaders: [CategoryPage.preload] },
  { pattern: "/article/:slug", preloaders: [ArticlePage.preload] },
  { pattern: "/college/:slug", preloaders: [CollegeDetailPage.preload] },
  { pattern: "/institute/:slug", preloaders: [InstitutePage.preload] },
  { pattern: "/exam/:slug", preloaders: [ExamDetailPage.preload] },
  { pattern: "/colleges/:region", preloaders: [CollegeFilterPage.preload] },
  { pattern: "/coaching/:region", preloaders: [CoachingFilterPage.preload] },
  { pattern: "/report/:id", preloaders: [SharedReportPage.preload] },
  { pattern: "/list-your-business", preloaders: [ListYourBusinessPage.preload] },
  { pattern: "/list-your-business/poc", preloaders: [ListingPocPage.preload] },
  { pattern: "/list-your-business/:type/:id", preloaders: [ListingFormPage.preload] },
  { pattern: "/my-listings", preloaders: [MyListingsPage.preload] },
  { pattern: "/admin/:section", preloaders: [AdminLayout.preload] },
  { pattern: "*", preloaders: [NotFound.preload] },
];

const prefetchRoute = (href?: string | null) => {
  if (!href) return;

  const url = href.startsWith("http") ? new URL(href) : new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  const path = url.pathname;
  const preloaders = new Set<() => Promise<unknown>>();

  ROUTE_PREFETCHERS[path as keyof typeof ROUTE_PREFETCHERS]?.forEach((preload) => preloaders.add(preload));

  for (const route of ROUTE_MATCH_PREFETCHERS) {
    if (matchPath(route.pattern, path)) {
      route.preloaders.forEach((preload) => preloaders.add(preload));
    }
  }

  preloaders.forEach((preload) => {
    void preload();
  });
};

const GlobalNavigationPrefetch = () => {
  useEffect(() => {
    const schedulePrefetch = (href?: string | null) => {
      const runner = () => prefetchRoute(href);
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(runner);
      } else {
        setTimeout(runner, 0);
      }
    };

    const handlePointer = (event: Event) => {
      const target = event.target as Element | null;
      if (!target || typeof (target as Element).closest !== "function") return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      schedulePrefetch(anchor.href);
    };

    document.addEventListener("pointerenter", handlePointer, true);
    document.addEventListener("focusin", handlePointer, true);

    // NOTE: Do NOT eagerly prefetch routes here.
    // Previously prefetching "/admin" pulled the entire admin bundle (TipTap editor ~127KB,
    // recharts, radix dialogs, ~30+ admin chunks) on every public page load, adding ~3-5s.
    // Hover/focus-based prefetch above already handles real navigation intent.

    return () => {
      document.removeEventListener("pointerenter", handlePointer, true);
      document.removeEventListener("focusin", handlePointer, true);
    };
  }, []);

  return null;
};

/**
 * Runtime guard for SPA navigations across the dashboard ↔ marketing split.
 * The inline script in index.html catches the very first request; this catches
 * client-side route changes (e.g. clicking a /colleges link while on dashboard.*).
 */
const SubdomainGuard = () => {
  const location = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = computeSubdomainRedirect(window.location);
    if (target) window.location.replace(target);
  }, [location.pathname, location.search]);
  return null;
};

const StudentBackGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const backPressedRef = React.useRef(false);

  useEffect(() => {
    const markBackPress = () => { backPressedRef.current = true; };
    window.addEventListener("popstate", markBackPress);
    return () => window.removeEventListener("popstate", markBackPress);
  }, []);

  useEffect(() => {
    if (!backPressedRef.current) return;
    backPressedRef.current = false;
    if (!isStudentMode()) return;

    const path = location.pathname;
    if (path === "/student/login" || !path.startsWith("/student")) {
      navigate("/student", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

const PageLoader = () => (
  <div className="min-h-[40vh] bg-background">
    <div className="container mx-auto flex min-h-[40vh] items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-sm">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-medium text-muted-foreground">Loading page…</span>
      </div>
    </div>
  </div>
);

// Prefetch all site settings in one batch — but only after first paint to keep
// Supabase calls off the LCP critical path.
const SettingsPrefetcher = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as any;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 800));
    const handle = schedule(() => setReady(true), { timeout: 2500 });
    return () => {
      const cancel = w.cancelIdleCallback ?? window.clearTimeout;
      try { cancel(handle); } catch {}
    };
  }, []);
  return ready ? <SettingsPrefetcherInner /> : null;
};
const SettingsPrefetcherInner = () => {
  useAllSiteSettings();
  return null;
};

// Mount heavy non-critical chrome (Footer, popup) only after first paint + idle
// so they don't block initial JS execution / FCP.
const DeferredChrome = () => {
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const w = window as any;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const handle = schedule(() => setShow(true), { timeout: 3000 });
    return () => {
      const cancel = w.cancelIdleCallback ?? window.clearTimeout;
      try { cancel(handle); } catch {}
    };
  }, []);

  if (!show) return null;

  // Popup never shows on home / admin / profile-analyzer / student dashboard / mock test runner —
  // skip importing it there so AI pop-ups don't disrupt focused experiences.
  const path = location.pathname;
  const skipPopup =
    path === "/" ||
    path === "/profile-analyzer" ||
    path.startsWith("/admin") ||
    path.startsWith("/student") ||
    path.startsWith("/mocks/attempt") ||
    path.startsWith("/mocks/test") ||
    path.startsWith("/mocks/result") ||
    path.startsWith("/mocks/review");

  return (
    <Suspense fallback={null}>
      <Footer />
      {!skipPopup && <ProfileAnalyzerPopup />}
    </Suspense>
  );
};

// Same idle-mount strategy for toaster providers (not needed for first paint)
const DeferredToasters = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const w = window as any;
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
    const handle = schedule(() => setShow(true), { timeout: 4000 });
    return () => {
      const cancel = w.cancelIdleCallback ?? window.clearTimeout;
      try { cancel(handle); } catch {}
    };
  }, []);
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
    </Suspense>
  );
};

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Suspense fallback={null}><Navbar /></Suspense>
    {children}
    <DeferredChrome />
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
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/student")) return null;

  return (
    <Suspense fallback={null}>
      <OnboardingDialog
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        userId={user.id}
        userEmail={user.email}
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
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: queryPersister!,
      maxAge: 24 * 60 * 60 * 1000,
      buster: "v1",
      dehydrateOptions: {
        // Only persist successful, "public" data — skip auth/user-specific queries
        shouldDehydrateQuery: (q) => {
          if (q.state.status !== "success") return false;
          const key = JSON.stringify(q.queryKey);
          // Skip user/auth-specific caches
          if (/profile|user_role|admin_perm|auth/i.test(key)) return false;
          return true;
        },
      },
    }}
  >
    <TooltipProvider>
      <DeferredToasters />
      <SettingsPrefetcher />
      <BrowserRouter>
        <SubdomainGuard />
        <StudentBackGuard />
        <GlobalNavigationPrefetch />
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
              <Route path="college-sections/bulk-generate" element={<LazyPage><AdminBulkGenerateSections /></LazyPage>} />
              <Route path="institute-results" element={<LazyPage><AdminInstituteResults /></LazyPage>} />
              <Route path="sitemap" element={<LazyPage><AdminSitemap /></LazyPage>} />
              <Route path="clear-cache" element={<LazyPage><AdminClearCache /></LazyPage>} />
              <Route path="leads" element={<LazyPage><AdminLeads /></LazyPage>} />
              
              <Route path="all-links" element={<LazyPage><AdminAllLinks /></LazyPage>} />
              <Route path="comparisons" element={<LazyPage><AdminComparisons /></LazyPage>} />
              <Route path="coaching-results" element={<LazyPage><AdminCoachingResults /></LazyPage>} />
              <Route path="seo-dashboard" element={<LazyPage><AdminSEODashboard /></LazyPage>} />
              <Route path="page-editor" element={<LazyPage><AdminPageEditor /></LazyPage>} />
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
              <Route path="bulk-refresh" element={<LazyPage><AdminBulkRefresh /></LazyPage>} />
              <Route path="content-studio" element={<LazyPage><AdminContentStudio /></LazyPage>} />
              <Route path="course-categories" element={<LazyPage><AdminCourseCategories /></LazyPage>} />
              <Route path="cat-scores" element={<LazyPage><AdminCATScores /></LazyPage>} />
              <Route path="mega-menu" element={<LazyPage><AdminMegaMenu /></LazyPage>} />
              <Route path="google-indexing" element={<LazyPage><AdminGoogleIndexing /></LazyPage>} />
              <Route path="indexing-audit" element={<LazyPage><AdminIndexingAudit /></LazyPage>} />
              <Route path="indexing-requeue" element={<LazyPage><AdminIndexingRequeue /></LazyPage>} />
              <Route path="specializations" element={<LazyPage><AdminSpecializations /></LazyPage>} />
              <Route path="domain-audit" element={<LazyPage><AdminDomainAudit /></LazyPage>} />
              <Route path="meta-validator" element={<LazyPage><AdminMetaValidator /></LazyPage>} />
              <Route path="dns-status" element={<LazyPage><AdminDNSStatus /></LazyPage>} />
              <Route path="safe-browsing-guide" element={<LazyPage><AdminSafeBrowsingGuide /></LazyPage>} />
              <Route path="roi-analyses" element={<LazyPage><AdminROIAnalyses /></LazyPage>} />
              <Route path="user-submissions" element={<LazyPage><AdminUserSubmissions /></LazyPage>} />
              <Route path="listing-change-requests" element={<LazyPage><AdminListingChangeRequests /></LazyPage>} />
              <Route path="seo/write-blog" element={<LazyPage><AdminWriteBlog /></LazyPage>} />
              <Route path="colleges/generate-ai" element={<LazyPage><AdminWriteCollege /></LazyPage>} />
              <Route path="colleges/bulk-create" element={<LazyPage><AdminBulkCreateColleges /></LazyPage>} />
              <Route path="institutes/generate-ai" element={<LazyPage><AdminWriteInstitute /></LazyPage>} />
              <Route path="courses/generate-ai" element={<LazyPage><AdminWriteCourses /></LazyPage>} />
              <Route path="website-optimizer" element={<LazyPage><AdminWebsiteOptimizer /></LazyPage>} />
              <Route path="mock-tests" element={<LazyPage><AdminMockTests /></LazyPage>} />
              <Route path="mock-tests/:testId/builder" element={<LazyPage><AdminMockBuilder /></LazyPage>} />
              <Route path="mock-bundles" element={<LazyPage><AdminMockBundles /></LazyPage>} />
              <Route path="mocks-landing" element={<LazyPage><AdminMocksLanding /></LazyPage>} />
              <Route path="student-mocks" element={<LazyPage><AdminStudentMocks /></LazyPage>} />
              <Route path="personalized-hub" element={<LazyPage><AdminPersonalizedHub /></LazyPage>} />
              <Route path="student-announcements" element={<LazyPage><AdminStudentAnnouncements /></LazyPage>} />
              <Route path="student-notifications" element={<LazyPage><AdminStudentNotificationsBroadcast /></LazyPage>} />
              <Route path="daily-tests" element={<LazyPage><AdminDailyTests /></LazyPage>} />
              <Route path="mba-compass-courses" element={<LazyPage><AdminMBACompassCourses /></LazyPage>} />
              <Route path="hyperlink-update" element={<LazyPage><AdminHyperlinkUpdate /></LazyPage>} />
              <Route path="bulk-ai-edit" element={<LazyPage><AdminBulkAIEdit /></LazyPage>} />
              <Route path="iim-waitlist" element={<LazyPage><AdminIIMWaitlist /></LazyPage>} />
            </Route>

            {/* Routes */}
            <Route path="/" element={<PublicLayout><LazyPage><Index /></LazyPage></PublicLayout>} />
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
            <Route path="/college/:slug/programme/:programmeSlug" element={<PublicLayout><LazyPage><ProgrammeDetailPage /></LazyPage></PublicLayout>} />
            <Route path="/mba-programme-compare" element={<PublicLayout><LazyPage><MBAProgrammeComparePage /></LazyPage></PublicLayout>} />
            <Route path="/mocks" element={<PublicLayout><LazyPage><MocksListPage /></LazyPage></PublicLayout>} />
            <Route path="/courses" element={<PublicLayout><LazyPage><MockBundlesListPage /></LazyPage></PublicLayout>} />
            <Route path="/courses/:slug" element={<PublicLayout><LazyPage><MockBundleDetailPage /></LazyPage></PublicLayout>} />
            <Route path="/mocks/:slug" element={<PublicLayout><LazyPage><MockTestIntroPage /></LazyPage></PublicLayout>} />
            <Route path="/mocks/attempt/:attemptId" element={<LazyPage><MockTestRunnerPage /></LazyPage>} />
            <Route path="/mocks/result/:attemptId" element={<PublicLayout><LazyPage><MockResultPage /></LazyPage></PublicLayout>} />
            <Route path="/mocks/review/:attemptId" element={<PublicLayout><LazyPage><MockReviewPage /></LazyPage></PublicLayout>} />
            <Route path="/mocks/leaderboard/:slug" element={<PublicLayout><LazyPage><MockLeaderboardPage /></LazyPage></PublicLayout>} />
            <Route path="/mocks/checkout/return" element={<LazyPage><MockCheckoutReturnPage /></LazyPage>} />
            <Route path="/mocks/thank-you" element={<PublicLayout><LazyPage><MockThankYouPage /></LazyPage></PublicLayout>} />
            <Route path="/dashboard/mocks" element={<PublicLayout><LazyPage><MyMocksPage /></LazyPage></PublicLayout>} />
            <Route path="/student/login" element={<LazyPage><StudentLogin /></LazyPage>} />
            <Route path="/student" element={<LazyPage><StudentLayout /></LazyPage>}>
              <Route index element={<LazyPage><StudentOverview /></LazyPage>} />
              <Route path="mocks" element={<LazyPage><StudentMocks /></LazyPage>} />
              <Route path="mocks/full-length" element={<LazyPage><StudentMocks /></LazyPage>} />
              <Route path="mocks/sectional" element={<LazyPage><StudentMocks /></LazyPage>} />
              <Route path="mocks/topic-wise" element={<LazyPage><StudentMocks /></LazyPage>} />
              <Route path="mocks/practice" element={<LazyPage><StudentMocks /></LazyPage>} />
              <Route path="mocks/attempted" element={<LazyPage><StudentMocks /></LazyPage>} />
              <Route path="buy-mocks" element={<LazyPage><StudentBuyMocks /></LazyPage>} />
              <Route path="performance" element={<LazyPage><StudentPerformance /></LazyPage>} />
              <Route path="goals" element={<LazyPage><StudentGoals /></LazyPage>} />
              <Route path="announcements" element={<LazyPage><StudentAnnouncements /></LazyPage>} />
              <Route path="tools" element={<LazyPage><StudentTools /></LazyPage>} />
              <Route path="profile" element={<LazyPage><StudentProfile /></LazyPage>} />
              <Route path="rewards" element={<LazyPage><StudentRewards /></LazyPage>} />
              <Route path="day-planner" element={<LazyPage><StudentDayPlanner /></LazyPage>} />
              <Route path="day-planner/performance" element={<LazyPage><StudentPlannerPerformance /></LazyPage>} />
              <Route path="leaderboard" element={<LazyPage><StudentLeaderboard /></LazyPage>} />
              <Route path="notifications" element={<LazyPage><StudentNotifications /></LazyPage>} />
              <Route path="orders" element={<LazyPage><StudentOrders /></LazyPage>} />
              <Route path="analysis/:attemptId" element={<LazyPage><StudentDeepAnalysis /></LazyPage>} />
              <Route path="daily-test" element={<LazyPage><StudentDailyTest /></LazyPage>} />
              <Route path="daily-test/report/:attemptId" element={<LazyPage><StudentDailyTestReportPage /></LazyPage>} />
              <Route path="attempts" element={<LazyPage><StudentAttempts /></LazyPage>} />
              <Route path="support" element={<LazyPage><StudentSupport /></LazyPage>} />
              <Route path="personalized-hub" element={<LazyPage><StudentPersonalizedHub /></LazyPage>} />
              <Route path="personalized-hub/attempt/:attemptId" element={<LazyPage><PersonalizedMockRunnerPage /></LazyPage>} />
              <Route path="personalized-hub/result/:attemptId" element={<LazyPage><PersonalizedMockResultPage /></LazyPage>} />
              <Route path="sop-review" element={<LazyPage><StudentSOPReview /></LazyPage>} />
            </Route>
            <Route path="/mba-compass" element={<PublicLayout><LazyPage><MBACompassCoursesPage /></LazyPage></PublicLayout>} />
            <Route path="/mba-compass/compare" element={<PublicLayout><LazyPage><MBACompassComparePage /></LazyPage></PublicLayout>} />
            <Route path="/mba-compass/:slug" element={<PublicLayout><LazyPage><MBACompassCourseDetailPage /></LazyPage></PublicLayout>} />
            <Route path="/iim-waitlist-movement" element={<PublicLayout><LazyPage><IIMWaitlistPage /></LazyPage></PublicLayout>} />
            <Route path="*" element={<PublicLayout><LazyPage><NotFound /></LazyPage></PublicLayout>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
