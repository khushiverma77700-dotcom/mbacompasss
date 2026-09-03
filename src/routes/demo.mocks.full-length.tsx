import { createFileRoute } from "@tanstack/react-router";
import StudentMocks from "@/pages/student/StudentMocks";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/mocks/full-length")({
  component: () => <StudentMocks />,
  pendingComponent: StudentContentSkeleton,
});
