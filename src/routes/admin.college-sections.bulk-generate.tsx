import { createFileRoute } from "@tanstack/react-router";
import AdminBulkGenerateSections from "@/pages/admin/AdminBulkGenerateSections";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/college-sections/bulk-generate")({
  component: () => <AdminBulkGenerateSections />,
  pendingComponent: PublicPageSkeleton,
});
