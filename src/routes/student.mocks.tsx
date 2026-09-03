import { createFileRoute } from "@tanstack/react-router";
import StudentMocks from "@/pages/student/StudentMocks";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/mocks")({
  component: () => <StudentMocks />,
  pendingComponent: StudentContentSkeleton,
});
