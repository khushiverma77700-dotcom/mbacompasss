import { createFileRoute } from "@tanstack/react-router";
import StudentDeepAnalysis from "@/pages/student/StudentDeepAnalysis";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/analysis/$attemptId")({
  component: () => <StudentDeepAnalysis />,
  pendingComponent: StudentContentSkeleton,
});
