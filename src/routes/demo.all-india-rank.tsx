import { createFileRoute } from "@tanstack/react-router";
import StudentPerformance from "@/pages/student/StudentPerformance";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/all-india-rank")({
  component: () => <StudentPerformance />,
  pendingComponent: StudentContentSkeleton,
});
