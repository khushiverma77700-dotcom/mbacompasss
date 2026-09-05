import { createFileRoute } from "@tanstack/react-router";
import AdminBulkGenerateCourses from "@/pages/admin/AdminBulkGenerateCourses";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/courses_/bulk-generate")({
  component: () => <AdminBulkGenerateCourses />,
  pendingComponent: PublicPageSkeleton,
});
