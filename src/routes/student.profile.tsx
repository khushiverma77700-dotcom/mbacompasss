import { createFileRoute } from "@tanstack/react-router";
import StudentProfile from "@/pages/student/StudentProfile";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/profile")({
  component: () => <StudentProfile />,
  pendingComponent: StudentContentSkeleton,
});
