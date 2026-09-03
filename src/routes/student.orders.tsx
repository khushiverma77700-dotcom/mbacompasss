import { createFileRoute } from "@tanstack/react-router";
import StudentOrders from "@/pages/student/StudentOrders";
import StudentContentSkeleton from "@/components/student/StudentContentSkeleton";

export const Route = createFileRoute("/student/orders")({
  component: () => <StudentOrders />,
  pendingComponent: StudentContentSkeleton,
});
