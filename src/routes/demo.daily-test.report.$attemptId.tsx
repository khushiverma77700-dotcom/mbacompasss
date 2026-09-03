import { createFileRoute } from "@tanstack/react-router";
import StudentDailyTestReportPage from "@/pages/student/StudentDailyTestReportPage";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/daily-test/report/$attemptId")({
  component: () => <StudentDailyTestReportPage />,
  pendingComponent: StudentContentSkeleton,
});
