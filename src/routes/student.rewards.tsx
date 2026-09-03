import { createFileRoute } from "@tanstack/react-router";
import StudentRewards from "@/pages/student/StudentRewards";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/rewards")({
  component: () => <StudentRewards />,
  pendingComponent: StudentContentSkeleton,
});
