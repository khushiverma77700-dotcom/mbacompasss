import { createFileRoute } from "@tanstack/react-router";
import AdminBulkExams from "@/pages/admin/AdminBulkExams";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/exams/bulk-create")({
  component: () => <AdminBulkExams />,
  pendingComponent: PublicPageSkeleton,
});
