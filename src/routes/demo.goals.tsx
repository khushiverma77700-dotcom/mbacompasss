import { createFileRoute } from "@tanstack/react-router";
import StudentGoals from "@/pages/student/StudentGoals";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/goals")({
  component: () => <StudentGoals />,
  pendingComponent: StudentContentSkeleton,
});
