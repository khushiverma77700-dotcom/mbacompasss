import { createFileRoute } from "@tanstack/react-router";
import AdminBulkMockGeneration from "@/pages/admin/AdminBulkMockGeneration";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/bulk-mock-generation")({
  component: () => <AdminBulkMockGeneration />,
  pendingComponent: PublicPageSkeleton,
});
