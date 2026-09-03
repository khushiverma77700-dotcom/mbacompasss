import { createFileRoute } from "@tanstack/react-router";
import MockResultPage from "@/pages/mocks/MockResultPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/mocks/result/$attemptId")({
  component: () => <MockResultPage />,
  pendingComponent: StudentContentSkeleton,
});
