import { createFileRoute } from "@tanstack/react-router";
import StudentDailyTestReportPage from "@/pages/student/StudentDailyTestReportPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/daily-test/report/$attemptId")({
  component: () => <StudentDailyTestReportPage />,
  pendingComponent: StudentContentSkeleton,
});
