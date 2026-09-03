import { createFileRoute } from "@tanstack/react-router";
import StudentDayPlanner from "@/pages/student/StudentDayPlanner";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/day-planner")({
  component: () => <StudentDayPlanner />,
  pendingComponent: StudentContentSkeleton,
});
