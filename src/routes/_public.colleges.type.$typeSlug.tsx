import { createFileRoute } from "@tanstack/react-router";
import CollegeHubPage from "@/pages/CollegeHubPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/colleges/type/$typeSlug")({
  component: () => <CollegeHubPage kind="type" />,
  pendingComponent: PublicPageSkeleton,
});
