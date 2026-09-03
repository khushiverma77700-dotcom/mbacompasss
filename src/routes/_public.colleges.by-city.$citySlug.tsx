import { createFileRoute } from "@tanstack/react-router";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/by-city/$citySlug")({
  component: () => <CollegeHubPage kind="city" />,
  pendingComponent: PublicPageSkeleton,
});
