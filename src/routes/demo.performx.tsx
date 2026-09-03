import { createFileRoute } from "@tanstack/react-router";
import StudentPerformX from "@/pages/student/StudentPerformX";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/performx")({
  component: () => <StudentPerformX />,
  pendingComponent: StudentContentSkeleton,
});
