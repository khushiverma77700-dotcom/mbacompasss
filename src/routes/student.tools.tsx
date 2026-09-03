import { createFileRoute } from "@tanstack/react-router";
import StudentTools from "@/pages/student/StudentTools";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/tools")({
  component: () => <StudentTools />,
  pendingComponent: StudentContentSkeleton,
});
