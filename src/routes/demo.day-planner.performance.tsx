import { createFileRoute } from "@tanstack/react-router";
import StudentPlannerPerformance from "@/pages/student/StudentPlannerPerformance";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/day-planner/performance")({
  component: () => <StudentPlannerPerformance />,
  pendingComponent: StudentContentSkeleton,
});
