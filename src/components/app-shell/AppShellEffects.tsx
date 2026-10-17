import React, { Suspense, useEffect, useState, lazy } from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { computeSubdomainRedirect } from "@/lib/subdomainRouter";
import { consumePostAuthRedirect } from "@/lib/authRedirect";
import { isStudentMode } from "@/lib/studentModeNav";
import { useAllSiteSettings } from "@/hooks/useSiteSettings";

const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const GlobalLoginDialog = lazy(() => import("@/components/GlobalLoginDialog"));
const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Runtime guard for SPA navigations across the dashboard ↔ marketing split.
 * Ported from the pre-migration App.tsx.
 */
export const SubdomainGuard = () => {
  const location = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = computeSubdomainRedirect(window.location);
    if (target) window.location.replace(target);
  }, [location.pathname, location.search]);
  return null;
};

export const StudentBackGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const backPressedRef = React.useRef(false);

  useEffect(() => {
    const markBackPress = () => {
      backPressedRef.current = true;
    };
    window.addEventListener("popstate", markBackPress);
    return () => window.removeEventListener("popstate", markBackPress);
  }, []);

  useEffect(() => {
    if (!backPressedRef.current) return;
    backPressedRef.current = false;
    if (!isStudentMode()) return;

    const onDashHost =
      typeof window !== "undefined" && window.location.hostname === "dashboard.mbacompass.in";
    const path = location.pathname;
    if (path === "/demo" || path.startsWith("/demo/")) return; // keep demo tree free
    const mockWorkPath =
      path.startsWith("/mocks/attempt/") ||
      path.startsWith("/mocks/result/") ||
      path.startsWith("/mocks/review/") ||
      path.startsWith("/mocks/leaderboard/");
    const insideLms = onDashHost
      ? path === "/" || path.startsWith("/student")
      : path.startsWith("/student") || mockWorkPath;
    if (path === "/student/login" || !insideLms) {
      navigate(onDashHost ? "/" : "/student", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

const SettingsPrefetcherInner = () => {
  useAllSiteSettings();
  return null;
};

/**
 * Prefetch all site settings in one batch — but only after first paint to keep
 * backend calls off the LCP critical path.
 */
export const SettingsPrefetcher = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const path = window.location.pathname;
    const onDashHost = window.location.hostname === "dashboard.mbacompass.in";
    if (onDashHost) return;
    if (
      path.startsWith("/admin") ||
      path.startsWith("/student") ||
      path.startsWith("/demo") ||
      path.startsWith("/mocks/attempt")
    )
      return;
    const w = window as IdleWindow;
    let idleHandle: number | undefined;
    const timer = window.setTimeout(() => {
      if (typeof w.requestIdleCallback === "function") {
        idleHandle = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      } else {
        setReady(true);
      }
    }, 6000);
    return () => {
      window.clearTimeout(timer);
      if (idleHandle !== undefined) {
        try {
          w.cancelIdleCallback?.(idleHandle);
        } catch {
          /* noop */
        }
      }
    };
  }, []);
  return ready ? <SettingsPrefetcherInner /> : null;
};

/** Idle-mount the toaster providers (not needed for first paint). */
export const DeferredToasters = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const w = window as IdleWindow;
    let idleHandle: number | undefined;
    let timerHandle: number | undefined;
    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(() => setShow(true), { timeout: 4000 });
    } else {
      timerHandle = window.setTimeout(() => setShow(true), 2000);
    }
    return () => {
      if (idleHandle !== undefined) {
        try {
          w.cancelIdleCallback?.(idleHandle);
        } catch {
          /* noop */
        }
      }
      if (timerHandle !== undefined) window.clearTimeout(timerHandle);
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

export const DeferredGlobalLoginDialog = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const activate = () => setShow(true);
    window.addEventListener("open-login-dialog", activate, { once: true });
    return () => window.removeEventListener("open-login-dialog", activate);
  }, []);
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <GlobalLoginDialog />
    </Suspense>
  );
};

export const OnboardingGate = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    const onDashboardHost =
      typeof window !== "undefined" && window.location.hostname === "dashboard.mbacompass.in";
    const inDemoContext = path.startsWith("/demo") || onDashboardHost;
    // Skip onboarding (phone OTP) dialog inside the student LMS. Mobile verification
    // is only required at course-purchase time — EXCEPT for the demo flow, where
    // OTP-verified mobile is mandatory to access the demo dashboard.
    if (!inDemoContext) {
      if (
        path.startsWith("/admin") ||
        path.startsWith("/student") ||
        path.startsWith("/mocks/attempt") ||
        path === "/tools/profile-analyzer"
      )
        return;
    }
    if (loading || !user || checked) return;

    let cancelled = false;

    const checkOnboarding = async (attempt = 0) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        const d = data as { onboarding_completed?: boolean | null; phone?: string | null };
        // In the demo flow, treat missing/empty phone as "onboarding not complete"
        // so existing accounts without a verified mobile still hit the OTP step.
        const needsOtp = inDemoContext
          ? !d.onboarding_completed || !d.phone
          : !d.onboarding_completed;
        if (needsOtp) setShowOnboarding(true);
        setChecked(true);
        return;
      }

      // Profile row may not exist yet right after Google sign-up (trigger still running).
      if (attempt < 10) {
        setTimeout(() => void checkOnboarding(attempt + 1), 300);
      } else {
        setChecked(true);
      }
    };

    void checkOnboarding();
    return () => {
      cancelled = true;
    };
  }, [loading, user, checked, location.pathname]);

  if (!showOnboarding || !user) return null;
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const onDashHost = window.location.hostname === "dashboard.mbacompass.in";
    const inDemo = path.startsWith("/demo") || onDashHost;
    // Suppress inside student LMS only — allow inside demo / dashboard host.
    if (!inDemo && path.startsWith("/student")) return null;
  }

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

export const OAuthRedirectHandler = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    if (location.pathname === "/demo" || location.pathname.startsWith("/demo/")) return;

    const pendingPath = consumePostAuthRedirect();
    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    if (pendingPath && pendingPath !== currentPath) {
      navigate(pendingPath, { replace: true });
    }
  }, [loading, user, location.pathname, location.search, location.hash, navigate]);

  return null;
};
