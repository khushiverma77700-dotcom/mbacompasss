import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import ProfileAnalyzerPage from "@/pages/ProfileAnalyzerPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/profile-analyzer")({
  head: () => publicPageHead('/profile-analyzer', 'MBA Profile Analyser & College Chances | MBA Compass', 'Assess your MBA profile, admission chances, exam strategy and college fit with a detailed MBA Compass report.'),

  component: () => <ProfileAnalyzerPage />,
  pendingComponent: PublicPageSkeleton,
});
