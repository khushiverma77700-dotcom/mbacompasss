import { privatePageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import MockReviewPage from "@/pages/mocks/MockReviewPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/mocks/review/$attemptId")({
  head: ({ params }) => privatePageHead(`/mocks/review/${params.attemptId}`, `${params.attemptId} | MBA Compass`, "Explore MBA colleges, entrance exams and preparation resources on MBA Compass."),
  component: () => <MockReviewPage />,
  pendingComponent: PublicPageSkeleton,
});
