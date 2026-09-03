import { createFileRoute } from "@tanstack/react-router";
import StudentDailyTest from "@/pages/student/StudentDailyTest";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/daily-test")({
  component: () => <StudentDailyTest />,
  pendingComponent: StudentContentSkeleton,
});
