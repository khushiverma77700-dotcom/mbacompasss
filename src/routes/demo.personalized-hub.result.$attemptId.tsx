import { createFileRoute } from "@tanstack/react-router";
import PersonalizedMockResultPage from "@/pages/student/PersonalizedMockResultPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/personalized-hub/result/$attemptId")({
  component: () => <PersonalizedMockResultPage />,
  pendingComponent: StudentContentSkeleton,
});
