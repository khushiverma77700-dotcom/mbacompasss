import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, useNavigate, useHydrated } from "@tanstack/react-router";
import { useEffect } from "react";
import Index from "@/pages/Index";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import StudentShellFallback from "@/components/student/StudentShellFallback";

function HomeRoute() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const onDashHost =
    hydrated && window.location.hostname === "dashboard.mbacompass.in";

  // dashboard.mbacompass.in serves the student LMS: its "/" is the student
  // dashboard, not the marketing homepage (ported from the pre-migration
  // host-conditional root route).
  useEffect(() => {
    if (onDashHost) {
      void navigate({ to: "/student", replace: true });
    }
  }, [onDashHost, navigate]);

  if (onDashHost) return <StudentShellFallback />;
  return <Index />;
}

export const Route = createFileRoute("/_public/")({
  head: () => publicPageHead('/', 'MBA Compass — MBA Colleges, Coaching & Exams India 2026', 'Compare MBA colleges, coaching and entrance exams. Explore fees, placements, admission information and preparation resources on MBA Compass.'),

  component: HomeRoute,
  pendingComponent: PublicPageSkeleton,
});
