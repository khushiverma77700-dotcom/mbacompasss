import { createFileRoute } from "@tanstack/react-router";
import AdminBulkSEO from "@/pages/admin/AdminBulkSEO";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/bulk-seo")({
  component: () => <AdminBulkSEO />,
  pendingComponent: PublicPageSkeleton,
});
