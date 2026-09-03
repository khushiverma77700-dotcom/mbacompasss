import { createFileRoute } from "@tanstack/react-router";
import PersonalizedMockRunnerPage from "@/pages/student/PersonalizedMockRunnerPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/personalized-hub/attempt/$attemptId")({
  component: () => <PersonalizedMockRunnerPage />,
  pendingComponent: StudentContentSkeleton,
});
