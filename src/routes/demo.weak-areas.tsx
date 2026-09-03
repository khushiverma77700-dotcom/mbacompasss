import { createFileRoute } from "@tanstack/react-router";
import StudentWeakAreas from "@/pages/student/StudentWeakAreas";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/weak-areas")({
  component: () => <StudentWeakAreas />,
  pendingComponent: StudentContentSkeleton,
});
