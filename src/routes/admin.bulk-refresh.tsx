import { createFileRoute } from "@tanstack/react-router";
import AdminBulkRefresh from "@/pages/admin/AdminBulkRefresh";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/bulk-refresh")({
  component: () => <AdminBulkRefresh />,
  pendingComponent: PublicPageSkeleton,
});
