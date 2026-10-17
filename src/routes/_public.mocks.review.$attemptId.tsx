import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockReviewPage from "@/pages/mocks/MockReviewPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/review/$attemptId")({
  head: ({ params }) => publicPageHead(`/mocks/review/${params.attemptId}`, `${params.attemptId} | MBA Compass`, "Explore attemptid information, guides and resources on MBA Compass."),
  component: () => <MockReviewPage />,
  pendingComponent: PublicPageSkeleton,
});
