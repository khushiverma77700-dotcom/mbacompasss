import { createFileRoute } from "@tanstack/react-router";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/by-exam/$examSlug")({
  component: () => <CollegeHubPage kind="exam" />,
  pendingComponent: PublicPageSkeleton,
});
