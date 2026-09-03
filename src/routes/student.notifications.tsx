import { createFileRoute } from "@tanstack/react-router";
import StudentNotifications from "@/pages/student/StudentNotifications";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/notifications")({
  component: () => <StudentNotifications />,
  pendingComponent: StudentContentSkeleton,
});
