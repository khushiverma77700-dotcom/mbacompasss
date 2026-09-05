import { createFileRoute } from "@tanstack/react-router";
import AdminBulkCreateColleges from "@/pages/admin/AdminBulkCreateColleges";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/colleges_/bulk-create")({
  component: () => <AdminBulkCreateColleges />,
  pendingComponent: PublicPageSkeleton,
});
