import { createFileRoute } from "@tanstack/react-router";
import ProfileAnalyzerPage from "@/pages/ProfileAnalyzerPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/profile-analyzer")({
  component: () => <ProfileAnalyzerPage />,
  pendingComponent: PublicPageSkeleton,
});
