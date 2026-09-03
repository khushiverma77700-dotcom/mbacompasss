import { createFileRoute } from "@tanstack/react-router";
import CoachingPage from "@/pages/CoachingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/coaching")({
  component: () => <CoachingPage />,
  pendingComponent: PublicPageSkeleton,
});
