import { createFileRoute } from "@tanstack/react-router";
import AdminStudentMocks from "@/pages/admin/AdminStudentMocks";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/student-mocks")({
  component: () => <AdminStudentMocks />,
  pendingComponent: PublicPageSkeleton,
});
