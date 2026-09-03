import { createFileRoute } from "@tanstack/react-router";
import StudentSOPReview from "@/pages/student/StudentSOPReview";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/demo/sop-review")({
  component: () => <StudentSOPReview />,
  pendingComponent: StudentContentSkeleton,
});
