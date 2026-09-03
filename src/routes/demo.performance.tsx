import { createFileRoute } from "@tanstack/react-router";
import StudentPerformance from "@/pages/student/StudentPerformance";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/performance")({
  component: () => <StudentPerformance />,
  pendingComponent: StudentContentSkeleton,
});
