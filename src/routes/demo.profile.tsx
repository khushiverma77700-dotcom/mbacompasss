import { createFileRoute } from "@tanstack/react-router";
import StudentProfile from "@/pages/student/StudentProfile";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/profile")({
  component: () => <StudentProfile />,
  pendingComponent: StudentContentSkeleton,
});
