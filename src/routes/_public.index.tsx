import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import Index from "@/pages/Index";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import StudentShellFallback from "@/components/student/StudentShellFallback";

function HomeRoute() {
  const navigate = useNavigate();
  const onDashHost =
    typeof window !== "undefined" && window.location.hostname === "dashboard.mbacompass.in";

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
  head: () => ({ meta: [
    { title: "MBA Compass | MBA Colleges, Exams and Preparation" },
    { name: "description", content: "Explore MBA colleges, entrance exams, coaching and preparation tools with MBA Compass." },
    { property: "og:title", content: "MBA Compass | MBA Colleges, Exams and Preparation" },
    { property: "og:description", content: "Find MBA colleges, exam information and preparation resources." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: HomeRoute,
  pendingComponent: PublicPageSkeleton,
});
