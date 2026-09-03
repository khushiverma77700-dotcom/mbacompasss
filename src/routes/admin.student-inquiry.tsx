import { createFileRoute } from "@tanstack/react-router";
import AdminStudentInquiry from "@/pages/admin/AdminStudentInquiry";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/student-inquiry")({
  component: () => <AdminStudentInquiry />,
  pendingComponent: PublicPageSkeleton,
});
