import { createFileRoute } from "@tanstack/react-router";
import StudentSupport from "@/pages/student/StudentSupport";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/support")({
  component: () => <StudentSupport />,
  pendingComponent: StudentContentSkeleton,
});
