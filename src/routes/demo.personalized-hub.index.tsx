import { createFileRoute } from "@tanstack/react-router";
import StudentPersonalizedHub from "@/pages/student/StudentPersonalizedHub";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/personalized-hub/")({
  component: () => <StudentPersonalizedHub />,
  pendingComponent: StudentContentSkeleton,
});
