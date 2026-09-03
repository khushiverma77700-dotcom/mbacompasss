import { createFileRoute } from "@tanstack/react-router";
import MockReviewPage from "@/pages/mocks/MockReviewPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/review/$attemptId")({
  component: () => <MockReviewPage />,
  pendingComponent: PublicPageSkeleton,
});
