import { createFileRoute } from "@tanstack/react-router";
import CoachingFilterPage from "@/pages/CoachingFilterPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/coaching/$region")({
  component: () => <CoachingFilterPage />,
  pendingComponent: PublicPageSkeleton,
});
