import { createFileRoute } from "@tanstack/react-router";
import PersonalizedMockResultPage from "@/pages/student/PersonalizedMockResultPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/personalized-hub/result/$attemptId")({
  component: () => <PersonalizedMockResultPage />,
  pendingComponent: StudentContentSkeleton,
});
