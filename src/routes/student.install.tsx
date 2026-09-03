import { createFileRoute } from "@tanstack/react-router";
import StudentInstall from "@/pages/student/StudentInstall";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/install")({
  component: () => <StudentInstall />,
  pendingComponent: StudentContentSkeleton,
});
