import { createFileRoute } from "@tanstack/react-router";
import StudentBuyMocks from "@/pages/student/StudentBuyMocks";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/buy-mocks")({
  component: () => <StudentBuyMocks />,
  pendingComponent: StudentContentSkeleton,
});
