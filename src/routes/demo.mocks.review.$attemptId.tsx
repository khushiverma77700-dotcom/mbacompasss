import { createFileRoute } from "@tanstack/react-router";
import MockReviewPage from "@/pages/mocks/MockReviewPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/mocks/review/$attemptId")({
  component: () => <MockReviewPage />,
  pendingComponent: StudentContentSkeleton,
});
