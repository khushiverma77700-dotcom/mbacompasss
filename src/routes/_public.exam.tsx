import { createFileRoute } from "@tanstack/react-router";
import ExamsListingPage from "@/pages/ExamsListingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/exam")({
  component: () => <ExamsListingPage />,
  pendingComponent: PublicPageSkeleton,
});
