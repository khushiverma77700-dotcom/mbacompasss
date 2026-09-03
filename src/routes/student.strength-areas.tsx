import { createFileRoute } from "@tanstack/react-router";
import StudentStrengthAreas from "@/pages/student/StudentStrengthAreas";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/strength-areas")({
  component: () => <StudentStrengthAreas />,
  pendingComponent: StudentContentSkeleton,
});
