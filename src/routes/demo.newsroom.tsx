import { createFileRoute } from "@tanstack/react-router";
import StudentNewsroom from "@/pages/student/StudentNewsroom";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/newsroom")({
  component: () => <StudentNewsroom />,
  pendingComponent: StudentContentSkeleton,
});
