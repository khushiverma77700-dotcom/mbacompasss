import { createFileRoute } from "@tanstack/react-router";
import CoachingCategoryRedirect from "@/pages/CoachingCategoryRedirect";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/coaching/mode/$slug")({
  component: () => <CoachingCategoryRedirect kind="mode" />,
  pendingComponent: PublicPageSkeleton,
});
