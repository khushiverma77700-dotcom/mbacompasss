import { createFileRoute } from "@tanstack/react-router";
import CollegeDetailPage from "@/pages/CollegeDetailPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/college/$slug")({
  component: () => <CollegeDetailPage />,
  pendingComponent: PublicPageSkeleton,
});
