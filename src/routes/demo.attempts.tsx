import { createFileRoute } from "@tanstack/react-router";
import StudentAttempts from "@/pages/student/StudentAttempts";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/attempts")({
  component: () => <StudentAttempts />,
  pendingComponent: StudentContentSkeleton,
});
