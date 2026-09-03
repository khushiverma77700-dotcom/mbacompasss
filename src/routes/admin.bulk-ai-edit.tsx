import { createFileRoute } from "@tanstack/react-router";
import AdminBulkAIEdit from "@/pages/admin/AdminBulkAIEdit";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/bulk-ai-edit")({
  component: () => <AdminBulkAIEdit />,
  pendingComponent: PublicPageSkeleton,
});
