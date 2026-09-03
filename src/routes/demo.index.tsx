import { createFileRoute } from "@tanstack/react-router";
import StudentOverview from "@/pages/student/StudentOverview";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/")({
  component: () => <StudentOverview />,
  pendingComponent: StudentContentSkeleton,
});
